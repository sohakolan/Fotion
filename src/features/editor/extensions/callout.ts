import { Node } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { colorId, textColors } from './colors';

const iconValue = (value: unknown) => typeof value === 'string' && value.length <= 32 && !/[\x00-\x1f]/.test(value) ? value : '💡';
const appearance = (attrs: Record<string, unknown>) => {
  const color = colorId(attrs.color), background = colorId(attrs.background);
  return { 'data-callout': '', 'data-callout-icon': iconValue(attrs.icon), 'data-fotion-color': color, 'data-fotion-background': background, class: 'callout-block', style: `color:${textColors.find(c => c.id === color)!.text};background-color:${background === 'default' ? 'var(--sidebar)' : textColors.find(c => c.id === background)!.background}` };
};

export const Callout = Node.create({
  name: 'callout', group: 'block', content: 'block+', defining: true,
  addAttributes: () => ({
    icon: { default: '💡', rendered: false, parseHTML: element => iconValue(element.getAttribute('data-callout-icon') ?? '💡') },
    color: { default: 'default', rendered: false, parseHTML: element => colorId(element.getAttribute('data-fotion-color')) },
    background: { default: 'default', rendered: false, parseHTML: element => colorId(element.getAttribute('data-fotion-background')) },
  }),
  parseHTML: () => [{ tag: 'aside[data-callout]', contentElement: element => element.querySelector('.callout-content') || element.querySelector('div') || element }],
  renderHTML: ({ node }) => ['aside', appearance(node.attrs), ['span', { contenteditable: 'false', class: 'callout-icon' }, iconValue(node.attrs.icon)], ['div', { class: 'callout-content' }, 0]],
  markdownTokenizer: {
    name: 'callout', level: 'block', start: source => source.indexOf('> [!NOTE]'),
    tokenize(source, _tokens, lexer) {
      const match = source.match(/^> \[!NOTE\]([^\n]*)\n((?:>[^\n]*(?:\n|$))*)/);
      if (!match) return;
      let attrs = { icon: '💡', color: 'default', background: 'default' };
      const metadata = match[1].match(/^ <!-- fotion:callout ([^ ]+) -->$/);
      if (metadata) {
        try {
          const value = JSON.parse(decodeURIComponent(metadata[1]));
          if (value && typeof value === 'object') attrs = { icon: iconValue(value.icon), color: colorId(value.color), background: colorId(value.background) };
        } catch { /* Invalid appearance metadata must not prevent reading the body. */ }
      }
      return { type: 'callout', raw: match[0], attrs, tokens: lexer.blockTokens(match[2].replace(/^> ?/gm, '')) };
    },
  },
  parseMarkdown(token, helpers) {
    const body = helpers.parseChildren(token.tokens || []);
    return helpers.createNode('callout', token.attrs, body.length ? body : [{ type: 'paragraph' }]);
  },
  renderMarkdown(node, helpers) {
    const attrs = { icon: iconValue(node.attrs?.icon), color: colorId(node.attrs?.color), background: colorId(node.attrs?.background) };
    const metadata = attrs.icon !== '💡' || attrs.color !== 'default' || attrs.background !== 'default' ? ` <!-- fotion:callout ${encodeURIComponent(JSON.stringify(attrs))} -->` : '';
    return `> [!NOTE]${metadata}\n${helpers.renderChildren(node.content || [], '\n\n').split('\n').map(line => `> ${line}`).join('\n')}`;
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;
      const dom = document.createElement('aside');
      const icon = document.createElement('button'); icon.type = 'button'; icon.className = 'callout-icon'; icon.contentEditable = 'false';
      icon.setAttribute('aria-label', 'Changer l’icône de l’encadré'); icon.setAttribute('aria-haspopup', 'dialog');
      const content = document.createElement('div'); content.className = 'callout-content';
      const picker = document.createElement('form'); picker.className = 'callout-icon-picker popover'; picker.contentEditable = 'false'; picker.hidden = true;
      picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', 'Icône de l’encadré');
      const grid = document.createElement('div'); grid.className = 'callout-emoji-grid';
      const input = document.createElement('input'); input.maxLength = 32; input.setAttribute('aria-label', 'Icône personnalisée'); input.placeholder = 'Coller un emoji…';
      const apply = document.createElement('button'); apply.type = 'submit'; apply.textContent = 'Appliquer';
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Supprimer l’icône';
      const close = () => { picker.hidden = true; icon.setAttribute('aria-expanded', 'false'); };
      const choose = (value: string) => {
        const pos = getPos(); if (typeof pos !== 'number' || !editor.isEditable) return;
        const live = editor.state.doc.nodeAt(pos); if (live?.type.name !== 'callout') return;
        editor.view.dispatch(closeHistory(editor.state.tr).setNodeMarkup(pos, undefined, { ...live.attrs, icon: iconValue(value) }));
        close(); icon.focus({ preventScroll: true });
      };
      for (const emoji of ['💡', '📌', '✨', '⚠️', '✅', '❗', '📝', '💬', '🎯', '🚀', '📚', '❤️']) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = emoji;
        button.setAttribute('aria-label', `Icône ${emoji}`); button.addEventListener('click', () => choose(emoji)); grid.append(button);
      }
      picker.append(grid, input, apply, remove); dom.append(icon, content, picker);
      picker.addEventListener('submit', event => { event.preventDefault(); choose(input.value.trim()); });
      remove.addEventListener('click', () => choose(''));
      picker.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); icon.focus(); } });
      icon.addEventListener('click', () => {
        if (!picker.hidden) { close(); return; }
        if (!editor.isEditable) return;
        input.value = iconValue(current.attrs.icon); picker.hidden = false; icon.setAttribute('aria-expanded', 'true');
        const rect = icon.getBoundingClientRect();
        picker.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 264))}px`;
        picker.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - picker.offsetHeight - 8))}px`;
        grid.querySelector('button')?.focus();
      });
      const outside = (event: Event) => { if (!picker.contains(event.target as globalThis.Node) && event.target !== icon) close(); };
      const scroll = (event: Event) => { if (!picker.contains(event.target as globalThis.Node)) close(); };
      document.addEventListener('pointerdown', outside); window.addEventListener('scroll', scroll, true); window.addEventListener('resize', close);
      const refresh = () => {
        for (const [name, value] of Object.entries(appearance(current.attrs))) dom.setAttribute(name, value);
        icon.textContent = iconValue(current.attrs.icon) || '+'; icon.classList.toggle('empty-icon', !current.attrs.icon); icon.disabled = !editor.isEditable;
      };
      close(); refresh();
      return {
        dom, contentDOM: content,
        update(updated) { if (updated.type !== current.type) return false; current = updated; refresh(); return true; },
        stopEvent: event => icon.contains(event.target as globalThis.Node) || picker.contains(event.target as globalThis.Node),
        ignoreMutation: mutation => mutation.type !== 'selection' && !content.contains(mutation.target),
        destroy() { document.removeEventListener('pointerdown', outside); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', close); },
      };
    };
  },
});
