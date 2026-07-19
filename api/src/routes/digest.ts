import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma'

const router = Router()

router.get('/preview', async (req: Request, res: Response) => {
    try {
        const digests = await prisma.weeklyDigest.findMany({
            include: { org: true },
            orderBy: { weekOf: 'desc' },
            take: 10
        })

        res.json({ digests })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch digests' })
    }
});

export default router