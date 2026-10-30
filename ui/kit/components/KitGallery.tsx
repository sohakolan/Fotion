import { createSignal, For } from 'solid-js';
import { Copy, Trash2, Repeat2, Link, Moon, Sun, Plus, GripVertical } from 'lucide-solid';
import { Menu, MenuItem, MenuDivider, MenuLabel, MenuFootnote, MenuSearch } from './Menu';
import { Button, IconButton, Switch, Kbd, Tooltip, modKey } from './Controls';

const surfaces = ['bg', 'sidebar', 'panel', 'text', 'muted', 'placeholder', 'hover', 'selected', 'line', 'blue', 'selection', 'danger'];
const palette = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
const type = [['Titre de page', 'title', 700], ['Titre 1', 'h1', 600], ['Titre 2', 'h2', 600], ['Titre 3', 'h3', 600], ['Texte', 'body', 400], ['Interface', 'ui', 400], ['Petit', 'sm', 400]] as const;

/** Reference sheet of every token and shared component, opened at `#ui-kit`. */
export default function KitGallery() {
  const [dark, setDark] = createSignal(document.documentElement.dataset.theme === 'dark');
  const [locked, setLocked] = createSignal(true);
  const [query, setQuery] = createSignal('');
  const theme = (value: boolean) => { setDark(value); document.documentElement.dataset.theme = value ? 'dark' : 'light'; };
  return <main class="kit-gallery">
    <header><h1>Fotion UI-Kit</h1><p>Jetons et composants alignés sur Notion. Toute l’interface les utilise.</p>
      <Button onClick={() => theme(!dark())}>{dark() ? <Sun size={16}/> : <Moon size={16}/>}{dark() ? 'Thème clair' : 'Thème sombre'}</Button></header>

    <section><h2>Surfaces et texte</h2><div class="kit-swatches"><For each={surfaces}>{name => <figure><span style={{ background: `var(--${name})` }}/><figcaption>--{name}</figcaption></figure>}</For></div></section>

    <section><h2>Palette des blocs</h2><div class="kit-palette"><For each={palette}>{name => <div style={{ background: `var(--bg-${name})` }}><strong style={{ color: `var(--color-${name})` }}>{name}</strong><small>--color-{name} · --bg-{name}</small></div>}</For></div></section>

    <section><h2>Typographie</h2><For each={type}>{([label, size, weight]) => <p style={{ 'font-size': `var(--text-${size})`, 'font-weight': weight, margin: '6px 0' }}>{label} <small>--text-{size}</small></p>}</For>
      <p style={{ 'font-family': 'var(--font-serif)' }}>Serif — Lyon / Georgia</p><p style={{ 'font-family': 'var(--font-mono)' }}>Mono — const answer = 42;</p></section>

    <section><h2>Formes et profondeur</h2><div class="kit-swatches"><For each={['radius-sm', 'radius', 'radius-lg']}>{name => <figure><span style={{ 'border-radius': `var(--${name})`, background: 'var(--hover)' }}/><figcaption>--{name}</figcaption></figure>}</For>
      <For each={['shadow', 'shadow-menu']}>{name => <figure><span style={{ 'box-shadow': `var(--${name})`, background: 'var(--panel)' }}/><figcaption>--{name}</figcaption></figure>}</For></div></section>

    <section><h2>Contrôles</h2><div class="kit-row">
      <Button variant="primary">Bouton principal</Button><Button>Bouton secondaire</Button>
      <IconButton label="Ajouter"><Plus size={18}/></IconButton><Kbd>{modKey}+P</Kbd>
      <span class="kit-tooltip-demo"><GripVertical size={18}/><Tooltip><b>Faire glisser</b> pour déplacer<br/><b>Cliquer</b> pour ouvrir le menu</Tooltip></span>
    </div></section>

    <section><h2>Menu</h2><div class="kit-row kit-menus">
      <Menu label="Exemple de menu de bloc" class="kit-static">
        <MenuSearch label="Rechercher" placeholder="Rechercher des actions…" value={query()} onInput={setQuery}/>
        <MenuItem icon={<Trash2 size={16}/>}>Supprimer</MenuItem>
        <MenuItem icon={<Copy size={16}/>} shortcut={`${modKey}+D`}>Dupliquer</MenuItem>
        <MenuItem icon={<Repeat2 size={16}/>} submenu>Transformer en</MenuItem>
        <MenuDivider/><MenuItem icon={<Link size={16}/>}>Copier le lien</MenuItem>
      </Menu>
      <Menu label="Exemple de menu de page" class="kit-static">
        <MenuLabel>Page</MenuLabel>
        <Switch checked={locked()} onChange={setLocked}>Verrouiller la page</Switch>
        <MenuItem danger icon={<Trash2 size={16}/>}>Déplacer vers la corbeille</MenuItem>
        <MenuDivider/><MenuFootnote>Nombre de mots : 42<br/>Modifiée aujourd’hui</MenuFootnote>
      </Menu>
    </div></section>
  </main>;
}
