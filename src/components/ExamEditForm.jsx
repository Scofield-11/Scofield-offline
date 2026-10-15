import React from 'react';
import { exportSingleItemToJson } from '../api/axiosConfig';
import { toast } from 'react-toastify';

function ExamEditForm({
  editingExamId,
  editTitle,
  setEditTitle,
  editQuestions,
  handleDeleteQuestion,
  handleUpdateQuestion,
  handleAddNewQuestionToEdit,
  setShowImportModal,
  handleSaveEdit,
  setEditingExamId,
}) {
  const handleExportCurrentExam = () => {
    if (!editingExamId) return;
    try {
      exportSingleItemToJson('exam', editingExamId);
      toast.success('Đã xuất file JSON cho đề thi này!');
    } catch (err) {
      toast.error('Lỗi xuất file JSON!');
    }
  };

  return (
    <div className="has-mobile-bottom-bar">
      {/* THANH GHIM ĐỈNH MÀN HÌNH */}
      <div className="mobile-sticky-top d-flex justify-content-between align-items-center">
        <button
          className="btn btn-light text-dark btn-mobile-chip"
          onClick={() => setEditingExamId(null)}
        >
          ← Thoát sửa
        </button>
        <span className="fw-bold text-primary">
          Sửa đề ({editQuestions.length} câu)
        </span>
        {editingExamId && (
          <button
            className="btn btn-light text-primary btn-mobile-chip"
            onClick={handleExportCurrentExam}
          >
            📦 Xuất JSON
          </button>
        )}
      </div>

      <div className="card shadow-sm border-0 mb-4 rounded-4">
        <div className="card-body bg-white p-3 p-md-4 rounded-4">
          <label className="fw-bold text-muted small mb-2">TÊN BÀI THI</label>
          <input
            className="form-control form-control-lg mb-4 fw-bold text-primary bg-light border-0"
            placeholder="Tên bài thi..."
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />

          {editQuestions.map((q, idx) => (
            <div
              key={idx}
              className="card mb-3 border shadow-sm rounded-4 overflow-hidden"
              style={{ transform: 'none' }}
            >
              <div className="card-header bg-light d-flex justify-content-between align-items-center py-2 px-3">
                <span className="fw-bold text-dark">Câu {idx + 1}</span>
                <button
                  className="btn btn-light text-danger btn-mobile-chip"
                  style={{ minHeight: '38px', padding: '4px 12px' }}
                  onClick={() => handleDeleteQuestion(idx)}
                >
                  🗑️ Xóa câu
                </button>
              </div>
              <div className="card-body p-3">
                <input
                  className="form-control mb-3 fw-bold"
                  placeholder="Nội dung câu hỏi..."
                  value={q.question}
                  onChange={(e) => handleUpdateQuestion(idx, 'question', e.target.value)}
                />
                <div className="row g-2 mb-3">
                  {[0, 1, 2, 3].map((optIdx) => (
                    <div className="col-12 col-md-6" key={optIdx}>
                      <div className="input-group">
                        <span className="input-group-text fw-bold bg-light">
                          Đ.án {optIdx + 1}
                        </span>
                        <input
                          className="form-control"
                          value={q.options[optIdx]}
                          onChange={(e) =>
                            handleUpdateQuestion(idx, `opt${optIdx + 1}`, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="d-flex align-items-center justify-content-between bg-light p-2 px-3 rounded-3">
                  <label className="fw-bold text-success mb-0">Đáp án đúng là ô số:</label>
                  <select
                    className="form-select w-auto border-success fw-bold"
                    value={q.correct_ans}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, 'correct_ans', parseInt(e.target.value, 10))
                    }
                  >
                    <option value={1}>Vị trí 1</option>
                    <option value={2}>Vị trí 2</option>
                    <option value={3}>Vị trí 3</option>
                    <option value={4}>Vị trí 4</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* THANH CÔNG CỤ GHIM ĐÁY MÀN HÌNH (MOBILE-BOTTOM-BAR) */}
      <div className="mobile-bottom-bar">
        <div className="container px-0" style={{ maxWidth: '900px' }}>
          <div className="d-flex gap-2">
            <button
              className="btn btn-light text-dark btn-mobile-chip flex-fill"
              onClick={handleAddNewQuestionToEdit}
            >
              ➕ Thêm câu
            </button>
            <button
              className="btn btn-light text-primary btn-mobile-chip flex-fill"
              onClick={() => setShowImportModal(true)}
            >
              📥 Dán nhanh
            </button>
            <button
              className="btn btn-success text-white btn-mobile-chip flex-grow-1"
              onClick={handleSaveEdit}
            >
              💾 Lưu cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamEditForm;