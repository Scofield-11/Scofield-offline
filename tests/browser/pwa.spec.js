import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { seed } from './fixtures';

test('built PWA reloads offline with cached Hanzi and handles uncached data', async ({ page, context }) => {
  await seed(page);
  await page.route('**/hanzi-writer-data@2.0.1/*.json', async (route) => {
    const body = await readFile(new URL('./data/你.json', import.meta.url), 'utf8');
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  await page.getByRole('heading', { name: 'QA Chinese', exact: true }).click();
  await page.getByRole('button', { name: 'Xem nét viết 你好', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('7 nét');
  await page.keyboard.press('Escape');
  await page.unroute('**/hanzi-writer-data@2.0.1/*.json');
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'QA Chinese', exact: true }).click();
  await page.getByRole('button', { name: 'Xem nét viết 你好', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('7 nét');
  await page.getByRole('button', { name: '好, ký tự 2', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('Không có dữ liệu');
  await expect(page.locator('.hanzi-static-character')).toHaveText('好');
});
