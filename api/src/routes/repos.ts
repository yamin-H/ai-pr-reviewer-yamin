import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import axios from 'axios'
import { getInstallationOctokit } from '../lib/octokit.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
    try {
        // requireAuth guarantees orgId is a non-empty string.
        const orgId = (req as any).user.orgId as string
        const repos = await prisma.repo.findMany({
            where: { orgId },
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
})

// POST /api/repos/:id/sync — on-demand historical PR scanning and memory bank seeding
router.post('/:id/sync', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const id = req.params.id as string
        const repo = await prisma.repo.findUnique({
            where: { id },
            include: { org: true }
        })

        // Ownership check is unconditional — return 404 to avoid leaking whether
        // the repo exists in another organization.
        if (!repo || repo.orgId !== orgId) {
            res.status(404).json({ error: 'Repository not found' })
            return
        }

        let storedCount = 0
        if (process.env.AGENT_URL) {
            const installationId = (repo as any).org?.installationId
            const agentRes = await axios.post(`${process.env.AGENT_URL}/onboard`, {
                repo: repo.fullName,
                installation_id: installationId,
                org_id: repo.orgId
            }, { 
                headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_KEY },
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
})

// POST /api/repos/:id/sync-rules — on-demand fetch and parsing of .powerful.yml from repository root
router.post('/:id/sync-rules', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const id = req.params.id as string
        const repo = await prisma.repo.findUnique({
            where: { id },
            include: { org: true }
        })

        if (!repo || repo.orgId !== orgId) {
            res.status(404).json({ error: 'Repository not found' })
            return
        }

        let ruleCount = 0
        let rules: string[] = []

        if (repo.org?.installationId) {
            const token = await getInstallationOctokit(repo.org.installationId)
            let contentStr: string | null = null
            for (const path of ['.powerful.yml', '.powerful.yaml']) {
                try {
                    const ghRes = await axios.get(`https://api.github.com/repos/${repo.fullName}/contents/${path}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/vnd.github.v3+json'
                        }
                    })
                    if (ghRes.data?.content) {
                        contentStr = Buffer.from(ghRes.data.content, 'base64').toString('utf8')
                        break
                    }
                } catch (e: any) {
                    // 404 is expected if filename doesn't match
                }
            }

            if (contentStr) {
                const lines = contentStr.split('\n')
                for (const line of lines) {
                    const trimmed = line.trim()
                    if (trimmed.startsWith('- ') && !trimmed.startsWith('- rules:')) {
                        const rule = trimmed.replace(/^-\s*["']?/, '').replace(/["']?$/, '').trim()
                        if (rule) rules.push(rule)
                    }
                }
                ruleCount = rules.length
            }
        }

        const updated = await prisma.repo.update({
            where: { id },
            data: { customRulesCount: ruleCount }
        })

        res.json({
            success: true,
            customRulesCount: ruleCount,
            rules,
            repo: updated
        })
    } catch (err: any) {
        console.error('Failed to sync repo rules:', err?.message || err)
        res.status(500).json({ error: 'Failed to sync custom rules: ' + (err?.message || 'internal error') })
    }
})

export default router