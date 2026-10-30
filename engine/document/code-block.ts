import BaseCodeBlock from '@tiptap/extension-code-block';

export const CodeBlock = BaseCodeBlock.extend({
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
}).configure({ defaultLanguage: null });
