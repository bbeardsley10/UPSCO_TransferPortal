import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        if (router.pathname === '/login') {
          // Redirect admins to admin dashboard, regular users to regular dashboard
          router.push(data.user.isAdmin ? '/admin' : '/')
        }
      } else {
        setUser(null)
        if (router.pathname !== '/login') {
          router.push('/login')
        }
      }
    } catch (error) {
      setUser(null)
      if (router.pathname !== '/login') {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return <Component {...pageProps} user={user} setUser={setUser} />
}

