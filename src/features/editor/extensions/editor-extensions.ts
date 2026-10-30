import { PageMention } from './page-mention';
import type { Page } from '../../../../shared/page';
import { CodeBlock } from './code-block';
import { TextColor } from './colors';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { Callout, Toggle, ToggleSummary } from './blocks';

export function editorExtensions(getPage: (id: string) => Pick<Page, 'title' | 'icon' | 'trashed'> | undefined = () => undefined) {
  return [StarterKit.configure({ link: { openOnClick: false }, dropcursor: false, codeBlock: false }), Markdown.configure({ markedOptions: { gfm: true } }), TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: { resizable: false } }), Image, Callout, Toggle, ToggleSummary, TextColor, CodeBlock, PageMention.configure({ getPage })];
}
