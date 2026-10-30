import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

// shortcut: common grammars load eagerly; use on-demand loading before expanding the language catalog.
const lowlight = createLowlight(common);
export const codeLanguages = ['plaintext', ...lowlight.listLanguages().filter(name => name !== 'plaintext').sort()];
const labels: Record<string, string> = { plaintext: 'Texte brut', javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', xml: 'HTML / XML', bash: 'Shell', cpp: 'C++', csharp: 'C#', css: 'CSS', json: 'JSON', sql: 'SQL', yaml: 'YAML', markdown: 'Markdown' };
const label = (language: string | null) => labels[language || 'plaintext'] || language || 'Texte brut';

export const CodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return { ...this.parent?.(), wrap: { default: false, parseHTML: el => el.getAttribute('data-code-wrap') === 'true', renderHTML: attrs => ({ 'data-code-wrap': String(!!attrs.wrap) }) }, caption: { default: '', parseHTML: el => el.getAttribute('data-code-caption') || '', renderHTML: attrs => ({ 'data-code-caption': attrs.caption }) } };
  },
  parseMarkdown(token, helpers) {
    let language = token.lang || null, wrap = false, caption = '';
    const metadata = language?.match(/^(?:(.*?) )?fotion=([^ ]+)$/);
    if (metadata) {
      try {
        const value = JSON.parse(decodeURIComponent(metadata[2]));
        if (value && typeof value.wrap === 'boolean' && typeof value.caption === 'string') {
          language = metadata[1] || null; wrap = value.wrap; caption = value.caption;
        }
      } catch { /* Preserve unknown fence metadata as part of the language. */ }
    }
    return helpers.createNode('codeBlock', { language, wrap, caption }, token.text ? [helpers.createTextNode(token.text)] : []);
  },
  renderMarkdown(node) {
    const text = (node.content || []).map(child => child.text || '').join('');
    const language = node.attrs?.language || '';
    const marker = language.includes('`') ? '~' : '`';
    const runs = text.match(marker === '`' ? /`+/g : /~+/g) || [];
    const fence = marker.repeat(Math.max(3, ...runs.map(run => run.length + 1)));
    const metadata = node.attrs?.wrap || node.attrs?.caption
      ? ` fotion=${encodeURIComponent(JSON.stringify({ wrap: !!node.attrs?.wrap, caption: node.attrs?.caption || '' }))}` : '';
    return `${fence}${language}${metadata}\n${text}\n${fence}`;
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node, destroyed = false, timer: ReturnType<typeof setTimeout> | undefined;
      const dom = document.createElement('div'); dom.className = 'code-block';
      const toolbar = document.createElement('div'); toolbar.className = 'code-toolbar'; toolbar.contentEditable = 'false';
      toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', 'Options du code');
      const language = document.createElement('button'); language.type = 'button'; language.className = 'code-language'; language.setAttribute('aria-label', 'Langage du code'); language.setAttribute('aria-haspopup', 'dialog'); language.setAttribute('aria-expanded', 'false');
      const actions = document.createElement('div'); actions.className = 'code-actions';
      const button = (text: string) => { const el = document.createElement('button'); el.type = 'button'; el.textContent = text; actions.append(el); return el; };
      const copy = button('Copier'), wrap = button('Retour à la ligne'), captionButton = button('Légende');
      language.disabled = !editor.isEditable; wrap.disabled = !editor.isEditable; captionButton.disabled = !editor.isEditable;
      const status = document.createElement('span'); status.className = 'code-status'; status.setAttribute('role', 'status');
      const pre = document.createElement('pre'), code = document.createElement('code'); pre.append(code); pre.spellcheck = false;
      const caption = document.createElement('input'); caption.className = 'code-caption'; caption.contentEditable = 'false'; caption.placeholder = 'Ajouter une légende…'; caption.setAttribute('aria-label', 'Légende du code'); caption.readOnly = !editor.isEditable;
      const picker = document.createElement('div'); picker.className = 'code-language-menu popover'; picker.contentEditable = 'false'; picker.hidden = true; picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', 'Choisir le langage');
      const search = document.createElement('input'); search.placeholder = 'Rechercher un langage…'; search.setAttribute('aria-label', 'Rechercher un langage');
      const list = document.createElement('div'); list.className = 'code-language-options'; picker.append(search, list);
      toolbar.append(language, actions, status); dom.append(toolbar, picker, pre, caption);
      const updateAttrs = (attrs: Record<string, unknown>) => {
        const pos = getPos(); if (typeof pos !== 'number') return;
        const live = editor.state.doc.nodeAt(pos); if (live?.type.name !== 'codeBlock') return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...live.attrs, ...attrs }));
      };
      const close = () => { picker.hidden = true; language.setAttribute('aria-expanded', 'false'); };
      const choose = (value: string) => { updateAttrs({ language: value === 'plaintext' ? null : value }); close(); language.focus(); };
      const renderOptions = () => {
        list.replaceChildren();
        const query = search.value.trim().toLowerCase();
        const languages = current.attrs.language && !codeLanguages.includes(current.attrs.language) ? [current.attrs.language, ...codeLanguages] : codeLanguages;
        for (const id of languages.filter(id => `${id} ${label(id)}`.toLowerCase().includes(query))) {
          const option = document.createElement('button'); option.type = 'button'; option.textContent = label(id);
          option.setAttribute('aria-pressed', String((current.attrs.language || 'plaintext') === id));
          option.onclick = () => choose(id); list.append(option);
        }
        if (!list.children.length) { const empty = document.createElement('p'); empty.textContent = 'Aucun langage correspondant.'; list.append(empty); }
      };
      language.onclick = () => {
        if (!picker.hidden) { close(); return; }
        picker.hidden = false; language.setAttribute('aria-expanded', 'true'); search.value = ''; renderOptions(); search.focus();
      };
      search.oninput = renderOptions;
      picker.onkeydown = event => {
        const options = [...list.querySelectorAll('button')];
        if (event.key === 'Escape') { close(); language.focus(); event.preventDefault(); event.stopPropagation(); }
        if (event.key === 'Enter' && event.target === search) { options[0]?.click(); event.preventDefault(); }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          const index = options.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
          options[next]?.focus(); event.preventDefault();
        }
      };
      const outside = (event: PointerEvent) => { if (!dom.contains(event.target as Node)) close(); };
      document.addEventListener('pointerdown', outside);
      dom.addEventListener('focusout', event => { if (!dom.contains(event.relatedTarget as Node)) close(); });
      copy.onclick = async () => {
        clearTimeout(timer);
        try {
          await navigator.clipboard.writeText(current.textContent);
          if (destroyed) return;
          copy.textContent = 'Copié'; status.textContent = 'Code copié.';
        } catch {
          if (destroyed) return;
          copy.textContent = 'Réessayer'; status.textContent = 'Copie impossible. Sélectionnez le code et copiez-le au clavier.';
        }
        timer = setTimeout(() => { copy.textContent = 'Copier'; status.textContent = ''; }, 3000);
      };
      wrap.onclick = () => updateAttrs({ wrap: !current.attrs.wrap });
      captionButton.onclick = () => { caption.hidden = false; caption.focus(); };
      caption.oninput = () => updateAttrs({ caption: caption.value });
      caption.onkeydown = event => {
        if (event.key === 'Escape' || event.key === 'Enter') { caption.blur(); editor.commands.focus(); event.preventDefault(); }
      };
      const refresh = () => {
        language.textContent = `${label(current.attrs.language)} ▾`;
        wrap.setAttribute('aria-pressed', String(!!current.attrs.wrap));
        dom.classList.toggle('code-wrapped', !!current.attrs.wrap);
        if (document.activeElement !== caption) { caption.value = current.attrs.caption; caption.hidden = !current.attrs.caption; }
        code.className = current.attrs.language ? `language-${current.attrs.language}` : '';
      };
      refresh();
      return {
        dom, contentDOM: code,
        update(updated) { if (updated.type !== current.type) return false; current = updated; refresh(); return true; },
        stopEvent: event => event.target instanceof Node && (toolbar.contains(event.target) || picker.contains(event.target) || event.target === caption),
        ignoreMutation: mutation => mutation.type !== 'selection' && !code.contains(mutation.target),
        destroy() { destroyed = true; clearTimeout(timer); document.removeEventListener('pointerdown', outside); },
      };
    };
  },
}).configure({
  lowlight: {
    highlight: lowlight.highlight,
    listLanguages: lowlight.listLanguages,
    registered: lowlight.registered,
    // Unknown and plain languages stay plain; avoid expensive auto-detection on every keystroke.
    highlightAuto: (value: string) => ({ children: [{ type: 'text', value }] }),
  },
  defaultLanguage: null,
});
