import { Request, Response, NextFunction } from 'express'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../lib/session.js'
import { prisma } from '../lib/prisma.js'

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

  // Backfill orgId in session if not present
  if (!session.user.orgId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true }
    })
    if (dbUser?.orgId) {
      session.user.orgId = dbUser.orgId
      await session.save()
    }
  }

  // attach user to request for downstream use
  ;(req as any).user = session.user
  next()
};