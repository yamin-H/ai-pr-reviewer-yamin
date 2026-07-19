import { Worker } from 'bullmq'
import connection from '../lib/redis.js'
import { DigestJobData } from '../queues/digestQueue.js'
import {prisma} from '../lib/prisma.js'
import axios from 'axios'

const worker = new Worker<DigestJobData>(
    'digest-queue',
    async (job) => {
        console.log('Processing weekly digest job')

        // get all orgs
        const orgs = await prisma.organization.findMany()

        for (const org of orgs) {
            // get this week's reviews
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)

            const reviews = await prisma.pRReview.findMany({
                where: {
                    orgId: org.id,
                    createdAt: { gte: weekAgo },
                    status: 'completed'
                },
                include: { comments: true }
            })

            if (reviews.length === 0) continue

            const flagsRaised = reviews.reduce((sum: number, r: any) => sum + r.commentsCount, 0)

            const feedbackActions = await prisma.feedbackAction.findMany({
                where: {
                    review: { orgId: org.id },
                    createdAt: { gte: weekAgo }
                }
            })

            const approved = feedbackActions.filter((f: any) => f.action === 'approved').length
            const dismissed = feedbackActions.filter((f: any) => f.action === 'dismissed').length

            // call Python agent to generate digest summary
            const agentResponse = await axios.post(
                `${process.env.AGENT_URL}/digest`,
                {
                    org_id: org.id,
                    prs_reviewed: reviews.length,
                    flags_raised: flagsRaised,
                    flags_approved: approved,
                    flags_dismissed: dismissed,
                    reviews: reviews.map((r: any) => ({
                        pr_number: r.prNumber,
                        comments: r.comments.map((c: any) => c.comment)
                    }))
                }
            )

            const { top_issue, top_dismissed, patterns_learned } = agentResponse.data

            // store digest
            await prisma.weeklyDigest.create({
                data: {
                    weekOf: weekAgo,
                    prsReviewed: reviews.length,
                    flagsRaised,
                    flagsApproved: approved,
                    flagsDismissed: dismissed,
                    topIssue: top_issue,
                    topDismissed: top_dismissed,
                    patternsLearned: patterns_learned || 0,
                    orgId: org.id
                }
            })

            console.log(`✓ Digest created for ${org.login}`)
        }
    },
    { connection }
);

worker.on('failed', (job, err) => {
    console.error(`Digest job failed:`, err.message)
});

export default worker