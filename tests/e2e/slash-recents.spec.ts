import { test, expect } from '@playwright/test';

async function createDocument(page: import('@playwright/test').Page, content: string, title = 'Recette menu slash') {
  const response = await page.request.post('/api/pages', { data: { title, icon: '✨', parent: null, favorite: false, cover: '', content, trashed: false } });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await page.addInitScript(id => localStorage.setItem('fotion-active', id), created.id);
  await page.goto('/');
  await expect(page.getByLabel('Titre de la page', { exact: true })).toHaveValue(title);
  return created;
}

test('the slash menu pins recently used commands across reloads', async ({ page }, info) => {
  await createDocument(page, 'Début');
  const editor = page.getByRole('textbox', { name: 'Contenu de la page' });
  await page.locator('.prose > p').first().click();
  await page.keyboard.press('ControlOrMeta+ArrowRight');
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  // Use the to-do command once, like the user would.
  await page.keyboard.type('/todo');
  await page.getByRole('option', { name: /Liste de tâches/ }).first().click();
  await expect(page.locator('.prose [data-task], .prose li[data-type="taskItem"], .prose input[type=checkbox]').first()).toBeVisible();
  await deleteAll(page);
  // Reopening with an empty query pins the used command under its own group.
  await page.keyboard.type(' ');
  await page.keyboard.type('/');
  const menu = page.locator('.slash-menu');
  await expect(menu).toBeVisible();
  const groups = menu.locator('.slash-group');
  await expect(groups.first()).toHaveText('Récemment utilisés');
  await expect(menu.locator('.slash-scroll [role=option]').first()).toContainText('Liste de tâches');
  await page.screenshot({ path: info.outputPath('slash-recents.png') });
  // The record survives a reload, like other browser preferences.
  await page.reload();
  await page.locator('.prose > p').first().click();
  await page.keyboard.press('End');
  await page.keyboard.type(' /');
  await expect(page.locator('.slash-menu .slash-group').first()).toHaveText('Récemment utilisés');
  await expect(page.locator('.slash-menu .slash-group').first()).toHaveText('Récemment utilisés');
  await page.keyboard.press('Escape');
  await deleteAll(page);
});

async function deleteAll(page: import('@playwright/test').Page) {
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
}
