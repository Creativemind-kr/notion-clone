import { Editor } from '@tiptap/core'

export function insertToggleBlock(editor: Editor, anchorPos?: number) {
  const { state } = editor
  const { schema } = state

  const detailsType = schema.nodes.details
  const summaryType = schema.nodes.detailsSummary
  const contentType = schema.nodes.detailsContent
  const paraType = schema.nodes.paragraph

  if (!detailsType || !summaryType || !contentType || !paraType) return false

  // 저장된 위치 또는 현재 커서 위치 사용
  const pos = anchorPos ?? state.selection.anchor
  const $from = state.doc.resolve(pos)

  // depth 1 이상인 가장 가까운 블록 노드 찾기
  let depth = $from.depth
  while (depth > 0 && !$from.node(depth).isBlock) depth--
  if (depth < 1) return false

  const blockPos = $from.before(depth)
  const blockNode = $from.node(depth)
  const blockEnd = blockPos + blockNode.nodeSize

  try {
    const textContent = blockNode.textContent
    const summaryNode = summaryType.create(
      null,
      textContent ? schema.text(textContent) : null
    )
    const detailsContentNode = contentType.create(null, paraType.create())
    const detailsNode = detailsType.create({ open: true }, [summaryNode, detailsContentNode])

    const tr = state.tr.replaceRangeWith(blockPos, blockEnd, detailsNode)
    editor.view.dispatch(tr)
    return true
  } catch (e) {
    console.error('Toggle block creation failed:', e)
    return false
  }
}
