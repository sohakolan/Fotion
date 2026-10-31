import { chromium, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/** Systematic light/dark captures for the visual checklist (UI-322): same data, same viewport, two themes. */
const base = 'http://127.0.0.1:5175';
mkdirSync('test-results/themes', { recursive: true });

const richContent = `# Titre un

Un paragraphe avec du **gras**, de l'*italique*, du \`code\`, un [lien](https://www.notion.com) et du ~~barré~~.

## Titre deux

- Une puce
- Deuxième puce
  - Puce imbriquée

1. Premier élément
2. Deuxième élément

- [ ] Une tâche à faire
- [x] Une tâche terminée

> Une citation sur deux lignes.

\`\`\`ts
const hello = 'world';
\`\`\`

$$E = mc^2$$

---

| Colonne A | Colonne B |
| --- | --- |
| un | deux |

:::callout[💡]
Un encadré avec une icône et un fond.
:::
`;

const flag = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#57a08c"/></svg>').toString('base64');
const richWithImage = `${richContent}\n\n![Visuel de référence](${flag}) <!-- fotion:image %7B%22caption%22%3A%22Une%20image%20avec%20sa%20l%C3%A9gende%22%7D -->\n`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'fr-FR' });

async function createPage(entry: { title: string; icon: string; cover: string; content: string }) {
  const response = await page.request.post(`${base}/api/pages`, {
    data: { title: entry.title, icon: entry.icon, parent: null, favorite: true, cover: entry.cover, content: entry.content, trashed: false },
  });
  return (await response.json()) as { id: string };
}

const richPage = await createPage({ title: 'Blocs de référence', icon: '🎨', cover: 'sand', content: richWithImage });
const emptyPage = await createPage({ title: 'Page ouverte', icon: '🪴', cover: '', content: '' });
console.log('created', richPage.id, emptyPage.id);

for (const theme of ['light', 'dark'] as const) {
  await page.addInitScript((values: { id: string; theme: string }) => { localStorage.setItem('fotion-active', values.id); localStorage.setItem('fotion-theme', values.theme); }, { id: emptyPage.id, theme });
  await page.goto(base);
  await page.waitForSelector('.prose', { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `test-results/themes/${theme}-empty-page.png` });

  await page.addInitScript((values: { id: string; theme: string }) => { localStorage.setItem('fotion-active', values.id); localStorage.setItem('fotion-theme', values.theme); }, { id: richPage.id, theme });
  await page.goto(base);
  await page.waitForSelector('.prose img', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `test-results/themes/${theme}-blocks.png` });

  // Slash menu open on a fresh last line.
  await page.locator('.prose').click({ position: { x: 240, y: 20 } });
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.keyboard.type('/');
  await page.waitForSelector('.slash-menu', { timeout: 8000 });
  await page.screenshot({ path: `test-results/themes/${theme}-slash-menu.png` });
  await page.keyboard.press('Escape');
  // Remove the typed query so the stored documents stay exactly the reference data.
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');

  // Selected image, closing outline visible.
  const image = page.locator('.prose img').first();
  await expect(image).toHaveJSProperty('complete', true);
  await image.click();
  await expect(page.locator('.image-block.image-selected').first()).toBeVisible();
  await page.screenshot({ path: `test-results/themes/${theme}-image-selected.png` });

  // Lightbox full-size.
  await image.dblclick();
  await expect(page.locator('.image-viewer img').first()).toBeVisible();
  await page.screenshot({ path: `test-results/themes/${theme}-image-lightbox.png` });
  await page.keyboard.press('Escape');
}
await browser.close();
console.log('done');
