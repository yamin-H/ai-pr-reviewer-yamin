import { Queue } from 'bullmq'
import connection from '../lib/redis.js'

export interface ReviewJobData {
    job_id: string;
    repo: string;
    pr_number: number;
    installation_id: number;
    head_sha?: string;
}

// Job ID will be the review record ID (cuid) for idempotency
const reviewQueue = new Queue<ReviewJobData>('review-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,          
        backoff: {
            type: 'exponential',
            delay: 5000         
        },
        removeOnComplete: 100, 
        removeOnFail: 50,
        // Use job_id as BullMQ job ID for idempotency
        // This prevents duplicate jobs even if webhook fires multiple times
    }
});

export default reviewQueue