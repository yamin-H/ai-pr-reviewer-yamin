import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { verifyWebhookSignature } from '../src/middleware/webhook.js'
import { requireInternalAuth } from '../src/middleware/internalAuth.js'
import { escapeCsv } from '../src/lib/csv.js'

test('CSV Formula Injection Defense (CWE-1236)', async (t) => {
    await t.test('escapes standard strings safely', () => {
        assert.equal(escapeCsv('Simple string'), '"Simple string"')
        assert.equal(escapeCsv(''), '""')
        assert.equal(escapeCsv(null), '""')
        assert.equal(escapeCsv(undefined), '""')
    })

    await t.test('escapes internal quotes with double quotes', () => {
        assert.equal(escapeCsv('Hello "World"'), '"Hello ""World"""')
    })

    await t.test('neutralizes formula injection characters (=, +, -, @, \\t, \\r)', () => {
        assert.equal(escapeCsv("=cmd|' /C calc'!A0"), '"\'=cmd|\' /C calc\'!A0"')
        assert.equal(escapeCsv('+1+1'), '"\'+1+1"')
        assert.equal(escapeCsv('-5+5'), '"\'-5+5"')
        assert.equal(escapeCsv('@SUM(A1:A10)'), '"\'@SUM(A1:A10)"')
        assert.equal(escapeCsv('\tTAB_VALUE'), '"\'\tTAB_VALUE"')
        assert.equal(escapeCsv('\rRETURN_VALUE'), '"\'\rRETURN_VALUE"')
    })
})

test('GitHub Webhook HMAC Signature Middleware', async (t) => {
    const testSecret = 'super-secret-test-webhook-key-123'
    const originalSecret = process.env.GITHUB_WEBHOOK_SECRET

    t.after(() => {
        process.env.GITHUB_WEBHOOK_SECRET = originalSecret
    })

    await t.test('allows request with valid HMAC SHA256 signature', () => {
        process.env.GITHUB_WEBHOOK_SECRET = testSecret
        const payload = JSON.stringify({ action: 'opened', number: 42 })
        const signature = 'sha256=' + crypto.createHmac('sha256', testSecret).update(Buffer.from(payload)).digest('hex')

        let nextCalled = false
        const req: any = {
            headers: { 'x-hub-signature-256': signature },
            body: Buffer.from(payload),
        }
        const res: any = {
            status: () => res,
            json: () => {},
        }
        const next = () => { nextCalled = true }

        verifyWebhookSignature(req, res, next)
        assert.equal(nextCalled, true)
    })

    await t.test('rejects request with tampered payload or invalid signature with 401', () => {
        process.env.GITHUB_WEBHOOK_SECRET = testSecret
        const payload = JSON.stringify({ action: 'opened', number: 42 })
        const fakeSignature = 'sha256=' + '0'.repeat(64)

        let statusCode = 0
        let jsonResponse: any = null
        let nextCalled = false

        const req: any = {
            headers: { 'x-hub-signature-256': fakeSignature },
            body: Buffer.from(payload),
        }
        const res: any = {
            status: (code: number) => {
                statusCode = code
                return res
            },
            json: (data: any) => { jsonResponse = data },
        }
        const next = () => { nextCalled = true }

        verifyWebhookSignature(req, res, next)
        assert.equal(nextCalled, false)
        assert.equal(statusCode, 401)
        assert.equal(jsonResponse?.error, 'Invalid signature')
    })

    await t.test('rejects request with missing signature header with 401', () => {
        process.env.GITHUB_WEBHOOK_SECRET = testSecret
        let statusCode = 0
        let nextCalled = false

        const req: any = {
            headers: {},
            body: Buffer.from('{}'),
        }
        const res: any = {
            status: (code: number) => {
                statusCode = code
                return res
            },
            json: () => {},
        }
        const next = () => { nextCalled = true }

        verifyWebhookSignature(req, res, next)
        assert.equal(nextCalled, false)
        assert.equal(statusCode, 401)
    })
})

test('Internal Service Authentication Middleware', async (t) => {
    const testKey = 'test-internal-secret-key-32-chars-long'
    const originalKey = process.env.INTERNAL_SERVICE_KEY

    t.after(() => {
        process.env.INTERNAL_SERVICE_KEY = originalKey
    })

    await t.test('authorizes request with matching x-internal-secret header', () => {
        process.env.INTERNAL_SERVICE_KEY = testKey
        let nextCalled = false

        const req: any = {
            headers: { 'x-internal-secret': testKey },
        }
        const res: any = {
            status: () => res,
            json: () => {},
        }
        const next = () => { nextCalled = true }

        requireInternalAuth(req, res, next)
        assert.equal(nextCalled, true)
    })

    await t.test('authorizes request with matching Bearer token in Authorization header', () => {
        process.env.INTERNAL_SERVICE_KEY = testKey
        let nextCalled = false

        const req: any = {
            headers: { authorization: `Bearer ${testKey}` },
        }
        const res: any = {
            status: () => res,
            json: () => {},
        }
        const next = () => { nextCalled = true }

        requireInternalAuth(req, res, next)
        assert.equal(nextCalled, true)
    })

    await t.test('rejects request with missing or incorrect secret with 403', () => {
        process.env.INTERNAL_SERVICE_KEY = testKey
        let statusCode = 0
        let nextCalled = false

        const req: any = {
            headers: { 'x-internal-secret': 'wrong-key' },
        }
        const res: any = {
            status: (code: number) => {
                statusCode = code
                return res
            },
            json: () => {},
        }
        const next = () => { nextCalled = true }

        requireInternalAuth(req, res, next)
        assert.equal(nextCalled, false)
        assert.equal(statusCode, 403)
    })
})
