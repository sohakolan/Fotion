import { test, expect, type Page } from '@playwright/test';

type Stored = { id: string; title: string; parent: string | null; content: string; database?: { properties: { id: string; name: string; type: string; options?: { name: string }[] }[] }; values?: Record<string, unknown> };

async function createDocument(page: Page, content: string, title = 'Recette base') {
  const response = await page.request.post('/api/pages', { data: { title, icon: '🗃️', parent: null, favorite: false, cover: '', content, trashed: false } });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await page.addInitScript(id => localStorage.setItem('fotion-active', id), created.id);
  await page.goto('/');
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue(title);
  return created as Stored;
}

test('an inline table database stores rows as pages and survives a reload', async ({ page }) => {
  const host = await createDocument(page, 'Suivi');
  await page.locator('.prose > p').first().click();
  // ProseMirror re-applies its own selection 20 ms after focus; keys sent before that land at the start.
  await expect(page.getByRole('textbox', { name: 'Contenu de la page' })).toBeFocused();
  await page.waitForTimeout(50);
  await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await page.keyboard.type('/vue tableau');
  await expect(page.locator('.slash-menu .chosen')).toContainText('Vue tableau');
  await page.keyboard.press('Enter');

  const view = page.locator('.fm-database-view');
  await expect(view.locator('th')).toHaveText(['AaNom', '☰Étiquettes', '+']);
  await view.getByLabel('Nom de la base de données').fill('Projets');
  await view.getByLabel('Nom de la base de données').press('Enter');

  await view.getByRole('button', { name: '+ Nouvelle page' }).click();
  const rowTitle = view.getByLabel('Nom de la ligne');
  await expect(rowTitle).toBeFocused();
  await rowTitle.fill('Lancement'); await rowTitle.press('Enter');

  await view.getByRole('button', { name: 'Ajouter une propriété' }).click();
  await page.locator('.database-menu').getByRole('button', { name: 'Date' }).click();
  await expect(view.locator('th')).toHaveText(['AaNom', '☰Étiquettes', '▦Date', '+']);
  await view.getByLabel('Date de Lancement').fill('2026-11-20');
  await view.getByLabel('Date de Lancement').press('Enter');

  await view.locator('.database-cell-multi-select .database-tags').click();
  await view.getByLabel('Étiquettes de Lancement').fill('Urgent, Client');
  await view.getByLabel('Étiquettes de Lancement').press('Enter');
  await expect(view.locator('.database-tag')).toHaveText(['Urgent', 'Client']);
  await page.screenshot({ path: test.info().outputPath('database-table.png') });

  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  const pages = (await (await page.request.get('/api/pages')).json()) as Stored[];
  const database = pages.find(p => p.title === 'Projets')!;
  const row = pages.find(p => p.title === 'Lancement')!;
  expect(pages.find(p => p.id === host.id)!.content).toContain(`::database-view{src=${database.id}}`);
  expect(database.parent).toBe(host.id);
  expect(database.database!.properties.map(p => [p.id, p.type, (p.options ?? []).map(o => o.name)])).toEqual([['tags', 'multi-select', ['Urgent', 'Client']], ['date', 'date', []]]);
  expect(row.parent).toBe(database.id);
  expect(row.values).toEqual({ tags: ['Urgent', 'Client'], date: '2026-11-20' });

  await page.reload();
  await expect(view.getByLabel('Nom de la ligne')).toHaveValue('Lancement');
  await expect(view.getByLabel('Date de Lancement')).toHaveValue('2026-11-20');
  await expect(view.locator('.database-tag')).toHaveText(['Urgent', 'Client']);
  // Rows belong to the view, not to the sidebar tree.
  await expect(page.getByRole('complementary', { name: 'Navigation principale' }).getByText('Lancement')).toHaveCount(0);
});
