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
      {/* THANH NHẬP / XUẤT JSON ĐỀ THI GỌN TRÊN 1 HÀNG */}
      <div className="card border-0 rounded-4 p-2 px-3 mb-3 bg-white">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span className="fw-bold text-dark small">💾 Quản lý file JSON Đề thi</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-mobile-chip chip-primary"
              onClick={() => jsonInputRef.current?.click()}
            >
              📂 Nhập JSON
            </button>
            <button
              type="button"
              className="btn btn-mobile-chip btn-primary text-white"
              onClick={() => {
                exportAllDataToJson();
                toast.success('Đã xuất file JSON Backup!');
              }}
            >
              ⬇️ Backup Tất cả
            </button>
          </div>
        </div>
        <input
          type="file"
          ref={jsonInputRef}
          className="d-none"
          accept=".json,application/json"
          onChange={handleImportJson}
        />
      </div>

      {/* FORM TẠO ĐỀ THI MỚI (COLLAPSE GỌN GÀNG) */}
      <div className="card border-0 rounded-4 mb-3 overflow-hidden">
        <div
          className="card-header bg-white py-3 px-3 border-0 d-flex justify-content-between align-items-center"
          style={{ cursor: 'pointer' }}
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="btn-icon-soft chip-primary">{isFormExpanded ? '➖' : '➕'}</span>
            <span className="fw-bold text-dark">Tạo đề thi trắc nghiệm mới</span>
          </div>
          <span className="btn-mobile-chip chip-slate">
            {isFormExpanded ? 'Thu gọn' : 'Mở form'}
          </span>
        </div>

        {isFormExpanded && (
          <div className="card-body p-3 border-top bg-white">
            <input
              className="form-control mb-2 fw-bold bg-light border-0"
              placeholder="Tên đề thi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="form-control mb-3 bg-light border-0"
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
        <h5 className="mb-0 fw-bold text-dark">Danh sách đề thi</h5>
        <div className="form-check form-switch bg-white px-3 py-1 rounded-pill border d-flex align-items-center gap-2">
          <input
            className="form-check-input m-0"
            type="checkbox"
            id="switch-instant-global"
            checked={isInstantFeedback}
            onChange={() => setIsInstantFeedback(!isInstantFeedback)}
          />
          <label
            className="form-check-label text-primary fw-semibold small m-0"
            htmlFor="switch-instant-global"
          >
            Hiện đáp án ngay
          </label>
        </div>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          title="Chưa có đề thi"
          message="Hãy bấm Tạo đề thi mới hoặc Nhập JSON ở phía trên nhé."
        />
      ) : (
        <div className="row g-3 mb-4">
          {exams.map((exam) => (
            <div className="col-12 col-md-6" key={exam.id}>
              <div className="card border-0 h-100 rounded-4 p-3">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                  <div>
                    <h6 className="fw-bold text-dark mb-1">{exam.title}</h6>
                    <span className="badge bg-light text-secondary border rounded-pill">
                      {exam.questions ? exam.questions.length : 0} câu hỏi
                    </span>
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      className="btn-icon-soft chip-slate"
                      onClick={() => handleEditClick(exam.id)}
                      title="Sửa đề"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon-soft chip-primary"
                      onClick={() => handleExportExamJson(exam.id, exam.title)}
                      title="Xuất JSON"
                    >
                      📦
                    </button>
                    <button
                      className="btn-icon-soft chip-danger"
                      onClick={() => handleDeleteExam(exam.id)}
                      title="Xóa đề"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-touch w-100 mt-auto"
                  onClick={() => startExam(exam.id)}
                >
                  ▶️ Bắt đầu làm bài
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default ExamList;