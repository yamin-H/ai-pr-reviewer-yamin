import { Router, Request, Response } from 'express'
import {prisma} from '../lib/prisma.js'

const router = Router()

router.get('/latest', async (req: Request, res: Response) => {
    const latest = await prisma.pRReview.findFirst({
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
});

export default router