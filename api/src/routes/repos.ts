import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
    try {
        const repos = await prisma.repo.findMany({
            include: {
                org: true,
                _count: {
                    select: {
                        reviews: true,
                        memoryEntries: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        res.json({ repos })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch repos' })
    }
});

export default router