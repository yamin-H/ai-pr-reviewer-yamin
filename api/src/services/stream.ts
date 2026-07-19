import { createClient } from 'redis'
import { Response } from 'express'

const subscriber = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

subscriber.connect()
const activeConnections = new Map<string, Response>()

export function registerSSEConnection(jobId: string, res: Response) {
    activeConnections.set(jobId, res)

    res.on('close', () => {
        activeConnections.delete(jobId)
        subscriber.unsubscribe(`job:${jobId}:progress`)
    });
};

export async function subscribeToJobProgress(jobId: string) {
    await subscriber.subscribe(`job:${jobId}:progress`, (message) => {
        const res = activeConnections.get(jobId)
        if (res) {
            res.write(`data: ${message}\n\n`)
        }
    });
};