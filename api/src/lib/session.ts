import { SessionOptions } from 'iron-session'

export interface SessionData {
    user?: {
        id: string;
        githubId: string;
        login: string;
        avatarUrl: string;
        orgId?: string;
        /**
         * Organizations the signed-in user is allowed to access in this session.
         * Populated during the GitHub OAuth callback from the user's verified
         * organization list. Used to authorise org switching without trusting
         * a client-supplied org id.
         */
        allowedOrgIds?: string[];
    };
    /** Random state value used to prevent OAuth login CSRF. */
    oauthState?: string;
};


const isProd = process.env.NODE_ENV === 'production'

// iron-session requires a secret of at least 32 characters. Fail loudly on a
// weak/misconfigured secret instead of silently using a weak cookie key.
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error(
        'SESSION_SECRET must be set and at least 32 characters long. ' +
        'Generate one with: openssl rand -hex 32'
    )
}

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_SECRET,
    cookieName: 'pr-review-agent-session',
    cookieOptions: {
        secure: isProd,
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax'
    }
};