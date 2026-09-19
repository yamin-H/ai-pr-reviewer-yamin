import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { checkAndResetOrgQuota } from '../lib/cron.js'

const PLAN_LIMITS: Record<string, number> = {
    free: 50,
    pro: 500,
    enterprise: 10000,
}

const router = Router()

// GET /api/usage — usage metrics, token estimation, and monthly quotas
router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const now = new Date()
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { id: true, plan: true, monthlyReviewCount: true, lastQuotaResetAt: true }
        })

        if (org) {
            await checkAndResetOrgQuota(org)
        }

        const plan = org?.plan || 'free'
        const monthlyQuota = PLAN_LIMITS[plan] ?? 50

        // 1. Overall volume counts (PRReview table)
        const reviewsThisMonth = await prisma.pRReview.count({
            where: { orgId, createdAt: { gte: startOfMonth } }
        })

        const totalReviews = await prisma.pRReview.count({
            where: { orgId }
        })

        // 2. Aggregate telemetry from UsageEvent
        const allTimeUsage = await prisma.usageEvent.aggregate({
            where: { orgId },
            _sum: {
                llmCalls: true,
                promptTokens: true,
                completionTokens: true,
                totalTokens: true,
            },
            _avg: {
                durationMs: true,
            }
        })

        const monthUsage = await prisma.usageEvent.aggregate({
            where: { orgId, createdAt: { gte: startOfMonth } },
            _sum: {
                llmCalls: true,
                totalTokens: true,
            }
        })

        // Fallback calculation if UsageEvent rows are still being seeded from reviews
        const totalLLMCalls = allTimeUsage._sum.llmCalls || (totalReviews > 0 ? totalReviews * 2 : 0)
        const totalTokens = allTimeUsage._sum.totalTokens || (totalReviews > 0 ? totalReviews * 1850 : 0)
        const promptTokens = allTimeUsage._sum.promptTokens || Math.round(totalTokens * 0.75)
        const completionTokens = allTimeUsage._sum.completionTokens || Math.round(totalTokens * 0.25)
        const avgLatencyMs = Math.round(allTimeUsage._avg.durationMs || 3200)

        // 3. Daily usage breakdown (past 14 days)
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        const pastReviews = await prisma.pRReview.findMany({
            where: { orgId, createdAt: { gte: fourteenDaysAgo } },
            select: { createdAt: true, filesReviewed: true }
        })

        const pastEvents = await prisma.usageEvent.findMany({
            where: { orgId, createdAt: { gte: fourteenDaysAgo } },
            select: { createdAt: true, totalTokens: true, llmCalls: true, durationMs: true }
        })

        // Build contiguous daily bucket map
        const dailyMap: Record<string, { date: string; reviews: number; tokens: number; llmCalls: number }> = {}
        for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
            const key = d.toISOString().slice(0, 10)
            dailyMap[key] = { date: key, reviews: 0, tokens: 0, llmCalls: 0 }
        }

        for (const r of pastReviews) {
            const key = r.createdAt.toISOString().slice(0, 10)
            if (dailyMap[key]) {
                dailyMap[key].reviews += 1
            }
        }

        for (const ev of pastEvents) {
            const key = ev.createdAt.toISOString().slice(0, 10)
            if (dailyMap[key]) {
                dailyMap[key].tokens += ev.totalTokens
                dailyMap[key].llmCalls += ev.llmCalls
            }
        }

        const dailyUsage = Object.values(dailyMap)

        // 4. Per-repository usage breakdown
        const repos = await prisma.repo.findMany({
            where: { orgId },
            select: {
                id: true,
                name: true,
                fullName: true,
                private: true,
                _count: {
                    select: { reviews: true }
                }
            }
        })

        const repoUsageEvents = await prisma.usageEvent.groupBy({
            by: ['repoId'],
            where: { orgId, repoId: { not: null } },
            _sum: { totalTokens: true, llmCalls: true },
            _avg: { durationMs: true }
        })

        const repoUsageMap = new Map(repoUsageEvents.map((u) => [u.repoId, u]))

        const byRepo = repos.map((r) => {
            const usage = repoUsageMap.get(r.id)
            const tokenCount = usage?._sum.totalTokens || (r._count.reviews * 1850)
            const calls = usage?._sum.llmCalls || (r._count.reviews * 2)
            const avgDuration = Math.round(usage?._avg.durationMs || 3200)

            return {
                id: r.id,
                name: r.name,
                fullName: r.fullName,
                private: r.private,
                reviewsCount: r._count.reviews,
                totalTokens: tokenCount,
                llmCalls: calls,
                avgDurationMs: avgDuration,
            }
        }).sort((a, b) => b.totalTokens - a.totalTokens)

        // 5. Recent audit events
        const recentEvents = await prisma.usageEvent.findMany({
            where: { orgId },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                repo: {
                    select: { fullName: true }
                }
            }
        })

        res.json({
            overview: {
                plan,
                reviewsThisMonth,
                totalReviews,
                monthlyQuota,
                monthlyReviewCount: org?.monthlyReviewCount ?? reviewsThisMonth,
                totalLLMCalls,
                totalTokens,
                promptTokens,
                completionTokens,
                monthTokens: monthUsage._sum.totalTokens || (reviewsThisMonth * 1850),
                avgLatencyMs,
                monthStart: startOfMonth.toISOString(),
            },
            dailyUsage,
            byRepo,
            recentEvents: recentEvents.map((ev) => ({
                id: ev.id,
                eventType: ev.eventType,
                model: ev.model,
                llmCalls: ev.llmCalls,
                promptTokens: ev.promptTokens,
                completionTokens: ev.completionTokens,
                totalTokens: ev.totalTokens,
                durationMs: ev.durationMs,
                createdAt: ev.createdAt.toISOString(),
                repo: ev.repo?.fullName || 'unknown',
                reviewId: ev.reviewId,
            }))
        })
    } catch (err: any) {
        console.error('Failed to get usage stats:', err?.message || err)
        res.status(500).json({ error: 'Failed to fetch usage statistics' })
    }
})

export default router
