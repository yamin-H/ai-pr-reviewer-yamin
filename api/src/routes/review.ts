import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { sendFeedbackToAgent } from '../services/agent.js'

const router = Router()

function escapeCsv(value: any): string {
    if (value === null || value === undefined) return '""'
    let str = String(value).trim()
    // Prevent spreadsheet formula injection
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`
    }
    return `"${str.replace(/"/g, '""')}"`
}

// GET /api/reviews/export/csv — export reviews to CSV (declared before /:id)
router.get('/export/csv', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const { repoId, status, from, to, search } = req.query

        const where: any = { orgId }

        if (repoId && typeof repoId === 'string' && repoId !== 'all') {
            where.repoId = repoId
        }

        if (status && typeof status === 'string' && status !== 'all') {
            where.status = status
        }

        if (from || to) {
            where.createdAt = {}
            if (typeof from === 'string') {
                const fromDate = new Date(from)
                if (!isNaN(fromDate.getTime())) where.createdAt.gte = fromDate
            }
            if (typeof to === 'string') {
                const toDate = new Date(to)
                if (!isNaN(toDate.getTime())) where.createdAt.lte = toDate
            }
        }

        if (search && typeof search === 'string' && search.trim()) {
            const query = search.trim()
            const isNumeric = !isNaN(Number(query))
            where.OR = [
                { prTitle: { contains: query, mode: 'insensitive' } },
                { repo: { fullName: { contains: query, mode: 'insensitive' } } },
                ...(isNumeric ? [{ prNumber: Number(query) }] : [])
            ]
        }

        const reviews = await prisma.pRReview.findMany({
            where,
            include: { repo: true },
            orderBy: { createdAt: 'desc' },
            take: 2000 // reasonable upper safety cap for export
        })

        const headers = [
            'Review ID',
            'Repository',
            'PR Number',
            'PR Title',
            'Status',
            'Files Reviewed',
            'Comments Count',
            'Created At',
            'Completed At',
            'GitHub URL'
        ]

        const rows = reviews.map((r) => [
            escapeCsv(r.id),
            escapeCsv(r.repo.fullName),
            escapeCsv(r.prNumber),
            escapeCsv(r.prTitle || `PR #${r.prNumber}`),
            escapeCsv(r.status),
            escapeCsv(r.filesReviewed),
            escapeCsv(r.commentsCount),
            escapeCsv(r.createdAt.toISOString()),
            escapeCsv(r.completedAt ? r.completedAt.toISOString() : ''),
            escapeCsv(r.commentUrl || '')
        ].join(','))

        const csvContent = [headers.join(','), ...rows].join('\n')
        const timestamp = new Date().toISOString().slice(0, 10)

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="pr_reviews_${timestamp}.csv"`)
        res.status(200).send(csvContent)
    } catch (err: any) {
        console.error('Failed to export reviews CSV:', err?.message || err)
        res.status(500).json({ error: 'Failed to export reviews CSV' })
    }
})

// GET /api/reviews — list reviews with cursor-based pagination, repo filter, date filter, and search
router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const { cursor, limit, repoId, status, from, to, search } = req.query

        const take = Math.min(100, Math.max(1, Number(limit) || 20))

        const where: any = { orgId }

        if (repoId && typeof repoId === 'string' && repoId !== 'all') {
            where.repoId = repoId
        }

        if (status && typeof status === 'string' && status !== 'all') {
            where.status = status
        }

        if (from || to) {
            where.createdAt = {}
            if (typeof from === 'string') {
                const fromDate = new Date(from)
                if (!isNaN(fromDate.getTime())) where.createdAt.gte = fromDate
            }
            if (typeof to === 'string') {
                const toDate = new Date(to)
                if (!isNaN(toDate.getTime())) where.createdAt.lte = toDate
            }
        }

        if (search && typeof search === 'string' && search.trim()) {
            const query = search.trim()
            const isNumeric = !isNaN(Number(query))
            where.OR = [
                { prTitle: { contains: query, mode: 'insensitive' } },
                { repo: { fullName: { contains: query, mode: 'insensitive' } } },
                ...(isNumeric ? [{ prNumber: Number(query) }] : [])
            ]
        }

        // Fetch take + 1 to determine whether nextCursor exists
        const reviews = await prisma.pRReview.findMany({
            where,
            include: {
                repo: true,
                comments: true
            },
            orderBy: { createdAt: 'desc' },
            take: take + 1,
            ...(cursor && typeof cursor === 'string'
                ? {
                    cursor: { id: cursor },
                    skip: 1
                }
                : {})
        })

        let nextCursor: string | null = null
        if (reviews.length > take) {
            reviews.pop()
            nextCursor = reviews[reviews.length - 1].id
        }

        const totalCount = await prisma.pRReview.count({ where })

        res.json({
            reviews,
            nextCursor,
            totalCount
        })
    } catch (err: any) {
        console.error('Failed to fetch reviews:', err?.message || err)
        res.status(500).json({ error: 'Failed to fetch reviews' })
    }
})


// GET /api/reviews/:id — fetch a single review, scoped to the caller's org
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const id = req.params.id as string
        const review = await prisma.pRReview.findUnique({
            where: { id },
            include: {
                repo: true,
                comments: true,
                feedbackActions: true
            }
        })

        // Ownership check is unconditional — orgId is always present (guaranteed by requireAuth).
        // Return 404 rather than 403 to avoid leaking whether the resource exists in another org.
        if (!review || review.orgId !== orgId) {
            res.status(404).json({ error: 'Review not found' })
            return
        }

        res.json({ review })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch review' })
    }
})

// POST /api/reviews/:id/comments/:commentId/feedback — record an approve or dismiss action
router.post('/:id/comments/:commentId/feedback', async (req: Request, res: Response) => {
    try {
        const { action } = req.body
        const reviewId = req.params.id as string
        const commentId = req.params.commentId as string
        const orgId = (req as any).user.orgId as string
        const userId = (req as any).user.id as string

        if (!['approve', 'dismiss'].includes(action)) {
            res.status(400).json({ error: 'Invalid action. Must be approve or dismiss.' })
            return
        }

        // Verify the review exists and belongs to the caller's org.
        const review = await prisma.pRReview.findUnique({
            where: { id: reviewId },
            include: { repo: true }
        })

        if (!review || review.orgId !== orgId) {
            res.status(404).json({ error: 'Review not found' })
            return
        }

        // Verify the comment exists and belongs to this review.
        const comment = await prisma.reviewComment.findUnique({
            where: { id: commentId }
        })

        if (!comment || comment.reviewId !== reviewId) {
            res.status(404).json({ error: 'Comment not found for this review' })
            return
        }

        // Upsert feedback — prevent duplicate records for the same user + comment.
        const existingFeedback = await prisma.feedbackAction.findFirst({
            where: { reviewId, commentId, userId }
        })

        let feedback
        if (existingFeedback) {
            feedback = await prisma.feedbackAction.update({
                where: { id: existingFeedback.id },
                data: { action, createdAt: new Date() }
            })
        } else {
            feedback = await prisma.feedbackAction.create({
                data: { action, userId, reviewId, commentId }
            })
        }

        // Notify the Python agent to embed this feedback into vector memory.
        // Non-fatal: a failure here must not block the user's feedback from being saved.
        let memoryLearned = false
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
            })
            memoryLearned = true
        } catch (agentErr: any) {
            console.error('Failed to notify agent to learn feedback (non-fatal):', agentErr?.message || agentErr)
        }

        res.json({ success: true, feedback, memoryLearned })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to record feedback' })
    }
})

export default router