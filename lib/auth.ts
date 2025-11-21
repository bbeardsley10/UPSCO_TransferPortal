import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export interface SessionUser {
  id: number
  username: string
  location: string
  isAdmin: boolean
}

// Get session secret from environment or use a default (should be set in production)
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production-to-a-random-string'

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  })
}

/**
 * Create a signed cookie value
 */
function signCookie(value: string): string {
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(value)
    .digest('hex')
  return `${value}.${signature}`
}

/**
 * Verify and extract value from signed cookie
 */
function verifyCookie(signedValue: string): string | null {
  const parts = signedValue.split('.')
  if (parts.length !== 2) return null

  const [value, signature] = parts
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(value)
    .digest('hex')

  // Ensure same length for timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    return null
  }

  // Use timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  return value
}

export function setSession(req: NextApiRequest, res: NextApiResponse, user: SessionUser) {
  // Create session data with expiration
  const session = { 
    user,
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }
  const sessionData = Buffer.from(JSON.stringify(session)).toString('base64')
  const signedSession = signCookie(sessionData)
  
  // URL-encode the cookie value to handle special characters
  const encodedSession = encodeURIComponent(signedSession)
  
  // Set secure cookie flags
  // On Render, we're always behind HTTPS, so use Secure flag
  // Use Lax instead of Strict to allow cookies to work with redirects and cross-site navigation
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'
  const isHttps = isProduction || req.headers['x-forwarded-proto'] === 'https'
  
  const cookieOptions = [
    `session=${encodedSession}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax', // Use Lax for better compatibility with redirects
    'Max-Age=86400', // 24 hours
  ]
  
  if (isHttps) {
    cookieOptions.push('Secure') // Send over HTTPS
  }
  
  res.setHeader('Set-Cookie', cookieOptions.join('; '))
}

export function getSession(req: NextApiRequest): SessionUser | null {
  const cookies = req.headers.cookie || ''
  const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='))
  if (!sessionCookie) {
    console.log('[getSession] No session cookie found in request')
    return null
  }
  
  try {
    // Extract cookie value - handle URL encoding
    const cookieValue = sessionCookie.split('=').slice(1).join('=').trim()
    const signedValue = decodeURIComponent(cookieValue)
    const sessionData = verifyCookie(signedValue)
    
    if (!sessionData) {
      // Invalid signature - cookie may have been tampered with
      console.log('[getSession] Invalid cookie signature. Cookie length:', signedValue.length)
      return null
    }
    
    const session = JSON.parse(Buffer.from(sessionData, 'base64').toString())
    
    // Check expiration
    if (session.expires && session.expires < Date.now()) {
      console.log('[getSession] Session expired')
      return null
    }
    
    return session.user || null
  } catch (error) {
    console.log('[getSession] Error parsing session:', error)
    return null
  }
}

export function clearSession(res: NextApiResponse, req?: NextApiRequest) {
  const isHttps = process.env.NODE_ENV === 'production' || 
                  process.env.RENDER === 'true' || 
                  (req && req.headers['x-forwarded-proto'] === 'https')
  const secureFlag = isHttps ? '; Secure' : ''
  res.setHeader('Set-Cookie', `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`)
}

