import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Debug: Log cookie header
  const cookies = req.headers.cookie || ''
  console.log('[Auth Me API] Cookie header present:', !!cookies, 'Length:', cookies.length)
  if (cookies) {
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='))
    console.log('[Auth Me API] Session cookie found:', !!sessionCookie)
  }

  const sessionUser = getSession(req)
  if (!sessionUser) {
    console.log('[Auth Me API] No session user found - returning 401')
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Fetch latest user data from database to get updated location names and admin status
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      username: true,
      location: true,
      isAdmin: true,
    },
  })

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  // Ensure isAdmin is always a boolean
  const userWithAdmin = {
    ...user,
    isAdmin: user.isAdmin || false,
  }

  res.json({ user: userWithAdmin })
}

