import { createSignal, createMemo, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import { Search, House, ChevronDown, ChevronRight, ChevronsLeft, PanelLeft, Plus, Settings, Trash2, Star, MoreHorizontal, LockKeyhole, Check, ArrowUpRight, X, Download, Copy, Undo2, FolderOpen, Upload, Smile, ImagePlus, RefreshCw, ArrowLeft, ArrowRight, CircleHelp, CheckCheck, SquarePen, Pencil, FileText, CornerUpRight, GripVertical, Link, Clock, ArrowDownLeft, SlidersHorizontal } from 'lucide-solid';
import type { Editor } from '@tiptap/core';
import { PageTitle } from '../features/pages';
import { PageIndex, normalizeSearch } from '../../engine';
import { VersionHistory } from '../features/pages';
import { DocumentEditor } from '../features/editor';
import type { Page, PageEdit } from '../../engine';
import { byOrder, planPageMove, countWords, type PagePlacement } from '../../engine';
import { Menu, MenuItem, MenuDivider, MenuFootnote, MenuLabel, Switch, EmojiPicker, modKey } from '../kit';
import { SidebarSection, defaultSectionPrefs, type SectionPrefs } from '../features/sidebar';
import { SearchDialog } from '../features/search';

const blank: PageEdit = { title: '', icon: '', parent: null, favorite: false, cover: '', content: '', trashed: false };
const recoveryKey = 'fotion-recovery-v1';
const pageFromUrl = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } };
const pageUrl = (id: string) => `${location.origin}${location.pathname}#${encodeURIComponent(id)}`;
const showPageUrl = (id: string) => window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

