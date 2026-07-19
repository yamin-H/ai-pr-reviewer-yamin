import { Request, Response, NextFunction } from 'express'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../lib/session.js'

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions)

  if (!session.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  // attach user to request for downstream use
  ;(req as any).user = session.user
  next()
};