import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma.js'

const router = Router()

router.get('/preview', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId
        const digests = await prisma.weeklyDigest.findMany({
            where: orgId ? { orgId } : undefined,
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