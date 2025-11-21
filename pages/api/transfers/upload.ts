import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/security'
import { isS3Configured, uploadToS3 } from '@/lib/s3'
import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'uploads'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })

    form.parse(req, (err: Error | null, fields: any, files: any) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = getSession(req)
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Rate limiting: 20 uploads per hour
  const rateLimitResult = rateLimit(req, res, { windowMs: 60 * 60 * 1000, max: 20 })
  if (!rateLimitResult) {
    return // Response already sent by rateLimit
  }

  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const { fields, files } = await parseForm(req)
    const file = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Security: Validate file is actually a PDF by checking MIME type and file signature
    const allowedMimeTypes = ['application/pdf']
    if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
      // Delete the temporary file
      try {
        await fs.unlink(file.filepath)
      } catch {}
      return res.status(400).json({ error: 'Only PDF files are allowed' })
    }

    // Additional security: Verify file signature (magic bytes)
    try {
      const fileBuffer = await fs.readFile(file.filepath)
      const fileSignature = fileBuffer.slice(0, 4).toString('hex')
      const fileHeader = fileBuffer.toString('ascii', 0, 4)
      
      // PDF files start with %PDF (hex: 255044462D or ascii: %PDF)
      if (fileSignature !== '25504446' && !fileHeader.startsWith('%PDF')) {
        // Delete the temporary file
        await fs.unlink(file.filepath)
        return res.status(400).json({ error: 'Invalid PDF file. File must be a valid PDF document.' })
      }
    } catch (readError) {
      // If we can't read the file, reject it
      try {
        await fs.unlink(file.filepath)
      } catch {}
      return res.status(400).json({ error: 'Failed to validate file' })
    }

    // Extract transferType - formidable may return it as an array
    const transferTypeField = Array.isArray(fields.transferType) 
      ? fields.transferType[0] 
      : fields.transferType
    const transferType = (transferTypeField as string) || 'send'
    
    // Extract locationId - formidable may return it as an array
    const locationIdField = Array.isArray(fields.locationId)
      ? fields.locationId[0]
      : fields.locationId
    const locationId = parseInt(locationIdField as string)
    
    if (!locationId) {
      return res.status(400).json({ error: 'Location is required' })
    }

    // Verify location exists
    const otherLocation = await prisma.user.findUnique({ where: { id: locationId } })
    if (!otherLocation) {
      return res.status(400).json({ error: 'Invalid location' })
    }

    // Determine fromUserId and toUserId based on transfer type
    let fromUserId: number
    let toUserId: number

    if (transferType === 'send') {
      // Sending: current user sends to selected location
      fromUserId = user.id
      toUserId = locationId
    } else {
      // Requesting: selected location sends to current user (requesting from them)
      fromUserId = locationId
      toUserId = user.id
    }

    // Generate unique filename - sanitize original filename
    const timestamp = Date.now()
    const originalName = file.originalFilename || 'transfer.pdf'
    // Security: Sanitize filename to prevent path traversal
    const sanitizedName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = path.extname(sanitizedName).toLowerCase()
    // Ensure extension is .pdf
    const safeExt = ext === '.pdf' ? '.pdf' : '.pdf'
    const fileName = `transfer_${timestamp}_${Math.random().toString(36).substring(7)}${safeExt}`
    
    // Read file buffer for validation and upload
    const fileBuffer = await fs.readFile(file.filepath)
    
    let pdfPath: string
    
    // Upload to S3 if configured, otherwise use local filesystem
    if (isS3Configured()) {
      try {
        // Upload to S3
        const s3Key = await uploadToS3(fileBuffer, fileName, 'application/pdf')
        pdfPath = `s3://${s3Key}` // Store S3 key with s3:// prefix for identification
        console.log('[Upload] File uploaded to S3:', s3Key)
      } catch (s3Error: any) {
        console.error('[Upload] S3 upload failed, falling back to local storage:', s3Error)
        // Fall back to local storage if S3 fails
        const filePath = path.join(uploadsDir, fileName)
        const resolvedPath = path.resolve(filePath)
        if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
          await fs.unlink(file.filepath)
          return res.status(400).json({ error: 'Invalid file path' })
        }
        await fs.writeFile(filePath, fileBuffer)
        pdfPath = `/uploads/${fileName}`
      }
    } else {
      // Use local filesystem
      const filePath = path.join(uploadsDir, fileName)
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
        await fs.unlink(file.filepath)
        return res.status(400).json({ error: 'Invalid file path' })
      }
      await fs.writeFile(filePath, fileBuffer)
      pdfPath = `/uploads/${fileName}`
    }
    
    // Clean up temporary file
    try {
      await fs.unlink(file.filepath)
    } catch {}

    // Create transfer record
    const transfer = await prisma.transfer.create({
      data: {
        fromUserId: fromUserId,
        toUserId: toUserId,
        pdfFileName: originalName,
        pdfPath: pdfPath,
        transferType: transferType,
        status: 'pending',
        statusUpdatedAt: new Date(), // Set initial timestamp when created
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    })

    res.json({ success: true, transfer })
  } catch (error: any) {
    console.error('Upload error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    res.status(500).json({ 
      error: error.message || 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

