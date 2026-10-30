import { Extension, InputRule, markInputRule, wrappingInputRule, type Editor } from '@tiptap/core';
import { NodeSelection, Plugin, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { blockAt, moveBlockTransaction } from '../operations/block-move';
import { BlockSelection, extendBlockSelection, duplicateBlocks, moveBlocks } from '../operations/block-selection';
import { convertToggle } from '../operations/toggle-conversion';

/**
 * Cursor position as displayed. Right after a click, ProseMirror may not have read the new DOM
 * selection yet; block commands must act on the block the user actually sees the caret in.
 */
export function caretPosition(editor: Editor) {
  const selection = editor.view.dom.ownerDocument.getSelection();
  if (editor.state.selection instanceof NodeSelection || editor.state.selection instanceof BlockSelection || !selection?.anchorNode || !editor.view.dom.contains(selection.anchorNode)) return editor.state.selection.from;
  try { return editor.view.posAtDOM(selection.anchorNode, selection.anchorOffset); } catch { return editor.state.selection.from; }
}

/** Selects the whole block around the cursor, as Notion does with Escape. */
export function selectCurrentBlock(editor: Editor) {
  const block = blockAt(editor.state.doc, caretPosition(editor));
  if (!block) return false;
  const selection = BlockSelection.create(editor.state.doc, block.pos, block.pos);
  if (selection) editor.view.dispatch(editor.state.tr.setSelection(selection));
  return !!selection;
}

/** Moves the block around the cursor (or the selected block) up or down, as one undo step. */
export function moveCurrentBlock(editor: Editor, direction: -1 | 1) {
  const { state } = editor;
  if (state.selection instanceof BlockSelection) { const tr = moveBlocks(state, direction); if (tr) editor.view.dispatch(tr); return true; }
  let block = blockAt(state.doc, caretPosition(editor));
  if (!block) return false;
  let resolved = state.doc.resolve(block.pos), sibling = resolved.index() + direction;
  // A list item at the edge of its list moves the whole list, like a Notion block among its siblings.
  while ((sibling < 0 || sibling >= resolved.parent.childCount) && resolved.depth > 0) {
    block = { pos: resolved.before(), node: resolved.parent };
    resolved = state.doc.resolve(block.pos); sibling = resolved.index() + direction;
  }
  if (sibling < 0 || sibling >= resolved.parent.childCount) return true;
  const next = resolved.parent.child(sibling);
  const target = { pos: direction === -1 ? block.pos - next.nodeSize : block.pos + block.node.nodeSize, node: next };
  const tr = moveBlockTransaction(state, block, target, direction === 1);
  if (tr) editor.view.dispatch(tr);
  return true;
}

/** Notion's Cmd/Ctrl+Enter: check a to-do or open/close a toggle. */
function actOnBlock(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'taskItem') return editor.commands.command(({ tr }) => { tr.setNodeMarkup($from.before(depth), undefined, { ...node.attrs, checked: !node.attrs.checked }); return true; });
    if (node.type.name === 'toggle') {
      const details = editor.view.nodeDOM($from.before(depth));
      if (details instanceof HTMLElement && details.tagName === 'DETAILS') { (details as HTMLDetailsElement).open = !(details as HTMLDetailsElement).open; return true; }
    }
  }
  return false;
}

/** Notion's Cmd/Ctrl+Alt+T: open every toggle, or close them all when all are open. */
function toggleAll(editor: Editor) {
  const all = [...editor.view.dom.querySelectorAll('details')];
  const open = all.some(details => !details.open);
  for (const details of all) details.open = open;
  return all.length > 0;
}

/**
 * Notion typing and keyboard behaviour that Tiptap does not provide by default.
 * The high priority lets these rules win over the generic StarterKit ones.
 */
