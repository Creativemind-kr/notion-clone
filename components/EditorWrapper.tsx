'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { createClient } from '@/lib/supabase/client'
import { Bold, Italic, UnderlineIcon, Heading1, Heading2, Heading3, List, ListOrdered, Code, Quote } from 'lucide-react'

interface Page {
  id: string
  title: string
  content: string
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

export default function EditorWrapper({ page }: { page: Page }) {
  const [title, setTitle] = useState(page.title)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const supabase = createClient()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (newTitle: string, content: string) => {
    setSaving(true)
    await supabase
      .from('pages')
      .update({ title: newTitle, content, updated_at: new Date().toISOString() })
      .eq('id', page.id)
    setSaving(false)
    setSaved(true)
  }, [supabase, page.id])

  const scheduleSave = useCallback((newTitle: string, content: string) => {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(newTitle, content), 1000)
  }, [save])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: '내용을 입력하세요...' }),
    ],
    content: page.content || '',
    onUpdate: ({ editor }) => {
      scheduleSave(title, JSON.stringify(editor.getJSON()))
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    setTitle(page.title)
    if (editor && page.content) {
      try {
        editor.commands.setContent(JSON.parse(page.content))
      } catch {
        editor.commands.setContent(page.content)
      }
    } else if (editor) {
      editor.commands.setContent('')
    }
  }, [page.id, editor, page.title, page.content])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    const content = editor ? JSON.stringify(editor.getJSON()) : ''
    scheduleSave(newTitle, content)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      editor?.commands.focus()
    }
  }

  if (!editor) return null

  return (
    <div className="flex flex-col h-full">
      {/* 툴바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-2 flex items-center gap-1 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게 (Ctrl+B)">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임 (Ctrl+I)">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄 (Ctrl+U)">
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="제목 1">
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="제목 2">
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="제목 3">
          <Heading3 size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 기호 목록">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          <ListOrdered size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="코드 블록">
          <Code size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용구">
          <Quote size={15} />
        </ToolbarButton>

        <div className="flex-1" />
        <span className="text-xs text-gray-400">
          {saving ? '저장 중...' : saved ? '저장됨' : ''}
        </span>
      </div>

      {/* 에디터 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="제목"
            className="w-full text-4xl font-bold text-gray-900 outline-none placeholder-gray-300 mb-6 bg-transparent"
          />
          <EditorContent editor={editor} className="tiptap" />
        </div>
      </div>
    </div>
  )
}
