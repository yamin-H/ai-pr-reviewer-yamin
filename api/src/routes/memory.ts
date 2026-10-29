import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma.js'

const router = Router()

router.get('/stats', async (req: Request, res: Response) => {
    try {
        // requireAuth guarantees orgId is a non-empty string.
        const orgId = (req as any).user.orgId as string
        const where = { orgId }

        const totalEntries = await prisma.memoryEntry.count({ where })

        const byDecisionType = await prisma.memoryEntry.groupBy({
            by: ['decisionType'],
            where,
            _count: { decisionType: true },
            orderBy: { _count: { decisionType: 'desc' } }
        })

        const byOutcome = await prisma.memoryEntry.groupBy({
            by: ['outcome'],
            where,
            _count: { outcome: true }
        })

        const recentEntries = await prisma.memoryEntry.findMany({
            where,
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { repo: { include: { org: true, _count: { select: { reviews: true, memoryEntries: true } } } } }
        })

        // Format recent entries to match frontend MemoryEntry type
        const formattedEntries = recentEntries.map(entry => ({
            ...entry,
            repo: entry.repo ? {
                ...entry.repo,
                enabled: entry.repo.enabled ?? true,
                customRulesCount: entry.repo.customRulesCount ?? 0,
                _count: {
                    reviews: entry.repo._count?.reviews ?? 0,
                    memoryEntries: entry.repo._count?.memoryEntries ?? 0,
                },
                org: entry.repo.org ? {
                    ...entry.repo.org,
                    isInstalled: entry.repo.org.isInstalled ?? true,
                    reviewSensitivity: entry.repo.org.reviewSensitivity ?? 0.5,
                    triggerOnSync: entry.repo.org.triggerOnSync ?? true,
                    plan: entry.repo.org.plan ?? 'free',
                    monthlyReviewCount: entry.repo.org.monthlyReviewCount ?? 0,
                } : undefined
            } : null
        }))

        res.json({
            totalEntries,
            byDecisionType: byDecisionType.map(d => ({ decisionType: d.decisionType, _count: { decisionType: d._count.decisionType } })),
            byOutcome: byOutcome.map(o => ({ outcome: o.outcome, _count: { outcome: o._count.outcome } })),
            recentEntries: formattedEntries
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch memory stats' })
    }
})

export default router