import { Worker } from 'bullmq'
import connection from '../lib/redis.js'
import { triggerReview } from '../services/agent.js'
import { ReviewJobData } from '../queues/reviewQueue.js'
import { prisma } from '../lib/prisma.js'
import { createCommitStatus } from '../lib/octokit.js'

const worker = new Worker<ReviewJobData>(
    'review-queue',
    async (job) => {
        console.log(`Processing review job ${job.id} for PR #${job.data.pr_number}`)

        // check if review record exists before proceeding
        const reviewRecord = await prisma.pRReview.findUnique({
            where: { id: job.data.job_id },
            include: { org: true }
        })

        if (!reviewRecord) {
            console.error(`No PRReview record found for job_id: ${job.data.job_id} — skipping`)
            // don't throw — just return so it doesn't retry
            return { skipped: true, reason: 'no db record found' }
        }

        // Calculate team dismissal rate from past FeedbackAction records for risk scoring
        const totalFeedback = await prisma.feedbackAction.count({
            where: { review: { orgId: reviewRecord.orgId } }
        })
        const dismissedFeedback = await prisma.feedbackAction.count({
            where: { review: { orgId: reviewRecord.orgId }, action: 'dismiss' }
        })
        const pastDismissalRate = totalFeedback > 0 ? (dismissedFeedback / totalFeedback) : 0.2

        const result = await triggerReview({
            job_id: job.data.job_id,
            repo: job.data.repo,
            pr_number: job.data.pr_number,
            installation_id: job.data.installation_id,
            confidence_threshold: reviewRecord.org?.reviewSensitivity ?? 0.5,
            past_dismissal_rate: pastDismissalRate,
            head_sha: job.data.head_sha
        })

        if (result.comments && result.comments.length > 0) {
            await prisma.reviewComment.createMany({
                data: result.comments.map((c: any) => ({
                    reviewId: job.data.job_id,
                    filename: c.filename,
                    line: c.line,
                    severity: c.severity,
                    comment: c.comment,
                    confidence: c.confidence,
                    pastPrNumber: c.past_pr_number
                }))
            });
        }

        const riskScore = typeof result.risk_score === 'number' ? result.risk_score : null

        await prisma.pRReview.update({
            where: { id: job.data.job_id },
            data: {
                status: 'completed',
                riskScore,
                commentUrl: result.comment_url,
                commentsCount: result.comments_posted || 0,
                filesReviewed: result.files_reviewed || 0,
                completedAt: new Date()
            }
        })

        // Update active custom rules count on repository if detected by agent
        if (typeof result.custom_rules_count === 'number' && reviewRecord.repoId) {
            await prisma.repo.update({
                where: { id: reviewRecord.repoId },
                data: { customRulesCount: result.custom_rules_count }
            }).catch((err: any) => console.warn('[reviewWorker] Failed to update repo customRulesCount:', err?.message || err))
        }

        // Post GitHub Commit Status (Checks API)
        const commitSha = job.data.head_sha || result.head_sha
        if (commitSha && typeof riskScore === 'number') {
            const state = riskScore < 30 ? 'success' : riskScore <= 70 ? 'pending' : 'failure'
            const level = riskScore < 30 ? 'Low Risk' : riskScore <= 70 ? 'Moderate Risk' : 'High Risk'
            await createCommitStatus({
                installationId: job.data.installation_id,
                repoFullName: job.data.repo,
                sha: commitSha,
                state,
                description: `Risk Score: ${riskScore}/100 (${level})`,
                targetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/reviews/${job.data.job_id}`,
                context: 'Powerful AI / PR Risk',
            }).catch(console.error)
        }

        // Persist telemetry to UsageEvent for quota and analytics tracking
        const startTime = job.processedOn || job.timestamp || Date.now()
        const durationMs = Date.now() - startTime

        try {
            await prisma.usageEvent.create({
                data: {
                    eventType: 'pr_review',
                    model: 'llama-3.3-70b-versatile',
                    llmCalls: result.llm_calls || 1,
                    promptTokens: result.prompt_tokens || 0,
                    completionTokens: result.completion_tokens || 0,
                    totalTokens: result.total_tokens || 0,
                    durationMs,
                    orgId: reviewRecord.orgId,
                    repoId: reviewRecord.repoId,
                    reviewId: reviewRecord.id,
                }
            })
        } catch (usageErr: any) {
            console.error('[reviewWorker] Failed to record usage event:', usageErr?.message || usageErr)
        }

        // Increment organization's monthly review count for billing/quota tracking
        try {
            await prisma.organization.update({
                where: { id: reviewRecord.orgId },
                data: {
                    monthlyReviewCount: { increment: 1 }
                }
            })
        } catch (orgErr: any) {
            console.error('[reviewWorker] Failed to increment org monthlyReviewCount:', orgErr?.message || orgErr)
        }

        console.log(`✓ Review completed for PR #${job.data.pr_number} (${result.total_tokens || 0} tokens in ${durationMs}ms)`)
        return result
    },
    { connection, concurrency: 3, lockDuration: 300000, stalledInterval: 60000 }
);

worker.on('failed', async (job: any, err: any) => {
    console.error(`Job ${job?.id} failed:`, err.message)

    if (job?.data.job_id) {
        await prisma.pRReview.updateMany({
            where: { id: job.data.job_id },
            data: { status: 'failed' }
        }).catch(console.error)
        // updateMany never throws if record not found — unlike update
    }
});

export default worker