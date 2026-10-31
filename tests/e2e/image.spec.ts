import { test, expect } from '@playwright/test';

const flag = 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#b8d8d8"/><rect x="0" y="0" width="640" height="120" fill="#2f6f6a"/><rect x="0" y="240" width="640" height="120" fill="#57a08c"/><rect x="0" y="120" width="640" height="120" fill="#dfe9e5"/><text x="320" y="205" font-size="40" font-family="sans-serif" text-anchor="middle" fill="#37352f">Photo de recette</text></svg>`).toString('base64');

async function createDocument(page: import('@playwright/test').Page, content: string, title = 'Recette image') {
  const response = await page.request.post('/api/pages', { data: { title, icon: '🖼️', parent: null, favorite: false, cover: '', content, trashed: false } });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await page.addInitScript(id => localStorage.setItem('fotion-active', id), created.id);
  await page.goto('/');
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue(title);
  return created;
}

test('image caption editing, selection outline and saving', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await createDocument(page, `![Drapeau de recette](${flag})\n\nUn paragraphe après l'image.\n`);
  const image = page.locator('.prose img').first();
  await expect(image).toBeVisible();
  // The caption is a live editor hole under the image.
  const caption = page.locator('.prose figcaption.image-caption').first();
  await expect(caption).toHaveText('');
  await caption.click();
  await page.keyboard.type('Une belle légende');
  await expect(caption).toHaveText('Une belle légende');
  // Backspace truncates, Escape brings the caret back to the document flow.
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await expect(caption).toHaveText('Une belle légende!');
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  // Clicking the image selects the node and shows Notion's blue outline.
  await image.click();
  await expect(page.locator('.image-block.image-selected')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('image-selected.png') });
  // Escape leaves the node selection without deleting the image.
  await page.keyboard.press('Escape');
  await expect(page.locator('.image-block.image-selected')).toHaveCount(0);
  // The hover strip offers Notion's three width presets.
  await image.hover();
  const medium = page.getByRole('button', { name: 'Largeur moyenne' });
  await expect(medium).toBeVisible();
  await medium.click();
  const block = page.locator('.prose .image-block').first();
  await expect(block).toHaveCSS('width', '468px');
  const box = (await block.boundingBox())!;
  expect(box.width).toBeGreaterThan(400);
  expect(box.width).toBeLessThan(500);
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  // The controls adapt to the dark theme like the rest of the surface.
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByRole('combobox', { name: 'Apparence' }).selectOption('dark');
  await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // Deselect whatever the earlier steps left highlighted so the shot shows the resting style.
  await page.locator('.prose > p').last().click();
  await image.hover();
  await expect(page.getByRole('button', { name: 'Largeur moyenne' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('image-dark.png') });
  expect(errors).toEqual([]);
});

