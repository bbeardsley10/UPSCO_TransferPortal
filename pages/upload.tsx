import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/router'

interface User {
  id: number
  username: string
  location: string
}

export default function Upload({ user, setUser }: any) {
  const router = useRouter()
  const [transferType, setTransferType] = useState<'send' | 'request'>('send')
  const [recipients, setRecipients] = useState<User[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchRecipients()
  }, [user])

  const fetchRecipients = async () => {
    try {
      const res = await fetch('/api/users', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setRecipients(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch recipients:', error)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedLocation) {
      setError(`Please select a ${transferType === 'send' ? 'recipient' : 'source'} location`)
      return
    }

    if (!file) {
      setError('Please select a PDF file')
      return
    }

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('transferType', transferType)
      formData.append('locationId', selectedLocation)

      const res = await fetch('/api/transfers/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setFile(null)
        setSelectedLocation('')
        // Reset file input
        const fileInput = document.getElementById('pdf-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
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

      <main className="max-w-3xl mx-auto py-4 sm:py-8 sm:px-6 lg:px-8">
        <div className="px-3 sm:px-4 lg:px-0">
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200/50">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent mb-6 sm:mb-8">
              Upload Transfer PDF
            </h2>

            {error && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 px-5 py-4 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Transfer uploaded successfully! Redirecting...
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 sm:mb-4">
                  Transfer Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    transferType === 'send'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="transferType"
                      value="send"
                      checked={transferType === 'send'}
                      onChange={(e) => {
                        setTransferType('send')
                        setSelectedLocation('')
                      }}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          transferType === 'send' ? 'border-blue-500' : 'border-gray-300'
                        }`}>
                          {transferType === 'send' && (
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          transferType === 'send' ? 'text-blue-700' : 'text-gray-700'
                        }`}>Send Transfer</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 ml-8">
                        Send items from your location
                      </p>
                    </div>
                  </label>
                  <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    transferType === 'request'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="transferType"
                      value="request"
                      checked={transferType === 'request'}
                      onChange={(e) => {
                        setTransferType('request')
                        setSelectedLocation('')
                      }}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          transferType === 'request' ? 'border-blue-500' : 'border-gray-300'
                        }`}>
                          {transferType === 'request' && (
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          transferType === 'request' ? 'text-blue-700' : 'text-gray-700'
                        }`}>Request Transfer</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 ml-8">
                        Request items from another location
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                  {transferType === 'send' ? 'Send to Location' : 'Request from Location'}
                </label>
                <select
                  id="location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:shadow-md sm:text-sm"
                  required
                >
                  <option value="">Select a location</option>
                  {recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pdf-file" className="block text-sm font-semibold text-gray-700 mb-2">
                  Transfer PDF File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50/50 hover:bg-gray-50 hover:border-blue-400 transition-all duration-200">
                  <div className="space-y-3 text-center">
                    <svg
                      className="mx-auto h-14 w-14 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="pdf-file"
                        className="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="pdf-file"
                          name="pdf-file"
                          type="file"
                          accept=".pdf,application/pdf"
                          className="sr-only"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF up to 10MB</p>
                    {file && (
                      <p className="text-sm font-medium text-gray-900 mt-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                        {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                <a
                  href={user.isAdmin ? "/admin" : "/"}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md text-center"
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    'Upload Transfer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

