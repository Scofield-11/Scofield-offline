export const fixtureSets = [
  { id: 1, title: 'QA Kanji', type: 'kanji', language: 'ja' },
  { id: 2, title: 'QA Chinese', type: 'vocab', language: 'zh' },
  { id: 3, title: 'QA English', type: 'vocab', language: 'en' },
  { id: 4, title: 'QA Japanese', type: 'vocab', language: 'ja' },
  { id: 5, title: 'QA Incomplete', type: 'kanji', language: 'ja' },
];
export const fixtureVocabs = [
  { id: 1, set_id: 1, word: '学', hanviet: 'HỌC', meaning: 'học', language: 'ja', examples: [
    { word: '学校', hanviet: 'HỌC HIỆU', reading: 'がっこう', meaning: 'trường học' },
    { word: '学生', hanviet: 'HỌC SINH', hiragana: 'がくせい', meaning: 'học sinh' },
    { word: '大学', hanviet: 'ĐẠI HỌC', reading: 'だいがく', meaning: '' },
    { word: '学年', hanviet: '', reading: '', meaning: 'năm học' },
  ] },
  { id: 2, set_id: 2, word: '你好', hanviet: 'NHĨ HẢO', hiragana: 'nǐ hǎo', meaning: 'xin chào', language: 'zh' },
  { id: 3, set_id: 2, word: '谢谢', hanviet: 'TẠ TẠ', hiragana: 'xiè xie', meaning: 'cảm ơn', language: 'zh' },
  { id: 4, set_id: 2, word: '𠮷', hanviet: '', hiragana: '', meaning: 'ký tự kiểm tra dữ liệu thiếu', language: 'zh' },
  ...['cat', 'dog', 'bird', 'fish'].map((word, i) => ({ id: i + 10, set_id: 3, word, meaning: ['mèo', 'chó', 'chim', 'cá'][i], language: 'en' })),
  { id: 20, set_id: 4, word: '猫', hiragana: 'ねこ', hanviet: 'MIÊU', meaning: 'mèo', language: 'ja' },
  { id: 30, set_id: 5, word: '学', language: 'ja', examples: [{ word: '学ぶ', meaning: 'học' }] },
];

export async function seed(page) {
  await page.route('**/*.supabase.co/**', (route) => route.abort());
  await page.addInitScript(({ sets, vocabs }) => {
    if (!localStorage.getItem('qa_seeded')) {
      localStorage.setItem('qa_seeded', 'true');
      localStorage.setItem('scofield_db_sets', JSON.stringify(sets));
      localStorage.setItem('scofield_db_vocabularies', JSON.stringify(vocabs));
      localStorage.setItem('scofield_db_test_histories', '[]');
      localStorage.setItem('scofield_auth_user', JSON.stringify({ id: 'qa', username: 'qa', role: 'user' }));
    }
    // Keep browser tests local; no auth token or cloud sync key is installed.
    window.speechSynthesis.speak = () => {};
    Element.prototype.requestFullscreen = () => Promise.reject(new Error('CSS fullscreen for deterministic viewport checks'));
  }, { sets: fixtureSets, vocabs: fixtureVocabs });
}

export async function selectSet(page, title) {
  await page.locator('.set-selector-trigger').click();
  const language = title.includes('Chinese') ? 'Trung' : title.includes('English') ? 'Anh' : title.includes('Japanese') ? 'Nhật' : 'Kanji';
  await page.locator('.set-sheet-segmented').getByRole('button', { name: new RegExp(language) }).click();
  await page.locator('.set-sheet-search-input').fill(title);
  await page.locator('.set-sheet-panel').getByText(title, { exact: true }).last().click();
}
