import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  ChevronDown,
  Trash2,
  Edit3,
  Volume2,
  X,
  Download,
  BookMarked,
} from 'lucide-react';
import api, { exportSingleItemToJson } from '../api/axiosConfig';
import { VocabContext } from '../context/VocabContext';
import EditKanjiModal from '../components/EditKanjiModal';
import SaveNoteModal from '../components/SaveNoteModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { speakText } from '../utils/audio';
import { toast } from 'react-toastify';

const ACCORDION_TRANSITION = { duration: 0.26, ease: [0.16, 1, 0.3, 1] };
const MODAL_SPRING = { type: 'spring', stiffness: 280, damping: 26, mass: 0.7 };

function KanjiDictionary() {
  const { sets, fetchSets } = useContext(VocabContext);

  const [kanjiSets, setKanjiSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSetId, setExpandedSetId] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [customFolders, setCustomFolders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form tạo học phần Kanji mới
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetFolder, setNewSetFolder] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Thêm chữ Kanji mới vào học phần đang mở
  const [addingToSetId, setAddingToSetId] = useState(null);
  const [singleKanji, setSingleKanji] = useState('');
  const [singleHanviet, setSingleHanviet] = useState('');
  const [singleMeaning, setSingleMeaning] = useState('');
  const [singleOnyomi, setSingleOnyomi] = useState('');
  const [singleKunyomi, setSingleKunyomi] = useState('');
  const [singleExamples, setSingleExamples] = useState([
    { word: '', hanviet: '', reading: '', meaning: '' },
  ]);

  // Thêm nhanh từ đi kèm ngay trên từng Card Kanji
  const [addingExKanjiId, setAddingExKanjiId] = useState(null);
  const [quickExWord, setQuickExWord] = useState('');
  const [quickExHanviet, setQuickExHanviet] = useState('');
  const [quickExReading, setQuickExReading] = useState('');
  const [quickExMeaning, setQuickExMeaning] = useState('');

  // Modal chỉnh sửa Kanji & Modal xóa/tạo thư mục & Sổ tay
  const [editingKanji, setEditingKanji] = useState(null);
  const [noteModalVocab, setNoteModalVocab] = useState(null);
  const [dialogState, setDialogState] = useState(null);
  const [folderInputName, setFolderInputName] = useState('');

  const loadKanjiSets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/kanji-sets');
      setKanjiSets(res.data || []);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách học phần Kanji!');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadKanjiSets();
    fetchSets();
  }, [fetchSets]);

  useEffect(() => {
    setNewSetFolder(currentPath);
  }, [currentPath]);

  const allExistingFolders = Array.from(
    new Set([
      ...kanjiSets.map((s) => (s.folder_path || '').trim()).filter(Boolean),
      ...customFolders,
    ])
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

  kanjiSets.forEach((set) => {
    const path = (set.folder_path || '').trim();
    if (path === currentPath) currentLevelSets.push(set);
    checkPathForFolders(path);
  });

  customFolders.forEach((path) => checkPathForFolders(path));
  const displayFolders = Array.from(subfolders);

  const displaySets = currentLevelSets
    .filter((set) => !set.title?.startsWith('_Thư mục:'))
    .filter((set) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      if (set.title?.toLowerCase().includes(q)) return true;
      if (Array.isArray(set.kanjis)) {
        return set.kanjis.some(
          (k) =>
            k.kanji?.toLowerCase().includes(q) ||
            k.hanviet?.toLowerCase().includes(q) ||
            k.meaning?.toLowerCase().includes(q) ||
            (Array.isArray(k.examples) &&
              k.examples.some(
                (ex) =>
                  ex.word?.toLowerCase().includes(q) ||
                  ex.hanviet?.toLowerCase().includes(q) ||
                  ex.reading?.toLowerCase().includes(q) ||
                  ex.hiragana?.toLowerCase().includes(q) ||
                  ex.meaning?.toLowerCase().includes(q)
              ))
        );
      }
      return false;
    })
    .sort((a, b) => b.id - a.id);

  const refreshSingleKanjiSet = async (setId) => {
    try {
      const res = await api.get(`/kanji-sets/${setId}`);
      setKanjiSets((prev) =>
        prev.map((s) =>
          s.id === setId
            ? {
                ...s,
                kanjis: res.data.kanjis || [],
                vocab_count: (res.data.kanjis || []).length,
              }
            : s
        )
      );
      fetchSets(false, true);
    } catch (error) {
      console.error('Lỗi tải chi tiết bộ Kanji:', error);
    }
  };

  const toggleSet = async (setId) => {
    if (expandedSetId === setId) {
      setExpandedSetId(null);
      setAddingToSetId(null);
      setAddingExKanjiId(null);
      return;
    }

    const target = kanjiSets.find((s) => s.id === setId);
    if (target && (!target.kanjis || target.kanjis.length === 0) && target.vocab_count > 0) {
      try {
        const res = await api.get(`/kanji-sets/${setId}`);
        setKanjiSets((prev) =>
          prev.map((s) => (s.id === setId ? { ...s, kanjis: res.data.kanjis || [] } : s))
        );
      } catch (error) {
        toast.error('Không thể tải danh sách Kanji của học phần này!');
      }
    }

    setExpandedSetId(setId);
    setAddingToSetId(null);
    setAddingExKanjiId(null);
  };

  const handleCreateKanjiSet = async () => {
    if (!newSetTitle.trim()) return toast.warning('Vui lòng nhập tên học phần Kanji!');
    if (!bulkText.trim()) return toast.warning('Vui lòng nhập danh sách Kanji và từ đi kèm!');

    setIsCreating(true);
    try {
      const res = await api.post('/kanji-sets/bulk-import', {
        title: newSetTitle.trim(),
        raw_text: bulkText,
        folder_path: newSetFolder.trim(),
      });
      toast.success(res.data.message || 'Đã tạo học phần Kanji mới!');
      setNewSetTitle('');
      setBulkText('');
      setIsFormExpanded(false);
      await loadKanjiSets(true);
      fetchSets(false, true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi định dạng dữ liệu Kanji!');
    } finally {
      setIsCreating(false);
    }
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
        await api.post('/kanji-sets/bulk-import', {
          title: `_Thư mục: ${folderName}_`,
          raw_text: ' ',
          folder_path: fullPath,
        });
        setCustomFolders((prev) => [...prev, fullPath]);
        toast.success(`Đã tạo thư mục Kanji: ${folderName}`);
        await loadKanjiSets(true);
        fetchSets(false, true);
      } catch (error) {
        toast.error('Lỗi khi tạo thư mục!');
      }
    } else {
      toast.warning('Thư mục này đã tồn tại!');
    }
    setDialogState(null);
  };

  const confirmDeleteFolder = async () => {
    const folderName = dialogState?.folderName;
    if (!folderName) return;
    const targetPath = currentPath ? `${currentPath}/${folderName}` : folderName;

    try {
      const setsToDelete = kanjiSets.filter(
        (s) =>
          s.folder_path === targetPath ||
          (s.folder_path && s.folder_path.startsWith(targetPath + '/'))
      );
      await Promise.all(setsToDelete.map((s) => api.delete(`/kanji-sets/${s.id}`)));
      setCustomFolders((prev) =>
        prev.filter((p) => p !== targetPath && !p.startsWith(targetPath + '/'))
      );
      toast.success(`Đã xóa thư mục: ${folderName}`);
      await loadKanjiSets(true);
      fetchSets(false, true);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa thư mục!');
    }
    setDialogState(null);
  };

  const confirmDeleteSet = async () => {
    const { setId } = dialogState || {};
    if (!setId) return;
    try {
      await api.delete(`/kanji-sets/${setId}`);
      toast.success('Đã xóa học phần Kanji!');
      if (expandedSetId === setId) setExpandedSetId(null);
      await loadKanjiSets(true);
      fetchSets(false, true);
    } catch (error) {
      toast.error('Lỗi khi xóa học phần Kanji!');
    }
    setDialogState(null);
  };

  const confirmDeleteKanji = async () => {
    const { kanjiId, setId } = dialogState || {};
    if (!kanjiId) return;
    try {
      await api.delete(`/kanji/${kanjiId}`);
      toast.success('Đã xóa chữ Kanji!');
      await refreshSingleKanjiSet(setId);
    } catch (error) {
      toast.error('Lỗi khi xóa chữ Kanji!');
    }
    setDialogState(null);
  };

  const openQuickAddExample = (kanjiItem) => {
    if (addingExKanjiId === kanjiItem.id) {
      setAddingExKanjiId(null);
      return;
    }
    setAddingExKanjiId(kanjiItem.id);
    setQuickExWord('');
    setQuickExHanviet('');
    setQuickExReading('');
    setQuickExMeaning('');
  };

  const handleSaveQuickExample = async (kanjiItem, setId) => {
    if (!quickExWord.trim() || !quickExMeaning.trim()) {
      return toast.warning('Vui lòng nhập ít nhất Từ vựng và Ý nghĩa!');
    }
    const currentExamples = Array.isArray(kanjiItem.examples) ? kanjiItem.examples : [];
    const updatedExamples = [
      ...currentExamples,
      {
        word: quickExWord.trim(),
        hanviet: quickExHanviet.trim(),
        reading: quickExReading.trim(),
        hiragana: quickExReading.trim(),
        meaning: quickExMeaning.trim(),
      },
    ];
    try {
      await api.put(`/kanji/${kanjiItem.id}`, {
        ...kanjiItem,
        kanji: kanjiItem.kanji || kanjiItem.word,
        examples: updatedExamples,
      });
      toast.success('Đã thêm từ đi kèm!');
      setAddingExKanjiId(null);
      await refreshSingleKanjiSet(setId);
    } catch (error) {
      toast.error('Lỗi khi thêm từ đi kèm!');
    }
  };

  const openAddSingleKanji = (setId) => {
    setAddingToSetId(setId);
    setSingleKanji('');
    setSingleHanviet('');
    setSingleMeaning('');
    setSingleOnyomi('');
    setSingleKunyomi('');
    setSingleExamples([{ word: '', hanviet: '', reading: '', meaning: '' }]);
  };

  const handleSingleExampleChange = (idx, field, val) => {
    setSingleExamples((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, [field]: val } : ex))
    );
  };

  const handleSaveSingleKanji = async (setId) => {
    if (!singleKanji.trim()) return toast.warning('Vui lòng nhập Chữ Hán!');
    const cleanExamples = singleExamples
      .map((ex) => ({
        word: (ex.word || '').trim(),
        hanviet: (ex.hanviet || '').trim(),
        reading: (ex.reading || '').trim(),
        hiragana: (ex.reading || '').trim(),
        meaning: (ex.meaning || '').trim(),
      }))
      .filter((ex) => ex.word);

    try {
      await api.post('/kanji', {
        kanji: singleKanji.trim(),
        hanviet: singleHanviet.trim(),
        meaning: singleMeaning.trim() || singleHanviet.trim() || singleKanji.trim(),
        onyomi: singleOnyomi.trim(),
        kunyomi: singleKunyomi.trim(),
        examples: cleanExamples,
        set_id: setId,
      });
      toast.success('Đã thêm chữ Kanji mới!');
      setAddingToSetId(null);
      await refreshSingleKanjiSet(setId);
    } catch (error) {
      toast.error('Lỗi khi thêm chữ Kanji!');
    }
  };

  const kanjiPlaceholder =
    '行 | コウ, ギョウ | い.く, ゆ.く, おこな.う | HÀNH - Đi, tổ chức\n- 行く | HÀNH | いく | Đi\n- 銀行 | NGÂN HÀNH | ぎんこう | Ngân hàng\n- 行動 | HÀNH ĐỘNG | こうどう | Hành động\n\n来 | ライ | く.る, きた.る | LAI - Đến\n- 来る | LAI | くる | Đến\n- 来年 | LAI NIÊN | らいねん | Năm sau';

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="container-fluid mt-1 mx-auto px-2 px-md-3" style={{ maxWidth: '1000px' }}>
      {/* MODAL XÁC NHẬN TẠO THƯ MỤC / XÓA */}
      {ReactDOM.createPortal(
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
                className="set-sheet-panel"
                style={{ maxWidth: '400px', height: 'auto', maxHeight: '85vh' }}
                initial={window.innerWidth < 768 ? { y: '100%' } : { opacity: 0, scale: 0.92, y: 10 }}
                animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={window.innerWidth < 768 ? { y: '100%' } : { opacity: 0, scale: 0.92, y: 10 }}
                transition={MODAL_SPRING}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="set-sheet-grabber d-md-none" />
                <div className="set-sheet-header">
                  <h6
                    className={`fw-bold mb-0 ${
                      dialogState.type === 'createFolder' ? 'text-dark' : 'text-danger'
                    }`}
                  >
                    {dialogState.type === 'createFolder'
                      ? '📁 Tạo thư mục Kanji mới'
                      : '⚠️ Xác nhận xóa'}
                  </h6>
                  <button
                    type="button"
                    className="btn-icon-soft chip-slate"
                    onClick={() => setDialogState(null)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3 pt-2">
                  {dialogState.type === 'createFolder' ? (
                    <form onSubmit={confirmCreateFolder}>
                      <input
                        type="text"
                        className="form-control bg-light border-0 mb-3 fw-semibold py-2"
                        placeholder="Nhập tên thư mục Kanji..."
                        value={folderInputName}
                        onChange={(e) => setFolderInputName(e.target.value)}
                        autoFocus
                        required
                      />
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-light btn-touch w-50 fw-bold"
                          onClick={() => setDialogState(null)}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary btn-touch w-50 fw-bold text-white"
                        >
                          Tạo ngay
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <p className="text-secondary small mb-3">
                        {dialogState.type === 'deleteFolder' &&
                          `Xóa thư mục "${dialogState.folderName}" sẽ xóa toàn bộ học phần Kanji bên trong?`}
                        {dialogState.type === 'deleteSet' &&
                          `Bạn có chắc muốn xóa học phần Kanji "${dialogState.setTitle}"?`}
                        {dialogState.type === 'deleteKanji' &&
                          `Xóa chữ Hán "${dialogState.kanjiChar || ''}" khỏi học phần này?`}
                      </p>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-light btn-touch w-50 fw-bold"
                          onClick={() => setDialogState(null)}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-touch w-50 fw-bold text-white d-flex align-items-center justify-content-center gap-1"
                          onClick={
                            dialogState.type === 'deleteFolder'
                              ? confirmDeleteFolder
                              : dialogState.type === 'deleteSet'
                              ? confirmDeleteSet
                              : confirmDeleteKanji
                          }
                        >
                          <Trash2 size={15} /> Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {editingKanji && (
        <EditKanjiModal
          kanjiItem={editingKanji.item}
          onClose={() => setEditingKanji(null)}
          onUpdateSuccess={() => {
            refreshSingleKanjiSet(editingKanji.setId);
            setEditingKanji(null);
            toast.success('Đã cập nhật chữ Kanji!');
          }}
        />
      )}

      {noteModalVocab && (
        <SaveNoteModal
          vocab={noteModalVocab}
          sets={sets}
          onClose={() => setNoteModalVocab(null)}
          onSaveSuccess={() => fetchSets(false, true)}
        />
      )}

      {/* FORM TẠO HỌC PHẦN KANJI MỚI */}
      <div className="card border-0 rounded-4 mb-3 overflow-hidden shadow-sm">
        <div
          className="card-header bg-white py-2 px-3 border-0 d-flex justify-content-between align-items-center rounded-4"
          style={{ cursor: 'pointer', minHeight: '48px' }}
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="d-flex align-items-center gap-2">
            <span
              className="btn-icon-soft chip-primary"
              style={{ width: '30px', height: '30px', minHeight: '30px' }}
            >
              {isFormExpanded ? <Minus size={15} /> : <Plus size={15} />}
            </span>
            <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
              ⛩️ Tạo học phần Kanji mới
            </span>
          </div>
          <span className="btn-mobile-chip chip-slate">
            <span>{isFormExpanded ? 'Thu gọn' : 'Mở'}</span>
            <motion.span
              animate={{ rotate: isFormExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="d-inline-flex align-items-center"
            >
              <ChevronDown size={14} />
            </motion.span>
          </span>
        </div>

        <AnimatePresence initial={false}>
          {isFormExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={ACCORDION_TRANSITION}
              style={{ overflow: 'hidden' }}
            >
              <div className="card-body p-3 border-top bg-white">
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-7">
                    <label className="text-muted small fw-bold mb-1">TÊN HỌC PHẦN KANJI</label>
                    <input
                      type="text"
                      className="form-control fw-bold text-dark bg-light border-0"
                      placeholder="VD: Kanji N4 - Bài 1..."
                      value={newSetTitle}
                      onChange={(e) => setNewSetTitle(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-5">
                    <label className="text-muted small fw-bold mb-1">THƯ MỤC LƯU TRỮ</label>
                    <select
                      className="form-select bg-light border-0 fw-semibold text-dark"
                      value={newSetFolder}
                      onChange={(e) => setNewSetFolder(e.target.value)}
                    >
                      <option value="">📁 Thư mục gốc (Mặc định)</option>
                      {allExistingFolders.map((folder) => (
                        <option key={folder} value={folder}>
                          📁 {folder}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-muted small fw-bold mb-1 d-block">
                    ĐỊNH DẠNG NHẬP (Dòng chữ Hán: Chữ Hán | Âm Ôn | Âm Kun | Hán Việt - Nghĩa • Dòng từ đi kèm bắt đầu bằng `-` đủ 4 trường: Từ vựng | Hán Việt | Phiên âm | Ý nghĩa)
                  </label>
                  <textarea
                    className="form-control bg-light border-0 p-3"
                    rows="6"
                    placeholder={kanjiPlaceholder}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    style={{ lineHeight: '1.55', fontSize: '0.9rem' }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-touch w-100 fw-bold"
                  onClick={handleCreateKanjiSet}
                  disabled={isCreating}
                >
                  {isCreating ? 'Đang tạo...' : '💾 Lưu học phần Kanji'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* THANH TIÊU ĐỀ & TÌM KIẾM HỌC PHẦN KANJI */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 px-1">
        <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
          Học phần Kanji ({displaySets.length})
        </span>

        <div className="d-flex align-items-center gap-2" style={{ minWidth: '220px' }}>
          <input
            type="text"
            className="form-control form-control-sm bg-white border rounded-pill px-3 fw-semibold"
            placeholder="🔍 Tìm học phần Kanji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG THƯ MỤC & TẠO FOLDER */}
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3 bg-white p-2 px-3 rounded-4 border shadow-sm">
        <div className="d-flex align-items-center gap-1 overflow-auto no-scrollbar flex-grow-1">
          <button
            className={`btn btn-mobile-chip flex-shrink-0 ${
              currentPath === '' ? 'btn-primary text-white' : 'chip-slate'
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
                  <span className="text-muted small px-1 flex-shrink-0">/</span>
                  <button
                    className={`btn btn-mobile-chip flex-shrink-0 ${
                      isLast ? 'btn-primary text-white' : 'chip-slate'
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
          className="btn btn-mobile-chip chip-primary flex-shrink-0"
          onClick={openCreateFolderModal}
          title="Tạo thư mục Kanji mới"
        >
          <Plus size={14} /> <span>Thư mục</span>
        </button>
      </div>

      {/* DANH SÁCH THƯ MỤC CON */}
      {displayFolders.length > 0 && (
        <div className="row g-2 mb-3">
          {displayFolders.map((folderName) => (
            <div key={folderName} className="col-6 col-md-4 col-lg-3">
              <div
                className="card mac-folder-card p-2 px-3"
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  setCurrentPath(currentPath ? `${currentPath}/${folderName}` : folderName)
                }
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setDialogState({ type: 'deleteFolder', folderName });
                    }}
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

      {/* DANH SÁCH HỌC PHẦN KANJI (ẤN VÀO MỚI HIỆN CÁC CARD KANJI) */}
      {kanjiSets.filter((s) => !s.title?.startsWith('_Thư mục:')).length === 0 &&
      displayFolders.length === 0 ? (
        <EmptyState
          title="Chưa có học phần Kanji"
          message="Hãy bấm 'Tạo học phần Kanji mới' ở phía trên để thêm bộ Kanji đầu tiên nhé!"
        />
      ) : displaySets.length === 0 && displayFolders.length === 0 ? (
        <div className="text-center text-muted my-5 fw-semibold">
          Thư mục này hiện chưa có học phần Kanji nào.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2 mb-4">
          {displaySets.map((kSet) => {
            const isExpanded = expandedSetId === kSet.id;
            const kanjiList = kSet.kanjis || [];

            return (
              <div key={kSet.id} className="card smooth-list-item overflow-hidden">
                {/* HEADER HỌC PHẦN KANJI */}
                <div
                  className="p-3 d-flex justify-content-between align-items-center gap-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleSet(kSet.id)}
                >
                  <div
                    className="d-flex align-items-center flex-wrap gap-2"
                    style={{ minWidth: 0, flex: 1 }}
                  >
                    <span className="fs-5">⛩️</span>
                    <h6 className="mb-0 fw-bold text-dark text-break">{kSet.title}</h6>
                    <span className="badge bg-light text-secondary border rounded-pill">
                      {kSet.vocab_count || kanjiList.length || 0} chữ Kanji
                    </span>
                    <span className="badge chip-primary rounded-pill">KANJI</span>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      className="btn-icon-soft chip-slate"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          exportSingleItemToJson('set', kSet.id);
                          toast.success(`Đã xuất JSON: ${kSet.title}`);
                        } catch (err) {
                          toast.error('Lỗi xuất JSON!');
                        }
                      }}
                      title="Xuất JSON"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-soft chip-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialogState({
                          type: 'deleteSet',
                          setId: kSet.id,
                          setTitle: kSet.title,
                        });
                      }}
                      title="Xóa học phần Kanji"
                    >
                      <Trash2 size={14} />
                    </button>
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

                {/* DANH SÁCH CARD KANJI BÊN TRONG HỌC PHẦN (1 CHỮ 1 DÒNG TRÊN PC) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={ACCORDION_TRANSITION}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="p-3 border-top bg-light">
                        {kanjiList.length === 0 ? (
                          <div className="text-center py-4 text-muted small fw-semibold">
                            Chưa có chữ Kanji nào trong học phần này.
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-3">
                            {kanjiList.map((item) => {
                              const examples = Array.isArray(item.examples) ? item.examples : [];
                              const isQuickAddingEx = addingExKanjiId === item.id;

                              return (
                                <div
                                  key={item.id}
                                  className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden"
                                >
                                  <div className="row g-0 align-items-stretch">
                                    {/* CỘT TRÁI: CHỮ KANJI + HÁN VIỆT + ÂM ÔN / ÂM KUN */}
                                    <div
                                      className="col-12 col-lg-4 p-3 p-md-4 d-flex flex-column justify-content-between"
                                      style={{
                                        borderRight:
                                          window.innerWidth >= 992
                                            ? '1px solid var(--surface-border)'
                                            : 'none',
                                        borderBottom:
                                          window.innerWidth < 992
                                            ? '1px solid var(--surface-border)'
                                            : 'none',
                                      }}
                                    >
                                      {/* Thanh trên: Nhãn bộ + 3 nút Loa / Sửa / Xóa */}
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <span
                                          className="badge chip-primary rounded-pill px-3 py-1 text-truncate"
                                          style={{ maxWidth: '150px', fontSize: '0.75rem' }}
                                        >
                                          {kSet.title}
                                        </span>

                                        <div className="d-flex align-items-center gap-1">
                                          <button
                                            type="button"
                                            className="btn-icon-soft chip-slate"
                                            style={{ width: '34px', height: '34px' }}
                                            onClick={() =>
                                              speakText(item.kanji || item.word, 'ja-JP')
                                            }
                                            title="Nghe âm chữ Hán"
                                          >
                                            <Volume2 size={15} />
                                          </button>
                                          <button
                                            type="button"
                                            className="btn-icon-soft chip-slate"
                                            style={{ width: '34px', height: '34px' }}
                                            onClick={() =>
                                              setEditingKanji({ item, setId: kSet.id })
                                            }
                                            title="Chỉnh sửa chữ Kanji & Từ đi kèm"
                                          >
                                            <Edit3 size={15} />
                                          </button>
                                          <button
                                            type="button"
                                            className="btn-icon-soft chip-danger"
                                            style={{ width: '34px', height: '34px' }}
                                            onClick={() =>
                                              setDialogState({
                                                type: 'deleteKanji',
                                                kanjiId: item.id,
                                                setId: kSet.id,
                                                kanjiChar: item.kanji || item.word,
                                              })
                                            }
                                            title="Xóa chữ Kanji"
                                          >
                                            <Trash2 size={15} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Khung chữ Hán chính giữa */}
                                      <div className="d-flex flex-column align-items-center my-2">
                                        <div
                                          className="d-flex align-items-center justify-content-center rounded-4 mb-3 bg-white"
                                          style={{
                                            width: '108px',
                                            height: '108px',
                                            border: '1.5px solid var(--surface-border)',
                                            boxShadow: '0 8px 24px -6px rgba(109, 40, 217, 0.14)',
                                            color: 'var(--brand-primary)',
                                            fontFamily: 'var(--font-jp-serif)',
                                            fontSize: '3.4rem',
                                            fontWeight: 700,
                                            lineHeight: 1,
                                            cursor: 'pointer',
                                          }}
                                          onClick={() =>
                                            speakText(item.kanji || item.word, 'ja-JP')
                                          }
                                          title="Bấm để nghe phát âm"
                                        >
                                          {item.kanji || item.word}
                                        </div>

                                        <div className="d-flex align-items-center justify-content-center flex-wrap gap-2 text-center">
                                          {item.hanviet && (
                                            <span className="vocab-hanviet-pill">
                                              {item.hanviet}
                                            </span>
                                          )}
                                          <span className="fw-bold text-dark">
                                            {item.meaning}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Bảng Âm Ôn & Âm Kun */}
                                      <div
                                        className="rounded-3 p-2 px-3 mt-3"
                                        style={{
                                          backgroundColor: 'var(--bg-elevated)',
                                          border: '1px solid var(--surface-border)',
                                        }}
                                      >
                                        <div
                                          className="d-flex align-items-center gap-2 py-1"
                                          style={{
                                            borderBottom: '1px solid var(--surface-border)',
                                          }}
                                        >
                                          <span
                                            className="badge rounded-2 flex-shrink-0"
                                            style={{
                                              backgroundColor: '#fee2e2',
                                              color: '#dc2626',
                                              fontSize: '0.7rem',
                                              fontWeight: 700,
                                            }}
                                          >
                                            Âm Ôn
                                          </span>
                                          <span className="fw-bold text-dark small text-break">
                                            {item.onyomi || '—'}
                                          </span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 pt-2 pb-1">
                                          <span
                                            className="badge rounded-2 flex-shrink-0"
                                            style={{
                                              backgroundColor: '#d1fae5',
                                              color: '#059669',
                                              fontSize: '0.7rem',
                                              fontWeight: 700,
                                            }}
                                          >
                                            Âm Kun
                                          </span>
                                          <span className="fw-bold text-dark small text-break">
                                            {item.kunyomi || '—'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* CỘT PHẢI: DANH SÁCH TỪ KANJI ĐI KÈM (4 TRƯỜNG) */}
                                    <div className="col-12 col-lg-8 p-3 p-md-4 d-flex flex-column">
                                      <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                                        <span
                                          className="fw-bold text-secondary"
                                          style={{ fontSize: '0.8rem', letterSpacing: '0.4px' }}
                                        >
                                          DANH SÁCH TỪ KANJI ĐI KÈM ({examples.length})
                                        </span>
                                        <button
                                          type="button"
                                          className="btn btn-mobile-chip chip-primary py-1 px-3"
                                          onClick={() => openQuickAddExample(item)}
                                        >
                                          <Plus size={14} /> <span>Thêm từ đi kèm</span>
                                        </button>
                                      </div>

                                      {/* Form thêm nhanh từ đi kèm 4 trường ngay trên Card */}
                                      {isQuickAddingEx && (
                                        <div className="p-3 mb-3 rounded-3 bg-light border border-primary">
                                          <div className="row g-2 mb-2">
                                            <div className="col-6 col-md-3">
                                              <input
                                                type="text"
                                                className="form-control form-control-sm bg-white border-0 fw-bold"
                                                placeholder="Từ vựng (行く)"
                                                value={quickExWord}
                                                onChange={(e) => setQuickExWord(e.target.value)}
                                                autoFocus
                                              />
                                            </div>
                                            <div className="col-6 col-md-3">
                                              <input
                                                type="text"
                                                className="form-control form-control-sm bg-white border-0 fw-semibold text-primary"
                                                placeholder="Hán Việt (HÀNH)"
                                                value={quickExHanviet}
                                                onChange={(e) => setQuickExHanviet(e.target.value)}
                                              />
                                            </div>
                                            <div className="col-6 col-md-3">
                                              <input
                                                type="text"
                                                className="form-control form-control-sm bg-white border-0"
                                                placeholder="Phiên âm (いく)"
                                                value={quickExReading}
                                                onChange={(e) => setQuickExReading(e.target.value)}
                                              />
                                            </div>
                                            <div className="col-6 col-md-3">
                                              <input
                                                type="text"
                                                className="form-control form-control-sm bg-white border-0"
                                                placeholder="Ý nghĩa (Đi)"
                                                value={quickExMeaning}
                                                onChange={(e) => setQuickExMeaning(e.target.value)}
                                              />
                                            </div>
                                          </div>
                                          <div className="d-flex justify-content-end gap-2">
                                            <button
                                              type="button"
                                              className="btn btn-mobile-chip chip-slate py-1"
                                              onClick={() => setAddingExKanjiId(null)}
                                            >
                                              Hủy
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-mobile-chip btn-primary text-white py-1"
                                              onClick={() => handleSaveQuickExample(item, kSet.id)}
                                            >
                                              💾 Lưu từ
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {examples.length === 0 ? (
                                        <div className="text-muted small fst-italic py-3 text-center bg-light rounded-3 my-auto">
                                          Chưa có từ đi kèm. Hãy bấm "+ Thêm từ đi kèm" ở góc phải nhé!
                                        </div>
                                      ) : (
                                        <div className="d-flex flex-column gap-2">
                                          {examples.map((ex, exIdx) => {
                                            const exReading = ex.hiragana || ex.reading || '';
                                            return (
                                              <div
                                                key={exIdx}
                                                className="d-flex align-items-center justify-content-between gap-2 p-2 px-3 rounded-3"
                                                style={{
                                                  backgroundColor: 'var(--bg-elevated)',
                                                  border: '1px solid var(--surface-border)',
                                                }}
                                              >
                                                <div
                                                  className="d-flex align-items-center flex-wrap gap-2"
                                                  style={{ minWidth: 0, flex: 1 }}
                                                >
                                                  <span
                                                    className="fw-bold text-dark"
                                                    style={{
                                                      fontFamily: 'var(--font-jp-serif)',
                                                      fontSize: '1.1rem',
                                                    }}
                                                  >
                                                    {ex.word}
                                                  </span>
                                                  {ex.hanviet && (
                                                    <span className="vocab-hanviet-pill">
                                                      {ex.hanviet}
                                                    </span>
                                                  )}
                                                  {exReading && (
                                                    <span className="vocab-kana-pill">
                                                      {exReading}
                                                    </span>
                                                  )}
                                                  <span className="text-secondary fw-semibold small">
                                                    — {ex.meaning}
                                                  </span>
                                                </div>

                                                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                                  <button
                                                    type="button"
                                                    className="btn-icon-soft chip-slate"
                                                    style={{ width: '32px', height: '32px' }}
                                                    onClick={() => speakText(ex.word, 'ja-JP')}
                                                    title="Nghe phát âm"
                                                  >
                                                    <Volume2 size={14} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="btn-icon-soft chip-primary"
                                                    style={{ width: '32px', height: '32px' }}
                                                    onClick={() =>
                                                      setNoteModalVocab({
                                                        word: ex.word,
                                                        hanviet: ex.hanviet || '',
                                                        hiragana: exReading,
                                                        meaning: ex.meaning || '',
                                                        language: 'ja',
                                                      })
                                                    }
                                                    title="Lưu vào Sổ tay (Note)"
                                                  >
                                                    <BookMarked size={14} />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* FORM THÊM CHỮ KANJI MỚI VÀO HỌC PHẦN */}
                        {addingToSetId === kSet.id ? (
                          <div className="card border-primary border rounded-4 p-3 mt-3 bg-white">
                            <h6 className="fw-bold text-dark mb-2">
                              + Thêm chữ Kanji mới vào "{kSet.title}"
                            </h6>
                            <div className="row g-2 mb-2">
                              <div className="col-4 col-md-2">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-light border-0 fw-bold text-center"
                                  placeholder="Chữ Hán (行)"
                                  value={singleKanji}
                                  onChange={(e) => setSingleKanji(e.target.value)}
                                />
                              </div>
                              <div className="col-4 col-md-3">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-light border-0 fw-bold"
                                  placeholder="Hán Việt (HÀNH)"
                                  value={singleHanviet}
                                  onChange={(e) => setSingleHanviet(e.target.value)}
                                />
                              </div>
                              <div className="col-4 col-md-3">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-light border-0"
                                  placeholder="Nghĩa gốc (Đi)"
                                  value={singleMeaning}
                                  onChange={(e) => setSingleMeaning(e.target.value)}
                                />
                              </div>
                              <div className="col-6 col-md-2">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-light border-0"
                                  placeholder="Âm Ôn (コウ)"
                                  value={singleOnyomi}
                                  onChange={(e) => setSingleOnyomi(e.target.value)}
                                />
                              </div>
                              <div className="col-6 col-md-2">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-light border-0"
                                  placeholder="Âm Kun (い.く)"
                                  value={singleKunyomi}
                                  onChange={(e) => setSingleKunyomi(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="small fw-bold text-muted mb-1">
                              TỪ VỰNG ĐI KÈM (TỪ VỰNG • HÁN VIỆT • PHIÊN ÂM • Ý NGHĨA)
                            </div>
                            <div className="d-flex flex-column gap-2 mb-3">
                              {singleExamples.map((ex, idx) => (
                                <div key={idx} className="row g-2 align-items-center m-0">
                                  <div className="col-6 col-md-3 px-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-light border-0 fw-bold"
                                      placeholder="Từ vựng (行く)"
                                      value={ex.word}
                                      onChange={(e) =>
                                        handleSingleExampleChange(idx, 'word', e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="col-6 col-md-3 px-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-light border-0 text-primary fw-semibold"
                                      placeholder="Hán Việt (HÀNH)"
                                      value={ex.hanviet}
                                      onChange={(e) =>
                                        handleSingleExampleChange(idx, 'hanviet', e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="col-5 col-md-3 px-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-light border-0"
                                      placeholder="Phiên âm (いく)"
                                      value={ex.reading}
                                      onChange={(e) =>
                                        handleSingleExampleChange(idx, 'reading', e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="col-5 col-md-2 px-1">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-light border-0"
                                      placeholder="Ý nghĩa (Đi)"
                                      value={ex.meaning}
                                      onChange={(e) =>
                                        handleSingleExampleChange(idx, 'meaning', e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="col-2 col-md-1 px-1 text-end">
                                    <button
                                      type="button"
                                      className="btn-icon-soft chip-danger"
                                      style={{ width: '30px', height: '30px' }}
                                      onClick={() =>
                                        setSingleExamples((prev) =>
                                          prev.filter((_, i) => i !== idx)
                                        )
                                      }
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div>
                                <button
                                  type="button"
                                  className="btn btn-mobile-chip chip-slate"
                                  onClick={() =>
                                    setSingleExamples((prev) => [
                                      ...prev,
                                      { word: '', hanviet: '', reading: '', meaning: '' },
                                    ])
                                  }
                                >
                                  <Plus size={13} /> <span>Thêm dòng từ đi kèm</span>
                                </button>
                              </div>
                            </div>

                            <div className="d-flex justify-content-end gap-2">
                              <button
                                type="button"
                                className="btn btn-mobile-chip chip-slate"
                                onClick={() => setAddingToSetId(null)}
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                className="btn btn-mobile-chip btn-primary text-white"
                                onClick={() => handleSaveSingleKanji(kSet.id)}
                              >
                                💾 Lưu chữ Kanji
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-mobile-chip chip-primary w-100 mt-3 py-2"
                            onClick={() => openAddSingleKanji(kSet.id)}
                          >
                            <Plus size={15} /> <span>Thêm chữ Kanji mới vào học phần này</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default KanjiDictionary;