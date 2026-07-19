import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma'

const router = Router()

router.get('/stats', async (req: Request, res: Response) => {
    try {
        const totalEntries = await prisma.memoryEntry.count()

        const byDecisionType = await prisma.memoryEntry.groupBy({
            by: ['decisionType'],
            _count: { decisionType: true },
            orderBy: { _count: { decisionType: 'desc' } }
        })

        const byOutcome = await prisma.memoryEntry.groupBy({
            by: ['outcome'],
            _count: { outcome: true }
        })

        const recentEntries = await prisma.memoryEntry.findMany({
            take: 5,
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