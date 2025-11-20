import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
  
  // Security: Prevent path traversal attacks
  // Normalize and validate the path to ensure it stays within uploads directory
  const normalizedPath = filePath
    .map(segment => path.normalize(segment))
    .filter(segment => segment && !segment.includes('..') && !path.isAbsolute(segment))
    .join(path.sep)
  
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

    const relativePath = `/uploads/${normalizedPath.replace(/\\/g, '/')}`
    
    // Admins can access any transfer, regular users can only access their own
    const whereClause: any = {
      pdfPath: relativePath,
    }
    
    if (!isAdmin) {
      whereClause.OR = [
        { fromUserId: user.id },
        { toUserId: user.id },
      ]
    }

    const transfer = await prisma.transfer.findFirst({
      where: whereClause,
    })

    if (!transfer) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Security: Verify file is actually a PDF by checking MIME type
    const fileBuffer = fs.readFileSync(fullPath)
    const fileSignature = fileBuffer.slice(0, 4).toString('hex')
    // PDF files start with %PDF (hex: 255044462D)
    if (fileSignature !== '25504446' && !fileBuffer.toString('ascii', 0, 4).startsWith('%PDF')) {
      return res.status(400).json({ error: 'Invalid file type' })
    }
    const ext = path.extname(fullPath).toLowerCase()
    
    let contentType = 'application/pdf'
    if (ext === '.pdf') {
      contentType = 'application/pdf'
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

