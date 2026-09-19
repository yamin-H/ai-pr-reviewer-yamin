import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import reviewQueue from '../queues/reviewQueue.js'

const router = Router()

// GET /api/jobs — fetch BullMQ queue status & recent jobs for caller's org
router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string

        // 1. Fetch organization's review records to ensure strict multi-tenant scoping
        const orgReviews = await prisma.pRReview.findMany({
            where: { orgId },
            select: {
                id: true,
                prTitle: true,
                status: true,
                commentsCount: true,
                filesReviewed: true,
            },
            take: 100,
            orderBy: { createdAt: 'desc' }
        })

        const orgReviewMap = new Map(orgReviews.map((r) => [r.id, r]))

        // 2. Fetch BullMQ queue counts and jobs from Redis
        let counts = { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 }
        let queueJobs: any[] = []

        try {
            const rawCounts = await reviewQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed')
            counts = {
                active: rawCounts.active || 0,
                waiting: rawCounts.waiting || 0,
                completed: rawCounts.completed || 0,
                failed: rawCounts.failed || 0,
                delayed: rawCounts.delayed || 0,
            }
            queueJobs = await reviewQueue.getJobs(['active', 'waiting', 'completed', 'failed'], 0, 50, true)
        } catch (queueErr: any) {
            console.error('[jobs] Failed to query BullMQ queue:', queueErr?.message || queueErr)
        }

        // 3. Filter BullMQ jobs to only those belonging to caller's org
        const formattedJobs = queueJobs
            .filter((j) => j?.data?.job_id && orgReviewMap.has(j.data.job_id))
            .map((j) => {
                const dbReview = orgReviewMap.get(j.data.job_id)
                const now = Date.now()
                const timestamp = j.timestamp || now
                const processedOn = j.processedOn || null
                const finishedOn = j.finishedOn || null

                // Compute wait latency: time spent in queue before worker started
                const waitMs = processedOn ? processedOn - timestamp : now - timestamp

                // Compute execution latency: time worker spent executing
                let durationMs: number | null = null
                if (processedOn) {
                    durationMs = finishedOn ? finishedOn - processedOn : now - processedOn
                }

                // Determine state
                let state: 'active' | 'waiting' | 'completed' | 'failed' = 'waiting'
                if (finishedOn) {
                    state = j.failedReason ? 'failed' : 'completed'
                } else if (processedOn) {
                    state = 'active'
                }

                return {
                    id: String(j.id),
                    reviewId: j.data.job_id,
                    repo: j.data.repo,
                    prNumber: j.data.pr_number,
                    prTitle: dbReview?.prTitle || null,
                    state,
                    createdAt: new Date(timestamp).toISOString(),
                    processedAt: processedOn ? new Date(processedOn).toISOString() : null,
                    finishedAt: finishedOn ? new Date(finishedOn).toISOString() : null,
                    durationMs,
                    waitMs,
                    failedReason: j.failedReason || null,
                    attemptsMade: j.attemptsMade || 0,
                }
            })

        res.json({
            counts,
            jobs: formattedJobs,
        })
    } catch (err: any) {
        console.error('Failed to get jobs:', err?.message || err)
        res.status(500).json({ error: 'Failed to fetch queue jobs' })
    }
})

// GET /api/jobs/latest — return the most recently enqueued/processed review
router.get('/latest', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const latest = await prisma.pRReview.findFirst({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                prNumber: true,
                prTitle: true,
                createdAt: true,
                repo: { select: { fullName: true } }
            }
        })
        res.json({ job: latest })
    } catch (err: any) {
        console.error('Failed to get latest job:', err?.message || err)
        res.status(500).json({ error: 'Failed to get latest job' })
    }
})

export default router