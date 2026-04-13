'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style'
import Details, { DetailsSummary, DetailsContent } from '@tiptap/extension-details'
import Youtube from '@tiptap/extension-youtube'
import { createClient } from '@/lib/supabase/client'
import { FileText, ChevronRight } from 'lucide-react'

interface Page { id: string; title: string; content: string; author_name: string; parent_id: string | null }
interface Comment { id: string; author_name: string; content: string; created_at: string }

export default function SharePageClient({ id }: { id: string }) {
  const router = useRouter()
  const [page, setPage] = useState<Page | null>(null)
  const [children, setChildren] = useState<Page[]>([])
  const [breadcrumb, setBreadcrumb] = useState<Page[]>([])
  const [notFound, setNotFound] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const supabaseRef = useRef(supabase)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('pages').select('*').eq('id', id).single()
      if (!data) { setNotFound(true); return }
      setPage(data)

      // 브라우저 탭 제목을 문서 제목으로
      if (data.title) document.title = data.title

      // 하위 페이지
      const { data: childData } = await supabase
        .from('pages')
        .select('id, title, content, author_name, parent_id')
        .eq('parent_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      setChildren(childData || [])

      // 브레드크럼
      const crumbs: Page[] = []
      let current = data as Page
      while (current.parent_id) {
        const { data: parent } = await supabase
          .from('pages').select('*').eq('id', current.parent_id).single()
        if (!parent) break
        crumbs.unshift(parent)
        current = parent
      }
      setBreadcrumb(crumbs)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabaseRef.current
        .from('comments')
        .select('*')
        .eq('page_id', id)
        .order('created_at', { ascending: true })
      setComments(data || [])
    }
    fetchComments()
  }, [id])

  const submitComment = async () => {
    if (!commentAuthor.trim() || !commentText.trim()) return
    setSubmitting(true)
    const { data } = await supabaseRef.current
      .from('comments')
      .insert({ page_id: id, author_name: commentAuthor.trim(), content: commentText.trim() })
      .select()
      .single()
    if (data) {
      setComments(prev => [...prev, data])
      setCommentText('')
    }
    setSubmitting(false)
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ strike: {} }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Details.configure({ persist: true }),
      DetailsSummary,
      DetailsContent,
      Youtube.configure({ width: 640, height: 360 }),
    ],
    content: '',
    editable: false,
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && page?.content) {
      try { editor.commands.setContent(JSON.parse(page.content)) }
      catch { editor.commands.setContent(page.content) }
    }
  }, [editor, page])

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      페이지를 찾을 수 없어요.
    </div>
  )

  if (!page) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      불러오는 중...
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
          <span>📝</span>
          {breadcrumb.map(crumb => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <button
                onClick={() => router.push(`/share/${crumb.id}`)}
                className="hover:text-gray-700 transition-colors"
              >
                {crumb.title || '제목 없음'}
              </button>
              <ChevronRight size={12} />
            </span>
          ))}
          <span className="text-gray-700 font-medium">{page.title || '제목 없음'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">읽기 전용</span>
          <a
            href="/login"
            className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            로그인
          </a>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">{page.title || '제목 없음'}</h1>
        {page.author_name && (
          <p className="text-sm text-gray-400 mb-8">작성자: {page.author_name}</p>
        )}
        <EditorContent editor={editor} className="tiptap" />

        {/* 하위 페이지 목록 */}
        {children.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">하위 페이지</p>
            <div className="grid gap-2">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/share/${child.id}`)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-left group"
                >
                  <FileText size={14} className="text-gray-300 shrink-0 group-hover:text-gray-500 transition-colors" />
                  <span className="text-[14px] text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                    {child.title || '제목 없음'}
                  </span>
                  <ChevronRight size={13} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 댓글 */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            댓글 {comments.length > 0 ? `(${comments.length})` : ''}
          </p>

          {/* 댓글 목록 */}
          {comments.length > 0 && (
            <div className="space-y-4 mb-6">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0">
                    {c.author_name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{c.author_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 댓글 작성 폼 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <input
              type="text"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              placeholder="이름"
              maxLength={30}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white transition-colors"
            />
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 남겨보세요..."
              rows={3}
              maxLength={500}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white resize-none transition-colors"
            />
            <div className="flex justify-end">
              <button
                onClick={submitComment}
                disabled={submitting || !commentAuthor.trim() || !commentText.trim()}
                className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '등록 중...' : '댓글 등록'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
