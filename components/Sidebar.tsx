'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { FileText, Plus, Trash2, LogOut, ChevronDown, ChevronRight, FilePlus, RotateCcw, X, Calendar, GripVertical } from 'lucide-react'

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

interface Page {
  id: string
  title: string
  parent_id: string | null
  created_at: string
  deleted_at?: string | null
}

type DropZone = 'before' | 'into' | 'after'
interface DragOverState { id: string; zone: DropZone }

function isDescendant(ancestorId: string, nodeId: string, pages: Page[]): boolean {
  let current = pages.find(p => p.id === nodeId)
  while (current?.parent_id) {
    if (current.parent_id === ancestorId) return true
    current = pages.find(p => p.id === current!.parent_id)
  }
  return false
}

function getZone(e: React.DragEvent): DropZone {
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top
  if (y < rect.height * 0.28) return 'before'
  if (y > rect.height * 0.72) return 'after'
  return 'into'
}

function PageItem({
  page, allPages, depth, pathname, onNavigate, onCreateChild, onDelete,
  dragId, dragOver, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  page: Page; allPages: Page[]; depth: number; pathname: string
  onNavigate: (id: string) => void; onCreateChild: (parentId: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
  dragId: string | null; dragOver: DragOverState | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (id: string, zone: DropZone) => void
  onDrop: (e: React.DragEvent, id: string, zone: DropZone) => void
  onDragEnd: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const children = allPages.filter(p => p.parent_id === page.id)
  const isActive = pathname === `/dashboard/page/${page.id}`
  const isDragging = dragId === page.id
  const activeZone = dragOver?.id === page.id && !isDragging ? dragOver.zone : null

  const fontSize = depth === 0
    ? 'text-[13px] font-semibold'
    : depth === 1
    ? 'text-[12px] font-normal'
    : 'text-[11.5px] font-normal'

  const rowCls = isDragging
    ? 'opacity-30'
    : activeZone === 'into'
    ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset'
    : isActive
    ? 'bg-slate-900 text-white'
    : depth === 0
    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'

  return (
    <div className="relative">
      {/* Drop BEFORE indicator */}
      {activeZone === 'before' && (
        <div
          className="absolute left-3 right-2 h-[2px] bg-blue-400 rounded-full z-20 pointer-events-none"
          style={{ top: 1 }}
        />
      )}

      <div
        draggable
        onDragStart={(e) => onDragStart(e, page.id)}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(page.id, getZone(e)) }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e, page.id, getZone(e)) }}
        onDragEnd={onDragEnd}
        onClick={() => onNavigate(page.id)}
        className={`group flex items-center gap-1 py-1 mx-2 rounded-lg cursor-pointer transition-all pr-1 relative ${rowCls}`}
        style={{ paddingLeft: `${0.4 + depth * 1.1}rem` }}
      >
        {/* Drag handle */}
        <span
          className={`shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity ${isActive ? 'text-white/40' : 'text-slate-300'}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical size={11} />
        </span>

        {/* Expand/collapse */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-500'}`}
        >
          {children.length > 0
            ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)
            : <span className="w-3" />}
        </button>

        {/* Icon */}
        <FileText
          size={depth === 0 ? 13 : 12}
          className={`shrink-0 ${isActive ? 'text-white/70' : depth === 0 ? 'text-slate-400' : 'text-slate-300'}`}
        />

        {/* Title */}
        <Tooltip text={page.title || '제목 없음'}>
          <span className={`truncate block leading-tight py-0.5 ${fontSize}`}>
            {page.title || '제목 없음'}
          </span>
        </Tooltip>

        {/* Actions */}
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

      {/* Drop AFTER indicator */}
      {activeZone === 'after' && (
        <div
          className="absolute left-3 right-2 h-[2px] bg-blue-400 rounded-full z-20 pointer-events-none"
          style={{ bottom: 1 }}
        />
      )}

      {/* Children + tree line */}
      {expanded && children.length > 0 && (
        <div className="relative">
          {/* Vertical tree line */}
          <div
            className="absolute top-0 bottom-1 w-px bg-slate-200 pointer-events-none"
            style={{ left: `${1.15 + depth * 1.1}rem` }}
          />
          {children.map(child => (
            <PageItem
              key={child.id} page={child} allPages={allPages} depth={depth + 1}
              pathname={pathname} onNavigate={onNavigate}
              onCreateChild={onCreateChild} onDelete={onDelete}
              dragId={dragId} dragOver={dragOver}
              onDragStart={onDragStart} onDragOver={onDragOver}
              onDrop={onDrop} onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
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
  // orderMap: { [parentId | 'root']: string[] }
  const [orderMap, setOrderMap] = useState<Record<string, string[]>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<DragOverState | null>(null)

  const orderMapRef = useRef<Record<string, string[]>>({})
  const pagesRef = useRef<Page[]>([])
  pagesRef.current = pages
  orderMapRef.current = orderMap

  const router = useRouter()
  const pathname = usePathname()
  const supabase = useRef(createClient())

  // Load order map from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`page-order-map-${userName}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setOrderMap(parsed)
        orderMapRef.current = parsed
      }
    } catch {}
  }, [userName])

  const saveOrderMap = useCallback((map: Record<string, string[]>) => {
    setOrderMap(map)
    orderMapRef.current = map
    localStorage.setItem(`page-order-map-${userName}`, JSON.stringify(map))
  }, [userName])

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

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(id)
  }, [])

  const handleDragOver = useCallback((id: string, zone: DropZone) => {
    setDragOver(prev => (prev?.id === id && prev?.zone === zone ? prev : { id, zone }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string, zone: DropZone) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    setDragId(null)
    setDragOver(null)
    if (!sourceId || sourceId === targetId) return

    const pages = pagesRef.current
    const sourcePage = pages.find(p => p.id === sourceId)
    const targetPage = pages.find(p => p.id === targetId)
    if (!sourcePage || !targetPage) return

    if (zone === 'into') {
      // Cannot drop into own descendant
      if (isDescendant(sourceId, targetId, pages)) return

      const oldKey = sourcePage.parent_id ?? 'root'
      const newKey = targetId

      // Update local state
      setPages(prev => prev.map(p => p.id === sourceId ? { ...p, parent_id: targetId } : p))
      // Update DB
      supabase.current.from('pages').update({ parent_id: targetId }).eq('id', sourceId)

      // Update order map: remove from old parent, append to new parent
      const newMap = { ...orderMapRef.current }
      newMap[oldKey] = (newMap[oldKey] ?? []).filter(id => id !== sourceId)
      newMap[newKey] = [...(newMap[newKey] ?? []), sourceId]
      saveOrderMap(newMap)

    } else {
      // before / after: move source to same level as target
      const newParentId = targetPage.parent_id
      const oldParentId = sourcePage.parent_id
      const newKey = newParentId ?? 'root'
      const oldKey = oldParentId ?? 'root'

      // Prevent circular (e.g. dragging parent before one of its descendants)
      if (newParentId && isDescendant(sourceId, newParentId, pages)) return

      // Pages at target level (including source after reparent)
      const updatedPages = oldParentId !== newParentId
        ? pages.map(p => p.id === sourceId ? { ...p, parent_id: newParentId } : p)
        : pages

      if (oldParentId !== newParentId) {
        setPages(updatedPages)
        supabase.current.from('pages').update({ parent_id: newParentId }).eq('id', sourceId)
      }

      // Compute sorted IDs for the target level
      const levelIds = updatedPages
        .filter(p => p.parent_id === newParentId)
        .map(p => p.id)

      const currentOrder = orderMapRef.current[newKey] ?? []
      const sortedIds = [...levelIds].sort((a, b) => {
        const ai = currentOrder.indexOf(a)
        const bi = currentOrder.indexOf(b)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })

      // Re-insert source before/after target
      const withoutSource = sortedIds.filter(id => id !== sourceId)
      const targetIdx = withoutSource.indexOf(targetId)
      const insertAt = zone === 'before' ? targetIdx : targetIdx + 1
      withoutSource.splice(Math.max(0, insertAt), 0, sourceId)

      const newMap = { ...orderMapRef.current }
      newMap[newKey] = withoutSource
      if (oldKey !== newKey) {
        newMap[oldKey] = (newMap[oldKey] ?? []).filter(id => id !== sourceId)
      }
      saveOrderMap(newMap)
    }
  }, [saveOrderMap])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOver(null)
  }, [])

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

  // Sort pages by orderMap within each parent group
  const sortedPages = [...pages].sort((a, b) => {
    if (a.parent_id !== b.parent_id) return 0
    const key = a.parent_id ?? 'root'
    const order = orderMap[key] ?? []
    const ai = order.indexOf(a.id)
    const bi = order.indexOf(b.id)
    if (ai === -1 && bi === -1) return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const topLevelPages = sortedPages.filter(p => p.parent_id === null)

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-100 flex flex-col h-full transform transition-transform duration-200 md:relative md:translate-x-0 md:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

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
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              // Drop on empty area below all pages → move to top level, last position
              const sourceId = e.dataTransfer.getData('text/plain')
              if (!sourceId) return
              const pages = pagesRef.current
              const sourcePage = pages.find(p => p.id === sourceId)
              if (!sourcePage || sourcePage.parent_id === null) return
              setPages(prev => prev.map(p => p.id === sourceId ? { ...p, parent_id: null } : p))
              supabase.current.from('pages').update({ parent_id: null }).eq('id', sourceId)
              const newMap = { ...orderMapRef.current }
              const oldKey = sourcePage.parent_id ?? 'root'
              newMap[oldKey] = (newMap[oldKey] ?? []).filter(id => id !== sourceId)
              newMap['root'] = [...(newMap['root'] ?? []), sourceId]
              saveOrderMap(newMap)
              setDragId(null); setDragOver(null)
            }}
          >
            {topLevelPages.map(page => (
              <PageItem
                key={page.id} page={page} allPages={sortedPages} depth={0}
                pathname={pathname} onNavigate={navigate}
                onCreateChild={(parentId) => createPage(parentId)} onDelete={deletePage}
                dragId={dragId} dragOver={dragOver}
                onDragStart={handleDragStart} onDragOver={handleDragOver}
                onDrop={handleDrop} onDragEnd={handleDragEnd}
              />
            ))}
          </div>
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
