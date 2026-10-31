import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'test-results/shot.png';
mkdirSync('test-results', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'fr-FR' });

const content = `# Titre un

Un paragraphe avec du **gras**, de l'*italique*, du \`code\`, un [lien](https://www.notion.com) et du ~~barré~~.

## Titre deux

- Une puce
- Deuxième puce
  - Puce imbriquée

1. Premier élément
2. Deuxième élément

- [ ] Une tâche à faire
- [x] Une tâche terminée

> Une citation sur plusieurs lignes
> pour voir le trait et les marges.

\`\`\`ts
const hello = 'world'; // bloc de code
\`\`\`

$$E = mc^2$$

---

| Colonne A | Colonne B |
| --------- | --------- |
| un        | deux      |

:::callout[💡]
Un encadré avec une icône et un fond.
:::

![Légende](https://www.notion.com/images/front.png) <!-- fotion:image %7B%22caption%22%3A%22Une%20image%20redimensionnable%22%2C%22width%22%3A60%7D -->

[[Recette navigateur]] et une mention de date <time datetime="2026-10-31">31 octobre 2026</time>.

`;

const response = await page.context().request.post('http://127.0.0.1:5175/api/pages', {
  data: { title: 'Page de comparaison', icon: '📄', parent: null, favorite: false, cover: '', content, trashed: false },
});
const created = await response.json();
console.log('created', response.ok(), created.id);

await page.addInitScript(id => localStorage.setItem('fotion-active', id), created.id);
await page.goto('http://127.0.0.1:5175');
await page.waitForSelector('.prose');
const bodyText = await page.locator('body').innerText();
if (!bodyText.includes('Page de comparaison')) {
  console.log('WARNING: page title not in body:', bodyText.slice(0, 200));
}
await page.waitForTimeout(2000);
await page.screenshot({ path: out, fullPage: false });
await page.screenshot({ path: out.replace('.png', '-full.jpg'), fullPage: true, quality: 60, type: 'jpeg' });
console.log('saved', out);
await browser.close();
