import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma'

const router = Router()

// GET /api/reviews — all recent reviews
router.get('/', async (req: Request, res: Response) => {
    try {
        const reviews = await prisma.pRReview.findMany({
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
        const review = await prisma.pRReview.findUnique({
            where: { id: req.params.id as string },
            include: {
                repo: true,
                comments: true,
                feedbackActions: true
            }
        })

        if (!review) {
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
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({ error: 'User context not found' });
            return;
        }

        if (!['approve', 'dismiss'].includes(action)) {
             res.status(400).json({ error: 'Invalid action. Must be approve or dismiss.' });
             return;
        }

        // Verify that review and comment exist
        const comment = await prisma.reviewComment.findUnique({
            where: { id: commentId as string }
        });

        if (!comment || comment.reviewId !== reviewId) {
            res.status(404).json({ error: 'Comment not found for this review' });
            return;
        }

        // Create feedback action
        const feedback = await prisma.feedbackAction.create({
            data: {
                action,
                userId,
                reviewId,
                commentId : commentId as string
            }
        });

        res.json({ success: true, feedback });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

export default router;