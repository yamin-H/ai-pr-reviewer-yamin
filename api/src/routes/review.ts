import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { sendFeedbackToAgent } from '../services/agent.js'

const router = Router()

// GET /api/reviews — all recent reviews
router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId
        const reviews = await prisma.pRReview.findMany({
            where: orgId ? { orgId } : undefined,
            include: {
                repo: true,
                comments: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        res.json({ reviews })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch reviews' })
    }
});


router.get('/:id', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId
        const review = await prisma.pRReview.findUnique({
            where: { id: req.params.id as string },
            include: {
                repo: true,
                comments: true,
                feedbackActions: true
            }
        })

        if (!review || (orgId && review.orgId !== orgId)) {
            res.status(404).json({ error: 'Review not found' })
            return
        }

        res.json({ review })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch review' })
    }
});

// POST /api/reviews/:id/comments/:commentId/feedback — create a feedback action
router.post('/:id/comments/:commentId/feedback', async (req: Request, res: Response) => {
    try {
        const { action } = req.body;
        const { id: reviewId, commentId } = req.params;
        const orgId = (req as any).user?.orgId;
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({ error: 'User context not found' });
            return;
        }

        if (!['approve', 'dismiss'].includes(action)) {
             res.status(400).json({ error: 'Invalid action. Must be approve or dismiss.' });
             return;
        }

        // Verify that review exists
        const review = await prisma.pRReview.findUnique({
            where: { id: reviewId },
            include: { repo: true }
        });

        if (!review || (orgId && review.orgId !== orgId)) {
            res.status(404).json({ error: 'Review not found' });
            return;
        }

        // Verify that comment exists and belongs to this review
        const comment = await prisma.reviewComment.findUnique({
            where: { id: commentId as string }
        });

        if (!comment || comment.reviewId !== reviewId) {
            res.status(404).json({ error: 'Comment not found for this review' });
            return;
        }

        // Check if feedback already exists for this comment & user to prevent duplicates
        const existingFeedback = await prisma.feedbackAction.findFirst({
            where: {
                reviewId,
                commentId: commentId as string,
                userId
            }
        });

        let feedback;
        if (existingFeedback) {
            feedback = await prisma.feedbackAction.update({
                where: { id: existingFeedback.id },
                data: { action, createdAt: new Date() }
            });
        } else {
            feedback = await prisma.feedbackAction.create({
                data: {
                    action,
                    userId,
                    reviewId,
                    commentId: commentId as string
                }
            });
        }

        // Send feedback to Python agent to store vector embedding and learn the team convention
        let memoryLearned = false;
        try {
            await sendFeedbackToAgent({
                org_id: review.orgId,
                repo_id: review.repoId,
                pr_number: review.prNumber,
                file_path: comment.filename,
                line: comment.line,
                severity: comment.severity,
                comment: comment.comment,
                action: action as 'approve' | 'dismiss'
            });
            memoryLearned = true;
        } catch (agentErr: any) {
            console.error('Failed to notify agent to learn feedback (non-fatal):', agentErr?.message || agentErr);
        }

        res.json({ success: true, feedback, memoryLearned });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

export default router;