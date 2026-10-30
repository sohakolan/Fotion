import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Fragment } from '@tiptap/pm/model';
import { NodeSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

export type Block = { pos: number; node: ProseMirrorNode };
export const isListItem = (node: ProseMirrorNode) => ['listItem', 'taskItem'].includes(node.type.name);

export function blockAt(doc: ProseMirrorNode, position: number): Block | null {
  const resolved = doc.resolve(Math.max(0, Math.min(position, doc.content.size)));
  for (let depth = resolved.depth; depth > 0; depth--) {
    if (isListItem(resolved.node(depth))) return { pos: resolved.before(depth), node: resolved.node(depth) };
  }
  if (resolved.depth) return { pos: resolved.before(1), node: resolved.node(1) };
  const node = doc.nodeAt(position);
  return node ? { pos: position, node } : null;
}

// Use one transaction so a move is one undo step and preserves the original nodes and marks.
export function moveBlockTransaction(state: EditorState, source: Block, target: Block, after: boolean): Transaction | null {
  if (state.doc.nodeAt(source.pos) !== source.node || state.doc.nodeAt(target.pos) !== target.node) return null;
  if (source.pos === target.pos || (target.pos > source.pos && target.pos < source.pos + source.node.nodeSize)) return null;
  let destination = target.pos + (after ? target.node.nodeSize : 0);
  let from = source.pos, to = source.pos + source.node.nodeSize;
  const sourceResolved = state.doc.resolve(source.pos);
  let inserted = Fragment.from(source.node);
  if (isListItem(source.node)) {
    if (sourceResolved.parent.childCount === 1) {
      from = sourceResolved.before();
      to = from + sourceResolved.parent.nodeSize;
    }
    if (isListItem(target.node)) {
      inserted = Fragment.from(target.node.type.create(source.node.type === target.node.type ? source.node.attrs : undefined, source.node.content));
    } else inserted = source.node.content;
  } else if (isListItem(target.node)) {
    if (source.node.isTextblock) {
      const paragraph = state.schema.nodes.paragraph.create(null, source.node.content);
      inserted = Fragment.from(target.node.type.create(null, paragraph));
    } else {
      const resolved = state.doc.resolve(target.pos);
      destination = after ? resolved.after() : resolved.before();
    }
  }
  if (destination >= from && destination <= to) return null;
  const tr = state.tr.delete(from, to);
  destination = tr.mapping.map(destination, -1);
  const resolved = tr.doc.resolve(destination);
  const index = resolved.index();
  if (!resolved.parent.canReplace(index, index, inserted)) return null;
  tr.insert(destination, inserted);
  tr.setSelection(NodeSelection.create(tr.doc, destination));
  return tr;
}
