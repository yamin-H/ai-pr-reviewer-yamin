import { Router, Request, Response } from 'express'
import { getInstallationOctokit } from '../lib/octokit.js'
import { prisma } from '../lib/prisma.js'
import { emitPipelineEvent, getPipelineHistory, pipelineEmitter, PipelineEvent } from '../lib/pipelineEvents.js'

const router = Router()

router.post('/installation-token', async (req: Request, res: Response) => {
    const { installation_id } = req.body

    if (!installation_id) {
        res.status(400).json({ error: 'installation_id required' })
        return
    }

    try {
        const token = await getInstallationOctokit(installation_id)
        res.json({ token })
    } catch (err) {
        console.error('Failed to get installation token:', err)
        res.status(500).json({ error: 'Failed to get installation token' })
    }
});

router.post('/review-complete', async (req: Request, res: Response) => {
    const { job_id, comments_count, comment_url, status } = req.body

    if (!job_id) {
        res.status(400).json({ error: 'job_id required' })
        return
    }

    try {
        await prisma.pRReview.updateMany({
            where: { id: job_id },
            data: {
                status: status || 'completed',
                commentUrl: comment_url || null,
                commentsCount: comments_count || 0,
                completedAt: new Date()
            }
        })
        console.log(`✓ Review ${job_id} marked as ${status || 'completed'} with ${comments_count} comments`)

        // Emit terminal event for SSE clients
        emitPipelineEvent({
            job_id,
            review_id: job_id,
            node: 'done',
            status: 'completed',
            message: `Review complete — ${comments_count} comments posted to GitHub`,
            timestamp: new Date().toISOString()
        })

        res.json({ ok: true })
    } catch (err) {
        console.error('Failed to update review status:', err)
        res.status(500).json({ error: 'DB update failed' })
    }
});

router.post('/pipeline-update', (req: Request, res: Response) => {
    const { job_id, node, status, message, meta } = req.body
    console.log(`[Pipeline] Received: ${node} → ${status} for job ${job_id}`)

    if (!job_id || !node) {
        res.status(400).json({ error: 'job_id and node required' })
        return
    }

    const event: PipelineEvent = {
        job_id,
        review_id: job_id,
        node,
        status,
        message,
        meta,
        timestamp: new Date().toISOString()
    }

    emitPipelineEvent(event)
    console.log(`[Pipeline] ${job_id} — ${node}: ${status}`)
    res.json({ ok: true })
});

router.get('/pipeline-stream/:job_id', (req: Request, res: Response) => {
    const job_id = req.params.job_id as string 

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const history = getPipelineHistory(job_id)
    for (const event of history) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
    }


    const handler = (event: PipelineEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    pipelineEmitter.on(`pipeline:${job_id}`, handler)

    const heartbeat = setInterval(() => {
        res.write(': ping\n\n')
    }, 15000)

    req.on('close', () => {
        clearInterval(heartbeat)
        pipelineEmitter.off(`pipeline:${job_id}`, handler)
    })
});



export default router