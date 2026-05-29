'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

function ColumnView({ node, editor, getPos }: NodeViewProps) {
  const deleteColumn = () => {
    if (typeof getPos !== 'function') return
    const pos = getPos() as number
    try {
      const resolved = editor.state.doc.resolve(pos)
      if (resolved.parent.childCount <= 1) return
      editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
    } catch {}
  }

  const canDelete = () => {
    if (typeof getPos !== 'function') return false
    try {
      const pos = getPos() as number
      const resolved = editor.state.doc.resolve(pos)
      return resolved.parent.childCount > 1
    } catch {
      return false
    }
  }

  return (
    <NodeViewWrapper
      className={`relative flex-1 min-w-0 group/col rounded-lg transition-colors ${
        editor.isEditable
          ? 'border border-dashed border-slate-200 hover:border-slate-300 p-3'
          : ''
      }`}
    >
      {editor.isEditable && canDelete() && (
        <button
          contentEditable={false}
          onMouseDown={(e) => { e.preventDefault(); deleteColumn() }}
          className="absolute top-1 right-1 w-5 h-5 rounded bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 text-xs flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity z-10"
          title="열 삭제"
        >
          ×
        </button>
      )}
      <NodeViewContent />
    </NodeViewWrapper>
  )
}

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
      <NodeViewContent
        as="div"
        className="flex gap-3 items-stretch"
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

  addNodeView() {
    return ReactNodeViewRenderer(ColumnView)
  },
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
        style: 'display: flex; gap: 0.75rem; align-items: stretch;',
      }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnsView)
  },
})
