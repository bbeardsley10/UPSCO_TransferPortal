import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/security'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getSession(req)
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Rate limiting: 100 requests per minute
  const rateLimitResult = rateLimit(req, res, { windowMs: 60 * 1000, max: 100 })
  if (!rateLimitResult) {
    return // Response already sent by rateLimit
  }

  const { id } = req.query
  const transferId = parseInt(id as string)

  // Input validation
  if (isNaN(transferId) || transferId <= 0) {
    return res.status(400).json({ error: 'Invalid transfer ID' })
  }

  if (req.method === 'GET') {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
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
    })

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' })
    }

    // Check admin status from database to ensure it's up to date
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    })
    const isAdmin = dbUser?.isAdmin || false

    // Admins can view any transfer, regular users only their own
    if (!isAdmin && transfer.fromUserId !== user.id && transfer.toUserId !== user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Mark transfer as viewed:
    // - For "send" transfers: mark when recipient (toUser) views it
    // - For "request" transfers: mark when the location being requested from (fromUser) views it
    const shouldMarkAsViewed = !isAdmin && transfer.viewedByRecipient !== true && (
      (transfer.transferType === 'send' && transfer.toUserId === user.id) ||
      (transfer.transferType === 'request' && transfer.fromUserId === user.id)
    )
    
    if (shouldMarkAsViewed) {
      try {
        console.log(`[Transfer API] Marking transfer ${transferId} as viewed by recipient ${user.id}`)
        const updateResult = await prisma.transfer.update({
          where: { id: transferId },
          data: {
            viewedByRecipient: true,
            viewedByRecipientAt: new Date(),
          },
        })
        console.log(`[Transfer API] Successfully marked transfer ${transferId} as viewed:`, updateResult.viewedByRecipient)
        // Fetch updated transfer
        const updatedTransfer = await prisma.transfer.findUnique({
          where: { id: transferId },
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
        })
        if (updatedTransfer) {
          console.log(`[Transfer API] Returning updated transfer with viewedByRecipient: ${updatedTransfer.viewedByRecipient}`)
          return res.json({ transfer: updatedTransfer })
        }
        // If update failed, return original transfer
        console.error('Failed to fetch updated transfer after marking as viewed')
      } catch (error) {
        console.error('Error marking transfer as viewed:', error)
        // Continue and return original transfer if update fails
      }
    } else {
      console.log(`[Transfer API] Not marking as viewed - isAdmin: ${isAdmin}, toUserId: ${transfer.toUserId}, user.id: ${user.id}, viewedByRecipient: ${transfer.viewedByRecipient}`)
    }

    res.json({ transfer })
  } else if (req.method === 'PATCH') {
    const { status, notes, receivedAtDestination, enteredIntoSystem } = req.body

    // Input validation
    if (status && typeof status !== 'string') {
      return res.status(400).json({ error: 'Invalid status format' })
    }
    if (notes !== undefined && typeof notes !== 'string') {
      return res.status(400).json({ error: 'Invalid notes format' })
    }
    if (notes && notes.length > 5000) {
      return res.status(400).json({ error: 'Notes too long (max 5000 characters)' })
    }
    
    // Convert string booleans to actual booleans if needed (form submissions sometimes send strings)
    let receivedAtDestinationBool: boolean | undefined = undefined
    if (receivedAtDestination !== undefined) {
      if (typeof receivedAtDestination === 'boolean') {
        receivedAtDestinationBool = receivedAtDestination
      } else if (typeof receivedAtDestination === 'string') {
        receivedAtDestinationBool = receivedAtDestination === 'true' || receivedAtDestination === '1'
      } else {
        return res.status(400).json({ error: 'Invalid receivedAtDestination format' })
      }
    }
    
    let enteredIntoSystemBool: boolean | undefined = undefined
    if (enteredIntoSystem !== undefined) {
      if (typeof enteredIntoSystem === 'boolean') {
        enteredIntoSystemBool = enteredIntoSystem
      } else if (typeof enteredIntoSystem === 'string') {
        enteredIntoSystemBool = enteredIntoSystem === 'true' || enteredIntoSystem === '1'
      } else {
        return res.status(400).json({ error: 'Invalid enteredIntoSystem format' })
      }
    }

    // Get current transfer state (we'll use this for both validation and update logic)
    const currentTransfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    })

    if (!currentTransfer) {
      return res.status(404).json({ error: 'Transfer not found' })
    }

    // Check admin status from database to ensure it's up to date
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    })
    const isAdmin = dbUser?.isAdmin || false

    // Admins can update any transfer
    // For regular users, update permissions depend on transfer type and fulfillment status:
    // - Before fulfillment: Only the sender (fromUserId) can update status
    // - After fulfillment: The recipient (toUserId) can update fulfillment tracking fields
    if (!isAdmin) {
      const isRecipient = currentTransfer.toUserId === user.id
      const isSender = currentTransfer.fromUserId === user.id
      const transferType = currentTransfer.transferType || 'send' // Default to 'send' for backwards compatibility
      const isFulfilled = currentTransfer.status === 'fulfilled'
      
      // Check if user is trying to update fulfillment tracking fields
      const updatingFulfillmentFields = receivedAtDestinationBool !== undefined || enteredIntoSystemBool !== undefined
      // Check if user is trying to update status
      const updatingStatus = status !== undefined && status !== currentTransfer.status
      // Check if user is trying to update notes
      const updatingNotes = notes !== undefined
      
      if (isFulfilled) {
        // After fulfillment: recipient can update fulfillment tracking fields
        if (updatingFulfillmentFields) {
          if (!isRecipient) {
            return res.status(403).json({ error: 'Only the receiving branch can update fulfillment tracking after the transfer is fulfilled' })
          }
        } else if (updatingStatus || updatingNotes) {
          // After fulfillment: sender can still update status and notes
          if (!isSender) {
            return res.status(403).json({ error: 'Only the sender can update status and notes' })
          }
        }
      } else {
        // Before fulfillment: only sender can update
        if (transferType === 'send') {
          // For send transfers: only the sender can update
          if (!isSender) {
            return res.status(403).json({ error: 'Only the sender can update this transfer' })
          }
        } else if (transferType === 'request') {
          // For request transfers: only the location being requested from (fromUserId) can update
          // When Bloomington requests FROM Streator:
          // - fromUserId = Streator (location being requested from)
          // - toUserId = Bloomington (requester)
          // - Only Streator (fromUserId/isSender) should be able to update
          if (!isSender) {
            return res.status(403).json({ error: 'Only the location being requested from can update this transfer' })
          }
        } else {
          // Unknown transfer type - deny access
          return res.status(403).json({ error: 'Invalid transfer type' })
        }
      }
    }

    const validStatuses = ['pending', 'acknowledged', 'in_progress', 'fulfilled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    // Prepare update data
    const updateData: any = {
      ...(notes !== undefined && { notes }),
    }
    
    // If status is being changed, update both status and statusUpdatedAt
    if (status && currentTransfer && currentTransfer.status !== status) {
      updateData.status = status
      updateData.statusUpdatedAt = new Date()
    }
    
    // Handle receivedAtDestination - set timestamp when checked
    if (receivedAtDestinationBool !== undefined) {
      updateData.receivedAtDestination = receivedAtDestinationBool
      if (receivedAtDestinationBool && !currentTransfer?.receivedAtDestination) {
        // Just checked - set timestamp
        updateData.receivedAtDestinationAt = new Date()
      } else if (!receivedAtDestinationBool) {
        // Unchecked - clear timestamp
        updateData.receivedAtDestinationAt = null
      }
    }
    
    // Handle enteredIntoSystem - set timestamp when checked
    if (enteredIntoSystemBool !== undefined) {
      updateData.enteredIntoSystem = enteredIntoSystemBool
      if (enteredIntoSystemBool && !currentTransfer?.enteredIntoSystem) {
        // Just checked - set timestamp
        updateData.enteredIntoSystemAt = new Date()
      } else if (!enteredIntoSystemBool) {
        // Unchecked - clear timestamp
        updateData.enteredIntoSystemAt = null
      }
    }

    // Auto-archive when transfer is fulfilled, received, and entered into system
    const finalStatus = status || currentTransfer?.status
    const finalReceived = receivedAtDestinationBool !== undefined ? receivedAtDestinationBool : currentTransfer?.receivedAtDestination
    const finalEntered = enteredIntoSystemBool !== undefined ? enteredIntoSystemBool : currentTransfer?.enteredIntoSystem
    
    if (finalStatus === 'fulfilled' && finalReceived === true && finalEntered === true) {
      // All conditions met - archive the transfer
      if (!currentTransfer?.archived) {
        updateData.archived = true
        updateData.archivedAt = new Date()
      }
    } else if (currentTransfer?.archived) {
      // If any condition is no longer met, unarchive
      updateData.archived = false
      updateData.archivedAt = null
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      // No changes to make, return current transfer
      const unchanged = await prisma.transfer.findUnique({
        where: { id: transferId },
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
      })
      return res.json({ success: true, transfer: unchanged })
    }

    try {
      const updated = await prisma.transfer.update({
        where: { id: transferId },
        data: updateData,
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
      })

      res.json({ success: true, transfer: updated })
    } catch (error: any) {
      console.error('Error updating transfer:', error)
      res.status(500).json({ error: error.message || 'Failed to update transfer' })
    }
  } else if (req.method === 'DELETE') {
    // Only admins can delete transfers
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    })
    const isAdmin = dbUser?.isAdmin || false

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only administrators can delete transfers' })
    }

    // Get transfer to delete (to get file path)
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    })

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' })
    }

    try {
      // Delete the PDF file from filesystem
      const fs = await import('fs/promises')
      const path = await import('path')
      const filePath = path.join(process.cwd(), 'uploads', path.basename(transfer.pdfPath))
      
      try {
        await fs.unlink(filePath)
      } catch (fileError: any) {
        // File might not exist, log but don't fail
        console.warn('Could not delete file:', fileError.message)
      }

      // Delete the transfer record
      await prisma.transfer.delete({
        where: { id: transferId },
      })

      res.json({ success: true, message: 'Transfer deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting transfer:', error)
      res.status(500).json({ error: error.message || 'Failed to delete transfer' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

