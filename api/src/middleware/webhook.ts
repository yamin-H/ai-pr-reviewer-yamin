import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not configured on the server')
    res.status(500).json({ error: 'Webhook secret not configured' })
    return
  }

  const signature = req.headers['x-hub-signature-256'] as string
  if (!signature || !signature.startsWith('sha256=')) {
    res.status(401).json({ error: 'No or malformed signature' })
    return
  }

  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '')
    const expected = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    next()
  } catch (err) {
    console.error('Webhook signature verification error:', err)
    res.status(401).json({ error: 'Invalid signature verification' })
  }
}