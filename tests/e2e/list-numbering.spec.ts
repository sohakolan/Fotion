import { test, expect } from '@playwright/test';

async function createDocument(page: import('@playwright/test').Page, content: string, title = 'Recette numérotation') {
  const response = await page.request.post('/api/pages', { data: { title, icon: '🔢', parent: null, favorite: false, cover: '', content, trashed: false } });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await page.addInitScript(id => localStorage.setItem('fotion-active', id), created.id);
  await page.goto('/');
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue(title);
  return created;
}

test('a new numbered list continues the numbering across text, then restarts after other blocks', async ({ page }, info) => {
  await createDocument(page, '1. Premier\n2. Second\n\nUn texte de séparation\n\n');
  const editor = page.getByRole('textbox', { name: 'Contenu de la page' });
  // The trailing empty paragraph exists in Markdown as a blank line; place the caret explicitly at document end.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type('1. Nouvelle entrée');
  const secondList = page.locator('.prose ol').nth(1);
  await expect(secondList).toHaveAttribute('start', '3');
  await expect(secondList.locator('li').first()).toContainText('Nouvelle entrée');
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  await page.screenshot({ path: info.outputPath('list-continue.png') });
  // After reload the stored Markdown keeps the continued start.
  await page.reload();
  await expect(page.locator('.prose ol').nth(1)).toHaveAttribute('start', '3');
});
