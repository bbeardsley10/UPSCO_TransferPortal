import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

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
  viewedByRecipient: boolean
  viewedByRecipientAt: string | null
  createdAt: string
  fromUser: { id: number; username: string; location: string }
  toUser: { id: number; username: string; location: string }
}

export default function Dashboard({ user, setUser }: any) {
  const router = useRouter()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all')
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    // Redirect admins to admin dashboard
    if (user.isAdmin) {
      router.push('/admin')
      return
    }
    fetchTransfers()
    const interval = setInterval(fetchTransfers, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [user, filter, archiveFilter])

  // Refresh transfers when returning to the page (e.g., from transfer detail page)
  useEffect(() => {
    const handleFocus = () => {
      if (user && !user.isAdmin) {
        fetchTransfers()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  const fetchTransfers = async () => {
    try {
      // Always fetch all transfers so search can work across all of them
      // The archive filter will be applied in the frontend
      const res = await fetch(`/api/transfers?archive=all`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        console.log('[Dashboard] Fetched transfers:', data.transfers?.length || 0, 'User ID:', user?.id, 'isAdmin:', user?.isAdmin)
        // Log viewedByRecipient status for debugging
        if (data.transfers && data.transfers.length > 0) {
          data.transfers.forEach((t: any) => {
            if (t.toUser && t.toUser.id === user?.id) {
              console.log(`[Dashboard] Transfer ${t.id}: viewedByRecipient=${t.viewedByRecipient} (type: ${typeof t.viewedByRecipient}), toUser.id=${t.toUser.id}, user.id=${user?.id}`)
              console.log(`[Dashboard] Transfer ${t.id} full object:`, JSON.stringify(t, null, 2).substring(0, 500))
            }
          })
        }
        setAllTransfers(data.transfers || [])
        // Don't call applyFiltersAndSearch here - let the useEffect handle it
        // This ensures user.isAdmin is properly set
      } else {
        console.error('[Dashboard] Failed to fetch transfers:', res.status, res.statusText)
        setAllTransfers([])
      }
    } catch (error) {
      console.error('Failed to fetch transfers:', error)
      setAllTransfers([])
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSearch = (transfersList: Transfer[]) => {
    let filtered = transfersList

    // Step 1: Apply search FIRST - search across ALL transfers regardless of other filters
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = transfersList.filter((t: Transfer) => {
        // Search by transfer ID
        if (t.id.toString().includes(searchLower)) return true
        // Search by PDF filename (transfer number is usually in the filename)
        if (t.pdfFileName.toLowerCase().includes(searchLower)) return true
        // Search by location names
        if (t.fromUser.location.toLowerCase().includes(searchLower)) return true
        if (t.toUser.location.toLowerCase().includes(searchLower)) return true
        // Search in notes
        if (t.notes && t.notes.toLowerCase().includes(searchLower)) return true
        return false
      })
    }

    // Step 2: Apply direction filter (sent/received/all) - admins see all, so no filtering needed
    if (!user?.isAdmin && user?.id) {
      if (filter === 'sent') {
        filtered = filtered.filter((t: Transfer) => t.fromUser?.id === user.id)
      } else if (filter === 'received') {
        filtered = filtered.filter((t: Transfer) => t.toUser?.id === user.id)
      }
      // If filter is 'all', show all transfers where user is involved (no additional filtering)
    }

    // Step 3: Apply archive filter (we always fetch all transfers, so apply filter here)
    // When searching, we show all results regardless of archive status (archiveFilter is set to 'all')
    if (archiveFilter !== 'all') {
      if (archiveFilter === 'archived') {
        filtered = filtered.filter((t: Transfer) => t.archived === true)
      } else if (archiveFilter === 'active') {
        filtered = filtered.filter((t: Transfer) => t.archived === false)
      }
    }
    
    console.log('[Dashboard] After filtering:', filtered.length, 'transfers (filter:', filter, ', archive:', archiveFilter, ', search:', searchTerm, ', total:', transfersList.length, ', user ID:', user?.id, ', isAdmin:', user?.isAdmin)

    setTransfers(filtered)
  }

  useEffect(() => {
    if (allTransfers.length >= 0 && user) {
      // Always apply filters, even if allTransfers is empty
      applyFiltersAndSearch(allTransfers)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchTerm, allTransfers, user])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
    router.push('/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
      case 'acknowledged':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white'
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
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

  if (!user) return null

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
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                UPSCO Transfers
              </h1>
              <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-white/20 text-white backdrop-blur-sm whitespace-nowrap">
                {user.location}
              </span>
              {user.isAdmin && (
                <span className="px-2 sm:px-3 py-1 text-xs font-semibold rounded-full bg-white/30 text-white backdrop-blur-sm whitespace-nowrap">
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link
                href="/upload"
                className="px-3 sm:px-5 py-2 sm:py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs sm:text-sm whitespace-nowrap"
              >
                + Upload
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-white hover:bg-white/20 rounded-lg transition-colors duration-200 font-medium text-xs sm:text-sm whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-8 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => {
                  const newSearchTerm = e.target.value
                  setSearchTerm(newSearchTerm)
                  // When searching, automatically switch to 'all' to show both active and archived results
                  if (newSearchTerm.trim() && archiveFilter !== 'all') {
                    setArchiveFilter('all')
                  }
                }}
                className="block w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3.5 border-2 border-gray-200 rounded-xl leading-5 bg-white/90 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200 text-sm"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Direction:</span>
                <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      filter === 'all'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All
                  </button>
                  {!user.isAdmin && (
                    <>
                      <button
                        onClick={() => setFilter('sent')}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          filter === 'sent'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Sent
                      </button>
                      <button
                        onClick={() => setFilter('received')}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          filter === 'received'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Received
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Status:</span>
                <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setArchiveFilter('active')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      archiveFilter === 'active'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setArchiveFilter('archived')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      archiveFilter === 'archived'
                        ? 'bg-gradient-to-r from-gray-600 to-slate-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Archived
                  </button>
                  <button
                    onClick={() => setArchiveFilter('all')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      archiveFilter === 'all'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading transfers...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {searchTerm ? `No transfers found matching "${searchTerm}"` : 'No transfers found'}
              </p>
              {searchTerm ? (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Clear search
                </button>
              ) : (
                <Link href="/upload" className="mt-2 inline-block text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Upload your first transfer
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
              <ul className="divide-y divide-gray-200/50">
                {transfers.map((transfer) => (
                  <li key={transfer.id}>
                    <Link
                      href={`/transfer/${transfer.id}`}
                      className="block hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200"
                    >
                      <div className="px-6 py-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                                {transfer.fromUser.location} → {transfer.toUser.location}
                              </p>
                              {transfer.viewedByRecipient !== true && (
                                // For "send" transfers: recipient (toUser) sees NEW
                                // For "request" transfers: location being requested from (fromUser) sees NEW
                                ((transfer.transferType === 'send' && transfer.toUser.id === user.id) ||
                                 (transfer.transferType === 'request' && transfer.fromUser.id === user.id)) && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white border border-red-600 shadow-md animate-pulse whitespace-nowrap">
                                    NEW
                                  </span>
                                )
                              )}
                              {transfer.archived && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 border border-gray-300 whitespace-nowrap">
                                  Archived
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 break-words">
                              {transfer.pdfFileName}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 sm:ml-4">
                            <div className="flex flex-col items-start sm:items-end">
                              <span
                                className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap ${getStatusColor(
                                  transfer.status
                                )}`}
                              >
                                {formatStatus(transfer.status)}
                              </span>
                              {transfer.statusUpdatedAt && (
                                <span className="text-xs text-gray-500 mt-1.5 hidden sm:block">
                                  Updated: {formatDate(transfer.statusUpdatedAt)}
                                </span>
                              )}
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-xs sm:text-sm font-medium text-gray-700">Created</span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(transfer.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        {transfer.status === 'fulfilled' && (
                          <div className="mt-4 pt-4 border-t border-gray-200/50">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              {transfer.receivedAtDestination ? (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-sm whitespace-nowrap">
                                  ✓ Received at destination
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                  Not yet received
                                </span>
                              )}
                              {transfer.enteredIntoSystem ? (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 shadow-sm whitespace-nowrap">
                                  ✓ Entered into System
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">
                                  Not entered into system
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {transfer.notes && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg shadow-sm">
                            <p className="text-sm font-semibold text-amber-900 mb-1.5 flex items-center">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              Note:
                            </p>
                            <p className="text-sm text-amber-800 line-clamp-2">
                              {transfer.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

