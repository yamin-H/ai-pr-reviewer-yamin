import { Router, Request, Response, NextFunction } from 'express'
import { getInstallationOctokit } from '../lib/octokit.js'
import { prisma } from '../lib/prisma.js'
import { emitPipelineEvent, getPipelineHistory, createSubscriber, PipelineEvent } from '../lib/pipelineEvents.js'
import { requireInternalAuth } from '../middleware/internalAuth.js'
import { Prisma } from '../generated/prisma/client.js'

const router = Router()

/** Must match the vector dimension declared in prisma/schema.prisma. */
const EMBEDDING_DIMENSIONS = 384
const MAX_MEMORY_CONTENT_CHARS = 10_000

function isValidEmbedding(value: unknown): value is number[] {
    return (
        Array.isArray(value) &&
        value.length === EMBEDDING_DIMENSIONS &&
        value.every((n) => typeof n === 'number' && Number.isFinite(n))
    )
}

router.post('/installation-token', requireInternalAuth, async (req: Request, res: Response) => {
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
})

router.post('/review-complete', requireInternalAuth, async (req: Request, res: Response) => {
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

        // Fire-and-forget — emitPipelineEvent catches its own errors internally.
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
})

router.post('/pipeline-update', requireInternalAuth, async (req: Request, res: Response) => {
    const { job_id, node, status, message, meta } = req.body

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

    // Fire-and-forget — emitPipelineEvent catches its own errors internally.
    emitPipelineEvent(event)
    console.log(`[Pipeline] ${job_id} — ${node}: ${status}`)
    res.json({ ok: true })
})

// POST /internal/memory/store - Store a memory entry (called by Python Agent)
router.post('/memory/store', requireInternalAuth, async (req: Request, res: Response) => {
    const { org_id, repo_id, content, decision_type, outcome, pr_number, file_path } = req.body

    if (!org_id || !repo_id || !content || !decision_type || !outcome || !pr_number) {
        res.status(400).json({ error: 'Missing required fields: org_id, repo_id, content, decision_type, outcome, pr_number' })
        return
    }

    if (typeof content !== 'string' || content.length > MAX_MEMORY_CONTENT_CHARS) {
        res.status(400).json({ error: `content must be a string of at most ${MAX_MEMORY_CONTENT_CHARS} characters` })
        return
    }

    if (!Number.isSafeInteger(Number(pr_number)) || Number(pr_number) <= 0) {
        res.status(400).json({ error: 'pr_number must be a positive integer' })
        return
    }

    try {
        // Resolve Organization by githubId or login
        let org = await prisma.organization.findFirst({
            where: {
                OR: [
                    { id: org_id },
                    { githubId: org_id },
                    { login: org_id }
                ]
            }
        })

        if (!org) {
            res.status(404).json({ error: 'Organization not found' })
            return
        }

        // Resolve Repo by githubId, fullName, or name (scoped to org)
        let repo = await prisma.repo.findFirst({
            where: {
                orgId: org.id,
                OR: [
                    { id: repo_id },
                    { githubId: repo_id },
                    { fullName: repo_id },
                    { name: repo_id }
                ]
            }
        })

        if (!repo) {
            res.status(404).json({ error: 'Repository not found for this organization' })
            return
        }

        // Get embedding from request (generated by Agent)
        const embedding = req.body.embedding
        if (!isValidEmbedding(embedding)) {
            res.status(400).json({
                error: `Embedding must be an array of ${EMBEDDING_DIMENSIONS} finite numbers`
            })
            return
        }

        const vectorStr = `[${embedding.join(',')}]`

        // Use raw query for pgvector embedding field
        const result = await prisma.$queryRawUnsafe<{ id: string }[]>(
            `INSERT INTO "MemoryEntry" 
            ("id", "orgId", "repoId", "content", "embedding", "decisionType", "outcome", "prNumber", "filePath")
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, $5, $6, $7, $8)
            RETURNING "id"`,
            org.id,
            repo.id,
            content,
            vectorStr,
            decision_type,
            outcome,
            pr_number,
            file_path || null
        )

        const memoryEntryId = result[0]?.id

        console.log(`[Memory] Stored decision for PR #${pr_number} in ${repo.fullName}: ${content.slice(0, 60)}...`)
        res.json({ success: true, id: memoryEntryId })
    } catch (err) {
        console.error('Failed to store memory entry:', err)
        res.status(500).json({ error: 'Failed to store memory entry' })
    }
})

