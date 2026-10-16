import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ChevronDown } from 'lucide-react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

const ACCORDION_TRANSITION = { duration: 0.24, ease: [0.22, 1, 0.36, 1] };

function AddVocabularyForm({ onAddSuccess, existingFolders = [], currentPath = '' }) {
  const [title, setTitle] = useState('');
  const [folderPath, setFolderPath] = useState(currentPath);
  const [bulkText, setBulkText] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [importMode, setImportMode] = useState('text');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState('ja');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFolderPath(currentPath);
  }, [currentPath]);

  const handleBulkImport = async () => {
    if (!title.trim()) return toast.warning('Vui lòng nhập tên học phần!');
    if (importMode === 'text' && !bulkText.trim()) return toast.warning('Vui lòng nhập danh sách từ vựng!');
    if (importMode === 'csv' && !csvFile) return toast.warning('Vui lòng chọn file CSV!');

    setIsLoading(true);
    try {
      let response;
      if (importMode === 'text') {
        response = await api.post('/vocabularies/bulk-import', {
          title: title.trim(),
          raw_text: bulkText,
          folder_path: folderPath.trim(),
          language,
        });
      } else {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('folder_path', folderPath.trim());
        formData.append('language', language);
        formData.append('file', csvFile);
        response = await api.post('/vocabularies/import-csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success(response.data.message);
      setTitle('');
      setBulkText('');
      setCsvFile(null);
      setIsExpanded(false);
      if (onAddSuccess) onAddSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra, kiểm tra lại định dạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files[0].name.endsWith('.csv')) setCsvFile(files[0]);
      else toast.error('Vui lòng chỉ tải lên file định dạng .csv');
    }
  };

  const jaPlaceholder = '男性 | NAM TÍNH | だんせい | đàn ông\n|  | けが | vết thương\n守ります | Bảo vệ, tuân thủ';
  const enPlaceholder = 'Desk | Cái bàn\nAccomplish | Hoàn thành, đạt được';

  return (
    <div className="card border-0 rounded-4 mb-3 overflow-hidden">
      <div
        className="card-header bg-white py-2 px-3 border-0 d-flex justify-content-between align-items-center rounded-4"
        style={{ cursor: 'pointer', minHeight: '48px' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="btn-icon-soft chip-primary" style={{ width: '30px', height: '30px', minHeight: '30px' }}>
            {isExpanded ? <Minus size={15} /> : <Plus size={15} />}
          </span>
          <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>Tạo học phần mới</span>
        </div>
        <span className="btn-mobile-chip chip-slate">
          <span>{isExpanded ? 'Thu gọn' : 'Mở'}</span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="d-inline-flex align-items-center"
          >
            <ChevronDown size={14} />
          </motion.span>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ACCORDION_TRANSITION}
            style={{ overflow: 'hidden' }}
          >
            <div className="card-body p-3 border-top">
              <input
                type="text"
                className="form-control mb-3 fw-bold text-dark bg-light border-0"
                placeholder="Tên học phần (VD: Bài 1 - Minna no Nihongo)..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <label className="text-muted small fw-bold mb-1">THƯ MỤC LƯU TRỮ</label>
                  <select
                    className="form-select bg-light border-0 fw-semibold text-dark"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                  >
                    <option value="">📁 Thư mục gốc (Mặc định)</option>
                    {existingFolders.map((folder) => (
                      <option key={folder} value={folder}>📁 {folder}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="text-muted small fw-bold mb-1">NGÔN NGỮ</label>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-mobile-chip flex-fill ${language === 'ja' ? 'btn-primary text-white' : 'chip-slate'}`}
                      onClick={() => setLanguage('ja')}
                    >
                      🇯🇵 Tiếng Nhật
                    </button>
                    <button
                      type="button"
                      className={`btn btn-mobile-chip flex-fill ${language === 'en' ? 'btn-primary text-white' : 'chip-slate'}`}
                      onClick={() => setLanguage('en')}
                    >
                      🇬🇧 Tiếng Anh
                    </button>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 mb-3">
                <button
                  type="button"
                  className={`btn btn-mobile-chip flex-fill ${importMode === 'text' ? 'chip-primary' : 'chip-slate'}`}
                  onClick={() => setImportMode('text')}
                >
                  📝 Dán văn bản
                </button>
                <button
                  type="button"
                  className={`btn btn-mobile-chip flex-fill ${importMode === 'csv' ? 'chip-primary' : 'chip-slate'}`}
                  onClick={() => setImportMode('csv')}
                >
                  📊 Tải file CSV
                </button>
              </div>

              {importMode === 'text' ? (
                <div className="mb-3">
                  <label className="text-muted small fw-bold mb-1">
                    {language === 'ja'
                      ? 'ĐỊNH DẠNG: Chữ Hán | Hán Việt | Cách đọc | Nghĩa (hoặc Từ | Nghĩa)'
                      : 'ĐỊNH DẠNG: Từ vựng | Ý nghĩa'}
                  </label>
                  <textarea
                    className="form-control bg-light border-0 p-3"
                    rows="5"
                    placeholder={language === 'ja' ? jaPlaceholder : enPlaceholder}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    style={{ lineHeight: '1.5' }}
                  ></textarea>
                </div>
              ) : (
                <div className="mb-3">
                  <div
                    className={`d-flex flex-column align-items-center justify-content-center p-4 rounded-4 ${
                      isDragging ? 'bg-primary text-white' : 'bg-light text-muted'
                    }`}
                    style={{ border: '2px dashed var(--surface-border)', cursor: 'pointer', minHeight: '140px' }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="fs-2 mb-1">{csvFile ? '📄' : '📥'}</span>
                    <span className="fw-bold">{csvFile ? csvFile.name : 'Chạm để chọn file .CSV'}</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="d-none"
                      accept=".csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) setCsvFile(e.target.files[0]);
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary btn-touch w-100"
                onClick={handleBulkImport}
                disabled={isLoading}
              >
                {isLoading ? 'Đang xử lý...' : '💾 Lưu học phần mới'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AddVocabularyForm;