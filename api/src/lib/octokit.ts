import jwt from 'jsonwebtoken'
import axios from 'axios'
import redis from './redis.js'

/** TTL for cached installation tokens (seconds). GitHub tokens expire at 60 min. */
const TOKEN_TTL_SECONDS = 55 * 60

export function generateJWT(): string {
  // key is stored directly in env, not as a file path
  const privateKey = process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n')

  return jwt.sign(
    { iat: Math.floor(Date.now() / 1000) - 60 },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '10m',
      issuer: process.env.GITHUB_APP_ID!
    }
  )
}

/**
 * Returns a short-lived GitHub App installation access token.
 *
 * Tokens are cached in Redis for 55 minutes (GitHub tokens expire at 60 min)
 * so we avoid re-hitting the GitHub token endpoint on every API call.
 * If Redis is unavailable the function transparently falls through to a live
 * fetch — a Redis outage degrades performance but never breaks reviews.
 */
export async function getInstallationOctokit(installationId: number): Promise<string> {
  const cacheKey = `installation_token:${installationId}`

  // --- Cache read ---
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return cached
    }
  } catch (redisErr: any) {
    // Non-fatal: log and fall through to a live fetch.
    console.error(`[octokit] Redis GET failed for ${cacheKey}:`, redisErr?.message)
  }

  // --- Live fetch ---
  const appJWT = generateJWT()
  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${appJWT}`,
        Accept: 'application/vnd.github.v3+json'
      }
    }
  )

  const token: string = response.data.token

  // --- Cache write ---
  try {
    await redis.set(cacheKey, token, 'EX', TOKEN_TTL_SECONDS)
  } catch (redisErr: any) {
    // Non-fatal: the token is still returned; it just won't be cached this round.
    console.error(`[octokit] Redis SET failed for ${cacheKey}:`, redisErr?.message)
  }

  return token
}

/**
 * Posts a commit status check on a PR's head commit.
 * Used for posting the PR Risk Score directly into the GitHub Checks/Status UI.
 */
export async function createCommitStatus(options: {
  installationId: number;
  repoFullName: string;
  sha: string;
  state: 'success' | 'pending' | 'failure' | 'error';
  description: string;
  targetUrl?: string;
  context?: string;
}): Promise<boolean> {
  try {
    const token = await getInstallationOctokit(options.installationId)
    await axios.post(
      `https://api.github.com/repos/${options.repoFullName}/statuses/${options.sha}`,
      {
        state: options.state,
        target_url: options.targetUrl,
        description: options.description.slice(0, 140), // GitHub status descriptions max 140 chars
        context: options.context || 'Powerful AI / PR Risk',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )
    console.log(`[octokit] Posted commit status (${options.state}) to ${options.repoFullName}@${options.sha.slice(0, 7)}: "${options.description}"`)
    return true
  } catch (err: any) {
    console.warn(`[octokit] Failed to post commit status to ${options.repoFullName}:`, err?.response?.data || err?.message || err)
    return false
  }
}