import { SessionOptions } from 'iron-session'

export interface SessionData {
    user?: {
        id: string;
        githubId: string;
        login: string;
        avatarUrl: string;
        orgId?: string;
    };
};


const isProd = process.env.NODE_ENV === 'production'

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_SECRET!,
    cookieName: 'pr-review-agent-session',
    cookieOptions: {
        secure: isProd,
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax'
    }
};