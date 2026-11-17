export const VOCAB_FIELDS = ['word', 'hanviet', 'hiragana', 'meaning'];
export const ANSWER_FIELDS = ['hanviet', 'hiragana', 'meaning'];

export const hasFieldValue = (value) => typeof value === 'string' && value.trim().length > 0;
export const canonicalField = (field) => ({ kanji: 'word', reading: 'hiragana', pinyin: 'hiragana' }[field] || field);

// source_fields is a read-time snapshot before the legacy API supplies fallbacks.
// Never infer missing knowledge from another field, and never mutate the source.
export function getVocabFields(vocab = {}, language) {
  const source = vocab.source_fields || vocab;
  const first = (...values) => values.find(hasFieldValue) || '';
  const values = {
    word: first(source.word, source.kanji),
    hanviet: first(source.hanviet),
    hiragana: first(source.hiragana, source.reading),
    meaning: first(source.meaning),
  };
  const lang = language || vocab.language || 'ja';
  const fields = lang === 'ja' || lang === 'zh' ? VOCAB_FIELDS : ['word', 'meaning'];
  const present = Object.fromEntries(VOCAB_FIELDS.map((key) => [key, hasFieldValue(values[key])]));
  return {
    values, present, language: lang, fields,
    missing: fields.filter((key) => !present[key]),
    labels: {
      word: lang === 'zh' ? 'Chữ Hán' : lang === 'ja' ? 'Chữ Hán / Từ vựng' : 'Từ vựng',
      hanviet: 'Hán Việt', hiragana: lang === 'zh' ? 'Pinyin' : 'Cách đọc (Kana)', meaning: 'Nghĩa',
    },
  };
}

export function isComprehensiveEligible(vocab) {
  const { present } = getVocabFields(vocab);
  return VOCAB_FIELDS.every((field) => present[field]);
}

export function supportsComprehensive(sets, selectedSetId) {
  const id = String(selectedSetId || '');
  // A folder or multi-selection with just one member still isn't a single set.
  if (!id || /^(multi_|folder_|lang_|all_)/.test(id)) return false;
  return sets.some((set) => String(set.id) === id && set.type === 'kanji' && !set.title?.startsWith('_Thư mục:'));
}

const normalizeAnswer = (value) => String(value ?? '').normalize('NFC').toLowerCase().replace(/\s+/gu, ' ').trim();

/** Explicit alternatives: arrays, semicolons, pipes, newlines; readings also allow / and 、.
 * Commas and slashes in meanings remain significant (e.g. "không, cảm ơn").
 * Kana size, prolonged sound marks, Vietnamese accents and Pinyin tones stay intact.
 */
export function checkFieldMatch(userInput, targetValue, fieldType) {
  const input = normalizeAnswer(userInput);
  if (!input) return false;
  const targets = Array.isArray(targetValue) ? targetValue : [targetValue];
  const separator = canonicalField(fieldType) === 'hiragana' || fieldType === 'hanviet'
    ? /[;|\n/、]+/u : /[;|\n]+/u;
  return targets.some((target) => typeof target === 'string' && (
    input === normalizeAnswer(target) || target.split(separator).some((part) => input === normalizeAnswer(part))
  ));
}

export function getFieldSpeech(vocab, field, language) {
  const data = getVocabFields(vocab, language);
  const key = canonicalField(field);
  const lang = key === 'hanviet' || key === 'meaning' ? 'vi-VN'
    : data.language === 'zh' ? 'zh-CN' : data.language === 'ja' ? 'ja-JP' : data.language;
  // Read the Hanzi instead of spelling Latin Pinyin when a source word exists.
  const text = key === 'hiragana' && data.language === 'zh' && data.present.word
    ? data.values.word : data.values[key] || '';
  return { text, lang };
}

export function snapshotVocab(vocab) {
  return {
    id: vocab.id, set_id: vocab.set_id, parent_kanji_id: vocab.parent_kanji_id,
    example_index: vocab.example_index, ...getVocabFields(vocab).values,
    language: vocab.language || 'ja',
  };
}

export function createComprehensiveQuestion(vocab) {
  const originalVocab = snapshotVocab(vocab);
  return {
    id: vocab.id, type: 'comprehensive', originalVocab,
    questionText: originalVocab.word,
    correctAnswer: Object.fromEntries(ANSWER_FIELDS.map((key) => [key, originalVocab[key]])),
    userAnswer: Object.fromEntries(ANSWER_FIELDS.map((key) => [key, ''])), isCorrect: null,
  };
}

export function getAnswerStatus(question) {
  if (question.type !== 'comprehensive') return hasFieldValue(question.userAnswer) ? 'complete' : 'empty';
  const count = ANSWER_FIELDS.filter((key) => hasFieldValue(question.userAnswer?.[key])).length;
  return count === 3 ? 'complete' : count ? 'partial' : 'empty';
}

export function gradeComprehensive(question) {
  const fieldResults = Object.fromEntries(ANSWER_FIELDS.map((key) => [key, {
    user: typeof question.userAnswer?.[key] === 'string' ? question.userAnswer[key] : '',
    correct: question.correctAnswer[key],
    isCorrect: checkFieldMatch(question.userAnswer?.[key], question.correctAnswer[key], key), required: true,
  }]));
  return { ...question, fieldResults, isCorrect: ANSWER_FIELDS.every((key) => fieldResults[key].isCorrect) };
}

export function getFieldStats(questions) {
  const comprehensive = questions.filter((q) => q.type === 'comprehensive');
  return Object.fromEntries(ANSWER_FIELDS.map((key) => [key, {
    correct: comprehensive.filter((q) => q.fieldResults?.[key]?.isCorrect).length,
    total: comprehensive.length,
  }]));
}
