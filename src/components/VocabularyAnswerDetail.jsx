import { Volume2 } from 'lucide-react';
import { canonicalField, getFieldSpeech, getVocabFields } from '../utils/vocabHelper';
import { speakText } from '../utils/audio';
import './VocabularyEnhancements.css';

export default function VocabularyAnswerDetail({ vocab, language, testedFrontField, testedBackField, userAnswer, questionText, correctAnswer, onPlayAudio }) {
  const data = getVocabFields(vocab, language);
  const front = canonicalField(testedFrontField);
  const back = canonicalField(testedBackField);
  const play = (field) => {
    const { text, lang } = getFieldSpeech(vocab, field, data.language);
    if (onPlayAudio) onPlayAudio(text, lang);
    else speakText(text, lang, 0.92, { exactLocale: true });
  };
  return (
    <section className="vocab-answer-detail text-start" aria-label="Thông tin từ vựng">
      {testedBackField && (
        <div className="vocab-answer-feedback" role="status">
          <p><strong>Câu hỏi:</strong> {questionText || data.values[front] || 'Chưa cập nhật'}</p>
          <p><strong>Bạn chọn/gõ:</strong> <span className="vocab-answer-wrong">{userAnswer || '(Bỏ trống)'}</span></p>
          <p><strong>✓ Đáp án đúng:</strong> {data.present[back] ? correctAnswer || data.values[back] : 'Chưa cập nhật'}</p>
        </div>
      )}
      <dl className="vocab-answer-grid">
        {data.fields.map((field) => (
          <div key={field} className={`vocab-answer-field ${back === field ? 'is-tested' : ''} ${!data.present[field] ? 'is-missing' : ''}`}>
            <dt>{data.labels[field]}{back === field && <span className="vocab-field-tag">Đang kiểm tra</span>}</dt>
            <dd>
              <span className={field === 'word' ? 'vocab-answer-word' : field === 'hanviet' && data.present[field] ? 'hanviet-seal-badge' : ''} lang={field === 'word' || field === 'hiragana' ? data.language : 'vi'}>
                {data.values[field] || 'Chưa cập nhật'}
              </span>
              {data.present[field] && <button type="button" className="btn-icon-soft chip-slate" aria-label={`Nghe ${data.labels[field]}`} onClick={() => play(field)}><Volume2 size={16} aria-hidden="true" /></button>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
