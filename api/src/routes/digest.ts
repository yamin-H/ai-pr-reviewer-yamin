import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import axios from 'axios'
import digestQueue from '../queues/digestQueue.js'

const router = Router()

// GET /api/digest/preview — list weekly digests for the active organization
router.get('/preview', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const digests = await prisma.weeklyDigest.findMany({
            where: { orgId },
            include: { org: true },
            orderBy: { weekOf: 'desc' },
            take: 10
        })

        res.json({ digests })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch digests' })
    }
})

// POST /api/digest/compile — trigger on-demand compilation of weekly digest
router.post('/compile', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string

        const org = await prisma.organization.findUnique({
            where: { id: orgId }
        })

        if (!org) {
            res.status(404).json({ error: 'Organization not found' })
            return
        }

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        let reviews = await prisma.pRReview.findMany({
            where: {
                orgId: org.id,
                createdAt: { gte: weekAgo },
                status: 'completed'
            },
            include: { comments: true }
        })

        // If no reviews in the past 7 days, fallback to recent completed reviews
        if (reviews.length === 0) {
            reviews = await prisma.pRReview.findMany({
                where: {
                    orgId: org.id,
                    status: 'completed'
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { comments: true }
            })
        }

        const flagsRaised = reviews.reduce((sum: number, r: any) => sum + r.commentsCount, 0)

        const feedbackActions = await prisma.feedbackAction.findMany({
            where: {
                review: { orgId: org.id },
                createdAt: { gte: weekAgo }
            }
        })

        const approved = feedbackActions.filter((f: any) => f.action === 'approved' || f.action === 'approve').length
        const dismissed = feedbackActions.filter((f: any) => f.action === 'dismissed' || f.action === 'dismiss').length

        let topIssue = 'General code hygiene and conventions observed'
        let topDismissed = 'Minor style preferences dismissed by team'
        let patternsLearned = 1

        if (process.env.AGENT_URL && reviews.length > 0) {
            try {
                const agentResponse = await axios.post(
                    `${process.env.AGENT_URL}/digest`,
                    {
                        org_id: org.id,
                        prs_reviewed: reviews.length,
                        flags_raised: flagsRaised,
                        flags_approved: approved,
                        flags_dismissed: dismissed,
                        reviews: reviews.map((r: any) => ({
                            pr_number: r.prNumber,
                            comments: r.comments.map((c: any) => c.comment)
                        }))
                    },
                    {
                        headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_KEY! },
                        timeout: 30000
                    }
                )
                if (agentResponse.data) {
                    topIssue = agentResponse.data.top_issue || topIssue
                    topDismissed = agentResponse.data.top_dismissed || topDismissed
                    patternsLearned = agentResponse.data.patterns_learned ?? patternsLearned
                }
            } catch (agentErr: any) {
                console.warn('[digest] Agent digest call failed, using heuristic summary:', agentErr?.message || agentErr)
            }
        }

        const digest = await prisma.weeklyDigest.create({
            data: {
                weekOf: new Date(),
                prsReviewed: reviews.length,
                flagsRaised,
                flagsApproved: approved,
                flagsDismissed: dismissed,
                topIssue,
                topDismissed,
                patternsLearned,
                orgId: org.id
            }
        })

        // Also queue background BullMQ job for audit consistency
        try {
            await digestQueue.add('compile-digest', { triggered_at: new Date().toISOString() })
        } catch {}

        res.json({
            success: true,
            message: 'Weekly digest compiled successfully.',
            digest
        })
    } catch (err: any) {
        console.error('Failed to compile digest:', err?.message || err)
        res.status(500).json({ error: 'Failed to compile digest' })
    }
})

export default router
