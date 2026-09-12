import { Request, Response, NextFunction } from 'express'

export function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
    const key = req.headers['x-internal-secret'] || 
        (typeof req.headers['authorization'] === 'string' && req.headers['authorization'].startsWith('Bearer ') 
            ? req.headers['authorization'].slice(7) 
            : undefined);
    const expectedKey = process.env.INTERNAL_SERVICE_KEY || 'powerful-internal-secret-change-in-prod';

    if (!key || key !== expectedKey) {
        res.status(403).json({ error: 'Unauthorized internal service request' });
        return;
    }

    next();
}
