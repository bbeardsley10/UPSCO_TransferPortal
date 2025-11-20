import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getSession(req)
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      where: {
        id: { not: user.id }, // Exclude current user
        isAdmin: false, // Exclude admin users (they're not locations)
      },
      select: {
        id: true,
        username: true,
        location: true,
      },
      orderBy: {
        location: 'asc',
      },
    })

    res.json({ users })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

