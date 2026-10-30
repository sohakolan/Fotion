import { createSignal, createMemo, onMount, onCleanup, Show, For } from 'solid-js';
import { Editor, type ChainedCommands } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import { textColors, colorId, type ColorId } from './colors';
import { editorExtensions } from './extensions';
import { TextSelection } from '@tiptap/pm/state';
import BlockControls from './BlockControls';
import { blockAt, moveBlockTransaction, isListItem, type Block } from './block-move';
import { Bold, Italic, Underline, Strikethrough, Code, Link, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Trash2, Copy, Type, Search, Check, Plus, ImagePlus, X } from 'lucide-solid';


const blocks: { label: string; hint: string; icon: string; keywords: string; action: (chain: ChainedCommands) => ChainedCommands }[] = [
  { label: 'Page', hint: 'Créez une sous-page dans cette page.', icon: '↗', keywords: 'page sous-page', action: c => c },
  { label: 'Image', hint: 'Intégrez une image à partir de son lien.', icon: '▧', keywords: 'image photo', action: c => c },
  { label: 'Texte', hint: 'Commencez à écrire, tout simplement.', icon: 'T', keywords: 'paragraph texte', action: c => c.setParagraph() },
  { label: 'Titre 1', hint: 'Un grand titre de section.', icon: 'H₁', keywords: 'heading h1 titre', action: c => c.setHeading({ level: 1 }) },
  { label: 'Titre 2', hint: 'Un titre de section intermédiaire.', icon: 'H₂', keywords: 'heading h2 titre', action: c => c.setHeading({ level: 2 }) },
  { label: 'Titre 3', hint: 'Un petit titre de section.', icon: 'H₃', keywords: 'heading h3 titre', action: c => c.setHeading({ level: 3 }) },
  { label: 'Liste à puces', hint: 'Une liste simple et bien organisée.', icon: '≡', keywords: 'bullet liste puces', action: c => c.toggleBulletList() },
  { label: 'Liste numérotée', hint: 'Une liste avec un ordre à suivre.', icon: '1.', keywords: 'number liste numérotée', action: c => c.toggleOrderedList() },
  { label: 'Liste de tâches', hint: 'Gardez une trace de vos tâches.', icon: '☑', keywords: 'todo task tâches checkbox', action: c => c.toggleTaskList() },
  { label: 'Encadré', hint: 'Mettez une idée importante en avant.', icon: '💡', keywords: 'callout encadré note', action: c => c.wrapIn('callout') },
  { label: 'Liste dépliante', hint: 'Masquez ou affichez des blocs de contenu.', icon: '▸', keywords: 'toggle liste dépliante', action: c => c.insertContent({ type: 'toggle', content: [{ type: 'toggleSummary', content: [{ type: 'text', text: 'Liste dépliante' }] }, { type: 'paragraph' }] }) },
  { label: 'Citation', hint: 'Mettez un passage en lumière.', icon: '❞', keywords: 'quote citation', action: c => c.toggleBlockquote() },
  { label: 'Séparateur', hint: 'Séparez visuellement vos idées.', icon: '―', keywords: 'divider hr ligne séparateur', action: c => c.setHorizontalRule() },
  { label: 'Code', hint: 'Capturez un extrait de code.', icon: '‹›', keywords: 'code', action: c => c.toggleCodeBlock() },
  { label: 'Tableau', hint: 'Organisez des informations simplement.', icon: '▦', keywords: 'table tableau', action: c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
];

export default function DocumentEditor(props: { content: string; onChange: (content: string) => void; onReady: (editor: Editor | undefined) => void; onCreatePage: () => void }) {
  let element!: HTMLDivElement;
  let editor!: Editor;
  const [ready, setReady] = createSignal(false);
  const [colorMenu, setColorMenu] = createSignal<{ x: number; y: number; from: number; to: number }>();
  let lastColor: { kind: 'color' | 'background'; value: ColorId } | undefined;
  const [transform, setTransform] = createSignal(false);
  const [blockQuery, setBlockQuery] = createSignal('');
  const [linkDraft, setLinkDraft] = createSignal<{ value: string; from: number; to: number; x: number; y: number }>();
  const [imageDraft, setImageDraft] = createSignal<string>();
  const [imageError, setImageError] = createSignal('');
  let imagePosition = 0;
  const [linkError, setLinkError] = createSignal('');
  const [slash, setSlash] = createSignal<{ from: number; to: number; query: string; x: number; y: number }>();
  const [choice, setChoice] = createSignal(0);
  const [selection, setSelection] = createSignal<{ x: number; y: number }>();
  const [revision, setRevision] = createSignal(0);
  const [blockMenu, setBlockMenu] = createSignal<{ x: number; y: number; pos: number }>();
  const filteredBlocks = () => blocks.filter(b => b.label.toLocaleLowerCase().includes(blockQuery().toLocaleLowerCase()));
  const options = createMemo(() => blocks.filter(b => `${b.label} ${b.keywords}`.toLowerCase().includes(slash()?.query.toLowerCase() || '')));
  const active = (name: string) => { revision(); return editor?.isActive(name); };
  const apply = (index: number) => {
    const item = options()[index];
    const range = slash();
    if (!item || !range) return;
    setSlash(undefined);
    item.action(editor.chain().focus().deleteRange({ from: range.from, to: range.to })).run();
    if (item.label === 'Page') props.onCreatePage();
    if (item.label === 'Image') { imagePosition = editor.state.selection.from; setImageError(''); setImageDraft(''); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.image-url-input')?.focus()); }
  };
  function openColors() {
    const { from, to } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    setColorMenu({ from, to, x: Math.max(8, Math.min(coords.left, window.innerWidth - 242)), y: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 440)) });
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.color-menu button')?.focus());
  }
  function applyColor(kind: 'color' | 'background', value: ColorId) {
    const range = colorMenu();
    const chain = editor.chain().focus();
    if (range) chain.setTextSelection({ from: range.from, to: range.to });
    chain.setMark('textColor', { [kind]: value }).run();
    lastColor = { kind, value };
    try { localStorage.setItem('fotion-last-color', JSON.stringify(lastColor)); } catch { /* Formatting still works when browser storage is unavailable. */ }
    setColorMenu(undefined);
  }
  function updateMenus() {
    setRevision(n => n + 1);
    const { from, to, empty, $from } = editor.state.selection;
    const before = $from.parent.textBetween(0, $from.parentOffset, '\0');
    const match = before.match(/^\/([^/]*)$/);
    if (empty && match && $from.parent.type.name === 'paragraph') {
      const coords = editor.view.coordsAtPos(from);
      if (slash()?.query !== match[1]) setChoice(0);
      setSlash({ from: from - match[0].length, to: from, query: match[1], x: Math.max(8, Math.min(coords.left, window.innerWidth - 332)), y: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 370)) });
    } else setSlash(undefined);
    if (!empty && editor.state.selection instanceof TextSelection) {
      const start = editor.view.coordsAtPos(from), end = editor.view.coordsAtPos(to);
      setSelection({ x: Math.max(12, Math.min((start.left + end.left) / 2 - 140, window.innerWidth - 460)), y: Math.max(8, start.top - 45) });
    } else setSelection(undefined);
  }
  function closeBlockMenu() { setBlockMenu(undefined); setTransform(false); setBlockQuery(''); }
  function selectBlock(pos: number) {
    const selection = TextSelection.near(editor.state.doc.resolve(pos + 1));
    editor.commands.setTextSelection(selection.from);
  }
  function openBlockMenu(block: Block, x: number, y: number) {
    setSelection(undefined); setSlash(undefined); setTransform(false); setBlockQuery('');
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.block-menu-search input')?.focus());
    setBlockMenu({ pos: block.pos, x: Math.max(8, Math.min(x, window.innerWidth - 260)), y: Math.max(8, Math.min(y, window.innerHeight - 330)) });
  }
  function insertBelow(block: Block) {
    const at = block.pos + block.node.nodeSize;
    const paragraph = { type: 'paragraph', content: [{ type: 'text', text: '/' }] };
    const content = isListItem(block.node) ? { type: block.node.type.name, content: [paragraph] } : paragraph;
    editor.chain().focus().insertContentAt(at, content).setTextSelection(at + (isListItem(block.node) ? 3 : 2)).run();
  }
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
      extensions: [...editorExtensions(), Placeholder.configure({ placeholder: 'Appuyez sur « / » pour les commandes…' })],
      content: props.content,
      contentType: 'markdown',
      editorProps: {
        attributes: { class: 'prose', 'aria-label': 'Contenu de la page', role: 'textbox', 'aria-multiline': 'true', spellcheck: 'true' },
        handleKeyDown: (_, event) => {
          if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'h' && lastColor) {
            applyColor(lastColor.kind, lastColor.value); event.preventDefault(); return true;
          }
          if (event.altKey && event.shiftKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
            const block = blockAt(editor.state.doc, editor.state.selection.from);
            if (block) { setBlockMenu({ pos: block.pos, x: 0, y: 0 }); moveBlock(event.key === 'ArrowUp' ? -1 : 1); }
            event.preventDefault(); return true;
          }
          if (!slash()) return false;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const count = options().length;
            if (count) setChoice(i => (i + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
            event.preventDefault(); return true;
          }
          if (event.key === 'Enter' && options().length) { apply(choice()); event.preventDefault(); return true; }
          if (event.key === 'Escape') { setSlash(undefined); event.preventDefault(); return true; }
          return false;
        },
      },
      onUpdate: () => { props.onChange(editor.getMarkdown()); updateMenus(); },
      onSelectionUpdate: updateMenus,
      onBlur: () => { setTimeout(() => { if (!document.activeElement?.closest('.bubble-menu, .link-popover, .color-menu')) setSelection(undefined); }, 180); },
    });
    setReady(true);
    props.onReady(editor);
    const close = (event: MouseEvent) => { if (!(event.target as HTMLElement).closest('.block-menu, .block-controls, .block-submenu')) closeBlockMenu(); };
    const scroll = (e: Event) => { if ((e.target as HTMLElement)?.closest?.('.popover')) return; setSelection(undefined); setSlash(undefined); setColorMenu(undefined); closeBlockMenu(); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeBlockMenu(); setLinkDraft(undefined); setImageDraft(undefined); if (colorMenu()) { setColorMenu(undefined); editor.commands.focus(); } } };
    window.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', close);
    window.addEventListener('scroll', scroll, true);
    onCleanup(() => { window.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', close); window.removeEventListener('scroll', scroll, true); props.onReady(undefined); editor.destroy(); });
  });
  function link() {
    const range = editor.state.selection;
    const coords = editor.view.coordsAtPos(range.from);
    setLinkError('');
    setLinkDraft({ value: editor.getAttributes('link').href || '', from: range.from, to: range.to, x: Math.max(8, Math.min(coords.left, window.innerWidth - 340)), y: Math.max(8, Math.min(coords.bottom + 10, window.innerHeight - 150)) });
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.link-popover input')?.focus());
  }
  function saveLink() {
    const draft = linkDraft(); if (!draft) return;
    const value = draft.value.trim();
    if (value && !/^(https?:\/\/|mailto:)/i.test(value)) { setLinkError('Utilisez une adresse https:// ou mailto:.'); return; }
    const chain = editor.chain().focus().setTextSelection({ from: draft.from, to: draft.to }).extendMarkRange('link');
    if (value) chain.setLink({ href: value }).run(); else chain.unsetLink().run();
    setLinkDraft(undefined);
  }
  return <>
    <div ref={element} class="editor" />
    <Show when={ready()}><BlockControls editor={editor} onMenu={openBlockMenu} onAdd={insertBelow}/></Show>
    <Show when={selection()}>{position => <div class="bubble-menu" role="toolbar" aria-label="Mise en forme" style={{ left: `${position().x}px`, top: `${position().y}px` }} onMouseDown={e => e.preventDefault()}>
      <button title="Transformer en titre" onClick={() => { const block = blockAt(editor.state.doc, editor.state.selection.from); if (block) { openBlockMenu(block, position().x, position().y + 38); setTransform(true); } }}>{editor?.isActive('heading') ? `Titre ${editor.getAttributes('heading').level}` : 'Texte'} <ChevronDown size={12}/></button><span class="menu-separator"/>
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
        <For each={textColors}>{color => <button role="menuitemradio" aria-label={`${color.label}${kind === 'background' ? ' — fond' : ''}`} aria-checked={(revision(), editor.getAttributes('textColor')[kind] || 'default') === color.id} onClick={() => applyColor(kind, color.id)}>
          <span aria-hidden="true" class="color-swatch" data-fotion-color={kind === 'color' ? color.id : 'default'} data-fotion-background={kind === 'background' ? color.id : 'default'} style={{ color: kind === 'color' ? color.text : 'inherit', 'background-color': kind === 'background' ? color.background : 'transparent' }}>A</span>
          {color.label}{kind === 'background' && color.id !== 'default' ? ' — fond' : ''}
          <Show when={(revision(), editor.getAttributes('textColor')[kind] || 'default') === color.id}><Check size={14} class="menu-end"/></Show>
        </button>}</For>
      </>}</For>
    </div></>}</Show>
    <Show when={slash()}>{position => <div class="slash-menu popover" role="listbox" aria-label="Types de blocs" style={{ left: `${position().x}px`, top: `${position().y}px` }}>
      <div class="menu-label">Blocs de base</div>
      <For each={options()}>{(item, i) => <button role="option" aria-selected={choice() === i()} classList={{ chosen: choice() === i() }} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setChoice(i())} onClick={() => apply(i())}><span class="block-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>}</For>
      <Show when={!options().length}><p class="empty-message">Aucun bloc correspondant.</p></Show>
    </div>}</Show>
    <Show when={blockMenu()}>{position => <><div class="dismiss-layer" onClick={closeBlockMenu}/><div class="block-menu popover" role="menu" aria-label="Options du bloc" style={{ left: `${position().x}px`, top: `${position().y}px` }}>
      <div class="block-menu-search"><Search size={14}/><input aria-label="Rechercher un type de bloc" placeholder="Rechercher une action…" value={blockQuery()} onInput={e => { setBlockQuery(e.currentTarget.value); setTransform(true); }}/></div>
      <Show when={!transform()} fallback={<>
        <button onClick={() => { setTransform(false); setBlockQuery(''); }}><ChevronRight size={14} class="back-chevron"/>Transformer en</button>
        <div class="popover-divider"/>
        <div class="transform-options"><For each={filteredBlocks().filter(b => !['Séparateur', 'Tableau', 'Liste dépliante', 'Page', 'Image'].includes(b.label))}>{item => <button role="menuitem" onClick={() => { selectBlock(position().pos); item.action(editor.chain().focus().clearNodes()).run(); closeBlockMenu(); }}><span class="transform-icon">{item.icon}</span>{item.label}</button>}</For></div>
      </>}>
        <button role="menuitem" onClick={() => setTransform(true)}><Type size={16}/>Transformer en<ChevronRight size={14} class="menu-end"/></button>
        <button role="menuitem" onClick={() => { const node = editor.state.doc.nodeAt(position().pos); if (node) editor.chain().focus().insertContentAt(position().pos + node.nodeSize, node.toJSON()).run(); closeBlockMenu(); }}><Copy size={16}/>Dupliquer</button>
        <div class="popover-divider"/>
        <button role="menuitem" onClick={() => moveBlock(-1)}><ArrowUp size={16}/>Déplacer vers le haut</button>
        <button role="menuitem" onClick={() => moveBlock(1)}><ArrowDown size={16}/>Déplacer vers le bas</button>
        <button role="menuitem" onClick={() => { const node = editor.state.doc.nodeAt(position().pos); if (node) insertBelow({ pos: position().pos, node }); closeBlockMenu(); }}><Plus size={16}/>Insérer un bloc en dessous</button>
        <div class="popover-divider"/>
        <button role="menuitem" class="danger" onClick={() => { const node = editor.state.doc.nodeAt(position().pos); if (node) editor.chain().focus().deleteRange({ from: position().pos, to: position().pos + node.nodeSize }).run(); closeBlockMenu(); }}><Trash2 size={16}/>Supprimer</button>
      </Show>
    </div></>}</Show>
    <Show when={linkDraft()}>{draft => <><div class="dismiss-layer" onClick={() => setLinkDraft(undefined)}/><form class="link-popover popover" style={{ left: `${draft().x}px`, top: `${draft().y}px` }} onSubmit={e => { e.preventDefault(); saveLink(); }}>
      <label for="link-url">Lien</label><div class="link-field"><Link size={16}/><input id="link-url" placeholder="Collez un lien…" value={draft().value} onInput={e => setLinkDraft({ ...draft(), value: e.currentTarget.value })}/><button type="submit" aria-label="Appliquer le lien"><Check size={16}/></button></div>
      <Show when={linkError()}><p class="field-error">{linkError()}</p></Show>
      <button type="button" onClick={() => { setLinkDraft({ ...draft(), value: '' }); saveLink(); }}>Supprimer le lien</button>
    </form></>}</Show>
    <Show when={imageDraft() !== undefined}><div class="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setImageDraft(undefined); }}><form class="modal image-dialog" role="dialog" aria-modal="true" aria-label="Ajouter une image" onSubmit={e => {
      e.preventDefault(); const src = imageDraft()?.trim() || '';
      if (!/^https?:\/\//i.test(src)) { setImageError('Saisissez une adresse d’image http:// ou https://.'); return; }
      editor.chain().focus().setTextSelection(Math.min(imagePosition, editor.state.doc.content.size)).setImage({ src, alt: '' }).run(); setImageDraft(undefined);
    }}><div class="popover-heading"><span>Intégrer une image</span><button type="button" class="icon-button" aria-label="Fermer" onClick={() => setImageDraft(undefined)}><X size={16}/></button></div><div class="image-dialog-body"><ImagePlus size={26}/><input class="image-url-input" aria-label="Lien de l’image" placeholder="Collez le lien de votre image…" value={imageDraft()} onInput={e => setImageDraft(e.currentTarget.value)}/><Show when={imageError()}><p class="field-error">{imageError()}</p></Show><button class="primary-button" type="submit">Intégrer l’image</button><small>Le lien de l’image est conservé dans votre fichier Markdown.</small></div></form></div></Show>
    <Show when={ready() && (revision(), editor?.isActive('table'))}><div class="table-tools" role="toolbar" aria-label="Modifier le tableau">
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()}><Plus size={13}/>Ligne</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()}><Plus size={13}/>Colonne</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeaderRow().run()}>En-tête</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()}>Supprimer la ligne</button>
      <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()}>Supprimer la colonne</button>
    </div></Show>
  </>;
}
