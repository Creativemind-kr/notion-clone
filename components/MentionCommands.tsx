'use client'

import { Extension } from '@tiptap/core'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance } from 'tippy.js'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText } from 'lucide-react'

interface Page { id: string; title: string }

// 페이지 캐시 (items는 동기여야 하므로 미리 로드)
let cachedPages: Page[] = []
let cacheLoaded = false

async function loadPageCache() {
  if (cacheLoaded) return
  const userName = typeof window !== 'undefined' ? localStorage.getItem('workspace_user') : null
  if (!userName) return
  const supabase = createClient()
  const { data } = await supabase
    .from('pages')
    .select('id, title')
    .eq('author_name', userName)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)
  cachedPages = data || []
  cacheLoaded = true
}

interface MentionListProps {
  items: Page[]
  command: (item: Page) => void
}

export const MentionList = forwardRef<{ onKeyDown: (e: KeyboardEvent) => boolean }, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ key }: KeyboardEvent) => {
        if (key === 'ArrowUp') { setSelectedIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1)); return true }
        if (key === 'ArrowDown') { setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1)); return true }
        if (key === 'Enter') { if (items[selectedIndex]) command(items[selectedIndex]); return true }
        return false
      },
    }))

    useEffect(() => setSelectedIndex(0), [items])

    if (!items.length) return (
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 px-4 py-3 text-sm text-gray-400 w-64">
        일치하는 페이지가 없어요
      </div>
    )

    return (
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-64 max-h-72 overflow-y-auto">
        <div className="px-3 py-2 border-b border-gray-100">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">페이지 링크</span>
        </div>
        <div className="p-1">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => command(item)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <FileText size={14} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-800 truncate">{item.title || '제목 없음'}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'

export const MentionCommands = Extension.create({
  name: 'mentionCommands',
  addOptions() {
    return { suggestion: {} as Partial<SuggestionOptions> }
  },
  addProseMirrorPlugins() {
    // 에디터 로드 시 캐시 미리 준비
    if (typeof window !== 'undefined') loadPageCache()

    return [
      Suggestion({
        editor: this.editor,
        char: '@',
        command: ({ editor, range, props }) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          const href = `${origin}/dashboard/page/${(props as Page).id}`
          const label = (props as Page).title || '제목 없음'
          editor.chain().focus().deleteRange(range).insertContent(`<a href="${href}">${label}</a>`).run()
        },
        // items는 반드시 동기 함수여야 함
        items: ({ query }: { query: string }) => {
          if (!query) return cachedPages.slice(0, 20)
          return cachedPages.filter(p =>
            (p.title || '').toLowerCase().includes(query.toLowerCase())
          ).slice(0, 20)
        },
        render: () => {
          let component: ReactRenderer
          let popup: Instance[]

          return {
            onStart: (props) => {
              // @ 입력 시 캐시 갱신
              cacheLoaded = false
              loadPageCache()

              component = new ReactRenderer(MentionList, { props, editor: props.editor })
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },
            onUpdate: (props) => {
              component.updateProps(props)
              popup[0].setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') { popup[0].hide(); return true }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (component.ref as any)?.onKeyDown(props.event) ?? false
            },
            onExit: () => {
              popup[0].destroy()
              component.destroy()
            },
          }
        },
      }),
    ]
  },
})
