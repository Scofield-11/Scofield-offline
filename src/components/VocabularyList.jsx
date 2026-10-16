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
    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  };

  const calculateProgress = (set, vocabCount) => {
    if (!vocabCount || vocabCount === 0 || !set) return 0;
    const validTests = testHistories.filter(
      (h) =>
        h.setId !== null &&
        h.setId !== undefined &&
        Number(h.setId) === Number(set.id) &&
        Number(h.total) === Number(vocabCount) &&
        (!set.created_at || !h.created_at || new Date(h.created_at) >= new Date(set.created_at))
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
    if (!path || path === currentPath) return;
    if (path.startsWith(currentPath ? currentPath + '/' : '')) {
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
        progress: calculateProgress(set, set.vocab_count || filteredVocabs.length),
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
    } else if (sortOption === 'oldest') return a.id - b.id;
    else if (sortOption === 'az') return a.title.localeCompare(b.title);
    else if (sortOption === 'za') return b.title.localeCompare(a.title);
    return b.id - a.id;
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

    if (window.confirm(`Xóa thư mục "${folderName}" sẽ xóa toàn bộ học phần bên trong?`)) {
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
    if (window.confirm(`Xóa học phần "${setTitle}"?`)) {
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
    if (window.confirm('Xóa từ vựng này?')) {
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
      content = hasFourCols
        ? vocabsToExport.map((v) => `${v.word} | ${v.hanviet || ''} | ${v.hiragana || ''} | ${v.meaning}`).join('\n')
        : vocabsToExport.map((v) => `${v.word} | ${v.meaning}`).join('\n');
    } else if (format === 'csv') {
      content = hasFourCols
        ? '\uFEFFChữ Hán/Từ vựng,Hán Việt,Cách đọc,Ý nghĩa\n' +
          vocabsToExport
            .map((v) => `"${(v.word || '').replace(/"/g, '""')}","${(v.hanviet || '').replace(/"/g, '""')}","${(v.hiragana || '').replace(/"/g, '""')}","${(v.meaning || '').replace(/"/g, '""')}"`)
            .join('\n')
        : '\uFEFFTừ vựng,Ý nghĩa\n' +
          vocabsToExport
            .map((v) => `"${v.word.replace(/"/g, '""')}","${v.meaning.replace(/"/g, '""')}"`)
            .join('\n');
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
        `Nhập JSON: +${addedSets} học phần (${addedVocabs} từ), +${addedExams} đề thi!`
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
    <div className="container-fluid mt-2 mx-auto px-2 px-md-3" style={{ maxWidth: '1000px' }}>
      {/* THANH SAO LƯU OFFLINE GỌN GÀNG TRÊN 1 DÒNG */}
      <div className="card border-0 rounded-4 p-2 px-3 mb-3 bg-white">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="badge chip-success rounded-pill px-2 py-1">● Offline</span>
            <span className="fw-bold text-dark small">Sao lưu & Khôi phục JSON</span>
          </div>
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
              onClick={handleBackupAllJson}
            >
              ⬇️ Xuất Backup
            </button>
          </div>
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

      {/* TIÊU ĐỀ THƯ VIỆN & BỘ LỌC */}
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h5 className="fw-bold m-0 text-dark">Thư viện học phần</h5>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm bg-white border shadow-sm rounded-pill fw-semibold text-secondary px-3"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{ height: '36px', minWidth: '135px', fontSize: '0.82rem' }}
          >
            <option value="custom" disabled={customOrder.length === 0}>Kéo thả</option>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="az">Tên A - Z</option>
            <option value="za">Tên Z - A</option>
          </select>
        </div>
      </div>

      {/* THANH ĐƯỜNG DẪN THƯ MỤC */}
      <div className="d-flex justify-content-between align-items-center mb-3 bg-white p-2 px-3 rounded-4 border flex-wrap gap-2">
        <div className="d-flex align-items-center flex-wrap gap-1">
          <button
            className={`btn btn-mobile-chip ${currentPath === '' ? 'btn-primary text-white' : 'chip-slate'}`}
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
                  <span className="text-muted small px-1">/</span>
                  <button
                    className={`btn btn-mobile-chip ${isLast ? 'btn-primary text-white' : 'chip-slate'}`}
                    onClick={() => setCurrentPath(pathToHere)}
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button className="btn btn-mobile-chip chip-primary" onClick={handleCreateFolder}>
          📁+ Thư mục
        </button>
      </div>

      {/* DANH SÁCH THƯ MỤC CON */}
      {displayFolders.length > 0 && (
        <div className="row g-2 mb-3 fade-in">
          {displayFolders.map((folderName) => (
            <div key={folderName} className="col-6 col-md-4 col-lg-3">
              <div
                className="card mac-folder-card p-2 px-3"
                style={{ cursor: 'pointer' }}
                onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName)}
              >
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <span className="fs-4">📁</span>
                    <span className="fw-bold text-dark text-truncate small" title={folderName}>
                      {folderName}
                    </span>
                  </div>
                  <button
                    className="btn-icon-soft chip-danger"
                    style={{ width: '28px', height: '28px', minHeight: '28px' }}
                    onClick={(e) => handleDeleteFolder(e, folderName)}
                    title="Xóa thư mục"
                  >
                    🗑️
                  </button>
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
          message="Hãy bấm Nhập JSON hoặc Tạo học phần mới ở phía trên nhé!"
        />
      ) : displaySets.length === 0 && displayFolders.length === 0 ? (
        <div className="text-center text-muted my-5 fw-semibold">Thư mục này hiện đang trống.</div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          {displaySets.map((vocabSet) => {
            const isDragged = draggedSetId === vocabSet.id;
            const isDragOver = dragOverSetId === vocabSet.id && !isDragged;
            const isExpanded = expandedSetId === vocabSet.id;

            return (
              <motion.div
                variants={itemVariants}
                key={vocabSet.id}
                draggable
                onDragStart={(e) => handleDragStart(e, vocabSet.id)}
                onDrag={(e) => handleDrag(e)}
                onDragOver={(e) => handleDragOver(e, vocabSet.id)}
                onDrop={(e) => handleDrop(e, vocabSet.id)}
                onDragEnd={handleDragEnd}
              >
                <div
                  className="card smooth-list-item overflow-hidden"
                  style={{
                    opacity: isDragged ? 0.4 : 1,
                    border: isDragOver ? '2px dashed var(--bs-primary)' : undefined,
                  }}
                >
                  {/* HEADER HỌC PHẦN GỌN GÀNG */}
                  <div
                    className="p-3 d-flex flex-column gap-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleSet(vocabSet.id)}
                  >
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <div className="d-flex align-items-center flex-wrap gap-2" style={{ minWidth: 0, flex: 1 }}>
                        <h6 className="mb-0 fw-bold text-dark text-break">{vocabSet.title}</h6>
                        <span className="badge bg-light text-secondary border rounded-pill">
                          {vocabSet.vocab_count} thẻ
                        </span>
                        <span className="badge chip-primary rounded-pill">
                          {vocabSet.type === 'kanji' ? '⛩️ KANJI' : vocabSet.language === 'en' ? '🇬🇧 EN' : '🇯🇵 JA'}
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        {vocabSet.progress > 0 && (
                          <span className="badge chip-success rounded-pill">{vocabSet.progress}%</span>
                        )}
                        <span className="btn-icon-soft chip-slate">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Thanh tiến độ mỏng tinh tế */}
                    <div className="progress rounded-pill bg-light" style={{ height: '5px' }}>
                      <div
                        className="progress-bar bg-success rounded-pill"
                        style={{ width: `${vocabSet.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* NỘI DUNG KHI MỞ RỘNG HỌC PHẦN */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-top bg-white fade-in">
                      {/* Thanh công cụ 4 nút nhỏ gọn (34px) */}
                      <div className="action-row-4col my-2">
                        <button
                          className="btn btn-mobile-chip chip-primary"
                          onClick={(e) => handleDownloadSet(e, vocabSet, 'json')}
                        >
                          📦 JSON
                        </button>
                        <button
                          className="btn btn-mobile-chip chip-slate"
                          onClick={(e) => handleDownloadSet(e, vocabSet, 'txt')}
                        >
                          📄 TXT
                        </button>
                        <button
                          className="btn btn-mobile-chip chip-success"
                          onClick={(e) => handleDownloadSet(e, vocabSet, 'csv')}
                        >
                          📊 Excel
                        </button>
                        <button
                          className="btn btn-mobile-chip chip-danger"
                          onClick={(e) => handleDeleteSet(e, vocabSet.id, vocabSet.title)}
                        >
                          🗑️ Xóa bộ
                        </button>
                      </div>

                      {/* Danh sách từ vựng bên trong */}
                      <div className="mt-2">
                        {vocabSet.vocabularies?.length === 0 && addingToSetId !== vocabSet.id && (
                          <div className="text-center py-3 text-muted small fst-italic smooth-list-item-inner">
                            Chưa có từ vựng nào trong bộ này.
                          </div>
                        )}

                        {vocabSet.vocabularies?.map((vocab) => {
                          const hasExtra =
                            (vocab.hanviet && vocab.hanviet.trim()) ||
                            (vocab.hiragana && vocab.hiragana.trim());
                          const isJa = vocabSet.language !== 'en';

                          return (
                            <div key={vocab.id} className="smooth-list-item-inner p-2 px-3">
                              {editingVocabId === vocab.id ? (
                                <div className="d-flex flex-column gap-2 py-1">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm bg-white"
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
                                          className="form-control form-control-sm bg-white"
                                          value={editHanviet}
                                          onChange={(e) => setEditHanviet(e.target.value)}
                                          placeholder="Hán Việt"
                                        />
                                      </div>
                                      <div className="col-6">
                                        <input
                                          type="text"
                                          className="form-control form-control-sm bg-white"
                                          value={editHiragana}
                                          onChange={(e) => setEditHiragana(e.target.value)}
                                          placeholder="Cách đọc"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    className="form-control form-control-sm bg-white"
                                    value={editMeaning}
                                    onChange={(e) => setEditMeaning(e.target.value)}
                                    placeholder="Ý nghĩa"
                                  />
                                  <div className="d-flex gap-2 justify-content-end">
                                    <button
                                      className="btn btn-mobile-chip chip-slate"
                                      onClick={() => setEditingVocabId(null)}
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      className="btn btn-mobile-chip btn-primary text-white"
                                      onClick={() => handleSaveEdit(vocab.id, vocabSet.id)}
                                    >
                                      💾 Lưu
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="d-flex align-items-baseline flex-wrap gap-2">
                                      <span className="fw-bold text-dark" style={{ fontSize: '1rem' }}>
                                        {vocab.word}
                                      </span>
                                      {hasExtra && (
                                        <>
                                          {vocab.hanviet && (
                                            <span className="small fw-bold text-primary">
                                              [{vocab.hanviet}]
                                            </span>
                                          )}
                                          {vocab.hiragana && (
                                            <span className="small text-info fw-semibold">
                                              {vocab.hiragana}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    <div className="text-secondary small mt-1">{vocab.meaning}</div>
                                  </div>

                                  {/* 3 nút Icon nhỏ gọn 34x34px nằm ngang */}
                                  <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                    <button
                                      className="btn-icon-soft chip-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNoteModalVocab(vocab);
                                      }}
                                      title="Lưu vào Sổ tay"
                                    >
                                      📓
                                    </button>
                                    <button
                                      className="btn-icon-soft chip-slate"
                                      onClick={() => handleEditClick(vocab)}
                                      title="Sửa"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      className="btn-icon-soft chip-danger"
                                      onClick={() => handleDeleteVocab(vocab.id, vocabSet.id)}
                                      title="Xóa"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {addingToSetId === vocabSet.id ? (
                          <div className="smooth-list-item-inner p-3 mt-2 border-primary">
                            <div className="d-flex flex-column gap-2">
                              <input
                                type="text"
                                className="form-control form-control-sm bg-white"
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
                                      className="form-control form-control-sm bg-white"
                                      value={newHanviet}
                                      onChange={(e) => setNewHanviet(e.target.value)}
                                      placeholder="Hán Việt"
                                    />
                                  </div>
                                  <div className="col-6">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-white"
                                      value={newHiragana}
                                      onChange={(e) => setNewHiragana(e.target.value)}
                                      placeholder="Cách đọc"
                                    />
                                  </div>
                                </div>
                              )}
                              <input
                                type="text"
                                className="form-control form-control-sm bg-white"
                                value={newMeaning}
                                onChange={(e) => setNewMeaning(e.target.value)}
                                placeholder="Ý nghĩa"
                              />
                              <div className="d-flex gap-2 justify-content-end mt-1">
                                <button
                                  className="btn btn-mobile-chip chip-slate"
                                  onClick={() => setAddingToSetId(null)}
                                >
                                  Hủy
                                </button>
                                <button
                                  className="btn btn-mobile-chip btn-primary text-white"
                                  onClick={() => handleSaveNew(vocabSet.id)}
                                >
                                  💾 Lưu thẻ
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-mobile-chip chip-primary w-100 mt-2 py-2"
                            onClick={() => handleAddClick(vocabSet.id)}
                          >
                            ➕ Thêm từ vựng mới
                          </button>
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
        <div className="text-center my-4">
          <button className="btn btn-mobile-chip chip-primary px-4 py-2" onClick={() => fetchSets(true)}>
            Tải thêm học phần ↓
          </button>
        </div>
      )}
    </div>
  );
}

export default VocabularyList;