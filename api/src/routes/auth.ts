import { Router, Request, Response } from 'express'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../lib/session'
import { prisma } from '../lib/prisma'
import axios from 'axios'

const router = Router()

// Step 1 — redirect user to GitHub OAuth
// After OAuth, if app is not installed, user is redirected to /install page
router.get('/github', (req: Request, res: Response) => {
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        scope: 'read:user read:org'
    })
    res.redirect(`https://github.com/login/oauth/authorize?${params}`)
});

// Step 2 — GitHub redirects back with OAuth code
router.get('/github/callback', async (req: Request, res: Response) => {
    const { code } = req.query

    if (!code) {
        res.status(400).json({ error: 'No code provided' })
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

        // Check if the GitHub App is already installed for this user/org
        const org = await prisma.organization.findFirst({
            where: { login: githubUser.login }
        })

        if (!org) {
            // App not installed yet — redirect to the install page
            // Pass the GitHub login as a hint so the install page can guide them
            const installParams = new URLSearchParams({ login: githubUser.login })
            res.redirect(`${process.env.FRONTEND_URL}/install?${installParams}`)
            return
        }

        // App is installed — upsert user record and create session
        const user = await prisma.user.upsert({
            where: { githubId: String(githubUser.id) },
            update: { login: githubUser.login, avatarUrl: githubUser.avatar_url },
            create: {
                githubId: String(githubUser.id),
                login: githubUser.login,
                avatarUrl: githubUser.avatar_url,
                orgId: org.id
            }
        })

        // Store session cookie
        const session = await getIronSession<SessionData>(req, res, sessionOptions)
        session.user = {
            id: user.id,
            githubId: user.githubId,
            login: user.login,
            avatarUrl: user.avatarUrl || ''
        }
        await session.save()

        res.redirect(`${process.env.FRONTEND_URL}/dashboard`)
    } catch (err) {
        console.error('OAuth error:', err)
        res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`)
    }
});

// Step 3 — GitHub App installation callback
// GitHub redirects here after user installs the App on their account/org.
// URL: /auth/github/installed?installation_id=xxx&setup_action=install&login=xxx
router.get('/github/installed', async (req: Request, res: Response) => {
    const { installation_id, setup_action, login } = req.query

    if (!installation_id || !login) {
        res.redirect(`${process.env.FRONTEND_URL}/install?error=missing_params`)
        return
    }

    try {
        const installId = Number(installation_id)
        const orgLogin = login as string

        // Upsert the organization record with the installation ID
        const org = await prisma.organization.upsert({
            where: { login: orgLogin },
            update: { installationId: installId },
            create: {
                githubId: orgLogin, // will be overwritten on first webhook
                login: orgLogin,
                installationId: installId
            }
        })

        console.log(`GitHub App installed: org=${orgLogin}, installation_id=${installId}`)

        // Trigger agent onboarding asynchronously (seed memory with historical PRs)
        // This is fire-and-forget — don't await it
        if (process.env.AGENT_URL) {
            axios.post(`${process.env.AGENT_URL}/onboard`, {
                repo: orgLogin,          // The agent will list repos via the installation
                installation_id: installId,
                org_id: org.id
            }).catch((e: any) => {
                console.warn('Onboard agent call failed (non-fatal):', e.message)
            })
        }

        // Redirect back to the frontend — tell them to sign in now
        res.redirect(`${process.env.FRONTEND_URL}/install?status=success&login=${orgLogin}`)

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

    res.json({ user: session.user })
});

// GET /auth/install/status — check if an org/login has the app installed
router.get('/install/status', async (req: Request, res: Response) => {
    const { login } = req.query
    if (!login) {
        res.status(400).json({ error: 'login required' })
        return
    }
    try {
        const org = await prisma.organization.findFirst({
            where: { login: login as string }
        })
        res.json({
            installed: !!org,
            installationId: org?.installationId ?? null
        })
    } catch (err) {
        res.status(500).json({ error: 'Failed to check install status' })
    }
});

// GET /auth/install/onboard-status — check if memory has been seeded for an org
router.get('/install/onboard-status', async (req: Request, res: Response) => {
    const { login } = req.query
    if (!login) {
        res.status(400).json({ error: 'login required' })
        return
    }
    try {
        const org = await prisma.organization.findFirst({
            where: { login: login as string }
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

export default router