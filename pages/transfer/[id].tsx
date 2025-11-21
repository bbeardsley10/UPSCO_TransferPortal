import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface Transfer {
  id: number
  status: string
  statusUpdatedAt: string | null
  pdfFileName: string
  pdfPath: string
  transferType: string
  notes: string | null
  receivedAtDestination: boolean
  receivedAtDestinationAt: string | null
  enteredIntoSystem: boolean
  enteredIntoSystemAt: string | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  fromUser: { id: number; username: string; location: string }
  toUser: { id: number; username: string; location: string }
}

export default function TransferDetail({ user, setUser }: any) {
  const router = useRouter()
  const { id } = router.query
  const [transfer, setTransfer] = useState<Transfer | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [receivedAtDestination, setReceivedAtDestination] = useState(false)
  const [enteredIntoSystem, setEnteredIntoSystem] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (id) {
      fetchTransfer()
    }
  }, [id, user])

  const fetchTransfer = async () => {
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.transfer) {
          setTransfer(data.transfer)
          setStatus(data.transfer.status)
          setNotes(data.transfer.notes || '')
          setReceivedAtDestination(data.transfer.receivedAtDestination || false)
          setEnteredIntoSystem(data.transfer.enteredIntoSystem || false)
        } else {
          console.error('No transfer data in response:', data)
          setError('Invalid response from server')
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to load transfer:', res.status, errorData)
        setError(errorData.error || 'Failed to load transfer')
      }
    } catch (error) {
      console.error('Error fetching transfer:', error)
      setError('An error occurred while loading the transfer')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setUpdating(true)

    try {
      // Determine what fields this user can update based on current transfer state
      if (!transfer) {
        setError('Transfer not loaded')
        setUpdating(false)
        return
      }

      const isFulfilled = transfer.status === 'fulfilled'
      const isSender = transfer.fromUser.id === user.id
      const isRecipient = transfer.toUser.id === user.id
      
      // Only send fields that the user can update
      const updatePayload: any = {}
      
      // Sender (or admin) can update status and notes
      if (user.isAdmin || isSender) {
        updatePayload.status = status
        updatePayload.notes = notes
      }
      
      // Recipient (or admin) can update fulfillment tracking after fulfillment
      if (isFulfilled && (user.isAdmin || isRecipient)) {
        updatePayload.receivedAtDestination = receivedAtDestination
        updatePayload.enteredIntoSystem = enteredIntoSystem
      }

      const res = await fetch(`/api/transfers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      })

      const data = await res.json()

      if (res.ok) {
        setTransfer(data.transfer)
        setStatus(data.transfer.status)
        setNotes(data.transfer.notes || '')
        setReceivedAtDestination(data.transfer.receivedAtDestination || false)
        setEnteredIntoSystem(data.transfer.enteredIntoSystem || false)
        setSuccess('Transfer updated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Update failed')
      }
    } catch (err: any) {
      console.error('Update error:', err)
      setError(err.message || 'An error occurred while updating the transfer')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // User can update based on transfer type and fulfillment status:
  // - Before fulfillment: only sender can update
  // - After fulfillment: recipient can update fulfillment tracking fields, sender can update status/notes
  // - Admins can always update
  const isSender = transfer ? transfer.fromUser.id === user.id : false
  const isRecipient = transfer ? transfer.toUser.id === user.id : false
  const transferType = transfer?.transferType || 'send'
  const isFulfilled = transfer?.status === 'fulfilled'
  
  let canUpdate = false
  let canUpdateFulfillment = false
  if (user.isAdmin) {
    canUpdate = true
    canUpdateFulfillment = true
  } else if (transfer) {
    if (isFulfilled) {
      // After fulfillment: recipient can update fulfillment tracking, sender can update status/notes
      canUpdate = isSender // Sender can still update status and notes
      canUpdateFulfillment = isRecipient // Recipient can update fulfillment tracking
    } else {
      // Before fulfillment: only sender can update
      if (transferType === 'send') {
        canUpdate = isSender // Only sender can update send transfers
      } else if (transferType === 'request') {
        canUpdate = isSender // Only sender (location being requested from) can update request transfers
      }
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error && !transfer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">{error}</div>
          <button
            onClick={() => {
              setError('')
              setLoading(true)
              fetchTransfer()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Transfer not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <nav className="bg-gradient-to-r from-blue-600 to-red-600 shadow-xl border-b border-blue-700/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:h-16 py-3 sm:py-0">
            <div className="flex items-center flex-wrap gap-2 mb-2 sm:mb-0">
              <img 
                src="/logo.jpg" 
                alt="UNITED Pipe Supply Co. Logo" 
                className="h-8 sm:h-10 w-auto mr-2 sm:mr-3"
              />
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Streamlined Transfers</h1>
              <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-white/20 text-white backdrop-blur-sm whitespace-nowrap">
                {user.location}
              </span>
              {user.isAdmin && (
                <span className="px-2 sm:px-3 py-1 text-xs font-semibold rounded-full bg-white/30 text-white backdrop-blur-sm whitespace-nowrap">
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center">
              <a
                href={user.isAdmin ? "/admin" : "/"}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-white hover:bg-white/20 rounded-lg transition-colors duration-200 font-medium text-xs sm:text-sm whitespace-nowrap"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-4 sm:py-8 sm:px-6 lg:px-8">
        <div className="px-3 sm:px-4 lg:px-0">
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-red-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
                    Transfer Details
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 sm:mt-2 break-words">
                    From: <span className="font-semibold text-gray-900">{transfer.fromUser.location}</span> → To: <span className="font-semibold text-gray-900">{transfer.toUser.location}</span>
                  </p>
                </div>
                {transfer.archived && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-gray-200 text-gray-700 border border-gray-300 shadow-sm whitespace-nowrap self-start sm:self-auto">
                    Archived
                  </span>
                )}
              </div>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">File Name</label>
                  <p className="text-sm font-medium text-gray-900 break-words">{transfer.pdfFileName}</p>
                </div>
                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Created</label>
                  <p className="text-sm font-medium text-gray-900">{formatDate(transfer.createdAt)}</p>
                </div>
                {transfer.statusUpdatedAt && (
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200 sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status Last Updated</label>
                    <p className="text-sm font-medium text-gray-900">{formatDate(transfer.statusUpdatedAt)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">PDF Document</label>
                {transfer.pdfPath && (() => {
                  // Extract filename from pdfPath
                  // Could be: /uploads/filename.pdf or s3://transfers/filename.pdf
                  let filename: string
                  if (transfer.pdfPath.startsWith('s3://')) {
                    // Extract from S3 path: s3://transfers/filename.pdf -> filename.pdf
                    filename = transfer.pdfPath.split('/').pop() || ''
                  } else {
                    // Extract from local path: /uploads/filename.pdf -> filename.pdf
                    filename = transfer.pdfPath.replace(/^\/uploads\//, '')
                  }
                  // Properly encode the filename for URL
                  const encodedFilename = encodeURIComponent(filename)
                  const pdfUrl = `/api/uploads/${encodedFilename}`
                  
                  return (
                    <>
                      <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
                        <iframe
                          src={pdfUrl}
                          className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
                          title="Transfer PDF"
                        />
                      </div>
                      <div className="mt-4 flex space-x-4">
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 font-medium text-sm border border-blue-200 shadow-sm hover:shadow-md"
                        >
                          Open in new tab
                        </a>
                        <a
                          href={pdfUrl}
                          download={transfer.pdfFileName}
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors duration-200 font-medium text-sm border border-indigo-200 shadow-sm hover:shadow-md"
                        >
                          Download PDF
                        </a>
                      </div>
                    </>
                  )
                })()}
              </div>

              {(canUpdate || canUpdateFulfillment) && (
                <form onSubmit={handleUpdate} className="space-y-6 border-t border-gray-200/50 pt-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {user.isAdmin ? 'Admin: Update Transfer' : 'Update Transfer'}
                  </h3>

                  {error && (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl shadow-sm">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 px-5 py-4 rounded-xl shadow-sm">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {success}
                      </div>
                    </div>
                  )}

                  {canUpdate && (
                    <>
                      <div>
                        <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          id="status"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md sm:text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="in_progress">In Progress</option>
                          <option value="fulfilled">Fulfilled</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          id="notes"
                          rows={4}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md sm:text-sm"
                          placeholder="Add any notes about this transfer..."
                        />
                      </div>
                    </>
                  )}

                  {canUpdateFulfillment && transfer?.status === 'fulfilled' && (
                    <div className="space-y-4 border-t border-gray-200/50 pt-6">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-1">Fulfillment Tracking</h4>
                        <p className="text-xs text-gray-500">As the receiving branch, you can update these fields:</p>
                      </div>
                      
                      <div className="space-y-4 bg-gray-50/50 rounded-xl p-5 border border-gray-200">
                        <div className="flex items-start">
                          <input
                            id="receivedAtDestination"
                            type="checkbox"
                            checked={receivedAtDestination}
                            onChange={(e) => setReceivedAtDestination(e.target.checked)}
                            className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                          <div className="ml-3 flex-1">
                            <label htmlFor="receivedAtDestination" className="block text-sm font-medium text-gray-900 cursor-pointer">
                              Received at destination location
                            </label>
                            {transfer?.receivedAtDestinationAt && (
                              <span className="text-xs text-gray-500 mt-1 block">
                                {formatDate(transfer.receivedAtDestinationAt)}
                              </span>
                            )}
                            {!receivedAtDestination && (
                              <p className="text-xs text-gray-500 italic mt-1">Not yet received at destination</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start">
                          <input
                            id="enteredIntoSystem"
                            type="checkbox"
                            checked={enteredIntoSystem}
                            onChange={(e) => setEnteredIntoSystem(e.target.checked)}
                            className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                          <div className="ml-3 flex-1">
                            <label htmlFor="enteredIntoSystem" className="block text-sm font-medium text-gray-900 cursor-pointer">
                              Entered into system (Prophet 21)
                            </label>
                            {transfer?.enteredIntoSystemAt && (
                              <span className="text-xs text-gray-500 mt-1 block">
                                {formatDate(transfer.enteredIntoSystemAt)}
                              </span>
                            )}
                            {!enteredIntoSystem && (
                              <p className="text-xs text-gray-500 italic mt-1">Not yet entered into system</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-gray-200/50">
                    <button
                      type="submit"
                      disabled={updating}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {updating ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </span>
                      ) : (
                        'Update Transfer'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {!canUpdate && !canUpdateFulfillment && (
                <div className="border-t border-gray-200/50 pt-6">
                  <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
                    <div className="flex flex-col space-y-2">
                      <span className={`inline-block px-4 py-2 text-sm font-semibold rounded-lg shadow-sm ${
                        transfer.status === 'fulfilled' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                        transfer.status === 'in_progress' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' :
                        transfer.status === 'acknowledged' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white' :
                        'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
                      }`}>
                        {formatStatus(transfer.status)}
                      </span>
                      {transfer.statusUpdatedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Status updated: {formatDate(transfer.statusUpdatedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {transfer.status === 'fulfilled' && (
                    <div className="mt-6 bg-gray-50/50 rounded-xl p-5 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Fulfillment Status</label>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          {transfer.receivedAtDestination ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm font-medium border border-green-200 shadow-sm">
                              ✓ Received at destination
                              {transfer.receivedAtDestinationAt && (
                                <span className="ml-2 text-xs">({formatDate(transfer.receivedAtDestinationAt)})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600 font-medium">Not yet received at destination</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {transfer.enteredIntoSystem ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium border border-blue-200 shadow-sm">
                              ✓ Entered into system (Prophet 21)
                              {transfer.enteredIntoSystemAt && (
                                <span className="ml-2 text-xs">({formatDate(transfer.enteredIntoSystemAt)})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600 font-medium">Not yet entered into system</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {transfer.notes && (
                    <div className="mt-6 bg-gray-50/50 rounded-xl p-5 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                      <p className="text-sm text-gray-900 leading-relaxed">{transfer.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

