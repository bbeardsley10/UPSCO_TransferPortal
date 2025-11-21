import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isS3Configured, getFileFromS3, getS3SignedUrl } from '@/lib/s3'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getSession(req)
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const filePath = req.query.path as string[]
  
  if (!filePath || !Array.isArray(filePath) || filePath.length === 0) {
    return res.status(400).json({ error: 'Invalid file path' })
  }
  
  // Decode URL-encoded path segments
  const decodedSegments = filePath.map(segment => decodeURIComponent(segment))
  
  // Security: Prevent path traversal attacks
  // Filter out any dangerous path segments
  const safeSegments = decodedSegments.filter(segment => {
    if (!segment) return false
    // Remove any segments with path traversal attempts
    if (segment.includes('..') || segment.includes('\\') || path.isAbsolute(segment)) {
      return false
    }
    // Allow alphanumeric, dots, dashes, and underscores in filenames
    // Note: We decode first, then validate, so spaces and other chars are handled
    return /^[a-zA-Z0-9._-]+$/.test(segment)
  })
  
  if (safeSegments.length !== decodedSegments.length) {
    console.log('[Uploads API] Invalid path segments detected:', {
      original: filePath,
      decoded: decodedSegments,
      safe: safeSegments,
    })
    return res.status(403).json({ error: 'Invalid file path' })
  }
  
  // Use forward slashes consistently (works on both Unix and Windows)
  const normalizedPath = safeSegments.join('/')
  
  // Double-check: ensure the resolved path is within uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads')
  const fullPath = path.resolve(uploadsDir, normalizedPath)
  
  // Verify the resolved path is actually within uploads directory
  if (!fullPath.startsWith(path.resolve(uploadsDir))) {
    return res.status(403).json({ error: 'Invalid file path' })
  }

  // Verify the file exists and user has access
  try {
    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    })
    const isAdmin = dbUser?.isAdmin || false

    // Construct the relative path that matches what's stored in the database
    // Database stores paths like: /uploads/filename.pdf
    const relativePath = `/uploads/${normalizedPath}`
    
    console.log('[Uploads API] Requested path segments:', filePath)
    console.log('[Uploads API] Decoded segments:', decodedSegments)
    console.log('[Uploads API] Normalized path:', normalizedPath)
    console.log('[Uploads API] Looking for pdfPath:', relativePath)
    console.log('[Uploads API] User ID:', user.id, 'isAdmin:', isAdmin)
    
    // Admins can access any transfer, regular users can only access their own
    const baseWhereClause: any = {}
    
    if (!isAdmin) {
      baseWhereClause.OR = [
        { fromUserId: user.id },
        { toUserId: user.id },
      ]
    }

    // Try to find transfer by exact path match first
    let transfer = await prisma.transfer.findFirst({
      where: {
        ...baseWhereClause,
        pdfPath: relativePath,
      },
    })
    
    // If not found, try to find by filename (for S3 paths or different path formats)
    if (!transfer) {
      const filename = normalizedPath
      transfer = await prisma.transfer.findFirst({
        where: {
          ...baseWhereClause,
          OR: [
            { pdfPath: { contains: filename } },
            { pdfPath: { endsWith: filename } },
          ],
        },
      })
    }

    if (!transfer) {
      console.log('[Uploads API] Transfer not found. Searched for filename:', normalizedPath)
      return res.status(403).json({ error: 'Access denied' })
    }
    
    console.log('[Uploads API] Transfer found, access granted:', transfer.id, 'pdfPath:', transfer.pdfPath)

    let fileBuffer: Buffer
    let contentType = 'application/pdf'

    // Check if file is stored in S3
    if (transfer.pdfPath.startsWith('s3://')) {
      if (!isS3Configured()) {
        return res.status(500).json({ error: 'S3 is not configured but file is stored in S3' })
      }
      
      try {
        // Extract S3 key from pdfPath (s3://transfers/filename.pdf -> transfers/filename.pdf)
        const s3Key = transfer.pdfPath.replace('s3://', '')
        fileBuffer = await getFileFromS3(s3Key)
        
        // Verify it's a PDF
        const fileSignature = fileBuffer.slice(0, 4).toString('hex')
        if (fileSignature !== '25504446' && !fileBuffer.toString('ascii', 0, 4).startsWith('%PDF')) {
          return res.status(400).json({ error: 'Invalid file type' })
        }
      } catch (s3Error: any) {
        console.error('[Uploads API] Error fetching from S3:', s3Error)
        return res.status(404).json({ error: 'File not found in S3' })
      }
    } else {
      // Local filesystem
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found' })
      }

      fileBuffer = fs.readFileSync(fullPath)
      
      // Security: Verify file is actually a PDF by checking MIME type
      const fileSignature = fileBuffer.slice(0, 4).toString('hex')
      if (fileSignature !== '25504446' && !fileBuffer.toString('ascii', 0, 4).startsWith('%PDF')) {
        return res.status(400).json({ error: 'Invalid file type' })
      }
    }

    // Set headers for PDF display in browser/iframe
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${transfer.pdfFileName}"`)
    res.setHeader('Content-Length', fileBuffer.length.toString())
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    
    res.send(fileBuffer)
  } catch (error) {
    console.error('File serve error:', error)
    res.status(500).json({ error: 'Failed to serve file' })
  }
}

