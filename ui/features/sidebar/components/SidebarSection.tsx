import { createSignal, createMemo, For, Show, type JSX } from 'solid-js';
import { MoreHorizontal, Plus, ArrowUpDown, Hash, Move, ArrowUp, ArrowDown, Check, SquarePen, ChevronLeft } from 'lucide-solid';
import type { Page } from '../../../../engine';
import { Menu, MenuItem, MenuDivider, MenuLabel } from '../../../kit';

export type SectionSort = 'manual' | 'edited';
export interface SectionPrefs { collapsed: boolean; show: number; sort: SectionSort }
export const defaultSectionPrefs: SectionPrefs = { collapsed: false, show: 10, sort: 'manual' };
const sortLabels: Record<SectionSort, string> = { manual: 'Manuel', edited: 'Dernière modification' };

export function sortPages(pages: Page[], sort: SectionSort) {
  return sort === 'edited' ? [...pages].sort((a, b) => b.updated.localeCompare(a.updated)) : pages;
}

/**
 * Sidebar section as in Notion: clickable title to collapse, “…” menu (sort, number shown,
 * move section), “+” to create, and a “Plus” row opening the full list with a search field.
 */
export default function SidebarSection(props: {
  title: string; pages: Page[]; prefs: SectionPrefs; onPrefs: (prefs: SectionPrefs) => void;
  row: (page: Page) => JSX.Element; onOpen: (id: string) => void; onCreate?: () => void;
  canMoveUp: boolean; canMoveDown: boolean; onMove: (direction: -1 | 1) => void;
  headerProps?: JSX.HTMLAttributes<HTMLDivElement>; empty?: JSX.Element;
}) {
  const [menu, setMenu] = createSignal<{ x: number; y: number; sub?: 'sort' | 'show' | 'move' }>();
  const [panel, setPanel] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const sorted = createMemo(() => sortPages(props.pages, props.prefs.sort));
  const shown = createMemo(() => sorted().slice(0, props.prefs.show));
  const matches = createMemo(() => { const q = query().trim().toLocaleLowerCase(); return sorted().filter(page => (page.title || 'Sans titre').toLocaleLowerCase().includes(q)); });
  const set = (patch: Partial<SectionPrefs>) => { props.onPrefs({ ...props.prefs, ...patch }); setMenu(undefined); };
  const openMenu = (element: HTMLElement) => { const rect = element.getBoundingClientRect(); setMenu({ x: Math.min(rect.left, window.innerWidth - 270), y: Math.min(rect.bottom + 4, window.innerHeight - 200) }); };
  return <section class="sidebar-section" aria-label={props.title}>
    <div class="section-label" {...props.headerProps}>
      <button class="section-title" aria-expanded={!props.prefs.collapsed} onClick={() => props.onPrefs({ ...props.prefs, collapsed: !props.prefs.collapsed })}>{props.title}</button>
      <span class="section-actions">
        <button class="icon-button" aria-label={`Options de la section ${props.title}`} onClick={e => openMenu(e.currentTarget)}><MoreHorizontal size={14}/></button>
        <Show when={props.onCreate}><button class="icon-button" aria-label={`Nouvelle page dans ${props.title}`} onClick={() => props.onCreate?.()}><Plus size={14}/></button></Show>
      </span>
    </div>
    <Show when={!props.prefs.collapsed}>
      <For each={shown()}>{page => props.row(page)}</For>
      <Show when={!props.pages.length}>{props.empty}</Show>
      <Show when={props.pages.length > props.prefs.show}><button class="sidebar-more" onClick={() => { setQuery(''); setPanel(true); }}><MoreHorizontal size={16}/>Plus</button></Show>
    </Show>
    <Show when={menu()}>{position => <><div class="dismiss-layer" onClick={() => setMenu(undefined)}/><Menu label={`Options de la section ${props.title}`} class="section-menu" style={{ left: `${position().x}px`, top: `${position().y}px` }}>
      <Show when={position().sub} fallback={<>
        <MenuItem icon={<ArrowUpDown size={16}/>} shortcut={sortLabels[props.prefs.sort]} submenu onClick={() => setMenu({ ...position(), sub: 'sort' })}>Trier</MenuItem>
        <MenuItem icon={<Hash size={16}/>} shortcut={String(props.prefs.show)} submenu onClick={() => setMenu({ ...position(), sub: 'show' })}>Afficher</MenuItem>
        <MenuItem icon={<Move size={16}/>} submenu onClick={() => setMenu({ ...position(), sub: 'move' })}>Déplacer la section</MenuItem>
      </>}>
        <MenuItem icon={<ChevronLeft size={16}/>} onClick={() => setMenu({ x: position().x, y: position().y })}>{position().sub === 'sort' ? 'Trier' : position().sub === 'show' ? 'Afficher' : 'Déplacer la section'}</MenuItem>
        <MenuDivider/>
        <Show when={position().sub === 'sort'}><For each={Object.entries(sortLabels) as [SectionSort, string][]}>{([value, label]) => <MenuItem icon={props.prefs.sort === value ? <Check size={16}/> : <span/>} onClick={() => set({ sort: value })}>{label}</MenuItem>}</For></Show>
        <Show when={position().sub === 'show'}><MenuLabel>Nombre d’éléments affichés</MenuLabel><For each={[5, 10, 15, 20]}>{count => <MenuItem icon={props.prefs.show === count ? <Check size={16}/> : <span/>} onClick={() => set({ show: count })}>{count} éléments</MenuItem>}</For></Show>
        <Show when={position().sub === 'move'}>
          <MenuItem icon={<ArrowUp size={16}/>} disabled={!props.canMoveUp} onClick={() => { props.onMove(-1); setMenu(undefined); }}>Monter</MenuItem>
          <MenuItem icon={<ArrowDown size={16}/>} disabled={!props.canMoveDown} onClick={() => { props.onMove(1); setMenu(undefined); }}>Descendre</MenuItem>
        </Show>
      </Show>
    </Menu></>}</Show>
    <Show when={panel()}><div class="dismiss-layer" onClick={() => setPanel(false)}/><aside class="section-panel" role="dialog" aria-label={`Toutes les pages : ${props.title}`} onKeyDown={e => { if (e.key === 'Escape') setPanel(false); }}>
      <div class="section-panel-header"><strong>{props.title}</strong>
        <button class="icon-button" aria-label="Trier" title={`Trier : ${sortLabels[props.prefs.sort]}`} onClick={() => props.onPrefs({ ...props.prefs, sort: props.prefs.sort === 'manual' ? 'edited' : 'manual' })}><ArrowUpDown size={16}/></button>
        <Show when={props.onCreate}><button class="icon-button" aria-label="Nouvelle page" onClick={() => { setPanel(false); props.onCreate?.(); }}><SquarePen size={16}/></button></Show>
      </div>
      <input class="section-panel-search" aria-label="Rechercher une page" placeholder="Rechercher une page…" value={query()} ref={element => requestAnimationFrame(() => element.focus())} onInput={e => setQuery(e.currentTarget.value)}/>
      <div class="section-panel-list"><For each={matches()}>{page => <button onClick={() => { setPanel(false); props.onOpen(page.id); }}><span class="page-emoji">{page.icon || '📄'}</span><span class="truncate">{page.title || 'Sans titre'}</span></button>}</For>
        <Show when={!matches().length}><p class="empty-message">Aucune page trouvée.</p></Show></div>
    </aside></Show>
  </section>;
}
