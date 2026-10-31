import { mediaNodes } from '../../../../engine';

type Attrs = Record<string, string>;
const external = (src: string) => /^https?:\/\//i.test(src);
// `attachments/…` is relative to the site root, where the local server serves imported files.
const resolve = (src: string) => external(src) ? src : `/${src}`;
const host = (src: string) => { try { return new URL(src).hostname; } catch { return src; } };
const size = (bytes: number) => bytes < 1024 ? `${bytes} o` : bytes < 1_048_576 ? `${(bytes / 1024).toFixed(1)} Ko` : `${(bytes / 1_048_576).toFixed(1)} Mo`;

/** YouTube (privacy-enhanced) and Vimeo players; other addresses play as plain video files. */
export function videoEmbed(src: string) {
  const youtube = src.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = src.match(/vimeo\.com\/(\d+)/);
  return vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {}, ...children: (Node | string)[]) {
  const node = Object.assign(document.createElement(tag), props); node.append(...children); return node;
}

function frame(src: string, height: number, title: string) {
  // Isolated frame: its own origin only, never ours; it can run its scripts but not reach the page.
  const iframe = element('iframe', { src, title, loading: 'lazy', referrerPolicy: 'no-referrer' });
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation allow-forms');
  iframe.allow = 'fullscreen; picture-in-picture';
  iframe.style.height = `${height}px`;
  return iframe;
}

/** External content loads only after the user asks for it: no request leaves the app before that. */
function consent(label: string, load: () => Node) {
  const button = element('button', { type: 'button', className: 'media-consent' }, label);
  button.addEventListener('click', () => button.replaceWith(load()));
  return button;
}

function render(name: string, attrs: Attrs) {
  const src = attrs.src || attrs.url || '';
  if (name === 'video') {
    const player = videoEmbed(src);
    if (player) return consent(`Afficher la vidéo de ${host(src)}`, () => frame(player, 405, 'Vidéo intégrée'));
    const make = () => element('video', { src: resolve(src), controls: true, preload: 'metadata' });
    return external(src) ? consent(`Afficher la vidéo de ${host(src)}`, make) : make();
  }
  if (name === 'audio') { const make = () => element('audio', { src: resolve(src), controls: true, preload: 'metadata' }); return external(src) ? consent(`Afficher l’audio de ${host(src)}`, make) : make(); }
  if (name === 'pdf') { const make = () => frame(resolve(src), 640, 'Document PDF'); return external(src) ? consent(`Afficher le PDF de ${host(src)}`, make) : make(); }
  if (name === 'embed') return consent(`Afficher le contenu de ${host(src)}`, () => frame(src, Number(attrs.height) || 400, `Contenu intégré de ${host(src)}`));
  if (name === 'file') {
    const label = attrs.name || src.split('/').pop() || 'Fichier';
    return element('a', { className: 'media-file', href: resolve(src), download: label, rel: 'noopener' }, element('span', { className: 'media-file-icon' }, '📎'), element('span', { className: 'media-file-name' }, label), element('span', { className: 'media-file-size' }, attrs.size ? size(Number(attrs.size)) : ''));
  }
  // Web bookmark: title, description and address; the preview image loads only on request, like other external content.
  const text = element('span', { className: 'bookmark-text' }, element('span', { className: 'bookmark-title' }, attrs.title || host(src)), element('span', { className: 'bookmark-description' }, attrs.description || ''), element('span', { className: 'bookmark-url' }, src));
  return element('a', { className: 'bookmark', href: src, target: '_blank', rel: 'noopener noreferrer' }, text);
}

/** Interactive views for the media blocks; the engine nodes keep the FotionMark format. */
export const mediaViews = mediaNodes.map(node => node.extend({
  addNodeView() {
    return ({ node: current }) => {
      const dom = element('div', { className: `fm-${node.name} media-block`, contentEditable: 'false' });
      let attrs = JSON.stringify(current.attrs.attributes);
      dom.append(render(node.name, current.attrs.attributes as Attrs));
      return {
        dom,
        update(updated) { if (updated.type.name !== node.name) return false; const next = JSON.stringify(updated.attrs.attributes); if (next !== attrs) { attrs = next; dom.replaceChildren(render(node.name, updated.attrs.attributes as Attrs)); } return true; },
        ignoreMutation: () => true,
        stopEvent: event => !!(event.target as HTMLElement).closest('button, video, audio, iframe, a'),
      };
    };
  },
}));
