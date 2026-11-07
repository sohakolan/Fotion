import { closeHistory } from '@tiptap/pm/history';
import { convertToggle, slashCommands, searchSlashCommands, slashQuery, withRecentSlashCommands, type ToggleTarget, type SlashCommand } from '../../../../engine';
import { recentSlashIds, pushRecentSlashCommand } from '../lib/slash-recents';
import { createSignal, createMemo, createEffect, onMount, onCleanup, Show, For, type JSX } from 'solid-js';
import { Editor, type ChainedCommands } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import { mentionQuery } from '../../../../engine';
import { FotionMark, type Page, type PageEdit } from '../../../../engine';
import { normalizeSearch, pageIdFromHref, pageHref, dateSuggestions, formatDate, isoDay, isDateValue } from '../../../../engine';
import { textColors, colorId, type ColorId } from '../../../../engine';
import { editorExtensions } from '../extensions/editor-extensions';
import { TextSelection, AllSelection, NodeSelection } from '@tiptap/pm/state';
import BlockControls from './BlockControls';
import SelectionRectangle from './SelectionRectangle';
import MediaDialog, { upload, mediaKindOf, type MediaKind, type MediaResult } from './MediaDialog';
import { Menu, MenuItem, MenuDivider, MenuSearch, EmojiPicker, Switch, modKey } from '../../../kit';
import { blockAt, moveBlockTransaction, isListItem, caretPosition, BlockSelection, blockRange, type Block } from '../../../../engine';
import { Bold, Italic, Underline, Strikethrough, Code, Link, ChevronDown, ChevronRight, Trash2, Copy, Type, Search, Check, Plus, ImagePlus, X, Repeat2, PaintRoller, AtSign, Smile, CalendarDays, AlarmClock, CornerUpRight, ArrowUpRight, Video, Music, FileType, Paperclip, Bookmark, Globe, ChevronsRight, MousePointerClick, Sigma, Radical, Heading1, Heading2, Heading3, List, ListOrdered, SquareCheckBig, ListCollapse, FileText, MessageSquareText, Quote, Table, Minus, Image as ImageIcon, CodeXml, TableOfContents, Columns2, Columns3, Columns4 , Database as DatabaseIcon, SquareKanban, LayoutGrid } from 'lucide-solid';


const blockActions: Record<string, { icon: () => JSX.Element; action: (chain: ChainedCommands) => ChainedCommands }> = {
  text: { icon: () => <Type size={18}/>, action: c => c.setParagraph() },
  heading1: { icon: () => <Heading1 size={18}/>, action: c => c.setHeading({ level: 1 }) },
  heading2: { icon: () => <Heading2 size={18}/>, action: c => c.setHeading({ level: 2 }) },
  heading3: { icon: () => <Heading3 size={18}/>, action: c => c.setHeading({ level: 3 }) },
  bulletList: { icon: () => <List size={18}/>, action: c => c.toggleBulletList() },
  orderedList: { icon: () => <ListOrdered size={18}/>, action: c => c.toggleOrderedList() },
  taskList: { icon: () => <SquareCheckBig size={18}/>, action: c => c.toggleTaskList() },
  toggle: { icon: () => <ListCollapse size={18}/>, action: c => c.insertContent({ type: 'toggle', content: [{ type: 'toggleSummary', content: [{ type: 'text', text: 'Liste dépliante' }] }, { type: 'paragraph' }] }) },
  page: { icon: () => <FileText size={18}/>, action: c => c },
  database: { icon: () => <DatabaseIcon size={18}/>, action: c => c },
  databaseBoard: { icon: () => <SquareKanban size={18}/>, action: c => c },
  databaseList: { icon: () => <List size={18}/>, action: c => c },
  databaseGallery: { icon: () => <LayoutGrid size={18}/>, action: c => c },
  link: { icon: () => <ArrowUpRight size={18}/>, action: c => c },
  math: { icon: () => <Sigma size={18}/>, action: c => c.insertContent({ type: 'blockMath', attrs: { latex: '' } }) },
  button: { icon: () => <MousePointerClick size={18}/>, action: c => c.insertContent({ type: 'button', attrs: { label: 'Nouvelle tâche', attributes: {} }, content: [{ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] }] }] }) },
  breadcrumb: { icon: () => <ChevronsRight size={18}/>, action: c => c.insertContent({ type: 'breadcrumb', attrs: { attributes: {} } }) },
  callout: { icon: () => <MessageSquareText size={18}/>, action: c => c.wrapIn('callout') },
  quote: { icon: () => <Quote size={18}/>, action: c => c.toggleBlockquote() },
  table: { icon: () => <Table size={18}/>, action: c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
  divider: { icon: () => <Minus size={18}/>, action: c => c.setHorizontalRule() },
  image: { icon: () => <ImageIcon size={18}/>, action: c => c },
  video: { icon: () => <Video size={18}/>, action: c => c },
  audio: { icon: () => <Music size={18}/>, action: c => c },
  pdf: { icon: () => <FileType size={18}/>, action: c => c },
  file: { icon: () => <Paperclip size={18}/>, action: c => c },
  bookmark: { icon: () => <Bookmark size={18}/>, action: c => c },
  embed: { icon: () => <Globe size={18}/>, action: c => c },
  code: { icon: () => <CodeXml size={18}/>, action: c => c.toggleCodeBlock() },
  toc: { icon: () => <TableOfContents size={18}/>, action: c => c.insertContent({ type: 'tableOfContents' }) },
  ...Object.fromEntries(([[2, Columns2], [3, Columns3], [4, Columns4]] as const).map(([count, Icon]) => [`columns${count}`, { icon: () => <Icon size={18}/>, action: (c: ChainedCommands) => c.insertContent({ type: 'columns', content: Array.from({ length: count }, () => ({ type: 'column', content: [{ type: 'paragraph' }] })) }) }])),
  ...Object.fromEntries([1, 2, 3].map(level => [`toggleHeading${level}`, { icon: () => <span class="toggle-heading-icon"><ChevronRight size={10}/>H{level}</span>, action: (c: ChainedCommands) => c.insertContent({ type: 'toggle', content: [{ type: 'toggleSummary', attrs: { level }, content: [{ type: 'text', text: `Titre dépliant ${level}` }] }, { type: 'paragraph' }] }) }])),
};
// Actions, colours and « Transformer en » entries act on the current block; their icon derives from the target.
function derivedAction(command: SlashCommand): { icon: () => JSX.Element; action: (chain: ChainedCommands) => ChainedCommands } {
  if (command.id.startsWith('turn-')) return { icon: blockActions[command.id.slice(5)]?.icon ?? (() => <Repeat2 size={18}/>), action: blockActions[command.id.slice(5)]?.action ?? (c => c) };
  const color = command.id.match(/^(color|background)-(\w+)$/);
  if (color) return { icon: () => <span class="slash-color" data-fotion-color={color[1] === 'color' ? color[2] : 'default'} data-fotion-background={color[1] === 'background' ? color[2] : 'default'}>A</span>, action: c => c };
  const icons: Record<string, () => JSX.Element> = { inlineEquation: () => <Radical size={18}/>, moveto: () => <CornerUpRight size={18}/>, date: () => <CalendarDays size={18}/>, reminder: () => <AlarmClock size={18}/>, mention: () => <AtSign size={18}/>, emoji: () => <Smile size={18}/>, duplicate: () => <Copy size={18}/>, delete: () => <Trash2 size={18}/> };
  return { icon: icons[command.id] ?? (() => <Type size={18}/>), action: c => c };
}
const mediaKinds: MediaKind[] = ['image', 'video', 'audio', 'pdf', 'file', 'bookmark', 'embed'];
type MentionOption = { kind: 'date'; date: string } | { kind: 'page'; page: Page } | { kind: 'new'; title: string };
const blocks = slashCommands.map(command => ({ ...command, ...(blockActions[command.id] ?? derivedAction(command)) }));

