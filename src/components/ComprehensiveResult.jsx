import { CheckCircle2, XCircle } from 'lucide-react';
import { ANSWER_FIELDS, getFieldStats, getVocabFields } from '../utils/vocabHelper';
import './VocabularyEnhancements.css';

export function ComprehensiveStats({ questions }) {
  const stats = getFieldStats(questions);
  const { labels } = getVocabFields(questions[0]?.originalVocab);
  return <div className="comprehensive-stats" aria-label="Độ chính xác từng kỹ năng">
    {ANSWER_FIELDS.map((field) => <div key={field}><span>{labels[field]}</span><strong>{stats[field].total ? Math.round(stats[field].correct / stats[field].total * 100) : 0}%</strong><small>{stats[field].correct}/{stats[field].total} trường đúng</small></div>)}
  </div>;
}

export default function ComprehensiveResult({ question }) {
  const { labels } = getVocabFields(question.originalVocab);
  const count = ANSWER_FIELDS.filter((field) => question.fieldResults?.[field]?.isCorrect).length;
  return <div className="comprehensive-result">
    <p className="fw-bold">{question.isCorrect ? '✓ Đạt toàn diện' : 'Chưa đạt toàn diện'} · {count}/3 trường đúng</p>
    <dl>
      {ANSWER_FIELDS.map((field) => {
        const result = question.fieldResults?.[field];
        if (!result) return null;
        const Icon = result.isCorrect ? CheckCircle2 : XCircle;
        return <div key={field} className={result.isCorrect ? 'field-correct' : 'field-incorrect'}>
          <dt><Icon size={18} aria-hidden="true" />{labels[field]} <span>{result.isCorrect ? 'Đúng' : 'Sai'}</span></dt>
          <dd><span>Bạn nhập:</span> {result.user || '(Bỏ trống)'}</dd>
          {!result.isCorrect && <dd><strong>Đáp án đúng:</strong> {result.correct}</dd>}
        </div>;
      })}
    </dl>
  </div>;
}
