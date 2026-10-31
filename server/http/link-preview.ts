import { isIP } from 'node:net';
import { VaultError } from '../storage/vault.ts';

export interface LinkPreview { url: string; title: string; description: string; image: string }

// The local server must not become a way to probe the user's own network.
function publicUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new VaultError(400, 'Adresse invalide.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new VaultError(400, 'Seules les adresses http et https sont acceptées.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const privateV4 = /^(0|10|127)\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || (isIP(host) === 4 && privateV4.test(host)) || (isIP(host) === 6 && /^(::1?|f[cd]|fe80)/.test(host))) throw new VaultError(400, 'Les adresses locales ne sont pas acceptées.');
  return url;
}

const decode = (text: string) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
const meta = (html: string, names: string[]) => {
  for (const name of names) {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i'))?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decode(content);
  }
  return '';
};

/** Title, description and image of a web page for Notion's web bookmark, read once when the bookmark is created. */
export async function linkPreview(value: string): Promise<LinkPreview> {
  const url = publicUrl(value);
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Fotion link preview', Accept: 'text/html' } }).catch(() => { throw new VaultError(502, 'Le site ne répond pas.'); });
  publicUrl(response.url);
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return { url: url.href, title: url.hostname, description: '', image: '' };
  const html = (await response.text()).slice(0, 1_000_000);
  const image = meta(html, ['og:image', 'twitter:image']);
  let absoluteImage = '';
  try { absoluteImage = image ? new URL(image, response.url).href : ''; } catch { absoluteImage = ''; }
  return {
    url: url.href,
    title: meta(html, ['og:title', 'twitter:title']) || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '') || url.hostname,
    description: meta(html, ['og:description', 'description', 'twitter:description']).slice(0, 300),
    image: /^https?:/.test(absoluteImage) ? absoluteImage : '',
  };
}
