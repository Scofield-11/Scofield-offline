import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import api, {
  exportAllDataToJson,
  exportSingleItemToJson,
  importDataFromJson,
} from '../api/axiosConfig';
import EmptyState from './EmptyState';

function ExamList({
  exams,
  fetchExamsList,
  startExam,
  handleEditClick,
  handleDeleteExam,
  isInstantFeedback,
  setIsInstantFeedback,
}) {
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const jsonInputRef = useRef(null);

  const handleCreate = async () => {
    if (!title.trim() || !rawText.trim())
      return toast.warning('Vui lòng nhập đủ tên và nội dung bài test!');
    try {
      await api.post('/exams/import', { title, raw_text: rawText });
      toast.success('Tạo bài test thành công!');
      setRawText('');
      setTitle('');
      setIsFormExpanded(false);
      fetchExamsList();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Lỗi import. Vui lòng kiểm tra lại định dạng dấu |'
      );
    }
  };

  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { addedExams, addedSets } = await importDataFromJson(file, 'merge');
      toast.success(`Đã nhập JSON: +${addedExams} đề thi, +${addedSets} học phần!`);
      fetchExamsList();
    } catch (err) {
      toast.error(err.message || 'Lỗi đọc file JSON!');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportExamJson = (examId, examTitle) => {
    try {
      exportSingleItemToJson('exam', examId);
      toast.success(`Đã xuất JSON: ${examTitle}`);
    } catch (err) {
      toast.error('Lỗi xuất JSON đề thi!');
    }
  };

  return (
    <>
      {/* NHẬP / XUẤT JSON LƯỚI 2 CỘT */}
      <div className="card shadow-sm p-3 mb-3 border-0 bg-white rounded-4">
        <div className="action-grid-2col">
          <button
            type="button"
            className="btn btn-light text-primary btn-mobile-chip"
            onClick={() => jsonInputRef.current?.click()}
          >
            <span>📂</span> <span>Nhập JSON Đề thi</span>
          </button>
          <button
            type="button"
            className="btn btn-primary text-white btn-mobile-chip"
            onClick={() => {
              exportAllDataToJson();
              toast.success('Đã xuất file JSON Backup!');
            }}
          >
            <span>⬇️</span> <span>Xuất Backup JSON</span>
          </button>
        </div>
        <input
          type="file"
          ref={jsonInputRef}
          className="d-none"
          accept=".json,application/json"
          onChange={handleImportJson}
        />
      </div>

      {/* KHUNG TẠO ĐỀ THI MỚI ĐÓNG/MỞ (COLLAPSE/TOGGLE) GỌN GÀNG TRÊN MOBILE */}
      <div className="card shadow-sm mb-4 border-0 rounded-4 overflow-hidden">
        <div
          className="card-header bg-white py-3 px-4 border-0 d-flex justify-content-between align-items-center"
          style={{ cursor: 'pointer', minHeight: '54px' }}
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <h5 className="mb-0 fw-bold text-primary">
            {isFormExpanded ? '➖' : '➕'} Tạo bài kiểm tra mới (Dán nhanh)
          </h5>
          <span className="badge bg-light text-primary border rounded-pill px-3 py-2">
            {isFormExpanded ? 'Thu gọn' : 'Mở form'}
          </span>
        </div>

        {isFormExpanded && (
          <div className="card-body p-3 p-md-4 border-top bg-light">
            <input
              className="form-control mb-3 fw-bold"
              placeholder="Tên bài kiểm tra..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="form-control mb-3"
              rows="4"
              placeholder="Câu hỏi | Đáp án 1 | Đáp án 2 | Đáp án 3 | Đáp án 4 | 1"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            ></textarea>
            <button className="btn btn-primary btn-touch w-100" onClick={handleCreate}>
              💾 Lưu Đề Thi Mới
            </button>
          </div>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0 fw-bold text-dark">Danh sách bài kiểm tra</h4>
        <div className="form-check form-switch bg-white px-3 py-2 rounded-pill shadow-sm border">
          <input
            className="form-check-input"
            type="checkbox"
            id="switch-instant-global"
            checked={isInstantFeedback}
            onChange={() => setIsInstantFeedback(!isInstantFeedback)}
          />
          <label
            className="form-check-label text-primary fw-bold ms-1"
            htmlFor="switch-instant-global"
            style={{ fontSize: '0.9rem' }}
          >
            Hiện đáp án ngay
          </label>
        </div>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          title="Chưa có bài kiểm tra"
          message="Hãy bấm Tạo bài kiểm tra mới hoặc Nhập JSON ở phía trên nhé."
        />
      ) : (
        <div className="row g-3 mb-5">
          {exams.map((exam) => (
            <div className="col-md-6" key={exam.id}>
              <div className="card shadow-sm border-0 h-100 rounded-4">
                <div className="card-body d-flex flex-column justify-content-between p-3 p-md-4">
                  <div>
                    <h5 className="card-title text-primary fw-bold mb-1">{exam.title}</h5>
                    <span className="badge bg-light text-muted border rounded-pill">
                      {exam.questions ? exam.questions.length : 0} câu hỏi
                    </span>
                  </div>

                  <div className="mt-3">
                    <button
                      className="btn btn-primary btn-touch w-100 mb-2 shadow-sm"
                      onClick={() => startExam(exam.id)}
                    >
                      ▶️ Bắt đầu làm bài
                    </button>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-light text-dark btn-mobile-chip flex-fill"
                        onClick={() => handleEditClick(exam.id)}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        className="btn btn-light text-primary btn-mobile-chip flex-fill"
                        onClick={() => handleExportExamJson(exam.id, exam.title)}
                      >
                        📦 JSON
                      </button>
                      <button
                        className="btn btn-light text-danger btn-mobile-chip flex-fill"
                        onClick={() => handleDeleteExam(exam.id)}
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default ExamList;