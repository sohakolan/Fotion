import { common, createLowlight } from 'lowlight';
import type { Node } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { RootContent } from 'hast';

const lowlight = createLowlight(common);
const cache = new WeakMap<Node, { from: number; to: number; classes: string }[]>();

export function highlightDocument(doc: Node) {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return;
    const language = node.attrs.language;
    if (!language || language === 'plaintext' || !lowlight.registered(language)) return false;
    let ranges = cache.get(node);
    if (!ranges) {
      ranges = [];
      let offset = 0;
      const visit = (children: RootContent[], inherited: string[] = []) => {
        for (const child of children) {
          if (child.type === 'element') {
            const classes = child.properties.className;
            visit(child.children, [...inherited, ...(Array.isArray(classes) ? classes.map(String) : [])]);
          } else if (child.type === 'text') {
            if (inherited.length && child.value.length) ranges!.push({ from: offset, to: offset + child.value.length, classes: inherited.join(' ') });
            offset += child.value.length;
          }
        }
      };
      visit(lowlight.highlight(language, node.textContent).children);
      cache.set(node, ranges);
    }
    for (const range of ranges) decorations.push(Decoration.inline(pos + 1 + range.from, pos + 1 + range.to, { class: range.classes }));
    return false;
  });
  return DecorationSet.create(doc, decorations);
}
