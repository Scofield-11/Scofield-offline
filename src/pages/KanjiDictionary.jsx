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
} from 'lucide-react';
import { toast } from 'react-toastify';
import api, { exportSingleItemToJson } from '../api/axiosConfig';
import EditKanjiModal from '../components/EditKanjiModal';
import SaveNoteModal from '../components/SaveNoteModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
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

const ACCORDION_TRANSITION = { duration: 0.24, ease: [0.22, 1, 0.36, 1] };

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
  const [noteModalVocab, setNoteModalVocab] = useState(null);

  // State thêm nhanh 1 từ đi kèm trực tiếp trên thẻ Từ điển
  const [quickAddTargetId, setQuickAddTargetId] = useState(null);
  const [quickExWord, setQuickExWord] = useState('');
  const [quickExReading, setQuickExReading] = useState('');
  const [quickExMeaning, setQuickExMeaning] = useState('');

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
  const [newOnyomi, setNewOnyomi] = useState('');
  const [newKunyomi, setNewKunyomi] = useState('');
  const [newHanviet, setNewHanviet] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExamples, setNewExamples] = useState([{ word: '', reading: '', meaning: '' }]);

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

  // Lấy Âm On & Âm Kun từ bản ghi (tương thích cả dữ liệu cũ chỉ lưu hiragana)
  const extractReadings = (item) => {
    let on = item.onyomi || '';
    let kun = item.kunyomi || '';
    if (!on && !kun && item.hiragana) {
      const parts = item.hiragana.split('/').map((s) => s.trim());
      on = parts[0] || '';
      kun = parts.slice(1).join(', ') || '';
    }
    return { on, kun };
  };

  // Gộp danh sách từ đi kèm đã lưu + từ vựng liên quan tìm trong kho từ vựng
  const getCompoundsForKanji = (kanjiItem) => {
    const manualExamples = Array.isArray(kanjiItem.examples) ? kanjiItem.examples : [];
    const seenWords = new Set(manualExamples.map((ex) => (ex.word || '').trim()));

    const charStr = (kanjiItem.kanji || kanjiItem.word || '').trim();
    const targetChars = Array.from(charStr);
    const autoMatches = [];

    if (targetChars.length > 0) {
      for (const v of allVocabs) {
        if (!v.word || v.id === kanjiItem.id) continue;
        if (v.set_id === kanjiItem.set_id) continue;
        const w = v.word.trim();
        if (seenWords.has(w)) continue;
        if (targetChars.some((ch) => w.includes(ch))) {
          seenWords.add(w);
          autoMatches.push({
            word: w,
            reading: v.hiragana || '',
            meaning: v.meaning || '',
            isAutoLinked: true,
          });
          if (autoMatches.length >= 8) break;
        }
      }
    }

    return [...manualExamples, ...autoMatches];
  };

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
      const inExamples =
        Array.isArray(item.examples) &&
        item.examples.some(
          (ex) =>
            (ex.word && ex.word.toLowerCase().includes(q)) ||
            (ex.reading && ex.reading.toLowerCase().includes(q)) ||
            (ex.meaning && ex.meaning.toLowerCase().includes(q))
        );
      return (
        (item.kanji && item.kanji.toLowerCase().includes(q)) ||
        (item.onyomi && item.onyomi.toLowerCase().includes(q)) ||
        (item.kunyomi && item.kunyomi.toLowerCase().includes(q)) ||
        (item.hanviet && item.hanviet.toLowerCase().includes(q)) ||
        (item.hiragana && item.hiragana.toLowerCase().includes(q)) ||
        (item.meaning && item.meaning.toLowerCase().includes(q)) ||
        inExamples
      );
    });
  }, [allKanjis, searchQuery, selectedSetFilter, selectedInitial]);

  // Thêm nhanh 1 từ Kanji đi kèm ngay tại màn hình Từ điển
  const handleQuickAddExample = async (e, kanjiItem) => {
    e.preventDefault();
    if (!quickExWord.trim()) return toast.warning('Vui lòng nhập từ Kanji đi kèm!');

    const updatedExamples = [
      ...(Array.isArray(kanjiItem.examples) ? kanjiItem.examples : []),
      {
        word: quickExWord.trim(),
        reading: quickExReading.trim(),
        meaning: quickExMeaning.trim(),
      },
    ];

    try {
      const res = await api.put(`/kanji/${kanjiItem.id}`, {
        ...kanjiItem,
        examples: updatedExamples,
      });
      setAllKanjis((prev) =>
        prev.map((k) => (k.id === kanjiItem.id ? { ...k, ...res.data } : k))
      );
      setQuickAddTargetId(null);
      setQuickExWord('');
      setQuickExReading('');
      setQuickExMeaning('');
      toast.success('Đã thêm từ Kanji đi kèm!');
    } catch (error) {
      toast.error('Lỗi khi lưu từ đi kèm!');
    }
  };

  // Nhập hàng loạt học phần Kanji
  const handleImport = async (e) => {
    e.preventDefault();
    if (!importTitle.trim()) return toast.warning('Vui lòng nhập tên học phần Kanji!');
    if (!importText.trim()) return toast.warning('Vui lòng nhập nội dung Kanji!');

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
      await fetchSets(false, true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi tạo học phần Kanji');
    }
  };

  const toggleExpandSet = async (setId) => {
    if (expandedSets[setId]) {
      setExpandedSets((prev) => ({ ...prev, [setId]: false }));
      return;
    }
    try {
      const res = await api.get(`/kanji-sets/${setId}`);
      setKanjiSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, kanjis: res.data.kanjis || [] } : s))
      );
      setExpandedSets((prev) => ({ ...prev, [setId]: true }));
    } catch (err) {
      toast.error('Không thể tải chi tiết bộ Kanji');
    }
  };

  const handleDeleteKanjiSet = async (e, setId, title) => {
    e.stopPropagation();
    if (!window.confirm(`Xóa học phần Kanji "${title}"?`)) return;
    try {
      await api.delete(`/kanji-sets/${setId}`);
      toast.success('Đã xóa học phần Kanji!');
      await fetchAllKanjiData();
      await fetchSets(false, true);
    } catch (err) {
      toast.error('Lỗi khi xóa học phần Kanji');
    }
  };

  const handleDeleteSingleKanji = async (kanjiId, setId) => {
    if (!window.confirm('Bạn muốn xóa chữ Kanji này?')) return;
    try {
      await api.delete(`/kanji/${kanjiId}`);
      toast.success('Đã xóa chữ Kanji!');
      await fetchAllKanjiData();
      if (setId && expandedSets[setId]) {
        const res = await api.get(`/kanji-sets/${setId}`);
        setKanjiSets((prev) =>
          prev.map((s) => (s.id === setId ? { ...s, kanjis: res.data.kanjis || [] } : s))
        );
      }
      await fetchSets(false, true);
    } catch (err) {
      toast.error('Lỗi khi xóa Kanji');
    }
  };

  const handleAddSingleKanji = async (e, setId) => {
    e.preventDefault();
    if (!newKanjiChar.trim()) return toast.warning('Vui lòng nhập Chữ Hán!');
    const cleanEx = newExamples
      .map((ex) => ({
        word: ex.word.trim(),
        reading: ex.reading.trim(),
        meaning: ex.meaning.trim(),
      }))
      .filter((ex) => ex.word);

    try {
      await api.post('/kanji', {
        kanji: newKanjiChar.trim(),
        onyomi: newOnyomi.trim(),
        kunyomi: newKunyomi.trim(),
        hanviet: newHanviet.trim(),
        meaning: newMeaning.trim() || newHanviet.trim() || newKanjiChar.trim(),
        examples: cleanEx,
        set_id: setId,
      });
      toast.success('Đã thêm chữ Hán mới!');
      setNewKanjiChar('');
      setNewOnyomi('');
      setNewKunyomi('');
      setNewHanviet('');
      setNewMeaning('');
      setNewExamples([{ word: '', reading: '', meaning: '' }]);
      setAddingToSetId(null);

      await fetchAllKanjiData();
      const res = await api.get(`/kanji-sets/${setId}`);
      setKanjiSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, kanjis: res.data.kanjis || [] } : s))
      );
      await fetchSets(false, true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi thêm Kanji');
    }
  };

  const allExistingFolders = useMemo(() => {
    return Array.from(
      new Set([
        ...kanjiSets.map((s) => s.folder_path).filter(Boolean),
        ...customFolders,
      ])
    ).sort();
  }, [kanjiSets, customFolders]);

  const validKanjiSets = useMemo(
    () => kanjiSets.filter((s) => !s.title?.startsWith('_Thư mục:')),
    [kanjiSets]
  );

  if (isLoading) return <LoadingSkeleton />;

  const bulkPlaceholder = `食 | ショク | た.べる, く.う | THỰC - Ăn
- 食べる | たべる | Ăn
- 食事 | しょくじ | Bữa ăn
- 食堂 | しょくどう | Nhà ăn
見 | ケン | み.る | KIẾN - Nhìn, xem
- 見る | みる | Nhìn, xem
- 意見 | いけん | Ý kiến`;

  return (
    <div className="container-fluid mt-1 mb-5 mx-auto px-2 px-md-3" style={{ maxWidth: '1000px' }}>
      {editingKanji && (
        <EditKanjiModal
          kanjiItem={editingKanji}
          onClose={() => setEditingKanji(null)}
          onUpdateSuccess={async (updated) => {
            setEditingKanji(null);
            toast.success('Đã cập nhật chữ Kanji!');
            await fetchAllKanjiData();
            if (updated?.kanji_set_id && expandedSets[updated.kanji_set_id]) {
              const res = await api.get(`/kanji-sets/${updated.kanji_set_id}`);
              setKanjiSets((prev) =>
                prev.map((s) =>
                  s.id === updated.kanji_set_id ? { ...s, kanjis: res.data.kanjis || [] } : s
                )
              );
            }
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

      {/* HEADER & CHUYỂN TAB */}
      <div className="dashboard-hero-card p-3 p-md-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h4 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
              <span>⛩️ Từ điển & Học phần Kanji</span>
            </h4>
            <div className="text-white opacity-75 small">
              Tổng cộng {allKanjis.length} chữ Hán trong {validKanjiSets.length} học phần
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className={`btn btn-mobile-chip ${
                activeTab === 'dictionary' ? 'bg-white text-primary fw-bold' : 'cloud-pill-btn'
              }`}
              onClick={() => setActiveTab('dictionary')}
            >
              📖 Từ điển Kanji
            </button>
            <button
              type="button"
              className={`btn btn-mobile-chip ${
                activeTab === 'manage' ? 'bg-white text-primary fw-bold' : 'cloud-pill-btn'
              }`}
              onClick={() => setActiveTab('manage')}
            >
              🗂️ Quản lý & Thêm mới ({validKanjiSets.length})
            </button>
          </div>
        </div>

        {activeTab === 'dictionary' && (
          <div className="row g-2">
            <div className="col-12 col-md-8">
              <div className="dashboard-search-box d-flex align-items-center px-3 py-1">
                <Search size={18} className="text-muted me-2" />
                <input
                  type="text"
                  className="form-control border-0 py-2 fw-semibold text-dark shadow-none bg-transparent"
                  placeholder="Tìm theo chữ Hán, Âm On, Âm Kun, Hán Việt hoặc từ ghép..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="btn btn-sm text-muted border-0 py-1 px-2"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select border-0 fw-bold text-dark h-100 py-2 px-3 rounded-4 shadow-sm"
                value={selectedSetFilter}
                onChange={(e) => setSelectedSetFilter(e.target.value)}
              >
                <option value="all">📚 Tất cả học phần ({allKanjis.length} chữ)</option>
                {validKanjiSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    ⛩️ {s.title} ({s.vocab_count || 0} chữ)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: CHẾ ĐỘ TỪ ĐIỂN KANJI (1 CHỮ HÁN TO + ÂM ON/KUN Ở DƯỚI + TỪ ĐI KÈM BÊN CẠNH) */}
      {activeTab === 'dictionary' && (
        <>
          {/* Thanh lọc nhanh theo chữ cái Hán Việt */}
          <div className="d-flex align-items-center gap-1 overflow-auto no-scrollbar mb-3 pb-1">
            {HANVIET_INITIALS.map((letter) => (
              <button
                key={letter}
                type="button"
                className={`btn btn-mobile-chip flex-shrink-0 px-3 ${
                  selectedInitial === letter ? 'btn-primary text-white' : 'chip-slate'
                }`}
                onClick={() => setSelectedInitial(letter)}
              >
                {letter === 'ALL' ? 'Tất cả' : letter}
              </button>
            ))}
          </div>

          {filteredKanjis.length === 0 ? (
            <EmptyState
              title="Chưa có chữ Kanji nào"
              message="Hãy chuyển sang tab 'Quản lý & Thêm mới' để tạo học phần Kanji đầu tiên của bạn!"
            />
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredKanjis.map((item) => {
                const { on, kun } = extractReadings(item);
                const compounds = getCompoundsForKanji(item);
                const isAddingQuick = quickAddTargetId === item.id;

                return (
                  <div
                    key={item.id}
                    className="card border-0 rounded-4 shadow-sm overflow-hidden kanji-dict-entry-card"
                  >
                    <div className="row g-0 align-items-stretch">
                      {/* CỘT TRÁI: 1 CHỮ HÁN TO ĐỨNG MỘT MÌNH + Ở DƯỚI LÀ ÂM ON & ÂM KUN */}
                      <div className="col-12 col-md-4 kanji-dict-left-pane p-3 p-md-4 d-flex flex-column justify-content-between">
                        <div className="d-flex justify-content-between align-items-center w-100 mb-2">
                          <span
                            className="badge chip-primary rounded-pill text-truncate"
                            style={{ maxWidth: '160px', fontSize: '0.7rem' }}
                          >
                            {item.set_title}
                          </span>
                          <div className="d-flex align-items-center gap-1">
                            <button
                              type="button"
                              className="btn-icon-soft chip-slate"
                              style={{ width: '30px', height: '30px', minHeight: '30px' }}
                              onClick={() => speakText(item.kanji, 'ja-JP')}
                              title="Nghe phát âm chữ Hán"
                            >
                              <Volume2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-soft chip-slate"
                              style={{ width: '30px', height: '30px', minHeight: '30px' }}
                              onClick={() => setEditingKanji(item)}
                              title="Chỉnh sửa chữ Hán & từ đi kèm"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-soft chip-danger"
                              style={{ width: '30px', height: '30px', minHeight: '30px' }}
                              onClick={() => handleDeleteSingleKanji(item.id, item.set_id)}
                              title="Xóa chữ Hán"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Ô Chữ Hán To Đứng Một Mình */}
                        <div className="text-center my-2 py-2">
                          <div className="kanji-dict-big-char mx-auto">
                            {item.kanji}
                          </div>
                          {(item.hanviet || item.meaning) && (
                            <div className="mt-2 d-flex flex-wrap justify-content-center align-items-center gap-1">
                              {item.hanviet && (
                                <span className="vocab-hanviet-pill">{item.hanviet}</span>
                              )}
                              {item.meaning && item.meaning !== item.hanviet && (
                                <span className="text-secondary small fw-bold">
                                  {item.meaning}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Khung Âm Ôn (Onyomi) & Âm Kun (Kunyomi) ở dưới */}
                        <div className="kanji-readings-box rounded-3 p-2 mt-2">
                          <div className="d-flex align-items-baseline gap-2 py-1 border-bottom border-secondary-subtle">
                            <span className="kanji-reading-badge on-badge">Âm Ôn</span>
                            <span className="fw-bold text-dark small text-break">
                              {on || '—'}
                            </span>
                          </div>
                          <div className="d-flex align-items-baseline gap-2 py-1">
                            <span className="kanji-reading-badge kun-badge">Âm Kun</span>
                            <span className="fw-bold text-dark small text-break">
                              {kun || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CỘT PHẢI: DANH SÁCH CÁC CHỮ KANJI ĐI KÈM CÙNG PHIÊN ÂM & Ý NGHĨA */}
                      <div className="col-12 col-md-8 p-3 p-md-4 d-flex flex-column justify-content-between kanji-dict-right-pane">
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                            <span className="fw-bold text-muted small">
                              DANH SÁCH TỪ KANJI ĐI KÈM ({compounds.length})
                            </span>
                            <button
                              type="button"
                              className="btn btn-mobile-chip chip-primary py-1 px-2"
                              onClick={() => {
                                if (isAddingQuick) {
                                  setQuickAddTargetId(null);
                                } else {
                                  setQuickAddTargetId(item.id);
                                  setQuickExWord(item.kanji || '');
                                  setQuickExReading('');
                                  setQuickExMeaning('');
                                }
                              }}
                            >
                              <Plus size={13} />
                              <span>{isAddingQuick ? 'Đóng' : 'Thêm từ đi kèm'}</span>
                            </button>
                          </div>

                          {/* Form thêm nhanh 1 từ đi kèm */}
                          {isAddingQuick && (
                            <form
                              onSubmit={(e) => handleQuickAddExample(e, item)}
                              className="p-2 mb-2 rounded-3 bg-light border"
                            >
                              <div className="row g-2 align-items-center">
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm bg-white fw-bold text-dark"
                                    placeholder="Từ Kanji (VD: 食べる)"
                                    value={quickExWord}
                                    onChange={(e) => setQuickExWord(e.target.value)}
                                    autoFocus
                                    required
                                  />
                                </div>
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm bg-white text-dark"
                                    placeholder="Phiên âm (VD: たべる)"
                                    value={quickExReading}
                                    onChange={(e) => setQuickExReading(e.target.value)}
                                  />
                                </div>
                                <div className="col-4 d-flex gap-1">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm bg-white text-dark"
                                    placeholder="Ý nghĩa (VD: Ăn)"
                                    value={quickExMeaning}
                                    onChange={(e) => setQuickExMeaning(e.target.value)}
                                  />
                                  <button
                                    type="submit"
                                    className="btn btn-sm btn-primary text-white fw-bold px-2 flex-shrink-0"
                                  >
                                    Lưu
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}

                          {/* Danh sách các từ ghép Kanji đi kèm */}
                          {compounds.length === 0 ? (
                            <div className="text-muted small fst-italic py-3 text-center">
                              Chưa có từ ghép đi kèm. Bấm "+ Thêm từ đi kèm" để bổ sung.
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-2">
                              {compounds.map((comp, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="kanji-compound-row d-flex justify-content-between align-items-center gap-2 p-2 px-3 rounded-3"
                                >
                                  <div className="d-flex flex-wrap align-items-baseline gap-2" style={{ minWidth: 0, flex: 1 }}>
                                    <span
                                      className="fw-bold text-dark"
                                      style={{
                                        fontSize: '1.15rem',
                                        fontFamily: 'var(--font-jp-serif)',
                                      }}
                                    >
                                      {comp.word}
                                    </span>
                                    {comp.reading && (
                                      <span className="vocab-kana-pill">{comp.reading}</span>
                                    )}
                                    <span className="text-secondary fw-semibold small text-break">
                                      — {comp.meaning}
                                    </span>
                                  </div>

                                  <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      className="btn-icon-soft chip-slate"
                                      style={{ width: '30px', height: '30px', minHeight: '30px' }}
                                      onClick={() => speakText(comp.word, 'ja-JP')}
                                      title="Nghe phát âm từ ghép"
                                    >
                                      <Volume2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon-soft chip-primary"
                                      style={{ width: '30px', height: '30px', minHeight: '30px' }}
                                      onClick={() =>
                                        setNoteModalVocab({
                                          word: comp.word,
                                          hanviet: item.hanviet || '',
                                          hiragana: comp.reading || '',
                                          meaning: comp.meaning || '',
                                          language: 'ja',
                                        })
                                      }
                                      title="Lưu từ ghép này vào Sổ tay"
                                    >
                                      <BookMarked size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: QUẢN LÝ HỌC PHẦN & THÊM MỚI KANJI */}
      {activeTab === 'manage' && (
        <div>
          {/* Form tạo bộ Kanji mới */}
          <div className="card border-0 rounded-4 mb-3 overflow-hidden shadow-sm">
            <div
              className="card-header bg-white py-2 px-3 border-0 d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer', minHeight: '48px' }}
              onClick={() => setIsImportExpanded(!isImportExpanded)}
            >
              <div className="d-flex align-items-center gap-2">
                <span className="btn-icon-soft chip-primary" style={{ width: '30px', height: '30px' }}>
                  {isImportExpanded ? <Minus size={15} /> : <Plus size={15} />}
                </span>
                <span className="fw-bold text-dark">Tạo học phần Kanji mới</span>
              </div>
              <span className="btn-mobile-chip chip-slate">
                <span>{isImportExpanded ? 'Thu gọn' : 'Mở'}</span>
                <ChevronDown size={14} />
              </span>
            </div>

            <AnimatePresence initial={false}>
              {isImportExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={ACCORDION_TRANSITION}
                  style={{ overflow: 'hidden' }}
                >
                  <form onSubmit={handleImport} className="card-body p-3 border-top">
                    <div className="row g-2 mb-3">
                      <div className="col-12 col-md-7">
                        <label className="text-muted small fw-bold mb-1">TÊN HỌC PHẦN KANJI</label>
                        <input
                          type="text"
                          className="form-control bg-light border-0 fw-bold text-dark"
                          placeholder="VD: Kanji N4 - Bài 1..."
                          value={importTitle}
                          onChange={(e) => setImportTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-5">
                        <label className="text-muted small fw-bold mb-1">THƯ MỤC</label>
                        <input
                          type="text"
                          className="form-control bg-light border-0 fw-semibold text-dark"
                          placeholder="Để trống nếu ở thư mục gốc..."
                          list="kanjiFoldersList"
                          value={importFolderPath}
                          onChange={(e) => setImportFolderPath(e.target.value)}
                        />
                        <datalist id="kanjiFoldersList">
                          {allExistingFolders.map((f) => (
                            <option key={f} value={f} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-muted small fw-bold mb-1 d-block">
                        ĐỊNH DẠNG NHẬP TỪ ĐIỂN KANJI (Dòng chính: Chữ Hán | Âm On | Âm Kun | Nghĩa • Dòng phụ bắt đầu bằng dấu '-' là từ Kanji đi kèm)
                      </label>
                      <textarea
                        className="form-control bg-light border-0 p-3 text-dark"
                        rows="7"
                        placeholder={bulkPlaceholder}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        style={{ lineHeight: '1.55', fontFamily: 'monospace' }}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-touch w-100">
                      💾 Lưu học phần Kanji
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Danh sách các bộ Kanji */}
          {validKanjiSets.length === 0 ? (
            <EmptyState
              title="Chưa có học phần Kanji"
              message="Hãy bấm vào 'Tạo học phần Kanji mới' ở phía trên để bắt đầu!"
            />
          ) : (
            <div className="d-flex flex-column gap-2">
              {validKanjiSets.map((kSet) => {
                const isExpanded = !!expandedSets[kSet.id];
                const isAddingHere = addingToSetId === kSet.id;

                return (
                  <div key={kSet.id} className="card smooth-list-item overflow-hidden">
                    <div
                      className="p-3 d-flex justify-content-between align-items-center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleExpandSet(kSet.id)}
                    >
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <span className="fs-5">⛩️</span>
                        <h6 className="mb-0 fw-bold text-dark">{kSet.title}</h6>
                        <span className="badge bg-light text-secondary border rounded-pill">
                          {kSet.vocab_count || 0} chữ Hán
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn-icon-soft chip-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSingleItemToJson('set', kSet.id);
                          }}
                          title="Xuất JSON"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-soft chip-danger"
                          onClick={(e) => handleDeleteKanjiSet(e, kSet.id, kSet.title)}
                          title="Xóa bộ Kanji"
                        >
                          <Trash2 size={15} />
                        </button>
                        <span className="btn-icon-soft chip-slate">
                          <ChevronDown size={16} />
                        </span>
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
                          <div className="p-3 pt-2 border-top bg-white">
                            {Array.isArray(kSet.kanjis) &&
                              kSet.kanjis.map((kItem) => {
                                const { on, kun } = extractReadings(kItem);
                                return (
                                  <div
                                    key={kItem.id}
                                    className="smooth-list-item-inner p-2 px-3 d-flex justify-content-between align-items-center gap-2"
                                  >
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div className="d-flex align-items-center flex-wrap gap-2">
                                        <span
                                          className="fw-bold text-dark"
                                          style={{
                                            fontSize: '1.35rem',
                                            fontFamily: 'var(--font-jp-serif)',
                                          }}
                                        >
                                          {kItem.kanji}
                                        </span>
                                        {on && <span className="vocab-kana-pill">On: {on}</span>}
                                        {kun && <span className="vocab-kana-pill">Kun: {kun}</span>}
                                        {kItem.hanviet && (
                                          <span className="vocab-hanviet-pill">{kItem.hanviet}</span>
                                        )}
                                      </div>
                                      <div className="small text-secondary mt-1">
                                        {kItem.meaning}
                                        {Array.isArray(kItem.examples) && kItem.examples.length > 0 && (
                                          <span className="ms-2 text-primary fw-semibold">
                                            • {kItem.examples.length} từ ghép đi kèm
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="d-flex gap-1">
                                      <button
                                        type="button"
                                        className="btn-icon-soft chip-slate"
                                        onClick={() => setEditingKanji(kItem)}
                                      >
                                        <Edit3 size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-icon-soft chip-danger"
                                        onClick={() => handleDeleteSingleKanji(kItem.id, kSet.id)}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                            {/* Form thêm lẻ 1 chữ Hán mới chuẩn cấu trúc từ điển */}
                            {isAddingHere ? (
                              <form
                                onSubmit={(e) => handleAddSingleKanji(e, kSet.id)}
                                className="smooth-list-item-inner p-3 mt-2"
                              >
                                <h6 className="fw-bold text-dark mb-2">
                                  + Thêm 1 chữ Hán mới vào học phần
                                </h6>
                                <div className="row g-2 mb-2">
                                  <div className="col-4">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-white fw-bold text-center text-dark"
                                      placeholder="Chữ Hán (VD: 食)"
                                      value={newKanjiChar}
                                      onChange={(e) => setNewKanjiChar(e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div className="col-4">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-white text-dark"
                                      placeholder="Hán Việt (VD: THỰC)"
                                      value={newHanviet}
                                      onChange={(e) => setNewHanviet(e.target.value)}
                                    />
                                  </div>
                                  <div className="col-4">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-white text-dark"
                                      placeholder="Nghĩa gốc (VD: Ăn)"
                                      value={newMeaning}
                                      onChange={(e) => setNewMeaning(e.target.value)}
                                    />
                                  </div>
                                </div>

                                <div className="row g-2 mb-2">
                                  <div className="col-6">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-white text-dark"
                                      placeholder="Âm Ôn (VD: ショク)"
                                      value={newOnyomi}
                                      onChange={(e) => setNewOnyomi(e.target.value)}
                                    />
                                  </div>
                                  <div className="col-6">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm bg-white text-dark"
                                      placeholder="Âm Kun (VD: た.べる)"
                                      value={newKunyomi}
                                      onChange={(e) => setNewKunyomi(e.target.value)}
                                    />
                                  </div>
                                </div>

                                <div className="mb-2">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="small fw-bold text-muted">
                                      Từ Kanji đi kèm (Từ ghép - Phiên âm - Ý nghĩa)
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-mobile-chip chip-primary py-0 px-2"
                                      onClick={() =>
                                        setNewExamples((prev) => [
                                          ...prev,
                                          { word: '', reading: '', meaning: '' },
                                        ])
                                      }
                                    >
                                      + Thêm dòng
                                    </button>
                                  </div>
                                  {newExamples.map((ex, idx) => (
                                    <div key={idx} className="d-flex gap-1 mb-1">
                                      <input
                                        type="text"
                                        className="form-control form-control-sm bg-white fw-bold text-dark"
                                        placeholder="Từ Kanji (食べる)"
                                        value={ex.word}
                                        onChange={(e) =>
                                          setNewExamples((prev) =>
                                            prev.map((item, i) =>
                                              i === idx ? { ...item, word: e.target.value } : item
                                            )
                                          )
                                        }
                                      />
                                      <input
                                        type="text"
                                        className="form-control form-control-sm bg-white text-dark"
                                        placeholder="Phiên âm (たべる)"
                                        value={ex.reading}
                                        onChange={(e) =>
                                          setNewExamples((prev) =>
                                            prev.map((item, i) =>
                                              i === idx ? { ...item, reading: e.target.value } : item
                                            )
                                          )
                                        }
                                      />
                                      <input
                                        type="text"
                                        className="form-control form-control-sm bg-white text-dark"
                                        placeholder="Ý nghĩa (Ăn)"
                                        value={ex.meaning}
                                        onChange={(e) =>
                                          setNewExamples((prev) =>
                                            prev.map((item, i) =>
                                              i === idx ? { ...item, meaning: e.target.value } : item
                                            )
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-2">
                                  <button
                                    type="button"
                                    className="btn btn-mobile-chip chip-slate"
                                    onClick={() => setAddingToSetId(null)}
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="submit"
                                    className="btn btn-mobile-chip btn-primary text-white"
                                  >
                                    💾 Lưu chữ Hán
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-mobile-chip chip-primary w-100 mt-2 py-2"
                                onClick={() => setAddingToSetId(kSet.id)}
                              >
                                <Plus size={15} /> <span>Thêm 1 chữ Hán mới</span>
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
      )}
    </div>
  );
}

export default KanjiDictionary;