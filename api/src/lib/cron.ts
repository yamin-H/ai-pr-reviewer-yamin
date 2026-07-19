import cron from 'node-cron'
import digestQueue from '../queues/digestQueue'

export function startCronJobs() {
  // Every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('Monday digest job triggered')

    await digestQueue.add('weekly-digest', {
      triggered_at: new Date().toISOString()
    })
  })

  console.log('Cron jobs started — digest runs every Monday at 9am')
}