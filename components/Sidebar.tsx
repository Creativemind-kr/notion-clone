'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  return (
    <div
      className="relative flex-1 min-w-0"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setPos({ x: rect.left, y: rect.bottom + 4 })
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg pointer-events-none"
          style={{ left: pos.x, top: pos.y }}
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  )
}

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
  page, allPages, depth, pathname, onNavigate, onCreateChild, onDelete,
}: {
  page: Page; allPages: Page[]; depth: number; pathname: string
  onNavigate: (id: string) => void; onCreateChild: (parentId: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const children = allPages.filter(p => p.parent_id === page.id)
  const isActive = pathname === `/dashboard/page/${page.id}`

  return (
    <div>
      <div
        onClick={() => onNavigate(page.id)}
        className={`group flex items-center gap-1 py-1 mx-2 rounded-lg cursor-pointer transition-all pr-1 ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
        style={{ paddingLeft: `${0.6 + depth * 1}rem` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-500'}`}
        >
          {children.length > 0
            ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)
            : <span className="w-3" />}
        </button>

        <FileText size={13} className={`shrink-0 ${isActive ? 'text-white/70' : 'text-slate-300'}`} />
        <Tooltip text={page.title || '제목 없음'}>
          <span className="text-[13px] truncate block leading-tight py-0.5">{page.title || '제목 없음'}</span>
        </Tooltip>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateChild(page.id) }}
            className={`p-0.5 rounded transition-colors ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-600'}`}
            title="하위 페이지 만들기"
          >
            <FilePlus size={11} />
          </button>
          <button
            onClick={(e) => onDelete(e, page.id)}
            className={`p-0.5 rounded transition-colors ${isActive ? 'text-white/60 hover:text-red-300' : 'text-slate-300 hover:text-red-400'}`}
            title="휴지통으로 이동"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {expanded && children.map(child => (
        <PageItem key={child.id} page={child} allPages={allPages} depth={depth + 1}
          pathname={pathname} onNavigate={onNavigate} onCreateChild={onCreateChild} onDelete={onDelete} />
      ))}
    </div>
  )
}

function daysLeft(deletedAt: string) {
  return Math.max(7 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000), 0)
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
    await supabase.current.from('pages').delete().eq('author_name', userName).not('deleted_at', 'is', null).lt('deleted_at', sevenDaysAgo)
    const { data } = await supabase.current.from('pages')
      .select('id, title, parent_id, created_at, deleted_at')
      .eq('author_name', userName).order('created_at', { ascending: true })
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
    const channel = client.channel(`pages-${userName}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pages' }, (payload) => {
        const updated = payload.new as Page
        if (updated.deleted_at) {
          setPages(prev => prev.filter(p => p.id !== updated.id))
          setTrashedPages(prev => prev.find(p => p.id === updated.id) ? prev : [...prev, updated])
        } else {
          setPages(prev => prev.map(p => p.id === updated.id ? { ...p, title: updated.title } : p))
          setTrashedPages(prev => prev.filter(p => p.id !== updated.id))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pages' }, () => fetchPages())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pages' }, () => fetchPages())
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [fetchPages, userName])

  const navigate = (id: string) => { router.push(`/dashboard/page/${id}`); onClose() }

  const createPage = async (parentId: string | null = null) => {
    const { data, error } = await supabase.current.from('pages')
      .insert({ title: '제목 없음', content: '', author_name: userName, parent_id: parentId })
      .select().single()
    if (error) { alert('오류: ' + error.message); return }
    if (data) { await fetchPages(); router.push(`/dashboard/page/${data.id}`) }
  }

  const deletePage = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    await supabase.current.from('pages').update({ deleted_at: new Date().toISOString() }).eq('id', pageId)
    setPages(prev => {
      const page = prev.find(p => p.id === pageId)
      if (page) setTrashedPages(t => [...t, { ...page, deleted_at: new Date().toISOString() }])
      return prev.filter(p => p.id !== pageId)
    })
    if (pathname === `/dashboard/page/${pageId}`) router.push('/dashboard')
  }

  const restorePage = async (pageId: string) => {
    await supabase.current.from('pages').update({ deleted_at: null }).eq('id', pageId)
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
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col h-full transform transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 bg-slate-900 rounded-lg text-white text-xs flex items-center justify-center font-bold shrink-0">S</div>
          <span className="text-sm font-semibold text-slate-800 flex-1 truncate">스브스 워크스페이스</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2 mb-1">
          <button
            onClick={() => { router.push('/dashboard/calendar'); onClose() }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all text-[13px] font-medium ${
              pathname === '/dashboard/calendar'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar size={13} className={pathname === '/dashboard/calendar' ? 'text-white/70' : 'text-slate-300'} />
            <Tooltip text={`${userName}의 캘린더`}>
              <span className="truncate block">{userName}의 캘린더</span>
            </Tooltip>
          </button>
        </div>

        <div className="px-4 mb-1 mt-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">페이지</span>
          <button onClick={() => createPage(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md p-1 transition-colors" title="새 페이지">
            <Plus size={14} />
          </button>
        </div>

        {loading ? (
          <div className="px-4 py-2 text-xs text-slate-400">불러오는 중...</div>
        ) : topLevelPages.length === 0 ? (
          <div className="px-4 py-3 text-xs text-slate-400">
            <p>페이지가 없어요</p>
            <button onClick={() => createPage(null)} className="mt-1 text-slate-600 hover:text-slate-900 underline underline-offset-2">새 페이지 만들기</button>
          </div>
        ) : (
          topLevelPages.map(page => (
            <PageItem key={page.id} page={page} allPages={pages} depth={0}
              pathname={pathname} onNavigate={navigate}
              onCreateChild={(parentId) => createPage(parentId)} onDelete={deletePage} />
          ))
        )}

        <div className="mt-4 px-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setTrashOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Trash2 size={13} />
            <span className="text-[13px] font-medium flex-1 text-left">휴지통</span>
            {trashedPages.length > 0 && (
              <span className="text-[11px] bg-slate-100 text-slate-400 rounded-full px-1.5 py-0.5 font-medium">{trashedPages.length}</span>
            )}
            {trashOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {trashOpen && (
            <div className="mt-1 space-y-0.5">
              {trashedPages.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">휴지통이 비어있어요</div>
              ) : (
                trashedPages.map(page => (
                  <div key={page.id} className="group flex items-center gap-1.5 py-1 px-3 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors">
                    <FileText size={11} className="shrink-0" />
                    <Tooltip text={page.title || '제목 없음'}>
                      <span className="text-[12px] truncate block">{page.title || '제목 없음'}</span>
                    </Tooltip>
                    <span className="text-[11px] text-slate-300 shrink-0">{daysLeft(page.deleted_at!)}일</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                      <button onClick={() => restorePage(page.id)} className="hover:text-green-500 p-0.5 rounded transition-colors" title="복원"><RotateCcw size={10} /></button>
                      <button onClick={() => permanentDelete(page.id)} className="hover:text-red-500 p-0.5 rounded transition-colors" title="영구삭제"><X size={10} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-7 h-7 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg text-white text-xs flex items-center justify-center font-semibold shrink-0">
            {userName[0].toUpperCase()}
          </div>
          <Tooltip text={userName}>
            <span className="text-[13px] text-slate-600 truncate block font-medium">{userName}</span>
          </Tooltip>
          <button
            onClick={() => { localStorage.removeItem('workspace_user'); window.location.href = '/login' }}
            className="text-slate-300 hover:text-slate-600 transition-colors ml-auto"
            title="로그아웃"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
