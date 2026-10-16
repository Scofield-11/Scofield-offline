import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ChevronDown,
  Plus,
  Trash2,
  Edit3,
  BookMarked,
  X,
  FolderOpen,
  Download,
  GripVertical,
  Volume2,
} from 'lucide-react';
import api, {
  exportAllDataToJson,
  exportSingleItemToJson,
  importDataFromJson,
  scheduleDebouncedPush,
} from '../api/axiosConfig';
import AddVocabularyForm from './AddVocabularyForm';
import SaveNoteModal from './SaveNoteModal';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const ACCORDION_TRANSITION = { duration: 0.28, ease: [0.16, 1, 0.3, 1] };
const MODAL_SPRING = { type: 'spring', stiffness: 280, damping: 26, mass: 0.7 };

function SetReorderItem({ vocabSet, children }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={vocabSet}
      id={String(vocabSet.id)}
      layout="position"
      dragListener={false}
      dragControls={dragControls}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.7 }}
      style={{ listStyle: 'none' }}
    >
      {children(dragControls)}
    </Reorder.Item>
  );
}

function VocabularyList() {
  const { sets, setSets, loading, fetchSets, hasMore } = useContext(VocabContext);

  const [expandedSetId, setExpandedSetId] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [customFolders, setCustomFolders] = useState([]);
  const jsonInputRef = useRef(null);

  const [customOrder, setCustomOrder] = useState(
    () => JSON.parse(localStorage.getItem('scofieldSetOrder')) || []
  );

  const [sortOption, setSortOption] = useState(() => {
    const saved = localStorage.getItem('scofieldSortOption');
    if (saved) return saved;
    const order = JSON.parse(localStorage.getItem('scofieldSetOrder')) || [];
    return order.length > 0 ? 'custom' : 'newest';
  });

  // Inline Dialog State (thay thế window.prompt & window.confirm)
  const [dialogState, setDialogState] = useState(null);
  const [folderInputName, setFolderInputName] = useState('');

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

  const speakVocab = (e, vocab, setLang) => {
    e.stopPropagation();
    if (!vocab?.word || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(vocab.word);
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(vocab.word);
    utterance.lang = (vocab.language === 'en' || setLang === 'en') && !hasJapanese ? 'en-US' : 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
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
  const displayFolders = Array.from(subfolders);

  const displaySets = currentLevelSets
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

  const handleReorderSets = (newOrderedSets) => {
    const newIds = newOrderedSets.map((s) => s.id);
    const mergedOrder = [...new Set([...newIds, ...customOrder])];
    setCustomOrder(mergedOrder);
    localStorage.setItem('scofieldSetOrder', JSON.stringify(mergedOrder));
    localStorage.setItem('scofield_db_updated_at', new Date().toISOString());
    scheduleDebouncedPush();
    if (sortOption !== 'custom') setSortOption('custom');
  };

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

  const openCreateFolderModal = () => {
    setFolderInputName('');
    setDialogState({ type: 'createFolder' });
  };

  const confirmCreateFolder = async (e) => {
    e.preventDefault();
    const folderName = folderInputName.trim();
    if (!folderName) return;
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
    setDialogState(null);
  };

  const handleDeleteFolder = (e, folderName) => {
    e.stopPropagation();
    setDialogState({ type: 'deleteFolder', folderName });
  };

  const confirmDeleteFolder = async () => {
    const folderName = dialogState?.folderName;
    if (!folderName) return;
    const targetPath = currentPath ? `${currentPath}/${folderName}` : folderName;

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
    setDialogState(null);
  };

  const handleDeleteSet = (e, setId, setTitle) => {
    e.stopPropagation();
    setDialogState({ type: 'deleteSet', setId, setTitle });
  };

  const confirmDeleteSet = async () => {
    const { setId } = dialogState || {};
    if (!setId) return;
    try {
      await api.delete(`/sets/${setId}`);
      toast.success('Đã xóa học phần!');
      fetchSets(false, true);
    } catch (error) {
      toast.error('Xóa thất bại!');
    }
    setDialogState(null);
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

  const handleDeleteVocab = (vocabId, setId, word) => {
    setDialogState({ type: 'deleteVocab', vocabId, setId, word });
  };

  const confirmDeleteVocab = async () => {
    const { vocabId, setId } = dialogState || {};
    if (!vocabId) return;
    try {
      await api.delete(`/vocabularies/${vocabId}`);
      toast.success('Đã xóa từ vựng!');
      refreshSet(setId);
    } catch (error) {
      toast.error('Lỗi xóa từ vựng');
    }
    setDialogState(null);
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
      const { addedSets, addedVocabs } = await importDataFromJson(file, 'merge');
      toast.success(`Nhập JSON: +${addedSets} học phần (${addedVocabs} từ)!`);
      fetchSets(false, true);
    } catch (err) {
      toast.error(err.message || 'File JSON không đúng định dạng!');
    } finally {
      e.target.value = '';
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="container-fluid mt-1 mx-auto px-2 px-md-3" style={{ maxWidth: '1000px' }}>
      <input
        type="file"
        ref={jsonInputRef}
        className="d-none"
        accept=".json,application/json"
        onChange={handleImportJsonChange}
      />

      {/* INLINE MODAL THAY THẾ PROMPT / CONFIRM */}
      <AnimatePresence>
        {dialogState && (
          <motion.div
            className="set-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setDialogState(null)}
          >
            <motion.div
              className="card border-0 shadow-lg rounded-4 p-4"
              style={{ width: '92%', maxWidth: '380px' }}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={MODAL_SPRING}
              onClick={(e) => e.stopPropagation()}
            >
              {dialogState.type === 'createFolder' ? (
                <form onSubmit={confirmCreateFolder}>
                  <h6 className="fw-bold text-dark mb-3">📁 Tạo thư mục con mới</h6>
                  <input
                    type="text"
                    className="form-control mb-3 fw-semibold"
                    placeholder="Nhập tên thư mục..."
                    value={folderInputName}
                    onChange={(e) => setFolderInputName(e.target.value)}
                    autoFocus
                    required
                  />
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-mobile-chip chip-slate" onClick={() => setDialogState(null)}>
                      Hủy
                    </button>
                    <button type="submit" className="btn btn-mobile-chip btn-primary text-white">
                      Tạo ngay
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <h6 className="fw-bold text-danger mb-2">Xác nhận xóa</h6>
                  <p className="text-secondary small mb-3">
                    {dialogState.type === 'deleteFolder' &&
                      `Xóa thư mục "${dialogState.folderName}" sẽ xóa toàn bộ học phần bên trong?`}
                    {dialogState.type === 'deleteSet' &&
                      `Bạn có chắc muốn xóa học phần "${dialogState.setTitle}"?`}
                    {dialogState.type === 'deleteVocab' &&
                      `Xóa từ vựng "${dialogState.word || ''}" khỏi học phần này?`}
                  </p>
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-mobile-chip chip-slate" onClick={() => setDialogState(null)}>
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-mobile-chip chip-danger"
                      onClick={
                        dialogState.type === 'deleteFolder'
                          ? confirmDeleteFolder
                          : dialogState.type === 'deleteSet'
                          ? confirmDeleteSet
                          : confirmDeleteVocab
                      }
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="d-flex align-items-center justify-content-between gap-2 mb-2 px-1">
        <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
          Thư viện ({displaySets.length})
        </span>

        <div className="d-flex align-items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="btn btn-mobile-chip chip-slate"
            onClick={() => jsonInputRef.current?.click()}
            title="Nhập file JSON"
          >
            <FolderOpen size={14} /> <span>Nhập</span>
          </button>
          <button
            type="button"
            className="btn btn-mobile-chip chip-slate"
            onClick={handleBackupAllJson}
            title="Sao lưu file JSON"
          >
            <Download size={14} /> <span>Lưu</span>
          </button>
          <select
            className="form-select form-select-sm bg-white border fw-semibold text-secondary shadow-none sort-select-custom"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="custom" disabled={customOrder.length === 0}>Kéo thả</option>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="az">A - Z</option>
            <option value="za">Z - A</option>
          </select>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between gap-2 mb-3 bg-white p-2 px-3 rounded-4 border shadow-sm">
        <div className="d-flex align-items-center gap-1 overflow-auto no-scrollbar flex-grow-1">
          <button
            className={`btn btn-mobile-chip flex-shrink-0 ${currentPath === '' ? 'btn-primary text-white' : 'chip-slate'}`}
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
                  <span className="text-muted small px-1 flex-shrink-0">/</span>
                  <button
                    className={`btn btn-mobile-chip flex-shrink-0 ${isLast ? 'btn-primary text-white' : 'chip-slate'}`}
                    onClick={() => setCurrentPath(pathToHere)}
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          className="btn btn-mobile-chip chip-primary flex-shrink-0"
          onClick={openCreateFolderModal}
          title="Tạo thư mục mới"
        >
          <Plus size={14} /> <span>Thư mục</span>
        </button>
      </div>

      {displayFolders.length > 0 && (
        <div className="row g-2 mb-3">
          {displayFolders.map((folderName) => (
            <div key={folderName} className="col-6 col-md-4 col-lg-3">
              <div
                className="card mac-folder-card p-2 px-3"
                style={{ cursor: 'pointer' }}
                onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName)}
              >
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <span className="fs-5">📁</span>
                    <span className="fw-bold text-dark text-truncate small" title={folderName}>
                      {folderName}
                    </span>
                  </div>
                  <button
                    className="folder-del-btn"
                    onClick={(e) => handleDeleteFolder(e, folderName)}
                    title="Xóa thư mục"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sets.length === 0 ? (
        <EmptyState
          title="Thư viện trống"
          message="Hãy bấm Nhập JSON hoặc Tạo học phần mới ở phía trên nhé!"
        />
      ) : displaySets.length === 0 && displayFolders.length === 0 ? (
        <div className="text-center text-muted my-5 fw-semibold">Thư mục này hiện đang trống.</div>
      ) : (
        <Reorder.Group
          axis="y"
          values={displaySets}
          onReorder={handleReorderSets}
          as="div"
          className="p-0 m-0"
        >
          {displaySets.map((vocabSet) => {
            const isExpanded = expandedSetId === vocabSet.id;

            return (
              <SetReorderItem key={vocabSet.id} vocabSet={vocabSet}>
                {(dragControls) => (
                  <div className="card smooth-list-item overflow-hidden">
                    <div
                      className="p-3 d-flex flex-column gap-2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleSet(vocabSet.id)}
                    >
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div className="d-flex align-items-center flex-wrap gap-2" style={{ minWidth: 0, flex: 1 }}>
                          <span
                            className="drag-handle-grip"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              dragControls.start(e);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Giữ để kéo sắp xếp"
                          >
                            <GripVertical size={16} />
                          </span>
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
                            <motion.span
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="d-inline-flex align-items-center"
                            >
                              <ChevronDown size={16} />
                            </motion.span>
                          </span>
                        </div>
                      </div>

                      <div className="progress rounded-pill bg-light" style={{ height: '5px' }}>
                        <div
                          className="progress-bar bg-success rounded-pill"
                          style={{ width: `${vocabSet.progress}%` }}
                        ></div>
                      </div>
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
                          <div className="px-3 pb-3 pt-1 border-top bg-white">
                            <div className="action-row-4col my-2">
                              <button
                                className="btn btn-mobile-chip chip-primary"
                                onClick={(e) => handleDownloadSet(e, vocabSet, 'json')}
                              >
                                <Download size={13} /> <span>JSON</span>
                              </button>
                              <button
                                className="btn btn-mobile-chip chip-slate"
                                onClick={(e) => handleDownloadSet(e, vocabSet, 'txt')}
                              >
                                <Download size={13} /> <span>TXT</span>
                              </button>
                              <button
                                className="btn btn-mobile-chip chip-success"
                                onClick={(e) => handleDownloadSet(e, vocabSet, 'csv')}
                              >
                                <Download size={13} /> <span>Excel</span>
                              </button>
                              <button
                                className="btn btn-mobile-chip chip-danger"
                                onClick={(e) => handleDeleteSet(e, vocabSet.id, vocabSet.title)}
                              >
                                <Trash2 size={13} /> <span>Xóa bộ</span>
                              </button>
                            </div>

                            <div className="mt-2">
                              {vocabSet.vocabularies?.length === 0 && addingToSetId !== vocabSet.id && (
                                <div className="text-center py-3 text-muted small fst-italic smooth-list-item-inner">
                                  Chưa có từ vựng nào trong bộ này.
                                </div>
                              )}

                              {vocabSet.vocabularies?.map((vocab) => {
                                const isJa = vocabSet.language !== 'en';
                                const hasDistinctKana =
                                  isJa &&
                                  vocab.hiragana &&
                                  vocab.hiragana.trim() !== '' &&
                                  vocab.hiragana.trim() !== vocab.word.trim();

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
                                      <div className="d-flex justify-content-between align-items-center gap-2 py-1">
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div className="d-flex align-items-center flex-wrap gap-2">
                                            <span
                                              className="vocab-word-main"
                                              style={isJa ? { fontFamily: 'var(--font-jp-serif)' } : undefined}
                                            >
                                              {vocab.word}
                                            </span>
                                            {hasDistinctKana && (
                                              <span className="vocab-kana-pill">{vocab.hiragana}</span>
                                            )}
                                            {vocab.hanviet && vocab.hanviet.trim() !== '' && (
                                              <span className="vocab-hanviet-pill">{vocab.hanviet}</span>
                                            )}
                                          </div>
                                          <div className="vocab-meaning-line">{vocab.meaning}</div>
                                        </div>

                                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                          <button
                                            className="btn-icon-soft chip-slate"
                                            onClick={(e) => speakVocab(e, vocab, vocabSet.language)}
                                            title="Nghe phát âm"
                                          >
                                            <Volume2 size={15} />
                                          </button>
                                          <button
                                            className="btn-icon-soft chip-primary"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setNoteModalVocab(vocab);
                                            }}
                                            title="Lưu vào Sổ tay"
                                          >
                                            <BookMarked size={15} />
                                          </button>
                                          <button
                                            className="btn-icon-soft chip-slate"
                                            onClick={() => handleEditClick(vocab)}
                                            title="Sửa"
                                          >
                                            <Edit3 size={15} />
                                          </button>
                                          <button
                                            className="btn-icon-soft chip-danger"
                                            onClick={() => handleDeleteVocab(vocab.id, vocabSet.id, vocab.word)}
                                            title="Xóa"
                                          >
                                            <Trash2 size={15} />
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
                                  <Plus size={15} /> <span>Thêm từ vựng mới</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </SetReorderItem>
            );
          })}
        </Reorder.Group>
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