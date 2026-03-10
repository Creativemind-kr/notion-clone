'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import {
  FileText, Plus, Trash2, LogOut, ChevronDown, ChevronRight, ChevronLeft,
  ChevronUp, FilePlus, RotateCcw, X, Calendar, ArrowUpDown, Search, GripVertical,
} from 'lucide-react'
import SearchBar from '@/components/SearchBar'

// ─── Tooltip ─────────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface Page {
  id: string
  title: string
  parent_id: string | null
  created_at: string
  deleted_at?: string | null
  sort_order: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysLeft(deletedAt: string) {
  return Math.max(7 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000), 0)
}

function sortSiblings(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => {
    const ao = a.sort_order ?? Infinity
    const bo = b.sort_order ?? Infinity
    if (ao !== bo) return ao - bo
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// ─── Order Edit Modal ─────────────────────────────────────────────────────────
function OrderModal({
  pages,
  onReorder,
  onChangeParent,
  onClose,
}: {
  pages: Page[]
  onReorder: (parentId: string | null, newIds: string[]) => void
  onChangeParent: (id: string, newParentId: string | null, insertAfterId?: string) => void
  onClose: () => void
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropInfo, setDropInfo] = useState<{ targetId: string; before: boolean } | null>(null)

  const getSortedSiblings = (parentId: string | null): Page[] =>
    sortSiblings(pages.filter(p => p.parent_id === parentId))

  const buildList = (parentId: string | null, depth: number): { page: Page; depth: number }[] =>
    getSortedSiblings(parentId).flatMap(p => [{ page: p, depth }, ...buildList(p.id, depth + 1)])

  const flat = buildList(null, 0)
  const draggedPage = draggedId ? pages.find(p => p.id === draggedId) : null

  const handleDrop = (targetId: string, before: boolean) => {
    if (!draggedId || !draggedPage) return
    const target = pages.find(p => p.id === targetId)
    if (!target || draggedPage.parent_id !== target.parent_id) return
    const filtered = getSortedSiblings(draggedPage.parent_id).filter(p => p.id !== draggedId)
    const targetIdx = filtered.findIndex(p => p.id === targetId)
    if (targetIdx < 0) return
    const newIds = filtered.map(p => p.id)
    newIds.splice(before ? targetIdx : targetIdx + 1, 0, draggedId)
    onReorder(draggedPage.parent_id, newIds)
    setDraggedId(null)
    setDropInfo(null)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <span className="text-sm font-semibold text-slate-800">페이지 순서 편집</span>
            <p className="text-[11px] text-slate-400 mt-0.5">드래그로 순서 변경 · ◀▶ 로 계층 변경</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Page list */}
        <ul className="overflow-y-auto max-h-[60vh] py-2" onDragOver={(e) => e.preventDefault()}>
          {flat.map(({ page, depth }) => {
            const siblings = getSortedSiblings(page.parent_id)
            const idx = siblings.findIndex(p => p.id === page.id)
            const isDragging = draggedId === page.id
            const isSameLevelTarget =
              dropInfo?.targetId === page.id &&
              draggedPage?.parent_id === page.parent_id &&
              draggedId !== page.id

            return (
              <li key={page.id} className="relative">
                {isSameLevelTarget && dropInfo?.before && (
                  <div className="absolute top-0 inset-x-3 h-0.5 bg-blue-400 rounded-full z-10 pointer-events-none" />
                )}
                <div
                  draggable
                  onDragStart={(e) => { setDraggedId(page.id); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => { setDraggedId(null); setDropInfo(null) }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (draggedId === page.id || draggedPage?.parent_id !== page.parent_id) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDropInfo({ targetId: page.id, before: e.clientY < rect.top + rect.height / 2 })
                  }}
                  onDrop={(e) => { e.preventDefault(); if (dropInfo) handleDrop(dropInfo.targetId, dropInfo.before) }}
                  className={`flex items-center gap-1.5 py-1.5 pr-2 transition-colors select-none ${
                    isDragging ? 'opacity-30' : 'hover:bg-slate-50'
                  }`}
                  style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                >
                  <GripVertical size={12} className="shrink-0 text-slate-300 cursor-grab active:cursor-grabbing" />
                  {depth > 0 && <span className="shrink-0 w-2.5 h-px bg-slate-200 inline-block" />}
                  <FileText size={12} className="shrink-0 text-slate-300" />
                  <span className="flex-1 text-[13px] text-slate-700 truncate min-w-0">
                    {page.title || '제목 없음'}
                  </span>
                  <div className="flex items-center gap-0 shrink-0">
                    <button
                      onClick={() => {
                        const parent = pages.find(p => p.id === page.parent_id)
                        onChangeParent(page.id, parent?.parent_id ?? null, parent?.id)
                      }}
                      disabled={page.parent_id === null}
                      title="상위 레벨로 내보내기"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (idx === 0) return
                        onChangeParent(page.id, siblings[idx - 1].id)
                      }}
                      disabled={idx === 0}
                      title="이전 페이지 하위로 들여쓰기"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
                {isSameLevelTarget && !dropInfo?.before && (
                  <div className="absolute bottom-0 inset-x-3 h-0.5 bg-blue-400 rounded-full z-10 pointer-events-none" />
                )}
              </li>
            )
          })}
          {flat.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-slate-400">페이지가 없어요</li>
          )}
        </ul>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            완료
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── PageItem ─────────────────────────────────────────────────────────────────
function PageItem({
  page, allPages, depth, pathname, onNavigate, onCreateChild, onDelete,
  onMoveUp, onMoveDown, collapsedIds, onToggleCollapsed,
}: {
  page: Page; allPages: Page[]; depth: number; pathname: string
  onNavigate: (id: string) => void
  onCreateChild: (parentId: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
  onMoveUp: (id: string, parentId: string | null) => void
  onMoveDown: (id: string, parentId: string | null) => void
  collapsedIds: Set<string>
  onToggleCollapsed: (id: string) => void
}) {
  const expanded = !collapsedIds.has(page.id)
  const children = sortSiblings(allPages.filter(p => p.parent_id === page.id))
  const isActive = pathname === `/dashboard/page/${page.id}`

  const fontSize = depth === 0
    ? 'text-[13px] font-semibold'
    : depth === 1
    ? 'text-[12px] font-normal'
    : 'text-[11.5px] font-normal'

  const rowCls = isActive
    ? 'bg-slate-900 text-white'
    : depth === 0
    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'

  return (
    <div className="relative">
      <div
        onClick={() => onNavigate(page.id)}
        className={`group flex items-center gap-1 py-1 mx-2 rounded-lg cursor-pointer transition-all pr-1 ${rowCls}`}
        style={{ paddingLeft: `${0.4 + depth * 1.1}rem` }}
      >
        {/* Expand / collapse */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapsed(page.id) }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors ${
            isActive ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-500'
          }`}
        >
          {children.length > 0
            ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)
            : <span className="w-3" />}
        </button>

        {/* File icon */}
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

        {/* Action buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(page.id, page.parent_id) }}
            className={`p-0.5 rounded transition-colors ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-600'}`}
            title="한 칸 위로"
          >
            <ChevronUp size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(page.id, page.parent_id) }}
            className={`p-0.5 rounded transition-colors ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-slate-600'}`}
            title="한 칸 아래로"
          >
            <ChevronDown size={11} />
          </button>
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

      {/* Children + tree line */}
      {expanded && children.length > 0 && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-1 w-px bg-slate-200 pointer-events-none"
            style={{ left: `${1.15 + depth * 1.1}rem` }}
          />
          {children.map(child => (
            <PageItem
              key={child.id} page={child} allPages={allPages} depth={depth + 1}
              pathname={pathname} onNavigate={onNavigate}
              onCreateChild={onCreateChild} onDelete={onDelete}
              onMoveUp={onMoveUp} onMoveDown={onMoveDown}
              collapsedIds={collapsedIds} onToggleCollapsed={onToggleCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ userName, isOpen, onClose }: {
  userName: string; isOpen: boolean; onClose: () => void
}) {
  const [pages, setPages] = useState<Page[]>([])
  const [trashedPages, setTrashedPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [trashOpen, setTrashOpen] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [orderModalOpen, setOrderModalOpen] = useState(false)

  const pagesRef = useRef<Page[]>([])
  pagesRef.current = pages

  const router = useRouter()
  const pathname = usePathname()
  const supabase = useRef(createClient())

  // ── Collapsed 상태 persist ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`page-collapsed-${userName}`)
      if (saved) setCollapsedIds(new Set(JSON.parse(saved)))
    } catch {}
  }, [userName])

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(`page-collapsed-${userName}`, JSON.stringify([...next]))
      return next
    })
  }, [userName])

  // ── 형제 그룹 정렬 조회 ───────────────────────────────────────────────────
  const getSortedGroup = useCallback((parentId: string | null, excludeId?: string): Page[] =>
    sortSiblings(pagesRef.current.filter(p => p.parent_id === parentId && p.id !== excludeId))
  , [])

  // ── sort_order 일괄 DB 업데이트 ───────────────────────────────────────────
  const updateSortOrders = useCallback(async (ids: string[]) => {
    await Promise.all(
      ids.map((id, idx) => supabase.current.from('pages').update({ sort_order: idx }).eq('id', id))
    )
    setPages(prev => prev.map(p => {
      const idx = ids.indexOf(p.id)
      return idx >= 0 ? { ...p, sort_order: idx } : p
    }))
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPages = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    await supabase.current.from('pages').delete()
      .eq('author_name', userName).not('deleted_at', 'is', null).lt('deleted_at', sevenDaysAgo)
    const { data } = await supabase.current.from('pages')
      .select('id, title, parent_id, created_at, deleted_at, sort_order')
      .eq('author_name', userName)
      .order('sort_order', { ascending: true, nullsFirst: false })
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

  // ── Reorder ───────────────────────────────────────────────────────────────
  const handleMoveUp = useCallback(async (id: string, parentId: string | null) => {
    const ids = getSortedGroup(parentId).map(p => p.id)
    const idx = ids.indexOf(id)
    if (idx <= 0) return
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    await updateSortOrders(ids)
  }, [getSortedGroup, updateSortOrders])

  const handleMoveDown = useCallback(async (id: string, parentId: string | null) => {
    const ids = getSortedGroup(parentId).map(p => p.id)
    const idx = ids.indexOf(id)
    if (idx < 0 || idx >= ids.length - 1) return
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    await updateSortOrders(ids)
  }, [getSortedGroup, updateSortOrders])

  const handleReorder = useCallback(async (_parentId: string | null, newIds: string[]) => {
    await updateSortOrders(newIds)
  }, [updateSortOrders])

  const handleChangeParent = useCallback(async (id: string, newParentId: string | null, insertAfterId?: string) => {
    const page = pagesRef.current.find(p => p.id === id)
    if (!page) return

    await supabase.current.from('pages').update({ parent_id: newParentId }).eq('id', id)
    setPages(prev => prev.map(p => p.id === id ? { ...p, parent_id: newParentId } : p))
    // pagesRef 즉시 반영 (이후 getSortedGroup 호출에 사용)
    pagesRef.current = pagesRef.current.map(p => p.id === id ? { ...p, parent_id: newParentId } : p)

    // 기존 부모 형제 재정렬
    const oldSiblings = getSortedGroup(page.parent_id, id)
    if (oldSiblings.length > 0) await updateSortOrders(oldSiblings.map(p => p.id))

    // 새 부모 형제 재정렬
    const newSiblings = getSortedGroup(newParentId, id)
    const newIds = newSiblings.map(p => p.id)
    if (insertAfterId) {
      const insertIdx = newIds.indexOf(insertAfterId)
      newIds.splice(insertIdx >= 0 ? insertIdx + 1 : newIds.length, 0, id)
    } else {
      newIds.push(id)
    }
    await updateSortOrders(newIds)
  }, [getSortedGroup, updateSortOrders])

  // ── Page CRUD ─────────────────────────────────────────────────────────────
  const navigate = (id: string) => { router.push(`/dashboard/page/${id}`); onClose() }

  const createPage = async (parentId: string | null = null) => {
    const sort_order = getSortedGroup(parentId).length
    const { data, error } = await supabase.current.from('pages')
      .insert({ title: '제목 없음', content: '', author_name: userName, parent_id: parentId, sort_order })
      .select().single()
    if (error) { alert('오류: ' + error.message); return }
    if (data) {
      await fetchPages()
      router.push(`/dashboard/page/${data.id}`)
    }
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

  const emptyTrash = async () => {
    if (trashedPages.length === 0) return
    if (!confirm(`휴지통의 페이지 ${trashedPages.length}개를 모두 영구 삭제할까요?`)) return
    await supabase.current.from('pages').delete().eq('author_name', userName).not('deleted_at', 'is', null)
    setTrashedPages([])
  }

  // ── Sorted lists ──────────────────────────────────────────────────────────
  const sortedPages = [...pages].sort((a, b) => {
    if (a.parent_id !== b.parent_id) return 0
    const ao = a.sort_order ?? Infinity
    const bo = b.sort_order ?? Infinity
    if (ao !== bo) return ao - bo
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
  const topLevelPages = sortedPages.filter(p => p.parent_id === null)

  // ── Render ────────────────────────────────────────────────────────────────
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

        {/* 검색바 */}
        <div className="px-3 mb-2 mt-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-search'))}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-slate-400"
          >
            <Search size={12} className="shrink-0" />
            <span className="text-[12px] flex-1 text-left">검색...</span>
            <kbd className="text-[10px] font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-300">Ctrl K</kbd>
          </button>
        </div>

        <div className="px-4 mb-1 mt-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">페이지</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setOrderModalOpen(true)}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md p-1 transition-colors"
              title="순서 편집"
            >
              <ArrowUpDown size={13} />
            </button>
            <button
              onClick={() => createPage(null)}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md p-1 transition-colors"
              title="새 페이지"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-2 text-xs text-slate-400">불러오는 중...</div>
        ) : topLevelPages.length === 0 ? (
          <div className="px-4 py-3 text-xs text-slate-400">
            <p>페이지가 없어요</p>
            <button onClick={() => createPage(null)} className="mt-1 text-slate-600 hover:text-slate-900 underline underline-offset-2">새 페이지 만들기</button>
          </div>
        ) : (
          <div>
            {topLevelPages.map(page => (
              <PageItem
                key={page.id} page={page} allPages={sortedPages} depth={0}
                pathname={pathname} onNavigate={navigate}
                onCreateChild={(parentId) => createPage(parentId)}
                onDelete={deletePage}
                onMoveUp={handleMoveUp} onMoveDown={handleMoveDown}
                collapsedIds={collapsedIds} onToggleCollapsed={toggleCollapsed}
              />
            ))}
          </div>
        )}

        {/* Trash */}
        <div className="mt-4 px-2 border-t border-slate-100 pt-3">
          <div className="flex items-center w-full">
            <button
              onClick={() => setTrashOpen(o => !o)}
              className="flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Trash2 size={13} />
              <span className="text-[13px] font-medium flex-1 text-left">휴지통</span>
              {trashedPages.length > 0 && (
                <span className="text-[11px] bg-slate-100 text-slate-400 rounded-full px-1.5 py-0.5 font-medium">{trashedPages.length}</span>
              )}
              {trashOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {trashedPages.length > 0 && (
              <button
                onClick={emptyTrash}
                className="ml-1 px-2 py-1 text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="휴지통 비우기"
              >
                비우기
              </button>
            )}
          </div>

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

      {orderModalOpen && (
        <OrderModal
          pages={sortedPages}
          onReorder={handleReorder}
          onChangeParent={handleChangeParent}
          onClose={() => setOrderModalOpen(false)}
        />
      )}

      <SearchBar userName={userName} />
    </aside>
  )
}
