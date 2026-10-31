import { TableOfContents } from './table-of-contents';
import { PageMention } from './page-mention';
import type { Page } from '../models/page';
import { CodeBlock } from './code-block';
import { TextColor } from './colors';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { tableExtension } from './table';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { Toggle, ToggleSummary } from './blocks';
import { Callout } from './callout';
import { NotionShortcuts } from './shortcuts';
import { Columns, Column } from './columns';
import { Indent } from './indent';
import { DateMention } from './date-mention';
import { LinkToPage } from './link-to-page';
import { mediaNodes } from './media';
import { DirectiveBlock } from './directive-block';

export function documentExtensions(getPage: (id: string) => Pick<Page, 'title' | 'icon' | 'trashed'> | undefined = () => undefined) {
  return [StarterKit.configure({ link: { openOnClick: false }, dropcursor: false, codeBlock: false }), Markdown.configure({ markedOptions: { gfm: true } }), TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: false }), tableExtension(), Image, TableOfContents, Callout, Toggle, ToggleSummary, TextColor, CodeBlock, PageMention.configure({ getPage }), NotionShortcuts, Columns, Column, Indent, DateMention, LinkToPage, ...mediaNodes, DirectiveBlock];
}
