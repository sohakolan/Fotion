import { Node } from '@tiptap/core';
import { colorId, textColors } from './colors';

export const calloutIconValue = (value: unknown) => typeof value === 'string' && value.length <= 32 && !/[\x00-\x1f]/.test(value) ? value : '💡';
export const calloutAppearance = (attrs: Record<string, unknown>) => {
  const color = colorId(attrs.color), background = colorId(attrs.background);
  return { 'data-callout': '', 'data-callout-icon': calloutIconValue(attrs.icon), 'data-fotion-color': color, 'data-fotion-background': background, class: 'callout-block', style: `color:${textColors.find(c => c.id === color)!.text};background-color:${background === 'default' ? 'var(--sidebar)' : textColors.find(c => c.id === background)!.background}` };
};

export const Callout = Node.create({
  name: 'callout', group: 'block', content: 'block+', defining: true,
  addAttributes: () => ({
    icon: { default: '💡', rendered: false, parseHTML: element => calloutIconValue(element.getAttribute('data-callout-icon') ?? '💡') },
    color: { default: 'default', rendered: false, parseHTML: element => colorId(element.getAttribute('data-fotion-color')) },
    background: { default: 'default', rendered: false, parseHTML: element => colorId(element.getAttribute('data-fotion-background')) },
  }),
  parseHTML: () => [{ tag: 'aside[data-callout]', contentElement: element => element.querySelector('.callout-content') || element.querySelector('div') || element }],
  renderHTML: ({ node }) => ['aside', calloutAppearance(node.attrs), ['span', { contenteditable: 'false', class: 'callout-icon' }, calloutIconValue(node.attrs.icon)], ['div', { class: 'callout-content' }, 0]],
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
          if (value && typeof value === 'object') attrs = { icon: calloutIconValue(value.icon), color: colorId(value.color), background: colorId(value.background) };
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
    const attrs = { icon: calloutIconValue(node.attrs?.icon), color: colorId(node.attrs?.color), background: colorId(node.attrs?.background) };
    const metadata = attrs.icon !== '💡' || attrs.color !== 'default' || attrs.background !== 'default' ? ` <!-- fotion:callout ${encodeURIComponent(JSON.stringify(attrs))} -->` : '';
    return `> [!NOTE]${metadata}\n${helpers.renderChildren(node.content || [], '\n\n').split('\n').map(line => `> ${line}`).join('\n')}`;
  },
});
