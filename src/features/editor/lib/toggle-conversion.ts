import { closeHistory } from '@tiptap/pm/history';
import { Fragment } from '@tiptap/pm/model';
import { TextSelection, type EditorState } from '@tiptap/pm/state';

export type ToggleTarget = { toggle: boolean; level: number };

// Preserve the body when unfolding a toggle into ordinary sibling blocks.
export function convertToggle(state: EditorState, pos: number, target: ToggleTarget) {
  if (![0, 1, 2, 3].includes(target.level) || pos < 0 || pos >= state.doc.content.size) return null;
  const source = state.doc.nodeAt(pos);
  if (!source || !['paragraph', 'heading', 'toggle'].includes(source.type.name)) return null;
  const { paragraph, heading, toggle, toggleSummary } = state.schema.nodes;
  const wasToggle = source.type.name === 'toggle';
  const title = wasToggle ? source.firstChild!.content : source.content;
  const body = wasToggle ? source.content.cut(source.firstChild!.nodeSize) : Fragment.from(paragraph.create());
  const replacement = target.toggle
    ? Fragment.from(toggle.create(null, Fragment.from(toggleSummary.create({ level: target.level }, title)).append(body)))
    : Fragment.from(target.level ? heading.create({ level: target.level }, title) : paragraph.create(null, title)).append(wasToggle ? body : Fragment.empty);
  const resolved = state.doc.resolve(pos), index = resolved.index();
  if (!resolved.parent.canReplace(index, index + 1, replacement)) return null;
  const tr = closeHistory(state.tr).replaceWith(pos, pos + source.nodeSize, replacement);
  tr.setSelection(TextSelection.create(tr.doc, pos + (target.toggle ? 2 : 1)));
  return tr.scrollIntoView();
}
