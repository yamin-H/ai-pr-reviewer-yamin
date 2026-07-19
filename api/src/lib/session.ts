import { SessionOptions } from 'iron-session'

export interface SessionData {
    user?: {
        id: string;
        githubId: string;
        login: string;
        avatarUrl: string;
    };
};

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_SECRET!,
    cookieName: 'pr-review-agent-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
};