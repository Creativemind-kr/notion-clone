'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const name = localStorage.getItem('workspace_user')
    if (!name) {
      const redirect = window.location.pathname
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`)
    } else {
      setUserName(name)
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400 text-sm">
        불러오는 중...
      </div>
    )
  }

  if (!userName) return null

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar userName={userName} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
