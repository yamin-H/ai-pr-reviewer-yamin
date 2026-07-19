import { Queue } from 'bullmq'
import connection from '../lib/redis.js'

export interface ReviewJobData {
    job_id: string;
    repo: string;
    pr_number: number;
    installation_id: number;
}

const reviewQueue = new Queue<ReviewJobData>('review-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,          
        backoff: {
            type: 'exponential',
            delay: 5000         
        },
        removeOnComplete: 100, 
        removeOnFail: 50       
    }
});

export default reviewQueue