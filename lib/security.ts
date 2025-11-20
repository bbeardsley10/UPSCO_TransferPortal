import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const keysToDelete: string[] = []
  rateLimitStore.forEach((value, key) => {
    if (value.resetTime < now) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}, 5 * 60 * 1000)

/**
 * Simple rate limiting middleware
 */
export function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { windowMs: number; max: number }
): { success: boolean; remaining: number; resetTime: number } | null {
  const identifier = req.headers['x-forwarded-for']?.toString() || 
                     req.socket.remoteAddress || 
                     'unknown'
  
  const key = `${req.url}-${identifier}`
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || record.resetTime < now) {
    // Create new record
    const resetTime = now + options.windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    res.setHeader('X-RateLimit-Limit', options.max.toString())
    res.setHeader('X-RateLimit-Remaining', (options.max - 1).toString())
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString())
    return { success: true, remaining: options.max - 1, resetTime }
  }

  if (record.count >= options.max) {
    res.setHeader('X-RateLimit-Limit', options.max.toString())
    res.setHeader('X-RateLimit-Remaining', '0')
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
    res.status(429).json({ error: 'Too many requests. Please try again later.' })
    return null
  }

  // Increment count
  record.count++
  rateLimitStore.set(key, record)
  res.setHeader('X-RateLimit-Limit', options.max.toString())
  res.setHeader('X-RateLimit-Remaining', (options.max - record.count).toString())
  res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
  return { success: true, remaining: options.max - record.count, resetTime: record.resetTime }
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(req: NextApiRequest, token: string): boolean {
  // For GET requests, we can skip CSRF (they shouldn't modify state anyway)
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true
  }

  // Get token from header or body
  const providedToken = req.headers['x-csrf-token'] || req.body?.csrfToken
  
  if (!providedToken || !token) {
    return false
  }

  // Ensure both are strings and same length for timing-safe comparison
  const providedStr = String(providedToken)
  const expectedStr = String(token)
  
  if (providedStr.length !== expectedStr.length) {
    return false
  }

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedStr),
    Buffer.from(expectedStr)
  )
}

/**
 * Get or create CSRF token for session
 */
export function getOrCreateCsrfToken(req: NextApiRequest, res: NextApiResponse): string {
  const cookies = req.headers.cookie || ''
  const csrfCookie = cookies.split(';').find(c => c.trim().startsWith('csrf-token='))
  
  if (csrfCookie) {
    try {
      const token = csrfCookie.split('=')[1].trim()
      // Validate token format (64 hex characters)
      if (/^[a-f0-9]{64}$/i.test(token)) {
        return token
      }
    } catch {
      // Invalid cookie, generate new one
    }
  }

  // Generate new token
  const token = generateCsrfToken()
  res.setHeader('Set-Cookie', `csrf-token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`)
  return token
}

