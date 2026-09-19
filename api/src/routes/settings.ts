import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// GET /api/settings — fetch organization settings & repository list
router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                id: true,
                login: true,
                githubId: true,
                installationId: true,
                reviewSensitivity: true,
                triggerOnSync: true,
                isInstalled: true,
                uninstalledAt: true,
                plan: true,
                createdAt: true,
            }
        })

        if (!org) {
            res.status(404).json({ error: 'Organization not found' })
            return
        }

        const repos = await prisma.repo.findMany({
            where: { orgId },
            select: {
                id: true,
                name: true,
                fullName: true,
                private: true,
                enabled: true,
                customRulesCount: true,
                createdAt: true,
                _count: {
                    select: {
                        reviews: true,
                        memoryEntries: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        res.json({ org, repos })
    } catch (err: any) {
        console.error('Failed to fetch settings:', err?.message || err)
        res.status(500).json({ error: 'Failed to fetch settings' })
    }
})

// PATCH /api/settings/org — update organization level settings
router.patch('/org', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const { reviewSensitivity, triggerOnSync } = req.body

        const updateData: { reviewSensitivity?: number; triggerOnSync?: boolean } = {}

        if (reviewSensitivity !== undefined) {
            const sensitivity = Number(reviewSensitivity)
            if (isNaN(sensitivity) || sensitivity < 0.1 || sensitivity > 0.95) {
                res.status(400).json({
                    error: 'reviewSensitivity must be a decimal number between 0.1 and 0.95'
                })
                return
            }
            updateData.reviewSensitivity = sensitivity
        }

        if (triggerOnSync !== undefined) {
            if (typeof triggerOnSync !== 'boolean') {
                res.status(400).json({
                    error: 'triggerOnSync must be a boolean'
                })
                return
            }
            updateData.triggerOnSync = triggerOnSync
        }

        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ error: 'No valid setting fields provided to update' })
            return
        }

        const updatedOrg = await prisma.organization.update({
            where: { id: orgId },
            data: updateData,
            select: {
                id: true,
                login: true,
                reviewSensitivity: true,
                triggerOnSync: true,
            }
        })

        res.json({ success: true, org: updatedOrg })
    } catch (err: any) {
        console.error('Failed to update organization settings:', err?.message || err)
        res.status(500).json({ error: 'Failed to update organization settings' })
    }
})

// PATCH /api/settings/repos/:id — toggle or update review status for a specific repository
router.patch('/repos/:id', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const repoId = req.params.id as string
        const { enabled } = req.body

        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: 'enabled field must be a boolean' })
            return
        }

        // Verify repository ownership
        const repo = await prisma.repo.findUnique({
            where: { id: repoId }
        })

        if (!repo || repo.orgId !== orgId) {
            res.status(404).json({ error: 'Repository not found' })
            return
        }

        const updatedRepo = await prisma.repo.update({
            where: { id: repoId },
            data: { enabled },
            select: {
                id: true,
                name: true,
                fullName: true,
                enabled: true,
            }
        })

        res.json({ success: true, repo: updatedRepo })
    } catch (err: any) {
        console.error('Failed to update repository settings:', err?.message || err)
        res.status(500).json({ error: 'Failed to update repository settings' })
    }
})

export default router