export const NotionShortcuts = Extension.create({
  name: 'notionShortcuts',
  priority: 1000,
  addInputRules() {
    const { toggle, toggleSummary, paragraph, blockquote, orderedList } = this.editor.schema.nodes;
    const { strike } = this.editor.schema.marks;
    return [
      // `>` + space: toggle list, keeping the typed text as its summary.
      new InputRule({ find: /^>\s$/, handler: ({ state, range }) => {
        const $from = state.doc.resolve(range.from);
        const container = $from.node(-1), index = $from.index(-1);
        if ($from.parent.type !== paragraph || !container.canReplaceWith(index, index + 1, toggle)) return null;
        const summary = $from.parent.content.cut(range.to - $from.start());
        const start = $from.before();
        state.tr.replaceWith(start, $from.after(), toggle.create(null, [toggleSummary.create(null, summary), paragraph.create()]));
        state.tr.setSelection(TextSelection.create(state.tr.doc, start + 2 + summary.size));
      } }),
      wrappingInputRule({ find: /^\s*"\s$/, type: blockquote }),
      // `a.` or `i.` + space also start a numbered list in Notion.
      ...(orderedList ? [wrappingInputRule({ find: /^\s*([ai])\.\s$/, type: orderedList })] : []),
      // Notion strikes through with single tildes; double tildes stay handled by the Strike extension.
      ...(strike ? [markInputRule({ find: /(?:^|\s)(~(?!~)((?:[^~\s][^~]*?)?[^~\s])~)$/, type: strike })] : []),
    ];
  },
  addProseMirrorPlugins() {
    return [new Plugin({ props: { decorations: state => state.selection instanceof BlockSelection
      ? DecorationSet.create(state.doc, state.selection.blocks().map(pos => Decoration.node(pos, pos + state.doc.nodeAt(pos)!.nodeSize, { class: 'block-selected' })))
      : null } })];
  },
  addKeyboardShortcuts() {
    const editor = this.editor;
    const turn: Record<string, () => boolean> = {
      0: () => editor.commands.setParagraph(),
      1: () => editor.commands.setHeading({ level: 1 }),
      2: () => editor.commands.setHeading({ level: 2 }),
      3: () => editor.commands.setHeading({ level: 3 }),
      4: () => editor.commands.toggleTaskList(),
      5: () => editor.commands.toggleBulletList(),
      6: () => editor.commands.toggleOrderedList(),
      7: () => { const block = blockAt(editor.state.doc, caretPosition(editor)); const tr = block && convertToggle(editor.state, block.pos, { toggle: true, level: 0 }); if (tr) editor.view.dispatch(tr); return !!tr; },
      8: () => editor.commands.toggleCodeBlock(),
    };
    // macOS uses Cmd+Option+digit, Windows and Linux Ctrl+Shift+digit.
    const turnInto = Object.fromEntries(Object.entries(turn).flatMap(([digit, run]) => [[`Mod-Alt-${digit}`, run], [`Ctrl-Shift-${digit}`, run]]));
    const selected = () => editor.state.selection instanceof BlockSelection ? editor.state.selection : null;
    const select = (selection: BlockSelection | null) => { if (selection) editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView()); return !!selection; };
    const step = (direction: -1 | 1) => {
      const selection = selected(); if (!selection) return false;
      const $head = editor.state.doc.resolve(selection.headBlock), index = $head.index() + direction;
      if (index < 0 || index >= $head.parent.childCount) return true;
      const pos = direction === -1 ? selection.headBlock - $head.parent.child(index).nodeSize : selection.headBlock + editor.state.doc.nodeAt(selection.headBlock)!.nodeSize;
      return select(BlockSelection.create(editor.state.doc, pos, pos));
    };
    const extend = (direction: -1 | 1) => {
      // Shift+↑/↓ from the caret first selects the current block, like Notion at a block edge.
      if (!selected()) return false;
      return select(extendBlockSelection(editor.state, direction));
    };
    return {
      ...turnInto,
      'Mod-Shift-ArrowUp': () => moveCurrentBlock(editor, -1),
      'Mod-Shift-ArrowDown': () => moveCurrentBlock(editor, 1),
      'Mod-Enter': () => actOnBlock(editor),
      'Mod-Alt-t': () => toggleAll(editor),
      // Escape selects the current block; a second Escape returns to editing at its end.
      Escape: () => {
        const selection = selected();
        if (!selection) return selectCurrentBlock(editor);
        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(selection.to), -1)));
        return true;
      },
      Enter: () => {
        const selection = selected(); if (!selection) return false;
        const head = editor.state.doc.nodeAt(selection.headBlock)!;
        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(selection.headBlock + head.nodeSize - 1), -1)));
        return true;
      },
      'Mod-d': () => { const tr = duplicateBlocks(editor.state); if (tr) editor.view.dispatch(tr); return !!tr; },
      ArrowUp: () => step(-1),
      ArrowDown: () => step(1),
      'Shift-ArrowUp': () => extend(-1),
      'Shift-ArrowDown': () => extend(1),
    };
  },
});
