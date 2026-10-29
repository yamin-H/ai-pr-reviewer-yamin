import axios, { AxiosError } from 'axios'

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000'
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY

// Create axios instance with retry logic
const agentClient = axios.create({
  baseURL: AGENT_URL,
  timeout: 120000, // 2 minutes - shorter than before
  headers: { 'x-internal-secret': INTERNAL_SERVICE_KEY }
})

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAYS = [2000, 5000, 10000] // 2s, 5s, 10s

async function requestWithRetry<T>(
  method: 'post' | 'get',
  url: string,
  data?: any,
  idempotencyKey?: string
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config: any = {}
      if (idempotencyKey) {
        config.headers = { 'Idempotency-Key': idempotencyKey }
      }

      const response = await agentClient[method]<T>(url, data, config)
      return response.data
    } catch (error) {
      lastError = error as Error

      const axiosError = error as AxiosError
      const isRetryable = 
        !axiosError.response || // Network error
        axiosError.code === 'ECONNABORTED' || // Timeout
        (axiosError.response.status >= 500 && axiosError.response.status < 600) // Server error

      // Don't retry client errors (4xx)
      if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
        throw error
      }

      if (attempt < MAX_RETRIES && isRetryable) {
        const delay = RETRY_DELAYS[attempt]
        console.warn(`Agent API ${method.toUpperCase()} ${url} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms:`, axiosError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        break
      }
    }
  }

  throw lastError
}

export async function triggerReview(payload: {
    job_id: string;
    repo: string;
    repo_id: string;  // Prisma cuid for repo
    pr_number: number;
    installation_id: number;
    confidence_threshold?: number;
    past_dismissal_rate?: number;
    head_sha?: string;
}) {
    // Use job_id as idempotency key - prevents duplicate reviews
    return requestWithRetry('post', '/review', payload, `review-${payload.job_id}`)
}

export async function sendFeedbackToAgent(payload: {
    org_id: string;
    repo_id: string;
    pr_number: number;
    file_path?: string | null;
    line?: number | null;
    severity?: string | null;
    comment: string;
    action: 'approve' | 'dismiss';
}) {
    return requestWithRetry('post', '/memory/learn', payload, `feedback-${payload.org_id}-${payload.repo_id}-${payload.pr_number}`)
}
