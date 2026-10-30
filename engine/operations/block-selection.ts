import { Fragment, Slice, type Node as ProseMirrorNode, type ResolvedPos } from '@tiptap/pm/model';
import { Selection, SelectionRange, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import type { Mappable } from '@tiptap/pm/transform';
import { blockAt } from './block-move';

/**
 * Notion's block selection: one or more whole sibling blocks, highlighted in blue. `anchor` and `head`
 * are the start positions of the first and last selected blocks (in selection order).
 */
function bounds(doc: ProseMirrorNode, anchor: number, head: number) {
  const [first, last] = anchor <= head ? [anchor, head] : [head, anchor];
  return [doc.resolve(first), doc.resolve(last + doc.nodeAt(last)!.nodeSize)] as const;
}

export class BlockSelection extends Selection {
  readonly anchorBlock: number;
  readonly headBlock: number;
  constructor(anchorBlock: number, headBlock: number, doc: ProseMirrorNode) {
    const [$from, $to] = bounds(doc, anchorBlock, headBlock);
    super($from, $to, [new SelectionRange($from, $to)]);
    this.anchorBlock = anchorBlock; this.headBlock = headBlock;
    // No caret: the selection is drawn as highlighted blocks.
    this.visible = false;
  }
  /** Start positions of every selected block, in document order. */
  blocks(): number[] {
    const out: number[] = [];
    const $start = this.$from, parent = $start.parent;
    let pos = this.from;
    for (let index = $start.index(); pos < this.to && index < parent.childCount; index++) { out.push(pos); pos += parent.child(index).nodeSize; }
    return out;
  }
  map(doc: ProseMirrorNode, mapping: Mappable): Selection {
    const anchor = mapping.mapResult(this.anchorBlock, 1), head = mapping.mapResult(this.headBlock, 1);
    if (anchor.deleted || head.deleted) return TextSelection.near(doc.resolve(Math.min(mapping.map(this.from), doc.content.size)));
    return BlockSelection.create(doc, anchor.pos, head.pos) ?? TextSelection.near(doc.resolve(mapping.map(this.from)));
  }
  content() { return new Slice(Fragment.from(this.$from.parent.content.cut(this.from - this.$from.start(), this.to - this.$from.start())), 0, 0); }
  eq(other: Selection): boolean { return other instanceof BlockSelection && other.anchorBlock === this.anchorBlock && other.headBlock === this.headBlock; }
  toJSON() { return { type: 'block', anchor: this.anchorBlock, head: this.headBlock }; }
  static fromJSON(doc: ProseMirrorNode, json: { anchor: number; head: number }) { return BlockSelection.create(doc, json.anchor, json.head) ?? Selection.atStart(doc); }

  /** Both positions must start sibling blocks; returns null otherwise. */
  static create(doc: ProseMirrorNode, anchor: number, head: number): BlockSelection | null {
    if (anchor < 0 || head < 0 || anchor >= doc.content.size || head >= doc.content.size) return null;
    const $a = doc.resolve(anchor), $h = doc.resolve(head);
    if ($a.parent !== $h.parent || !doc.nodeAt(anchor)?.isBlock || !doc.nodeAt(head)?.isBlock) return null;
    return new BlockSelection(anchor, head, doc);
  }
}
Selection.jsonID('block', BlockSelection);

/**
 * Blocks spanning two document positions, lifted to the deepest container holding both,
 * so a range across list items or nested blocks still selects whole siblings (Shift+click, rectangle).
 */
export function blockRange(doc: ProseMirrorNode, from: number, to: number): BlockSelection | null {
  const a = blockAt(doc, from), b = blockAt(doc, to);
  if (!a || !b) return null;
  let $a: ResolvedPos = doc.resolve(a.pos), $b: ResolvedPos = doc.resolve(b.pos);
  while ($a.parent !== $b.parent) {
    if ($a.depth >= $b.depth && $a.depth > 0) $a = doc.resolve($a.before());
    else if ($b.depth > 0) $b = doc.resolve($b.before());
    else return null;
  }
  return BlockSelection.create(doc, $a.pos, $b.pos);
}

/** Selection extended by one sibling block up or down from its head (Shift+↑/↓). */
export function extendBlockSelection(state: EditorState, direction: -1 | 1): BlockSelection | null {
  const selection = state.selection;
  if (!(selection instanceof BlockSelection)) return null;
  const $head = state.doc.resolve(selection.headBlock), index = $head.index() + direction;
  if (index < 0 || index >= $head.parent.childCount) return selection;
  const head = direction === -1 ? selection.headBlock - $head.parent.child(index).nodeSize : selection.headBlock + state.doc.nodeAt(selection.headBlock)!.nodeSize;
  return BlockSelection.create(state.doc, selection.anchorBlock, head);
}

/** Copies the selected blocks right after the selection, as one undo step (Cmd/Ctrl+D). */
export function duplicateBlocks(state: EditorState): Transaction | null {
  const selection = state.selection;
  if (!(selection instanceof BlockSelection)) return null;
  const tr = state.tr.insert(selection.to, selection.content().content);
  const size = selection.to - selection.from;
  return tr.setSelection(BlockSelection.create(tr.doc, selection.from + size, selection.blocks().at(-1)! + size) ?? tr.selection);
}

/** Moves the selected blocks past their previous or next sibling (Cmd/Ctrl+Shift+↑/↓). */
export function moveBlocks(state: EditorState, direction: -1 | 1): Transaction | null {
  const selection = state.selection;
  if (!(selection instanceof BlockSelection)) return null;
  const $from = selection.$from, parent = $from.parent;
  const first = $from.index(), count = selection.blocks().length, neighbour = direction === -1 ? first - 1 : first + count;
  if (neighbour < 0 || neighbour >= parent.childCount) return null;
  const size = parent.child(neighbour).nodeSize, slice = selection.content();
  const tr = state.tr.delete(selection.from, selection.to);
  const insertAt = direction === -1 ? selection.from - size : selection.from + size;
  tr.insert(insertAt, slice.content);
  const anchorOffset = selection.anchorBlock - selection.from, headOffset = selection.headBlock - selection.from;
  return tr.setSelection(BlockSelection.create(tr.doc, insertAt + anchorOffset, insertAt + headOffset) ?? tr.selection).scrollIntoView();
}
