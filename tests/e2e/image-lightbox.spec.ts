import { test, expect, type Page } from '@playwright/test';

const flag = 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#2f6f6a"/><text x="240" y="150" font-size="36" font-family="sans-serif" text-anchor="middle" fill="#fff">Visuel source</text></svg>`).toString('base64');

async function attachRealImage(page: Page): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const png = readFileSync('/tmp/flag.png');
  const response = await page.request.post('/api/attachments', { headers: { 'X-File-Name': encodeURIComponent('drapeau.png'), 'Content-Type': 'application/octet-stream' }, data: png });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { path: string }).path;
}

async function createDocument(page: Page, content: string, title = 'Recette image grand') {
  const response = await page.request.post('/api/pages', { data: { title, icon: '🔍', parent: null, favorite: false, cover: '', content, trashed: false } });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await page.addInitScript(id => localStorage.setItem('fotion-active', id), created.id);
  await page.goto('/');
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue(title);
  return created;
}

test('the lightbox opens full-size with Télécharger and Remplacer', async ({ page }, info) => {
  const src = await attachRealImage(page);
  const created = await createDocument(page, `![Visuel](${src})\n\nVisuel source pour la recette.\n`);
  const image = page.locator('.prose img').first();
  await expect(image).toBeVisible();
  // Single click selects; double click opens the lightbox like Notion's enlarged view.


  await image.dblclick();
  const viewer = page.locator('.image-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('img')).toBeVisible();
  await expect(viewer.getByRole('link', { name: /Télécharger/i })).toBeVisible();
  await page.screenshot({ path: info.outputPath('lightbox.png') });
  // Escape closes; the editor keeps the same image.
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  // Replace flows through the same media dialog as an insertion.
  await image.dblclick();
  await viewer.getByRole('button', { name: /Remplacer/i }).click();
  const dialog = page.locator('.media-dialog');
  await expect(dialog).toBeVisible();
  // The replacement comes through the same vault import as a fresh image.
  const replacedResponse = await page.context().request.post('/api/attachments', { headers: { 'X-File-Name': encodeURIComponent('remplacee.png'), 'Content-Type': 'application/octet-stream' }, data: (await import('node:fs')).readFileSync('/tmp/flag2.png') });
  expect(replacedResponse.ok()).toBeTruthy();
  const replacement = ((await replacedResponse.json()) as { path: string }).path;
  await dialog.getByRole('tab', { name: /Intégrer un lien/ }).click();
  await dialog.getByLabel('Lien').fill(`http://127.0.0.1:5175/${replacement}`);
  await dialog.getByRole('button', { name: /Intégrer le lien/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(image).toHaveAttribute('src', new RegExp('remplacee\\.png$'));
  await expect(image).toHaveAttribute('alt', 'Visuel');
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  const list = (await (await page.request.get('/api/pages')).json()) as Array<{ id: string; content: string }>;
  const content = list.find(entry => entry.id === created.id)!.content;
  expect(content).toContain(replacement);
  expect((content.match(/!\[/g) ?? []).length).toBe(1);
});
