import cron from 'node-cron'
import digestQueue from '../queues/digestQueue.js'
import { prisma } from './prisma.js'

/**
 * Checks if the organization's monthly review quota needs resetting.
 * Self-heals if the monthly cron was missed due to server downtime.
 */
export async function checkAndResetOrgQuota(org: {
  id: string
  monthlyReviewCount?: number | null
  lastQuotaResetAt?: Date | null
}): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  if (!org.lastQuotaResetAt || new Date(org.lastQuotaResetAt) < startOfMonth) {
    try {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          monthlyReviewCount: 0,
          lastQuotaResetAt: now,
        }
      })
      return 0
    } catch (err: any) {
      console.error(`[quota] Failed to auto-reset monthly quota for org ${org.id}:`, err?.message || err)
    }
  }
  return org.monthlyReviewCount ?? 0
}

export function startCronJobs() {
  // Every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('Monday digest job triggered')

    await digestQueue.add('weekly-digest', {
      triggered_at: new Date().toISOString()
    })
  })

  // 1st of every month at 00:00 UTC: reset organization monthly review quotas
  cron.schedule('0 0 1 * *', async () => {
    console.log('[cron] Resetting monthly review counts for all organizations...')
    try {
      const res = await prisma.organization.updateMany({
        data: {
          monthlyReviewCount: 0,
          lastQuotaResetAt: new Date(),
        }
      })
      console.log(`[cron] Monthly review counts reset for ${res.count} organizations.`)
    } catch (err: any) {
      console.error('[cron] Failed to reset monthly review counts:', err?.message || err)
    }
  })

  console.log('Cron jobs started — digest on Mondays, quota reset on 1st of month')
}