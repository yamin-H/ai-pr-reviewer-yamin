import Redis from 'ioredis'

export interface PipelineEvent {
    job_id: string
    review_id: string
    node: string
    status: 'running' | 'completed' | 'failed'
    message?: string
    meta?: Record<string, any>
    timestamp: string
}

const CHANNEL_PREFIX  = 'pipeline:'
const HISTORY_PREFIX  = 'pipeline_history:'
const HISTORY_TTL_SEC = 60 * 60 // 1 hour — matches previous in-memory auto-cleanup

/**
 * Shared publisher client. Regular ioredis instance used for PUBLISH and
 * RPUSH/EXPIRE commands. Separate from the BullMQ connection so BullMQ
 * subscriber state is never contaminated by pub/sub mode.
 */
const publisher = new (Redis as any)(process.env.REDIS_URL || 'redis://localhost:6379')

publisher.on('error', (err: any) => console.error('[pipelineEvents] Redis publisher error:', err))

/**
 * Publish a pipeline event to all SSE subscribers (across all replicas) and
 * append it to the per-job history list so late-joining clients get a replay.
 * Errors are caught and logged — a Redis failure must not crash the agent callback.
 */
export async function emitPipelineEvent(event: PipelineEvent): Promise<void> {
    const channel    = `${CHANNEL_PREFIX}${event.job_id}`
    const historyKey = `${HISTORY_PREFIX}${event.job_id}`
    const payload    = JSON.stringify(event)

    try {
        await publisher.publish(channel, payload)
        await publisher.rpush(historyKey, payload)
        await publisher.expire(historyKey, HISTORY_TTL_SEC)
    } catch (err: any) {
        console.error(`[pipelineEvents] Failed to emit event for job ${event.job_id}:`, err?.message)
    }
}

/**
 * Retrieve the ordered history of events for a job.
 * Used by SSE handler to replay past events to late-joining clients.
 */
export async function getPipelineHistory(jobId: string): Promise<PipelineEvent[]> {
    try {
        const raw: string[] = await publisher.lrange(`${HISTORY_PREFIX}${jobId}`, 0, -1)
        return raw.map((entry) => JSON.parse(entry) as PipelineEvent)
    } catch (err: any) {
        console.error(`[pipelineEvents] Failed to fetch history for job ${jobId}:`, err?.message)
        return []
    }
}

/**
 * Create a dedicated ioredis subscriber for a single SSE connection.
 * Each SSE client gets its own connection because an ioredis client in
 * subscriber mode can only run SUBSCRIBE/UNSUBSCRIBE commands.
 * The caller is responsible for calling .disconnect() when the SSE
 * connection closes.
 */
export function createSubscriber(): any {
    const sub = new (Redis as any)(process.env.REDIS_URL || 'redis://localhost:6379')
    sub.on('error', (err: any) => console.error('[pipelineEvents] Redis subscriber error:', err))
    return sub
}
