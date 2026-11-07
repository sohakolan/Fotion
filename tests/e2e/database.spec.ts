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
async function slash(page: Page, command: string, label: string) {
  await page.locator('.prose > p').first().click();
  // ProseMirror re-applies its own selection 20 ms after focus; keys sent before that land at the start.
  await expect(page.getByRole('textbox', { name: 'Contenu de la page' })).toBeFocused();
  await page.waitForTimeout(50);
  await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await page.keyboard.type(command);
  await expect(page.locator('.slash-menu .chosen')).toContainText(label);
  await page.keyboard.press('Enter');
}
const stored = async (page: Page) => (await (await page.request.get('/api/pages')).json()) as Stored[];

test('an inline table database stores rows as pages and survives a reload', async ({ page }) => {
  const host = await createDocument(page, 'Suivi');
  await slash(page, '/vue tableau', 'Vue tableau');
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

  // Notion's option menu: type to create, Enter to add, × to remove.
  await view.getByLabel('Étiquettes de Lancement').click();
  const picker = page.locator('.option-picker');
  await picker.getByLabel('Rechercher ou créer une option').fill('Urgent');
  await expect(picker.locator('.option-picker-create')).toHaveText('Créer Urgent');
  await page.keyboard.press('Enter');
  await picker.getByLabel('Rechercher ou créer une option').fill('Client'); await page.keyboard.press('Enter');
  await picker.getByLabel('Rechercher ou créer une option').fill('Interne'); await page.keyboard.press('Enter');
  await picker.getByRole('button', { name: 'Retirer Interne' }).click();
  await expect(picker.locator('.option-picker-field .database-tag')).toHaveText(['Urgent×', 'Client×']);
  await picker.getByLabel('Rechercher ou créer une option').fill('urg');
  await expect(picker.locator('.option-picker-item')).toHaveText(['Urgent']);
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(view.locator('.database-cell .database-tag')).toHaveText(['Urgent', 'Client']);
  await page.screenshot({ path: test.info().outputPath('database-table.png') });

  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  const pages = await stored(page);
  const database = pages.find(p => p.title === 'Projets')!;
  const row = pages.find(p => p.title === 'Lancement')!;
  expect(pages.find(p => p.id === host.id)!.content).toContain(`::database-view{src=${database.id}}`);
  expect(database.parent).toBe(host.id);
  expect(database.database!.properties.map(p => [p.id, p.type, (p.options ?? []).map(o => o.name)])).toEqual([['tags', 'multi-select', ['Urgent', 'Client', 'Interne']], ['date', 'date', []]]);
  expect(row.parent).toBe(database.id);
  expect(row.values).toEqual({ tags: ['Urgent', 'Client'], date: '2026-11-20' });

  await page.reload();
  await expect(view.getByLabel('Nom de la ligne')).toHaveValue('Lancement');
  await expect(view.getByLabel('Date de Lancement')).toHaveValue('2026-11-20');
  await expect(view.locator('.database-cell .database-tag')).toHaveText(['Urgent', 'Client']);
  // Rows belong to the view, not to the sidebar tree.
  await expect(page.getByRole('complementary', { name: 'Navigation principale' }).getByText('Lancement')).toHaveCount(0);
});

test('property menu converts a type, deletes a property, and an open row lists its properties', async ({ page }) => {
  await createDocument(page, 'Base');
  await slash(page, '/vue tableau', 'Vue tableau');
  const view = page.locator('.fm-database-view');
  await view.getByRole('button', { name: '+ Nouvelle page' }).click();
  await view.getByLabel('Nom de la ligne').fill('Ligne A'); await view.getByLabel('Nom de la ligne').press('Enter');
  await view.getByRole('button', { name: 'Ajouter une propriété' }).click();
  await page.locator('.database-menu').getByRole('button', { name: 'Texte' }).click();
  await view.getByLabel('Texte de Ligne A').fill('Haute'); await view.getByLabel('Texte de Ligne A').press('Enter');
  await expect(view.getByLabel('Texte de Ligne A')).toHaveValue('Haute');

  // Text → Select: the value becomes an option, as in Notion.
  await view.getByRole('button', { name: /Texte$/ }).click();
  const menu = page.locator('.property-menu');
  await menu.getByLabel('Nom de la propriété').fill('Priorité'); await menu.getByLabel('Nom de la propriété').press('Enter');
  await view.getByRole('button', { name: /Priorité$/ }).click();
  await page.locator('.property-menu').getByRole('button', { name: 'Sélection', exact: true }).click();
  await expect(view.locator('.database-cell-select .database-tag')).toHaveText(['Haute']);

  await view.getByRole('button', { name: /Étiquettes$/ }).click();
  await page.locator('.property-menu').getByRole('button', { name: 'Supprimer la propriété' }).click();
  await expect(view.locator('th')).toHaveText(['AaNom', '⌄Priorité', '+']);

  // Opening the row shows Notion's property list under its title, editable there too.
  await view.locator('.database-cell-title').hover();
  await view.getByRole('button', { name: 'Ouvrir' }).click();
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue('Ligne A');
  const properties = page.locator('.page-properties');
  await expect(properties.locator('.page-property-label')).toHaveText(['Priorité']);
  await properties.getByLabel('Priorité de Ligne A').click();
  await page.locator('.option-picker').getByLabel('Rechercher ou créer une option').fill('Basse'); await page.keyboard.press('Enter');
  await expect(properties.locator('.database-tag')).toHaveText(['Basse']);
  await page.screenshot({ path: test.info().outputPath('row-properties.png') });
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  const pages = await stored(page);
  const row = pages.find(p => p.title === 'Ligne A')!;
  expect(row.values).toEqual({ texte: 'Basse' });
  const database = pages.find(p => p.id === row.parent)!;
  expect(database.database!.properties.map(p => [p.id, p.name, p.type, (p.options ?? []).map(o => o.name)])).toEqual([['texte', 'Priorité', 'select', ['Haute', 'Basse']]]);
});

test('a board groups cards by status and dragging a card changes its value', async ({ page }) => {
  const host = await createDocument(page, 'Tableau de bord');
  await slash(page, '/vue kanban', 'Vue kanban');
  const view = page.locator('.fm-database-view');
  await expect(view.locator('.database-column-header')).toHaveText(['Pas commencé0', 'En cours0', 'Terminé0']);
  await view.locator('.database-column[data-group="Pas commencé"]').getByRole('button', { name: '+ Nouvelle page' }).click();
  await expect(view.locator('.database-column[data-group="Pas commencé"] .database-card')).toHaveCount(1);
  const card = view.locator('.database-card').first();
  await card.dragTo(view.locator('.database-column[data-group="En cours"]'));
  await expect(view.locator('.database-column[data-group="En cours"] .database-card')).toHaveCount(1);
  await expect(view.locator('.database-column-header')).toHaveText(['Pas commencé0', 'En cours1', 'Terminé0']);
  await page.screenshot({ path: test.info().outputPath('database-board.png') });
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  const pages = await stored(page);
  const database = pages.find(p => p.database && p.parent === host.id)!;
  const row = pages.find(p => p.parent === database.id)!;
  expect(row.values).toEqual({ status: 'En cours' });

  // The view menu switches the layout; the choice is written in the directive.
  await view.getByRole('button', { name: 'Options de la vue' }).click();
  await page.locator('.view-menu').getByRole('button', { name: 'Tableau' }).click();
  await expect(view.locator('.database-table')).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  expect((await stored(page)).find(p => p.id === host.id)!.content).toContain(`::database-view{src=${database.id}}`);
});
