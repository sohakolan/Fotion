import { Node } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout', group: 'block', content: 'block+', defining: true,
  parseHTML: () => [{ tag: 'aside[data-callout]' }],
  renderHTML: () => ['aside', { 'data-callout': '', class: 'callout-block' }, ['span', { contenteditable: 'false', class: 'callout-icon' }, '💡'], ['div', {}, 0]],
  markdownTokenizer: {
    name: 'callout', level: 'block', start: src => src.indexOf('> [!NOTE]'),
    tokenize(src, _tokens, lexer) {
      const match = src.match(/^> \[!NOTE\][^\n]*\n((?:>[^\n]*(?:\n|$))*)/);
      if (!match) return;
      return { type: 'callout', raw: match[0], tokens: lexer.blockTokens(match[1].replace(/^> ?/gm, '')) };
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode('callout', undefined, helpers.parseChildren(token.tokens || [])),
  renderMarkdown: (node, helpers) => `> [!NOTE]\n${helpers.renderChildren(node.content || [], '\n\n').split('\n').map(line => `> ${line}`).join('\n')}`,
});

export const ToggleSummary = Node.create({
  name: 'toggleSummary', content: 'inline*', defining: true,
  parseHTML: () => [{ tag: 'summary' }], renderHTML: () => ['summary', {}, 0],
  addKeyboardShortcuts() {
    return { Enter: () => {
      const { $from } = this.editor.state.selection;
      if ($from.parent.type.name !== this.name) return false;
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
        if (summary && event.clientX > summary.getBoundingClientRect().left + 21) event.preventDefault();
      };
      dom.addEventListener('click', click);
      return { dom, contentDOM: dom, destroy: () => dom.removeEventListener('click', click) };
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
      return { type: 'toggle', raw, summary: lexer.inlineTokens(summary[1]), tokens: lexer.blockTokens(raw.slice(summary[0].length, -10).trim()) };
    },
  },
  parseMarkdown(token, helpers) {
    const body = helpers.parseChildren(token.tokens || []);
    return helpers.createNode('toggle', undefined, [helpers.createNode('toggleSummary', undefined, helpers.parseInline(token.summary || [])), ...(body.length ? body : [{ type: 'paragraph' }])]);
  },
  renderMarkdown: (node, helpers) => `<details>\n<summary>${helpers.renderChildren(node.content?.[0].content || [])}</summary>\n\n${helpers.renderChildren(node.content?.slice(1) || [], '\n\n')}\n\n</details>`,
});
