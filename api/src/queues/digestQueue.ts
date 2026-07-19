import { Queue } from 'bullmq'
import connection from '../lib/redis.js'

export interface DigestJobData {
  triggered_at: string
}

const digestQueue = new Queue<DigestJobData>('digest-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 10,
        removeOnFail: 10
    }
});

export default digestQueue