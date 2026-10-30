import { createSignal, createMemo, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import { Search, House, ChevronDown, ChevronRight, ChevronsLeft, PanelLeft, Plus, Settings, Trash2, Star, MoreHorizontal, LockKeyhole, Check, ArrowUpRight, X, Download, Copy, Undo2, Redo2, FolderOpen, Upload, Smile, ImagePlus, RefreshCw, ArrowLeft, ArrowRight, CircleHelp, CheckCheck, SquarePen, Pencil, FileText, CornerUpRight, GripVertical } from 'lucide-solid';
import type { Editor } from '@tiptap/core';
import { PageIndex } from '../features/pages';
import { VersionHistory } from '../features/pages';
import { DocumentEditor } from '../features/editor';
import type { Page, PageEdit } from '../../shared/page';
import { byOrder, planPageMove, type PagePlacement } from '../features/pages';

const emoji = ['🏡', '📄', '📝', '💡', '🗂️', '📚', '🏔️', '🌱', '✨', '🎯', '🧭', '🎨', '☕', '🚀', '🌊', '🪴', '🧠', '💻', '📌', '💛', '👋', '🛠️', '📷', '🎵'];
const blank: PageEdit = { title: '', icon: '', parent: null, favorite: false, cover: '', content: '', trashed: false };
const recoveryKey = 'fotion-recovery-v1';

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
  const [menu, setMenu] = createSignal<'more' | 'icon' | 'cover' | null>(null);
  const [pageContext, setPageContext] = createSignal<{ id: string; x: number; y: number }>();
  const [movingPage, setMovingPage] = createSignal('');
  const [dragPage, setDragPage] = createSignal('');
  const [pageDrop, setPageDrop] = createSignal<{ id: string | null; placement: PagePlacement }>();
  const [sidebarWidth, setSidebarWidth] = createSignal(Math.max(220, Math.min(420, Number(localStorage.getItem('fotion-sidebar-width')) || 240)));
  const [query, setQuery] = createSignal('');
  const [searchIndex, setSearchIndex] = createSignal(0);
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
  let searchInput!: HTMLInputElement;
  const active = createMemo(() => pages().find(p => p.id === activeId()));
  const wide = () => active()?.fullWidth ?? false;
  const small = () => active()?.smallText ?? false;
  const font = () => active()?.font ?? 'default';
  const [menuAnchor, setMenuAnchor] = createSignal({ x: 0, y: 0 });
  const visible = createMemo(() => pages().filter(p => !p.trashed).sort(byOrder));
  const roots = createMemo(() => visible().filter(p => !p.parent || !visible().some(parent => parent.id === p.parent)));
  const children = (id: string) => visible().filter(p => p.parent === id);
  const pageIndex = new PageIndex();
  const indexed = createMemo(() => { pageIndex.update(pages()); return pages(); });
  const searchResults = createMemo(() => pageIndex.search(indexed(), query()));
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
    localStorage.setItem('fotion-active', id);
    if (record) {
      const next = [...history().slice(0, historyIndex() + 1), id];
      setHistory(next); setHistoryIndex(next.length - 1);
    }
    document.querySelector('.main-scroll')?.scrollTo(0, 0);
    if (window.innerWidth < 760) setSidebar(false);
    requestAnimationFrame(resizeTitle);
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
      const preferred = localStorage.getItem('fotion-active') || 'bienvenue.md';
      const first = restored.find(p => p.id === preferred && !p.trashed) || restored.find(p => !p.trashed);
      if (first) { setActiveId(first.id); setHistory([first.id]); setHistoryIndex(0); }
      if (dirty.size) { setStatus('pending'); toast('Un brouillon non enregistré a été récupéré.'); void flush(); }
      requestAnimationFrame(resizeTitle);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  function resizeTitle() {
    if (titleInput) { titleInput.style.height = 'auto'; titleInput.style.height = `${titleInput.scrollHeight}px`; }
    document.title = `${active()?.title || 'Sans titre'} — Fotion`;
  }
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
      requestAnimationFrame(resizeTitle); toast('Version restaurée. La version remplacée reste dans l’historique.');
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
  function preference(name: string, value: string) { localStorage.setItem(`fotion-${name}`, value); }
  function applyTheme(value: string) { setTheme(value); preference('theme', value); document.documentElement.dataset.theme = value; }
  function openSearch() { setQuery(''); setSearchIndex(0); setModal('search'); requestAnimationFrame(() => searchInput?.focus()); }
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
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setSidebar(!sidebar()); }
      if (e.key === 'Escape') { setModal(null); setMenu(null); setPageContext(undefined); setDragPage(''); setPageDrop(undefined); }
    };
    const unload = (e: BeforeUnloadEvent) => { if (dirty.size || running) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('keydown', keydown); window.addEventListener('beforeunload', unload);
    onCleanup(() => { clearTimeout(timer); clearTimeout(noticeTimer); window.removeEventListener('keydown', keydown); window.removeEventListener('beforeunload', unload); });
  });
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
      <aside class="sidebar" aria-label="Navigation principale" style={{ width: `${sidebarWidth()}px` }}>
        <div class="sidebar-resizer" role="separator" aria-label="Largeur de la barre latérale" aria-orientation="vertical" aria-valuemin={220} aria-valuemax={420} aria-valuenow={sidebarWidth()} tabIndex={0} onPointerDown={resizeSidebar} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setSidebarWidth(w => Math.max(220, Math.min(420, w + (e.key === 'ArrowLeft' ? -10 : 10)))); preference('sidebar-width', String(sidebarWidth())); } }}/>
        <div class="workspace"><button class="workspace-title" onClick={() => setModal('settings')}><span class="avatar">S</span><span>Espace de Sohane</span><ChevronDown size={13}/></button><button class="icon-button collapse-sidebar" aria-label="Fermer la barre latérale" onClick={() => setSidebar(false)}><ChevronsLeft size={17}/></button></div>
        <nav class="primary-nav">
          <button onClick={openSearch}><Search size={18}/><span>Rechercher</span><kbd>⌘ P</kbd></button>
          <button onClick={() => { const home = visible().find(p => p.id === 'bienvenue.md') || visible()[0]; if (home) void navigate(home.id); }}><House size={18}/><span>Accueil</span></button>
          <button onClick={() => void create()}><SquarePen size={18}/><span>Nouvelle page</span></button>
        </nav>
        <div class="sidebar-scroll">
          <Show when={visible().some(p => p.favorite)}><div class="section-label">Favoris</div><For each={visible().filter(p => p.favorite)}>{page => <PageRow page={page} favorite/>}</For></Show>
          <div class="section-label private-label" classList={{ 'drop-inside': pageDrop()?.placement === 'root' }} onDragOver={e => { if (!dragPage()) return; e.preventDefault(); setPageDrop({ id: null, placement: 'root' }); }} onDrop={e => { e.preventDefault(); if (dragPage()) void movePage(dragPage(), null, 'root'); }}><span>Privé</span><button class="icon-button" aria-label="Nouvelle page privée" onClick={() => void create()}><Plus size={14}/></button></div>
          <For each={roots()}>{page => <PageRow page={page}/>}</For>
          <button class="add-page" disabled={busy()} onClick={() => void create()}><Plus size={17}/>Ajouter une page</button>
          <div class="sidebar-divider"/>
          <button class="utility-link" onClick={() => setModal('settings')}><Settings size={17}/>Paramètres</button>
          <button class="utility-link" onClick={() => importInput.click()}><Upload size={17}/>Importer</button>
          <button class="utility-link" onClick={() => setModal('trash')}><Trash2 size={17}/>Corbeille</button>
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
        <div class="topbar-actions"><button class="save-status" classList={{ 'save-error': status() === 'error' }} onClick={() => void flush()} title="Enregistrer · ⌘ S"><Show when={status() === 'saved'} fallback={<span class="status-dot"/>}><CheckCheck size={13}/></Show><span>{status() === 'saved' ? 'Enregistré' : status() === 'saving' ? 'Enregistrement…' : status() === 'error' ? 'Non enregistré' : 'Modifications…'}</span></button>
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
              <Show when={active()?.icon}><div class="page-icon-wrap"><button class="page-icon" aria-label="Changer l’icône de la page" onClick={e => openAppearance('icon', e.currentTarget)}>{active()?.icon}</button></div></Show>
              <div class="page-customize"><button onClick={e => openAppearance('icon', e.currentTarget)}><Smile size={14}/>{active()?.icon ? 'Changer l’icône' : 'Ajouter une icône'}</button><button onClick={e => openAppearance('cover', e.currentTarget)}><ImagePlus size={14}/>{active()?.cover ? 'Changer la couverture' : 'Ajouter une couverture'}</button></div>
              <Show when={incoming().length}><div class="backlinks"><button class="backlinks-toggle" aria-expanded={backlinksOpen()} onClick={() => setBacklinksOpen(!backlinksOpen())}><ChevronRight size={13} classList={{ rotated: backlinksOpen() }}/>{incoming().length} lien{incoming().length > 1 ? 's' : ''} entrant{incoming().length > 1 ? 's' : ''}</button><Show when={backlinksOpen()}><div class="backlinks-list"><For each={incoming()}>{page => <button onClick={() => void navigate(page.id)}><span>{page.icon || '📄'}</span>{page.title || 'Sans titre'}</button>}</For></div></Show></div></Show>
              <textarea ref={titleInput} class="page-title" aria-label="Titre de la page" rows={1} placeholder="Sans titre" value={active()?.title} onInput={e => { update({ title: e.currentTarget.value.replace(/\n/g, '') }); resizeTitle(); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); editor()?.commands.focus('start'); } }}/>
              <Show when={editorKey().id ? editorKey() : undefined} keyed>{key => <DocumentEditor content={pages().find(p => p.id === key.id)?.content || ''} onChange={content => update({ content }, key.id)} onReady={setEditor} onCreatePage={() => void create(key.id)} pages={visible()} onOpenPage={id => void navigate(id)}/>}</Show>
              <Show when={children(activeId()).length || activeId() === 'bienvenue.md'}><div class="child-pages"><For each={activeId() === 'bienvenue.md' ? visible().filter(p => ['projets.md', 'notes.md', 'lectures.md'].includes(p.id)) : children(activeId())}>{page => <button onClick={() => void navigate(page.id)}><span>{page.icon}</span><span class="child-page-title">{page.title}</span><ArrowUpRight size={15}/></button>}</For></div></Show>
              <button class="new-subpage" onClick={() => void create(activeId())}><Plus size={15}/>Ajouter une sous-page</button>

            </article>
          </Show>
        </Show>
      </div>
      <button class="help-button" aria-label="Afficher l’aide" onClick={() => setModal('help')}>?</button>
    </main>
    <Show when={menu()}><div class="dismiss-layer" onClick={() => setMenu(null)}/></Show>
    <Show when={menu() === 'more'}><div class="page-menu popover">
      <div class="font-picker"><For each={[['default', 'Aa', 'Par défaut'], ['serif', 'Aa', 'Serif'], ['mono', 'Aa', 'Mono']]}>{item => <button classList={{ chosen: font() === item[0] }} onClick={() => { update({ font: item[0] as 'default' | 'serif' | 'mono' }); }}><strong class={`font-${item[0]}`}>{item[1]}</strong><small>{item[2]}</small></button>}</For></div>
      <button class="toggle-row" onClick={() => { update({ smallText: !small() }); }}>Texte de petite taille<span class="toggle" classList={{ on: small() }}/></button>
      <button class="toggle-row" onClick={() => { update({ fullWidth: !wide() }); }}>Pleine largeur<span class="toggle" classList={{ on: wide() }}/></button>
      <div class="popover-divider"/>
      <button onClick={() => { setMovingPage(activeId()); setQuery(''); setModal('move'); setMenu(null); }}><CornerUpRight size={16}/>Déplacer vers</button>
      <button onClick={() => void openVersions()}><RefreshCw size={16}/>Historique de la page</button>
      <button onClick={exportPage}><Download size={16}/>Exporter en Markdown</button>
      <button onClick={() => void create(null, true)}><Copy size={16}/>Dupliquer la page</button>
      <button onClick={() => { editor()?.commands.undo(); setMenu(null); }}><Undo2 size={16}/>Annuler<kbd>⌘ Z</kbd></button>
      <button onClick={() => { editor()?.commands.redo(); setMenu(null); }}><Redo2 size={16}/>Rétablir<kbd>⇧ ⌘ Z</kbd></button>
      <div class="popover-divider"/>
      <button class="danger" onClick={() => void trash()}><Trash2 size={16}/>Déplacer vers la corbeille</button>
      <div class="menu-footnote">Enregistré dans un fichier .md<br/>{active()?.updated ? new Date(active()!.updated).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
    </div></Show>
    <Show when={menu() === 'icon'}><div class="emoji-menu popover" style={{ left: `${menuAnchor().x}px`, top: `${menuAnchor().y}px` }}><div class="popover-heading">Icône de la page<button class="icon-button" aria-label="Fermer" onClick={() => setMenu(null)}><X size={15}/></button></div><div class="emoji-grid"><For each={emoji}>{icon => <button aria-label={`Icône ${icon}`} onClick={() => { update({ icon }); setMenu(null); }}>{icon}</button>}</For></div><button onClick={() => { update({ icon: '' }); setMenu(null); }}>Supprimer l’icône</button></div></Show>
    <Show when={menu() === 'cover'}><div class="cover-menu popover" style={{ left: `${menuAnchor().x}px`, top: `${menuAnchor().y}px`, right: 'auto' }}><div class="popover-heading">Couverture<button class="icon-button" aria-label="Fermer" onClick={() => setMenu(null)}><X size={15}/></button></div><div class="cover-grid"><For each={['landscape', 'sand', 'sage', 'blue', 'rose']}>{cover => <button class={`cover-swatch cover-${cover}`} aria-label={`Couverture ${cover}`} onClick={() => { update({ cover }); setMenu(null); }}>{cover === 'landscape' && <img src="/landscape.svg" alt="Montagnes"/>}</button>}</For></div><button onClick={() => { update({ cover: '' }); setMenu(null); }}>Supprimer la couverture</button></div></Show>
    <Show when={pageContext()}>{context => <><div class="dismiss-layer" onClick={() => setPageContext(undefined)}/><div class="page-context-menu popover" style={{ left: `${context().x}px`, top: `${context().y}px` }}>
      <button onClick={async () => { const id = context().id; setPageContext(undefined); await navigate(id); titleInput?.focus(); titleInput?.select(); }}><Pencil size={16}/>Renommer</button>
      <button onClick={() => { const page = pages().find(p => p.id === context().id); if (page) update({ favorite: !page.favorite }, page.id); setPageContext(undefined); }}><Star size={16}/>{pages().find(p => p.id === context().id)?.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
      <button onClick={() => { setMovingPage(context().id); setQuery(''); setModal('move'); setPageContext(undefined); }}><CornerUpRight size={16}/>Déplacer vers</button>
      <button onClick={() => { const id = context().id; setPageContext(undefined); void create(null, true, id); }}><Copy size={16}/>Dupliquer</button>
      <div class="popover-divider"/><button class="danger" onClick={() => void trash(context().id)}><Trash2 size={16}/>Déplacer vers la corbeille</button>
    </div></>}</Show>
    <Show when={modal()}><div class="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !restoringHistory()) setModal(null); }}><section class="modal" classList={{ 'search-dialog': modal() === 'search', 'history-dialog': modal() === 'versions' }} role="dialog" aria-modal="true" aria-label={modal() === 'search' ? 'Rechercher une page' : 'Espace Fotion'} onKeyDown={e => { if (e.key === 'Tab') { const elements = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]')]; const first = elements[0], last = elements[elements.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }}>
      <Show when={modal() === 'search'} fallback={<button class="modal-close icon-button" aria-label="Fermer la fenêtre" disabled={restoringHistory()} onClick={() => setModal(null)}><X size={20}/></button>}>
        <div class="search-input"><Search size={22}/><input ref={searchInput} aria-label="Rechercher" placeholder="Rechercher dans votre espace…" value={query()} onInput={e => { setQuery(e.currentTarget.value); setSearchIndex(0); }} onKeyDown={e => { if (e.key === 'Enter' && results()[searchIndex()]) void navigate(results()[searchIndex()].id); if (['ArrowDown', 'ArrowUp'].includes(e.key) && results().length) { e.preventDefault(); setSearchIndex(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + results().length) % results().length); document.querySelector('.search-results .chosen')?.scrollIntoView({ block: 'nearest' }); } }}/><button class="key-button" onClick={() => setModal(null)}>esc</button></div>
        <div class="search-results"><div class="menu-label">{query() ? `${results().length} RÉSULTAT${results().length > 1 ? 'S' : ''}` : 'VOS PAGES'}</div><For each={results()}>{(page, i) => <button classList={{ chosen: searchIndex() === i() }} onMouseEnter={() => setSearchIndex(i())} onClick={() => void navigate(page.id)}><span class="search-emoji">{page.icon}</span><span><strong>{page.title || 'Sans titre'}</strong><small>{searchResults()[i()]?.excerpt || 'Une page pour vos idées'}</small></span><ArrowUpRight size={16}/></button>}</For><Show when={!results().length}><div class="empty-message">Aucune page trouvée. Essayez un autre mot.</div></Show></div><div class="search-footer"><span>Recherchez dans les titres et le contenu</span><span>↵ ouvrir</span></div>
      </Show>
      <Show when={modal() === 'move'}><div class="modal-content"><h2>Déplacer vers</h2><p>Choisissez la page qui contiendra « {pages().find(p => p.id === movingPage())?.title || 'Sans titre'} ».</p><input class="move-search" aria-label="Rechercher une destination" placeholder="Rechercher une page…" value={query()} onInput={e => setQuery(e.currentTarget.value)}/><div class="move-destinations"><button onClick={() => void movePage(movingPage(), null, 'root')}><LockKeyhole size={16}/>Privé <span>À la racine de l’espace</span></button><For each={results().filter(p => planPageMove(pages(), movingPage(), p.id, 'inside').length)}>{page => <button onClick={() => void movePage(movingPage(), page.id, 'inside')}><span>{page.icon || '📄'}</span>{page.title || 'Sans titre'}</button>}</For></div></div></Show>
      <Show when={modal() === 'settings'}><div class="modal-content"><span class="modal-symbol">⚙️</span><h2>Votre espace</h2><p>Un peu plus à votre image.</p><div class="setting-row"><span><strong>Apparence</strong><small>Choisissez votre ambiance de travail.</small></span><select aria-label="Apparence" value={theme()} onChange={e => applyTheme(e.currentTarget.value)}><option value="light">Clair</option><option value="dark">Sombre</option></select></div><div class="setting-row"><span><strong>Stockage</strong><small>Documents Markdown sur cet ordinateur.</small></span><button class="secondary-button" onClick={() => setModal('files')}>Voir les fichiers</button></div><div class="settings-about"><span class="brand-mark">F</span><div><strong>Fotion</strong><small>Version 0.2 · Open source · MIT</small></div></div></div></Show>
      <Show when={modal() === 'files'}><div class="modal-content"><span class="modal-symbol">📂</span><h2>Des fichiers qui vous appartiennent.</h2><p>Chaque page est un document Markdown. Le titre, l’icône et les autres propriétés sont enregistrés dans son en-tête YAML.</p><div class="path-box"><FolderOpen size={18}/><code>Fotion / vault /</code><span>.md</span></div><p>Ouvrez ce dossier dans Obsidian ou votre éditeur préféré. Les anciennes versions sont conservées dans <code>vault/.history/</code>.</p><button class="secondary-button" onClick={async () => { if (await flush()) { await load(); toast('Fichiers actualisés'); } }}><RefreshCw size={15}/>Actualiser depuis le disque</button><button class="secondary-button" onClick={() => importInput.click()}><Upload size={15}/>Importer un fichier .md</button></div></Show>
      <Show when={modal() === 'versions'}><VersionHistory pageId={activeId()} restoring={restoringHistory()} onRestore={restoreVersion}/></Show>
      <Show when={modal() === 'trash'}><div class="modal-content"><span class="modal-symbol">🗑️</span><h2>Corbeille</h2><p>Les pages restent sur le disque. Vous pouvez les restaurer à tout moment.</p><For each={pages().filter(p => p.trashed)}>{page => <div class="trash-row"><span>{page.icon}</span><strong>{page.title}</strong><button class="secondary-button" onClick={async () => { update({ trashed: false }, page.id); if (await flush()) toast('Page restaurée'); }}><Undo2 size={14}/>Restaurer</button></div>}</For><Show when={!pages().some(p => p.trashed)}><div class="empty-trash"><Trash2 size={32}/><p>La corbeille est vide.</p></div></Show></div></Show>
      <Show when={modal() === 'help'}><div class="modal-content"><span class="modal-symbol">👋</span><h2>Faites place à vos idées.</h2><p>Les gestes essentiels pour vous sentir chez vous.</p><div class="shortcut-row"><span>Retrouver une page</span><kbd>⌘ / Ctrl P</kbd></div><div class="shortcut-row"><span>Insérer un lien dans le texte</span><kbd>⌘ / Ctrl K</kbd></div><div class="shortcut-row"><span>Enregistrer maintenant</span><kbd>⌘ / Ctrl S</kbd></div><div class="shortcut-row"><span>Insérer un bloc</span><kbd>/</kbd></div><div class="shortcut-row"><span>Mettre en gras</span><kbd>⌘ / Ctrl B</kbd></div><div class="shortcut-row"><span>Annuler une modification</span><kbd>⌘ / Ctrl Z</kbd></div><p class="help-tip">Survolez un bloc et utilisez sa poignée ⋮⋮ pour le déplacer. Sélectionnez du texte pour faire apparaître les options de mise en forme.</p><button class="primary-button" onClick={() => { const guide = visible().find(p => p.id === 'guide.md'); if (guide) void navigate(guide.id); else setModal(null); }}>C’est parti <ArrowRight size={15}/></button></div></Show>
    </section></div></Show>
    <Show when={notice()}><div class="toast" role="status"><Check size={16}/>{notice()}</div></Show>
  </div>;
}
