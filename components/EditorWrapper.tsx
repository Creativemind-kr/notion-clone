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
import Details, { DetailsSummary, DetailsContent } from '@tiptap/extension-details'
import Youtube from '@tiptap/extension-youtube'
import { insertToggleBlock } from '@/lib/editor-toggle'
import { SlashCommands } from './SlashCommands'
import { createClient } from '@/lib/supabase/client'
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Code, Quote, Highlighter, Link2, Share2, Check, ChevronDown,
  ExternalLink, Copy, Pencil, Unlink, X, ZoomIn, Scissors, Clipboard, Globe,
} from 'lucide-react'
import 'tippy.js/dist/tippy.css'


interface Page { id: string; title: string; content: string }

interface OgPreview {
  title?: string | null
  description?: string | null
  image?: string | null
  favicon?: string | null
  url: string
}

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

function extractYoutubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    url.match(/embed\/([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

function extractLinks(doc: Record<string, unknown>): { links: string[]; youtubeUrls: string[] } {
  const links: string[] = []
  const youtubeUrls: string[] = []
  function traverse(node: Record<string, unknown>) {
    if (node.type === 'youtube') {
      const src = (node.attrs as Record<string, unknown>)?.src as string | undefined
      if (src) youtubeUrls.push(src)
      return
    }
    const marks = node.marks as Array<{ type: string; attrs?: { href?: string } }> | undefined
    if (marks) {
      for (const mark of marks) {
        if (mark.type === 'link' && mark.attrs?.href) links.push(mark.attrs.href)
      }
    }
    const content = node.content as Array<Record<string, unknown>> | undefined
    if (content) for (const child of content) traverse(child)
  }
  traverse(doc)
  return { links: [...new Set(links)], youtubeUrls: [...new Set(youtubeUrls)] }
}

export default function EditorWrapper({ page }: { page: Page }) {
  const [title, setTitle] = useState(page.title)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [saveError, setSaveError] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; anchor: number } | null>(null)
  const [linkPopup, setLinkPopup] = useState<{ href: string; x: number; y: number } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [imageModal, setImageModal] = useState<{ src: string; scale: number } | null>(null)
  const [imgCtxMenu, setImgCtxMenu] = useState<{ x: number; y: number; src: string } | null>(null)
  const [imgCopied, setImgCopied] = useState(false)
  const [docLinks, setDocLinks] = useState<string[]>([])
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>([])
  const [linkPreviews, setLinkPreviews] = useState<Record<string, OgPreview>>({})
  const fetchedUrls = useRef<Set<string>>(new Set())
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

  useEffect(() => { titleRef.current = title }, [title])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCtxMenu(null); setImgCtxMenu(null); setImageModal(null) }
    }
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
      Youtube.configure({ width: 640, height: 360, addPasteHandler: true }),
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

  useEffect(() => {
    if (!editor) return undefined
    const handler = () => {
      const href = editor.getAttributes('link').href
      if (href && editor.state.selection.empty) {
        const { from } = editor.state.selection
        const coords = editor.view.coordsAtPos(from)
        setLinkPopup({
          href,
          x: Math.min(coords.left, window.innerWidth - 320),
          y: coords.bottom + 6,
        })
      } else {
        setLinkPopup(null)
      }
    }
    editor.on('selectionUpdate', handler)
    return () => { editor.off('selectionUpdate', handler) }
  }, [editor])

  // 링크 추출 + OG 미리보기 패치
  useEffect(() => {
    if (!editor) return undefined
    const syncLinks = () => {
      const { links, youtubeUrls } = extractLinks(editor.getJSON() as Record<string, unknown>)
      setDocLinks(links)
      setYoutubeLinks(youtubeUrls)

      // YouTube: API 호출 없이 직접 썸네일 구성
      youtubeUrls.forEach((url) => {
        if (fetchedUrls.current.has(url)) return
        fetchedUrls.current.add(url)
        const videoId = extractYoutubeId(url)
        if (videoId) {
          const preview: OgPreview = {
            title: 'YouTube 영상',
            description: null,
            image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            favicon: 'https://www.youtube.com/favicon.ico',
            url,
          }
          if (isMounted.current) setLinkPreviews(prev => ({ ...prev, [url]: preview }))
        }
      })

      // 일반 링크: og-preview API 호출
      links.forEach(async (url) => {
        if (fetchedUrls.current.has(url)) return
        fetchedUrls.current.add(url)
        try {
          const res = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
          const data: OgPreview = res.ok ? await res.json() : { url }
          if (isMounted.current) setLinkPreviews(prev => ({ ...prev, [url]: data }))
        } catch {
          if (isMounted.current) setLinkPreviews(prev => ({ ...prev, [url]: { url } }))
        }
      })
    }
    editor.on('update', syncLinks)
    syncLinks()
    return () => { editor.off('update', syncLinks) }
  }, [editor])

  const setLink = () => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = prompt('링크 URL:', prev)
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const copyImageToClipboard = async (src: string) => {
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
    } catch {
      // data URL fallback: 주소 복사
      await navigator.clipboard.writeText(src)
    }
    setImgCopied(true)
    setTimeout(() => setImgCopied(false), 2000)
  }

  const deleteImageFromEditor = (src: string) => {
    if (!editor) return
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && node.attrs.src === src) {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
        return false
      }
    })
  }

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG') {
      setImageModal({ src: (target as HTMLImageElement).src, scale: 1 })
      return
    }
    setShowColorPicker(false)
    setCtxMenu(null)
    setImgCtxMenu(null)
  }

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG') {
      e.preventDefault()
      setImgCtxMenu({
        x: Math.min(e.clientX, window.innerWidth - 220),
        y: Math.min(e.clientY, window.innerHeight - 200),
        src: (target as HTMLImageElement).src,
      })
      return
    }
    if (!editor || editor.state.selection.empty) return
    e.preventDefault()
    const x = Math.min(e.clientX, window.innerWidth - 240)
    const y = Math.min(e.clientY, window.innerHeight - 320)
    setCtxMenu({ x, y, anchor: editor.state.selection.anchor })
  }

  const currentColor = editor?.getAttributes('textStyle')?.color || '#1a1a1a'

  if (!editor) return null

  const previewLinks = [...youtubeLinks, ...docLinks]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 상단 툴바 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-3 py-1.5 flex items-center gap-0.5 flex-wrap">

        {/* 글꼴 */}
        <select
          onFocus={saveSelection}
          onChange={(e) => applyWithSelection(() => editor.chain().focus().setFontFamily(e.target.value).run())}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-500 bg-white cursor-pointer mr-1 hover:border-slate-300 focus:outline-none focus:border-slate-400 transition-colors"
          title="글꼴"
        >
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* 글자 크기 */}
        <select
          onFocus={saveSelection}
          onChange={(e) => applyWithSelection(() => editor.chain().focus().setFontSize(e.target.value).run())}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-500 bg-white cursor-pointer mr-1 hover:border-slate-300 focus:outline-none focus:border-slate-400 transition-colors"
          title="글자 크기"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s.replace('px', '')}</option>)}
        </select>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* 서식 */}
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }} title="굵게" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Bold size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }} title="기울임" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Italic size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }} title="밑줄" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('underline') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><UnderlineIcon size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }} title="취소선" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('strike') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Strikethrough size={13} /></button>

        {/* 글자 색상 */}
        <div className="relative ml-0.5">
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker) }}
            title="글자 색상"
            className="p-1.5 rounded-lg hover:bg-slate-100 flex flex-col items-center gap-0.5"
          >
            <span className="text-xs font-bold" style={{ color: currentColor }}>A</span>
            <div className="w-3.5 h-0.5 rounded-full" style={{ backgroundColor: currentColor }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 z-50 flex flex-wrap gap-1.5 w-36">
              {COLORS.map(color => (
                <button
                  key={color}
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(color).run(); setShowColorPicker(false) }}
                  className="w-6 h-6 rounded-lg border border-slate-200 hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColorPicker(false) }}
                className="w-full text-xs text-slate-400 hover:text-slate-600 mt-0.5"
              >기본색</button>
            </div>
          )}
        </div>

        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: '#FFF176' }).run() }} title="형광펜" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('highlight') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Highlighter size={13} /></button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* 제목 */}
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run() }} title="제목1" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Heading1 size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }} title="제목2" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Heading2 size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }} title="제목3" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Heading3 size={13} /></button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* 목록 */}
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }} title="글머리 목록" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><List size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }} title="번호 목록" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><ListOrdered size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleTaskList().run() }} title="체크리스트" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('taskList') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><ListChecks size={13} /></button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run() }} title="코드 블록" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('codeBlock') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Code size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }} title="인용구" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('blockquote') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Quote size={13} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); setLink() }} title="링크" className={`p-1.5 rounded-lg transition-colors ${editor.isActive('link') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}><Link2 size={13} /></button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <button
          onMouseDown={(e) => {
            e.preventDefault()
            insertToggleBlock(editor)
          }}
          title="접기 블록"
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${editor.isActive('details') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
        >
          <ChevronDown size={13} />
          <span className="text-xs font-medium">접기</span>
        </button>

        <div className="flex-1" />
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors text-slate-500"
          title="페이지 링크 복사"
        >
          {copied ? <><Check size={11} className="text-green-500" /> 복사됨</> : <><Share2 size={11} /> 공유</>}
        </button>
        <span className={`text-xs ml-2 min-w-[48px] text-right ${saveError ? 'text-red-400' : 'text-slate-300'}`}>
          {saving ? '저장 중...' : saveError ? '저장 실패' : saved ? '저장됨' : ''}
        </span>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 min-h-0">
        {/* 에디터 */}
        <div
          className="flex-1 overflow-y-auto"
          onClick={handleEditorClick}
          onContextMenu={handleEditorContextMenu}
        >
          <div className="max-w-3xl mx-auto px-8 py-12">
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
              className="w-full text-[2.5rem] font-bold text-slate-900 outline-none placeholder-slate-200 mb-8 bg-transparent leading-tight tracking-tight"
            />
            <EditorContent editor={editor} className="tiptap" />
          </div>
        </div>

        {/* 링크 미리보기 우측 패널 */}
        {previewLinks.length > 0 && (
          <div className="w-64 shrink-0 border-l border-slate-100 overflow-y-auto bg-slate-50/50">
            <div className="p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">링크</p>
              <div className="space-y-2">
                {previewLinks.map((url) => {
                  const p = linkPreviews[url]
                  if (!p) return (
                    <div key={url} className="bg-white border border-slate-100 rounded-xl p-2.5 animate-pulse">
                      <div className="h-3 bg-slate-100 rounded w-3/4 mb-1.5" />
                      <div className="h-2.5 bg-slate-100 rounded w-full" />
                    </div>
                  )
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all group"
                    >
                      {p.image && (
                        <div className="w-full h-28 bg-slate-100 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      )}
                      <div className="p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          {p.favicon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.favicon} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <Globe size={11} className="text-slate-300 shrink-0" />
                          )}
                          <span className="text-[10px] text-slate-400 truncate">
                            {(() => { try { return new URL(url).hostname } catch { return url } })()}
                          </span>
                        </div>
                        {p.title && (
                          <p className="text-[12px] font-semibold text-slate-800 leading-tight line-clamp-2 mb-0.5">{p.title}</p>
                        )}
                        {p.description && (
                          <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">{p.description}</p>
                        )}
                        {!p.title && !p.description && (
                          <p className="text-[11px] text-slate-400 truncate">{url}</p>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이미지 확대 모달 */}
      {imageModal && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setImageModal(null)}
          onWheel={(e) => {
            e.preventDefault()
            setImageModal(prev => prev
              ? { ...prev, scale: Math.max(0.2, Math.min(10, prev.scale * (e.deltaY > 0 ? 0.92 : 1.08))) }
              : null
            )
          }}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            onClick={() => setImageModal(null)}
          >
            <X size={20} />
          </button>
          {imageModal.scale !== 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="text-white/60 text-xs bg-black/40 px-2 py-1 rounded-lg">
                {Math.round(imageModal.scale * 100)}%
              </span>
              <button
                className="text-white/60 hover:text-white text-xs bg-black/40 px-2 py-1 rounded-lg"
                onClick={(e) => { e.stopPropagation(); setImageModal(prev => prev ? { ...prev, scale: 1 } : null) }}
              >
                초기화
              </button>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageModal.src}
            alt=""
            style={{ transform: `scale(${imageModal.scale})`, transformOrigin: 'center' }}
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* 이미지 우클릭 컨텍스트 메뉴 */}
      {imgCtxMenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl w-48 py-1.5 text-sm"
          style={{ left: imgCtxMenu.x, top: imgCtxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setImageModal({ src: imgCtxMenu.src, scale: 1 }); setImgCtxMenu(null) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <ZoomIn size={13} className="text-gray-400" />
            이미지 확대
          </button>
          <button
            onClick={async () => {
              await copyImageToClipboard(imgCtxMenu.src)
              setImgCtxMenu(null)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Copy size={13} className="text-gray-400" />
            {imgCopied ? '복사됨!' : '이미지 복사'}
          </button>
          <button
            onClick={async () => {
              await copyImageToClipboard(imgCtxMenu.src)
              deleteImageFromEditor(imgCtxMenu.src)
              setImgCtxMenu(null)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Scissors size={13} className="text-gray-400" />
            잘라내기
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(imgCtxMenu.src)
              setImgCtxMenu(null)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Link2 size={13} className="text-gray-400" />
            URL 복사
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => {
              const pasteArea = document.activeElement as HTMLElement
              if (pasteArea) pasteArea.focus()
              document.execCommand('paste')
              setImgCtxMenu(null)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Clipboard size={13} className="text-gray-400" />
            붙여넣기
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { deleteImageFromEditor(imgCtxMenu.src); setImgCtxMenu(null) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 transition-colors text-left"
          >
            <X size={13} />
            이미지 삭제
          </button>
        </div>,
        document.body
      )}

      {/* 텍스트 우클릭 컨텍스트 메뉴 */}
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
                insertToggleBlock(editor, ctxMenu?.anchor)
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

      {/* 링크 팝업 */}
      {linkPopup && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-2.5 flex flex-col gap-2 min-w-[240px] max-w-[320px]"
          style={{ left: linkPopup.x, top: linkPopup.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link2 size={11} />
            <span className="truncate flex-1 text-blue-500">{linkPopup.href}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.open(linkPopup.href, '_blank', 'noopener')}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 transition-colors"
            >
              <ExternalLink size={11} />
              미리보기
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(linkPopup.href)
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 2000)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 transition-colors"
            >
              {linkCopied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
              {linkCopied ? '복사됨' : '복사'}
            </button>
            <button
              onClick={() => { setLink(); setLinkPopup(null) }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 transition-colors"
            >
              <Pencil size={11} />
              편집
            </button>
            <button
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run()
                setLinkPopup(null)
              }}
              className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-red-50 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              <Unlink size={11} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
