'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { FileText, Plus, Trash2, LogOut, ChevronDown, ChevronRight, FilePlus, RotateCcw, X, Calendar } from 'lucide-react'

interface Page {
  id: string
  title: string
  parent_id: string | null
  created_at: string
  deleted_at?: string | null
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
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className="shrink-0 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center"
        >
          {children.length > 0
            ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
            : <span className="w-3" />
          }
        </button>

        <FileText size={14} className="shrink-0 text-gray-400" />
        <div className="group/tip relative flex-1 min-w-0">
          <span className="text-[13px] truncate block">{page.title || '제목 없음'}</span>
          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[200] opacity-0 group-hover/tip:opacity-100">
            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">{page.title || '제목 없음'}</div>
          </div>
        </div>

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
            title="휴지통으로 이동"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

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

function daysLeft(deletedAt: string) {
  const diff = 7 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000)
  return Math.max(diff, 0)
}

export default function Sidebar({ userName, isOpen, onClose }: { userName: string; isOpen: boolean; onClose: () => void }) {
  const [pages, setPages] = useState<Page[]>([])
  const [trashedPages, setTrashedPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [trashOpen, setTrashOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useRef(createClient())

  const fetchPages = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    // 7일 지난 항목 영구삭제
    await supabase.current.from('pages')
      .delete()
      .eq('author_name', userName)
      .not('deleted_at', 'is', null)
      .lt('deleted_at', sevenDaysAgo)

    const { data } = await supabase.current
      .from('pages')
      .select('id, title, parent_id, created_at, deleted_at')
      .eq('author_name', userName)
      .order('created_at', { ascending: true })

    const all = data || []
    setPages(all.filter(p => !p.deleted_at))
    setTrashedPages(all.filter(p => p.deleted_at))
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
          if (updated.deleted_at) {
            setPages(prev => prev.filter(p => p.id !== updated.id))
            setTrashedPages(prev => {
              const exists = prev.find(p => p.id === updated.id)
              return exists ? prev : [...prev, updated]
            })
          } else {
            setPages(prev => prev.map(p => p.id === updated.id ? { ...p, title: updated.title } : p))
            setTrashedPages(prev => prev.filter(p => p.id !== updated.id))
          }
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
    await supabase.current.from('pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', pageId)
    setPages(prev => {
      const page = prev.find(p => p.id === pageId)
      if (page) setTrashedPages(t => [...t, { ...page, deleted_at: new Date().toISOString() }])
      return prev.filter(p => p.id !== pageId)
    })
    if (pathname === `/dashboard/page/${pageId}`) router.push('/dashboard')
  }

  const restorePage = async (pageId: string) => {
    await supabase.current.from('pages')
      .update({ deleted_at: null })
      .eq('id', pageId)
    setTrashedPages(prev => {
      const page = prev.find(p => p.id === pageId)
      if (page) setPages(t => [...t, { ...page, deleted_at: null }])
      return prev.filter(p => p.id !== pageId)
    })
  }

  const permanentDelete = async (pageId: string) => {
    await supabase.current.from('pages').delete().eq('id', pageId)
    setTrashedPages(prev => prev.filter(p => p.id !== pageId))
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
        {/* 캘린더 링크 */}
        <button
          onClick={() => { router.push('/dashboard/calendar'); onClose() }}
          className={`flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg mx-1 transition-colors text-[13px] ${
            pathname === '/dashboard/calendar' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          style={{ width: 'calc(100% - 8px)' }}
        >
          <Calendar size={14} />
          <div className="group/tip relative flex-1 min-w-0">
            <span className="truncate block">{userName}의 캘린더</span>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[200] opacity-0 group-hover/tip:opacity-100">
              <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">{userName}의 캘린더</div>
            </div>
          </div>
        </button>

        <div className="px-3 mb-1 mt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">페이지</span>
          <button
            onClick={() => createPage(null)}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded p-0.5 transition-colors"
            title="새 페이지"
          >
            <Plus size={15} />
          </button>
        </div>

        {loading ? (
          <div className="px-3 py-2 text-sm text-gray-400">불러오는 중...</div>
        ) : topLevelPages.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400">페이지가 없어요</div>
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

        {/* 휴지통 섹션 */}
        <div className="mt-3 border-t border-gray-200 pt-2">
          <button
            onClick={() => setTrashOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg mx-1 transition-colors"
          >
            <Trash2 size={14} />
            <span className="text-[13px] font-medium flex-1 text-left">휴지통</span>
            {trashedPages.length > 0 && (
              <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-1.5 py-0.5">{trashedPages.length}</span>
            )}
            {trashOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {trashOpen && (
            <div className="mt-1">
              {trashedPages.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">휴지통이 비어있어요</div>
              ) : (
                trashedPages.map(page => (
                  <div key={page.id} className="group flex items-center gap-1 py-1 mx-1 px-2 rounded-lg text-gray-400">
                    <FileText size={12} className="shrink-0" />
                    <div className="group/tip relative flex-1 min-w-0">
                      <span className="text-[13px] truncate block">{page.title || '제목 없음'}</span>
                      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[200] opacity-0 group-hover/tip:opacity-100">
                        <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">{page.title || '제목 없음'}</div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-300 shrink-0">{daysLeft(page.deleted_at!)}일</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => restorePage(page.id)}
                        className="hover:text-green-500 p-0.5 rounded"
                        title="복원"
                      >
                        <RotateCcw size={11} />
                      </button>
                      <button
                        onClick={() => permanentDelete(page.id)}
                        className="hover:text-red-500 p-0.5 rounded"
                        title="영구삭제"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
          <div className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
            {userName[0]}
          </div>
          <div className="group/tip relative flex-1 min-w-0">
            <span className="text-sm text-gray-600 truncate block">{userName}</span>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[200] opacity-0 group-hover/tip:opacity-100">
              <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">{userName}</div>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('workspace_user'); window.location.href = '/login' }} className="text-gray-400 hover:text-gray-700" title="나가기">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
