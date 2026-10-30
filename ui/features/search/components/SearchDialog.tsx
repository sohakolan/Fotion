import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Search, FileText, CornerDownLeft } from 'lucide-solid';
import { recencyGroup, type Page, type PageIndex } from '../../../../engine';
import { modKey } from '../../../kit';

const shortDate = (updated: string) => recencyGroup(updated) === 'Aujourd’hui' ? '' : new Date(updated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/**
 * Content of Notion's search window: recent pages grouped by date, ranked matches,
 * a titles-only filter, parent path, and ⌘/Ctrl+Enter to open in a new tab.
 */
export default function SearchDialog(props: {
  pages: Page[]; index: PageIndex; workspace: string; parentTitle: (page: Page) => string;
  onOpen: (id: string) => void; onOpenInNewTab: (id: string) => void; onClose: () => void;
}) {
  let input!: HTMLInputElement;
  const [query, setQuery] = createSignal('');
  const [titleOnly, setTitleOnly] = createSignal(false);
  const [chosen, setChosen] = createSignal(0);
  const results = createMemo(() => props.index.search(props.pages, query(), { titleOnly: titleOnly() }));
  const groups = createMemo(() => {
    if (query().trim()) return [{ label: 'Meilleurs résultats', items: results() }];
    const byDate = new Map<string, ReturnType<typeof results>>();
    for (const result of results()) { const label = recencyGroup(result.page.updated); byDate.set(label, [...(byDate.get(label) || []), result]); }
    return [...byDate].map(([label, items]) => ({ label, items }));
  });
  const open = (id: string, newTab: boolean) => { if (newTab) { props.onOpenInNewTab(id); props.onClose(); } else props.onOpen(id); };
  onMount(() => requestAnimationFrame(() => input.focus()));
  return <>
    <div class="search-input"><Search size={20}/><input ref={input} aria-label="Rechercher" placeholder={`Rechercher dans ${props.workspace}…`} value={query()} onInput={e => { setQuery(e.currentTarget.value); setChosen(0); }} onKeyDown={e => {
      const result = results()[chosen()];
      if (e.key === 'Enter' && result) { e.preventDefault(); open(result.page.id, e.metaKey || e.ctrlKey); }
      if (['ArrowDown', 'ArrowUp'].includes(e.key) && results().length) {
        e.preventDefault(); setChosen(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + results().length) % results().length);
        document.querySelector('.search-results .chosen')?.scrollIntoView({ block: 'nearest' });
      }
    }}/><button class="key-button" onClick={() => props.onClose()}>esc</button></div>
    <div class="search-filters"><button class="search-chip" aria-pressed={titleOnly()} onClick={() => { setTitleOnly(!titleOnly()); setChosen(0); input.focus(); }}><span class="chip-aa">Aa</span>Titres uniquement</button></div>
    <div class="search-results"><For each={groups()}>{group => <><div class="search-group">{group.label}</div><For each={group.items}>{result => {
      const index = () => results().indexOf(result);
      return <button classList={{ chosen: chosen() === index() }} onMouseEnter={() => setChosen(index())} onClick={e => open(result.page.id, e.metaKey || e.ctrlKey)}>
        <span class="search-emoji">{result.page.icon || <FileText size={18}/>}</span>
        <span class="search-text"><span class="search-title"><strong>{result.page.title || 'Sans titre'}</strong><Show when={props.parentTitle(result.page)}><span class="search-parent"> — {props.parentTitle(result.page)}</span></Show></span><Show when={query().trim() && result.excerpt}><small>{result.excerpt}</small></Show></span>
        <Show when={chosen() === index()} fallback={<span class="search-date">{shortDate(result.page.updated)}</span>}><CornerDownLeft size={14} class="search-enter"/></Show>
      </button>;
    }}</For></>}</For>
      <Show when={!results().length}><div class="empty-message">Aucun résultat. Essayez un autre mot{titleOnly() ? ' ou recherchez aussi dans le contenu' : ''}.</div></Show></div>
    <div class="search-footer"><span><kbd>↑↓</kbd> Sélectionner</span><span><kbd>↵</kbd> Ouvrir</span><span><kbd>{modKey}↵</kbd> Ouvrir dans un nouvel onglet</span></div>
  </>;
}
