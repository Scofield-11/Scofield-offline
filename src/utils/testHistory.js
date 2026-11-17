// Optional additions only: old one-answer history rows retain their shape.
export function comprehensiveHistoryFields(record = {}) {
  if (record.exam_format !== 'comprehensive') return {};
  return {
    exam_format: 'comprehensive',
    field_stats: record.field_stats || {},
    question_details: Array.isArray(record.question_details) ? record.question_details : [],
  };
}

export function remapHistoryReferences(record, setIds, vocabIds) {
  const mapVocabId = (id) => {
    const match = String(id).match(/^(\d+)_ex_(\d+)$/);
    if (match) return vocabIds[match[1]] === undefined ? id : `${vocabIds[match[1]]}_ex_${match[2]}`;
    return vocabIds[id] ?? id;
  };
  const mapVocab = (vocab) => vocab ? {
    ...vocab, id: mapVocabId(vocab.id), set_id: setIds[vocab.set_id] ?? vocab.set_id,
    ...(vocab.parent_kanji_id !== undefined ? { parent_kanji_id: vocabIds[vocab.parent_kanji_id] ?? vocab.parent_kanji_id } : {}),
  } : undefined;
  const mapQuestion = (q) => ({
    ...q,
    ...(q.id !== undefined ? { id: mapVocabId(q.id) } : {}),
    ...(q.vocabId !== undefined ? { vocabId: mapVocabId(q.vocabId) } : {}),
    ...(q.setId !== undefined ? { setId: setIds[q.setId] ?? q.setId } : {}),
    ...(q.originalVocab ? { originalVocab: mapVocab(q.originalVocab) } : {}),
  });
  const fields = comprehensiveHistoryFields(record);
  return {
    ...fields,
    ...(fields.question_details ? { question_details: fields.question_details.map(mapQuestion) } : {}),
    wrong_details: (record.wrong_details || record.wrongDetails || []).map(mapQuestion),
  };
}
