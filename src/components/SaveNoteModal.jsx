import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { X, BookMarked } from 'lucide-react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

function SaveNoteModal({ vocab, sets, onClose, onSaveSuccess }) {
  const [selectedSetId, setSelectedSetId] = useState('new');
  const [noteSetName, setNoteSetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tìm tất cả các học phần nằm trong thư mục Note (loại bỏ các bản ghi đánh dấu thư mục ẩn)
  const noteSets = (sets || []).filter(
    (s) =>
      !s.title?.startsWith('_Thư mục:') &&
      (s.folder_path === 'Note' || (s.folder_path && s.folder_path.startsWith('Note/')))
  );

  useEffect(() => {
    if (noteSets.length > 0) setSelectedSetId(noteSets[0].id);
  }, []);

  const hasExtraFields =
    vocab && ((vocab.hanviet && vocab.hanviet.trim()) || (vocab.hiragana && vocab.hiragana.trim()));

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (selectedSetId === 'new') {
        if (!noteSetName.trim()) {
          toast.warning('Nhập tên học phần Note!');
          setIsSaving(false);
          return;
        }
        let rawText;
        if (hasExtraFields) {
          rawText = `${vocab.word} | ${vocab.hanviet || ''} | ${vocab.hiragana || ''} | ${vocab.meaning}`;
        } else {
          rawText = `${vocab.word} | ${vocab.meaning}`;
        }
        await api.post('/vocabularies/bulk-import', {
          title: noteSetName.trim(),
          raw_text: rawText,
          folder_path: 'Note',
          language: vocab.language || 'ja',
        });
        toast.success('Đã tạo và lưu vào Note mới!');
      } else {
        await api.post('/vocabularies', {
          word: vocab.word,
          hanviet: vocab.hanviet || '',
          hiragana: vocab.hiragana || '',
          meaning: vocab.meaning,
          language: vocab.language || 'ja',
          set_id: selectedSetId,
        });
        toast.success('Đã thêm vào Note!');
      }
      onSaveSuccess();
      onClose();
    } catch (error) {
      toast.error('Lỗi khi lưu vào Note!');
    } finally {
      setIsSaving(false);
    }
  };

  if (!vocab) return null;

  return ReactDOM.createPortal(
    <motion.div
      className="set-sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
    >
      <motion.div
        className="set-sheet-panel"
        style={{ maxWidth: '420px', height: 'auto', maxHeight: '88vh' }}
        initial={window.innerWidth < 768 ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 12 }}
        animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={window.innerWidth < 768 ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.7 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="set-sheet-grabber d-md-none" />
        <div className="set-sheet-header">
          <div className="d-flex align-items-center gap-2">
            <span className="btn-icon-soft chip-primary" style={{ width: '34px', height: '34px' }}>
              <BookMarked size={16} />
            </span>
            <div>
              <h6 className="fw-bold mb-0 text-dark">Lưu vào Sổ tay (Note)</h6>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                Lưu nhanh từ vựng khó để ôn tập riêng
              </span>
            </div>
          </div>
          <button type="button" className="btn-icon-soft chip-slate" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="p-3 pt-2">
          <div className="bg-light p-3 rounded-3 mb-3 text-center border">
            <div className="fw-bold fs-5 text-dark">{vocab.word}</div>
            {vocab.hanviet && vocab.hanviet.trim() && (
              <div className="small fw-bold mt-1 text-primary">{vocab.hanviet}</div>
            )}
            {vocab.hiragana && vocab.hiragana.trim() && (
              <div className="small fw-bold text-info mt-1">{vocab.hiragana}</div>
            )}
            <div className="text-secondary mt-1 fw-semibold">{vocab.meaning}</div>
          </div>

          <form onSubmit={handleSave}>
            <div className="mb-3">
              <label className="form-label fw-bold text-muted small mb-1">CHỌN HỌC PHẦN NOTE</label>
              <select
                className="form-select bg-light border-0 fw-bold py-2"
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
              >
                {noteSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.vocab_count || 0} từ)
                  </option>
                ))}
                <option value="new">+ Tạo học phần Note mới</option>
              </select>
            </div>

            {selectedSetId === 'new' && (
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control bg-light border-0 fw-bold py-2"
                  placeholder="Tên học phần Note mới..."
                  value={noteSetName}
                  onChange={(e) => setNoteSetName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            )}

            <div className="d-flex gap-2 mt-3">
              <button
                type="button"
                className="btn btn-light btn-touch w-50 fw-bold"
                onClick={onClose}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-touch w-50 fw-bold text-white"
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export default SaveNoteModal;