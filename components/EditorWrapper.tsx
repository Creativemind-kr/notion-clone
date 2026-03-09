'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
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
import Details from '@tiptap/extension-details'
import DetailsSummary from '@tiptap/extension-details-summary'
import DetailsContent from '@tiptap/extension-details-content'
import { SlashCommands } from './SlashCommands'
import { createClient } from '@/lib/supabase/client'
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Code, Quote, Highlighter, Link2, Share2, Check, ChevronDown,
} from 'lucide-react'
import 'tippy.js/dist/tippy.css'


interface Page { id: string; title: string; content: string }

const HIGHLIGHT_COLORS = [
  { label: '노랑', value: '#FFF176' },
  { label: '초록', value: '#B9F6CA' },
  { label: '파랑', value: '#B3E5FC' },
  { label: '분홍', value: '#FCE4EC' },
  { label: '주황', value: '#FFE0B2' },
]

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']
const FONTS = [
  { label: '기본 (Sans)', value: 'inherit' },
  { label: '명조 (Serif)', value: 'Georgia, serif' },
  { label: '고정폭 (Mono)', value: 'monospace' },
  { label: '나눔고딕', value: "'Nanum Gothic', sans-serif" },
]
const COLORS = [
  '#1a1a1a', '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#7048e8',
  '#c2255c', '#868e96', '#ced4da', '#ffffff',
]

