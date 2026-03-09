'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import SearchBar from '@/components/SearchBar'
import { Menu } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <span className="text-sm text-slate-400">불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (!userName) return null

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar userName={userName} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <div className="md:hidden flex items-center px-4 py-2.5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>
        <SearchBar userName={userName} />
        {children}
      </main>
    </div>
  )
}
