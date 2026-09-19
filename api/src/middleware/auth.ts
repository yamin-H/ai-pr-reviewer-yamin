import { Request, Response, NextFunction } from 'express'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../lib/session.js'
import { prisma } from '../lib/prisma.js'

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = await getIronSession<SessionData>(req, res, sessionOptions)

  if (!session.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  // Backfill orgId in session if not present.
  // This handles sessions that were created before orgId was stored in the
  // cookie (e.g. users who logged in during an earlier version).
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

  // If orgId is still missing after the DB backfill, the session is corrupt
  // or belongs to a user record with no organization association.
  // Reject here rather than allowing an unscoped request that would return
  // data from all organizations (cross-tenant data leak).
  if (!session.user.orgId) {
    res.status(403).json({
      error: 'Session is missing organization context. Please sign out and sign in again.'
    })
    return
  }

  // Attach the fully-validated user to the request for downstream routes.
  // Invariant guaranteed to downstream: user.orgId is a non-empty string.
  ;(req as any).user = session.user
  next()
}