export default function DocumentEditor(props: { content: string; onChange: (content: string) => void; onReady: (editor: Editor | undefined) => void; onCreatePage: () => void; onCreateSubpage: (title: string, extra?: Partial<PageEdit>) => Promise<Page | undefined>; onUpdatePage: (id: string, patch: Partial<PageEdit>) => void; onMoveBlock: (markdown: string, targetId: string) => Promise<boolean>; onError: (message: string) => void; pageId: string; pages: Page[]; onOpenPage: (id: string) => void; onPeekPage?: (id: string) => void; editable: boolean }) {
  let element!: HTMLDivElement;
  let editor!: Editor;
  const [ready, setReady] = createSignal(false);
  const [colorMenu, setColorMenu] = createSignal<{ x: number; y: number; from: number; to: number; blockPos?: number }>();
  let lastColor: { kind: 'color' | 'background'; value: ColorId } | undefined;
  const [transform, setTransform] = createSignal(false);
  const [blockQuery, setBlockQuery] = createSignal('');
  const [linkDraft, setLinkDraft] = createSignal<{ value: string; from: number; to: number; x: number; y: number }>();
  const [mediaDraft, setMediaDraft] = createSignal<{ kind: MediaKind; pos: number; replace?: number }>();
  const [emojiAt, setEmojiAt] = createSignal<{ x: number; y: number }>();
  const [dateEdit, setDateEdit] = createSignal<{ pos: number; x: number; y: number }>();
  const [pagePicker, setPagePicker] = createSignal<{ purpose: 'link' | 'move'; pos: number; x: number; y: number; query: string }>();
  const pickerPages = createMemo(() => { const picker = pagePicker(); if (!picker) return []; const q = normalizeSearch(picker.query); return props.pages.filter(page => !page.trashed && (picker.purpose === 'link' || page.id !== props.pageId) && normalizeSearch(page.title || 'Sans titre').includes(q)).slice(0, 30); });
  function openPagePicker(purpose: 'link' | 'move', pos: number) {
    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    setPagePicker({ purpose, pos, query: '', x: Math.max(8, Math.min(coords.left, window.innerWidth - 328)), y: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 360)) });
  }
  /**
   * After inserting a whole block (divider, table of contents, breadcrumb…), Notion leaves the caret on the
   * line below; keeping the block selected would let the next keystroke replace it.
   */
  function continueBelowBlock() {
    const { selection } = editor.state;
    if (!(selection instanceof NodeSelection) || !selection.node.isBlock) return;
    const after = selection.to, next = editor.state.doc.nodeAt(after);
    const tr = next?.isTextblock ? editor.state.tr : editor.state.tr.insert(after, editor.state.schema.nodes.paragraph.create());
    editor.view.dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1))));
  }
  /** Puts a block where the slash command was typed: it replaces an empty line, otherwise goes right below. */
  function insertBlockHere(pos: number, content: Record<string, unknown>) {
    const block = blockAt(editor.state.doc, Math.min(pos, editor.state.doc.content.size));
    const empty = block?.node.type.name === 'paragraph' && !block.node.content.size;
    if (!block) editor.chain().insertContent(content).run();
    else editor.chain().insertContentAt(empty ? { from: block.pos, to: block.pos + block.node.nodeSize } : block.pos + block.node.nodeSize, content).run();
    // Immediate focus: Tiptap's delayed focus would reset the selection after the user's next click.
    editor.view.focus();
  }
  /** Dropped or pasted files: imported into the vault, then inserted in order where they landed. */
  async function importFiles(files: File[], pos: number) {
    for (const file of files) {
      try {
        const stored = await upload(file), kind = mediaKindOf(file);
        insertMedia(kind, pos, kind === 'file' ? { src: stored.path, name: stored.name, size: String(stored.size) } : { src: stored.path });
        pos = Math.min(editor.state.selection.to + 1, editor.state.doc.content.size);
      } catch (error) { props.onError((error as Error).message); }
    }
  }
  function insertMedia(kind: MediaKind, pos: number, result: MediaResult, replacedImage?: number) {
    if (kind === 'image') {
      if (typeof replacedImage === 'number') {
        const live = editor.state.doc.nodeAt(replacedImage);
        if (live?.type.name === 'image') editor.view.dispatch(editor.state.tr.setNodeMarkup(replacedImage, undefined, { ...live.attrs, src: result.src }));
        return;
      }
      insertBlockHere(pos, { type: 'image', attrs: { src: result.src, alt: '' } });
      return;
    }
    insertBlockHere(pos, { type: kind, attrs: { attributes: result } });
  }
  /** /link inserts a link-to-page block in place of an empty line; /moveto sends the block to another page. */
  async function pickPage(page: Page) {
    const picker = pagePicker(); if (!picker) return;
    setPagePicker(undefined);
    const node = editor.state.doc.nodeAt(picker.pos); if (!node) return;
    if (picker.purpose === 'link') {
      const block = { type: 'link-to-page', attrs: { attributes: { page: page.id } } };
      const empty = node.type.name === 'paragraph' && !node.content.size;
      editor.chain().focus().insertContentAt(empty ? { from: picker.pos, to: picker.pos + node.nodeSize } : picker.pos + node.nodeSize, block).run();
      return;
    }
    const markdown = editor.markdown?.serialize({ type: 'doc', content: [node.toJSON()] }) ?? '';
    // The block leaves this page only once the target page has saved it.
    if (markdown.trim() && await props.onMoveBlock(markdown.trim(), page.id) && editor.state.doc.nodeAt(picker.pos) === node) editor.chain().focus().deleteRange({ from: picker.pos, to: picker.pos + node.nodeSize }).run();
  }
  const dateNode = () => { revision(); const edit = dateEdit(); const node = edit && editor.state.doc.nodeAt(edit.pos); return node?.type.name === 'dateMention' ? node : undefined; };
  /** Updates the date mention being edited; a reminder always carries a time (9:00 by default, like Notion). */
  function updateDate(patch: { day?: string; time?: string; reminder?: boolean }) {
    const edit = dateEdit(), node = dateNode(); if (!edit || !node) return;
    const [day, time] = (node.attrs.date as string).split('T');
    const reminder = patch.reminder ?? node.attrs.reminder;
    const value = `${patch.day || day}${reminder ? `T${patch.time || time || '09:00'}` : ''}`;
    if (isDateValue(value)) editor.view.dispatch(editor.state.tr.setNodeMarkup(edit.pos, undefined, { date: value, reminder }));
  }
  const linkPages = () => props.pages.filter(page => normalizeSearch(page.title).includes(normalizeSearch(linkDraft()?.value || ''))).slice(0, 20);
  const [linkError, setLinkError] = createSignal('');
  const [slash, setSlash] = createSignal<{ from: number; to: number; query: string; x: number; y: number; above: boolean }>();
  let dismissedSlash = -1;
  const [mention, setMention] = createSignal<{ from: number; to: number; query: string; x: number; y: number }>();
  const [mentionChoice, setMentionChoice] = createSignal(0);
  /** Path from the root to this page, for the breadcrumb block. */
  const trail = () => {
    const path: Page[] = [], seen = new Set<string>();
    for (let page = props.pages.find(p => p.id === props.pageId); page && !seen.has(page.id); page = props.pages.find(p => p.id === page!.parent)) { seen.add(page.id); path.unshift(page); }
    return path;
  };
  const mentionPages = createMemo(() => props.pages.filter(page => !page.trashed && normalizeSearch(page.title || 'Sans titre').includes(normalizeSearch(mention()?.query || ''))).slice(0, 20));
  const mentionOptions = createMemo<MentionOption[]>(() => {
    const query = mention()?.query.trim() || '';
    return [...dateSuggestions(query).map(date => ({ kind: 'date' as const, date })), ...mentionPages().map(page => ({ kind: 'page' as const, page })), ...(query ? [{ kind: 'new' as const, title: query }] : [])];
  });
  const [choice, setChoice] = createSignal(0);
  const [selection, setSelection] = createSignal<{ x: number; y: number }>();
  const [revision, setRevision] = createSignal(0);
  const [blockMenu, setBlockMenu] = createSignal<{ x: number; y: number; pos: number }>();
  const filteredBlocks = () => searchSlashCommands(blockQuery(), blocks);
  const [recents, setRecents] = createSignal<string[]>(recentSlashIds());
  const options = createMemo(() => {
    const query = slash()?.query || '';
    const results = searchSlashCommands(query, blocks);
    if (query) return results;
    return withRecentSlashCommands(results, recents());
  });
  // Without a query the menu is grouped like Notion, with a pinned « Récemment utilisés » head.
  const optionGroups = createMemo(() => {
    if (slash()?.query) return [{ name: '', items: options() }];
    const recent = withRecentSlashCommands(searchSlashCommands('', blocks), recents()).slice(0, recents().length);
    const groups = [...new Set(options().map(b => b.group))].map(name => ({ name, items: options().filter(b => b.group === name) }));
    if (!recent.length) return groups;
    const recentIds = new Set(recent.map(b => b.id));
    const trimmed = groups.map(group => ({ ...group, items: group.items.filter(b => !recentIds.has(b.id)) })).filter(group => group.items.length);
    return [{ name: 'Récemment utilisés', items: recent }, ...trimmed];
  });
  const active = (name: string) => { revision(); return editor?.isActive(name); };
  const apply = (index: number) => {
    const item = options()[index];
    const range = slash();
    if (!item || !range) return;
    setSlash(undefined);
    pushRecentSlashCommand(item.id);
    setRecents(recentSlashIds());
    const $from = editor.state.doc.resolve(range.from);
    const typed = range.to - range.from;
    // Commands that open a picker or dialog must not ask Tiptap for a delayed focus: it would steal it back.
    const opensPopover = ['link', 'moveto', 'emoji', ...mediaKinds].includes(item.id);
    let chain = (opensPopover ? editor.chain() : editor.chain().focus()).deleteRange({ from: range.from, to: range.to });
    // Actions, colours and inline entries work on the current block instead of creating a new one.
    if (['Actions', 'Couleurs', 'En ligne'].includes(item.group)) { chain.run(); runBlockCommand(item.id); return; }
    if ($from.parent.content.size > typed && item.id !== 'page') {
      const after = $from.after() - typed;
      chain = chain.insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1);
    }
    item.action(chain).run();
    continueBelowBlock();
    if (item.id === 'page') props.onCreatePage();
    // Notion's inline database: a child page holds the schema and rows; this page shows a view of it.
    const layout = ({ database: 'table', databaseBoard: 'board', databaseList: 'list', databaseGallery: 'gallery' } as Record<string, string>)[item.id];
    if (layout) {
      const pos = editor.state.selection.from;
      void props.onCreateSubpage('', { database: layout === 'board' ? FotionMark.newBoardDatabase() : FotionMark.newDatabase() }).then(page => { if (page) { insertBlockHere(pos, { type: 'database-view', attrs: { attributes: { src: page.id, ...(layout !== 'table' ? { layout } : {}) }, label: null } }); continueBelowBlock(); } });
    }
    if (item.id === 'link') { const block = blockAt(editor.state.doc, editor.state.selection.from); if (block) openPagePicker('link', block.pos); }
    if (mediaKinds.includes(item.id as MediaKind)) setMediaDraft({ kind: item.id as MediaKind, pos: editor.state.selection.from });
  };
  /** Commands that act on the block around the cursor, reached from the slash menu or the keyboard. */
  function runBlockCommand(id: string) {
    const block = blockAt(editor.state.doc, caretPosition(editor));
    if (id === 'mention') { editor.chain().focus().insertContent('@').run(); return; }
    if (id === 'inlineEquation') { editor.chain().insertContent({ type: 'inlineMath', attrs: { latex: '' } }).run(); return; }
    if (id === 'date' || id === 'reminder') { editor.chain().focus().insertContent([{ type: 'dateMention', attrs: { date: id === 'date' ? isoDay(new Date()) : `${isoDay(new Date())}T09:00`, reminder: id === 'reminder' } }, { type: 'text', text: ' ' }]).run(); return; }
    if (id === 'emoji') { const coords = editor.view.coordsAtPos(editor.state.selection.from); setEmojiAt({ x: Math.max(8, Math.min(coords.left, window.innerWidth - 416)), y: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 364)) }); return; }
    if (!block) return;
    if (id === 'duplicate') { duplicateBlock(block.pos); return; }
    if (id === 'moveto') { openPagePicker('move', block.pos); return; }
    if (id === 'delete') { editor.chain().focus().deleteRange({ from: block.pos, to: block.pos + block.node.nodeSize }).run(); return; }
    const color = id.match(/^(color|background)-(\w+)$/);
    if (color) {
      // Notion block colours apply to the whole text of the block.
      const caret = editor.state.selection.from, range = { from: block.pos + 1, to: block.pos + block.node.nodeSize - 1 };
      const chain = editor.chain().focus().setTextSelection(range);
      (color[2] === 'default' ? chain.unsetMark('textColor') : chain.setMark('textColor', { [color[1]]: color[2] })).setTextSelection(caret).run();
      return;
    }
    if (id.startsWith('turn-')) {
      const target = id.slice(5), label = blocks.find(item => item.id === target)?.label;
      if (!label) return;
      setBlockMenu({ pos: block.pos, x: 0, y: 0 });
      transformBlock(label, blockActions[target].action);
    }
  }
  function openColors() {
    const { from, to } = TextSelection.between(editor.state.selection.$from, editor.state.selection.$to);
    const coords = editor.view.coordsAtPos(from);
    setColorMenu({ from, to, x: Math.max(8, Math.min(coords.left, window.innerWidth - 242)), y: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 440)) });
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.color-menu button')?.focus());
  }
  function applyColor(kind: 'color' | 'background', value: ColorId) {
    const range = colorMenu();
    if (range?.blockPos !== undefined) {
      const node = editor.state.doc.nodeAt(range.blockPos);
      if (node?.type.name === 'callout') editor.view.dispatch(closeHistory(editor.state.tr).setNodeMarkup(range.blockPos, undefined, { ...node.attrs, [kind]: value }));
      setColorMenu(undefined); editor.commands.focus(); return;
    }
    const chain = editor.chain().focus();
    if (range) chain.setTextSelection({ from: range.from, to: range.to });
    chain.setMark('textColor', { [kind]: value }).run();
    lastColor = { kind, value };
    try { localStorage.setItem('fotion-last-color', JSON.stringify(lastColor)); } catch { /* Formatting still works when browser storage is unavailable. */ }
    setColorMenu(undefined);
  }
  function insertMention(page: Page, range = mention()) {
    if (!range) return;
    setMention(undefined);
    editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, [{ type: 'pageMention', attrs: { id: page.id, label: page.title || 'Sans titre' } }, { type: 'text', text: ' ' }]).run();
  }
  /** Notion's @-menu: a date, an existing page, or a new sub-page named after the query. */
  async function chooseMention(option: MentionOption) {
    const range = mention(); if (!range) return;
    if (option.kind === 'page') { insertMention(option.page); return; }
    if (option.kind === 'date') {
      setMention(undefined);
      editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, [{ type: 'dateMention', attrs: { date: option.date } }, { type: 'text', text: ' ' }]).run();
      return;
    }
    setMention(undefined);
    const page = await props.onCreateSubpage(option.title);
    if (page) insertMention(page, range);
  }
  createEffect(() => {
    const editable = props.editable;
    // Locking must not emit an update, otherwise the page would be marked as modified.
    if (ready() && editor.isEditable !== editable) editor.setEditable(editable, false);
  });
  createEffect(() => {
    props.pages;
    if (ready()) editor.view.dispatch(editor.state.tr.setMeta('pageMentionsChanged', true).setMeta('addToHistory', false));
  });
  createEffect(() => {
    const range = mention(), index = mentionChoice(), count = mentionOptions().length;
    if (!ready()) return;
    const root = editor.view.dom;
    if (range) {
      root.setAttribute('aria-controls', 'page-mention-menu'); root.setAttribute('aria-autocomplete', 'list');
      if (count) root.setAttribute('aria-activedescendant', `page-mention-option-${Math.min(index, count - 1)}`);
      else root.removeAttribute('aria-activedescendant');
    } else { root.removeAttribute('aria-controls'); root.removeAttribute('aria-autocomplete'); root.removeAttribute('aria-activedescendant'); }
  });
  function updateMenus() {
    setRevision(n => n + 1);
    const { from, to, empty, $from } = editor.state.selection;
    const before = $from.parent.textBetween(0, $from.parentOffset, '\0');
    const candidate = empty && !$from.parent.type.spec.code && !editor.isActive('code') ? mentionQuery(before) : null;
    if (candidate) {
      const coords = editor.view.coordsAtPos(from);
      if (mention()?.query !== candidate.query) setMentionChoice(0);
      setMention({ from: from - candidate.length, to: from, query: candidate.query, x: Math.max(8, Math.min(coords.left, window.innerWidth - 320)), y: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 300)) });
    } else setMention(undefined);
    const command = empty && !$from.parent.type.spec.code && !editor.isActive('code') ? slashQuery(before) : null;
    const start = command ? from - command.length : -1;
    if (start !== dismissedSlash) dismissedSlash = -1;
    // A query that ends with a space and matches nothing closes the menu, as in Notion.
    if (command && start !== dismissedSlash && !(command.query.endsWith(' ') && !searchSlashCommands(command.query, blocks).length)) {
      const coords = editor.view.coordsAtPos(from);
      const above = coords.bottom + 8 + 380 > window.innerHeight && coords.top > window.innerHeight / 2;
      if (slash()?.query !== command.query) setChoice(0);
      setSlash({ from: start, to: from, query: command.query, above, x: Math.max(8, Math.min(coords.left, window.innerWidth - 332)), y: above ? window.innerHeight - coords.top + 8 : coords.bottom + 8 });
    } else setSlash(undefined);
    if (!empty && (editor.state.selection instanceof TextSelection || editor.state.selection instanceof AllSelection)) {
      const start = editor.view.coordsAtPos(from), end = editor.view.coordsAtPos(to);
      setSelection({ x: Math.max(12, Math.min((start.left + end.left) / 2 - 140, window.innerWidth - 460)), y: Math.max(8, start.top - 45) });
    } else setSelection(undefined);
  }
  function conversionTarget(label: string): ToggleTarget | undefined {
    if (label === 'Liste dépliante') return { toggle: true, level: 0 };
    const match = label.match(/^Titre dépliant ([123])$/);
    if (match) return { toggle: true, level: Number(match[1]) };
    if (editor.state.doc.nodeAt(blockMenu()?.pos ?? 0)?.type.name !== 'toggle') return;
    if (label === 'Texte') return { toggle: false, level: 0 };
    const heading = label.match(/^Titre ([123])$/);
    if (heading) return { toggle: false, level: Number(heading[1]) };
  }
  function canTransform(label: string) {
    const pos = blockMenu()?.pos; if (pos === undefined) return false;
    const target = conversionTarget(label);
    return target ? !!convertToggle(editor.state, pos, target) : editor.state.doc.nodeAt(pos)?.type.name !== 'toggle';
  }
  function transformBlock(label: string, action: (chain: ChainedCommands) => ChainedCommands) {
    const pos = blockMenu()?.pos; if (pos === undefined) return;
    const target = conversionTarget(label);
    if (target) {
      const tr = convertToggle(editor.state, pos, target);
      if (!tr) return;
      editor.view.dispatch(tr); editor.commands.focus();
    } else { selectBlock(pos); action(editor.chain().focus().clearNodes()).run(); }
    closeBlockMenu();
  }
  function closeBlockMenu() { setBlockMenu(undefined); setTransform(false); setBlockQuery(''); }
  function selectBlock(pos: number) {
    const selection = TextSelection.near(editor.state.doc.resolve(pos + 1));
    editor.commands.setTextSelection(selection.from);
  }
  function openBlockMenu(block: Block, x: number, y: number) {
    setSelection(undefined); setSlash(undefined); setTransform(false); setBlockQuery('');
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.kit-menu-search input')?.focus());
    setBlockMenu({ pos: block.pos, x: Math.max(8, Math.min(x, window.innerWidth - 260)), y: Math.max(8, Math.min(y, window.innerHeight - 330)) });
  }
  function insertBelow(block: Block, above = false) {
    const at = above ? block.pos : block.pos + block.node.nodeSize;
    const paragraph = { type: 'paragraph', content: [{ type: 'text', text: '/' }] };
    const content = isListItem(block.node) ? { type: block.node.type.name, content: [paragraph] } : paragraph;
    editor.chain().focus().insertContentAt(at, content).setTextSelection(at + (isListItem(block.node) ? 3 : 2)).run();
  }
  function duplicateBlock(pos: number) {
    const node = editor.state.doc.nodeAt(pos);
    if (node) editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
  }
  // Like Notion, the block targeted by the menu stays highlighted while the menu is open.
  // An overlay is used because ProseMirror re-renders nodes whose attributes are changed directly.
  const menuTarget = createMemo(() => {
    const pos = blockMenu()?.pos;
    const element = pos === undefined || !ready() ? null : editor.view.nodeDOM(pos);
    return element instanceof HTMLElement ? element.getBoundingClientRect() : undefined;
  });
  function moveBlock(direction: -1 | 1) {
    const pos = blockMenu()?.pos;
    if (pos === undefined) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    const resolved = editor.state.doc.resolve(pos);
    const index = resolved.index();
    const sibling = index + direction;
    if (sibling < 0 || sibling >= resolved.parent.childCount) return;
    const next = resolved.parent.child(sibling);
    const targetPos = direction === -1 ? pos - next.nodeSize : pos + node.nodeSize;
    const tr = moveBlockTransaction(editor.state, { pos, node }, { pos: targetPos, node: next }, direction === 1);
    if (tr) editor.view.dispatch(tr);
    closeBlockMenu();
    editor.commands.focus();
  }
  onMount(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fotion-last-color') || 'null');
      if (saved && ['color', 'background'].includes(saved.kind) && colorId(saved.value) === saved.value) lastColor = saved;
    } catch { /* Ignore invalid preferences without affecting the document. */ }
    editor = new Editor({
      element,
      extensions: [...editorExtensions(id => props.pages.find(page => page.id === id), trail, { pageId: () => props.pageId, pages: () => props.pages, update: props.onUpdatePage, createRow: (database, values) => props.onCreateSubpage('', { parent: database, ...(values ? { values } : {}) }), open: id => (props.onPeekPage ?? props.onOpenPage)(id) }), Placeholder.configure({ placeholder: 'Appuyez sur « / » pour les commandes…' })],
      content: props.content,
      editable: props.editable,
      contentType: 'markdown',
      editorProps: {
        handleDrop: (view, event) => {
          const files = [...(event.dataTransfer?.files || [])];
          if (!files.length || !editor.isEditable) return false;
          event.preventDefault();
          const target = view.posAtCoords({ left: event.clientX, top: event.clientY });
          void importFiles(files, target?.pos ?? editor.state.selection.from);
          return true;
        },
        handlePaste: (_view, event) => {
          const files = [...(event.clipboardData?.files || [])];
          if (!files.length || !editor.isEditable) return false;
          event.preventDefault();
          void importFiles(files, editor.state.selection.from);
          return true;
        },
        attributes: { class: 'prose', 'aria-label': 'Contenu de la page', role: 'textbox', 'aria-multiline': 'true', spellcheck: 'true' },
        handleDOMEvents: { mousedown: (view, event) => {
          if (!event.shiftKey || event.button !== 0) return false;
          const target = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const current = editor.state.selection;
          if (!target || !(current instanceof BlockSelection)) return false;
          const range = blockRange(editor.state.doc, current.anchorBlock + 1, target.pos);
          if (range) { view.dispatch(editor.state.tr.setSelection(range)); event.preventDefault(); return true; }
          return false;
        }, click: (view, event) => {
          const time = (event.target as HTMLElement).closest('time.date-mention');
          if (time && editor.isEditable) {
            const at = view.posAtDOM(time, 0), pos = editor.state.doc.nodeAt(at)?.type.name === 'dateMention' ? at : at - 1;
            const box = time.getBoundingClientRect();
            setDateEdit({ pos, x: Math.max(8, Math.min(box.left, window.innerWidth - 268)), y: Math.max(8, Math.min(box.bottom + 6, window.innerHeight - 220)) });
            event.preventDefault(); return true;
          }
          const link = (event.target as HTMLElement).closest('a[href]');
          const id = pageIdFromHref(link?.getAttribute('href') || '');
          if (!id) return false;
          event.preventDefault(); props.onOpenPage(id); return true;
        } },
        handleKeyDown: (_, event) => {
          if (event.isComposing) return false;
          // ProseMirror replays Backspace/Enter with synthetic events that have no target.
          const focusedMention = event.target instanceof Element ? event.target.closest('a[data-page-mention]') : null;
          if (focusedMention && event.key === 'Enter') { const id = pageIdFromHref(focusedMention.getAttribute('href') || ''); if (id) props.onOpenPage(id); event.preventDefault(); return true; }
          if (mention()) {
            if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
              const count = mentionOptions().length;
              if (count) setMentionChoice(i => (i + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
              document.querySelector('.mention-menu .chosen')?.scrollIntoView({ block: 'nearest' });
              event.preventDefault(); return true;
            }
            if (event.key === 'Enter' && mentionOptions()[mentionChoice()]) { void chooseMention(mentionOptions()[mentionChoice()]); event.preventDefault(); return true; }
            if (event.key === 'Escape') { setMention(undefined); event.preventDefault(); return true; }
          }
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); event.stopPropagation(); link(); return true; }
          if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'h' && lastColor) {
            applyColor(lastColor.kind, lastColor.value); event.preventDefault(); return true;
          }
          if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key === '/') {
            const block = blockAt(editor.state.doc, caretPosition(editor));
            if (block) { const coords = editor.view.coordsAtPos(editor.state.selection.from); openBlockMenu(block, coords.left, coords.bottom + 8); }
            event.preventDefault(); return true;
          }
          if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'd' && !(editor.state.selection instanceof BlockSelection)) {
            const block = blockAt(editor.state.doc, caretPosition(editor));
            if (block) duplicateBlock(block.pos);
            event.preventDefault(); return true;
          }
          if (event.altKey && event.shiftKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
            const block = blockAt(editor.state.doc, caretPosition(editor));
            if (block) { setBlockMenu({ pos: block.pos, x: 0, y: 0 }); moveBlock(event.key === 'ArrowUp' ? -1 : 1); }
            event.preventDefault(); return true;
          }
          if (!slash()) return false;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const count = options().length;
            if (count) setChoice(i => (i + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
            document.querySelector('.slash-menu .chosen')?.scrollIntoView({ block: 'nearest' });
            event.preventDefault(); return true;
          }
          if (event.key === 'Enter' && options().length) { apply(choice()); event.preventDefault(); return true; }
          if (event.key === 'Escape') { dismissedSlash = slash()!.from; setSlash(undefined); event.preventDefault(); return true; }
          return false;
        },
      },
      onUpdate: () => { props.onChange(editor.getMarkdown()); updateMenus(); },
      onSelectionUpdate: updateMenus,
      onFocus: updateMenus,
      onBlur: () => { setTimeout(() => { if (!editor.isFocused && !document.activeElement?.closest('.bubble-menu, .link-popover, .color-menu, .mention-menu')) setSelection(undefined); }, 180); },
    });
    setReady(true);
    props.onReady(editor);
    const close = (event: MouseEvent) => { if (!(event.target as HTMLElement).closest('.editor, .mention-menu')) setMention(undefined); if (!(event.target as HTMLElement).closest('.block-menu, .block-controls, .block-submenu')) closeBlockMenu(); };
    const scroll = (e: Event) => { if ((e.target as HTMLElement)?.closest?.('.popover')) return; setSelection(undefined); setSlash(undefined); setMention(undefined); setColorMenu(undefined); closeBlockMenu(); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMention(undefined); closeBlockMenu(); if (emojiAt()) { setEmojiAt(undefined); editor.commands.focus(); } if (dateEdit()) { setDateEdit(undefined); editor.commands.focus(); } if (pagePicker()) { setPagePicker(undefined); editor.commands.focus(); } setLinkDraft(undefined); setMediaDraft(undefined); if (colorMenu()) { setColorMenu(undefined); editor.commands.focus(); } } };
    window.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', close);
    window.addEventListener('scroll', scroll, true);
    // The image lightbox's « Remplacer » asks to reopen the media dialog for that node.
    const requestReplace = (event: Event) => { event.stopPropagation(); setMediaDraft(undefined); setMediaDraft({ kind: 'image', pos: (event as CustomEvent<number>).detail, replace: (event as CustomEvent<number>).detail }); };
    window.addEventListener('fotion-replace-image', requestReplace);
    onCleanup(() => { window.removeEventListener('fotion-replace-image', requestReplace); window.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', close); window.removeEventListener('scroll', scroll, true); props.onReady(undefined); editor.destroy(); });
  });
  function link() {
    const range = TextSelection.between(editor.state.selection.$from, editor.state.selection.$to);
    const coords = editor.view.coordsAtPos(range.from);
    setLinkError('');
    setLinkDraft({ value: editor.getAttributes('link').href || '', from: range.from, to: range.to, x: Math.max(8, Math.min(coords.left, window.innerWidth - 340)), y: Math.max(8, Math.min(coords.bottom + 10, window.innerHeight - 360)) });
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.link-popover input')?.focus());
  }
  function linkPage(page: Page) {
    const draft = linkDraft(); if (!draft) return;
    const chain = editor.chain().focus().setTextSelection({ from: draft.from, to: draft.to });
    if (draft.from === draft.to) chain.insertContent({ type: 'text', text: page.title || 'Sans titre', marks: [{ type: 'link', attrs: { href: pageHref(page.id) } }] }).unsetLink().run();
    else chain.setLink({ href: pageHref(page.id) }).run();
    setLinkDraft(undefined);
  }
  function saveLink() {
    const draft = linkDraft(); if (!draft) return;
    const value = draft.value.trim();
    if (value && !/^(https?:\/\/|mailto:)/i.test(value) && !pageIdFromHref(value)) { setLinkError('Utilisez une adresse https://, mailto: ou choisissez une page.'); return; }
    const chain = editor.chain().focus().setTextSelection({ from: draft.from, to: draft.to }).extendMarkRange('link');
    if (value) chain.setLink({ href: value }).run(); else chain.unsetLink().run();
    setLinkDraft(undefined);
  }
  return <>
    <div ref={element} class="editor" />
    <Show when={ready() && props.editable}><SelectionRectangle editor={editor}/></Show>
    <Show when={ready() && props.editable}><BlockControls editor={editor} onMenu={openBlockMenu} onAdd={insertBelow}/></Show>
    <Show when={selection()}>{position => <div class="bubble-menu" role="toolbar" aria-label="Mise en forme" style={{ left: `${position().x}px`, top: `${position().y}px` }} onMouseDown={e => e.preventDefault()}>
      <button title="Transformer en titre" onClick={() => { const block = blockAt(editor.state.doc, caretPosition(editor)); if (block) { openBlockMenu(block, position().x, position().y + 38); setTransform(true); } }}>{editor?.isActive('heading') ? `Titre ${editor.getAttributes('heading').level}` : 'Texte'} <ChevronDown size={12}/></button><span class="menu-separator"/>
      <button aria-label="Gras" classList={{ active: active('bold') }} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16}/></button>
      <button aria-label="Italique" classList={{ active: active('italic') }} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16}/></button>
      <button aria-label="Souligné" classList={{ active: active('underline') }} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={16}/></button>
      <button aria-label="Barré" classList={{ active: active('strike') }} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16}/></button>
      <button aria-label="Code en ligne" classList={{ active: active('code') }} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={16}/></button>
      <button aria-label="Ajouter un lien" onClick={link}><Link size={16}/></button>
      <span class="menu-separator"/>
      <button aria-label="Couleur du texte et du fond" aria-haspopup="menu" aria-expanded={!!colorMenu()} onClick={openColors}><span class="color-letter">A</span><ChevronDown size={12}/></button>
      <button aria-label="Effacer la mise en forme" title="Effacer la mise en forme" onClick={() => editor.chain().focus().unsetAllMarks().run()}>Tₓ</button>
    </div>}</Show>
    <Show when={colorMenu()}>{position => <><div class="dismiss-layer" onClick={() => { setColorMenu(undefined); editor.commands.focus(); }}/><div class="color-menu popover" role="menu" aria-label="Couleurs" style={{ left: `${position().x}px`, top: `${position().y}px` }} onKeyDown={e => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus(); e.preventDefault();
    }}>
      <For each={['color', 'background'] as const}>{kind => <>
        <div class="menu-label">{kind === 'color' ? 'Couleur du texte' : 'Couleur de fond'}</div>
        <For each={textColors}>{color => <button role="menuitemradio" aria-label={`${color.label}${kind === 'background' ? ' — fond' : ''}`} aria-checked={(revision(), (position().blockPos !== undefined ? editor.state.doc.nodeAt(position().blockPos!)?.attrs[kind] : editor.getAttributes('textColor')[kind]) || 'default') === color.id} onClick={() => applyColor(kind, color.id)}>
          <span aria-hidden="true" class="color-swatch" data-fotion-color={kind === 'color' ? color.id : 'default'} data-fotion-background={kind === 'background' ? color.id : 'default'} style={{ color: kind === 'color' ? color.text : 'inherit', 'background-color': kind === 'background' ? color.background : 'transparent' }}>A</span>
          {color.label}{kind === 'background' && color.id !== 'default' ? ' — fond' : ''}
          <Show when={(revision(), editor.getAttributes('textColor')[kind] || 'default') === color.id}><Check size={14} class="menu-end"/></Show>
        </button>}</For>
      </>}</For>
    </div></>}</Show>
    <Show when={mention()}>{position => <div id="page-mention-menu" class="mention-menu popover" role="listbox" aria-label="Mentionner une page" style={{ left: `${position().x}px`, top: `${position().y}px` }}>
      <For each={(['date', 'page', 'new'] as const).filter(kind => mentionOptions().some(option => option.kind === kind))}>{kind => <>
        <div class="menu-label">{kind === 'date' ? 'Date' : kind === 'page' ? 'Mentionner une page' : 'Nouvelle page'}</div>
        <For each={mentionOptions().filter(option => option.kind === kind)}>{option => { const i = () => mentionOptions().indexOf(option); return <button id={`page-mention-option-${i()}`} role="option" aria-selected={mentionChoice() === i()} classList={{ chosen: mentionChoice() === i() }} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setMentionChoice(i())} onClick={() => void chooseMention(option)}>
          {option.kind === 'date' ? <><CalendarDays size={16}/><span>{formatDate(option.date)}</span></> : option.kind === 'page' ? <><span>{option.page.icon || '📄'}</span><span>{option.page.title || 'Sans titre'}</span></> : <><Plus size={16}/><span>Nouvelle sous-page « {option.title} »</span></>}
        </button>; }}</For>
      </>}</For>
      <Show when={!mentionOptions().length}><p class="empty-message">Aucune page correspondante.</p></Show>
    </div>}</Show>
    <Show when={slash()}>{position => <div class="slash-menu popover" style={{ left: `${position().x}px`, ...(position().above ? { bottom: `${position().y}px` } : { top: `${position().y}px` }) }} onMouseDown={e => e.preventDefault()}>
      <div class="slash-scroll" role="listbox" aria-label="Types de blocs">
        <For each={optionGroups()}>{group => <div role="group" aria-label={group.name || 'Résultats'}>
          <Show when={group.name}><div class="slash-group">{group.name}</div></Show>
          <For each={group.items}>{item => { const index = () => options().indexOf(item); return <button role="option" title={item.description} aria-selected={choice() === index()} classList={{ chosen: choice() === index() }} onMouseMove={() => setChoice(index())} onClick={() => apply(index())}>
            <span class="slash-icon" aria-hidden="true">{item.icon()}</span><span class="slash-label">{item.label}</span><Show when={item.shortcut}><span class="slash-shortcut" aria-hidden="true">{item.shortcut}</span></Show>
          </button>; }}</For>
        </div>}</For>
        <Show when={!options().length}><p class="slash-empty">Aucun résultat</p></Show>
      </div>
      <button class="slash-footer" onClick={() => { dismissedSlash = slash()!.from; setSlash(undefined); editor.commands.focus(); }}><span>Fermer le menu</span><kbd>échap</kbd></button>
      <Show when={options()[choice()]}>{item => <div class="slash-preview" classList={{ left: position().x + 324 + 236 > window.innerWidth }} aria-hidden="true"><span class="slash-preview-icon">{item().icon()}</span><strong>{item().label}</strong><p>{item().description}</p><Show when={item().shortcut}><small>Raccourci : <kbd>{item().shortcut}</kbd> puis espace</small></Show></div>}</Show>
    </div>}</Show>
    <Show when={menuTarget()}>{rect => <div class="block-menu-target" style={{ left: `${rect().left}px`, top: `${rect().top}px`, width: `${rect().width}px`, height: `${rect().height}px` }}/>}</Show>
    <Show when={blockMenu()}>{position => <><div class="dismiss-layer" onClick={closeBlockMenu}/><Menu label="Options du bloc" class="block-menu" style={{ left: `${position().x}px`, top: `${position().y}px` }}>
      <MenuSearch label="Rechercher un type de bloc" placeholder="Rechercher des actions…" value={blockQuery()} onInput={value => { setBlockQuery(value); setTransform(true); }}/>
      <Show when={!transform()} fallback={<>
        <MenuItem icon={<ChevronRight size={14} class="back-chevron"/>} onClick={() => { setTransform(false); setBlockQuery(''); }}>Transformer en</MenuItem>
        <MenuDivider/>
        <div class="transform-options"><For each={filteredBlocks().filter(b => !['Séparateur', 'Tableau', 'Table des matières', 'Page', 'Image'].includes(b.label) && !b.id.startsWith('columns'))}>{item => <MenuItem icon={item.icon()} disabled={!canTransform(item.label)} title={!canTransform(item.label) ? 'Conversion indisponible pour préserver la structure du bloc.' : undefined} onClick={() => transformBlock(item.label, item.action)}>{item.label}</MenuItem>}</For></div>
      </>}>
        <MenuItem icon={<Trash2 size={16}/>} onClick={() => { const node = editor.state.doc.nodeAt(position().pos); if (node) editor.chain().focus().deleteRange({ from: position().pos, to: position().pos + node.nodeSize }).run(); closeBlockMenu(); }}>Supprimer</MenuItem>
        <MenuItem icon={<Copy size={16}/>} shortcut={`${modKey}+D`} onClick={() => { duplicateBlock(position().pos); closeBlockMenu(); }}>Dupliquer</MenuItem>
        <MenuItem icon={<Repeat2 size={16}/>} submenu onClick={() => setTransform(true)}>Transformer en</MenuItem>
        <Show when={editor.state.doc.nodeAt(position().pos)?.type.name === 'callout'}><MenuDivider/><MenuItem icon={<PaintRoller size={16}/>} submenu onClick={() => {
          const { pos, x, y } = position(); closeBlockMenu();
          setColorMenu({ from: pos + 1, to: pos + 1, blockPos: pos, x: Math.max(8, Math.min(x, window.innerWidth - 242)), y: Math.max(8, Math.min(y, window.innerHeight - 440)) });
          requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.color-menu button')?.focus());
        }}>Couleur</MenuItem></Show>
      </Show>
    </Menu></>}</Show>
    <Show when={linkDraft()}>{draft => <><div class="dismiss-layer" onClick={() => setLinkDraft(undefined)}/><form class="link-popover popover" style={{ left: `${draft().x}px`, top: `${draft().y}px` }} onSubmit={e => { e.preventDefault(); saveLink(); }}>
      <label for="link-url">Lien</label><div class="link-field"><Link size={16}/><input id="link-url" placeholder="Collez un lien…" value={draft().value} onInput={e => setLinkDraft({ ...draft(), value: e.currentTarget.value })}/><button type="submit" aria-label="Appliquer le lien"><Check size={16}/></button></div>
      <Show when={linkError()}><p class="field-error">{linkError()}</p></Show>
      <Show when={linkPages().length}><div class="link-page-options"><div class="menu-label">Pages de l’espace</div><For each={linkPages()}>{page => <button type="button" onClick={() => linkPage(page)}><span>{page.icon || '📄'}</span><span>{page.title || 'Sans titre'}</span></button>}</For></div></Show>
      <Show when={pageIdFromHref(draft().value)}><button type="button" onClick={() => { const id = pageIdFromHref(draft().value); if (id) props.onOpenPage(id); setLinkDraft(undefined); }}>Ouvrir la page liée</button></Show>
      <button type="button" onClick={() => { setLinkDraft({ ...draft(), value: '' }); saveLink(); }}>Supprimer le lien</button>
    </form></>}</Show>
    <Show when={dateEdit() && dateNode()}><div class="dismiss-layer" onClick={() => { setDateEdit(undefined); editor.commands.focus(); }}/><Menu label="Modifier la date" class="date-popover" style={{ position: 'fixed', left: `${dateEdit()!.x}px`, top: `${dateEdit()!.y}px` }}>
      <label class="date-field"><CalendarDays size={16}/><input type="date" aria-label="Date" value={(dateNode()!.attrs.date as string).slice(0, 10)} onInput={e => e.currentTarget.value && updateDate({ day: e.currentTarget.value })}/></label>
      <Show when={dateNode()!.attrs.reminder}><label class="date-field"><AlarmClock size={16}/><input type="time" aria-label="Heure du rappel" value={(dateNode()!.attrs.date as string).slice(11, 16)} onInput={e => e.currentTarget.value && updateDate({ time: e.currentTarget.value })}/></label></Show>
      <MenuDivider/>
      <Switch checked={!!dateNode()!.attrs.reminder} onChange={reminder => updateDate({ reminder })}>Rappel</Switch>
      <MenuItem icon={<Trash2 size={16}/>} onClick={() => { const edit = dateEdit()!; editor.chain().focus().deleteRange({ from: edit.pos, to: edit.pos + 1 }).run(); setDateEdit(undefined); }}>Supprimer</MenuItem>
    </Menu></Show>
    <Show when={pagePicker()}>{picker => <><div class="dismiss-layer" onClick={() => { setPagePicker(undefined); editor.commands.focus(); }}/><Menu label={picker().purpose === 'link' ? 'Lien vers une page' : 'Déplacer vers'} class="page-picker" style={{ position: 'fixed', left: `${picker().x}px`, top: `${picker().y}px` }} onKeyDown={e => { if (e.key === 'Enter' && pickerPages()[0]) { e.preventDefault(); void pickPage(pickerPages()[0]); } }}>
      <MenuSearch autofocus label="Rechercher une page" placeholder={picker().purpose === 'link' ? 'Lien vers une page…' : 'Déplacer le bloc vers…'} value={picker().query} onInput={query => setPagePicker({ ...picker(), query })}/>
      <For each={pickerPages()}>{page => <MenuItem icon={<span>{page.icon || '📄'}</span>} onClick={() => void pickPage(page)}>{page.title || 'Sans titre'}</MenuItem>}</For>
      <Show when={!pickerPages().length}><p class="empty-message">Aucune page trouvée.</p></Show>
    </Menu></>}</Show>
    <Show when={emojiAt()}>{position => <><div class="dismiss-layer" onClick={() => { setEmojiAt(undefined); editor.commands.focus(); }}/><EmojiPicker label="Insérer un emoji" style={{ position: 'fixed', left: `${position().x}px`, top: `${position().y}px` }} onPick={emoji => { setEmojiAt(undefined); editor.chain().focus().insertContent(emoji).run(); }}/></>}</Show>
    <Show when={mediaDraft()}>{draft => <MediaDialog kind={draft().kind} onClose={() => { setMediaDraft(undefined); editor.commands.focus(); }} onSubmit={result => { const { kind, pos, replace } = draft(); setMediaDraft(undefined); insertMedia(kind, pos, result, replace); }}/>}</Show>
    <Show when={ready() && (revision(), editor?.isActive('table'))}><div class="table-tools" role="toolbar" aria-label="Modifier le tableau">
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()}><Plus size={13}/>Ligne</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()}><Plus size={13}/>Colonne</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Ligne d’en-tête</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>Colonne d’en-tête</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()}>Supprimer la ligne</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()}>Supprimer la colonne</button>
    </div></Show>
  </>;
}
