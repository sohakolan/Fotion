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

  // « Ouvrir » shows the row in Notion's side peek: title, properties (editable there too) and content.
  await view.locator('.database-cell-title').hover();
  await view.getByRole('button', { name: 'Ouvrir' }).click();
  const peek = page.getByRole('complementary', { name: 'Aperçu de la page' });
  await expect(peek.getByLabel('Titre de la page', { exact: true })).toHaveValue('Ligne A');
  await peek.getByLabel('Titre de la page', { exact: true }).fill('Ligne A1');
  await expect(view.getByLabel('Nom de la ligne')).toHaveValue('Ligne A1');
  await peek.getByLabel('Titre de la page', { exact: true }).fill('Ligne A');
  await peek.getByRole('textbox', { name: 'Contenu de la page' }).click();
  await page.keyboard.type('Notes de la ligne');
  await page.screenshot({ path: test.info().outputPath('row-peek.png') });
  await page.keyboard.press('Escape');
  await expect(peek).toHaveCount(0);
  await view.locator('.database-cell-title').hover();
  await view.getByRole('button', { name: 'Ouvrir' }).click();
  await peek.getByRole('button', { name: 'Ouvrir en pleine page' }).click();
  await expect(peek).toHaveCount(0);
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue('Ligne A');
  await expect(page.getByRole('textbox', { name: 'Contenu de la page' })).toContainText('Notes de la ligne');
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
  for (const [label, item] of [['Liste', '.database-list-item'], ['Galerie', '.database-gallery-item']]) {
    await view.getByRole('button', { name: 'Options de la vue' }).click();
    await page.locator('.view-menu').getByRole('button', { name: label }).click();
    await expect(view.locator(item)).toHaveCount(1);
    await expect(view.locator(item).locator('.database-status')).toHaveText('En cours');
  }
  await page.screenshot({ path: test.info().outputPath('database-gallery.png') });
  await view.getByRole('button', { name: 'Options de la vue' }).click();
  await page.locator('.view-menu').getByRole('button', { name: 'Tableau' }).click();
  await expect(view.locator('.database-table')).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  expect((await stored(page)).find(p => p.id === host.id)!.content).toContain(`::database-view{src=${database.id}}`);

  // A locked page shows the view without editing it; unlocking gives the fields back.
  await page.getByRole('button', { name: 'Options de la page' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Verrouiller la page' }).click();
  await page.keyboard.press('Escape');
  await expect(view.getByRole('button', { name: '+ Nouvelle page' })).toBeHidden();
  await expect(view.getByLabel('Nom de la ligne')).toHaveAttribute('readonly', '');
  await expect(view.getByLabel(/^Statut de/)).toBeDisabled();
  await expect(view.getByRole('button', { name: 'Ouvrir' })).toBeEnabled();
  await page.locator('.locked-indicator').click();
  await expect(view.getByLabel(/^Statut de/)).toBeEnabled();
  await expect(view.getByRole('button', { name: '+ Nouvelle page' })).toBeVisible();
});

test('a view filters, sorts and searches its rows and writes them in the directive', async ({ page }) => {
  const host = await createDocument(page, 'Filtres');
  await slash(page, '/vue tableau', 'Vue tableau');
  const view = page.locator('.fm-database-view');
  for (const name of ['Banane', 'Abricot', 'Cerise']) {
    await view.getByRole('button', { name: '+ Nouvelle page' }).click();
    const title = view.locator('.database-title-input:focus');
    await expect(title).toHaveCount(1);
    await title.fill(name); await title.press('Enter');
    await expect(view.getByLabel('Nom de la ligne').last()).toHaveValue(name);
  }
  await view.getByLabel('Étiquettes de Cerise').click();
  await page.locator('.option-picker').getByLabel('Rechercher ou créer une option').fill('Rouge'); await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  const names = view.getByLabel('Nom de la ligne');
  const values = () => expect.poll(() => names.evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value)));

  await view.getByRole('button', { name: 'Trier' }).click();
  await page.locator('.sort-menu').getByRole('button', { name: 'Nom' }).click();
  await values().toEqual(['Abricot', 'Banane', 'Cerise']);
  await page.locator('.sort-menu').getByRole('button', { name: 'Ordre du tri' }).click();
  await page.locator('.sort-menu').getByRole('option', { name: 'Décroissant' }).click();
  await values().toEqual(['Cerise', 'Banane', 'Abricot']);
  await page.keyboard.press('Escape');
  await expect(view.locator('.database-sort-chip')).toHaveText('↓ Nom');

  await view.getByRole('button', { name: 'Filtrer' }).click();
  await page.locator('.filter-menu').getByRole('button', { name: 'Étiquettes' }).click();
  await page.locator('.filter-rule-menu').getByRole('button', { name: 'Valeur du filtre' }).click();
  await page.locator('.filter-rule-menu').getByRole('option', { name: 'Rouge' }).click();
  await values().toEqual(['Cerise']);
  // Escape closes the open dropdown first, then the menu.
  await page.locator('.filter-rule-menu').getByRole('button', { name: 'Valeur du filtre' }).click();
  await expect(page.locator('.filter-rule-menu').getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.filter-rule-menu').getByRole('listbox')).toBeHidden();
  await expect(page.locator('.filter-rule-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(view.locator('.database-filter-chip')).toHaveText('Étiquettes: Rouge');

  // The view menu hides a property in this view only; the directive lists the visible ones.
  await view.getByRole('button', { name: 'Options de la vue' }).click();
  await page.locator('.view-menu').getByRole('menuitemcheckbox', { name: 'Étiquettes' }).click();
  await expect(page.locator('.view-menu').getByRole('menuitemcheckbox', { name: 'Étiquettes' })).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(view.locator('th')).toHaveText(['AaNom', '+']);
  await values().toEqual(['Cerise']);
  await view.getByRole('button', { name: 'Options de la vue' }).click();
  await page.locator('.view-menu').getByRole('menuitemcheckbox', { name: 'Étiquettes' }).click();
  await page.keyboard.press('Escape');
  await expect(view.locator('th')).toHaveText(['AaNom', '☰Étiquettes', '+']);

  // A row created under the filter takes its value and stays visible.
  await view.getByRole('button', { name: '+ Nouvelle page' }).click();
  await expect(names).toHaveCount(2);
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  const content = (await stored(page)).find(p => p.id === host.id)!.content;
  expect(content).toMatch(/::database-view\{src=\S+ sort=title:desc filter="tags contains Rouge"\}/);

  await view.locator('.database-filter-chip').click();
  await page.locator('.filter-rule-menu').getByRole('button', { name: 'Supprimer le filtre' }).click();
  await expect(names).toHaveCount(4);
  await view.getByRole('button', { name: 'Rechercher' }).click();
  await view.getByLabel('Rechercher dans la base').fill('ban');
  await values().toEqual(['Banane']);
  await page.screenshot({ path: test.info().outputPath('database-filters.png') });
});
