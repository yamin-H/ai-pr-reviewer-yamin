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
import internalRoutes, { handlePipelineStream, authorizePipelineStream } from './routes/internal.js'
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
// ---------------------------------------------------------------------------

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 20,
    standardHeaders: true,  
    legacyHeaders: false,
    message: { error: 'Too many authentication requests. Please try again later.' }
})

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' }
})

const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Webhook rate limit exceeded.' }
})

const app = express()
const PORT = process.env.PORT || 3000

// Do not advertise the server implementation.
app.disable('x-powered-by')

// Baseline security headers.
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    next()
})

app.use('/webhooks', express.raw({ type: 'application/json' }))
app.use(express.json({
    // Retain the exact bytes so webhook handlers can verify HMAC signatures
    // over the raw request body rather than a re-serialized object.
    verify: (req, _res, buf) => {
        ;(req as any).rawBody = Buffer.from(buf)
    }
}))

// CORS configuration supporting multiple origins (local development + production + preview deployments)
const allowedOrigins = Array.from(new Set([
    process.env.FRONTEND_URL,
    'http://localhost:3001',
    'http://127.0.0.1:3001',
].filter(Boolean) as string[]))

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true)
        
        // Check against allowed origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        
        // In production, allow Vercel preview deployments (subdomains of production domain)
        if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
            try {
                const prodUrl = new URL(process.env.FRONTEND_URL)
                const requestUrl = new URL(origin)
                // Allow same domain or subdomains
                if (requestUrl.hostname === prodUrl.hostname || 
                    requestUrl.hostname.endsWith('.' + prodUrl.hostname)) {
                    return callback(null, true)
                }
            } catch {}
        }
        
        callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie']
}))

app.use('/webhooks', webhookLimiter, webhookRoutes)
app.use('/auth',     authLimiter,    authRoutes)
app.use('/internal', internalRoutes) 

app.get('/health', async (_req, res) => {
    const checks = {
      database: 'unknown',
      redis: 'unknown',
    }

    // Check database
    try {
      const { prisma } = await import('./lib/prisma.js')
      await prisma.$queryRaw`SELECT 1`
      checks.database = 'ok'
    } catch {
      checks.database = 'failed'
    }

    // Check Redis
    try {
      const { default: redis } = await import('./lib/redis.js')
      await redis.ping()
      checks.redis = 'ok'
    } catch {
      checks.redis = 'failed'
    }

    const healthy = checks.database === 'ok' && checks.redis === 'ok'
    const statusCode = healthy ? 200 : 503

    res.status(statusCode).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'pr-review-agent-api',
      checks,
      timestamp: new Date().toISOString()
    })
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
app.get(
    '/api/pipeline/stream/:job_id',
    apiLimiter,
    requireAuth,
    authorizePipelineStream,
    handlePipelineStream
)

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`)
})

startCronJobs()

export default app
