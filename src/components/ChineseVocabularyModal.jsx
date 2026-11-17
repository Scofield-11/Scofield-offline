import AccessibleModal from './AccessibleModal';
import HanziStrokeOrder from './HanziStrokeOrder';
import VocabularyAnswerDetail from './VocabularyAnswerDetail';
import { getVocabFields } from '../utils/vocabHelper';

export default function ChineseVocabularyModal({ vocab, onClose }) {
  return <AccessibleModal title="Nét viết & từ vựng tiếng Trung" onClose={onClose} className="chinese-vocab-modal">
    <div className="chinese-vocab-modal-grid">
      <HanziStrokeOrder text={getVocabFields(vocab, 'zh').values.word} />
      <VocabularyAnswerDetail vocab={vocab} language="zh" />
    </div>
  </AccessibleModal>;
}
