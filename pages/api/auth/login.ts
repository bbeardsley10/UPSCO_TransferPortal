import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserByUsername, verifyPassword, setSession } from '@/lib/auth'
import { rateLimit } from '@/lib/security'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting: 5 attempts per 15 minutes
  const rateLimitResult = rateLimit(req, res, { windowMs: 15 * 60 * 1000, max: 5 })
  if (!rateLimitResult) {
    return // Response already sent by rateLimit
  }

  const { username, password } = req.body

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  // Sanitize username (prevent injection)
  if (typeof username !== 'string' || username.length > 100) {
    return res.status(400).json({ error: 'Invalid username format' })
  }

  if (typeof password !== 'string' || password.length > 200) {
    return res.status(400).json({ error: 'Invalid password format' })
  }

  try {
    const user = await getUserByUsername(username)
    if (!user) {
      console.log(`[Login] User not found: ${username}`)
      // Don't reveal if user exists (security best practice)
      // Use same delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100))
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    console.log(`[Login] User found: ${username}, checking password...`)
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      console.log(`[Login] Invalid password for user: ${username}`)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    console.log(`[Login] Successful login for user: ${username}`)

    setSession(req, res, {
      id: user.id,
      username: user.username,
      location: user.location,
      isAdmin: user.isAdmin || false,
    })

    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        location: user.location,
        isAdmin: user.isAdmin || false,
      } 
    })
  } catch (error: any) {
    console.error('Login error:', error)
    // Check if it's a database connection error
    if (error?.code === 'P1001' || error?.message?.includes('connect') || error?.message?.includes('database')) {
      return res.status(500).json({ 
        error: 'Database connection error. Please ensure the database is set up and migrations have been run.' 
      })
    }
    // Check if tables don't exist
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return res.status(500).json({ 
        error: 'Database tables not found. Please run migrations: npx prisma migrate deploy' 
      })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}

