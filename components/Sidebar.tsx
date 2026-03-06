'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { FileText, Plus, Trash2, LogOut, ChevronDown } from 'lucide-react'

interface Page {
  id: string
  title: string
  created_at: string
}

export default function Sidebar({ userName }: { userName: string }) {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const fetchPages = useCallback(async () => {
    const { data } = await supabase
      .from('pages')
      .select('id, title, created_at')
      .eq('author_name', userName)
      .order('created_at', { ascending: false })
    setPages(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPages()

    const channel = supabase
      .channel('pages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages', filter: `author_name=eq.${userName}` }, fetchPages)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchPages, supabase])

  const createPage = async () => {
    const { data } = await supabase
      .from('pages')
      .insert({ title: '제목 없음', content: '', author_name: userName })
      .select()
      .single()

    if (data) {
      router.push(`/dashboard/page/${data.id}`)
    }
  }

  const deletePage = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    if (!confirm('이 페이지를 삭제할까요?')) return
    await supabase.from('pages').delete().eq('id', pageId)
    if (pathname === `/dashboard/page/${pageId}`) {
      router.push('/dashboard')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('workspace_user')
    window.location.href = '/login'
  }

  return (
    <aside className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-left">
          <div className="w-6 h-6 bg-gray-900 rounded text-white text-xs flex items-center justify-center font-bold">
            W
          </div>
          <span className="text-sm font-semibold text-gray-800 flex-1 truncate">워크스페이스</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">페이지</span>
          <button
            onClick={createPage}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded p-0.5 transition-colors"
            title="새 페이지"
          >
            <Plus size={14} />
          </button>
        </div>

        {loading ? (
          <div className="px-3 py-2 text-xs text-gray-400">불러오는 중...</div>
        ) : pages.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-400">페이지가 없어요</div>
        ) : (
          pages.map((page) => {
            const isActive = pathname === `/dashboard/page/${page.id}`
            return (
              <div
                key={page.id}
                onClick={() => router.push(`/dashboard/page/${page.id}`)}
                className={`group flex items-center gap-2 px-3 py-1.5 mx-1 rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <FileText size={14} className="shrink-0 text-gray-400" />
                <span className="text-sm truncate flex-1">{page.title || '제목 없음'}</span>
                <button
                  onClick={(e) => deletePage(e, page.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5 rounded"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
          <div className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
            {userName[0]}
          </div>
          <span className="text-xs text-gray-600 flex-1 truncate">{userName}</span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            title="나가기"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
