'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { FileText, Plus, Trash2, LogOut, ChevronDown, ChevronRight, FilePlus } from 'lucide-react'

interface Page {
  id: string
  title: string
  parent_id: string | null
  created_at: string
}

function PageItem({
  page,
  allPages,
  depth,
  pathname,
  onNavigate,
  onCreateChild,
  onDelete,
}: {
  page: Page
  allPages: Page[]
  depth: number
  pathname: string
  onNavigate: (id: string) => void
  onCreateChild: (parentId: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const children = allPages.filter(p => p.parent_id === page.id)
  const isActive = pathname === `/dashboard/page/${page.id}`

  return (
    <div>
      <div
        onClick={() => onNavigate(page.id)}
        className={`group flex items-center gap-1 py-1 mx-1 rounded-lg cursor-pointer transition-colors pr-1 ${
          isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
        }`}
        style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
      >
        {/* 펼치기 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className="shrink-0 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center"
        >
          {children.length > 0
            ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
            : <span className="w-3" />
          }
        </button>

        <FileText size={13} className="shrink-0 text-gray-400" />
        <span className="text-sm truncate flex-1 min-w-0">{page.title || '제목 없음'}</span>

        {/* 하위 페이지 생성 + 삭제 버튼 */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateChild(page.id) }}
            className="text-gray-400 hover:text-gray-700 p-0.5 rounded"
            title="하위 페이지 만들기"
          >
            <FilePlus size={12} />
          </button>
          <button
            onClick={(e) => onDelete(e, page.id)}
            className="text-gray-400 hover:text-red-500 p-0.5 rounded"
            title="삭제"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* 하위 페이지 */}
      {expanded && children.map(child => (
        <PageItem
          key={child.id}
          page={child}
          allPages={allPages}
          depth={depth + 1}
          pathname={pathname}
          onNavigate={onNavigate}
          onCreateChild={onCreateChild}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export default function Sidebar({ userName, isOpen, onClose }: { userName: string; isOpen: boolean; onClose: () => void }) {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useRef(createClient())

  const fetchPages = useCallback(async () => {
    const { data } = await supabase.current
      .from('pages')
      .select('id, title, parent_id, created_at')
      .eq('author_name', userName)
      .order('created_at', { ascending: true })
    setPages(data || [])
    setLoading(false)
  }, [userName])

  useEffect(() => {
    const handler = (e: Event) => {
      const { id, title } = (e as CustomEvent).detail
      setPages(prev => prev.map(p => p.id === id ? { ...p, title } : p))
    }
    window.addEventListener('page-title-change', handler)
    return () => window.removeEventListener('page-title-change', handler)
  }, [])

  useEffect(() => {
    fetchPages()
    const client = supabase.current
    const channel = client
      .channel(`pages-${userName}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pages' },
        (payload) => {
          const updated = payload.new as Page
          setPages(prev => prev.map(p => p.id === updated.id ? { ...p, title: updated.title } : p))
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pages' },
        () => fetchPages()
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pages' },
        () => fetchPages()
      )
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [fetchPages, userName])

  const navigate = (id: string) => {
    router.push(`/dashboard/page/${id}`)
    onClose()
  }

  const createPage = async (parentId: string | null = null) => {
    const { data, error } = await supabase.current
      .from('pages')
      .insert({ title: '제목 없음', content: '', author_name: userName, parent_id: parentId })
      .select()
      .single()

    if (error) { alert('오류: ' + error.message); return }
    if (data) {
      await fetchPages()
      router.push(`/dashboard/page/${data.id}`)
    }
  }

  const deletePage = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    if (!confirm('이 페이지를 삭제할까요?')) return
    await supabase.current.from('pages').delete().eq('id', pageId)
    await fetchPages()
    if (pathname === `/dashboard/page/${pageId}`) router.push('/dashboard')
  }

  const topLevelPages = pages.filter(p => p.parent_id === null)

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full transform transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div className="w-6 h-6 bg-gray-900 rounded text-white text-xs flex items-center justify-center font-bold">W</div>
          <span className="text-sm font-semibold text-gray-800 flex-1 truncate">워크스페이스</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">페이지</span>
          <button
            onClick={() => createPage(null)}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded p-0.5 transition-colors"
            title="새 페이지"
          >
            <Plus size={14} />
          </button>
        </div>

        {loading ? (
          <div className="px-3 py-2 text-xs text-gray-400">불러오는 중...</div>
        ) : topLevelPages.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-400">페이지가 없어요</div>
        ) : (
          topLevelPages.map(page => (
            <PageItem
              key={page.id}
              page={page}
              allPages={pages}
              depth={0}
              pathname={pathname}
              onNavigate={(id) => navigate(id)}
              onCreateChild={(parentId) => createPage(parentId)}
              onDelete={deletePage}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
          <div className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
            {userName[0]}
          </div>
          <span className="text-xs text-gray-600 flex-1 truncate">{userName}</span>
          <button onClick={() => { localStorage.removeItem('workspace_user'); window.location.href = '/login' }} className="text-gray-400 hover:text-gray-700" title="나가기">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
