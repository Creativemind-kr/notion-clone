import { Extension } from '@tiptap/core'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance } from 'tippy.js'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Editor } from '@tiptap/core'
import { createClient } from '@/lib/supabase/client'

const commands = [
  { title: '텍스트', desc: '일반 텍스트', icon: '¶', action: (editor: Editor) => editor.chain().focus().setParagraph().run() },
  { title: '제목 1', desc: '큰 제목', icon: 'H1', action: (editor: Editor) => editor.chain().focus().setHeading({ level: 1 }).run() },
  { title: '제목 2', desc: '중간 제목', icon: 'H2', action: (editor: Editor) => editor.chain().focus().setHeading({ level: 2 }).run() },
  { title: '제목 3', desc: '작은 제목', icon: 'H3', action: (editor: Editor) => editor.chain().focus().setHeading({ level: 3 }).run() },
  { title: '글머리 목록', desc: '• 항목 목록', icon: '•', action: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { title: '번호 목록', desc: '1. 번호 목록', icon: '1.', action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
  { title: '체크리스트', desc: '할 일 목록', icon: '☑', action: (editor: Editor) => editor.chain().focus().toggleTaskList().run() },
  { title: '인용구', desc: '인용 블록', icon: '"', action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
  { title: '코드 블록', desc: '코드 블록', icon: '<>', action: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run() },
  { title: '구분선', desc: '수평선', icon: '—', action: (editor: Editor) => editor.chain().focus().setHorizontalRule().run() },
  { title: '표', desc: '3x3 표 삽입', icon: '⊞', action: (editor: Editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: '접기', desc: '접을 수 있는 블록', icon: '▶', action: (editor: Editor) => {
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
        attrs: { open: true },
        content: [
          { type: 'detailsSummary', content: inlineContent.length > 0 ? inlineContent : undefined },
          { type: 'detailsContent', content: [{ type: 'paragraph' }] },
        ],
      }
    ).run()
  }},
  { title: '이미지', desc: 'URL로 이미지 삽입', icon: '🖼', action: (editor: Editor) => {
    const url = prompt('이미지 URL을 입력하세요:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }},
  { title: '캘린더 (주차별)', desc: '이번 주 남은 일정', icon: '📅', action: async (editor: Editor) => {
    const userName = localStorage.getItem('workspace_user')
    if (!userName) return

    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 이번 주 일요일~토요일 범위
    const dayOfWeek = today.getDay()
    const sunday = new Date(today); sunday.setDate(today.getDate() - dayOfWeek)
    const saturday = new Date(today); saturday.setDate(today.getDate() + (6 - dayOfWeek))

    const todayStr = today.toISOString().slice(0, 10)
    const satStr = saturday.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('author_name', userName)
      .gte('date', todayStr)
      .lte('date', satStr)
      .order('date')
      .order('time')

    const weekLabel = `${sunday.getMonth() + 1}/${sunday.getDate()} ~ ${saturday.getMonth() + 1}/${saturday.getDate()}`

    if (!data || data.length === 0) {
      editor.chain().focus().insertContent(`<p>📅 이번 주 (${weekLabel}) 남은 일정이 없어요.</p>`).run()
      return
    }

    const rows = data.map(e => {
      const time = e.time ? ` ${e.time}` : ''
      const desc = e.description ? ` — ${e.description}` : ''
      return `<li><strong>${e.date}${time}</strong> ${e.title}${desc}</li>`
    }).join('')

    editor.chain().focus().insertContent(
      `<p><strong>📅 이번 주 일정 (${weekLabel})</strong></p><ul>${rows}</ul>`
    ).run()
  }},
  { title: '캘린더 (이번달)', desc: '이번 달 남은 일정 전체', icon: '🗓️', action: async (editor: Editor) => {
    const userName = localStorage.getItem('workspace_user')
    if (!userName) return

    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayStr = today.toISOString().slice(0, 10)
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const to = nextMonth.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('author_name', userName)
      .gte('date', todayStr)
      .lt('date', to)
      .order('date')
      .order('time')

    if (!data || data.length === 0) {
      editor.chain().focus().insertContent(`<p>🗓️ 이번 달 남은 일정이 없어요.</p>`).run()
      return
    }

    // 주차별로 그룹핑
    const weeks: Record<string, typeof data> = {}
    data.forEach(e => {
      const d = new Date(e.date)
      const sun = new Date(d); sun.setDate(d.getDate() - d.getDay())
      const sat = new Date(d); sat.setDate(d.getDate() + (6 - d.getDay()))
      const key = `${sun.getMonth() + 1}/${sun.getDate()} ~ ${sat.getMonth() + 1}/${sat.getDate()}`
      if (!weeks[key]) weeks[key] = []
      weeks[key].push(e)
    })

    let html = `<p><strong>🗓️ ${today.getFullYear()}년 ${today.getMonth() + 1}월 일정</strong></p>`
    for (const [week, items] of Object.entries(weeks)) {
      html += `<p><strong>${week}</strong></p><ul>`
      items.forEach(e => {
        const time = e.time ? ` ${e.time}` : ''
        const desc = e.description ? ` — ${e.description}` : ''
        html += `<li><strong>${e.date}${time}</strong> ${e.title}${desc}</li>`
      })
      html += '</ul>'
    }

    editor.chain().focus().insertContent(html).run()
  }},
]

interface CommandListProps {
  items: typeof commands
  command: (item: typeof commands[0]) => void
}

export const CommandList = forwardRef<{ onKeyDown: (e: KeyboardEvent) => boolean }, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ key }: KeyboardEvent) => {
        if (key === 'ArrowUp') { setSelectedIndex((i) => (i - 1 + items.length) % items.length); return true }
        if (key === 'ArrowDown') { setSelectedIndex((i) => (i + 1) % items.length); return true }
        if (key === 'Enter') { command(items[selectedIndex]); return true }
        return false
      },
    }))

    useEffect(() => setSelectedIndex(0), [items])

    if (!items.length) return null

    return (
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-64 max-h-80 overflow-y-auto">
        <div className="p-1">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => command(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium shrink-0">
                {item.icon}
              </span>
              <div>
                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }
)

CommandList.displayName = 'CommandList'

export const SlashCommands = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return { suggestion: {} as Partial<SuggestionOptions> }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run()
          props.action(editor)
        },
        items: ({ query }: { query: string }) =>
          commands.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.desc.toLowerCase().includes(query.toLowerCase())
          ),
        render: () => {
          let component: ReactRenderer
          let popup: Instance[]

          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandList, { props, editor: props.editor })
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
              return (component.ref as { onKeyDown: (e: KeyboardEvent) => boolean })?.onKeyDown(props.event) ?? false
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
