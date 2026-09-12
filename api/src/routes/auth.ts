import { Router, Request, Response } from 'express'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '../lib/session.js'
import { prisma } from '../lib/prisma.js'
import { generateJWT, getInstallationOctokit } from '../lib/octokit.js'
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
            avatarUrl: user.avatarUrl || '',
            orgId: user.orgId
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

        // Look up the account details from GitHub API using a JWT
        let orgLogin: string
        let accountId: string = ""
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
        } catch (e) {
            console.error('Failed to look up installation account:', e)
            res.redirect(`${process.env.FRONTEND_URL}/install?error=install_failed`)
            return
        }

        // Upsert the organization record with the installation ID
        const org = await prisma.organization.upsert({
            where: { login: orgLogin },
            update: { installationId: installId, githubId: accountId },
            create: {
                githubId: accountId,
                login: orgLogin,
                installationId: installId
            }
        })

        console.log(`GitHub App installed: org=${orgLogin}, installation_id=${installId}`)

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
                headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_KEY || 'powerful-internal-secret-change-in-prod' }
            }).catch((e: any) => {
                console.warn(`Onboard agent call failed for ${primaryRepo.full_name}:`, e.message)
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