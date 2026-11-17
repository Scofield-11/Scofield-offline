import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { seed, selectSet } from './fixtures';

async function strokeRoute(page, counter = { count: 0 }) {
  await page.route('**/hanzi-writer-data@2.0.1/*.json', async (route) => {
    counter.count++;
    const character = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()).replace('.json', '');
    if (!['你', '好', '谢'].includes(character)) return route.fulfill({ status: 404, body: '' });
    const body = await readFile(new URL(`./data/${character}.json`, import.meta.url), 'utf8');
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
}
async function openChinese(page) {
  await page.goto('/');
  await page.getByRole('heading', { name: 'QA Chinese', exact: true }).click();
}
async function startComprehensive(page) {
  await page.goto('/test');
  await selectSet(page, 'QA Kanji');
  await page.getByRole('button', { name: /Toàn diện \(3 trường\)/ }).click();
  await expect(page.locator('.comprehensive-pool-info')).toContainText('2 từ đủ dữ liệu');
  await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click();
}
async function assertNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    expect(box.height).toBeLessThanOrEqual(page.viewportSize().height);
  }
}

const pageErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

for (const width of [360, 390, 768, 1280]) {
  for (const theme of ['light', 'dark']) {
    test(`responsive ${width}px ${theme}: Chinese modal and three-field exam`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await seed(page);
      await page.addInitScript((theme) => localStorage.setItem('scofield_theme', theme), theme);
      const requests = { count: 0 };
      await strokeRoute(page, requests);
      await openChinese(page);
      expect(requests.count).toBe(0);
      const open = page.getByRole('button', { name: 'Xem nét viết 你好', exact: true });
      await open.click();
      await expect(page.locator('.hanzi-status')).toContainText('7 nét');
      expect(await page.locator('.hanzi-writer-target path').count()).toBeGreaterThan(0);
      await assertNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`chinese-${width}-${theme}.png`), fullPage: true });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(open).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      await startComprehensive(page);
      await expect(page.locator('.comprehensive-inputs input')).toHaveCount(6);
      await assertNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`exam-${width}-${theme}.png`), fullPage: true });
    });
  }
}

