import type { NextApiRequest, NextApiResponse } from 'next'
import { clearSession } from '@/lib/auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  clearSession(res)
  res.json({ success: true })
}

