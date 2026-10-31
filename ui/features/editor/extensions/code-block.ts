import { CodeBlock as EngineCodeBlock } from '../../../../engine';
import { lazyHighlighting } from '../lib/lazy-highlighting';
import { ensureLanguage } from '../lib/code-syntax';
import { detectLanguage } from '../../../../engine';

export const codeLanguages = ['plaintext', 'arduino', 'bash', 'c', 'cpp', 'csharp', 'css', 'diff', 'go', 'graphql', 'ini', 'java', 'javascript', 'json', 'kotlin', 'less', 'lua', 'makefile', 'markdown', 'objectivec', 'perl', 'php', 'php-template', 'python', 'python-repl', 'r', 'ruby', 'rust', 'scss', 'shell', 'sql', 'swift', 'typescript', 'vbnet', 'wasm', 'xml', 'yaml', 'dart', 'dockerfile', 'elixir', 'erlang', 'gradle', 'groovy', 'hcl', 'http', 'julia', 'latex', 'lisp', 'nginx', 'ocaml', 'powershell', 'properties', 'protobuf', 'vim'];
const labels: Record<string, string> = { plaintext: 'Texte brut', javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', xml: 'HTML / XML', bash: 'Shell', cpp: 'C++', csharp: 'C#', css: 'CSS', json: 'JSON', sql: 'SQL', yaml: 'YAML', markdown: 'Markdown', dart: 'Dart', dockerfile: 'Dockerfile', elixir: 'Elixir', erlang: 'Erlang', gradle: 'Gradle', groovy: 'Groovy', http: 'HTTP', julia: 'Julia', lisp: 'Lisp', nginx: 'Nginx', ocaml: 'OCaml', powershell: 'PowerShell', protobuf: 'Protobuf', latex: 'LaTeX', properties: 'Ini / Propriétés', vim: 'Vim', ts: 'TypeScript', js: 'JavaScript', yml: 'YAML', py: 'Python', py3: 'Python', sh: 'Shell', rb: 'Ruby', php: 'PHP', go: 'Go', rs: 'Rust', kt: 'Kotlin', swift: 'Swift', c: 'C', java: 'Java' };
const label = (language: string | null) => labels[language || 'plaintext'] || language || 'Texte brut';

export const CodeBlock = EngineCodeBlock.extend({
  addProseMirrorPlugins() { return [...(this.parent?.() || []), lazyHighlighting()]; },
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
      const choose = (value: string) => {
        updateAttrs({ language: value === 'plaintext' ? null : value, autoLanguage: false });
        close(); language.focus();
        void ensureLanguage(value).then(() => { if (!destroyed) editor.view.updateState(editor.view.state); });
      };
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
      // A fresh code block without a language gets one from the signatures of its content,
      // a little after the typing stops so the caret never jumps mid-sentence.
      let detectionTimer: ReturnType<typeof setTimeout> | undefined;
      const scheduleDetection = () => {
        clearTimeout(detectionTimer);
        if (current.attrs.language || current.attrs.autoLanguage) return;
        const text = current.textContent;
        if (!text.trim().includes('\n')) return;
        detectionTimer = setTimeout(() => {
          if (destroyed) return;
          const guess = detectLanguage(text);
          if (!guess) return;
          const posFielded = getPos(); if (typeof posFielded !== 'number') return;
          const live = editor.state.doc.nodeAt(posFielded); if (live?.type.name !== 'codeBlock' || live.attrs.language || live.attrs.autoLanguage) return;
          editor.view.dispatch(editor.state.tr.setNodeMarkup(posFielded, undefined, { ...live.attrs, language: guess, autoLanguage: true }));
        }, 600);
      };
      scheduleDetection();
      return {
        dom, contentDOM: code,
        update(updated) { if (updated.type !== current.type) return false; current = updated; refresh(); scheduleDetection(); return true; },
        stopEvent: event => event.target instanceof Node && (toolbar.contains(event.target) || picker.contains(event.target) || event.target === caption),
        ignoreMutation: mutation => mutation.type !== 'selection' && !code.contains(mutation.target),
        destroy() { destroyed = true; clearTimeout(timer); clearTimeout(detectionTimer); document.removeEventListener('pointerdown', outside); },
      };
    };
  },
});
