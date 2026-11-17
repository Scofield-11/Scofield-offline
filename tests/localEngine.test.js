import test from 'node:test';
import assert from 'node:assert/strict';
import { createComprehensiveQuestion, gradeComprehensive, getFieldStats, isComprehensiveEligible } from '../src/utils/vocabHelper.js';

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) };
globalThis.window = { dispatchEvent() {} };
globalThis.document = { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };
const { default: api, exportAllDataToJson, importDataFromJson, pushToSupabase, autoPullFromCloud } = await import('../src/api/axiosConfig.js');
await new Promise((resolve) => setTimeout(resolve, 120));

test('Kanji examples: raw missing fields, old fallback and storage remain distinct', async () => {
  storage.clear();
  await api.post('/kanji-sets/bulk-import', { title: 'Kanji test', raw_text: '学 | ガク | まなぶ | HỌC | học\n- 学校 | HỌC HIỆU | がっこう | trường học\n- 学生 | HỌC SINH | がくせい | ' });
  const before = localStorage.getItem('scofield_db_vocabularies');
  const { data } = await api.get('/sets/1');
  assert.equal(data.vocabularies.length, 2);
  assert.equal(data.vocabularies[1].meaning, 'HỌC SINH'); // unchanged legacy behavior
  assert.equal(isComprehensiveEligible(data.vocabularies[1]), false);
  assert.equal(isComprehensiveEligible(data.vocabularies[0]), true);
  assert.equal(localStorage.getItem('scofield_db_vocabularies'), before);
});

test('new and legacy history survive reload, JSON merge with remapped compound IDs and cloud roundtrip', async () => {
  const { data: set } = await api.get('/sets/1');
  const question = createComprehensiveQuestion(set.vocabularies[0]);
  question.userAnswer = { ...question.correctAnswer, hiragana: '' };
  const graded = gradeComprehensive(question);
  await api.post('/test-history', { set_id: 1, title: 'Legacy', score: 1, total: 1, wrong_details: [] });
  await api.post('/test-history', { set_id: 1, title: 'Comprehensive', score: 0, total: 1, exam_format: 'comprehensive', field_stats: getFieldStats([graded]), question_details: [graded], wrong_details: [{ vocabId: question.id, originalVocab: question.originalVocab }] });
  let { data: history } = await api.get('/test-history');
  assert.equal(history.find((h) => h.title === 'Legacy').exam_format, undefined);
  assert.equal(history.find((h) => h.title === 'Comprehensive').question_details[0].fieldResults.hiragana.isCorrect, false);
  const backup = JSON.parse(JSON.stringify(exportAllDataToJson()));
  await importDataFromJson(backup, 'merge');
  const raw = JSON.parse(localStorage.getItem('scofield_db_test_histories'));
  const imported = raw.filter((h) => h.exam_format === 'comprehensive').at(-1);
  assert.equal(imported.set_id, 2);
  assert.equal(imported.question_details[0].id, '2_ex_0');
  assert.equal(imported.question_details[0].originalVocab.parent_kanji_id, 2);
  assert.equal(imported.wrong_details[0].vocabId, '2_ex_0');
  assert.equal(imported.question_details[0].originalVocab.hiragana, 'がっこう');

  const savedFetch = globalThis.fetch;
  let pushed;
  localStorage.setItem('scofield_auth_user', JSON.stringify({ sync_user_key: 'isolated-test-user' }));
  globalThis.fetch = async (_url, options) => {
    if (options.method === 'PATCH') { pushed = JSON.parse(options.body); return new Response(null, { status: 204 }); }
    return Response.json([{ user_key: 'isolated-test-user' }]);
  };
  try {
    assert.equal(await pushToSupabase(), true);
    assert.deepEqual(pushed.backup_json.test_histories, raw);
    storage.delete('scofield_db_test_histories');
    globalThis.fetch = async () => Response.json([{ ...pushed, user_key: 'isolated-test-user' }]);
    assert.equal(await autoPullFromCloud(true), true);
    ({ data: history } = await api.get('/test-history'));
    assert.equal(history.filter((h) => h.exam_format === 'comprehensive').length, 2);
    assert.equal(history.find((h) => h.setId === 2 && h.exam_format === 'comprehensive').question_details[0].fieldResults.hanviet.isCorrect, true);
  } finally { globalThis.fetch = savedFetch; localStorage.removeItem('scofield_auth_user'); }
});

test('structured Note creation retains four fields, punctuation and language', async () => {
  await importDataFromJson({ title: 'Note test', language: 'zh', folder_path: 'Note', vocabularies: [{ word: '你好', hanviet: 'NHĨ HẢO', hiragana: 'nǐ hǎo', meaning: 'xin chào | chào bạn; lời chào', language: 'zh' }] });
  const vocab = JSON.parse(localStorage.getItem('scofield_db_vocabularies')).at(-1);
  const noteSet = JSON.parse(localStorage.getItem('scofield_db_sets')).find((set) => set.title === 'Note test');
  assert.ok(noteSet);
  assert.equal(vocab.set_id, noteSet.id);
  assert.equal(vocab.meaning, 'xin chào | chào bạn; lời chào');
  assert.equal(vocab.language, 'zh');
  assert.equal(vocab.hiragana, 'nǐ hǎo');
  await api.put(`/vocabularies/${vocab.id}/srs`, { is_correct: true });
  const updated = JSON.parse(localStorage.getItem('scofield_db_vocabularies')).at(-1);
  assert.equal(updated.repetition, 1);
  assert.equal(updated.interval, 1);
});
