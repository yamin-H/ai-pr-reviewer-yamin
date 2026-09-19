import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import webhookRoutes from './routes/webhooks.js'
import repoRoutes from './routes/repos.js'
import reviewRoutes from './routes/review.js'
import memoryRoutes from './routes/memory.js'
import digestRoutes from './routes/digest.js'
import authRoutes from './routes/auth.js'
import internalRoutes, { handlePipelineStream } from './routes/internal.js'
import { requireAuth } from './middleware/auth.js'
import { assertInternalKeyConfigured } from './middleware/internalAuth.js'
import { startCronJobs } from './lib/cron.js'
import digestQueue from './queues/digestQueue.js'
import './workers/reviewWorker.js'
import './workers/digestWorker.js'
import jobRoutes from './routes/job.js'
import settingsRoutes from './routes/settings.js'
import usageRoutes from './routes/usage.js'
import billingRoutes, { billingWebhookHandler } from './routes/billing.js'

// ---------------------------------------------------------------------------
// Startup environment validation
// ---------------------------------------------------------------------------

if (!process.env.SESSION_SECRET) {
    throw new Error(
        'SESSION_SECRET environment variable is not set. ' +
        'This secret is required to encrypt user session cookies. ' +
        'Set it in your .env file or container environment and restart.'
    )
}

assertInternalKeyConfigured()

// ---------------------------------------------------------------------------
// Rate limiters
// Three tiers, applied per route group before handlers are registered.
// Note: these are in-process counters — under horizontal scaling each replica
// enforces its own limit (effective limit = N × window max). A Redis store
// (rate-limit-redis) can be added later for exact cross-replica enforcement.
// ---------------------------------------------------------------------------

/** Auth endpoints — strict. Protects against brute-force OAuth abuse. */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,   // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    message: { error: 'Too many authentication requests. Please try again later.' }
})

/** General API — moderate. Generous enough for normal usage, blocks automated abuse. */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' }
})

/** Webhooks — generous. GitHub delivers in bursts from a small set of IPs. */
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Webhook rate limit exceeded.' }
})

// Validate required secrets before registering routes or binding the port.
// If any required variable is missing the process throws and exits with a
// non-zero code, making the misconfiguration immediately visible in logs
// and container orchestrators (Docker, Kubernetes, Render, etc.).
// ---------------------------------------------------------------------------

const app = express()
const PORT = process.env.PORT || 3000

app.use('/webhooks', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true
}))

// Route registration — rate limiters applied per group
app.use('/webhooks', webhookLimiter, webhookRoutes)
app.use('/auth',     authLimiter,    authRoutes)
app.use('/internal', internalRoutes)  // protected by x-internal-secret, not rate-limited

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'pr-review-agent-api' })
})

app.post('/billing/webhook', webhookLimiter, billingWebhookHandler)
app.use('/api/repos',    apiLimiter, requireAuth, repoRoutes)
app.use('/api/reviews',  apiLimiter, requireAuth, reviewRoutes)
app.use('/api/memory',   apiLimiter, requireAuth, memoryRoutes)
app.use('/api/digest',   apiLimiter, requireAuth, digestRoutes)
app.use('/api/jobs',     apiLimiter, requireAuth, jobRoutes)
app.use('/api/settings', apiLimiter, requireAuth, settingsRoutes)
app.use('/api/usage',    apiLimiter, requireAuth, usageRoutes)
app.use('/api/billing',  apiLimiter, requireAuth, billingRoutes)
app.get('/api/pipeline/stream/:job_id', handlePipelineStream)

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`)
})

startCronJobs()

export default app
