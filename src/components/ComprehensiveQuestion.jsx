import { useRef } from 'react';
import { ANSWER_FIELDS, getVocabFields } from '../utils/vocabHelper';

export default function ComprehensiveQuestion({ question, index, onChange, onNext }) {
  const inputRefs = useRef([]);
  const composing = useRef(false);
  const { labels } = getVocabFields(question.originalVocab);
  return <fieldset className="comprehensive-inputs">
    <legend className="visually-hidden">Ba đáp án cho câu {index + 1}: {question.questionText}</legend>
    {ANSWER_FIELDS.map((field, fieldIndex) => {
      const id = `comprehensive-${index}-${field}`;
      return <div key={field}>
        <label htmlFor={id}>{labels[field]}</label>
        <input id={id} ref={(node) => { inputRefs.current[fieldIndex] = node; }}
          className="form-control" type="text" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
          lang={field === 'hiragana' ? question.originalVocab.language : 'vi'}
          value={question.userAnswer[field] || ''} onChange={(event) => onChange(field, event.target.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            if (fieldIndex < ANSWER_FIELDS.length - 1) inputRefs.current[fieldIndex + 1]?.focus();
            else onNext();
          }}
        />
      </div>;
    })}
    <p className="small text-secondary mb-0">Giữ dấu tiếng Việt, Kana và thanh điệu. Enter chuyển ô; bài chỉ được nộp khi bạn xác nhận.</p>
  </fieldset>;
}
