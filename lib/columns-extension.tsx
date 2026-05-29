'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

// Columns 전체 컨테이너 (flex 레이아웃 + 열 추가 버튼)
function ColumnsView({ node, editor, getPos }: NodeViewProps) {
  const addColumn = () => {
    if (typeof getPos !== 'function') return
    const pos = getPos() as number
    editor.chain().focus().insertContentAt(pos + node.nodeSize - 1, {
      type: 'column',
      content: [{ type: 'paragraph' }],
    }).run()
  }

  return (
    <NodeViewWrapper className="my-4 relative group/columns">
      {/* NodeViewContent를 flex 컨테이너로: Column div들이 직접 flex item이 됨 */}
      <NodeViewContent
        as="div"
        style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}
      />
      {editor.isEditable && node.childCount < 4 && (
        <button
          contentEditable={false}
          onMouseDown={(e) => { e.preventDefault(); addColumn() }}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 text-slate-300 hover:text-slate-500 text-[11px] opacity-0 group-hover/columns:opacity-100 transition-opacity"
          title="열 추가"
        >
          + 열 추가
        </button>
      )}
    </NodeViewWrapper>
  )
}

// Column 개별 열: ReactNodeViewRenderer 제거 → renderHTML의 div가 직접 flex item
export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column',
        style: 'flex: 1; min-width: 0;',
      }),
      0,
    ]
  },
  // addNodeView 없음 → ProseMirror가 renderHTML 결과를 직접 DOM으로 사용
})

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column+',

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'columns',
        style: 'display: flex; gap: 12px; align-items: stretch;',
      }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnsView)
  },
})
