import jwt from 'jsonwebtoken'
import axios from 'axios'

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

export async function getInstallationOctokit(installationId: number): Promise<string> {
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

  return response.data.token
}