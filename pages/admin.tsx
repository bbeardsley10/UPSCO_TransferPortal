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

export default function AdminDashboard({ user, setUser }: any) {
  const router = useRouter()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; transferId: number | null; transferName: string }>({
    show: false,
    transferId: null,
    transferName: '',
  })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (!user.isAdmin) {
      router.push('/')
      return
    }
    fetchTransfers()
    // Poll every 30 seconds instead of 5 seconds to reduce database load
    const interval = setInterval(fetchTransfers, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [user, archiveFilter])

  const fetchTransfers = async () => {
    try {
      const res = await fetch(`/api/transfers?archive=all`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setAllTransfers(data.transfers || [])
      } else {
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

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = transfersList.filter((t: Transfer) => {
        if (t.id.toString().includes(searchLower)) return true
        if (t.pdfFileName.toLowerCase().includes(searchLower)) return true
        if (t.fromUser.location.toLowerCase().includes(searchLower)) return true
        if (t.toUser.location.toLowerCase().includes(searchLower)) return true
        if (t.notes && t.notes.toLowerCase().includes(searchLower)) return true
        return false
      })
    }

    // Apply archive filter
    if (archiveFilter !== 'all') {
      if (archiveFilter === 'archived') {
        filtered = filtered.filter((t: Transfer) => t.archived === true)
      } else if (archiveFilter === 'active') {
        filtered = filtered.filter((t: Transfer) => t.archived === false)
      }
    }

    setTransfers(filtered)
  }

  useEffect(() => {
    if (allTransfers.length >= 0 && user) {
      applyFiltersAndSearch(allTransfers)
    }
  }, [searchTerm, allTransfers, user, archiveFilter])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
    router.push('/login')
  }

  const handleDeleteClick = (transfer: Transfer) => {
    setDeleteConfirm({
      show: true,
      transferId: transfer.id,
      transferName: `${transfer.fromUser.location} → ${transfer.toUser.location} (${transfer.pdfFileName})`,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.transferId) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/transfers/${deleteConfirm.transferId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        // Remove from local state
        setAllTransfers(allTransfers.filter(t => t.id !== deleteConfirm.transferId))
        setDeleteConfirm({ show: false, transferId: null, transferName: '' })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete transfer')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('An error occurred while deleting the transfer')
    } finally {
      setDeleting(false)
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

  if (!user || !user.isAdmin) return null

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
                Admin Dashboard
              </h1>
              <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-white/20 text-white backdrop-blur-sm whitespace-nowrap">
                {user.location}
              </span>
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-purple-200/50">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Total Transfers</div>
              <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-purple-600">{allTransfers.length}</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-blue-200/50">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Active</div>
              <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-blue-600">
                {allTransfers.filter(t => !t.archived).length}
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200/50">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Archived</div>
              <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-gray-600">
                {allTransfers.filter(t => t.archived).length}
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-green-200/50">
              <div className="text-xs sm:text-sm font-medium text-gray-600">Fulfilled</div>
              <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-green-600">
                {allTransfers.filter(t => t.status === 'fulfilled').length}
              </div>
            </div>
          </div>

          <div className="mb-8 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
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
                placeholder="Search all transfers..."
                value={searchTerm}
                onChange={(e) => {
                  const newSearchTerm = e.target.value
                  setSearchTerm(newSearchTerm)
                  if (newSearchTerm.trim() && archiveFilter !== 'all') {
                    setArchiveFilter('all')
                  }
                }}
                className="block w-full pl-12 pr-4 py-3.5 border-2 border-purple-200 rounded-xl leading-5 bg-white/90 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200 text-sm"
              />
            </div>

            {/* Archive Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">Status:</span>
              <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-purple-200">
                <button
                  onClick={() => setArchiveFilter('active')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    archiveFilter === 'active'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setArchiveFilter('archived')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    archiveFilter === 'archived'
                      ? 'bg-gradient-to-r from-gray-600 to-slate-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Archived
                </button>
                <button
                  onClick={() => setArchiveFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
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

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading transfers...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-200">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {searchTerm ? `No transfers found matching "${searchTerm}"` : 'No transfers found'}
              </p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-purple-200/50">
              <ul className="divide-y divide-purple-200/50">
                {transfers.map((transfer) => (
                  <li key={transfer.id}>
                    <div className="px-4 sm:px-6 py-4 sm:py-5 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 transition-all duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <Link href={`/transfer/${transfer.id}`} className="block">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <p className="text-sm sm:text-base font-semibold text-gray-900 hover:text-purple-600 transition-colors break-words">
                                {transfer.fromUser.location} → {transfer.toUser.location}
                              </p>
                              {transfer.viewedByRecipient !== true && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white border border-red-600 shadow-md animate-pulse whitespace-nowrap">
                                  NEW
                                </span>
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
                          </Link>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 sm:ml-4">
                          <div className="flex flex-col items-start sm:items-end">
                            <span
                              className={`inline-block px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap ${getStatusColor(
                                transfer.status
                              )}`}
                            >
                              {formatStatus(transfer.status)}
                            </span>
                            <span className="text-xs text-gray-500 mt-1.5 hidden sm:block">
                              Created: {formatDate(transfer.createdAt)}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteClick(transfer)
                            }}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs sm:text-sm whitespace-nowrap"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-200">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="ml-4 text-xl font-bold text-gray-900">Confirm Deletion</h3>
            </div>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete this transfer?
            </p>
            <p className="text-sm font-semibold text-gray-900 mb-6 bg-gray-50 p-3 rounded-lg">
              {deleteConfirm.transferName}
            </p>
            <p className="text-sm text-red-600 font-medium mb-6">
              ⚠️ This action cannot be undone. The transfer and its PDF file will be permanently deleted.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, transferId: null, transferName: '' })}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

