import React, { useState, useContext, useEffect, useRef } from 'react';
import api, {
  exportAllDataToJson,
  exportSingleItemToJson,
  importDataFromJson,
} from '../api/axiosConfig';
import AddVocabularyForm from './AddVocabularyForm';
import SaveNoteModal from './SaveNoteModal';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';
import { motion } from 'framer-motion';

function VocabularyList() {
  const { sets, setSets, loading, fetchSets, hasMore } = useContext(VocabContext);

  const [expandedSetId, setExpandedSetId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [currentPath, setCurrentPath] = useState('');
  const [customFolders, setCustomFolders] = useState([]);
  const jsonInputRef = useRef(null);

  const [draggedSetId, setDraggedSetId] = useState(null);
  const [dragOverSetId, setDragOverSetId] = useState(null);
  const [customOrder, setCustomOrder] = useState(
    () => JSON.parse(localStorage.getItem('scofieldSetOrder')) || []
  );

  const [sortOption, setSortOption] = useState(() => {
    const saved = localStorage.getItem('scofieldSortOption');
    if (saved) return saved;
    const order = JSON.parse(localStorage.getItem('scofieldSetOrder')) || [];
    return order.length > 0 ? 'custom' : 'newest';
  });

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  useEffect(() => {
    localStorage.setItem('scofieldSortOption', sortOption);
  }, [sortOption]);

  const [noteModalVocab, setNoteModalVocab] = useState(null);
  const [testHistories, setTestHistories] = useState([]);

  useEffect(() => {
    api
      .get('/test-history?skip=0&limit=50')
      .then((res) => setTestHistories(res.data))
      .catch(console.error);
  }, [sets]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const calculateProgress = (setId, vocabCount) => {
    if (!vocabCount || vocabCount === 0) return 0;
    const validTests = testHistories.filter(
      (h) => Number(h.setId) === Number(setId) && Number(h.total) === Number(vocabCount)
    );
    if (validTests.length === 0) return 0;
    const maxScore = Math.max(...validTests.map((h) => h.score));
    return Math.round((maxScore / vocabCount) * 100);
  };

  let displaySets = [];
  let displayFolders = [];

  const allExistingFolders = Array.from(
    new Set([...sets.map((s) => s.folder_path).filter((p) => p), ...customFolders])
  ).sort();

  const currentLevelSets = [];
  const subfolders = new Set();

  const checkPathForFolders = (path) => {
    if (!path) return;
    if (path === currentPath) {
      return;
    } else if (path.startsWith(currentPath ? currentPath + '/' : '')) {
      const remainingPath = currentPath ? path.substring(currentPath.length + 1) : path;
      const nextFolder = remainingPath.split('/')[0];
      if (nextFolder) subfolders.add(nextFolder);
    }
  };

  sets.forEach((set) => {
    const path = (set.folder_path || '').trim();
    if (path === currentPath) currentLevelSets.push(set);
    checkPathForFolders(path);
  });

  customFolders.forEach((path) => checkPathForFolders(path));
  displayFolders = Array.from(subfolders);

  displaySets = currentLevelSets
    .filter((set) => !set.title.startsWith('_Thư mục:'))
    .map((set) => {
      let filteredVocabs = set.vocabularies ? [...set.vocabularies] : [];
      if (sortOption === 'az') filteredVocabs.sort((a, b) => a.word.localeCompare(b.word));
      else if (sortOption === 'za') filteredVocabs.sort((a, b) => b.word.localeCompare(a.word));
      else if (sortOption === 'oldest') filteredVocabs.sort((a, b) => a.id - b.id);
      else filteredVocabs.sort((a, b) => b.id - a.id);

      return {
        ...set,
        vocabularies: filteredVocabs,
        progress: calculateProgress(set.id, set.vocab_count || filteredVocabs.length),
      };
    });

  displaySets.sort((a, b) => {
    if (sortOption === 'custom') {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return b.id - a.id;
    } else if (sortOption === 'oldest') {
      return a.id - b.id;
    } else if (sortOption === 'az') {
      return a.title.localeCompare(b.title);
    } else if (sortOption === 'za') {
      return b.title.localeCompare(a.title);
    } else {
      return b.id - a.id;
    }
  });

  const [editingVocabId, setEditingVocabId] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editHanviet, setEditHanviet] = useState('');
  const [editHiragana, setEditHiragana] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [addingToSetId, setAddingToSetId] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [newHanviet, setNewHanviet] = useState('');
  const [newHiragana, setNewHiragana] = useState('');
  const [newMeaning, setNewMeaning] = useState('');

  const toggleSet = async (setId) => {
    if (viewMode === 'grid') setViewMode('list');
    if (expandedSetId === setId) {
      setExpandedSetId(null);
      setAddingToSetId(null);
      return;
    }

    const targetSet = sets.find((s) => s.id === setId);
    if (
      targetSet &&
      targetSet.vocabularies &&
      targetSet.vocabularies.length === 0 &&
      targetSet.vocab_count > 0
    ) {
      try {
        const res = await api.get(`/sets/${setId}`);
        setSets((prev) =>
          prev.map((s) => (s.id === setId ? { ...s, vocabularies: res.data.vocabularies } : s))
        );
      } catch (error) {
        toast.error('Lỗi tải chi tiết học phần!');
      }
    }

    setExpandedSetId(setId);
    setAddingToSetId(null);
  };

  const handleCreateFolder = async () => {
    const newFolder = window.prompt('Nhập tên thư mục con mới:');
    if (newFolder && newFolder.trim()) {
      const folderName = newFolder.trim();
      const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      if (!customFolders.includes(fullPath) && !allExistingFolders.includes(fullPath)) {
        try {
          await api.post('/vocabularies/bulk-import', {
            title: `_Thư mục: ${folderName}_`,
            raw_text: ' ',
            folder_path: fullPath,
          });
          setCustomFolders([...customFolders, fullPath]);
          toast.success(`Đã tạo thư mục: ${folderName}`);
          fetchSets(false, true);
        } catch (error) {
          toast.error('Lỗi khi tạo thư mục!');
        }
      } else {
        toast.warning('Thư mục này đã tồn tại!');
      }
    }
  };

  const handleDeleteFolder = async (e, folderName) => {
    e.stopPropagation();
    const targetPath = currentPath ? `${currentPath}/${folderName}` : folderName;

    if (
      window.confirm(
        `Xóa thư mục "${folderName}" sẽ xóa TOÀN BỘ các học phần bên trong. Chắc chắn chứ?`
      )
    ) {
      try {
        const setsToDelete = sets.filter(
          (s) =>
            s.folder_path === targetPath ||
            (s.folder_path && s.folder_path.startsWith(targetPath + '/'))
        );
        await Promise.all(setsToDelete.map((s) => api.delete(`/sets/${s.id}`)));
        setCustomFolders((prev) =>
          prev.filter((p) => p !== targetPath && !p.startsWith(targetPath + '/'))
        );
        toast.success(`Đã xóa thư mục: ${folderName}`);
        fetchSets(false, true);
      } catch (error) {
        toast.error('Có lỗi xảy ra khi xóa thư mục!');
      }
    }
  };

  const handleDeleteSet = async (e, setId, setTitle) => {
    e.stopPropagation();
    if (window.confirm(`Xóa toàn bộ học phần "${setTitle}"?`)) {
      try {
        await api.delete(`/sets/${setId}`);
        toast.success('Đã xóa học phần!');
        fetchSets(false, true);
      } catch (error) {
        toast.error('Xóa thất bại!');
      }
    }
  };

  const refreshSet = async (setId) => {
    try {
      const res = await api.get(`/sets/${setId}`);
      setSets((prev) =>
        prev.map((s) =>
          s.id === setId
            ? {
                ...s,
                vocabularies: res.data.vocabularies,
                vocab_count: res.data.vocabularies?.length || 0,
              }
            : s
        )
      );
    } catch (error) {
      console.error('Lỗi refresh set', error);
    }
  };

  const handleDeleteVocab = async (vocabId, setId) => {
    if (window.confirm('Xóa từ này?')) {
      try {
        await api.delete(`/vocabularies/${vocabId}`);
        toast.success('Đã xóa từ vựng!');
        refreshSet(setId);
      } catch (error) {
        toast.error('Lỗi xóa từ vựng');
      }
    }
  };

  const handleEditClick = (vocab) => {
    setAddingToSetId(null);
    setEditingVocabId(vocab.id);
    setEditWord(vocab.word);
    setEditHanviet(vocab.hanviet || '');
    setEditHiragana(vocab.hiragana || '');
    setEditMeaning(vocab.meaning);
  };

  const handleSaveEdit = async (vocabId, setId) => {
    try {
      await api.put(`/vocabularies/${vocabId}`, {
        word: editWord,
        hanviet: editHanviet,
        hiragana: editHiragana,
        meaning: editMeaning,
      });
      setEditingVocabId(null);
      toast.success('Cập nhật thành công!');
      refreshSet(setId);
    } catch (error) {
      toast.error('Lỗi cập nhật');
    }
  };

  const handleAddClick = (setId) => {
    setEditingVocabId(null);
    setAddingToSetId(setId);
    setNewWord('');
    setNewHanviet('');
    setNewHiragana('');
    setNewMeaning('');
  };

  const handleSaveNew = async (setId) => {
    if (!newWord.trim() || !newMeaning.trim()) return toast.warning('Nhập đủ thông tin!');
    try {
      await api.post('/vocabularies', {
        word: newWord.trim(),
        hanviet: newHanviet.trim(),
        hiragana: newHiragana.trim(),
        meaning: newMeaning.trim(),
        set_id: setId,
      });
      toast.success('Đã thêm từ vựng mới!');
      setAddingToSetId(null);
      refreshSet(setId);
    } catch (error) {
      toast.error('Lỗi thêm từ vựng!');
    }
  };

  const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id.toString());
    setTimeout(() => setDraggedSetId(id), 0);
  };

  const handleDrag = (e) => {
    const threshold = 120;
    const speed = 25;
    if (e.clientY === 0) return;
    if (e.clientY < threshold) window.scrollBy(0, -speed);
    else if (window.innerHeight - e.clientY < threshold) window.scrollBy(0, speed);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSetId !== targetId) setDragOverSetId(targetId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverSetId(null);
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedIdStr) {
      setDraggedSetId(null);
      return;
    }

    const draggedId = parseInt(draggedIdStr, 10);
    if (draggedId === targetId) {
      setDraggedSetId(null);
      return;
    }

    const currentIds = displaySets.map((s) => s.id);
    const draggedIdx = currentIds.indexOf(draggedId);
    const targetIdx = currentIds.indexOf(targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newOrderedIds = [...currentIds];
      newOrderedIds.splice(draggedIdx, 1);
      newOrderedIds.splice(targetIdx, 0, draggedId);
      const mergedOrder = [...new Set([...newOrderedIds, ...customOrder])];
      setCustomOrder(mergedOrder);
      localStorage.setItem('scofieldSetOrder', JSON.stringify(mergedOrder));
      setSortOption('custom');
    }
    setDraggedSetId(null);
  };

  const handleDragEnd = () => {
    setDraggedSetId(null);
    setDragOverSetId(null);
  };

  const handleDownloadSet = async (e, set, format) => {
    e.stopPropagation();

    if (format === 'json') {
      try {
        exportSingleItemToJson('set', set.id);
        toast.success(`Đã xuất JSON: ${set.title}`);
      } catch (err) {
        toast.error(err.message || 'Lỗi xuất JSON!');
      }
      return;
    }

    let vocabsToExport = set.vocabularies;
    if (!vocabsToExport || vocabsToExport.length === 0) {
      try {
        const res = await api.get(`/sets/${set.id}`);
        vocabsToExport = res.data.vocabularies;
      } catch (error) {
        toast.error('Lỗi tải dữ liệu để xuất file!');
        return;
      }
    }

    if (!vocabsToExport || vocabsToExport.length === 0) {
      toast.warning('Học phần này chưa có từ vựng!');
      return;
    }

    const hasFourCols = vocabsToExport.some(
      (v) => (v.hanviet && v.hanviet.trim() !== '') || (v.hiragana && v.hiragana.trim() !== '')
    );

    let content = '';
    const filename = `${set.title.replace(/[/\\?%*:|"<>]/g, '-')}.${format}`;

    if (format === 'txt') {
      if (hasFourCols) {
        content = vocabsToExport
          .map((v) => `${v.word} | ${v.hanviet || ''} | ${v.hiragana || ''} | ${v.meaning}`)
          .join('\n');
      } else {
        content = vocabsToExport.map((v) => `${v.word} | ${v.meaning}`).join('\n');
      }
    } else if (format === 'csv') {
      if (hasFourCols) {
        content =
          '\uFEFF' +
          'Chữ Hán/Từ vựng,Hán Việt,Cách đọc,Ý nghĩa\n' +
          vocabsToExport
            .map(
              (v) =>
                `"${(v.word || '').replace(/"/g, '""')}","${(v.hanviet || '').replace(
                  /"/g,
                  '""'
                )}","${(v.hiragana || '').replace(/"/g, '""')}","${(v.meaning || '').replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join('\n');
      } else {
        content =
          '\uFEFF' +
          'Từ vựng,Ý nghĩa\n' +
          vocabsToExport
            .map((v) => `"${v.word.replace(/"/g, '""')}","${v.meaning.replace(/"/g, '""')}"`)
            .join('\n');
      }
    }

    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Xử lý Nhập / Xuất JSON toàn bộ
  const handleBackupAllJson = () => {
    try {
      exportAllDataToJson();
      toast.success('Đã tải xuống file JSON sao lưu toàn bộ!');
    } catch (err) {
      toast.error('Lỗi khi xuất file JSON!');
    }
  };

  const handleImportJsonChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { addedSets, addedVocabs, addedExams } = await importDataFromJson(file, 'merge');
      toast.success(
        `Nhập JSON thành công: +${addedSets} học phần (${addedVocabs} từ), +${addedExams} đề thi!`
      );
      fetchSets(false, true);
    } catch (err) {
      toast.error(err.message || 'File JSON không đúng định dạng!');
    } finally {
      e.target.value = '';
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="container-fluid mt-3 mx-auto" style={{ maxWidth: '1000px' }}>
      {/* KHUNG QUẢN LÝ DỮ LIỆU OFFLINE (NHẬP / XUẤT JSON LƯỚI 2 CỘT) */}
      <div className="card shadow-sm border-0 rounded-4 p-3 p-md-4 mb-4 bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold m-0 text-dark d-flex align-items-center gap-2">
            <span>💾</span> Dữ liệu Offline (JSON Backup & Restore)
          </h6>
          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-1">
            100% Local
          </span>
        </div>
        <div className="action-grid-2col">
          <button
            type="button"
            className="btn btn-light text-primary btn-mobile-chip"
            onClick={() => jsonInputRef.current?.click()}
          >
            <span>📂</span> <span>Nhập JSON</span>
          </button>
          <button
            type="button"
            className="btn btn-primary text-white btn-mobile-chip"
            onClick={handleBackupAllJson}
          >
            <span>⬇️</span> <span>Xuất JSON (Full)</span>
          </button>
        </div>
        <input
          type="file"
          ref={jsonInputRef}
          className="d-none"
          accept=".json,application/json"
          onChange={handleImportJsonChange}
        />
      </div>

      <div id="add-vocab-section">
        <AddVocabularyForm
          onAddSuccess={() => fetchSets(false, true)}
          existingFolders={allExistingFolders}
          currentPath={currentPath}
        />
      </div>

      {noteModalVocab && (
        <SaveNoteModal
          vocab={noteModalVocab}
          sets={sets}
          onClose={() => setNoteModalVocab(null)}
          onSaveSuccess={() => fetchSets(false, true)}
        />
      )}

      {/* TIÊU ĐỀ & LỌC */}
      <div className="d-flex flex-column flex-md-row gap-3 mb-4 fade-in-slide align-items-md-center justify-content-between">
        <h3 className="fw-bold m-0 text-primary">Thư viện của bạn</h3>
        <div className="d-flex flex-wrap flex-md-nowrap gap-2 justify-content-between justify-content-md-end">
          <select
            className="form-select bg-white border-0 shadow-sm rounded-pill fw-bold text-muted custom-select-fix flex-grow-1"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{ minHeight: '50px', minWidth: '170px', cursor: 'pointer' }}
          >
            <option value="custom" disabled={customOrder.length === 0}>
              Tùy chỉnh (Kéo thả)
            </option>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất (1 - 9)</option>
            <option value="az">A - Z</option>
            <option value="za">Z - A</option>
          </select>
          <div
            className="d-none d-md-flex align-items-center bg-white p-1 shadow-sm border"
            style={{ height: '50px', borderRadius: '50px' }}
          >
            <button
              className={`border-0 h-100 d-flex align-items-center justify-content-center transition-all ${
                viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'
              }`}
              style={{ width: '58px', borderRadius: '40px' }}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
            <button
              className={`border-0 h-100 d-flex align-items-center justify-content-center transition-all ${
                viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'
              }`}
              style={{ width: '58px', borderRadius: '40px' }}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG THƯ MỤC */}
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white px-3 py-2 rounded-4 shadow-sm fade-in-slide flex-wrap gap-2">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <button
            className={`btn btn-mobile-chip ${
              currentPath === '' ? 'btn-primary text-white' : 'btn-light text-dark'
            }`}
            onClick={() => setCurrentPath('')}
          >
            🏠 Gốc
          </button>
          {currentPath &&
            currentPath.split('/').map((part, idx, arr) => {
              const pathToHere = arr.slice(0, idx + 1).join('/');
              const isLast = idx === arr.length - 1;
              return (
                <React.Fragment key={idx}>
                  <span className="text-muted fw-bold">/</span>
                  <button
                    className={`btn btn-mobile-chip ${
                      isLast ? 'btn-primary text-white' : 'btn-light text-dark'
                    }`}
                    onClick={() => setCurrentPath(pathToHere)}
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          className="btn btn-outline-primary btn-mobile-chip"
          onClick={handleCreateFolder}
        >
          <span>📁+</span> <span>Thư mục mới</span>
        </button>
      </div>

      {/* DANH SÁCH THƯ MỤC CON */}
      {displayFolders.length > 0 && (
        <div className="row g-3 mb-4 fade-in">
          {displayFolders.map((folderName) => (
            <div key={folderName} className="col-6 col-md-4 col-lg-3">
              <div
                className="card border-0 h-100 mac-folder-card"
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName)
                }
              >
                <div className="card-body d-flex flex-column align-items-center justify-content-center p-3 position-relative pt-4">
                  <button
                    className="btn btn-light text-danger rounded-3 border-0 d-flex align-items-center justify-content-center shadow-sm position-absolute"
                    style={{ top: '8px', right: '8px', minHeight: '36px', padding: '4px 8px', zIndex: 2 }}
                    onClick={(e) => handleDeleteFolder(e, folderName)}
                    title="Xóa thư mục này"
                  >
                    🗑️ Xóa
                  </button>
                  <div className="mac-folder-icon mb-2">📁</div>
                  <h6
                    className="fw-bold mb-0 text-dark text-center text-truncate w-100 px-1"
                    title={folderName}
                  >
                    {folderName}
                  </h6>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DANH SÁCH HỌC PHẦN */}
      {sets.length === 0 ? (
        <EmptyState
          title="Thư viện trống"
          message="Chưa có học phần nào. Hãy Nhập JSON hoặc Tạo mới ở phần trên nhé!"
        />
      ) : displaySets.length === 0 && displayFolders.length === 0 ? (
        <div className="text-center text-muted mt-5 fw-bold fs-5">
          Khu vực này hiện đang trống.
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid' ? 'row g-4' : ''}
        >
          {displaySets.map((vocabSet) => {
            const isDragged = draggedSetId === vocabSet.id;
            const isDragOver = dragOverSetId === vocabSet.id && !isDragged;

            return (
              <motion.div
                variants={itemVariants}
                key={vocabSet.id}
                className={viewMode === 'grid' ? 'col-md-6 col-xl-4' : 'mb-4'}
                draggable
                onDragStart={(e) => handleDragStart(e, vocabSet.id)}
                onDrag={(e) => handleDrag(e)}
                onDragOver={(e) => handleDragOver(e, vocabSet.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, vocabSet.id)}
                onDragEnd={handleDragEnd}
              >
                <div
                  className={`card border-0 h-100 transition-all ${
                    viewMode === 'grid' ? 'rounded-4 bg-white' : 'smooth-list-item'
                  }`}
                  style={{
                    opacity: isDragged ? 0.4 : 1,
                    border: isDragOver ? '2px dashed var(--bs-primary)' : '2px solid transparent',
                  }}
                >
                  <div
                    className="card-header bg-transparent p-3 p-md-4 border-0 d-flex flex-column gap-3"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSet(vocabSet.id)}
                  >
                    <div className="d-flex justify-content-between align-items-start w-100">
                      <div className="pe-2" style={{ minWidth: 0, flex: 1 }}>
                        <h5 className="mb-2 fw-bold text-dark text-wrap" title={vocabSet.title}>
                          {vocabSet.title}
                        </h5>
                        <div className="d-flex flex-wrap gap-2">
                          <span className="badge bg-light text-muted border px-2 py-1 rounded-pill">
                            {vocabSet.vocab_count} thẻ
                          </span>
                          {vocabSet.type === 'kanji' ? (
                            <span className="badge px-2 py-1 bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill">
                              ⛩️ KANJI
                            </span>
                          ) : (
                            <span
                              className={`badge px-2 py-1 rounded-pill ${
                                vocabSet.language === 'en'
                                  ? 'bg-info bg-opacity-10 text-info border border-info border-opacity-25'
                                  : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
                              }`}
                            >
                              {vocabSet.language === 'en' ? '🇬🇧 EN' : '🇯🇵 JA'}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="btn btn-light btn-mobile-chip text-muted">
                        {expandedSetId === vocabSet.id ? '▲ Thu gọn' : '▼ Mở xem'}
                      </span>
                    </div>

                    <div className="w-100">
                      <div
                        className="d-flex justify-content-between text-muted fw-bold mb-1"
                        style={{ fontSize: '0.8rem' }}
                      >
                        <span>Tiến độ</span>
                        <span>{vocabSet.progress}%</span>
                      </div>
                      <div className="progress rounded-pill bg-light" style={{ height: '8px' }}>
                        <div
                          className="progress-bar bg-success rounded-pill"
                          style={{ width: `${vocabSet.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* LƯỚI NÚT HÀNH ĐỘNG 2 CỘT CHUẨN TOUCH-FRIENDLY */}
                    <div className="action-grid-2col" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-light text-primary btn-mobile-chip"
                        onClick={(e) => handleDownloadSet(e, vocabSet, 'json')}
                      >
                        <span>📦</span> <span>Xuất JSON</span>
                      </button>
                      <button
                        className="btn btn-light text-dark btn-mobile-chip"
                        onClick={(e) => handleDownloadSet(e, vocabSet, 'txt')}
                      >
                        <span>📄</span> <span>Xuất Text</span>
                      </button>
                      <button
                        className="btn btn-light text-success btn-mobile-chip"
                        onClick={(e) => handleDownloadSet(e, vocabSet, 'csv')}
                      >
                        <span>📊</span> <span>Xuất Excel</span>
                      </button>
                      <button
                        className="btn btn-light text-danger btn-mobile-chip"
                        onClick={(e) => handleDeleteSet(e, vocabSet.id, vocabSet.title)}
                      >
                        <span>🗑️</span> <span>Xóa bộ này</span>
                      </button>
                    </div>
                  </div>

                  {expandedSetId === vocabSet.id && viewMode === 'list' && (
                    <div
                      className="card-body p-2 p-md-3 border-0 fade-in-slide"
                      style={{ cursor: 'default' }}
                    >
                      <div className="list-group list-group-flush">
                        {vocabSet.vocabularies?.length === 0 && addingToSetId !== vocabSet.id && (
                          <div className="text-center py-4 text-muted fst-italic smooth-list-item-inner">
                            Học phần trống. Hãy bấm "+ Thêm thẻ mới" bên dưới!
                          </div>
                        )}

                        {vocabSet.vocabularies?.map((vocab) => {
                          const hasExtra =
                            (vocab.hanviet && vocab.hanviet.trim()) ||
                            (vocab.hiragana && vocab.hiragana.trim());
                          const isJa = vocabSet.language !== 'en';
                          return (
                            <div
                              key={vocab.id}
                              className="list-group-item smooth-list-item-inner p-3 border-0 shadow-sm"
                            >
                              {editingVocabId === vocab.id ? (
                                <div className="d-flex flex-column gap-2">
                                  <input
                                    type="text"
                                    className="form-control bg-white border shadow-sm"
                                    value={editWord}
                                    onChange={(e) => setEditWord(e.target.value)}
                                    autoFocus
                                    placeholder="Từ vựng / Chữ Hán"
                                  />
                                  {isJa && (
                                    <div className="row g-2">
                                      <div className="col-6">
                                        <input
                                          type="text"
                                          className="form-control bg-white border shadow-sm"
                                          value={editHanviet}
                                          onChange={(e) => setEditHanviet(e.target.value)}
                                          placeholder="Hán Việt"
                                        />
                                      </div>
                                      <div className="col-6">
                                        <input
                                          type="text"
                                          className="form-control bg-white border shadow-sm"
                                          value={editHiragana}
                                          onChange={(e) => setEditHiragana(e.target.value)}
                                          placeholder="Cách đọc (Hiragana)"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    className="form-control bg-white border shadow-sm"
                                    value={editMeaning}
                                    onChange={(e) => setEditMeaning(e.target.value)}
                                    placeholder="Ý nghĩa"
                                  />
                                  <div className="action-grid-2col mt-1">
                                    <button
                                      className="btn btn-success text-white btn-mobile-chip"
                                      onClick={() => handleSaveEdit(vocab.id, vocabSet.id)}
                                    >
                                      💾 Lưu lại
                                    </button>
                                    <button
                                      className="btn btn-secondary text-white btn-mobile-chip"
                                      onClick={() => setEditingVocabId(null)}
                                    >
                                      ✖ Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="d-flex flex-column gap-2">
                                  <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                      <div className="fw-bold fs-5 text-dark">{vocab.word}</div>
                                      {hasExtra && (
                                        <div className="d-flex flex-wrap gap-2 mt-1">
                                          {vocab.hanviet && (
                                            <span
                                              className="badge bg-white border"
                                              style={{ color: '#863bff' }}
                                            >
                                              {vocab.hanviet}
                                            </span>
                                          )}
                                          {vocab.hiragana && (
                                            <span className="badge bg-white text-info border">
                                              {vocab.hiragana}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <div className="text-dark mt-2 fw-semibold">
                                        {vocab.meaning}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="d-flex flex-wrap gap-2 mt-2">
                                    <button
                                      className="btn btn-white text-primary btn-mobile-chip flex-fill"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNoteModalVocab(vocab);
                                      }}
                                    >
                                      📓 Sổ tay
                                    </button>
                                    <button
                                      className="btn btn-white text-dark btn-mobile-chip flex-fill"
                                      onClick={() => handleEditClick(vocab)}
                                    >
                                      ✏️ Sửa
                                    </button>
                                    <button
                                      className="btn btn-white text-danger btn-mobile-chip flex-fill"
                                      onClick={() => handleDeleteVocab(vocab.id, vocabSet.id)}
                                    >
                                      🗑️ Xóa
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {addingToSetId === vocabSet.id ? (
                          <div
                            className="list-group-item smooth-list-item-inner p-3 border-0 shadow-sm"
                            style={{ borderLeft: '4px solid var(--bs-primary)' }}
                          >
                            <div className="d-flex flex-column gap-2">
                              <input
                                type="text"
                                className="form-control bg-white border shadow-sm"
                                value={newWord}
                                onChange={(e) => setNewWord(e.target.value)}
                                autoFocus
                                placeholder="Từ vựng mới"
                              />
                              {vocabSet.language !== 'en' && (
                                <div className="row g-2">
                                  <div className="col-6">
                                    <input
                                      type="text"
                                      className="form-control bg-white border shadow-sm"
                                      value={newHanviet}
                                      onChange={(e) => setNewHanviet(e.target.value)}
                                      placeholder="Hán Việt"
                                    />
                                  </div>
                                  <div className="col-6">
                                    <input
                                      type="text"
                                      className="form-control bg-white border shadow-sm"
                                      value={newHiragana}
                                      onChange={(e) => setNewHiragana(e.target.value)}
                                      placeholder="Cách đọc"
                                    />
                                  </div>
                                </div>
                              )}
                              <input
                                type="text"
                                className="form-control bg-white border shadow-sm"
                                value={newMeaning}
                                onChange={(e) => setNewMeaning(e.target.value)}
                                placeholder="Ý nghĩa"
                              />
                              <div className="action-grid-2col mt-1">
                                <button
                                  className="btn btn-primary text-white btn-mobile-chip"
                                  onClick={() => handleSaveNew(vocabSet.id)}
                                >
                                  💾 Lưu thẻ mới
                                </button>
                                <button
                                  className="btn btn-secondary text-white btn-mobile-chip"
                                  onClick={() => setAddingToSetId(null)}
                                >
                                  ✖ Hủy
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="list-group-item bg-transparent p-2 text-center border-0 mt-2">
                            <button
                              className="btn btn-outline-primary btn-touch w-100"
                              style={{
                                borderStyle: 'dashed',
                                borderWidth: '2px',
                                backgroundColor: 'rgba(134,59,255,0.05)',
                              }}
                              onClick={() => handleAddClick(vocabSet.id)}
                            >
                              ➕ Thêm thẻ từ vựng mới
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {hasMore && sets.length > 0 && (
        <div className="text-center mt-4 mb-5">
          <button
            className="btn btn-outline-primary btn-touch px-5 shadow-sm"
            onClick={() => fetchSets(true)}
          >
            Tải thêm học phần cũ ↓
          </button>
        </div>
      )}
    </div>
  );
}

export default VocabularyList;