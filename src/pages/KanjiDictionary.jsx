import React, { useState, useEffect, useMemo, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Volume2,
  BookMarked,
  Edit3,
  Trash2,
  Plus,
  Minus,
  Download,
  X,
  ChevronDown,
  Sparkles,
  BookOpen,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axiosConfig';
import EditKanjiModal from '../components/EditKanjiModal';
import SaveNoteModal from '../components/SaveNoteModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { VocabContext } from '../context/VocabContext';
import { speakText } from '../utils/audio';

const HANVIET_INITIALS = [
  'ALL', 'A', 'B', 'C', 'D', 'Đ', 'G', 'H', 'K', 'L',
  'M', 'N', 'P', 'Q', 'S', 'T', 'U', 'V', 'X', 'Y',
];

const getHanvietInitial = (hanvietStr) => {
  if (!hanvietStr || !hanvietStr.trim()) return '';
  const firstChar = hanvietStr.trim().charAt(0).toUpperCase();
  if (firstChar === 'Đ') return 'Đ';
  return firstChar.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

function KanjiDictionary() {
  const { sets, fetchSets } = useContext(VocabContext);

  const [activeTab, setActiveTab] = useState('dictionary'); // 'dictionary' | 'manage'
  const [kanjiSets, setKanjiSets] = useState([]);
  const [allKanjis, setAllKanjis] = useState([]);
  const [allVocabs, setAllVocabs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State chế độ Tra cứu Từ điển
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSetFilter, setSelectedSetFilter] = useState('all');
  const [selectedInitial, setSelectedInitial] = useState('ALL');
  const [selectedKanjiDetail, setSelectedKanjiDetail] = useState(null);
  const [noteModalVocab, setNoteModalVocab] = useState(null);

  // State chế độ Quản lý Học phần Kanji
  const [isImportExpanded, setIsImportExpanded] = useState(false);
  const [expandedSets, setExpandedSets] = useState({});
  const [importTitle, setImportTitle] = useState('');
  const [importText, setImportText] = useState('');
  const [editingKanji, setEditingKanji] = useState(null);

  const [currentPath, setCurrentPath] = useState('');
  const [customFolders, setCustomFolders] = useState([]);
  const [importFolderPath, setImportFolderPath] = useState('');

  // State thêm lẻ 1 chữ Kanji vào học phần
  const [addingToSetId, setAddingToSetId] = useState(null);
  const [newKanjiChar, setNewKanjiChar] = useState('');
  const [newHanviet, setNewHanviet] = useState('');
  const [newHiragana, setNewHiragana] = useState('');
  const [newMeaning, setNewMeaning] = useState('');

  useEffect(() => {
    setImportFolderPath(currentPath);
  }, [currentPath]);

  const fetchAllKanjiData = async () => {
    try {
      const [setsRes, allKanjiRes, vocabsRes] = await Promise.all([
        api.get('/kanji-sets'),
        api.get('/kanji/all'),
        api.get('/vocabularies?skip=0&limit=10000'),
      ]);
      setKanjiSets(setsRes.data || []);
      setAllKanjis(allKanjiRes.data || []);
      setAllVocabs(vocabsRes.data || []);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu Từ điển Kanji');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllKanjiData();
    fetchSets();
  }, [fetchSets]);

  // Lọc danh sách Kanji trong chế độ Từ điển
  const filteredKanjis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allKanjis.filter((item) => {
      if (selectedSetFilter !== 'all' && String(item.set_id) !== String(selectedSetFilter)) {
        return false;
      }
      if (selectedInitial !== 'ALL') {
        const initChar = getHanvietInitial(item.hanviet);
        if (initChar !== selectedInitial) return false;
      }
      if (!q) return true;
      return (
        (item.kanji && item.kanji.toLowerCase().includes(q)) ||
        (item.hanviet && item.hanviet.toLowerCase().includes(q)) ||
        (item.hiragana && item.hiragana.toLowerCase().includes(q)) ||
        (item.meaning && item.meaning.toLowerCase().includes(q))
      );
    });
  }, [allKanjis, searchQuery, selectedSetFilter, selectedInitial]);

  // Tìm từ ghép / từ vựng liên quan có chứa chữ Kanji đang chọn
  const relatedCompounds = useMemo(() => {
    if (!selectedKanjiDetail || !selectedKanjiDetail.kanji) return [];
    const targetChars = Array.from(selectedKanjiDetail.kanji.trim());
    if (targetChars.length === 0) return [];

    return allVocabs
      .filter((v) => {
        if (!v.word || v.id === selectedKanjiDetail.id) return false;
        return targetChars.some((ch) => v.word.includes(ch));
      })
      .slice(0, 20);
  }, [selectedKanjiDetail, allVocabs]);

  const handleImport = async () => {
    if (!importTitle.trim()) return toast.warning('Vui lòng nhập tên học phần Kanji!');
    if (!importText.trim()) return toast.warning('Vui lòng nhập nội dung Import!');

    try {
      const res = await api.post('/kanji-sets/bulk-import', {
        title: importTitle.trim(),
        raw_text: importText,
        folder_path: importFolderPath.trim(),
      });
      toast.success(res.data.message);
      setImportTitle('');
      setImportText('');
      setIsImportExpanded(false);
      await fetchAllKanjiData();
      fetchSets(false, true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Lỗi tạo học phần. Hãy kiểm tra lại định dạng.');
    }
  };

  const handleAddSingleKanji = async (setId) => {
    if (!newKanjiChar.trim() || !newMeaning.trim()) {
      return toast.warning('Vui lòng nhập ít nhất Chữ Hán và Ý nghĩa!');
    }
    try {
      await api.post('/kanji', {
        kanji: newKanjiChar.trim(),
        hanviet: newHanviet.trim(),
        hiragana: newHiragana.trim(),
        meaning: newMeaning.trim(),
        set_id: setId,
      });
      toast.success('Đã thêm chữ Kanji mới!');
      setAddingToSetId(null);
      setNewKanjiChar('');
      setNewHanviet('');
      setNewHiragana('');
      setNewMeaning('');
      await fetchAllKanjiData();
      if (expandedSets[setId]) {
        const res = await api.get(`/kanji-sets/${setId}`);
        setKanjiSets((prev) =>
          prev.map((s) => (s.id === setId ? { ...s, kanjis: res.data.kanjis } : s))
        );
      }
      fetchSets(false, true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi thêm Kanji!');
    }
  };

  const handleDeleteSet = async (e, setId, title) => {
    e.stopPropagation();
    if (window.confirm(`Xóa toàn bộ học phần "${title}"?`)) {
      try {
        await api.delete(`/kanji-sets/${setId}`);
        toast.success('Đã xóa học phần!');
        await fetchAllKanjiData();
        fetchSets(false, true);
      } catch (error) {
        toast.error('Xóa thất bại!');
      }
    }
  };

  const handleDeleteKanji = async (kanjiId) => {
    if (window.confirm('Xóa chữ Kanji này?')) {
      try {
        await api.delete(`/kanji/${kanjiId}`);
        toast.success('Đã xóa chữ Kanji!');
        if (selectedKanjiDetail?.id === kanjiId) {
          setSelectedKanjiDetail(null);
        }
        await fetchAllKanjiData();
        setKanjiSets((prev) =>
          prev.map((s) =>
            s.kanjis ? { ...s, kanjis: s.kanjis.filter((k) => k.id !== kanjiId) } : s
          )
        );
        fetchSets(false, true);
      } catch (error) {
        toast.error('Lỗi xóa chữ Kanji');
      }
    }
  };

  const handleUpdateSuccess = async (updatedKanji) => {
    setEditingKanji(null);
    toast.success('Cập nhật thành công!');
    await fetchAllKanjiData();
    if (selectedKanjiDetail && selectedKanjiDetail.id === updatedKanji.id) {
      setSelectedKanjiDetail((prev) => ({
        ...prev,
        kanji: updatedKanji.kanji,
        hanviet: updatedKanji.hanviet,
        hiragana: updatedKanji.hiragana,
        meaning: updatedKanji.meaning,
      }));
    }
    setKanjiSets((prev) =>
      prev.map((s) =>
        s.kanjis
          ? {
              ...s,
              kanjis: s.kanjis.map((k) => (k.id === updatedKanji.id ? updatedKanji : k)),
            }
          : s
      )
    );
    fetchSets(false, true);
  };

  const handleDownloadKanji = async (e, set, format) => {
    e.stopPropagation();

    let kanjisToExport = set.kanjis;
    if (!kanjisToExport || kanjisToExport.length === 0) {
      try {
        const res = await api.get(`/kanji-sets/${set.id}`);
        kanjisToExport = res.data.kanjis;
      } catch (error) {
        toast.error('Lỗi tải dữ liệu để xuất file!');
        return;
      }
    }

    if (!kanjisToExport || kanjisToExport.length === 0) {
      toast.warning('Học phần này chưa có chữ Kanji!');
      return;
    }

    let content = '';
    const filename = `${set.title.replace(/[/\\?%*:|"<>]/g, '-')}.${format}`;

    if (format === 'txt') {
      content = kanjisToExport
        .map((k) => `${k.kanji} | ${k.hanviet} | ${k.hiragana} | ${k.meaning}`)
        .join('\n');
    } else if (format === 'csv') {
      content =
        '\uFEFFChữ Hán,Hán Việt,Cách đọc,Ý nghĩa\n' +
        kanjisToExport
          .map(
            (k) =>
              `"${(k.kanji || '').replace(/"/g, '""')}","${(k.hanviet || '').replace(
                /"/g,
                '""'
              )}","${(k.hiragana || '').replace(/"/g, '""')}","${(k.meaning || '').replace(
                /"/g,
                '""'
              )}"`
          )
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

  const handleCreateFolder = async () => {
    const newFolder = window.prompt('Nhập tên thư mục Kanji mới:');
    if (newFolder && newFolder.trim()) {
      const folderName = newFolder.trim();
      const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      if (!customFolders.includes(fullPath) && !allExistingFolders.includes(fullPath)) {
        try {
          await api.post('/kanji-sets/bulk-import', {
            title: `_Thư mục: ${folderName}_`,
            raw_text: ' ',
            folder_path: fullPath,
          });
          setCustomFolders([...customFolders, fullPath]);
          toast.success(`Đã tạo thư mục: ${folderName}`);
          fetchAllKanjiData();
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
        `Xóa thư mục "${folderName}" sẽ xóa TOÀN BỘ các học phần Kanji bên trong. Chắc chắn chứ?`
      )
    ) {
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
        await fetchAllKanjiData();
        fetchSets(false, true);
      } catch (error) {
        toast.error('Có lỗi xảy ra khi xóa thư mục!');
      }
    }
  };

  const toggleSet = async (setId) => {
    if (expandedSets[setId]) {
      setExpandedSets((prev) => ({ ...prev, [setId]: false }));
      return;
    }

    const targetSet = kanjiSets.find((s) => s.id === setId);
    if (targetSet && (!targetSet.kanjis || targetSet.kanjis.length === 0)) {
      try {
        const res = await api.get(`/kanji-sets/${setId}`);
        setKanjiSets((prev) =>
          prev.map((s) => (s.id === setId ? { ...s, kanjis: res.data.kanjis } : s))
        );
      } catch (error) {
        toast.error('Lỗi tải chi tiết Kanji!');
      }
    }
    setExpandedSets((prev) => ({ ...prev, [setId]: true }));
  };

  const allExistingFolders = Array.from(
    new Set([...kanjiSets.map((s) => s.folder_path).filter((p) => p), ...customFolders])
  ).sort();

  const validKanjiSets = useMemo(
    () => kanjiSets.filter((s) => !s.title?.startsWith('_Thư mục:')),
    [kanjiSets]
  );

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
  const displaySets = currentLevelSets.filter((set) => !set.title.startsWith('_Thư mục:'));

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="container-fluid mt-1 mb-5 mx-auto px-2 px-md-3" style={{ maxWidth: '1000px' }}>
      {editingKanji && (
        <EditKanjiModal
          kanjiItem={editingKanji}
          onClose={() => setEditingKanji(null)}
          onUpdateSuccess={handleUpdateSuccess}
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

      {/* MODAL CHI TIẾT CHỮ KANJI & TỪ GHÉP LIÊN QUAN */}
      <AnimatePresence>
        {selectedKanjiDetail && (
          <motion.div
            className="set-sheet-backdrop"
            style={{ zIndex: 2050 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedKanjiDetail(null)}
          >
            <motion.div
              className="card border-0 shadow-lg rounded-4 p-4 bg-white overflow-hidden"
              style={{ width: '94%', maxWidth: '540px', maxHeight: '86vh', overflowY: 'auto' }}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-start mb-3">
                <span className="badge chip-primary rounded-pill px-3 py-1">
                  ⛩️ {selectedKanjiDetail.set_title || 'Hán tự'}
                </span>
                <button
                  type="button"
                  className="btn-icon-soft chip-slate"
                  onClick={() => setSelectedKanjiDetail(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-center py-3 px-2 rounded-4 bg-light border mb-3">
                <div
                  className="fw-bold text-dark mb-2"
                  style={{
                    fontSize: 'clamp(3.2rem, 10vw, 4.5rem)',
                    fontFamily: 'var(--font-jp-serif)',
                    lineHeight: 1.15,
                  }}
                >
                  {selectedKanjiDetail.kanji}
                </div>

                {selectedKanjiDetail.hanviet && (
                  <div className="d-inline-block vocab-hanviet-pill px-3 py-1 mb-2 fs-6">
                    {selectedKanjiDetail.hanviet}
                  </div>
                )}

                {selectedKanjiDetail.hiragana && (
                  <div className="fw-bold text-info fs-5 mb-1">
                    {selectedKanjiDetail.hiragana}
                  </div>
                )}

                <div className="fw-bold text-dark fs-4 mt-1">
                  {selectedKanjiDetail.meaning}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  className="btn btn-mobile-chip chip-primary flex-fill py-2"
                  onClick={() =>
                    speakText(
                      selectedKanjiDetail.hiragana || selectedKanjiDetail.kanji,
                      'ja'
                    )
                  }
                >
                  <Volume2 size={15} /> <span>Nghe phát âm</span>
                </button>
                <button
                  type="button"
                  className="btn btn-mobile-chip chip-slate flex-fill py-2"
                  onClick={() =>
                    setNoteModalVocab({
                      word: selectedKanjiDetail.kanji,
                      hanviet: selectedKanjiDetail.hanviet,
                      hiragana: selectedKanjiDetail.hiragana,
                      meaning: selectedKanjiDetail.meaning,
                      language: 'ja',
                    })
                  }
                >
                  <BookMarked size={15} /> <span>Lưu Sổ tay</span>
                </button>
                <button
                  type="button"
                  className="btn btn-mobile-chip chip-slate"
                  onClick={() => setEditingKanji(selectedKanjiDetail)}
                >
                  <Edit3 size={14} /> <span>Sửa</span>
                </button>
                <button
                  type="button"
                  className="btn btn-mobile-chip chip-danger"
                  onClick={() => handleDeleteKanji(selectedKanjiDetail.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div>
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <BookOpen size={16} className="text-primary" />
                  <span>Từ ghép / Từ vựng liên quan ({relatedCompounds.length})</span>
                </h6>
                {relatedCompounds.length === 0 ? (
                  <div className="text-muted small fst-italic p-3 rounded-3 bg-light text-center">
                    Chưa có từ vựng nào chứa chữ Hán này trong thư viện của bạn.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {relatedCompounds.map((v) => (
                      <div
                        key={v.id}
                        className="smooth-list-item-inner p-2 px-3 m-0 d-flex justify-content-between align-items-center gap-2"
                      >
                        <div className="overflow-hidden">
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <span
                              className="fw-bold text-dark"
                              style={{ fontFamily: 'var(--font-jp-serif)', fontSize: '1.05rem' }}
                            >
                              {v.word}
                            </span>
                            {v.hiragana && <span className="vocab-kana-pill">{v.hiragana}</span>}
                            {v.hanviet && <span className="vocab-hanviet-pill">{v.hanviet}</span>}
                          </div>
                          <div className="small text-secondary fw-semibold mt-1">{v.meaning}</div>
                        </div>
                        <button
                          type="button"
                          className="btn-icon-soft chip-slate flex-shrink-0"
                          onClick={() => speakText(v.word, v.language || 'ja')}
                          title="Nghe phát âm"
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO BANNER & SEGMENTED SWITCHER */}
      <div className="dashboard-hero-card p-3 p-md-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill dashboard-hero-badge mb-2">
              <Sparkles size={14} />
              <span>{allKanjis.length} chữ Kanji • {validKanjiSets.length} học phần</span>
            </div>
            <h4 className="fw-bold text-white mb-0">⛩️ Từ điển & Kho Hán Tự</h4>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className={`cloud-pill-btn ${activeTab === 'dictionary' ? 'bg-white text-primary' : ''}`}
              style={activeTab === 'dictionary' ? { color: '#4c1d95', background: '#ffffff' } : {}}
              onClick={() => setActiveTab('dictionary')}
            >
              🔍 Tra cứu Từ điển
            </button>
            <button
              type="button"
              className={`cloud-pill-btn ${activeTab === 'manage' ? 'bg-white text-primary' : ''}`}
              style={activeTab === 'manage' ? { color: '#4c1d95', background: '#ffffff' } : {}}
              onClick={() => setActiveTab('manage')}
            >
              📂 Quản lý Học phần ({validKanjiSets.length})
            </button>
          </div>
        </div>

        {activeTab === 'dictionary' && (
          <div className="dashboard-search-box d-flex align-items-center px-3 py-1">
            <Search size={18} className="text-muted me-2" />
            <input
              type="text"
              className="form-control border-0 py-2 fw-semibold text-dark shadow-none bg-transparent"
              placeholder="Tìm nhanh theo chữ Hán (家族), âm Hán Việt (GIA TỘC), Hiragana hoặc nghĩa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-sm text-muted border-0 py-1 px-2"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'dictionary' ? (
        <>
          {/* BỘ LỌC THEO HỌC PHẦN & BẢNG CHỮ CÁI ÂM HÁN VIỆT */}
          <div className="card border-0 rounded-4 p-3 mb-3 bg-white">
            <div className="row g-2 align-items-center mb-2">
              <div className="col-12 col-md-5">
                <select
                  className="form-select form-select-sm bg-light border-0 fw-bold text-dark py-2 rounded-3"
                  value={selectedSetFilter}
                  onChange={(e) => setSelectedSetFilter(e.target.value)}
                >
                  <option value="all">📚 Tất cả học phần Kanji ({allKanjis.length} chữ)</option>
                  {validKanjiSets.map((s) => (
                    <option key={s.id} value={s.id}>
                      ⛩️ {s.title} ({s.vocab_count} chữ)
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-7 text-md-end">
                <span className="text-muted small fw-semibold">
                  Hiển thị <strong>{filteredKanjis.length}</strong> chữ Hán phù hợp
                </span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1 overflow-auto no-scrollbar pt-1">
              {HANVIET_INITIALS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={`btn btn-mobile-chip flex-shrink-0 ${
                    selectedInitial === letter ? 'btn-primary text-white' : 'chip-slate'
                  }`}
                  style={{ minWidth: '36px', padding: '4px 10px' }}
                  onClick={() => setSelectedInitial(letter)}
                >
                  {letter === 'ALL' ? 'Tất cả' : letter}
                </button>
              ))}
            </div>
          </div>

          {/* LƯỚI Ô VUÔNG TỪ ĐIỂN KANJI */}
          {filteredKanjis.length === 0 ? (
            <div className="card border-0 rounded-4 p-5 text-center bg-white">
              <div className="fs-1 mb-2">⛩️</div>
              <h5 className="fw-bold text-dark">Không tìm thấy chữ Kanji nào</h5>
              <p className="text-muted small mb-3">
                Hãy thử đổi từ khóa tìm kiếm hoặc chuyển sang tab Quản lý Học phần để nạp thêm Kanji mới.
              </p>
              <div>
                <button
                  type="button"
                  className="btn btn-primary btn-mobile-chip px-4 py-2"
                  onClick={() => {
                    setActiveTab('manage');
                    setIsImportExpanded(true);
                  }}
                >
                  <Plus size={15} /> Thêm học phần Kanji ngay
                </button>
              </div>
            </div>
          ) : (
            <div className="kanji-dict-grid">
              {filteredKanjis.map((item) => (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.96 }}
                  className="kanji-dict-tile"
                  onClick={() => setSelectedKanjiDetail(item)}
                >
                  <div className="kanji-dict-char">{item.kanji}</div>
                  {item.hanviet && <div className="kanji-dict-hanviet">{item.hanviet}</div>}
                  <div className="kanji-dict-meaning">{item.meaning}</div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* CHẾ ĐỘ 2: QUẢN LÝ HỌC PHẦN KANJI */}
          <div className="card border-0 rounded-4 mb-3 overflow-hidden">
            <div
              className="card-header bg-white py-2 px-3 border-0 d-flex justify-content-between align-items-center rounded-4"
              style={{ cursor: 'pointer', minHeight: '48px' }}
              onClick={() => setIsImportExpanded(!isImportExpanded)}
            >
              <div className="d-flex align-items-center gap-2">
                <span
                  className="btn-icon-soft chip-primary"
                  style={{ width: '30px', height: '30px', minHeight: '30px' }}
                >
                  {isImportExpanded ? <Minus size={15} /> : <Plus size={15} />}
                </span>
                <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                  Tạo học phần Kanji mới (Dán nhanh 4 cột)
                </span>
              </div>
              <span className="btn-mobile-chip chip-slate">
                <span>{isImportExpanded ? 'Thu gọn' : 'Mở'}</span>
                <ChevronDown size={14} />
              </span>
            </div>

            {isImportExpanded && (
              <div className="card-body p-3 border-top bg-white">
                <input
                  type="text"
                  className="form-control mb-3 fw-bold bg-light border-0"
                  placeholder="Tên học phần (VD: Kanji N3 - Tuần 1)..."
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                />

                <div className="mb-3">
                  <label className="text-muted small fw-bold mb-1">THƯ MỤC LƯU TRỮ</label>
                  <select
                    className="form-select bg-light border-0 fw-semibold text-dark"
                    value={importFolderPath}
                    onChange={(e) => setImportFolderPath(e.target.value)}
                  >
                    <option value="">📁 Thư mục gốc (Mặc định)</option>
                    {allExistingFolders.map((folder) => (
                      <option key={folder} value={folder}>
                        📁 {folder}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="text-muted small fw-bold mb-1">
                    ĐỊNH DẠNG (4 Cột): Chữ Hán | Hán Việt | Cách đọc | Nghĩa
                  </label>
                  <textarea
                    className="form-control bg-light border-0 p-3 fw-semibold"
                    rows="5"
                    placeholder={'家族 | GIA TỘC | かぞく | Gia đình\n旅行 | LỮ HÀNH | りょこう | Du lịch'}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </div>

                <button className="btn btn-primary btn-touch w-100" onClick={handleImport}>
                  💾 Tạo học phần Kanji
                </button>
              </div>
            )}
          </div>

          {/* THANH ĐIỀU HƯỚNG THƯ MỤC */}
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
              onClick={handleCreateFolder}
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

          {/* DANH SÁCH HỌC PHẦN KANJI */}
          <div className="d-flex flex-column gap-2">
            {displaySets.length === 0 ? (
              <div className="text-center text-muted my-5 fw-semibold">
                Chưa có học phần Kanji nào trong thư mục này.
              </div>
            ) : (
              displaySets.map((set) => {
                const isExpanded = !!expandedSets[set.id];
                return (
                  <div key={set.id} className="card smooth-list-item overflow-hidden">
                    <div
                      className="p-3 d-flex justify-content-between align-items-center gap-2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleSet(set.id)}
                    >
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <span className="badge chip-primary rounded-pill">⛩️ KANJI</span>
                        <h6 className="mb-0 fw-bold text-dark">{set.title}</h6>
                        <span className="badge bg-light text-secondary border rounded-pill">
                          {set.vocab_count} chữ
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          className="btn btn-mobile-chip chip-slate"
                          onClick={(e) => handleDownloadKanji(e, set, 'txt')}
                        >
                          <Download size={13} /> <span>TXT</span>
                        </button>
                        <button
                          className="btn btn-mobile-chip chip-success"
                          onClick={(e) => handleDownloadKanji(e, set, 'csv')}
                        >
                          <Download size={13} /> <span>Excel</span>
                        </button>
                        <button
                          className="btn btn-mobile-chip chip-danger"
                          onClick={(e) => handleDeleteSet(e, set.id, set.title)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2 border-top bg-white">
                        {set.kanjis?.map((item) => (
                          <div key={item.id} className="smooth-list-item-inner p-2 px-3">
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <div className="d-flex align-items-center flex-wrap gap-2">
                                <span
                                  className="fw-bold text-dark"
                                  style={{
                                    fontSize: '1.35rem',
                                    fontFamily: 'var(--font-jp-serif)',
                                  }}
                                >
                                  {item.kanji}
                                </span>
                                {item.hanviet && (
                                  <span className="vocab-hanviet-pill">{item.hanviet}</span>
                                )}
                                {item.hiragana && (
                                  <span className="vocab-kana-pill">{item.hiragana}</span>
                                )}
                                <span className="fw-semibold text-secondary">{item.meaning}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <button
                                  type="button"
                                  className="btn-icon-soft chip-slate"
                                  onClick={() => speakText(item.hiragana || item.kanji, 'ja')}
                                >
                                  <Volume2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon-soft chip-slate"
                                  onClick={() => setEditingKanji(item)}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon-soft chip-danger"
                                  onClick={() => handleDeleteKanji(item.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {addingToSetId === set.id ? (
                          <div className="smooth-list-item-inner p-3 mt-2">
                            <div className="row g-2 mb-2">
                              <div className="col-6">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-white"
                                  placeholder="Chữ Hán (Kanji)"
                                  value={newKanjiChar}
                                  onChange={(e) => setNewKanjiChar(e.target.value)}
                                />
                              </div>
                              <div className="col-6">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-white"
                                  placeholder="Âm Hán Việt"
                                  value={newHanviet}
                                  onChange={(e) => setNewHanviet(e.target.value)}
                                />
                              </div>
                              <div className="col-6">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-white"
                                  placeholder="Cách đọc (Hiragana)"
                                  value={newHiragana}
                                  onChange={(e) => setNewHiragana(e.target.value)}
                                />
                              </div>
                              <div className="col-6">
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-white"
                                  placeholder="Ý nghĩa"
                                  value={newMeaning}
                                  onChange={(e) => setNewMeaning(e.target.value)}
                                />
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
                                onClick={() => handleAddSingleKanji(set.id)}
                              >
                                💾 Lưu Kanji
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-mobile-chip chip-primary w-100 mt-2 py-2"
                            onClick={() => setAddingToSetId(set.id)}
                          >
                            <Plus size={14} /> <span>Thêm chữ Kanji lẻ vào bộ này</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default KanjiDictionary;