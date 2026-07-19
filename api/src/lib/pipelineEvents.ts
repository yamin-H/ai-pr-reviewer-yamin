import { EventEmitter } from 'events'

// Singleton event emitter for pipeline progress
export const pipelineEmitter = new EventEmitter()
pipelineEmitter.setMaxListeners(100)

export interface PipelineEvent {
    job_id: string
    review_id: string
    node: string
    status: 'running' | 'completed' | 'failed'
    message?: string
    meta?: Record<string, any>
    timestamp: string
}

// In-memory store: job_id -> list of events so far (for late-joining clients)
const eventHistory = new Map<string, PipelineEvent[]>()

export function emitPipelineEvent(event: PipelineEvent) {
    const key = event.job_id
    if (!eventHistory.has(key)) {
        eventHistory.set(key, [])
    }
    eventHistory.get(key)!.push(event)
    pipelineEmitter.emit(`pipeline:${key}`, event)

    // Auto-cleanup after 1 hour
    setTimeout(() => eventHistory.delete(key), 60 * 60 * 1000)
}

export function getPipelineHistory(job_id: string): PipelineEvent[] {
    return eventHistory.get(job_id) || []
}
