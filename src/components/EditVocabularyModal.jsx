import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Edit3, X } from 'lucide-react';
import api from '../api/axiosConfig';

function EditVocabularyModal({ vocab, onClose, onUpdateSuccess }) {
  const [word, setWord] = useState(vocab.word || '');
  const [meaning, setMeaning] = useState(vocab.meaning || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) {
      setError('Vui lòng nhập đầy đủ từ vựng và ý nghĩa');
      return;
    }

    try {
      setSaving(true);
      const res = await api.put(`/vocabularies/${vocab.id}`, {
        word: word.trim(),
        meaning: meaning.trim(),
      });
      onUpdateSuccess(res.data);
    } catch (err) {
      setError('Có lỗi xảy ra khi lưu thay đổi');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="set-sheet-backdrop" style={{ zIndex: 3200 }} onClick={onClose}>
      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
        className="set-sheet-panel"
        style={{ maxWidth: '440px', height: 'auto', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="set-sheet-grabber d-md-none" />
        <div className="set-sheet-header">
          <div className="d-flex align-items-center gap-2">
            <span className="btn-icon-soft chip-primary" style={{ width: '34px', height: '34px' }}>
              <Edit3 size={16} />
            </span>
            <div>
              <h6 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>Sửa từ vựng</h6>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Cập nhật từ vựng và ý nghĩa</span>
            </div>
          </div>
          <button type="button" className="btn-icon-soft chip-slate" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-3 pt-2">
          <div className="mb-3">
            <label className="form-label small fw-bold text-muted mb-1">TỪ VỰNG</label>
            <input
              type="text"
              className="form-control fw-bold py-2.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--surface-border)',
                color: 'var(--text-main)',
              }}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Nhập từ vựng..."
              required
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-bold text-muted mb-1">Ý NGHĨA</label>
            <input
              type="text"
              className="form-control fw-semibold py-2.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--surface-border)',
                color: 'var(--text-main)',
              }}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="Nhập ý nghĩa..."
              required
            />
          </div>

          {error && <p className="text-danger small fw-bold mb-2">{error}</p>}

          <div className="d-flex gap-2 mt-4">
            <button type="button" className="btn btn-light btn-touch w-50 fw-bold" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-touch w-50 fw-bold text-white shadow-sm"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

export default EditVocabularyModal;
