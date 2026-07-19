import { Worker } from 'bullmq'
import connection from '../lib/redis.js'
import { triggerReview } from '../services/agent.js'
import { ReviewJobData } from '../queues/reviewQueue.js'
import {prisma} from '../lib/prisma.js'

const worker = new Worker<ReviewJobData>(
    'review-queue',
    async (job) => {
        console.log(`Processing review job ${job.id} for PR #${job.data.pr_number}`)

        // check if review record exists before proceeding
        const reviewRecord = await prisma.pRReview.findUnique({
            where: { id: job.data.job_id }
        })

        if (!reviewRecord) {
            console.error(`No PRReview record found for job_id: ${job.data.job_id} — skipping`)
            // don't throw — just return so it doesn't retry
            return { skipped: true, reason: 'no db record found' }
        }

        const result = await triggerReview({
            job_id: job.data.job_id,
            repo: job.data.repo,
            pr_number: job.data.pr_number,
            installation_id: job.data.installation_id
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

        await prisma.pRReview.update({
            where: { id: job.data.job_id },
            data: {
                status: 'completed',
                commentUrl: result.comment_url,
                commentsCount: result.comments_posted || 0,
                completedAt: new Date()
            }
        })

        console.log(`✓ Review completed for PR #${job.data.pr_number}`)
        return result
    },
    { connection, concurrency: 3 }
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