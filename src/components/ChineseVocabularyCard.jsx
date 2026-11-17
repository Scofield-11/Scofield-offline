import { memo } from 'react';
import { BookMarked, Edit3, Maximize2, Trash2, Volume2 } from 'lucide-react';
import { getVocabFields } from '../utils/vocabHelper';
import './VocabularyEnhancements.css';

export default memo(function ChineseVocabularyCard({ vocab, onOpen, onSpeak, onNote, onEdit, onDelete }) {
  const { values } = getVocabFields(vocab, 'zh');
  return <article className="chinese-vocab-card">
    <button type="button" className="chinese-vocab-main" onClick={onOpen} aria-label={`Xem nét viết ${values.word}`}>
      <span className="chinese-vocab-glyph" lang="zh">{values.word || '—'}</span>
      <span className="chinese-vocab-copy">
        <span className="chinese-vocab-pinyin" lang="zh-Latn">{values.hiragana || 'Pinyin chưa cập nhật'}</span>
        <span className="hanviet-seal-badge">{values.hanviet || 'Hán Việt chưa cập nhật'}</span>
        <span className="chinese-vocab-meaning">{values.meaning || 'Nghĩa chưa cập nhật'}</span>
        <span className="chinese-vocab-hint"><Maximize2 size={14} aria-hidden="true" /> Xem nét viết</span>
      </span>
    </button>
    <div className="chinese-vocab-actions" aria-label="Quản lý từ vựng">
      <button type="button" className="btn-icon-soft chip-slate" onClick={onSpeak} aria-label={`Nghe ${values.word}`}><Volume2 size={17} aria-hidden="true" /></button>
      <button type="button" className="btn-icon-soft chip-primary" onClick={onNote} aria-label={`Lưu ${values.word} vào Sổ tay`}><BookMarked size={17} aria-hidden="true" /></button>
      <button type="button" className="btn-icon-soft chip-slate" onClick={onEdit} aria-label={`Sửa ${values.word}`}><Edit3 size={17} aria-hidden="true" /></button>
      <button type="button" className="btn-icon-soft chip-danger" onClick={onDelete} aria-label={`Xóa ${values.word}`}><Trash2 size={17} aria-hidden="true" /></button>
    </div>
  </article>;
});
