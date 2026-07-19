import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import webhookRoutes from './routes/webhooks.js'
import repoRoutes from './routes/repos.js'
import reviewRoutes from './routes/review.js'
import memoryRoutes from './routes/memory.js'
import digestRoutes from './routes/digest.js'
import authRoutes from './routes/auth.js'
import internalRoutes from './routes/internal.js'
import { requireAuth } from './middleware/auth.js'
import { startCronJobs } from './lib/cron.js'
import digestQueue from './queues/digestQueue.js'
import './workers/reviewWorker.js'
import './workers/digestWorker.js'
import jobRoutes from './routes/job.js'


const app = express()
const PORT = process.env.PORT || 3000

app.use('/webhooks', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true  
}));


app.use('/webhooks', webhookRoutes)
app.use('/auth', authRoutes)
app.use('/internal', internalRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pr-review-agent-api' })
})

app.use('/api/repos', requireAuth, repoRoutes)
app.use('/api/reviews', requireAuth, reviewRoutes)
app.use('/api/memory', requireAuth, memoryRoutes)
app.use('/api/digest', requireAuth, digestRoutes)
app.use('/api/jobs', jobRoutes)

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`)
});

startCronJobs()

export default app