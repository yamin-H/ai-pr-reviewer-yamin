import { Router, Request, Response } from 'express'
import { verifyWebhookSignature } from '../middleware/webhook.js'
import reviewQueue from '../queues/reviewQueue.js'
import { prisma } from '../lib/prisma.js'
import redis from '../lib/redis.js'
import { checkAndResetOrgQuota } from '../lib/cron.js'

const PLAN_LIMITS: Record<string, number> = {
    free: 50,
    pro: 500,
    enterprise: 10000,
}

const router = Router()

router.post('/github', verifyWebhookSignature, async (req: Request, res: Response) => {
    const event = req.headers['x-github-event'] as string

    let payload: any
    try {
        payload = JSON.parse(req.body.toString())
    } catch (parseErr) {
        console.error('Invalid JSON in webhook payload')
        res.status(400).json({ error: 'Invalid JSON payload' })
        return
    }

    if (event === 'ping') {
        res.status(200).json({ message: 'pong' })
        return
    }

    // -----------------------------------------------------------------------
    // GitHub App Installation Events (installation.deleted, created, suspend)
    // -----------------------------------------------------------------------
    if (event === 'installation') {
        const action = payload.action as string
        const installationId = payload.installation?.id as number | undefined

        if (!installationId) {
            res.status(200).json({ received: true, ignored: 'missing installation_id' })
            return
        }

        if (action === 'deleted' || action === 'suspend') {
            console.log(`[webhooks] Received installation.${action} for installationId: ${installationId}`)

            // Purge Redis token cache
            try {
                await redis.del(`installation_token:${installationId}`)
            } catch (redisErr: any) {
                console.warn('[webhooks] Failed to evict token cache:', redisErr?.message || redisErr)
            }

            // Mark organization as uninstalled
            const org = await prisma.organization.findUnique({
                where: { installationId }
            })

            if (org) {
                await prisma.organization.update({
                    where: { id: org.id },
                    data: {
                        isInstalled: false,
                        uninstalledAt: new Date()
                    }
                })
                console.log(`[webhooks] Organization @${org.login} marked as uninstalled. Inbound reviews halted.`)
            }

            res.status(200).json({ received: true, action: `installation_${action}` })
            return
        }

        if (action === 'created' || action === 'unsuspend') {
            const org = await prisma.organization.findUnique({
                where: { installationId }
            })

            if (org) {
                await prisma.organization.update({
                    where: { id: org.id },
                    data: {
                        isInstalled: true,
                        uninstalledAt: null
                    }
                })
                console.log(`[webhooks] Organization @${org.login} reactivated installation.`)
            }

            res.status(200).json({ received: true, action: `installation_${action}` })
            return
        }

        res.status(200).json({ received: true, action })
        return
    }

    if (event === 'pull_request') {
        if (!payload || !payload.repository || !payload.pull_request) {
            res.status(200).json({ received: true, ignored: true })
            return
        }

        const action        = payload.action as string
        const prNumber      = payload.pull_request.number as number
        const prTitle       = payload.pull_request.title as string
        const repo          = payload.repository.full_name as string
        const repoGithubId  = String(payload.repository.id)
        const installationId = payload.installation?.id as number | undefined
        const sender        = payload.sender?.login || 'unknown'
        const orgGithubId   = String(payload.repository.owner?.id || 'unknown')
        const orgLogin      = payload.organization?.login || payload.repository.owner?.login || 'unknown'
        // headSha differentiates synchronize events from distinct commits
        const headSha       = payload.pull_request.head?.sha || 'unknown'

        if (action === 'opened' || action === 'synchronize') {
            if (!installationId) {
                console.warn(`Skipping PR #${prNumber} on ${repo}: missing installation_id`)
                res.status(200).json({ received: true, ignored: 'missing installation_id' })
                return
            }

            // --- Idempotency guard ---
            // GitHub may deliver the same webhook event more than once.
            // SET NX returns 'OK' on first delivery and null on any duplicate
            // within the 60-second window. Always respond 200 so GitHub does
            // not treat a deduplicated event as a failure to retry.
            const dedupKey = `webhook:dedup:${repoGithubId}:${prNumber}:${action}:${headSha}`
            const isFirst = await redis.set(dedupKey, '1', 'EX', 60, 'NX')
            if (isFirst === null) {
                console.log(`Skipping duplicate webhook: PR #${prNumber} ${action} on ${repo} (sha: ${headSha.slice(0, 7)})`)
                res.status(200).json({ received: true, ignored: 'duplicate_webhook' })
                return
            }
            // -------------------------

            try {
                // Upsert org
                const org = await prisma.organization.upsert({
                    where: { githubId: orgGithubId },
                    update: { installationId },
                    create: { githubId: orgGithubId, login: orgLogin, installationId }
                })

                // Guard against uninstalled organization
                if (org.isInstalled === false) {
                    console.log(`Skipping PR #${prNumber} on ${repo}: Organization @${org.login} has uninstalled the GitHub App.`)
                    res.status(200).json({ received: true, ignored: 'organization_uninstalled' })
                    return
                }

                // Check monthly review quota
                const activeCount = await checkAndResetOrgQuota(org)
                const plan = org.plan || 'free'
                const limit = PLAN_LIMITS[plan] ?? 50
                if (activeCount >= limit) {
                    console.log(`Skipping PR #${prNumber} on ${repo}: monthly review quota (${limit}) reached for org @${org.login} (Plan: ${plan}, Count: ${activeCount})`)
                    res.status(200).json({
                        received: true,
                        ignored: 'monthly_quota_exceeded',
                        plan,
                        limit,
                        used: activeCount,
                    })
                    return
                }

                // Upsert repo
                const repoRecord = await prisma.repo.upsert({
                    where: { githubId: repoGithubId },
                    update: {},
                    create: {
                        githubId: repoGithubId,
                        name: payload.repository.name,
                        fullName: repo,
                        private: payload.repository.private,
                        orgId: org.id
                    }
                })

                // Check organization settings: skip synchronize events if disabled
                if (action === 'synchronize' && !org.triggerOnSync) {
                    console.log(`Skipping PR #${prNumber} synchronize on ${repo}: triggerOnSync disabled for org ${org.login}`)
                    res.status(200).json({ received: true, ignored: 'sync_trigger_disabled' })
                    return
                }

                // Check repository settings: skip if AI reviews disabled for this repo
                if (!repoRecord.enabled) {
                    console.log(`Skipping PR #${prNumber} on ${repo}: reviews disabled for this repository in settings`)
                    res.status(200).json({ received: true, ignored: 'repo_disabled' })
                    return
                }

                // Create review record — its id becomes the BullMQ job_id
                const review = await prisma.pRReview.create({
                    data: {
                        prNumber,
                        prTitle,
                        status: 'pending',
                        repoId: repoRecord.id,
                        orgId: org.id
                    }
                })

                const job = await reviewQueue.add('review-pr', {
                    job_id: review.id,
                    repo,
                    pr_number: prNumber,
                    installation_id: installationId,
                    head_sha: headSha,
                })

                console.log(`→ Review job ${job.id} queued for PR #${prNumber} on ${repo} (db id: ${review.id})`)
            } catch (err) {
                console.error('Failed to create review job:', err)
                // Still respond 200 — GitHub retries on non-200 and we do not
                // want duplicate jobs from GitHub's retry mechanism.
            }
        }
    }

    res.status(200).json({ received: true })
})

export default router