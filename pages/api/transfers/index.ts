import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/security'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // Debug: Log cookie header
  const cookies = req.headers.cookie || ''
  console.log('[Transfers API] Cookie header present:', !!cookies, 'Length:', cookies.length)
  if (cookies) {
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='))
    console.log('[Transfers API] Session cookie found:', !!sessionCookie)
  }
  
  const user = getSession(req)
  if (!user) {
    console.log('[Transfers API] No session user found - returning 401')
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Rate limiting: 100 requests per minute
  const rateLimitResult = rateLimit(req, res, { windowMs: 60 * 1000, max: 100 })
  if (!rateLimitResult) {
    return // Response already sent by rateLimit
  }

  if (req.method === 'GET') {
    // Admins can see all transfers, regular users only see their own
    // Check admin status from database to ensure it's up to date
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    })
    
    const isAdmin = dbUser?.isAdmin || false
    
    // Get archive filter from query parameter (default to 'active' - show non-archived)
    const archiveFilter = req.query.archive as string | undefined
    const showArchived = archiveFilter === 'archived'
    const showAll = archiveFilter === 'all'
    
    // Build base where clause for user permissions
    const baseWhereClause: any = isAdmin
      ? {}
      : {
          OR: [
            { fromUserId: user.id },
            { toUserId: user.id },
          ],
        }
    
    // Add archive filter
    // - 'active': show only non-archived transfers (archived = false)
    // - 'archived': show only archived transfers (archived = true)
    // - 'all': show all transfers regardless of archive status
    const whereClause: any = { ...baseWhereClause }
    if (!showAll) {
      // When showing active, we want archived = false
      // When showing archived, we want archived = true
      whereClause.archived = showArchived
    }
    
    console.log(`[Transfers API] Archive filter: ${archiveFilter}, showArchived: ${showArchived}, showAll: ${showAll}, archived filter: ${whereClause.archived}`)

    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            location: true,
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`[Transfers API] User ID: ${user.id}, isAdmin: ${isAdmin}, Found ${transfers.length} transfers`)
    if (transfers.length > 0) {
      const sample = transfers[0]
      console.log(`[Transfers API] Sample transfer: ID ${sample.id}, fromUserId: ${sample.fromUserId}, toUserId: ${sample.toUserId}, viewedByRecipient: ${sample.viewedByRecipient}`)
      // Log all fields to debug
      console.log(`[Transfers API] Sample transfer fields:`, Object.keys(sample))
    }

    res.json({ transfers })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

