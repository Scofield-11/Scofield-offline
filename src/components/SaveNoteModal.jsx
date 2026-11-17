import React, { useState } from 'react';
import AccessibleModal from './AccessibleModal';
import api, { importDataFromJson } from '../api/axiosConfig';
import { snapshotVocab } from '../utils/vocabHelper';
import { toast } from 'react-toastify';

function SaveNoteModal({ vocab, sets, onClose, onSaveSuccess }) {
  const [noteSetName, setNoteSetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tìm tất cả các học phần nằm trong thư mục Note (loại bỏ các bản ghi đánh dấu thư mục ẩn)
  const noteSets = (sets || []).filter(
    (s) =>
      !s.title?.startsWith('_Thư mục:') &&
      s.type !== 'kanji' && (s.language || 'ja') === (vocab?.language || 'ja') &&
      (s.folder_path === 'Note' || (s.folder_path && s.folder_path.startsWith('Note/')))
  );

  const [selectedSetId, setSelectedSetId] = useState(() => noteSets[0]?.id || 'new');

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
        await importDataFromJson({
          title: noteSetName.trim(),
          vocabularies: [snapshotVocab(vocab)],
          folder_path: 'Note',
          language: vocab.language || 'ja',
        });
        toast.success('Đã tạo và lưu vào Note mới!');
      } else {
        await api.post('/vocabularies', {
          ...snapshotVocab(vocab),
          set_id: selectedSetId,
        });
        toast.success('Đã thêm vào Note!');
      }
      onSaveSuccess();
      onClose();
    } catch {
      toast.error('Lỗi khi lưu vào Note!');
    } finally {
      setIsSaving(false);
    }
  };

  if (!vocab) return null;

  return (
    <AccessibleModal title="Lưu vào Sổ tay (Note)" onClose={onClose} className="note-vocab-modal">
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
              <label htmlFor="note-set" className="form-label fw-bold text-muted small mb-1">CHỌN HỌC PHẦN NOTE</label>
              <select id="note-set"
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
                <label htmlFor="note-name" className="form-label">Tên học phần Note mới</label>
                <input id="note-name"
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
    </AccessibleModal>
  );
}

export default SaveNoteModal;