// POST /internal/memory/search - Search memory entries (called by Python Agent)
router.post('/memory/search', requireInternalAuth, async (req: Request, res: Response) => {
    const { repo_id, query, embedding } = req.body

    if (!repo_id || (!query && !embedding)) {
        res.status(400).json({ error: 'Missing required fields: repo_id and (query or embedding)' })
        return
    }

    // Clamp the caller-supplied limit so an internal caller cannot request an
    // unbounded result set.
    const requestedLimit = Number(req.body.limit ?? 5)
    const limit = Number.isSafeInteger(requestedLimit)
        ? Math.min(50, Math.max(1, requestedLimit))
        : 5

    try {
        // Resolve Repo by githubId, fullName, or name
        const repo = await prisma.repo.findFirst({
            where: {
                OR: [
                    { id: repo_id },
                    { githubId: repo_id },
                    { fullName: repo_id },
                    { name: repo_id }
                ]
            }
        })

        if (!repo) {
            res.status(404).json({ error: 'Repository not found' })
            return
        }

        // For vector search, we need to use raw SQL since Prisma doesn't fully support pgvector
        // The Agent will send the embedding, so we use that directly
        if (!isValidEmbedding(embedding)) {
            res.status(400).json({
                error: `Embedding must be an array of ${EMBEDDING_DIMENSIONS} finite numbers`
            })
            return
        }
        const vector = embedding

        const vectorStr = `[${vector.join(',')}]`

        const rows = await prisma.$queryRawUnsafe<
            Array<{
                content: string
                decision_type: string
                outcome: string
                pr_number: number
                file_path: string | null
                similarity: number
            }>
        >(
            `SELECT 
                "content",
                "decisionType" as decision_type,
                "outcome",
                "prNumber" as pr_number,
                "filePath" as file_path,
                1 - ("embedding" <=> $1::vector) as similarity
            FROM "MemoryEntry"
            WHERE "repoId" = $2
            ORDER BY "embedding" <=> $1::vector
            LIMIT $3`,
            vectorStr,
            repo.id,
            limit
        )

        res.json({ results: rows })
    } catch (err) {
        console.error('Failed to search memory:', err)
        res.status(500).json({ error: 'Failed to search memory' })
    }
})

/**
 * Authorization middleware for the tenant-facing pipeline SSE endpoint.
 * A review id is not a capability: without this check any authenticated user
 * could subscribe to another organization's live review events by guessing
 * or observing a job id.
 */
export async function authorizePipelineStream(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const jobId = req.params.job_id as string
        const orgId = (req as any).user?.orgId as string | undefined

        if (!orgId) {
            res.status(401).json({ error: 'Authentication required' })
            return
        }

        const review = await prisma.pRReview.findUnique({
            where: { id: jobId },
            select: { orgId: true }
        })

        // Return 404 for both "not found" and "belongs to another org" so the
        // endpoint cannot be used to probe for valid review ids.
        if (!review || review.orgId !== orgId) {
            res.status(404).json({ error: 'Review not found' })
            return
        }

        next()
    } catch (err: any) {
        console.error('[pipeline-stream] Authorization check failed:', err?.message || err)
        res.status(500).json({ error: 'Failed to authorize pipeline stream' })
    }
}

/**
 * SSE endpoint for the pipeline visualizer.
 * Each connecting client gets its own Redis subscriber so events are
 * delivered across all API replicas — not just the one that processed
 * the review job.
 */
export async function handlePipelineStream(req: Request, res: Response): Promise<void> {
    const job_id = req.params.job_id as string

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    // Replay history so clients joining mid-review or after completion
    // immediately see all past events.
    const history = await getPipelineHistory(job_id)
    for (const event of history) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    // Create a dedicated subscriber for this SSE connection.
    const subscriber = createSubscriber()
    const channel = `pipeline:${job_id}`

    await subscriber.subscribe(channel)

    subscriber.on('message', (_chan: string, message: string) => {
        res.write(`data: ${message}\n\n`)
    })

    const heartbeat = setInterval(() => {
        res.write(': ping\n\n')
    }, 15000)

    req.on('close', () => {
        clearInterval(heartbeat)
        subscriber.unsubscribe(channel).catch(() => {})
        subscriber.disconnect()
    })
}

router.get('/pipeline-stream/:job_id', requireInternalAuth, handlePipelineStream)

export default router