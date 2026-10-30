import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

// Blocks that keep their own Tab behaviour (lists sink items, code inserts spaces, tables move between cells).
const ownTab = new Set(['listItem', 'taskItem', 'codeBlock', 'tableCell', 'tableHeader', 'toggleSummary']);

/** Whether Tab belongs to block nesting here (not to a list, code block, table or toggle title). */
export const handlesTab = (state: EditorState) => current(state) !== null;

/** The block under the caret that Tab moves: the direct child of a document, toggle body or indent. */
function current(state: EditorState) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) if (ownTab.has($from.node(depth).type.name)) return null;
  for (let depth = $from.depth; depth > 0; depth--) {
    const parent = $from.node(depth - 1).type.name;
    if (depth === 1 || parent === 'indent' || parent === 'toggle' || parent === 'column' || parent === 'callout') return { depth, pos: $from.before(depth), node: $from.node(depth) };
  }
  return null;
}

/** A block and the indent holding its children right after it, which always move together. */
function withChildren(doc: ProseMirrorNode, pos: number) {
  const node = doc.nodeAt(pos)!;
  const next = doc.nodeAt(pos + node.nodeSize);
  return next?.type.name === 'indent' ? { end: pos + node.nodeSize + next.nodeSize, content: Fragment.from([node, next]) } : { end: pos + node.nodeSize, content: Fragment.from(node) };
}

/**
 * Notion's Tab on a block: it becomes a child of the block above — inside a toggle's body, or in the
 * `indent` holding that block's children (created if needed). Returns null when the block cannot move.
 */
export function indentBlock(state: EditorState): Transaction | null {
  const block = current(state), indent = state.schema.nodes.indent;
  if (!block || !indent) return null;
  const $pos = state.doc.resolve(block.pos), index = $pos.index();
  if (index === 0) return null;
  const previous = $pos.parent.child(index - 1), previousPos = block.pos - previous.nodeSize;
  // The block above may itself be followed by its children: nest after them, under the same parent block.
  const moving = withChildren(state.doc, block.pos), offset = state.selection.from - block.pos;
  let tr = state.tr.delete(block.pos, moving.end), target: number;
  if (previous.type.name === 'indent' || previous.type.name === 'toggle') {
    target = previousPos + previous.nodeSize - 1;
    tr = tr.insert(target, moving.content);
  } else {
    target = previousPos + previous.nodeSize + 1;
    tr = tr.insert(previousPos + previous.nodeSize, indent.create(null, moving.content));
  }
  return tr.setSelection(TextSelection.near(tr.doc.resolve(target + offset))).scrollIntoView();
}

/**
 * Notion's Shift+Tab: the block leaves its parent and sits right after it; the blocks that followed it
 * there become its children, so the reading order never changes.
 */
export function outdentBlock(state: EditorState): Transaction | null {
  const block = current(state), indent = state.schema.nodes.indent;
  if (!block || !indent || block.depth < 2) return null;
  const $pos = state.doc.resolve(block.pos), container = $pos.parent, containerPos = $pos.before();
  if (!['indent', 'toggle'].includes(container.type.name)) return null;
  const index = $pos.index(), first = container.type.name === 'toggle' ? 1 : 0;
  const before = [], after = [];
  for (let i = first; i < container.childCount; i++) if (i < index) before.push(container.child(i)); else if (i > index) after.push(container.child(i));
  const followers = after.length ? [indent.create(null, after)] : [];
  const offset = state.selection.from - block.pos;
  // Rebuild the container without the block and what followed it, then place the block (and its new children) after it.
  const kept = container.type.name === 'toggle' ? container.copy(Fragment.from([container.child(0), ...(before.length ? before : [state.schema.nodes.paragraph.create()])])) : before.length ? container.copy(Fragment.from(before)) : null;
  const replacement = [...(kept ? [kept] : []), block.node, ...followers];
  const tr = state.tr.replaceWith(containerPos, containerPos + container.nodeSize, replacement);
  const blockPos = containerPos + (kept ? kept.nodeSize : 0);
  return tr.setSelection(TextSelection.near(tr.doc.resolve(blockPos + offset))).scrollIntoView();
}
