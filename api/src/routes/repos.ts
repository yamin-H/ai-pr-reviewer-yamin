import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import axios from 'axios'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId
        const repos = await prisma.repo.findMany({
            where: orgId ? { orgId } : undefined,
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

// POST /api/repos/:id/sync — on-demand historical PR scanning and memory bank seeding
router.post('/:id/sync', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId
        const { id } = req.params as { id: string }
        const repo = await prisma.repo.findUnique({
            where: { id },
            include: { org: true }
        })

        if (!repo || (orgId && repo.orgId !== orgId)) {
            res.status(404).json({ error: 'Repository not found' })
            return
        }

        let storedCount = 0
        if (process.env.AGENT_URL) {
            const agentRes = await axios.post(`${process.env.AGENT_URL}/onboard`, {
                repo: repo.fullName,
                installation_id: repo.org.installationId,
                org_id: repo.orgId
            }, { 
                headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_KEY || 'powerful-internal-secret-change-in-prod' },
                timeout: 60000 
            })

            storedCount = agentRes.data?.stored_count || 0
        }


        // Return updated counts
        const updated = await prisma.repo.findUnique({
            where: { id },
            include: {
                org: true,
                _count: {
                    select: {
                        reviews: true,
                        memoryEntries: true
                    }
                }
            }
        })

        res.json({
            success: true,
            stored_count: storedCount,
            repo: updated
        })
    } catch (err: any) {
        console.error('Failed to sync repo:', err?.message || err)
        res.status(500).json({ error: 'Failed to scan repository: ' + (err?.message || 'internal error') })
    }
});

export default router