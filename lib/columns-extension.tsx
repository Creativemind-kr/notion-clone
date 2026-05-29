import { Node, mergeAttributes } from '@tiptap/core'

// ReactNodeViewRenderer 없이 renderHTML 인라인 스타일만 사용
// → ProseMirror가 div를 직접 DOM에 넣어서 flex 레이아웃 확실히 동작

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
        style: 'display: flex; gap: 12px; align-items: flex-start;',
      }),
      0,
    ]
  },
})