export default function EditorWrapper({ page }: { page: Page }) {
  const [title, setTitle] = useState(page.title)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [saveError, setSaveError] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const isMounted = useRef(true)
  const titleRef = useRef(title)

  const copyLink = () => {
    const shareUrl = `${window.location.origin}/share/${page.id}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const supabase = useRef(createClient())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedSelection = useRef<{ from: number; to: number } | null>(null)

  useEffect(() => {
    titleRef.current = title
  }, [title])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const saveSelection = () => {
    if (editor) {
      savedSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }
    }
  }

  const applyWithSelection = (fn: () => void) => {
    if (editor && savedSelection.current) {
      const { from, to } = savedSelection.current
      editor.chain().setTextSelection({ from, to }).run()
    }
    fn()
  }

  const save = useCallback(async (newTitle: string, content: string) => {
    if (!isMounted.current) return
    setSaving(true)
    setSaveError(false)
    const { error } = await supabase.current.from('pages').update({ title: newTitle, content, updated_at: new Date().toISOString() }).eq('id', page.id)
    if (!isMounted.current) return
    setSaving(false)
    if (error) {
      setSaveError(true)
      setSaved(false)
    } else {
      setSaved(true)
    }
  }, [page.id])

  const scheduleSave = useCallback((newTitle: string, content: string) => {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(newTitle, content), 500)
  }, [save])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ strike: {} }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder: "'/'를 입력하면 명령어 메뉴가 열려요" }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      Details.configure({ persist: true }),
      DetailsSummary,
      DetailsContent,
      SlashCommands,
    ],
    content: (() => {
      try { return page.content ? JSON.parse(page.content) : '' } catch { return page.content || '' }
    })(),
    onUpdate: ({ editor }) => {
      scheduleSave(titleRef.current, JSON.stringify(editor.getJSON()))
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || [])
        const imageItem = items.find(item => item.type.startsWith('image/'))
        if (!imageItem) return false
        const file = imageItem.getAsFile()
        if (!file) return false
        const reader = new FileReader()
        reader.onload = (e) => {
          const src = e.target?.result as string
          const node = view.state.schema.nodes.image.create({ src })
          const tr = view.state.tr.replaceSelectionWith(node)
          view.dispatch(tr)
        }
        reader.readAsDataURL(file)
        return true
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    setTitle(page.title)
    if (editor) {
      try { editor.commands.setContent(JSON.parse(page.content)) }
      catch { editor.commands.setContent(page.content || '') }
    }
  }, [page.id, editor, page.title, page.content])

  const setLink = () => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = prompt('링크 URL:', prev)
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const currentColor = editor?.getAttributes('textStyle')?.color || '#1a1a1a'

  if (!editor) return null

  return (
    <div className="flex flex-col h-full">
      {/* 상단 툴바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-1.5 flex items-center gap-0.5 flex-wrap">

        {/* 글꼴 */}
        <select
          onFocus={saveSelection}
          onChange={(e) => applyWithSelection(() => editor.chain().focus().setFontFamily(e.target.value).run())}
          className="text-sm border border-gray-200 rounded px-1.5 py-1 text-gray-600 bg-white cursor-pointer mr-1"
          title="글꼴"
        >
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* 글자 크기 */}
        <select
          onFocus={saveSelection}
          onChange={(e) => applyWithSelection(() => editor.chain().focus().setFontSize(e.target.value).run())}
          className="text-sm border border-gray-200 rounded px-1.5 py-1 text-gray-600 bg-white cursor-pointer mr-1"
          title="글자 크기"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s.replace('px', '')}</option>)}
        </select>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 서식 */}
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }} title="굵게" className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Bold size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }} title="기울임" className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Italic size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }} title="밑줄" className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><UnderlineIcon size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }} title="취소선" className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Strikethrough size={14} /></button>

        {/* 글자 색상 */}
        <div className="relative ml-0.5">
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker) }}
            title="글자 색상"
            className="p-1.5 rounded hover:bg-gray-100 flex flex-col items-center gap-0.5"
          >
            <span className="text-xs font-bold text-gray-600" style={{ color: currentColor }}>A</span>
            <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: currentColor }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 flex flex-wrap gap-1 w-32">
              {COLORS.map(color => (
                <button
                  key={color}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    editor.chain().focus().setColor(color).run()
                    setShowColorPicker(false)
                  }}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColorPicker(false) }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 mt-1"
              >
                기본색
              </button>
            </div>
          )}
        </div>

        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: '#FFF176' }).run() }} title="형광펜" className={`p-1.5 rounded transition-colors ${editor.isActive('highlight') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Highlighter size={14} /></button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 제목 */}
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run() }} title="제목1" className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Heading1 size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }} title="제목2" className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Heading2 size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }} title="제목3" className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Heading3 size={14} /></button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 목록 */}
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }} title="글머리 목록" className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><List size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }} title="번호 목록" className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><ListOrdered size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleTaskList().run() }} title="체크리스트" className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><ListChecks size={14} /></button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run() }} title="코드 블록" className={`p-1.5 rounded transition-colors ${editor.isActive('codeBlock') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Code size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }} title="인용구" className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Quote size={14} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); setLink() }} title="링크" className={`p-1.5 rounded transition-colors ${editor.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}><Link2 size={14} /></button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        <button
          onMouseDown={(e) => {
            e.preventDefault()
            const { state, chain } = editor
            const { $from } = state.selection
            const depth = $from.depth
            const parentPos = $from.before(depth)
            const parentNode = $from.node(depth)
            const parentEnd = parentPos + parentNode.nodeSize
            const inlineContent = parentNode.content.toJSON() || []
            chain().focus().insertContentAt(
              { from: parentPos, to: parentEnd },
              {
                type: 'details',
                content: [
                  { type: 'detailsSummary', content: inlineContent.length > 0 ? inlineContent : undefined },
                  { type: 'detailsContent', content: [{ type: 'paragraph' }] },
                ],
              }
            ).run()
          }}
          title="접기 블록"
          className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${editor.isActive('details') ? 'bg-gray-200' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <ChevronDown size={14} />
          <span className="text-xs">접기</span>
        </button>

        <div className="flex-1" />
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          title="페이지 링크 복사"
        >
          {copied ? <><Check size={12} className="text-green-500" /> 복사됨</> : <><Share2 size={12} /> 공유</>}
        </button>
        <span className={`text-xs ml-2 ${saveError ? 'text-red-500' : 'text-gray-400'}`}>
          {saving ? '저장 중...' : saveError ? '저장 실패 (재시도 중...)' : saved ? '저장됨' : ''}
        </span>
      </div>

      {/* 에디터 */}
      <div
        className="flex-1 overflow-y-auto"
        onClick={() => { setShowColorPicker(false); setCtxMenu(null) }}
        onContextMenu={(e) => {
          if (!editor || editor.state.selection.empty) return
          e.preventDefault()
          const x = Math.min(e.clientX, window.innerWidth - 240)
          const y = Math.min(e.clientY, window.innerHeight - 320)
          setCtxMenu({ x, y })
        }}
      >
        <div className="max-w-3xl mx-auto px-8 py-10">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              const newTitle = e.target.value
              setTitle(newTitle)
              titleRef.current = newTitle
              scheduleSave(newTitle, JSON.stringify(editor.getJSON()))
              window.dispatchEvent(new CustomEvent('page-title-change', { detail: { id: page.id, title: newTitle } }))
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus() } }}
            placeholder="제목"
            className="w-full text-4xl font-bold text-gray-900 outline-none placeholder-gray-300 mb-6 bg-transparent"
          />
          <EditorContent editor={editor} className="tiptap" />
        </div>
      </div>

      {/* 우클릭 컨텍스트 메뉴 */}
      {ctxMenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl w-56 py-2 text-sm"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="px-3 pb-1 pt-0.5">
            <p className="text-xs text-gray-400 font-medium mb-1.5">헤더</p>
            <div className="flex gap-1">
              {([1, 2, 3] as const).map(level => (
                <button key={level} onClick={() => { editor.chain().focus().toggleHeading({ level }).run(); setCtxMenu(null) }}
                  className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${editor.isActive('heading', { level }) ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-100'}`}>
                  H{level}
                </button>
              ))}
              <button onClick={() => { editor.chain().focus().setParagraph().run(); setCtxMenu(null) }}
                className={`flex-1 py-1 rounded text-xs border transition-colors ${editor.isActive('paragraph') ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-100'}`}>
                T
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 my-1.5" />

          {/* 글씨체 */}
          <div className="px-3">
            <p className="text-xs text-gray-400 font-medium mb-1">글씨체</p>
            <select
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white"
              defaultValue=""
              onChange={(e) => { if (e.target.value) { editor.chain().focus().setFontFamily(e.target.value).run() } }}
            >
              <option value="inherit">기본 (Sans)</option>
              <option value="Georgia, serif">명조 (Serif)</option>
              <option value="monospace">고정폭 (Mono)</option>
              <option value="'Nanum Gothic', sans-serif">나눔고딕</option>
            </select>
          </div>

          <div className="border-t border-gray-100 my-1.5" />

          {/* 글자 크기 */}
          <div className="px-3">
            <p className="text-xs text-gray-400 font-medium mb-1">글자 크기</p>
            <div className="flex flex-wrap gap-1">
              {['12px','14px','16px','18px','20px','24px','28px','32px'].map(s => (
                <button key={s} onClick={() => { editor.chain().focus().setFontSize(s).run(); setCtxMenu(null) }}
                  className="px-1.5 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-100 transition-colors">
                  {s.replace('px', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 my-1.5" />

          {/* 글자 색상 */}
          <div className="px-3">
            <p className="text-xs text-gray-400 font-medium mb-1">글자 색상</p>
            <div className="flex gap-1 flex-wrap">
              {COLORS.map(color => (
                <button key={color} onClick={() => { editor.chain().focus().setColor(color).run(); setCtxMenu(null) }}
                  className="w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }} />
              ))}
              <button onClick={() => { editor.chain().focus().unsetColor().run(); setCtxMenu(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 ml-1">기본</button>
            </div>
          </div>

          <div className="border-t border-gray-100 my-1.5" />

          {/* 하이라이트 */}
          <div className="px-3">
            <p className="text-xs text-gray-400 font-medium mb-1">하이라이트</p>
            <div className="flex gap-1">
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.value} onClick={() => { editor.chain().focus().setHighlight({ color: c.value }).run(); setCtxMenu(null) }}
                  className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }} title={c.label} />
              ))}
              <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setCtxMenu(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 ml-1">제거</button>
            </div>
          </div>

          <div className="border-t border-gray-100 my-1.5" />

          {/* 접기 */}
          <div className="px-3">
            <button
              onClick={() => {
                const { state, chain } = editor
                const { $from } = state.selection
                const depth = $from.depth
                const parentPos = $from.before(depth)
                const parentNode = $from.node(depth)
                const parentEnd = parentPos + parentNode.nodeSize
                const inlineContent = parentNode.content.toJSON() || []
                chain().focus().insertContentAt(
                  { from: parentPos, to: parentEnd },
                  {
                    type: 'details',
                    content: [
                      { type: 'detailsSummary', content: inlineContent.length > 0 ? inlineContent : undefined },
                      { type: 'detailsContent', content: [{ type: 'paragraph' }] },
                    ],
                  }
                ).run()
                setCtxMenu(null)
              }}
              className="w-full flex items-center gap-2 py-1 text-sm text-gray-700 hover:text-gray-900"
            >
              <ChevronDown size={14} />
              접기 블록으로 감싸기
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
