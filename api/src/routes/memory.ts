import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma.js'

const router = Router()

router.get('/stats', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId
        const where = orgId ? { orgId } : undefined

        const totalEntries = await prisma.memoryEntry.count({
            where
        })

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
            include: { repo: true }
        })

        res.json({
            totalEntries,
            byDecisionType,
            byOutcome,
            recentEntries
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch memory stats' })
    }
});

export default router