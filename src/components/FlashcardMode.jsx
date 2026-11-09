import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3,
  Maximize2,
  Minimize2,
  Layers,
  FolderOpen,
  Volume2,
  PlayCircle,
  ArrowRight,
  ArrowLeft,
  Shuffle,
  Award,
  Eye,
  BookOpen,
  Clock,
  Zap,
  Check,
  Sparkles,
} from 'lucide-react';
import Flashcard from './Flashcard';
import SaveNoteModal from './SaveNoteModal';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import { playSound } from '../utils/audio';
import SetSelector from './SetSelector';
import GameModeSelector from './GameModeSelector';

const CARD_VARIANTS = {
  enter: (dir) => ({
    x: dir > 0 ? 48 : -48,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir) => ({
    x: dir > 0 ? -48 : 48,
    opacity: 0,
    scale: 0.96,
  }),
};

function FlashcardMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('');

  const targetSets = React.useMemo(() => {
    if (!sets || sets.length === 0) return [];
    if (!selectedSetId) return [];
    const validSets = sets.filter((s) => !s.title?.startsWith('_Thư mục:'));
    const idStr = String(selectedSetId);
    if (idStr.startsWith('multi_')) {
      const ids = idStr.replace('multi_', '').split(',').map(Number);
      return validSets.filter((s) => ids.includes(Number(s.id)));
    }
    if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      return validSets.filter((s) => (s.folder_path || '🏠 Thư mục gốc') === folderName);
    }
    const targetSet = validSets.find((s) => s.id == selectedSetId);
    return targetSet ? [targetSet] : [];
  }, [selectedSetId, sets]);

  const currentContentType =
    targetSets.length > 0 && targetSets.every((s) => s.type === 'kanji') ? 'kanji' : 'vocab';

  const currentLanguage = React.useMemo(() => {
    const idStr = String(selectedSetId);
    if (idStr.includes('zh')) return 'zh';
    if (idStr.includes('en')) return 'en';
    if (targetSets.length > 0 && targetSets.every((s) => s.language === 'zh')) return 'zh';
    if (targetSets.length > 0 && targetSets.every((s) => s.language === 'en')) return 'en';
    return 'ja';
  }, [selectedSetId, targetSets]);

  const hasFourFields = (() => {
    if (!selectedSetId) return true;
    if (currentContentType === 'kanji') return true;
    if (
      String(selectedSetId).includes('ja') ||
      String(selectedSetId).includes('zh') ||
      String(selectedSetId).includes('kanji')
    ) {
      return true;
    }
    if (targetSets.length > 0) {
      return targetSets.some(
        (s) =>
          s.language === 'ja' ||
          s.language === 'zh' ||
          s.type === 'kanji' ||
          (s.vocabularies && s.vocabularies.some((v) => v.hanviet || v.hiragana))
      );
    }
    return false;
  })();

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const [vocabsToStudy, setVocabsToStudy] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [flipped, setFlipped] = useState(false);

  const [editingVocab, setEditingVocab] = useState(null);
  const [noteModalVocab, setNoteModalVocab] = useState(null);

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('flashcardAutoPlay') === 'true');
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [kanjiFront, setKanjiFront] = useState('kanji');
  const [kanjiBack, setKanjiBack] = useState('summary');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const handleSwap = () => {
    if (hasFourFields) {
      const w = currentContentType === 'kanji' ? 'kanji' : 'word';
      setKanjiFront(kanjiFront === w ? 'meaning' : w);
      setKanjiBack('summary');
    } else {
      setIsReversed(!isReversed);
    }
  };

  useEffect(() => {
    localStorage.setItem('flashcardAutoPlay', autoPlay);
  }, [autoPlay]);

  const vibrate = (ms = 40) => {
    if (navigator.vibrate) navigator.vibrate(ms);
  };

  const handleStart = async () => {
    if (targetSets.length === 0) return toast.warning('Không có học phần nào phù hợp!');

    toast.info('Đang tải dữ liệu...', { autoClose: 1000 });
    const fullSets = await Promise.all(
      targetSets.map(async (s) => {
        if (s.vocabularies && s.vocabularies.length > 0) return s;
        try {
          const res = await api.get(`/sets/${s.id}`);
          return res.data;
        } catch (e) {
          return s;
        }
      })
    );

    setSets((prev) => prev.map((p) => fullSets.find((fs) => fs.id === p.id) || p));
    const pool = fullSets.flatMap((s) => s.vocabularies || []);

    if (pool.length === 0) return toast.warning('Học phần này chưa có dữ liệu!');

    setVocabsToStudy(pool);
    setCurrentIndex(0);
    setDirection(1);
    setFlipped(false);
    setIsStarted(true);
    setIsFinished(false);
    setIsSlideshow(false);
    if (window.innerWidth < 768 && !isFullscreen) toggleFullscreen();
  };

  const handleNext = useCallback(() => {
    vibrate();
    playSound('pop');
    setDirection(1);
    setFlipped(false);
    if (currentIndex < vocabsToStudy.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      setIsSlideshow(false);
      playSound('win');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [currentIndex, vocabsToStudy.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      vibrate();
      playSound('pop');
      setDirection(-1);
      setFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleShuffle = () => {
    vibrate(60);
    const shuffled = [...vocabsToStudy].sort(() => 0.5 - Math.random());
    setVocabsToStudy(shuffled);
    setCurrentIndex(0);
    setDirection(1);
    setFlipped(false);
    setIsFinished(false);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = containerRef.current;
      if (elem?.requestFullscreen) {
        elem.requestFullscreen().catch(() => setIsFullscreen(true));
      } else if (elem?.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => setIsFullscreen(false));
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFs = () =>
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    document.addEventListener('webkitfullscreenchange', handleFs);
    return () => {
      document.removeEventListener('fullscreenchange', handleFs);
      document.removeEventListener('webkitfullscreenchange', handleFs);
    };
  }, []);

  useEffect(() => {
    if (!isStarted || isFinished || editingVocab || noteModalVocab) return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        playSound('pop');
        setFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') handleNext();
      else if (e.code === 'ArrowLeft') handlePrev();
      else if (e.code === 'KeyF') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isFinished, editingVocab, noteModalVocab, handleNext, handlePrev]);

  useEffect(() => {
    let flipTimer, nextTimer;
    if (isSlideshow && !isFinished && isStarted && !editingVocab && !noteModalVocab) {
      flipTimer = setTimeout(() => {
        playSound('pop');
        setFlipped(true);
      }, 2500);
      nextTimer = setTimeout(() => handleNext(), 5000);
    }
    return () => {
      clearTimeout(flipTimer);
      clearTimeout(nextTimer);
    };
  }, [currentIndex, isSlideshow, isFinished, isStarted, editingVocab, noteModalVocab, handleNext]);

  const handleQuickSave = async (e) => {
    e.preventDefault();
    try {
      if (currentContentType === 'kanji') {
        await api.put(`/kanji/${editingVocab.id}`, editingVocab);
      } else {
        await api.put(`/vocabularies/${editingVocab.id}`, editingVocab);
      }
      setVocabsToStudy((prev) => {
        const newArr = [...prev];
        newArr[currentIndex] = editingVocab;
        return newArr;
      });
      toast.success('Đã lưu chỉnh sửa!');
      setEditingVocab(null);
    } catch (err) {
      toast.error('Lỗi khi lưu!');
    }
  };

  const totalCardsCount = React.useMemo(() => {
    return targetSets.reduce(
      (sum, s) => sum + (s.vocab_count || (s.vocabularies ? s.vocabularies.length : 0)),
      0
    );
  }, [targetSets]);

  const currentFrontDisplay = React.useMemo(() => {
    if (hasFourFields) {
      if (kanjiFront === 'meaning') return 'Ý nghĩa';
      if (kanjiFront === 'hiragana') return currentLanguage === 'zh' ? 'Pinyin' : 'Phiên âm';
      if (kanjiFront === 'hanviet') return 'Hán Việt';
      return currentLanguage === 'zh' ? 'Chữ Hán' : 'Từ vựng';
    }
    return isReversed ? 'Ý nghĩa' : 'Từ vựng';
  }, [hasFourFields, kanjiFront, currentLanguage, isReversed]);

  const currentSetDisplayTitle = React.useMemo(() => {
    const idStr = String(selectedSetId);
    if (idStr === 'lang_ja' || idStr === 'all_ja') return 'Tất cả tiếng Nhật';
    if (idStr === 'lang_zh' || idStr === 'all_zh') return 'Tất cả tiếng Trung';
    if (idStr === 'lang_en' || idStr === 'all_en') return 'Tất cả tiếng Anh';
    if (idStr === 'lang_kanji' || idStr === 'all_kanji') return 'Tất cả Kanji';
    if (idStr.startsWith('folder_')) return idStr.substring(7);
    if (targetSets.length === 1) return targetSets[0].title || 'Học phần không tên';
    if (targetSets.length > 1) return `${targetSets.length} học phần đã chọn`;
    return 'Chưa chọn học phần';
  }, [selectedSetId, targetSets]);

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="test-lobby-container">
        {/* Tiêu đề trang tối giản */}
        <div className="test-lobby-header">
          <h2 className="test-lobby-title">Thẻ nhớ Flashcards 3D</h2>
        </div>

        {/* Bố cục 2 Cột Studio (Max-width 980px) */}
        <div className="test-lobby-layout">
          {/* CỘT TRÁI (7/12): CẤU HÌNH THẺ NHỚ */}
          <div className="test-lobby-config-col">
            {/* Card 1: Chọn học phần */}
            <div className="test-lobby-card">
              <div className="test-lobby-card-title">Học phần mục tiêu</div>
              <SetSelector
                sets={sets}
                selectedSetId={selectedSetId}
                setSelectedSetId={setSelectedSetId}
              />
            </div>

            {/* Card 2: Chọn mặt trước hiển thị */}
            <div className="test-lobby-card">
              <GameModeSelector
                hasFourFields={hasFourFields}
                currentContentType={currentContentType}
                currentLanguage={currentLanguage}
                isReversed={isReversed}
                setIsReversed={setIsReversed}
                kanjiFront={kanjiFront}
                setKanjiFront={setKanjiFront}
                kanjiBack={kanjiBack}
                setKanjiBack={setKanjiBack}
                onSwap={handleSwap}
                sectionLabel="Mặt trước hiển thị"
                presets={[
                  {
                    id: 'recognition',
                    iconType: 'languages',
                    badgeClass: 'icon-badge-indigo',
                    label: currentLanguage === 'zh' ? 'Chữ Hán' : 'Từ vựng',
                    getDesc: () =>
                      `${currentLanguage === 'zh' ? 'Chữ Hán' : 'Từ vựng'} ➔ Chi tiết`,
                    frontKey: (type) => (type === 'kanji' ? 'kanji' : 'word'),
                    backKey: () => 'summary',
                    isActive: (f, b, type) => {
                      const w = type === 'kanji' ? 'kanji' : 'word';
                      return (f === w || f === 'kanji' || f === 'word') && b === 'summary';
                    },
                  },
                  {
                    id: 'recall',
                    iconType: 'forward',
                    badgeClass: 'icon-badge-amber',
                    label: 'Ý nghĩa',
                    getDesc: () => 'Nghĩa ➔ Chi tiết',
                    frontKey: () => 'meaning',
                    backKey: () => 'summary',
                    isActive: (f, b) => f === 'meaning' && b === 'summary',
                  },
                  {
                    id: 'reading',
                    iconType: 'reading',
                    badgeClass: 'icon-badge-sky',
                    label: currentLanguage === 'zh' ? 'Pinyin' : 'Phiên âm',
                    getDesc: () => `${currentLanguage === 'zh' ? 'Pinyin' : 'Kana'} ➔ Chi tiết`,
                    frontKey: () => 'hiragana',
                    backKey: () => 'summary',
                    isActive: (f, b) => f === 'hiragana' && b === 'summary',
                  },
                  {
                    id: 'hanviet',
                    iconType: 'hanviet',
                    badgeClass: 'icon-badge-rose',
                    label: 'Hán Việt',
                    getDesc: () => 'Hán Việt ➔ Chi tiết',
                    frontKey: () => 'hanviet',
                    backKey: () => 'summary',
                    isActive: (f, b) => f === 'hanviet' && b === 'summary',
                  },
                ]}
                twoFieldPresets={[
                  {
                    id: 'forward',
                    iconType: 'forward',
                    badgeClass: 'icon-badge-indigo',
                    label: 'Từ vựng',
                    description: 'Từ ➔ Nghĩa',
                    reversedValue: false,
                  },
                  {
                    id: 'backward',
                    iconType: 'backward',
                    badgeClass: 'icon-badge-amber',
                    label: 'Ý nghĩa',
                    description: 'Nghĩa ➔ Từ',
                    reversedValue: true,
                  },
                ]}
              />
            </div>

            {/* Card 3: Cấu hình trải nghiệm lật thẻ */}
            <div className="test-lobby-card">
              <div className="test-lobby-card-title">Tùy chọn trải nghiệm</div>
              <div className="lobby-toggle-grid">
                {/* Toggle 1: Tự động phát âm */}
                <div
                  className={`lobby-toggle-card ${autoPlay ? 'active' : ''}`}
                  onClick={() => setAutoPlay(!autoPlay)}
                >
                  <div className="lobby-toggle-left">
                    <div className="icon-badge icon-badge-emerald" style={{ width: 34, height: 34 }}>
                      <Volume2 size={17} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="lobby-toggle-title">Tự động phát âm</div>
                      <div className="lobby-toggle-desc">Đọc to mỗi khi lật thẻ</div>
                    </div>
                  </div>
                  <div className="lobby-switch-track">
                    <div className="lobby-switch-thumb" />
                  </div>
                </div>

                {/* Toggle 2: Trình chiếu tự động */}
                <div
                  className={`lobby-toggle-card ${isSlideshow ? 'active' : ''}`}
                  onClick={() => setIsSlideshow(!isSlideshow)}
                >
                  <div className="lobby-toggle-left">
                    <div className="icon-badge icon-badge-sky" style={{ width: 34, height: 34 }}>
                      <PlayCircle size={17} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="lobby-toggle-title">Tự động trình chiếu</div>
                      <div className="lobby-toggle-desc">Chuyển thẻ sau 3 giây</div>
                    </div>
                  </div>
                  <div className="lobby-switch-track">
                    <div className="lobby-switch-thumb" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5/12, Sticky): TẤM VÉ ÔN TẬP FLASHCARD */}
          <div className="test-lobby-ticket-col">
            <div className="test-lobby-hero-card">
              {/* Chữ Hán chìm '憶' (Ức - Trí nhớ) */}
              <div className="test-lobby-watermark-kanji" aria-hidden="true">
                憶
              </div>

              <div className="test-lobby-hero-content">
                {/* Header */}
                <div className="test-lobby-hero-header">
                  <span className="test-lobby-hero-title">Tấm vé ôn tập Flashcard 3D</span>
                  <span
                    className="badge bg-secondary-subtle text-secondary"
                    style={{ fontSize: '0.68rem', fontWeight: 600 }}
                  >
                    3D Active Recall
                  </span>
                </div>

                {/* Khối số lượng thẻ */}
                <div className="test-lobby-count-hero-block">
                  <div className="test-lobby-hero-count-label">Quy mô bộ thẻ</div>
                  <div className="d-flex align-items-baseline">
                    <span className="test-lobby-hero-count-number">{totalCardsCount}</span>
                    <span className="test-lobby-hero-count-unit">thẻ từ vựng</span>
                  </div>
                  <div className="test-lobby-progress-track">
                    <div
                      className="test-lobby-progress-fill"
                      style={{ width: `${totalCardsCount > 0 ? 100 : 0}%` }}
                    />
                  </div>
                  <div className="test-lobby-progress-sublabel">
                    {totalCardsCount > 0 ? 'Sẵn sàng khởi động không gian 3D' : 'Chưa có từ vựng'}
                  </div>
                </div>

                {/* Danh sách thông số dạng elevated box */}
                <div className="test-lobby-params-list">
                  <div className="test-lobby-param-item">
                    <div className="test-lobby-param-icon">
                      <BookOpen size={16} strokeWidth={2.2} />
                    </div>
                    <div className="test-lobby-param-details">
                      <div className="test-lobby-param-label">Học phần</div>
                      <div className="test-lobby-param-value" title={currentSetDisplayTitle}>
                        {currentSetDisplayTitle}
                      </div>
                    </div>
                  </div>

                  <div className="test-lobby-param-item">
                    <div className="test-lobby-param-icon">
                      <Eye size={16} strokeWidth={2.2} />
                    </div>
                    <div className="test-lobby-param-details">
                      <div className="test-lobby-param-label">Mặt trước hiển thị</div>
                      <div className="test-lobby-param-value">
                        {currentFrontDisplay} ➔ Chi tiết
                      </div>
                    </div>
                  </div>

                  <div className="test-lobby-param-item">
                    <div className="test-lobby-param-icon">
                      <Volume2 size={16} strokeWidth={2.2} />
                    </div>
                    <div className="test-lobby-param-details">
                      <div className="test-lobby-param-label">Phát âm tự động</div>
                      <div className="test-lobby-param-value">
                        {autoPlay ? 'Bật (Mỗi khi lật thẻ)' : 'Tắt'}
                      </div>
                    </div>
                  </div>

                  <div className="test-lobby-param-item">
                    <div className="test-lobby-param-icon">
                      <PlayCircle size={16} strokeWidth={2.2} />
                    </div>
                    <div className="test-lobby-param-details">
                      <div className="test-lobby-param-label">Trình chiếu</div>
                      <div className="test-lobby-param-value">
                        {isSlideshow ? 'Tự động (3s / thẻ)' : 'Lật thủ công'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nút CTA lớn */}
                {!selectedSetId ? (
                  <button
                    type="button"
                    className="test-lobby-cta-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('scofield-open-set-selector'))}
                  >
                    <FolderOpen size={18} strokeWidth={2.2} />
                    <span>Chọn học phần để bắt đầu</span>
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="test-lobby-cta-btn"
                    onClick={handleStart}
                    disabled={totalCardsCount === 0}
                  >
                    <Layers size={18} strokeWidth={2.2} />
                    <span>Bắt đầu lật thẻ</span>
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="container mt-5 text-center">
        <div
          className="card shadow-lg border-0 p-4 p-md-5 rounded-4 mx-auto text-white position-relative overflow-hidden"
          style={{ maxWidth: '480px', background: 'var(--brand-gradient)' }}
        >
          <div className="position-relative" style={{ zIndex: 2 }}>
            <div className="mb-3 d-flex justify-content-center">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: '76px', height: '76px', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(8px)' }}
              >
                <Award size={42} strokeWidth={2.4} className="text-warning" />
              </div>
            </div>
            <h2 className="fw-bold mb-2">Chúc mừng!</h2>
            <p className="fs-6 opacity-85 mb-4">
              Bạn đã ôn tập xong <strong>{vocabsToStudy.length}</strong> thẻ từ vựng.
            </p>
            <div className="d-flex flex-column gap-3">
              <button
                className="btn btn-warning btn-touch py-3 fw-bold text-dark fs-6 rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                onClick={handleShuffle}
              >
                <Shuffle size={18} strokeWidth={2.2} />
                <span>Trộn & Học lại</span>
              </button>
              <button
                className="btn btn-light btn-touch py-3 fw-bold fs-6 text-primary rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                onClick={() => {
                  setIsStarted(false);
                  setIsFullscreen(false);
                }}
              >
                <Layers size={18} strokeWidth={2.2} />
                <span>Học phần khác</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`container-fluid py-4 text-center ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`}
      ref={containerRef}
      style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}
    >
      {editingVocab && (
        <div
          className="set-sheet-backdrop"
          style={{ zIndex: 3000 }}
          onClick={() => setEditingVocab(null)}
        >
          <div
            className="set-sheet-panel text-start"
            style={{ maxWidth: '420px', height: 'auto', maxHeight: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="set-sheet-grabber d-md-none" />
            <div className="set-sheet-header">
              <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <Edit3 size={17} className="text-primary" /> Sửa nhanh thẻ
              </h6>
            </div>
            <form onSubmit={handleQuickSave} className="p-3 pt-2">
              {currentContentType === 'kanji' ? (
                <>
                  <input
                    type="text"
                    className="form-control bg-light border-0 mb-2 fw-bold py-2"
                    value={editingVocab.kanji || editingVocab.word || ''}
                    onChange={(e) =>
                      setEditingVocab({ ...editingVocab, kanji: e.target.value, word: e.target.value })
                    }
                    placeholder="Chữ Hán (Kanji)"
                    required
                  />
                  <input
                    type="text"
                    className="form-control bg-light border-0 mb-2 py-2"
                    value={editingVocab.hanviet || ''}
                    onChange={(e) => setEditingVocab({ ...editingVocab, hanviet: e.target.value })}
                    placeholder="Âm Hán Việt"
                  />
                  <input
                    type="text"
                    className="form-control bg-light border-0 mb-2 py-2"
                    value={editingVocab.hiragana || ''}
                    onChange={(e) => setEditingVocab({ ...editingVocab, hiragana: e.target.value })}
                    placeholder="Cách đọc (Hiragana)"
                  />
                  <input
                    type="text"
                    className="form-control bg-light border-0 mb-3 py-2"
                    value={editingVocab.meaning || ''}
                    onChange={(e) => setEditingVocab({ ...editingVocab, meaning: e.target.value })}
                    placeholder="Ý nghĩa"
                    required
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    className="form-control bg-light border-0 mb-2 fw-bold py-2"
                    value={editingVocab.word || ''}
                    onChange={(e) => setEditingVocab({ ...editingVocab, word: e.target.value })}
                    placeholder="Từ vựng"
                    required
                  />
                  {(editingVocab.language || 'ja') !== 'en' && (
                    <>
                      <input
                        type="text"
                        className="form-control bg-light border-0 mb-2 py-2"
                        value={editingVocab.hanviet || ''}
                        onChange={(e) => setEditingVocab({ ...editingVocab, hanviet: e.target.value })}
                        placeholder="Hán Việt"
                      />
                      <input
                        type="text"
                        className="form-control bg-light border-0 mb-2 py-2"
                        value={editingVocab.hiragana || ''}
                        onChange={(e) => setEditingVocab({ ...editingVocab, hiragana: e.target.value })}
                        placeholder="Cách đọc / Pinyin"
                      />
                    </>
                  )}
                  <input
                    type="text"
                    className="form-control bg-light border-0 mb-3 py-2"
                    value={editingVocab.meaning || ''}
                    onChange={(e) => setEditingVocab({ ...editingVocab, meaning: e.target.value })}
                    placeholder="Ý nghĩa"
                    required
                  />
                </>
              )}
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-touch w-50 fw-bold"
                  onClick={() => setEditingVocab(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-touch w-50 fw-bold text-white">
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {noteModalVocab && (
        <SaveNoteModal
          vocab={noteModalVocab}
          sets={sets}
          onClose={() => setNoteModalVocab(null)}
          onSaveSuccess={() => fetchSets(false, true)}
        />
      )}

      <div className="mx-auto has-mobile-bottom-bar" style={{ maxWidth: '500px' }}>
        <div
          className="card border-0 rounded-4 p-3 mb-4 shadow-sm"
          style={{
            position: 'relative',
            top: 'auto',
            zIndex: 20,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2.5">
            <button
              className="btn btn-mobile-chip chip-slate d-flex align-items-center gap-1.5"
              onClick={() => {
                if (document.fullscreenElement && document.exitFullscreen) {
                  document.exitFullscreen().catch(() => {});
                } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
                  document.webkitExitFullscreen();
                }
                setIsStarted(false);
                setIsFullscreen(false);
              }}
            >
              <ArrowLeft size={14} /> <span>Thoát</span>
            </button>
            <span className="fw-bold" style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
              Thẻ {currentIndex + 1} / {vocabsToStudy.length}
            </span>
            <button
              className="btn btn-icon-soft chip-primary"
              onClick={toggleFullscreen}
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
          <div
            className="progress overflow-hidden"
            style={{ height: '6px', borderRadius: '10px', backgroundColor: 'var(--bg-elevated)' }}
          >
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{
                width: `${((currentIndex + 1) / vocabsToStudy.length) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            ></div>
          </div>
        </div>

        {/* CARD STACK DEPTH & POP-LAYOUT SWIPE */}
        <div className="flashcard-stage" style={{ marginTop: '20px', position: 'relative', zIndex: 5 }}>
          {currentIndex + 2 < vocabsToStudy.length && <div className="flashcard-stack-layer flashcard-stack-2" />}
          {currentIndex + 1 < vocabsToStudy.length && <div className="flashcard-stack-layer flashcard-stack-1" />}

          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={CARD_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-100 h-100"
            >
              <Flashcard
                vocab={vocabsToStudy[currentIndex]}
                autoPlay={autoPlay}
                contentType={currentContentType}
                isReversed={isReversed}
                kanjiFront={kanjiFront}
                kanjiBack={kanjiBack}
                flipped={flipped}
                onFlip={setFlipped}
                onSwipeNext={handleNext}
                onSwipePrev={handlePrev}
                onEdit={setEditingVocab}
                onSaveNote={(item) => {
                  if (currentContentType === 'kanji') {
                    setNoteModalVocab({
                      word: item.kanji,
                      hanviet: item.hanviet,
                      hiragana: item.hiragana,
                      meaning: item.meaning,
                      language: 'ja',
                    });
                  } else {
                    setNoteModalVocab(item);
                  }
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="action-grid-2col mt-3">
          <button
            type="button"
            className={`lobby-toggle-card ${autoPlay ? 'active' : ''}`}
            onClick={() => setAutoPlay(!autoPlay)}
            style={{ minHeight: '48px', padding: '10px 14px' }}
          >
            <div className={`icon-badge-${autoPlay ? 'indigo' : 'slate'}`} style={{ width: '30px', height: '30px' }}>
              <Volume2 size={15} strokeWidth={2.2} />
            </div>
            <div className="text-start flex-grow-1">
              <div className="lobby-toggle-title" style={{ fontSize: '0.85rem' }}>Tự phát âm</div>
            </div>
            <div className={`lobby-switch-track ${autoPlay ? 'active' : ''}`}>
              <div className="lobby-switch-thumb" />
            </div>
          </button>

          <button
            type="button"
            className={`lobby-toggle-card ${isSlideshow ? 'active' : ''}`}
            onClick={() => setIsSlideshow(!isSlideshow)}
            style={{ minHeight: '48px', padding: '10px 14px' }}
          >
            <div className={`icon-badge-${isSlideshow ? 'indigo' : 'slate'}`} style={{ width: '30px', height: '30px' }}>
              <PlayCircle size={15} strokeWidth={2.2} />
            </div>
            <div className="text-start flex-grow-1">
              <div className="lobby-toggle-title" style={{ fontSize: '0.85rem' }}>Tự lật thẻ</div>
            </div>
            <div className={`lobby-switch-track ${isSlideshow ? 'active' : ''}`}>
              <div className="lobby-switch-thumb" />
            </div>
          </button>
        </div>

        <div className="mobile-bottom-bar">
          <div className="container px-0" style={{ maxWidth: '500px' }}>
            <div className="d-flex gap-2">
              <button
                className="btn btn-light text-dark btn-mobile-chip flex-fill d-flex align-items-center justify-content-center gap-1.5"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ArrowLeft size={15} strokeWidth={2.2} />
                <span>Trước</span>
              </button>
              <button
                className="btn btn-warning text-dark btn-mobile-chip flex-fill d-flex align-items-center justify-content-center gap-1.5"
                onClick={handleShuffle}
              >
                <Shuffle size={15} strokeWidth={2.2} />
                <span>Trộn thẻ</span>
              </button>
              <button
                className="btn btn-primary text-white btn-mobile-chip flex-fill d-flex align-items-center justify-content-center gap-1.5"
                onClick={handleNext}
              >
                <span>Tiếp</span>
                <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashcardMode;