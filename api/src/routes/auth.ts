import { Router, Request, Response } from 'express'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../lib/session.js'
import { prisma } from '../lib/prisma.js'
import { generateJWT, getInstallationOctokit } from '../lib/octokit.js'
import axios from 'axios'
import crypto from 'crypto'

const router = Router()

/** Constant-time string comparison that is safe for unequal lengths. */
function timingSafeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return crypto.timingSafeEqual(aBuf, bBuf)
}

// Step 1 — redirect user to GitHub OAuth
// After OAuth, if app is not installed, user is redirected to /install page
router.get('/github', async (req: Request, res: Response) => {
    // OAuth `state` prevents login CSRF: an attacker cannot make a victim's
    // browser complete an OAuth flow that belongs to the attacker's account.
    const state = crypto.randomBytes(32).toString('hex')
    const session = await getIronSession<SessionData>(req, res, sessionOptions)
    session.oauthState = state
    await session.save()

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        scope: 'read:user read:org',
        state,
    })
    res.redirect(`https://github.com/login/oauth/authorize?${params}`)
});

// Step 2 — GitHub redirects back with OAuth code
router.get('/github/callback', async (req: Request, res: Response) => {
    const { code, state } = req.query

    if (typeof code !== 'string' || !code) {
        res.status(400).json({ error: 'No code provided' })
        return
    }

    // Validate the OAuth state generated in step 1 before exchanging the code.
    const session = await getIronSession<SessionData>(req, res, sessionOptions)
    const expectedState = session.oauthState

    if (
        !expectedState ||
        typeof state !== 'string' ||
        !timingSafeEqual(state, expectedState)
    ) {
        console.warn('OAuth callback rejected: missing or invalid state parameter')
        res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`)
        return
    }

    try {
        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID!,
                client_secret: process.env.GITHUB_CLIENT_SECRET!,
                code
            },
            { headers: { Accept: 'application/json' } }
        )

        const accessToken = tokenResponse.data.access_token

        if (!accessToken) {
            console.error('No access token returned:', tokenResponse.data)
            res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`)
            return
        }

        // Fetch user profile from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        })

        const githubUser = userResponse.data

        // Fetch user's organizations to find which ones have the app installed
        const orgsResponse = await axios.get('https://api.github.com/user/orgs', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        })

        const userOrgs = orgsResponse.data.map((o: any) => o.login)
        // Also include the user's own account as a potential "org"
        userOrgs.unshift(githubUser.login)

        // Find organizations where the app is installed
        const installedOrgs = await prisma.organization.findMany({
            where: {
                login: { in: userOrgs },
                isInstalled: true
            }
        })

        if (installedOrgs.length === 0) {
            // App not installed for any of user's orgs — clear the one-time
            // OAuth state and redirect to the install page.
            delete session.oauthState
            await session.save()

            const installParams = new URLSearchParams({ login: githubUser.login })
            res.redirect(`${process.env.FRONTEND_URL}/install?${installParams}`)
            return
        }

        // The user may only ever switch between organizations that GitHub
        // confirmed they belong to during this login. Persist that allowlist
        // in the encrypted session so /auth/switch-org can verify it later.
        const allowedOrgIds = installedOrgs.map((org) => org.id)

        if (installedOrgs.length === 1) {
            // Single org - auto-select and create session
            await createSession(req, res, installedOrgs[0], githubUser, allowedOrgIds)
            res.redirect(`${process.env.FRONTEND_URL}/dashboard`)
            return
        }

        // Multiple orgs - create an authenticated session for the first org,
        // then let the user pick which one to activate. The session already
        // carries the full allowlist, so /auth/switch-org can safely validate
        // the choice.
        await createSession(req, res, installedOrgs[0], githubUser, allowedOrgIds)

        const orgParams = new URLSearchParams()
        installedOrgs.forEach(org => {
            orgParams.append('orgs', JSON.stringify({ id: org.id, login: org.login }))
        })
        orgParams.set('github_user', JSON.stringify({
            id: githubUser.id,
            login: githubUser.login,
            avatar_url: githubUser.avatar_url
        }))
        res.redirect(`${process.env.FRONTEND_URL}/select-org?${orgParams.toString()}`)
    } catch (err) {
        console.error('OAuth error:', err)
        // Best-effort: do not leave a reusable OAuth state in the cookie.
        try {
            delete session.oauthState
            await session.save()
        } catch { /* response may already be committed */ }
        res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`)
    }
})

// Helper function to create (or update) the signed-in user's session.
async function createSession(
    req: Request,
    res: Response,
    org: any,
    githubUser: any,
    allowedOrgIds: string[]
) {
    const user = await prisma.user.upsert({
        where: { githubId: String(githubUser.id) },
        update: { login: githubUser.login, avatarUrl: githubUser.avatar_url, orgId: org.id },
        create: {
            githubId: String(githubUser.id),
            login: githubUser.login,
            avatarUrl: githubUser.avatar_url,
            orgId: org.id
        }
    })

    const session = await getIronSession<SessionData>(req, res, sessionOptions)
    // Burn the one-time OAuth state in the same save that establishes the login.
    delete session.oauthState
    session.user = {
        id: user.id,
        githubId: user.githubId,
        login: user.login,
        avatarUrl: user.avatarUrl || '',
        orgId: user.orgId,
        allowedOrgIds,
    }
    await session.save()

    return user
}

// Step 3 — GitHub App installation callback
// GitHub redirects here after user installs the App on their account/org.
// URL: /auth/github/installed?installation_id=xxx&setup_action=install
// NOTE: GitHub does NOT send `login` — we look it up via the API using the installation_id
router.get('/github/installed', async (req: Request, res: Response) => {
    const { installation_id } = req.query

    if (!installation_id) {
        res.redirect(`${process.env.FRONTEND_URL}/install?error=missing_params`)
        return
    }

    try {
        const installId = Number(installation_id)

        if (!Number.isSafeInteger(installId) || installId <= 0) {
            res.redirect(`${process.env.FRONTEND_URL}/install?error=invalid_installation`)
            return
        }

        // Look up the account details from GitHub API using a JWT
        let orgLogin: string
        let accountId: string = ""
        let accountType: string = "Organization"
        try {
            const installationRes = await axios.get(
                `https://api.github.com/app/installations/${installId}`,
                {
                    headers: {
                        Authorization: `Bearer ${generateJWT()}`,
                        Accept: 'application/vnd.github.v3+json'
                    }
                }
            )
            orgLogin = installationRes.data.account.login
            accountId = String(installationRes.data.account.id || orgLogin)
            accountType = installationRes.data.account.type // "User" or "Organization"
        } catch (e) {
            console.error('Failed to look up installation account:', e)
            res.redirect(`${process.env.FRONTEND_URL}/install?error=install_failed`)
            return
        }

        // For personal account installs, use the user's login as the org identifier
        // but store accountType for reference
        const isPersonalAccount = accountType === 'User'

        // Upsert the organization record with the installation ID
        const org = await prisma.organization.upsert({
            where: { login: orgLogin },
            update: {
                installationId: installId,
                githubId: accountId,
                isInstalled: true,
                uninstalledAt: null,
            },
            create: {
                githubId: accountId,
                login: orgLogin,
                installationId: installId,
                isInstalled: true,
            }
        })

        console.log(`GitHub App installed: account=${orgLogin} (type: ${accountType}), installation_id=${installId}`)

        // Discover and immediately sync repositories granted to this app installation
        let installedRepos: Array<{ id: number; name: string; full_name: string; private: boolean }> = []
        try {
            const token = await getInstallationOctokit(installId)
            const reposRes = await axios.get('https://api.github.com/installation/repositories', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            })
            installedRepos = reposRes.data.repositories || []
            console.log(`Discovered ${installedRepos.length} repositories for ${orgLogin}`)

            for (const r of installedRepos) {
                await prisma.repo.upsert({
                    where: { githubId: String(r.id) },
                    update: {
                        name: r.name,
                        fullName: r.full_name,
                        private: r.private,
                        orgId: org.id
                    },
                    create: {
                        githubId: String(r.id),
                        name: r.name,
                        fullName: r.full_name,
                        private: r.private,
                        orgId: org.id
                    }
                })
            }
        } catch (repoErr: any) {
            console.warn('Failed to sync installation repositories from GitHub:', repoErr?.message || repoErr)
        }

        // Trigger agent onboarding for the primary discovered repo
        if (process.env.AGENT_URL && installedRepos.length > 0) {
            const primaryRepo = installedRepos[0]
            axios.post(`${process.env.AGENT_URL}/onboard`, {
                repo: primaryRepo.full_name,
                installation_id: installId,
                org_id: org.id
            }, {
                headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_KEY }
            }).catch((e: any) => {
                console.warn(`Onboard agent call failed for ${primaryRepo.full_name}:`, e.message)
            })
        }

        // Redirect back to the frontend
        res.redirect(`${process.env.FRONTEND_URL}/install?status=success&login=${orgLogin}&personal=${isPersonalAccount}`)

    } catch (err) {
        console.error('Installation callback error:', err)
        res.redirect(`${process.env.FRONTEND_URL}/install?error=install_failed`)
    }
});

// GET /auth/me — return current session user
router.get('/me', async (req: Request, res: Response) => {
    const session = await getIronSession<SessionData>(req, res, sessionOptions)

    if (!session.user) {
        res.status(401).json({ error: 'Not authenticated' })
        return
    }

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

    res.json({ user: session.user })
});

// GET /auth/install/status — check if an org/login has the app installed
router.get('/install/status', async (req: Request, res: Response) => {
    const { login } = req.query
    if (typeof login !== 'string' || !login.trim() || login.length > 255) {
        res.status(400).json({ error: 'login required' })
        return
    }
    try {
        const org = await prisma.organization.findFirst({
            where: { login }
        })
        // Deliberately omit installationId: this endpoint is unauthenticated
        // and an installation id is an internal identifier that should not be
        // disclosed to arbitrary callers.
        res.json({
            installed: !!org && org.isInstalled !== false,
        })
    } catch (err) {
        res.status(500).json({ error: 'Failed to check install status' })
    }
});

// GET /auth/install/onboard-status — check if memory has been seeded for an org
router.get('/install/onboard-status', async (req: Request, res: Response) => {
    const { login } = req.query
    if (typeof login !== 'string' || !login.trim() || login.length > 255) {
        res.status(400).json({ error: 'login required' })
        return
    }
    try {
        const org = await prisma.organization.findFirst({
            where: { login }
        })
        if (!org) {
            res.json({ count: 0, status: 'pending' })
            return
        }
        const count = await prisma.memoryEntry.count({
            where: { orgId: org.id }
        })
        res.json({ count, status: count > 0 ? 'completed' : 'running' })
    } catch (err) {
        res.status(500).json({ error: 'Failed to check onboard status' })
    }
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response) => {
    const session = await getIronSession<SessionData>(req, res, sessionOptions)
    session.destroy()
    res.json({ success: true })
});

// POST /auth/switch-org — switch active organization for current user
router.post('/switch-org', async (req: Request, res: Response) => {
    const { orgId } = req.body
    const session = await getIronSession<SessionData>(req, res, sessionOptions)

    if (!session.user) {
        res.status(401).json({ error: 'Not authenticated' })
        return
    }

    if (typeof orgId !== 'string' || !orgId) {
        res.status(400).json({ error: 'orgId required' })
        return
    }

    // Authorization: only allow switching to an organization that GitHub
    // confirmed the user belongs to during login. Sessions created before
    // the allowlist existed may only stay on their current org.
    const allowedOrgIds = session.user.allowedOrgIds?.length
        ? session.user.allowedOrgIds
        : (session.user.orgId ? [session.user.orgId] : [])

    if (!allowedOrgIds.includes(orgId)) {
        res.status(403).json({ error: 'You do not have access to this organization' })
        return
    }

    // Verify the org exists and is still installed
    const org = await prisma.organization.findUnique({
        where: { id: orgId }
    })

    if (!org || org.isInstalled === false) {
        res.status(404).json({ error: 'Organization not found or not installed' })
        return
    }

    // Update user's orgId
    await prisma.user.update({
        where: { id: session.user.id },
        data: { orgId }
    })

    // Update session
    session.user.orgId = orgId
    await session.save()

    res.json({ success: true, orgId })
});

// GET /auth/user-orgs — get all organizations the user has access to
router.get('/user-orgs', async (req: Request, res: Response) => {
    const session = await getIronSession<SessionData>(req, res, sessionOptions)

    if (!session.user) {
        res.status(401).json({ error: 'Not authenticated' })
        return
    }

    // Only return organizations verified during this login (see OAuth callback),
    // never an unrestricted cross-tenant query.
    const allowedOrgIds = session.user.allowedOrgIds?.length
        ? session.user.allowedOrgIds
        : (session.user.orgId ? [session.user.orgId] : [])

    const orgs = allowedOrgIds.length
        ? await prisma.organization.findMany({
            where: {
                id: { in: allowedOrgIds },
                isInstalled: true
            },
            select: { id: true, login: true, githubId: true, installationId: true }
        })
        : []

    res.json({ orgs })
});

export default router