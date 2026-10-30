import { TextColor } from './colors';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { Callout, Toggle, ToggleSummary } from './blocks';

export function editorExtensions() {
  return [StarterKit.configure({ link: { openOnClick: false }, dropcursor: false }), Markdown.configure({ markedOptions: { gfm: true } }), TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: { resizable: false } }), Image, Callout, Toggle, ToggleSummary, TextColor];
}
