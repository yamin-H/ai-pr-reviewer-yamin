import { Router, Request, Response } from 'express'
import { verifyWebhookSignature } from '../middleware/webhook.js'
import reviewQueue from '../queues/reviewQueue.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.post('/github', verifyWebhookSignature, async (req: Request, res: Response) => {
    const event = req.headers['x-github-event'] as string
    const payload = JSON.parse(req.body.toString())

    console.log(`Received GitHub event: ${event}`)

    if (event === 'pull_request') {
        const action = payload.action
        const prNumber = payload.pull_request.number
        const prTitle = payload.pull_request.title
        const repo = payload.repository.full_name
        const repoGithubId = String(payload.repository.id)
        const installationId = payload.installation?.id
        const sender = payload.sender.login
        const orgGithubId = String(payload.repository.owner.id)
        const orgLogin = payload.organization?.login || payload.repository.owner.login

        console.log(`PR #${prNumber} was ${action} on ${repo} by ${sender}`)

        if (action === 'opened' || action === 'synchronize') {
            try {
                // upsert org
                const org = await prisma.organization.upsert({
                    where: { githubId: orgGithubId },
                    update: { installationId },
                    create: {
                        githubId: orgGithubId,
                        login: orgLogin,
                        installationId
                    }
                })

                // upsert repo
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

                // create review record — get its id
                const review = await prisma.pRReview.create({
                    data: {
                        prNumber,
                        prTitle,
                        status: 'pending',
                        repoId: repoRecord.id,
                        orgId: org.id
                    }
                })

                // use review.id as job_id — this is the link between queue and DB
                const job = await reviewQueue.add('review-pr', {
                    job_id: review.id,
                    repo,
                    pr_number: prNumber,
                    installation_id: installationId
                })

                console.log(`→ Review job ${job.id} queued for PR #${prNumber} (db id: ${review.id})`)

            } catch (err) {
                console.error('Failed to create review job:', err)
                // still respond 200 — GitHub will retry if we send non-200
            }
        }
    }

    res.status(200).json({ received: true })
});

export default router