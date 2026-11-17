import { test, expect } from '@playwright/test';
import { seed, selectSet } from './fixtures';

test('comprehensive eligibility and partial scoring persist into history', async ({ page }) => {
  await seed(page);
  await page.goto('/test');
  await selectSet(page, 'QA Kanji');
  await page.getByRole('button', { name: /Toàn diện \(3 trường\)/ }).click();
  await expect(page.locator('.comprehensive-pool-info')).toContainText('2 từ đủ dữ liệu');
  await expect(page.locator('.comprehensive-pool-info')).toContainText('2 từ bị loại');
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click();
  await expect(page.locator('.comprehensive-inputs')).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const card = page.locator('.test-question-card').nth(i);
    const school = (await card.locator('h4').innerText()).includes('学校');
    await card.getByLabel('Hán Việt', { exact: true }).fill(school ? 'học hiệu' : 'học sinh');
    await card.getByLabel('Cách đọc (Kana)', { exact: true }).fill(i === 0 ? (school ? 'がっこう' : 'がくせい') : 'sai');
    await card.getByLabel('Nghĩa', { exact: true }).fill(school ? 'trường học' : 'học sinh');
  }
  await page.getByRole('button', { name: /Nộp bài ngay/ }).click();
  await page.getByRole('button', { name: 'Xác nhận nộp bài', exact: true }).click();
  await expect(page.locator('.comprehensive-result')).toHaveCount(2);
  await expect(page.getByText('Chưa đạt toàn diện · 2/3 trường đúng')).toBeVisible();
  await expect(page.locator('.comprehensive-stats')).toContainText('50%');
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('scofield_db_test_histories')));
  expect(history[0].score).toBe(1);
  expect(history[0].total).toBe(2);
  expect(history[0].question_details[0].originalVocab.id).toMatch(/_ex_/);
  page.once('dialog', (dialog) => dialog.accept('QA Mistakes'));
  await page.getByRole('button', { name: 'Lưu 1 câu sai', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('scofield_db_sets')).some((set) => set.title === 'QA Mistakes'))).toBe(true);
  const mistake = await page.evaluate(() => {
    const set = JSON.parse(localStorage.getItem('scofield_db_sets')).find((s) => s.title === 'QA Mistakes');
    return JSON.parse(localStorage.getItem('scofield_db_vocabularies')).find((v) => v.set_id === set.id);
  });
  expect(mistake).toMatchObject({ word: history[0].question_details[1].originalVocab.word, hanviet: history[0].question_details[1].originalVocab.hanviet, hiragana: history[0].question_details[1].originalVocab.hiragana, meaning: history[0].question_details[1].originalVocab.meaning, language: 'ja' });
  await page.reload();
  await page.getByText('Lịch sử làm bài', { exact: true }).click();
  await page.locator('.card-header').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ }).click();
  await page.getByRole('button', { name: 'Xem lại', exact: true }).click();
  await expect(page.locator('.comprehensive-result')).toHaveCount(2);
  await page.getByRole('button', { name: 'Lưu vào Note', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu lại', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('scofield_db_vocabularies')).filter((v) => v.set_id === JSON.parse(localStorage.getItem('scofield_db_sets')).find((s) => s.title === 'QA Mistakes').id).length)).toBe(2);
});
