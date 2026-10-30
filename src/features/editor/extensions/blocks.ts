import { Node } from '@tiptap/core';

export const ToggleSummary = Node.create({
  name: 'toggleSummary', content: 'inline*', defining: true,
  addAttributes: () => ({ level: { default: 0, rendered: false, parseHTML: element => {
    const heading = element.querySelector('h1,h2,h3');
    return heading ? Number(heading.tagName.slice(1)) : 0;
  } } }),
  parseHTML: () => [{ tag: 'summary', contentElement: element => element.querySelector('h1,h2,h3') || element }],
  renderHTML: ({ node }) => [1, 2, 3].includes(node.attrs.level)
    ? ['summary', { 'data-heading-level': node.attrs.level }, [`h${node.attrs.level}`, {}, 0]]
    : ['summary', {}, 0],
  addKeyboardShortcuts() {
    return { Enter: () => {
      const { $from } = this.editor.state.selection;
      if ($from.parent.type.name !== this.name) return false;
      const summary = this.editor.view.nodeDOM($from.before());
      if (summary instanceof HTMLElement) summary.closest('details')?.setAttribute('open', '');
      return this.editor.commands.setTextSelection($from.after() + 1);
    } };
  },
});

export const Toggle = Node.create({
  name: 'toggle', group: 'block', content: 'toggleSummary block+', defining: true,
  parseHTML: () => [{ tag: 'details' }],
  renderHTML: () => ['details', { open: '', class: 'toggle-block' }, 0],
  addNodeView() {
    return () => {
      const dom = document.createElement('details'); dom.open = true; dom.className = 'toggle-block';
      const click = (event: MouseEvent) => {
        const summary = (event.target as HTMLElement).closest('summary');
        if (!summary || summary.parentElement !== dom) return;
        event.preventDefault();
        if (event.detail === 0 || event.clientX <= summary.getBoundingClientRect().left + 21) dom.open = !dom.open;
      };
      dom.addEventListener('click', click);
      return { dom, contentDOM: dom, ignoreMutation: mutation => mutation.type === 'attributes' && mutation.target === dom && mutation.attributeName === 'open', destroy: () => dom.removeEventListener('click', click) };
    };
  },
  markdownTokenizer: {
    name: 'toggle', level: 'block', start: src => src.indexOf('<details>'),
    tokenize(src, _tokens, lexer) {
      if (!src.startsWith('<details>')) return;
      let depth = 0, end = -1, offset = 0;
      let fence: { char: string; length: number } | undefined;
      for (const line of src.split('\n')) {
        const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
        if (fence) {
          if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && line.slice(marker[0].length).trim() === '') fence = undefined;
        } else if (marker) fence = { char: marker[1][0], length: marker[1].length };
        else if (/^[ \t]*<details>[ \t]*$/.test(line)) depth++;
        else if (/^[ \t]*<\/details>[ \t]*$/.test(line)) {
          depth--;
          if (depth === 0) { end = offset + line.indexOf('</details>') + 10; break; }
        }
        offset += line.length + 1;
      }
      if (end < 0) return;
      const raw = src.slice(0, end);
      const summary = raw.match(/^<details>\s*<summary>([\s\S]*?)<\/summary>/);
      if (!summary) return;
      const heading = summary[1].match(/^<h([123])>([\s\S]*)<\/h\1>$/);
      return { type: 'toggle', raw, level: heading ? Number(heading[1]) : 0, summary: lexer.inlineTokens(heading ? heading[2] : summary[1]), tokens: lexer.blockTokens(raw.slice(summary[0].length, -10).trim()) };
    },
  },
  parseMarkdown(token, helpers) {
    const body = helpers.parseChildren(token.tokens || []);
    return helpers.createNode('toggle', undefined, [helpers.createNode('toggleSummary', { level: token.level || 0 }, helpers.parseInline(token.summary || [])), ...(body.length ? body : [{ type: 'paragraph' }])]);
  },
  renderMarkdown(node, helpers) {
    const summary = node.content?.[0];
    const level = summary?.attrs?.level;
    const text = helpers.renderChildren(summary?.content || []);
    const title = [1, 2, 3].includes(level) ? `<h${level}>${text}</h${level}>` : text;
    return `<details>\n<summary>${title}</summary>\n\n${helpers.renderChildren(node.content?.slice(1) || [], '\n\n')}\n\n</details>`;
  },
});
