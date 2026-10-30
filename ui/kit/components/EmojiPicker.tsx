import { createSignal, createMemo, createResource, For, Show, type JSX } from 'solid-js';
import { Search, Shuffle } from 'lucide-solid';

interface Emoji { emoji: string; label: string; tags?: string[]; group?: number; version: number }
const recentKey = 'fotion-recent-emoji';
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

// A colour emoji paints coloured pixels; a missing glyph is drawn as a monochrome box.
function renders(emoji: string) {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) return true;
  context.canvas.width = context.canvas.height = 20; context.font = '16px sans-serif'; context.textBaseline = 'top'; context.fillText(emoji, 0, 0);
  const pixels = context.getImageData(0, 0, 20, 20).data;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] && (pixels[i] !== pixels[i + 1] || pixels[i + 1] !== pixels[i + 2])) return true;
  return false;
}

// French CLDR names and categories, loaded only when a picker opens.
async function loadEmoji() {
  const [{ default: list }, { default: messages }] = await Promise.all([import('emojibase-data/fr/data.json'), import('emojibase-data/fr/messages.json')]);
  const all = (list as Emoji[]).filter(item => item.group !== undefined && item.group !== 2);
  // Hide Unicode versions the system emoji font cannot draw yet, tested once per version.
  const versions = new Map<number, boolean>();
  const supported = (item: Emoji) => { if (item.version < 14) return true; if (!versions.has(item.version)) versions.set(item.version, renders(item.emoji)); return versions.get(item.version)!; };
  const emoji = all.filter(supported).map(item => ({ ...item, unicode: item.emoji }));
  const groups = messages.groups.filter(group => group.key !== 'component').map(group => ({ name: group.message, items: emoji.filter(item => item.group === group.order) }));
  return { emoji, groups };
}

function readRecent(): string[] {
  try { const value = JSON.parse(localStorage.getItem(recentKey) || '[]'); return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 24) : []; } catch { return []; }
}

/** Notion-style emoji picker: tabs row with Random/Remove, filter field, recent emoji and named categories. */
export default function EmojiPicker(props: { label: string; style?: JSX.CSSProperties; onPick: (emoji: string) => void; onRemove?: () => void }) {
  const [data] = createResource(loadEmoji);
  const [query, setQuery] = createSignal('');
  const [recent, setRecent] = createSignal(readRecent());
  const matches = createMemo(() => {
    const q = normalize(query().trim());
    if (!q || !data()) return [];
    return data()!.emoji.filter(item => normalize(item.label).includes(q) || item.tags?.some(tag => normalize(tag).includes(q)));
  });
  const pick = (emoji: string) => {
    const next = [emoji, ...recent().filter(item => item !== emoji)].slice(0, 24);
    setRecent(next);
    try { localStorage.setItem(recentKey, JSON.stringify(next)); } catch { /* Recent emoji are a convenience only. */ }
    props.onPick(emoji);
  };
  const grid = (items: { unicode: string; label: string }[]) => <div class="kit-emoji-grid"><For each={items}>{item => <button type="button" aria-label={`Icône ${item.unicode}`} title={item.label} onClick={() => pick(item.unicode)}>{item.unicode}</button>}</For></div>;
  return <div class="kit-emoji-picker kit-menu popover" role="dialog" aria-label={props.label} style={props.style}>
    <div class="kit-emoji-tabs"><span class="kit-emoji-tab" aria-current="page">Emoji</span><span class="kit-emoji-spacer"/>
      <button type="button" disabled={!data()} onClick={() => { const list = data()!.emoji; pick(list[Math.floor(Math.random() * list.length)].unicode); }}><Shuffle size={14}/>Aléatoire</button>
      <Show when={props.onRemove}><button type="button" onClick={() => props.onRemove?.()}>Supprimer</button></Show>
    </div>
    <label class="kit-emoji-filter"><Search size={14}/><input aria-label="Filtrer les emojis" placeholder="Filtrer…" value={query()} ref={element => requestAnimationFrame(() => element.focus())} onInput={e => setQuery(e.currentTarget.value)}/></label>
    <div class="kit-emoji-scroll">
      <Show when={data()} fallback={<p class="kit-emoji-empty">Chargement des emojis…</p>}>
        <Show when={query().trim()} fallback={<>
          <Show when={recent().length}><div class="kit-emoji-group">Récents</div>{grid(recent().map(unicode => ({ unicode, label: unicode })))}</Show>
          <For each={data()!.groups}>{group => <><div class="kit-emoji-group">{group.name}</div>{grid(group.items)}</>}</For>
        </>}>
          {grid(matches())}
          <Show when={!matches().length}><p class="kit-emoji-empty">Aucun emoji trouvé.</p></Show>
        </Show>
      </Show>
    </div>
  </div>;
}