export default function App() {
  const [pages, setPages] = createSignal<Page[]>([]);
  const [activeId, setActiveId] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [sidebar, setSidebar] = createSignal(window.innerWidth > 760);
  const [expanded, setExpanded] = createSignal(new Set<string>(['projets.md']));
  const [modal, setModal] = createSignal<'search' | 'settings' | 'trash' | 'files' | 'help' | 'move' | 'versions' | null>(null);
  const [menu, setMenu] = createSignal<'more' | 'customize' | 'icon' | 'cover' | null>(null);
  const [pageContext, setPageContext] = createSignal<{ id: string; x: number; y: number }>();
  const [movingPage, setMovingPage] = createSignal('');
  const [dragPage, setDragPage] = createSignal('');
  const [pageDrop, setPageDrop] = createSignal<{ id: string | null; placement: PagePlacement }>();
  const [sidebarWidth, setSidebarWidth] = createSignal(Math.max(220, Math.min(420, Number(localStorage.getItem('fotion-sidebar-width')) || 240)));
  const [query, setQuery] = createSignal('');
  const [status, setStatus] = createSignal<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const [error, setError] = createSignal('');
  const [notice, setNotice] = createSignal('');
  const [theme, setTheme] = createSignal(localStorage.getItem('fotion-theme') || 'light');
  const [editor, setEditor] = createSignal<Editor>();
  const [history, setHistory] = createSignal<string[]>([]);
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [restoringHistory, setRestoringHistory] = createSignal(false);
  const [editorEpoch, setEditorEpoch] = createSignal(0);
  const editorKey = createMemo(() => ({ id: activeId(), epoch: editorEpoch() }));
  const [busy, setBusy] = createSignal(false);
  const dirty = new Set<string>();
  let timer: ReturnType<typeof setTimeout>;
  let noticeTimer: ReturnType<typeof setTimeout>;
  let running: Promise<boolean> | undefined;
  let titleInput!: HTMLTextAreaElement;
  let importInput!: HTMLInputElement;
  const active = createMemo(() => pages().find(p => p.id === activeId()));
  const wide = () => active()?.fullWidth ?? false;
  const small = () => active()?.smallText ?? false;
  const font = () => active()?.font ?? 'default';
  const locked = () => active()?.locked ?? false;
  const backlinksMode = () => active()?.backlinks ?? 'popover';
  const [menuAnchor, setMenuAnchor] = createSignal({ x: 0, y: 0 });
  const visible = createMemo(() => pages().filter(p => !p.trashed).sort(byOrder));
  const roots = createMemo(() => visible().filter(p => !p.parent || !visible().some(parent => parent.id === p.parent)));
  const children = (id: string) => visible().filter(p => p.parent === id);
  const pageIndex = new PageIndex();
  const indexed = createMemo(() => { pageIndex.update(pages()); return pages(); });
  const searchResults = createMemo(() => pageIndex.search(indexed(), query()));
  const [trashQuery, setTrashQuery] = createSignal('');
  const [confirmDelete, setConfirmDelete] = createSignal('');
  const trashed = createMemo(() => { const q = normalizeSearch(trashQuery().trim()); return pages().filter(p => p.trashed && normalizeSearch(p.title || 'Sans titre').includes(q)).sort((a, b) => b.updated.localeCompare(a.updated)); });
  function openTrash() { setTrashQuery(''); setConfirmDelete(''); setModal('trash'); }
  async function removeForever(id: string) {
    if (!(await flush())) return;
    const page = pages().find(p => p.id === id); if (!page) return;
    try { await api(`/api/pages/${encodeURIComponent(id)}`, 'DELETE', { version: page.version }); setPages(list => list.filter(p => p.id !== id)); toast('Page supprimée définitivement'); }
    catch (e) { setError((e as Error).message); }
    finally { setConfirmDelete(''); }
  }
  const parentPath = (page: Page) => { const parent = pages().find(p => p.id === page.parent); return parent ? parent.title || 'Sans titre' : ''; };
  const openInNewTab = (id: string) => window.open(pageUrl(id), '_blank', 'noopener');
  const results = createMemo(() => searchResults().map(result => result.page));
  const incoming = createMemo(() => pageIndex.backlinks(indexed(), activeId()));
  const [backlinksOpen, setBacklinksOpen] = createSignal(false);
  const breadcrumbs = createMemo(() => {
    const result: Page[] = [];
    let parent = active()?.parent;
    const seen = new Set([activeId()]);
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const page = pages().find(p => p.id === parent);
      if (!page) break;
      result.unshift(page); parent = page.parent;
    }
    return result;
  });
  function toast(text: string) { setNotice(text); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => setNotice(''), 3200); }
  function remember() {
    try { localStorage.setItem(recoveryKey, JSON.stringify(pages().filter(p => dirty.has(p.id)))); }
    catch { setError('La copie de secours du navigateur est indisponible. Gardez cet onglet ouvert jusqu’à l’enregistrement.'); }
  }
  function update(patch: Partial<PageEdit>, id = activeId()) {
    setPages(list => list.map(p => p.id === id ? { ...p, ...patch } : p));
    dirty.add(id); setStatus('pending'); remember();
    clearTimeout(timer); timer = setTimeout(() => void flush(), 550);
  }
  async function flush() {
    clearTimeout(timer);
    if (running) return running;
    running = (async () => {
      while (dirty.size) {
        const id = dirty.values().next().value!;
        const snapshot = pages().find(p => p.id === id);
        if (!snapshot) { dirty.delete(id); continue; }
        dirty.delete(id); setStatus('saving');
        try {
          const saved = await api<Page>(`/api/pages/${encodeURIComponent(id)}`, 'PUT', snapshot);
          setPages(list => list.map(p => p.id === id ? { ...p, version: saved.version, updated: saved.updated } : p));
          remember();
        } catch (e) {
          dirty.add(id); remember(); setStatus('error'); setError((e as Error).message); return false;
        }
      }
      setStatus('saved'); setError(''); return true;
    })();
    try { return await running; } finally { running = undefined; }
  }
  async function navigate(id: string, record = true) {
    const target = pages().find(page => page.id === id);
    if (!target || target.trashed) { toast(target?.trashed ? 'Cette page est dans la corbeille.' : 'Cette page est introuvable dans le coffre.'); return; }
    if (id === activeId()) { setModal(null); return; }
    if (!(await flush())) return;
    setActiveId(id); setBacklinksOpen(false); setMenu(null); setModal(null);
    localStorage.setItem('fotion-active', id); showPageUrl(id);
    if (record) {
      const next = [...history().slice(0, historyIndex() + 1), id];
      setHistory(next); setHistoryIndex(next.length - 1);
    }
    document.querySelector('.main-scroll')?.scrollTo(0, 0);
    if (window.innerWidth < 760) setSidebar(false);
  }
  async function back(direction: number) {
    const index = historyIndex() + direction;
    if (index < 0 || index >= history().length) return;
    await navigate(history()[index], false);
    if (activeId() === history()[index]) setHistoryIndex(index);
  }
  async function create(parent: string | null = null, duplicate = false, sourceId = activeId()) {
    if (busy() || !(await flush())) return;
    setBusy(true);
    try {
      const source = duplicate ? pages().find(p => p.id === sourceId) : undefined;
      const page = await api<Page>('/api/pages', 'POST', source ? { ...source, title: `${source.title} (copie)`, favorite: false } : { ...blank, parent, order: Math.max(0, ...visible().filter(p => p.parent === parent).map(p => p.order ?? 0)) + 1024 });
      setPages(list => [...list, page]);
      if (parent) setExpanded(s => new Set([...s, parent]));
      await navigate(page.id);
      requestAnimationFrame(() => { titleInput?.focus(); titleInput?.select(); });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  /** Creates a sub-page of the current page without leaving it (Notion's « Nouvelle sous-page » in the @-menu). */
  async function createSubpage(title: string) {
    const parent = activeId();
    try {
      const page = await api<Page>('/api/pages', 'POST', { ...blank, title, parent, order: Math.max(0, ...visible().filter(p => p.parent === parent).map(p => p.order ?? 0)) + 1024 });
      setPages(list => [...list, page]); setExpanded(s => new Set([...s, parent]));
      return page;
    } catch (e) { setError((e as Error).message); return undefined; }
  }
  /** Appends a block's Markdown to another page and saves it (Notion's « Déplacer vers » on a block). */
  async function moveBlockTo(markdown: string, targetId: string) {
    const target = pages().find(p => p.id === targetId); if (!target) return false;
    update({ content: target.content.trimEnd() ? `${target.content.trimEnd()}\n\n${markdown}` : markdown }, targetId);
    if (!(await flush())) return false;
    toast(`Bloc déplacé vers « ${target.title || 'Sans titre'} »`);
    return true;
  }
  async function load() {
    try {
      const fetched = await api<Page[]>('/api/pages');
      let recovered: Page[] = [];
      try { recovered = JSON.parse(localStorage.getItem(recoveryKey) || '[]'); } catch { /* A malformed recovery must not prevent opening disk files. */ }
      if (!Array.isArray(recovered)) recovered = [];
      const restored = fetched.map(p => {
        const draft = recovered.find(d => d.id === p.id && typeof d.content === 'string');
        if (!draft) return p;
        dirty.add(p.id);
        return { ...p, ...draft };
      });
      setActiveId('');
      setPages(restored);
      const linked = pageFromUrl();
      const preferred = linked || localStorage.getItem('fotion-active') || 'bienvenue.md';
      const first = restored.find(p => p.id === preferred && !p.trashed) || restored.find(p => !p.trashed);
      if (linked && first?.id !== linked) toast('La page de ce lien est introuvable ou dans la corbeille.');
      if (first) { setActiveId(first.id); setHistory([first.id]); setHistoryIndex(0); showPageUrl(first.id); }
      if (dirty.size) { setStatus('pending'); toast('Un brouillon non enregistré a été récupéré.'); void flush(); }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  createEffect(() => { document.title = `${active()?.title || 'Sans titre'} — Fotion`; });
  async function openVersions() {
    if (!(await flush())) return;
    setMenu(null); setModal('versions');
  }
  async function restoreVersion(snapshotVersion: string) {
    if (restoringHistory()) return;
    setRestoringHistory(true);
    const id = activeId();
    try {
      if (!(await flush())) throw new Error('Enregistrez ou exportez le brouillon actuel avant de restaurer.');
      const current = pages().find(page => page.id === id);
      if (!current) throw new Error('Page introuvable.');
      const saved = await api<Page>(`/api/pages/${encodeURIComponent(id)}/restore`, 'POST', { snapshotVersion, version: current.version });
      setPages(list => list.map(page => page.id === id ? saved : page));
      setEditorEpoch(n => n + 1); setModal(null); setStatus('saved'); setError('');
      toast('Version restaurée. La version remplacée reste dans l’historique.');
    } finally { setRestoringHistory(false); }
  }
  function exportPage() {
    const p = active(); if (!p) return;
    const text = `---\ntitle: ${JSON.stringify(p.title)}\nicon: ${JSON.stringify(p.icon)}\n---\n\n${p.content}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${p.title.replace(/[/\\:*?"<>|]/g, '-') || 'Sans titre'}.md`; a.click(); URL.revokeObjectURL(url);
    setMenu(null); toast('Page exportée en Markdown');
  }
  async function importFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Le fichier doit faire moins de 2 Mo.');
      const raw = await file.text();
      const page = await api<Page>('/api/import', 'POST', { name: file.name, raw });
      setPages(list => [...list, page]); await navigate(page.id); toast('Document Markdown importé');
    } catch (e) { setError((e as Error).message); }
    input.value = '';
  }
  async function trash(id = activeId()) {
    if (!pages().some(p => p.id === id)) return;
    update({ trashed: true }, id);
    setPageContext(undefined);
    if (!(await flush())) return;
    setMenu(null);
    if (id !== activeId()) { toast('Page déplacée dans la corbeille'); return; }
    const next = visible()[0];
    if (next) await navigate(next.id); else setActiveId('');
    toast('Page déplacée dans la corbeille');
  }
  function openAppearance(kind: 'icon' | 'cover', element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setMenuAnchor({ x: Math.max(8, Math.min(rect.left, window.innerWidth - 345)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 315)) });
    setMenu(menu() === kind ? null : kind);
  }
  async function copyLink(id = activeId()) {
    setMenu(null); setPageContext(undefined);
    try { await navigator.clipboard.writeText(pageUrl(id)); toast('Lien copié dans le presse-papiers'); }
    catch { toast('Impossible de copier le lien.'); }
  }
  function preference(name: string, value: string) { localStorage.setItem(`fotion-${name}`, value); }
  function applyTheme(value: string) { setTheme(value); preference('theme', value); document.documentElement.dataset.theme = value; }
  function openSearch() { setModal('search'); }
  createEffect(() => {
    if (!modal()) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('.modal input, .modal button')?.focus());
    onCleanup(() => { cancelAnimationFrame(frame); previous?.focus(); });
  });
  onMount(() => {
    applyTheme(theme()); void load();
    const keydown = (e: KeyboardEvent) => {
      if (restoringHistory()) { if (e.key === 'Escape' || e.metaKey || e.ctrlKey) e.preventDefault(); return; }
      if ((e.metaKey || e.ctrlKey) && ['k', 'p'].includes(e.key.toLowerCase())) { e.preventDefault(); openSearch(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void flush(); }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l' && activeId()) { e.preventDefault(); void copyLink(); }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setSidebar(!sidebar()); }
      if (e.key === 'Escape') { setModal(null); setMenu(null); setPageContext(undefined); setDragPage(''); setPageDrop(undefined); }
    };
    const followUrl = () => { const id = pageFromUrl(); if (id && id !== activeId()) void navigate(id); };
    const unload = (e: BeforeUnloadEvent) => { if (dirty.size || running) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('keydown', keydown); window.addEventListener('beforeunload', unload); window.addEventListener('hashchange', followUrl);
    onCleanup(() => { clearTimeout(timer); clearTimeout(noticeTimer); window.removeEventListener('keydown', keydown); window.removeEventListener('beforeunload', unload); window.removeEventListener('hashchange', followUrl); });
  });
  type SectionKey = 'favorites' | 'private';
  const readSections = () => { try { return JSON.parse(localStorage.getItem('fotion-sidebar-sections') || '{}'); } catch { return {}; } };
  const savedSections = readSections();
  const [sectionOrder, setSectionOrder] = createSignal<SectionKey[]>(Array.isArray(savedSections.order) && savedSections.order.length === 2 ? savedSections.order : ['favorites', 'private']);
  const [sectionPrefs, setSectionPrefs] = createSignal<Record<SectionKey, SectionPrefs>>({ favorites: { ...defaultSectionPrefs, ...savedSections.favorites }, private: { ...defaultSectionPrefs, ...savedSections.private } });
  const persistSections = () => { try { localStorage.setItem('fotion-sidebar-sections', JSON.stringify({ order: sectionOrder(), ...sectionPrefs() })); } catch { /* Layout preferences are optional. */ } };
  const saveSectionPrefs = (key: SectionKey, prefs: SectionPrefs) => { setSectionPrefs(all => ({ ...all, [key]: prefs })); persistSections(); };
  const moveSection = (key: SectionKey, direction: -1 | 1) => { setSectionOrder(order => { const next = [...order], i = next.indexOf(key), j = i + direction; if (j < 0 || j >= next.length) return order; [next[i], next[j]] = [next[j], next[i]]; return next; }); persistSections(); };
  const toggleExpanded = (id: string) => setExpanded(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  async function movePage(id: string, target: string | null, placement: PagePlacement) {
    const plan = planPageMove(pages(), id, target, placement);
    setDragPage(''); setPageDrop(undefined); setPageContext(undefined);
    if (!plan.length) return;
    for (const item of plan) update({ parent: item.parent, order: item.order }, item.id);
    if (await flush()) {
      if (placement === 'inside' && target) setExpanded(s => new Set([...s, target]));
      setModal(null); toast('Page déplacée');
    }
  }
  function resizeSidebar(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const start = event.clientX, width = sidebarWidth();
    const move = (e: PointerEvent) => setSidebarWidth(Math.max(220, Math.min(420, width + e.clientX - start)));
    const end = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end); preference('sidebar-width', String(sidebarWidth())); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  }
  function openPageContext(id: string, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setPageContext({ id, x: Math.min(rect.right + 6, window.innerWidth - 260), y: Math.max(8, Math.min(rect.top, window.innerHeight - 275)) });
  }
  function PageRow(props: { page: Page; depth?: number; favorite?: boolean; ancestors?: string[] }) {
    const depth = () => props.depth || 0;
    const ancestors = () => props.ancestors || [];
    return <>
      <div class="page-row" classList={{ selected: activeId() === props.page.id, 'page-drag-source': dragPage() === props.page.id, 'drop-before': pageDrop()?.id === props.page.id && pageDrop()?.placement === 'before', 'drop-after': pageDrop()?.id === props.page.id && pageDrop()?.placement === 'after', 'drop-inside': pageDrop()?.id === props.page.id && pageDrop()?.placement === 'inside' }} style={{ 'padding-left': `${8 + depth() * 16}px` }}
        draggable={!props.favorite}
        onDragStart={e => { if (props.favorite) { e.preventDefault(); return; } setDragPage(props.page.id); e.dataTransfer!.effectAllowed = 'move'; e.dataTransfer!.setData('text/x-fotion-page', props.page.id); }}
        onDragOver={e => { if (!dragPage() || props.favorite) return; const rect = e.currentTarget.getBoundingClientRect(); const offset = e.clientY - rect.top; const placement = offset < 8 ? 'before' : offset > rect.height - 8 ? 'after' : 'inside'; if (!planPageMove(pages(), dragPage(), props.page.id, placement).length) { setPageDrop(undefined); return; } e.preventDefault(); e.dataTransfer!.dropEffect = 'move'; setPageDrop({ id: props.page.id, placement }); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); const drop = pageDrop(); if (dragPage() && drop?.id === props.page.id) void movePage(dragPage(), drop.id, drop.placement); }}
        onDragEnd={() => { setDragPage(''); setPageDrop(undefined); }}
        onContextMenu={e => { e.preventDefault(); openPageContext(props.page.id, e.currentTarget); }}>
        <Show when={!props.favorite}><button class="tree-toggle" aria-label={`${expanded().has(props.page.id) ? 'Replier' : 'Déplier'} ${props.page.title}`} onClick={() => toggleExpanded(props.page.id)}><ChevronRight size={12} classList={{ rotated: expanded().has(props.page.id) }}/></button></Show>
        <button class="page-link" onClick={() => void navigate(props.page.id)}><span class="page-emoji">{props.page.icon || <FileText size={16}/>}</span><span class="truncate">{props.page.title || 'Sans titre'}</span></button>
        <button class="row-more icon-button" aria-label={`Options de ${props.page.title || 'Sans titre'}`} onClick={e => openPageContext(props.page.id, e.currentTarget)}><MoreHorizontal size={16}/></button>
        <button class="row-add icon-button" aria-label={`Ajouter une sous-page à ${props.page.title}`} onClick={() => void create(props.page.id)}><Plus size={14}/></button>
      </div>
      <Show when={!props.favorite && expanded().has(props.page.id) && !ancestors().includes(props.page.id)}>
        <For each={children(props.page.id)}>{child => <PageRow page={child} depth={depth() + 1} ancestors={[...ancestors(), props.page.id]}/>}</For>
        <Show when={!children(props.page.id).length}><div class="no-subpage" style={{ 'padding-left': `${40 + depth() * 16}px` }}>Aucune sous-page</div></Show>
      </Show>
    </>;
  }

  return <div class="app-shell">
    <input ref={importInput} type="file" accept=".md,.markdown,text/markdown" hidden onChange={importFile}/>
    <Show when={sidebar()}>
      <div class="mobile-sidebar-scrim" onClick={() => setSidebar(false)}/>
      <aside class="sidebar" aria-label="Navigation principale" style={{ width: `${sidebarWidth()}px`, "--sidebar-width": `${sidebarWidth()}px` }}>
        <div class="sidebar-resizer" role="separator" aria-label="Largeur de la barre latérale" aria-orientation="vertical" aria-valuemin={220} aria-valuemax={420} aria-valuenow={sidebarWidth()} tabIndex={0} onPointerDown={resizeSidebar} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setSidebarWidth(w => Math.max(220, Math.min(420, w + (e.key === 'ArrowLeft' ? -10 : 10)))); preference('sidebar-width', String(sidebarWidth())); } }}/>
        <div class="workspace"><button class="workspace-title" onClick={() => setModal('settings')}><span class="avatar">S</span><span>Espace de Sohane</span><ChevronDown size={13}/></button><button class="icon-button collapse-sidebar" aria-label="Fermer la barre latérale" onClick={() => setSidebar(false)}><ChevronsLeft size={17}/></button><button class="icon-button new-page-button" aria-label="Nouvelle page" title="Créer une page" onClick={() => void create()}><SquarePen size={17}/></button></div>
        <nav class="primary-nav">
          <button onClick={openSearch}><Search size={18}/><span>Rechercher</span><kbd>⌘ P</kbd></button>
          <button onClick={() => { const home = visible().find(p => p.id === 'bienvenue.md') || visible()[0]; if (home) void navigate(home.id); }}><House size={18}/><span>Accueil</span></button>
          <button onClick={() => setModal('settings')}><Settings size={18}/><span>Paramètres</span></button>
        </nav>
        <div class="sidebar-scroll">
          <For each={sectionOrder()}>{(key, index) => <Show when={key === 'private'} fallback={<Show when={visible().some(p => p.favorite)}>
            <SidebarSection title="Favoris" pages={visible().filter(p => p.favorite)} prefs={sectionPrefs().favorites} onPrefs={prefs => saveSectionPrefs('favorites', prefs)} row={page => <PageRow page={page} favorite/>} onOpen={id => void navigate(id)} canMoveUp={index() > 0} canMoveDown={index() < sectionOrder().length - 1} onMove={direction => moveSection(key, direction)}/>
          </Show>}>
            <SidebarSection title="Privé" pages={roots()} prefs={sectionPrefs().private} onPrefs={prefs => saveSectionPrefs('private', prefs)} row={page => <PageRow page={page}/>} onOpen={id => void navigate(id)} onCreate={() => void create()} canMoveUp={index() > 0} canMoveDown={index() < sectionOrder().length - 1} onMove={direction => moveSection(key, direction)}
              headerProps={{ classList: { 'drop-inside': pageDrop()?.placement === 'root' }, onDragOver: e => { if (!dragPage()) return; e.preventDefault(); setPageDrop({ id: null, placement: 'root' }); }, onDrop: e => { e.preventDefault(); if (dragPage()) void movePage(dragPage(), null, 'root'); } }}
              empty={<button class="add-page" disabled={busy()} onClick={() => void create()}><Plus size={17}/>Ajouter une page</button>}/>
          </Show>}</For>
          <div class="sidebar-divider"/>
          <button class="utility-link" onClick={() => importInput.click()}><Upload size={17}/>Importer</button>
          <button class="utility-link" onClick={openTrash}><Trash2 size={17}/>Corbeille</button>
        </div>
        <button class="vault-status" onClick={() => setModal('files')}><span class="local-dot"/><span>Enregistré sur cet ordinateur</span><ChevronRight size={13}/></button>
        <div class="sidebar-footer"><button onClick={() => setModal('files')}><FolderOpen size={15}/>Mes fichiers</button><button class="icon-button" aria-label="Aide et raccourcis" onClick={() => setModal('help')}><CircleHelp size={17}/></button></div>
      </aside>
    </Show>
    <main class="main-panel">
      <header class="topbar">
        <Show when={!sidebar()}><button class="icon-button" aria-label="Ouvrir la barre latérale" onClick={() => setSidebar(true)}><PanelLeft size={19}/></button></Show>
        <div class="history-buttons"><button class="icon-button" aria-label="Page précédente" disabled={historyIndex() <= 0} onClick={() => void back(-1)}><ArrowLeft size={16}/></button><button class="icon-button" aria-label="Page suivante" disabled={historyIndex() >= history().length - 1} onClick={() => void back(1)}><ArrowRight size={16}/></button></div>
        <div class="breadcrumb"><For each={breadcrumbs()}>{p => <><button onClick={() => void navigate(p.id)}>{p.icon} <span>{p.title}</span></button><span class="slash-divider">/</span></>}</For><span class="breadcrumb-current">{active()?.icon || <FileText size={16}/>}<span class="truncate">{active()?.title || 'Mon espace'}</span></span></div>
        <span class="private-indicator"><LockKeyhole size={12}/>Privé</span>
        <Show when={locked()}><button class="locked-indicator" title="Déverrouiller la page" onClick={() => update({ locked: false })}><LockKeyhole size={13}/>Verrouillée</button></Show>
        <div class="topbar-actions"><button class="save-status" classList={{ 'save-error': status() === 'error' }} onClick={() => void flush()} title="Enregistrer · ⌘ S"><Show when={status() === 'saved'} fallback={<span class="status-dot"/>}><CheckCheck size={13}/></Show><span>{status() === 'saved' ? 'Enregistré' : status() === 'saving' ? 'Enregistrement…' : status() === 'error' ? 'Non enregistré' : 'Modifications…'}</span></button>
          <button class="icon-button" aria-label="Historique de la page" title="Historique de la page" disabled={!active()} onClick={() => void openVersions()}><Clock size={19}/></button>
          <button class="icon-button" aria-label={active()?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} disabled={!active()} onClick={() => update({ favorite: !active()?.favorite })}><Star size={19} classList={{ starred: active()?.favorite }}/></button>
          <button class="icon-button" aria-label="Options de la page" disabled={!active()} onClick={() => setMenu(menu() === 'more' ? null : 'more')}><MoreHorizontal size={22}/></button>
        </div>
      </header>
      <Show when={error()}><div class="error-banner" role="alert"><span>{error()}</span><button onClick={exportPage}>Exporter ma copie</button><button onClick={() => void flush()}>Réessayer</button></div></Show>
      <div class="main-scroll" onScroll={() => { if (menu() === 'icon' || menu() === 'cover') setMenu(null); }}>
        <Show when={!loading()} fallback={<div class="loading">Ouverture de votre espace…</div>}>
          <Show when={active()} fallback={<div class="empty-workspace"><span>📝</span><h1>Une page blanche, mille possibilités.</h1><p>Créez votre première page pour commencer.</p><button class="primary-button" onClick={() => void create()}>Créer une page</button></div>}>
            <Show when={active()?.cover}><div class={`page-cover cover-${active()?.cover}`}><Show when={active()?.cover === 'landscape'}><img src="/landscape.svg" alt="Paysage illustré de montagnes et de forêts"/></Show><button class="cover-change" onClick={e => openAppearance('cover', e.currentTarget)}>Changer la couverture</button></div></Show>
            <article class="document" classList={{ 'with-cover': !!active()?.cover, 'full-width': wide(), 'small-text': small(), 'serif-font': font() === 'serif', 'mono-font': font() === 'mono' }}>
              <Show when={active()?.icon}><div class="page-icon-wrap"><button class="page-icon" aria-label="Changer l’icône de la page" disabled={locked()} onClick={e => openAppearance('icon', e.currentTarget)}>{active()?.icon}</button></div></Show>
              <Show when={!locked()}><div class="page-customize"><button onClick={e => openAppearance('icon', e.currentTarget)}><Smile size={14}/>{active()?.icon ? 'Changer l’icône' : 'Ajouter une icône'}</button><button onClick={e => openAppearance('cover', e.currentTarget)}><ImagePlus size={14}/>{active()?.cover ? 'Changer la couverture' : 'Ajouter une couverture'}</button></div></Show>
              <PageTitle inputRef={element => { titleInput = element; }} readOnly={locked()} value={active()?.title || ''} font={font()} onChange={title => update({ title })} onEnter={() => editor()?.commands.focus('start')}/>
              <Show when={incoming().length && backlinksMode() !== 'off'}><div class="backlinks"><Show when={backlinksMode() === 'popover'}><button class="backlinks-toggle" aria-expanded={backlinksOpen()} onClick={() => setBacklinksOpen(!backlinksOpen())}><ArrowDownLeft size={14}/>{incoming().length} lien{incoming().length > 1 ? 's' : ''} entrant{incoming().length > 1 ? 's' : ''}</button></Show><Show when={backlinksMode() === 'expanded' || backlinksOpen()}><div class="backlinks-list" classList={{ "kit-menu": backlinksMode() === 'popover', "backlinks-popover": backlinksMode() === 'popover' }} role="list" aria-label="Lié à cette page"><div class="backlinks-label">Lié à cette page</div><For each={incoming()}>{page => <button role="listitem" onClick={() => void navigate(page.id)}><ArrowDownLeft size={14} class="backlink-arrow"/><span>{page.icon || '📄'}</span><span class="backlink-title">{page.title || 'Sans titre'}</span><Show when={parentPath(page)}><span class="backlink-parent">{parentPath(page)}</span></Show></button>}</For></div></Show></div></Show>
              <Show when={editorKey().id ? editorKey() : undefined} keyed>{key => <DocumentEditor content={pages().find(p => p.id === key.id)?.content || ''} onChange={content => update({ content }, key.id)} onReady={setEditor} onCreatePage={() => void create(key.id)} onCreateSubpage={createSubpage} onMoveBlock={moveBlockTo} onError={setError} pageId={key.id} pages={visible()} onOpenPage={id => void navigate(id)} editable={!locked()}/>}</Show>
              <Show when={children(activeId()).length || activeId() === 'bienvenue.md'}><div class="child-pages"><For each={activeId() === 'bienvenue.md' ? visible().filter(p => ['projets.md', 'notes.md', 'lectures.md'].includes(p.id)) : children(activeId())}>{page => <button onClick={() => void navigate(page.id)}><span>{page.icon}</span><span class="child-page-title">{page.title}</span><ArrowUpRight size={15}/></button>}</For></div></Show>
              <button class="new-subpage" onClick={() => void create(activeId())}><Plus size={15}/>Ajouter une sous-page</button>

            </article>
          </Show>
        </Show>
      </div>
      <button class="help-button" aria-label="Afficher l’aide" onClick={() => setModal('help')}>?</button>
    </main>
    <Show when={menu()}><div class="dismiss-layer" onClick={() => setMenu(null)}/></Show>
    <Show when={menu() === 'more'}><Menu label="Options de la page" class="page-menu">
      <MenuLabel>Style</MenuLabel>
      <div class="font-picker"><For each={[['default', 'Ag', 'Par défaut'], ['serif', 'Ag', 'Serif'], ['mono', 'Ag', 'Mono']]}>{item => <button classList={{ chosen: font() === item[0] }} onClick={() => { update({ font: item[0] as 'default' | 'serif' | 'mono' }); }}><strong class={`font-${item[0]}`}>{item[1]}</strong><small>{item[2]}</small></button>}</For></div>
      <Switch checked={small()} onChange={smallText => update({ smallText })}>Petit texte</Switch>
      <Switch checked={wide()} onChange={fullWidth => update({ fullWidth })}>Pleine largeur</Switch>
      <MenuDivider/>
      <MenuItem icon={<SlidersHorizontal size={16}/>} onClick={() => setMenu('customize')}>Personnaliser la page</MenuItem>
      <Switch checked={locked()} onChange={locked => update({ locked })}>Verrouiller la page</Switch>
      <MenuDivider/>
      <MenuItem icon={<Star size={16}/>} onClick={() => { update({ favorite: !active()?.favorite }); setMenu(null); }}>{active()?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</MenuItem>
      <MenuItem icon={<Link size={16}/>} shortcut={`${modKey}+L`} onClick={() => void copyLink()}>Copier le lien</MenuItem>
      <MenuItem icon={<Copy size={16}/>} onClick={() => void create(null, true)}>Dupliquer</MenuItem>
      <MenuItem icon={<CornerUpRight size={16}/>} onClick={() => { setMovingPage(activeId()); setQuery(''); setModal('move'); setMenu(null); }}>Déplacer vers</MenuItem>
      <MenuDivider/>
      <MenuItem icon={<Undo2 size={16}/>} shortcut={`${modKey}+Z`} onClick={() => { editor()?.commands.undo(); setMenu(null); }}>Annuler</MenuItem>
      <MenuItem icon={<Clock size={16}/>} onClick={() => void openVersions()}>Historique de la page</MenuItem>
      <MenuItem icon={<RefreshCw size={16}/>} onClick={() => { setMenu(null); openTrash(); }}>Afficher les pages supprimées</MenuItem>
      <MenuItem icon={<Trash2 size={16}/>} onClick={() => void trash()}>Supprimer</MenuItem>
      <MenuDivider/>
      <MenuItem icon={<Download size={16}/>} onClick={() => { setMenu(null); importInput.click(); }}>Importer</MenuItem>
      <MenuItem icon={<Upload size={16}/>} onClick={exportPage}>Exporter</MenuItem>
      <MenuDivider/>
      <MenuFootnote>Nombre de mots : {countWords(editor()?.state.doc.textBetween(0, editor()!.state.doc.content.size, '\n', ' ') ?? '')}<br/>Dernière modification : {active()?.updated ? new Date(active()!.updated).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}<br/>Enregistré dans un fichier .md</MenuFootnote>
    </Menu></Show>
    <Show when={menu() === 'customize'}><Menu label="Personnaliser la page" class="page-menu customize-menu">
      <div class="customize-heading">Vue de la page pour <span>{active()?.icon}</span> <strong>{active()?.title || 'Sans titre'}</strong></div>
      <MenuLabel>Sections</MenuLabel>
      <label class="kit-menu-item customize-row"><span class="kit-menu-icon"><ArrowDownLeft size={16}/></span><span class="kit-menu-label">Liens entrants</span>
        <select aria-label="Affichage des liens entrants" value={backlinksMode()} onChange={e => update({ backlinks: e.currentTarget.value as 'expanded' | 'popover' | 'off' })}><option value="expanded">Développés</option><option value="popover">Dans une fenêtre</option><option value="off">Masqués</option></select></label>
    </Menu></Show>
    <Show when={menu() === 'icon'}><EmojiPicker label="Icône de la page" style={{ position: 'fixed', left: `${menuAnchor().x}px`, top: `${menuAnchor().y}px` }} onPick={icon => { update({ icon }); setMenu(null); }} onRemove={active()?.icon ? () => { update({ icon: '' }); setMenu(null); } : undefined}/></Show>
    <Show when={menu() === 'cover'}><div class="cover-menu popover" style={{ left: `${menuAnchor().x}px`, top: `${menuAnchor().y}px`, right: 'auto' }}><div class="popover-heading">Couverture<button class="icon-button" aria-label="Fermer" onClick={() => setMenu(null)}><X size={15}/></button></div><div class="cover-grid"><For each={['landscape', 'sand', 'sage', 'blue', 'rose']}>{cover => <button class={`cover-swatch cover-${cover}`} aria-label={`Couverture ${cover}`} onClick={() => { update({ cover }); setMenu(null); }}>{cover === 'landscape' && <img src="/landscape.svg" alt="Montagnes"/>}</button>}</For></div><button onClick={() => { update({ cover: '' }); setMenu(null); }}>Supprimer la couverture</button></div></Show>
    <Show when={pageContext()}>{context => <><div class="dismiss-layer" onClick={() => setPageContext(undefined)}/><div class="page-context-menu popover" style={{ left: `${context().x}px`, top: `${context().y}px` }}>
      <button onClick={async () => { const id = context().id; setPageContext(undefined); await navigate(id); titleInput?.focus(); titleInput?.select(); }}><Pencil size={16}/>Renommer</button>
      <button onClick={() => { const page = pages().find(p => p.id === context().id); if (page) update({ favorite: !page.favorite }, page.id); setPageContext(undefined); }}><Star size={16}/>{pages().find(p => p.id === context().id)?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
      <button onClick={() => { setMovingPage(context().id); setQuery(''); setModal('move'); setPageContext(undefined); }}><CornerUpRight size={16}/>Déplacer vers</button>
      <button onClick={() => void copyLink(context().id)}><Link size={16}/>Copier le lien</button>
      <button onClick={() => { const id = context().id; setPageContext(undefined); void create(null, true, id); }}><Copy size={16}/>Dupliquer</button>
      <div class="popover-divider"/><button class="danger" onClick={() => void trash(context().id)}><Trash2 size={16}/>Déplacer vers la corbeille</button>
    </div></>}</Show>
    <Show when={modal()}><div class="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !restoringHistory()) setModal(null); }}><section class="modal" classList={{ 'search-dialog': modal() === 'search', 'history-dialog': modal() === 'versions', 'trash-dialog': modal() === 'trash' }} role="dialog" aria-modal="true" aria-label={modal() === 'search' ? 'Rechercher une page' : modal() === 'trash' ? 'Corbeille' : 'Espace Fotion'} onKeyDown={e => { if (e.key === 'Tab') { const elements = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]')]; const first = elements[0], last = elements[elements.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }}>
      <Show when={modal() === 'search'} fallback={<button class="modal-close icon-button" aria-label="Fermer la fenêtre" disabled={restoringHistory()} onClick={() => setModal(null)}><X size={20}/></button>}>
        <SearchDialog pages={indexed()} index={pageIndex} workspace="Espace de Sohane" parentTitle={parentPath} onOpen={id => void navigate(id)} onOpenInNewTab={openInNewTab} onClose={() => setModal(null)}/>
      </Show>
      <Show when={modal() === 'move'}><div class="modal-content"><h2>Déplacer vers</h2><p>Choisissez la page qui contiendra « {pages().find(p => p.id === movingPage())?.title || 'Sans titre'} ».</p><input class="move-search" aria-label="Rechercher une destination" placeholder="Rechercher une page…" value={query()} onInput={e => setQuery(e.currentTarget.value)}/><div class="move-destinations"><button onClick={() => void movePage(movingPage(), null, 'root')}><LockKeyhole size={16}/>Privé <span>À la racine de l’espace</span></button><For each={results().filter(p => planPageMove(pages(), movingPage(), p.id, 'inside').length)}>{page => <button onClick={() => void movePage(movingPage(), page.id, 'inside')}><span>{page.icon || '📄'}</span>{page.title || 'Sans titre'}</button>}</For></div></div></Show>
      <Show when={modal() === 'settings'}><div class="modal-content"><span class="modal-symbol">⚙️</span><h2>Votre espace</h2><p>Un peu plus à votre image.</p><div class="setting-row"><span><strong>Apparence</strong><small>Choisissez votre ambiance de travail.</small></span><select aria-label="Apparence" value={theme()} onChange={e => applyTheme(e.currentTarget.value)}><option value="light">Clair</option><option value="dark">Sombre</option></select></div><div class="setting-row"><span><strong>Stockage</strong><small>Documents Markdown sur cet ordinateur.</small></span><button class="secondary-button" onClick={() => setModal('files')}>Voir les fichiers</button></div><div class="settings-about"><span class="brand-mark">F</span><div><strong>Fotion</strong><small>Version 0.2 · Open source · MIT</small></div></div></div></Show>
      <Show when={modal() === 'files'}><div class="modal-content"><span class="modal-symbol">📂</span><h2>Des fichiers qui vous appartiennent.</h2><p>Chaque page est un document Markdown. Le titre, l’icône et les autres propriétés sont enregistrés dans son en-tête YAML.</p><div class="path-box"><FolderOpen size={18}/><code>Fotion / vault /</code><span>.md</span></div><p>Ouvrez ce dossier dans Obsidian ou votre éditeur préféré. Les anciennes versions sont conservées dans <code>vault/.history/</code>.</p><button class="secondary-button" onClick={async () => { if (await flush()) { await load(); toast('Fichiers actualisés'); } }}><RefreshCw size={15}/>Actualiser depuis le disque</button><button class="secondary-button" onClick={() => importInput.click()}><Upload size={15}/>Importer un fichier .md</button></div></Show>
      <Show when={modal() === 'versions'}><VersionHistory pageId={activeId()} restoring={restoringHistory()} onRestore={restoreVersion}/></Show>
      <Show when={modal() === 'trash'}><div class="trash-panel">
        <label class="kit-menu-search"><Search size={14}/><input aria-label="Rechercher dans la corbeille" placeholder="Rechercher des pages dans la corbeille" value={trashQuery()} onInput={e => setTrashQuery(e.currentTarget.value)}/></label>
        <div class="trash-list" role="list"><For each={trashed()}>{page => <div class="trash-row" role="listitem">
          <span class="trash-icon">{page.icon || <FileText size={16}/>}</span>
          <span class="trash-text"><strong>{page.title || 'Sans titre'}</strong><Show when={parentPath(page)}><small>{parentPath(page)}</small></Show></span>
          <button class="icon-button" aria-label={`Restaurer ${page.title || 'Sans titre'}`} title="Restaurer" onClick={async () => { update({ trashed: false }, page.id); if (await flush()) toast('Page restaurée'); }}><Undo2 size={16}/></button>
          <button class="icon-button" aria-label={`Supprimer définitivement ${page.title || 'Sans titre'}`} title="Supprimer définitivement" onClick={() => setConfirmDelete(page.id)}><Trash2 size={16}/></button>
        </div>}</For>
        <Show when={!trashed().length}><div class="empty-trash"><Trash2 size={28}/><p>{trashQuery() ? 'Aucune page correspondante dans la corbeille.' : 'La corbeille est vide.'}</p></div></Show></div>
        <Show when={confirmDelete()}>{id => <div class="trash-confirm" role="alertdialog" aria-label="Confirmer la suppression définitive"><p>Supprimer définitivement « {pages().find(p => p.id === id())?.title || 'Sans titre'} » ? Une copie reste dans l’historique du coffre.</p><div><button class="kit-button kit-button-secondary" onClick={() => setConfirmDelete('')}>Annuler</button><button class="kit-button kit-button-danger" onClick={() => void removeForever(id())}>Oui, supprimer cette page</button></div></div>}</Show>
      </div></Show>
      <Show when={modal() === 'help'}><div class="modal-content"><span class="modal-symbol">👋</span><h2>Faites place à vos idées.</h2><p>Les gestes essentiels pour vous sentir chez vous.</p><div class="shortcut-row"><span>Retrouver une page</span><kbd>⌘ / Ctrl P</kbd></div><div class="shortcut-row"><span>Insérer un lien dans le texte</span><kbd>⌘ / Ctrl K</kbd></div><div class="shortcut-row"><span>Enregistrer maintenant</span><kbd>⌘ / Ctrl S</kbd></div><div class="shortcut-row"><span>Insérer un bloc</span><kbd>/</kbd></div><div class="shortcut-row"><span>Mettre en gras</span><kbd>⌘ / Ctrl B</kbd></div><div class="shortcut-row"><span>Annuler une modification</span><kbd>⌘ / Ctrl Z</kbd></div><p class="help-tip">Survolez un bloc et utilisez sa poignée ⋮⋮ pour le déplacer. Sélectionnez du texte pour faire apparaître les options de mise en forme.</p><button class="primary-button" onClick={() => { const guide = visible().find(p => p.id === 'guide.md'); if (guide) void navigate(guide.id); else setModal(null); }}>C’est parti <ArrowRight size={15}/></button></div></Show>
    </section></div></Show>
    <Show when={notice()}><div class="toast" role="status"><Check size={16}/>{notice()}</div></Show>
  </div>;
}