test('Hanzi controls, repeated positions, retry, cache and modal keyboard cleanup', async ({ page }) => {
  await seed(page);
  const requests = { count: 0 };
  await strokeRoute(page, requests);
  await openChinese(page);
  await page.evaluate(() => {
    window.qaPointerListeners = 0;
    const add = document.addEventListener.bind(document);
    document.addEventListener = (type, listener, options) => {
      if (type === 'mouseup' || type === 'touchend') window.qaPointerListeners++;
      return add(type, listener, options);
    };
  });
  await page.getByRole('button', { name: 'Xem nét viết 你好', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('7 nét');
  await page.getByRole('button', { name: 'Phát nét', exact: true }).click();
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('Đã tạm dừng');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Vẽ lại từ đầu', exact: true }).click();
  await page.getByLabel('Tốc độ').selectOption('2');
  await expect(page.locator('.hanzi-status')).toContainText('Sẵn sàng');
  await page.getByRole('button', { name: '好, ký tự 2', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('6 nét');
  await page.getByRole('button', { name: 'Đóng', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'Giấy phép dữ liệu' })).not.toBeFocused(); // last focusable is audio, panel stays trapped
  expect(await page.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Xem nét viết 你好', exact: true }).click();
    await expect(page.locator('.hanzi-status')).toContainText('7 nét');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(requests.count).toBe(2);
  expect(await page.evaluate(() => window.qaPointerListeners)).toBe(0);
  await page.getByRole('button', { name: 'Xem nét viết 谢谢', exact: true }).click();
  await expect(page.getByRole('button', { name: '谢, ký tự 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '谢, ký tự 2', exact: true }).click();
  await expect(page.getByRole('button', { name: '谢, ký tự 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Xem nét viết 𠮷', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('Không có dữ liệu');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('Không có dữ liệu');
  await expect(page.locator('.hanzi-static-character')).toHaveText('𠮷');
});

test('comprehensive IME, empty warning, Note and all-empty grading', async ({ page }) => {
  await seed(page);
  await startComprehensive(page);
  const first = page.locator('#comprehensive-0-hanviet');
  await first.fill('HỌC');
  await expect(page.getByRole('button', { name: 'Câu 1: đang trả lời dở' })).toBeVisible();
  await first.dispatchEvent('compositionstart');
  await first.press('Enter');
  await expect(first).toBeFocused();
  await first.dispatchEvent('compositionend');
  await first.press('Enter');
  await expect(page.locator('#comprehensive-0-hiragana')).toBeFocused();
  await page.locator('#comprehensive-0-meaning').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#comprehensive-1-hanviet')).toBeFocused();
  await page.getByRole('button', { name: 'Câu 1: đang trả lời dở' }).click();
  await expect(first).toHaveValue('HỌC');
  await first.fill('');
  await page.locator('#comprehensive-1-meaning').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /Nộp bài ngay/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Còn 2 câu chưa nhập đủ');
  await page.getByRole('button', { name: 'Xác nhận nộp bài' }).click();
  await expect(page.locator('.comprehensive-result')).toContainText(['0/3 trường đúng', '0/3 trường đúng']);
  await page.getByRole('button', { name: 'Lưu vào Note', exact: true }).first().click();
  await page.getByLabel('Tên học phần Note mới').fill('QA Saved Note');
  await page.getByRole('button', { name: 'Lưu lại', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const saved = await page.evaluate(() => {
    const sets = JSON.parse(localStorage.getItem('scofield_db_sets'));
    const vocabs = JSON.parse(localStorage.getItem('scofield_db_vocabularies'));
    return vocabs.find((v) => v.set_id === sets.find((s) => s.title === 'QA Saved Note').id);
  });
  expect(saved.hanviet).toBeTruthy(); expect(saved.hiragana).toBeTruthy(); expect(saved.meaning).toBeTruthy(); expect(saved.language).toBe('ja');
});

test('comprehensive resets outside a single Kanji set and disables zero eligible entries', async ({ page }) => {
  await seed(page); await page.goto('/test');
  await selectSet(page, 'QA Incomplete');
  await page.getByRole('button', { name: /Toàn diện \(3 trường\)/ }).click();
  await expect(page.locator('.comprehensive-pool-info')).toContainText('0 từ đủ dữ liệu');
  await expect(page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true })).toBeDisabled();
  await selectSet(page, 'QA Chinese');
  await expect(page.getByRole('button', { name: /Toàn diện \(3 trường\)/ })).toHaveCount(0);
  await expect(page.locator('.test-lobby-format-card').filter({ hasText: 'Trắc nghiệm' }).first()).toHaveAttribute('aria-pressed', 'true');
});

for (const title of ['QA Kanji', 'QA Chinese', 'QA Japanese']) {
  test(`Learn wrong and don't-know feedback preserves ${title}`, async ({ page }) => {
    await seed(page); await page.goto('/learn'); await selectSet(page, title);
    await page.getByRole('button', { name: 'Bắt đầu rèn luyện' }).click();
    await page.getByRole('button', { name: /Tôi chưa nhớ câu này/ }).click();
    await expect(page.locator('.vocab-answer-field')).toHaveCount(4);
    await expect(page.locator('.vocab-answer-feedback')).toContainText('Chưa nhớ từ này');
    await expect(page.locator('.vocab-answer-field.is-tested')).toHaveCount(1);
    await page.getByRole('button', { name: 'Đã hiểu, tiếp tục' }).click();
    await expect(page.locator('.vocab-answer-detail')).toHaveCount(0);
  });
}

for (const format of ['Trắc nghiệm', 'Tự luận', 'Hỗn hợp']) {
  test(`legacy ${format} still submits string answers`, async ({ page }) => {
    await seed(page); await page.goto('/test'); await selectSet(page, 'QA English');
    await page.locator('.test-lobby-format-card').filter({ has: page.locator('.test-lobby-format-title', { hasText: format }) }).click();
    await page.getByRole('button', { name: 'Bắt đầu làm bài', exact: true }).click();
    for (const card of await page.locator('.test-question-card').all()) {
      const input = card.locator('input');
      if (await input.count()) await input.fill('mèo');
      else await card.locator('.test-option-btn').first().click();
    }
    await page.getByRole('button', { name: /Nộp bài ngay/ }).click();
    await page.getByRole('button', { name: 'Xác nhận nộp bài' }).click();
    await expect(page.getByText('Kết quả bài kiểm tra', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('scofield_db_test_histories'))[0].exam_format)).toBeUndefined();
  });
}

test('Flashcard flip and Match start remain available', async ({ page }) => {
  await seed(page); await page.goto('/flashcards'); await selectSet(page, 'QA English');
  await page.getByRole('button', { name: /Bắt đầu lật thẻ/ }).click();
  await expect(page.locator('.flashcard-stage')).toBeVisible();
  await page.locator('.flashcard-container').click();
  await page.goto('/match'); await selectSet(page, 'QA English');
  await page.getByRole('button', { name: /Bắt đầu ván đấu/ }).click();
  await expect(page.locator('.match-card-ratio')).toHaveCount(8);
});

test('stroke cache survives reload and an uncached offline character can retry', async ({ page, context }) => {
  const requests = { count: 0 };
  await seed(page); await strokeRoute(page, requests); await openChinese(page);
  await page.getByRole('button', { name: 'Xem nét viết 你好', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('7 nét');
  await page.keyboard.press('Escape');
  await openChinese(page);
  // Vite dev has no service worker: load the lazy JS again before going offline.
  // The production PWA test separately verifies a completely offline reload.
  await page.getByRole('button', { name: 'Xem nét viết 你好', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('7 nét');
  expect(requests.count).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.unroute('**/hanzi-writer-data@2.0.1/*.json');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Xem nét viết 你好', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('7 nét');
  await page.getByRole('button', { name: '好, ký tự 2', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('Không có dữ liệu');
  await context.setOffline(false); await strokeRoute(page);
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.hanzi-status')).toContainText('6 nét');
});

test('long Chinese lists stay static and long words wrap', async ({ page }) => {
  await seed(page); await page.goto('/');
  await page.evaluate(() => {
    const vocabs = JSON.parse(localStorage.getItem('scofield_db_vocabularies'));
    for (let i = 0; i < 200; i++) vocabs.push({ id: 100 + i, set_id: 2, word: '你好'.repeat(i === 0 ? 20 : 1), hanviet: 'NHĨ HẢO', hiragana: 'nǐ hǎo', meaning: 'xin chào '.repeat(10), language: 'zh' });
    localStorage.setItem('scofield_db_vocabularies', JSON.stringify(vocabs));
  });
  const requests = { count: 0 }; await strokeRoute(page, requests);
  await page.setViewportSize({ width: 360, height: 800 }); await openChinese(page);
  await expect(page.locator('.chinese-vocab-card')).toHaveCount(203);
  expect(requests.count).toBe(0);
  await expect(page.locator('.hanzi-writer-target')).toHaveCount(0);
  await assertNoOverflow(page);
});

test('Learn typing error after correct micro-reward shows the original word', async ({ page }) => {
  await seed(page); await page.goto('/learn'); await selectSet(page, 'QA Japanese');
  await page.getByRole('button', { name: 'Bắt đầu rèn luyện' }).click();
  await page.locator('.learn-option-btn').click();
  const input = page.getByPlaceholder(/Nhập/);
  await expect(input).toBeVisible();
  await page.waitForTimeout(75); // Existing Learn IME transition guard unlocks after 50ms.
  await input.fill('sai');
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
  await expect(page.locator('.vocab-answer-feedback')).toContainText('sai');
  await expect(page.locator('.vocab-answer-word')).toHaveText('猫');
  await expect(page.locator('.vocab-answer-detail')).toContainText('ねこ');
  await page.getByRole('button', { name: 'Đã hiểu, tiếp tục' }).click();
  await expect(page.locator('.learn-option-btn')).toHaveCount(1);
});

test('Japanese stroke source and controls remain separate from Hanzi', async ({ page }) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hanzi = { count: 0 }; await strokeRoute(page, hanzi);
  await page.route('**/KanjiVG/kanjivg@r20260714/kanji/05b66.svg', async (route) => {
    const body = await readFile(new URL('./data/05b66.svg', import.meta.url), 'utf8');
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body });
  });
  await page.goto('/kanji');
  await page.getByRole('heading', { name: 'QA Kanji', exact: true }).click();
  const widget = page.locator('.kanji-stroke-widget').first();
  await expect(widget.locator('.kanji-stroke-count-pill')).toHaveText('8 nét');
  await expect(widget.locator('.kanji-number-layer text')).toHaveCount(8);
  await widget.getByRole('button', { name: 'Ẩn/Hiện số thứ tự nét', exact: true }).click();
  await expect(widget.locator('.kanji-number-layer text')).toHaveCount(0);
  await widget.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await widget.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await widget.getByRole('button', { name: 'Vẽ lại từ đầu', exact: true }).click();
  expect(hanzi.count).toBe(0);
});

test('a fully correct comprehensive exam counts questions and all three skills', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page); await startComprehensive(page);
  for (const card of await page.locator('.test-question-card').all()) {
    const school = (await card.locator('h4').innerText()).includes('学校');
    await card.getByLabel('Hán Việt', { exact: true }).fill(school ? 'HỌC HIỆU' : 'HỌC SINH');
    await card.getByLabel('Cách đọc (Kana)', { exact: true }).fill(school ? 'がっこう' : 'がくせい');
    await card.getByLabel('Nghĩa', { exact: true }).fill(school ? 'trường học' : 'học sinh');
  }
  await page.getByRole('button', { name: /Nộp bài ngay/ }).click();
  await page.getByRole('button', { name: 'Xác nhận nộp bài' }).click();
  await expect(page.getByText('✓ Đạt toàn diện · 3/3 trường đúng', { exact: true })).toHaveCount(2);
  await expect(page.locator('.comprehensive-stats strong')).toHaveText(['100%', '100%', '100%']);
  await expect(page.locator('h1')).toHaveText('100%');
  await page.waitForTimeout(1500); // Settle the existing route/result entrance before visual capture.
  await page.screenshot({ path: testInfo.outputPath('result-viewport.png') });
});
