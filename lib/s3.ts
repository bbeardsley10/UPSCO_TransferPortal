import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || ''

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  )
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME environment variables.')
  }

  const key = `transfers/${fileName}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    // Make files publicly readable (or use signed URLs for private access)
    // ACL: 'public-read', // Uncomment if you want public access
  })

  await s3Client.send(command)

  // Return the S3 key (path) for storage in database
  return key
}

/**
 * Get a signed URL for downloading/viewing a file from S3
 * Valid for 1 hour by default
 */
export async function getS3SignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured')
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn })
  return url
}

/**
 * Get file from S3 as a buffer
 */
export async function getFileFromS3(key: string): Promise<Buffer> {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured')
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const response = await s3Client.send(command)
  
  if (!response.Body) {
    throw new Error('File not found in S3')
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as any) {
    chunks.push(chunk)
  }
  
  return Buffer.concat(chunks)
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured')
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

/**
 * Get the S3 URL for a file (if using public access)
 * Otherwise, use getS3SignedUrl for private files
 */
export function getS3Url(key: string): string {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured')
  }

  const region = process.env.AWS_REGION || 'us-east-1'
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`
}

