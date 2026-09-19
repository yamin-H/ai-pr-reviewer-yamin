import { Request, Response, NextFunction } from 'express'

/**
 * Assert that INTERNAL_SERVICE_KEY is configured.
 * Called once at process startup — throws so the process exits before
 * accepting any connections if the secret is missing.
 */
export function assertInternalKeyConfigured(): void {
    if (!process.env.INTERNAL_SERVICE_KEY) {
        throw new Error(
            'INTERNAL_SERVICE_KEY environment variable is not set. ' +
            'This secret is required for secure service-to-service communication. ' +
            'Set it in your .env file or container environment and restart.'
        )
    }
}

/**
 * Express middleware that validates the internal service-to-service secret
 * on every request to /internal/* routes.
 *
 * Returns:
 *   500 — if INTERNAL_SERVICE_KEY is not configured on this server
 *         (misconfiguration; distinguishable from 403 in logs/monitoring)
 *   403 — if the header is absent or does not match exactly
 */
export function requireInternalAuth(req: Request, res: Response, next: NextFunction): void {
    const expectedKey = process.env.INTERNAL_SERVICE_KEY

    if (!expectedKey) {
        // Should have been caught by assertInternalKeyConfigured() at startup,
        // but we guard defensively here as well.
        res.status(500).json({ error: 'Internal service key is not configured on this server.' })
        return
    }

    // Accept the secret from either the dedicated header or a Bearer token.
    const providedKey =
        req.headers['x-internal-secret'] ??
        (typeof req.headers['authorization'] === 'string' &&
        req.headers['authorization'].startsWith('Bearer ')
            ? req.headers['authorization'].slice(7)
            : undefined)

    if (!providedKey || providedKey !== expectedKey) {
        res.status(403).json({ error: 'Unauthorized internal service request.' })
        return
    }

    next()
}
