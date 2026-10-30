import { test, expect, type Page } from '@playwright/test';

async function createDocument(page: Page, content: string, title = 'Recette navigateur') {
  const response = await page.request.post('/api/pages', { data: { title, icon: '📝', parent: null, favorite: false, cover: '', content, trashed: false } });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await page.addInitScript(id => localStorage.setItem('fotion-active', id), created.id);
  await page.goto('/');
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue(title);
  return created;
}

test('real pointer block dragging, undo and persistence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await createDocument(page, 'Premier\n\nDeuxième\n\nTroisième');
  const editor = page.getByRole('textbox', { name: 'Contenu de la page' });
  await editor.click();
  await page.locator('.prose > p').first().hover();
  const grip = page.getByRole('button', { name: 'Déplacer ou modifier le bloc', exact: true });
  await expect(grip).toBeVisible();
  const source = (await grip.boundingBox())!;
  const target = (await page.locator('.prose > p').nth(2).boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 50, target.y + target.height - 2, { steps: 12 });
  await expect(page.locator('.block-drop-line')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.prose > p')).toHaveText(['Deuxième', 'Troisième', 'Premier']);
  await editor.focus(); await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.prose > p')).toHaveText(['Premier', 'Deuxième', 'Troisième']);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(page.locator('.prose > p')).toHaveText(['Deuxième', 'Troisième', 'Premier']);
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  await page.reload();
  await expect(page.locator('.prose > p')).toHaveText(['Deuxième', 'Troisième', 'Premier']);
  expect(errors).toEqual([]);
});

test('formatting palette is reachable and remains inside the viewport', async ({ page }, info) => {
  await createDocument(page, 'Une sélection à mettre en forme');
  const editor = page.getByRole('textbox', { name: 'Contenu de la page' });
  await editor.click(); await page.keyboard.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Couleur du texte et du fond' }).click();
  await expect(page.getByRole('menu', { name: 'Couleurs', exact: true })).toBeVisible();
  const palette = (await page.getByRole('menu', { name: 'Couleurs', exact: true }).boundingBox())!;
  expect(palette.x).toBeGreaterThanOrEqual(0); expect(palette.y).toBeGreaterThanOrEqual(0);
  expect(palette.x + palette.width).toBeLessThanOrEqual(1440); expect(palette.y + palette.height).toBeLessThanOrEqual(960);
  await page.getByRole('menuitemradio', { name: 'Bleu', exact: true }).click();
  await expect(page.locator('.prose [data-fotion-color="blue"]')).toHaveText('Une sélection à mettre en forme');
  await page.screenshot({ path: info.outputPath('desktop-formatting.png') });
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  await page.setViewportSize({ width: 320, height: 740 }); await page.reload();
  await editor.click(); await page.keyboard.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Couleur du texte et du fond' }).click();
  const mobilePalette = (await page.getByRole('menu', { name: 'Couleurs', exact: true }).boundingBox())!;
  expect(mobilePalette.x).toBeGreaterThanOrEqual(0); expect(mobilePalette.x + mobilePalette.width).toBeLessThanOrEqual(320);
  expect(mobilePalette.y + mobilePalette.height).toBeLessThanOrEqual(740);
  await page.getByRole('menuitemradio', { name: 'Jaune — fond', exact: true }).click();
  await expect(page.locator('.prose [data-fotion-background="yellow"]')).toHaveText('Une sélection à mettre en forme');
  await page.screenshot({ path: info.outputPath('mobile-formatting.png') });
});

test('desktop and mobile layouts with real page content', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue('Mon espace');
  await page.screenshot({ path: info.outputPath('desktop-light.png') });
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByRole('combobox', { name: 'Apparence' }).selectOption('dark');
  await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: info.outputPath('desktop-dark.png') });
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByRole('combobox', { name: 'Apparence' }).selectOption('light');
  await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.getByLabel('Titre de la page', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('mobile-light.png') });
});

test('table of contents inserts, navigates and follows renamed headings after reload', async ({ page }) => {
  await createDocument(page, 'Sommaire\n\n# Introduction\n\n## Détails\n\nFin.');
  const first = page.locator('.prose > p').first();
  await first.click(); await page.keyboard.press('Home');
  for (let i = 0; i < 'Sommaire'.length; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.type('/sommaire');
  await page.getByRole('option', { name: /Table des matières/ }).click();
  const toc = page.getByRole('navigation', { name: 'Table des matières' });
  await expect(toc.getByRole('button')).toHaveText(['Introduction', 'Détails']);
  await toc.getByRole('button', { name: 'Détails', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.anchorNode?.parentElement?.closest('h2')?.textContent)).toBe('Détails');
  await page.keyboard.type('Nouveaux ');
  await expect(toc.getByRole('button')).toHaveText(['Introduction', 'Nouveaux Détails']);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(toc.getByRole('button')).toHaveText(['Introduction', 'Détails']);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  await page.reload();
  await expect(toc.getByRole('button')).toHaveText(['Introduction', 'Nouveaux Détails']);
  await toc.getByRole('button', { name: 'Introduction', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.getSelection()?.anchorNode?.parentElement?.closest('h1')?.textContent)).toBe('Introduction');
});

test('toggle headings insert, collapse, reopen from the contents and retain their body', async ({ page }, info) => {
  await createDocument(page, '/titre dépliant 2\n\n<nav data-fotion-toc></nav>\n\nFin.');
  await page.locator('.prose > p').first().click();
  await page.getByRole('option', { name: /Titre dépliant 2/ }).click();
  const details = page.locator('.prose details').first();
  const summary = details.locator('summary');
  await expect(summary.locator('h2')).toHaveText('Titre dépliant 2');
  await details.locator('p').first().click(); await page.keyboard.type('Un contenu à conserver');
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  await summary.click({ position: { x: 8, y: 15 } });
  await expect(details).not.toHaveAttribute('open');
  await expect(details.locator('p').first()).not.toBeVisible();
  await page.getByRole('navigation', { name: 'Table des matières' }).getByRole('button', { name: 'Titre dépliant 2', exact: true }).click();
  await expect(details).toHaveAttribute('open');
  await expect.poll(() => page.evaluate(() => window.getSelection()?.anchorNode?.parentElement?.closest('summary')?.textContent)).toBe('Titre dépliant 2');
  await expect(details.locator('p').first()).toHaveText('Un contenu à conserver');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Préface. ');
  await expect(details.locator('p').first()).toHaveText('Préface. Un contenu à conserver');
  await expect(page.locator('.save-status')).toHaveText('Enregistré');
  await page.reload();
  await expect(summary.locator('h2')).toHaveText('Titre dépliant 2');
  await expect(details.locator('p').first()).toHaveText('Préface. Un contenu à conserver');
  await page.screenshot({ path: info.outputPath('toggle-heading.png') });
});
