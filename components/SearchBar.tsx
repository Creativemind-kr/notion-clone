'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, FileText, ChevronRight, X } from 'lucide-react'

interface Page {
  id: string
  title: string
  parent_id: string | null
  content: string
}

interface SearchResult {
  id: string
  title: string
  breadcrumb: string[]
  snippet: string
}

function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>
  if (n.type === 'text' && typeof n.text === 'string') return n.text
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractText).join(' ')
  }
  return ''
}

function getSnippet(content: string, query: string): string {
  let text = ''
  try {
    const parsed = JSON.parse(content)
    text = extractText(parsed).replace(/\s+/g, ' ').trim()
  } catch {
    text = content.replace(/\s+/g, ' ').trim()
  }
  if (!text) return ''
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, 80) + (text.length > 80 ? '…' : '')
  const start = Math.max(0, idx - 30)
  const end = Math.min(text.length, idx + query.length + 50)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

function buildBreadcrumb(pageId: string, allPages: Page[]): string[] {
  const crumbs: string[] = []
  let current = allPages.find(p => p.id === pageId)
  while (current?.parent_id) {
    const parent = allPages.find(p => p.id === current!.parent_id)
    if (!parent) break
    crumbs.unshift(parent.title || '제목 없음')
    current = parent
  }
  return crumbs
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

export default function SearchBar({ userName }: { userName: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [allPages, setAllPages] = useState<Page[]>([])
  const [mounted, setMounted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = useRef(createClient())
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  const loadAllPages = useCallback(async () => {
    if (allPages.length > 0) return
    const { data } = await supabase.current
      .from('pages')
      .select('id, title, parent_id, content')
      .eq('author_name', userName)
      .is('deleted_at', null)
    setAllPages(data || [])
  }, [userName, allPages.length])

  // Ctrl+K 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        loadAllPages()
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
        setResults([])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loadAllPages])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)

    const { data } = await supabase.current
      .from('pages')
      .select('id, title, parent_id, content')
      .eq('author_name', userName)
      .is('deleted_at', null)
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .limit(20)

    const pages = data || []
    const allPagesForCrumb = allPages.length > 0 ? allPages : pages

    const mapped: SearchResult[] = pages.map(p => ({
      id: p.id,
      title: p.title || '제목 없음',
      breadcrumb: buildBreadcrumb(p.id, allPagesForCrumb),
      snippet: getSnippet(p.content || '', q),
    }))

    setResults(mapped)
    setActiveIndex(0)
    setLoading(false)
  }, [userName, allPages])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => doSearch(q), 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      navigate(results[activeIndex].id)
    } else if (e.key === 'Escape') {
      close()
    }
  }

  const navigate = (id: string) => {
    router.push(`/dashboard/page/${id}`)
    close()
  }

  const close = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  const clear = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="페이지 검색..."
            className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none"
          />
          {query ? (
            <button onClick={clear} className="text-slate-300 hover:text-slate-500 transition-colors">
              <X size={14} />
            </button>
          ) : (
            <kbd className="text-[11px] text-slate-300 font-mono bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">ESC</kbd>
          )}
        </div>

        {/* 결과 */}
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">검색 중...</div>
        ) : !query ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">검색어를 입력하세요</div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400">
              <span className="font-medium text-slate-600">&ldquo;{query}&rdquo;</span> 에 대한 결과가 없어요
            </p>
          </div>
        ) : (
          <ul className="overflow-y-auto max-h-[50vh]">
            {results.map((result, i) => (
              <li key={result.id}>
                <button
                  onClick={() => navigate(result.id)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors border-b border-slate-50 last:border-0 ${
                    i === activeIndex ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 flex-wrap">
                    {result.breadcrumb.length > 0 && (
                      <>
                        <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                          {result.breadcrumb.map((crumb, ci) => (
                            <span key={ci} className="flex items-center gap-0.5">
                              {ci > 0 && <ChevronRight size={10} className="text-slate-300" />}
                              {crumb}
                            </span>
                          ))}
                        </span>
                        <ChevronRight size={10} className="text-slate-300" />
                      </>
                    )}
                    <span className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-400 shrink-0" />
                      <Highlight text={result.title} query={query} />
                    </span>
                  </div>
                  {result.snippet && (
                    <p className="text-[12px] text-slate-400 line-clamp-1 pl-4">
                      <Highlight text={result.snippet} query={query} />
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 하단 힌트 */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-300 bg-slate-50/50">
            <span>↑↓ 탐색</span>
            <span>Enter 이동</span>
            <span>ESC 닫기</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
