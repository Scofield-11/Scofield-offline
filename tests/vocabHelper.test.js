import test from 'node:test';
import assert from 'node:assert/strict';
import { getVocabFields, checkFieldMatch, isComprehensiveEligible, supportsComprehensive,
  createComprehensiveQuestion, gradeComprehensive, getAnswerStatus, getFieldStats, getFieldSpeech } from '../src/utils/vocabHelper.js';

const vocab = Object.freeze({ id: '12_ex_0', kanji: '学校', hanviet: 'Học hiệu', reading: 'がっこう', meaning: 'trường học', language: 'ja' });
test('legacy aliases and raw values are preserved without mutation', () => {
  assert.equal(getVocabFields(vocab).values.word, '学校');
  assert.equal(getVocabFields(vocab).values.hiragana, 'がっこう');
  assert.equal(getVocabFields({ hanviet: ' HỌC  HIỆU ' }).values.hanviet, ' HỌC  HIỆU ');
  assert.ok(isComprehensiveEligible(vocab));
  assert.deepEqual(getVocabFields({ language: 'en' }).fields, ['word', 'meaning']);
  assert.equal(getVocabFields({}, 'zh').labels.hiragana, 'Pinyin');
});
test('fallback knowledge never qualifies a question', () => {
  const adapted = { ...vocab, meaning: 'Học hiệu', source_fields: { ...vocab, meaning: ' ' } };
  assert.equal(isComprehensiveEligible(adapted), false);
  assert.equal(getVocabFields(adapted).values.meaning, '');
  for (const field of ['word', 'hanviet', 'hiragana', 'meaning']) {
    assert.equal(isComprehensiveEligible({ ...getVocabFields(vocab).values, [field]: '' }), false);
  }
});
test('only an actual single Kanji set is supported', () => {
  const sets = [{ id: 1, type: 'kanji' }, { id: 2, type: 'vocab', language: 'zh' }];
  assert.ok(supportsComprehensive(sets, '1'));
  for (const id of ['2', 'multi_1', 'folder_1', 'kanji_1', '']) assert.equal(supportsComprehensive(sets, id), false);
});
test('matching preserves accents, tones, kana size, punctuation and negation', () => {
  assert.ok(checkFieldMatch('  HỌC   HIỆU '.normalize('NFD'), 'Học hiệu', 'hanviet'));
  assert.equal(checkFieldMatch('hoc hieu', 'học hiệu', 'hanviet'), false);
  assert.ok(checkFieldMatch('がっこう', 'がっこう / ガッコウ', 'hiragana'));
  assert.equal(checkFieldMatch('がつこう', 'がっこう', 'hiragana'), false);
  assert.equal(checkFieldMatch('コヒ', 'コーヒー', 'hiragana'), false);
  assert.equal(checkFieldMatch('ma', 'mǎ', 'pinyin'), false);
  assert.equal(checkFieldMatch('má', 'mǎ', 'pinyin'), false);
  assert.ok(checkFieldMatch('mǎ'.normalize('NFD'), 'mǎ', 'pinyin'));
  assert.ok(checkFieldMatch('trường học', 'nhà trường; trường học', 'meaning'));
  assert.ok(checkFieldMatch('trường học', ['nhà trường', 'trường học'], 'meaning'));
  assert.equal(checkFieldMatch('cảm ơn', 'không, cảm ơn', 'meaning'), false);
  assert.equal(checkFieldMatch('được', 'không được', 'meaning'), false);
  assert.equal(checkFieldMatch('', '', 'meaning'), false);
});
test('partial answers earn skill credit but not a correct question', () => {
  const q = createComprehensiveQuestion(vocab);
  assert.equal(getAnswerStatus(q), 'empty');
  q.userAnswer.hanviet = 'học hiệu';
  assert.equal(getAnswerStatus(q), 'partial');
  q.userAnswer.meaning = 'trường học';
  q.userAnswer.hiragana = 'がつこう';
  assert.equal(getAnswerStatus(q), 'complete');
  const graded = gradeComprehensive(q);
  assert.equal(graded.isCorrect, false);
  assert.equal(graded.fieldResults.hiragana.isCorrect, false);
  assert.deepEqual(getFieldStats([graded]).hanviet, { correct: 1, total: 1 });
  assert.equal(gradeComprehensive({ ...q, userAnswer: q.correctAnswer }).isCorrect, true);
  assert.equal(gradeComprehensive(createComprehensiveQuestion(vocab)).isCorrect, false);
  assert.equal(getAnswerStatus({ type: 'typing', userAnswer: ' a ' }), 'complete');
  assert.equal(q.originalVocab.id, '12_ex_0');
});
test('audio uses the field language and Hanzi for Pinyin', () => {
  assert.deepEqual(getFieldSpeech({ word: '你好', hiragana: 'nǐ hǎo', language: 'zh' }, 'hiragana'), { text: '你好', lang: 'zh-CN' });
  assert.equal(getFieldSpeech(vocab, 'hanviet').lang, 'vi-VN');
  assert.equal(getFieldSpeech(vocab, 'hiragana').lang, 'ja-JP');
});
