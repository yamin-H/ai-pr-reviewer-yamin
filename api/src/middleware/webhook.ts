import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const signature = req.headers['x-hub-signature-256'] as string
  const body = req.body.toString()

  if (!signature) {
    res.status(401).json({ error: 'No signature' })
    return
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )

  if (!valid) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  next()
}