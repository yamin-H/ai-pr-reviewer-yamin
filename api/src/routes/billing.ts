import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { checkAndResetOrgQuota } from '../lib/cron.js'

export const PLAN_CONFIG = {
    free: {
        id: 'free',
        name: 'Developer Free',
        price: 0,
        billingPeriod: 'forever',
        quota: 50,
        concurrency: 1,
        features: [
            '50 PR reviews / month',
            'Standard AI review models (Llama 3.3 70B)',
            'Base AST and heuristics scanning',
            'Standard review latency',
            'Community issue support',
        ],
        description: 'Ideal for solo developers, open-source maintainers, and individual prototyping.',
    },
    pro: {
        id: 'pro',
        name: 'Team Pro',
        price: 49,
        billingPeriod: 'per month',
        quota: 500,
        concurrency: 3,
        features: [
            '500 PR reviews / month',
            'High-priority BullMQ processing queue',
            'Synchronize re-audits on commit push',
            'Adjustable AI confidence thresholds (0.1–0.9)',
            'Vector memory & historical pattern recognition',
            'CSV audit reporting & weekly team digests',
            'Priority email support',
        ],
        description: 'Engineered for fast-moving product teams requiring continuous, high-volume review automation.',
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise Scale',
        price: 249,
        billingPeriod: 'per month',
        quota: 10000,
        concurrency: 10,
        features: [
            'Unlimited PR reviews (10,000 / month fair-use)',
            'Dedicated worker isolation & concurrency',
            'Custom fine-tuned organization memory rules',
            'SLA guarantees (99.9% review uptime)',
            'Audit log retention & compliance exports',
            'Designated solutions engineer support',
        ],
        description: 'Customized for enterprise engineering orgs with strict security, throughput, and memory requirements.',
    },
}

const router = Router()

// GET /api/billing/subscription — current plan, quota metrics, and tier details
router.get('/subscription', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                id: true,
                login: true,
                plan: true,
                monthlyReviewCount: true,
                lastQuotaResetAt: true,
                planExpiresAt: true,
                createdAt: true,
            },
        })

        if (!org) {
            res.status(404).json({ error: 'Organization not found' })
            return
        }

        const activeCount = await checkAndResetOrgQuota(org)
        const currentPlanKey = (org.plan as keyof typeof PLAN_CONFIG) || 'free'
        const currentTier = PLAN_CONFIG[currentPlanKey] || PLAN_CONFIG.free

        const now = new Date()
        const nextMonthReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

        const tiers = Object.values(PLAN_CONFIG).map((tier) => ({
            ...tier,
            isCurrent: tier.id === currentPlanKey,
        }))

        res.json({
            organization: {
                id: org.id,
                login: org.login,
            },
            subscription: {
                plan: currentPlanKey,
                planName: currentTier.name,
                status: 'active',
                price: currentTier.price,
                billingPeriod: currentTier.billingPeriod,
                monthlyReviewCount: activeCount,
                monthlyQuota: currentTier.quota,
                quotaUsedPercent: Math.min(100, Math.round((activeCount / currentTier.quota) * 100)),
                lastQuotaResetAt: org.lastQuotaResetAt.toISOString(),
                nextQuotaResetAt: nextMonthReset.toISOString(),
                planExpiresAt: org.planExpiresAt ? org.planExpiresAt.toISOString() : null,
            },
            tiers,
        })
    } catch (err: any) {
        console.error('Failed to get billing subscription:', err?.message || err)
        res.status(500).json({ error: 'Failed to retrieve billing information' })
    }
})

// POST /api/billing/select-plan — showcase plan switcher (Free / Pro / Enterprise)
router.post('/select-plan', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const { plan } = req.body

        if (!plan || !['free', 'pro', 'enterprise'].includes(plan)) {
            res.status(400).json({ error: 'Invalid plan. Allowed plans: free, pro, enterprise' })
            return
        }

        const updatedOrg = await prisma.organization.update({
            where: { id: orgId },
            data: {
                plan,
                planExpiresAt: plan === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
            select: {
                id: true,
                login: true,
                plan: true,
                monthlyReviewCount: true,
                planExpiresAt: true,
            },
        })

        const tier = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]

        console.log(`[billing] Organization @${updatedOrg.login} updated plan to ${plan.toUpperCase()}`)

        res.json({
            success: true,
            plan: updatedOrg.plan,
            message: `Successfully switched organization to ${tier.name}!`,
            quota: tier.quota,
        })
    } catch (err: any) {
        console.error('Failed to update plan:', err?.message || err)
        res.status(500).json({ error: 'Failed to switch subscription plan' })
    }
})

// POST /api/billing/create-checkout-session — showcase checkout redirect simulation
router.post('/create-checkout-session', async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.orgId as string
        const { plan } = req.body

        if (!plan || !['pro', 'enterprise'].includes(plan)) {
            res.status(400).json({ error: 'Invalid plan for checkout' })
            return
        }

        // Showcase bypass: automatically upgrade plan without credit card requirement
        await prisma.organization.update({
            where: { id: orgId },
            data: {
                plan,
                planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
        })

        res.json({
            simulated: true,
            success: true,
            plan,
            message: `Showcase Mode: Instant activation granted for ${plan.toUpperCase()} tier.`,
        })
    } catch (err: any) {
        console.error('Checkout session error:', err?.message || err)
        res.status(500).json({ error: 'Failed to initiate checkout session' })
    }
})

// POST /api/billing/webhook or /billing/webhook — simulated payment webhook event receiver
export const billingWebhookHandler = async (req: Request, res: Response) => {
    try {
        const event = req.body
        const eventType = event?.type || 'unknown'

        console.log(`[billing-webhook] Received billing event: ${eventType}`)

        switch (eventType) {
            case 'checkout.session.completed': {
                const orgId = event?.data?.object?.client_reference_id
                if (orgId) {
                    await prisma.organization.update({
                        where: { id: orgId },
                        data: { plan: 'pro', planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
                    }).catch(console.error)
                }
                break
            }
            case 'customer.subscription.deleted': {
                const orgId = event?.data?.object?.client_reference_id
                if (orgId) {
                    await prisma.organization.update({
                        where: { id: orgId },
                        data: { plan: 'free', planExpiresAt: null }
                    }).catch(console.error)
                }
                break
            }
            default:
                break
        }

        res.status(200).json({ received: true, eventType })
    } catch (err: any) {
        console.error('Billing webhook error:', err?.message || err)
        res.status(400).json({ error: 'Webhook handler error' })
    }
}

router.post('/webhook', billingWebhookHandler)

export default router
