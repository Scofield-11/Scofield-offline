import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

function SaveNoteModal({ vocab, sets, onClose, onSaveSuccess }) {
  const [selectedSetId, setSelectedSetId] = useState('new');
  const [noteSetName, setNoteSetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tìm tất cả các học phần nằm trong thư mục Note
  const noteSets = sets.filter(s => s.folder_path === 'Note' || (s.folder_path && s.folder_path.startsWith('Note/')));

  useEffect(() => {
    if (noteSets.length > 0) setSelectedSetId(noteSets[0].id);
  }, []);

  // Kiểm tra xem vocab có dữ liệu Hán Việt/Cách đọc không
  const hasExtraFields = vocab && ((vocab.hanviet && vocab.hanviet.trim()) || (vocab.hiragana && vocab.hiragana.trim()));

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (selectedSetId === 'new') {
        if (!noteSetName.trim()) { toast.warning("Nhập tên học phần Note!"); setIsSaving(false); return; }
        // Tạo học phần mới và nạp luôn từ vựng này vào
        let rawText;
        if (hasExtraFields) {
          rawText = `${vocab.word} | ${vocab.hanviet || ''} | ${vocab.hiragana || ''} | ${vocab.meaning}`;
        } else {
          rawText = `${vocab.word} | ${vocab.meaning}`;
        }
        await api.post("/vocabularies/bulk-import", {
          title: noteSetName.trim(),
          raw_text: rawText,
          folder_path: "Note",
          language: vocab.language || "ja"
        });
        toast.success("Đã tạo và lưu vào Note mới!");
      } else {
        // Lưu vào học phần Note đã có
        await api.post('/vocabularies', {
          word: vocab.word,
          hanviet: vocab.hanviet || "",
          hiragana: vocab.hiragana || "",
          meaning: vocab.meaning,
          language: vocab.language || "ja",
          set_id: selectedSetId
        });
        toast.success("Đã thêm vào Note!");
      }
      onSaveSuccess();
      onClose();
    } catch (error) {
      toast.error("Lỗi khi lưu vào Note!");
    } finally {
      setIsSaving(false);
    }
  };

  if (!vocab) return null;

  return (
    <div className="modal d-flex align-items-center justify-content-center fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="card border-0 shadow-lg rounded-4 p-4" style={{ width: '90%', maxWidth: '400px' }}>
        <h5 className="fw-bold mb-3 text-primary">📓 Lưu vào Note</h5>
        <div className="bg-light p-3 rounded-3 mb-4 text-center shadow-sm">
          <div className="fw-bold fs-5 text-dark">{vocab.word}</div>
          {vocab.hanviet && vocab.hanviet.trim() && (
            <div className="small fw-bold mt-1 text-primary">{vocab.hanviet}</div>
          )}
          {vocab.hiragana && vocab.hiragana.trim() && (
            <div className="small fw-bold text-info mt-1">{vocab.hiragana}</div>
          )}
          <div className="text-primary mt-1 fw-bold">{vocab.meaning}</div>
        </div>
        
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label fw-bold text-muted small">Chọn học phần Note:</label>
            <select className="form-select bg-light border-0 fw-bold shadow-sm" value={selectedSetId} onChange={e => setSelectedSetId(e.target.value)}>
              {noteSets.map(s => <option key={s.id} value={s.id}>{s.title} ({s.vocab_count || 0} từ)</option>)}
              <option value="new">+ Tạo học phần Note mới</option>
            </select>
          </div>

          {selectedSetId === 'new' && (
            <div className="mb-4">
              <input type="text" className="form-control bg-light border-0 shadow-sm fw-bold" placeholder="Tên học phần Note mới..." value={noteSetName} onChange={e => setNoteSetName(e.target.value)} autoFocus required />
            </div>
          )}

          <div className="d-flex gap-2 mt-4">
            <button type="button" className="btn btn-secondary w-50 fw-bold rounded-3" onClick={onClose} disabled={isSaving}>Hủy</button>
            <button type="submit" className="btn btn-primary w-50 fw-bold text-white rounded-3" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu lại'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SaveNoteModal;