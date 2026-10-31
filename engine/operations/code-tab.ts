import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

/** The code block under the caret, with the start position of its text content. */
function contextAt(state: EditorState) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'codeBlock') {
      return { depth: depth, blockStart: $from.before(depth) + 1, text: $from.node(depth).textContent as string };
    }
  }
  return undefined;
}

/**
 * Tab / Maj+Tab inside a code block: adds or removes two spaces at the start of each
 * selected line, like the reference editor. The caret stays inside the block.
 */
export function codeTab(state: EditorState, direction: 1 | -1): Transaction | undefined {
  const context = contextAt(state);
  if (!context) return undefined;
  const { depth, blockStart, text } = context;
  const { $from, $to } = state.selection;
  const from = Math.max(0, Math.min(text.length, $from.pos - blockStart));
  const to = Math.max(from, Math.min(text.length, $to.pos - blockStart));

  const lineStarts: number[] = [];
  for (let index = 0; index <= text.length; index++) {
    if (index === 0 || text[index - 1] === '\n') lineStarts.push(index);
  }
  const touched = lineStarts.filter((offset, position) => {
    const lineEnd = position + 1 < lineStarts.length ? lineStarts[position + 1] : text.length + 1;
    return from < lineEnd && to >= offset; // The line intersects the selection (the caret at its start counts).
  });
  const targets = touched.filter(offset => direction === 1 || text.slice(offset, offset + 2) === '  ');
  if (!targets.length) return undefined;

  const transaction = state.tr;
  for (const offset of [...targets].reverse()) {
    if (direction === 1) transaction.insertText('  ', blockStart + offset);
    else transaction.delete(blockStart + offset, blockStart + offset + 2);
  }
  transaction.setSelection(TextSelection.create(transaction.doc, transaction.mapping.map($from.pos), transaction.mapping.map($to.pos)));
  return transaction;
}
