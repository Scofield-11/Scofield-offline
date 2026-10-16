import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Maximize2, Minimize2 } from 'lucide-react';
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
    x: dir > 0 ? 70 : -70,
    opacity: 0,
    scale: 0.94,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir) => ({
    x: dir > 0 ? -90 : 90,
    opacity: 0,
    scale: 0.92,
  }),
};

function FlashcardMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('lang_ja');

  const targetSets = React.useMemo(() => {
    if (!sets || sets.length === 0) return [];
    const idStr = String(selectedSetId);
    if (idStr.startsWith('lang_') || idStr.startsWith('all_')) {
      const lang = idStr.replace('lang_', '').replace('all_', '');
      if (lang === 'kanji') return sets.filter((s) => s.type === 'kanji');
      if (lang === 'en') return sets.filter((s) => s.type !== 'kanji' && s.language === 'en');
      return sets.filter((s) => s.type !== 'kanji' && (s.language || 'ja') === 'ja');
    }
    if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      return sets.filter((s) => (s.folder_path || '🏠 Thư mục gốc') === folderName);
    }
    const targetSet = sets.find((s) => s.id == selectedSetId);
    return targetSet ? [targetSet] : [];
  }, [selectedSetId, sets]);

  const currentContentType =
    targetSets.length > 0 && targetSets.every((s) => s.type === 'kanji') ? 'kanji' : 'vocab';

  const hasFourFields = (() => {
    if (currentContentType === 'kanji') return true;
    if (String(selectedSetId).includes('ja') || String(selectedSetId).includes('kanji')) return true;
    if (targetSets.length > 0) {
      return targetSets.some(
        (s) =>
          s.language === 'ja' ||
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

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="container mt-3" style={{ maxWidth: '600px' }}>
        <div className="card shadow-sm border-0 p-3 p-md-4 rounded-4 bg-white">
          <h4 className="text-center mb-3 fw-bold text-dark">🗂️ Thẻ nhớ Flashcards</h4>

          <div className="mb-3">
            <label className="form-label fw-bold text-muted small mb-1">Học phần</label>
            <SetSelector
              sets={sets}
              selectedSetId={selectedSetId}
              setSelectedSetId={setSelectedSetId}
            />
          </div>

          <div className="mb-3">
            <GameModeSelector
              hasFourFields={hasFourFields}
              currentContentType={currentContentType}
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
                  icon: '🧠',
                  iconBg: '#ede9fe',
                  label: 'Từ vựng',
                  getDesc: (f, b, type) => `${type === 'kanji' ? 'Hán tự' : 'Từ'} ➔ Chi tiết`,
                  frontKey: (type) => (type === 'kanji' ? 'kanji' : 'word'),
                  backKey: () => 'summary',
                  isActive: (f, b, type) => {
                    const w = type === 'kanji' ? 'kanji' : 'word';
                    return f === w && b === 'summary';
                  },
                },
                {
                  id: 'recall',
                  icon: '🇻🇳',
                  iconBg: '#fef3c7',
                  label: 'Ý nghĩa',
                  getDesc: () => 'Nghĩa ➔ Chi tiết',
                  frontKey: () => 'meaning',
                  backKey: () => 'summary',
                  isActive: (f, b) => f === 'meaning' && b === 'summary',
                },
                {
                  id: 'reading',
                  icon: '🗣️',
                  iconBg: '#dbeafe',
                  label: 'Phiên âm',
                  getDesc: () => 'Kana ➔ Chi tiết',
                  frontKey: () => 'hiragana',
                  backKey: () => 'summary',
                  isActive: (f, b) => f === 'hiragana' && b === 'summary',
                },
                {
                  id: 'hanviet',
                  icon: '👑',
                  iconBg: '#fee2e2',
                  label: 'Hán Việt',
                  getDesc: () => 'Hán Việt ➔ Chi tiết',
                  frontKey: () => 'hanviet',
                  backKey: () => 'summary',
                  isActive: (f, b) => f === 'hanviet' && b === 'summary',
                },
              ]}
              twoFieldPresets={[
                { id: 'forward', icon: '🧠', iconBg: '#ede9fe', label: 'Từ vựng', description: 'Từ ➔ Nghĩa', reversedValue: false },
                { id: 'backward', icon: '🇻🇳', iconBg: '#fef3c7', label: 'Ý nghĩa', description: 'Nghĩa ➔ Từ', reversedValue: true },
              ]}
            />
          </div>

          <button className="btn btn-primary btn-touch w-100" onClick={handleStart}>
            Bắt đầu lật thẻ
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="container mt-5 text-center">
        <div
          className="card shadow-lg border-0 p-5 rounded-4 mx-auto text-white position-relative overflow-hidden"
          style={{ maxWidth: '500px', background: 'var(--brand-gradient)' }}
        >
          <div className="position-relative" style={{ zIndex: 2 }}>
            <div className="display-1 mb-3">🎓</div>
            <h2 className="fw-bold mb-3">Chúc mừng!</h2>
            <p className="fs-5 opacity-75 mb-4">
              Bạn đã ôn tập xong <strong>{vocabsToStudy.length}</strong> thẻ từ vựng.
            </p>
            <div className="d-flex flex-column gap-3">
              <button className="btn btn-warning btn-touch py-3 fw-bold text-dark fs-5 rounded-4" onClick={handleShuffle}>
                🔀 Trộn & Học lại
              </button>
              <button
                className="btn btn-light btn-touch py-3 fw-bold fs-5 text-primary rounded-4"
                onClick={() => {
                  setIsStarted(false);
                  setIsFullscreen(false);
                }}
              >
                Học phần khác
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
          className="modal d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, position: 'fixed', inset: 0 }}
        >
          <div className="card border-0 shadow-lg rounded-4 p-4" style={{ width: '90%', maxWidth: '400px' }}>
            <h5 className="fw-bold mb-4 text-primary d-flex align-items-center gap-2">
              <Edit3 size={18} /> Sửa nhanh thẻ
            </h5>
            <form onSubmit={handleQuickSave}>
              {currentContentType === 'kanji' ? (
                <>
                  <input type="text" className="form-control bg-light border-0 mb-3 fw-bold shadow-sm" value={editingVocab.kanji} onChange={(e) => setEditingVocab({ ...editingVocab, kanji: e.target.value })} placeholder="Kanji" required />
                  <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hanviet} onChange={(e) => setEditingVocab({ ...editingVocab, hanviet: e.target.value })} placeholder="Hán Việt" required />
                  <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hiragana} onChange={(e) => setEditingVocab({ ...editingVocab, hiragana: e.target.value })} placeholder="Hiragana" required />
                  <input type="text" className="form-control bg-light border-0 mb-4 shadow-sm" value={editingVocab.meaning} onChange={(e) => setEditingVocab({ ...editingVocab, meaning: e.target.value })} placeholder="Ý nghĩa" required />
                </>
              ) : (
                <>
                  <input type="text" className="form-control bg-light border-0 mb-3 fw-bold shadow-sm" value={editingVocab.word} onChange={(e) => setEditingVocab({ ...editingVocab, word: e.target.value })} placeholder="Từ vựng" required />
                  {(editingVocab.language || 'ja') === 'ja' && (
                    <>
                      <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hanviet || ''} onChange={(e) => setEditingVocab({ ...editingVocab, hanviet: e.target.value })} placeholder="Hán Việt" />
                      <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hiragana || ''} onChange={(e) => setEditingVocab({ ...editingVocab, hiragana: e.target.value })} placeholder="Cách đọc" />
                    </>
                  )}
                  <input type="text" className="form-control bg-light border-0 mb-4 shadow-sm" value={editingVocab.meaning} onChange={(e) => setEditingVocab({ ...editingVocab, meaning: e.target.value })} placeholder="Ý nghĩa" required />
                </>
              )}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-secondary w-50 fw-bold rounded-3" onClick={() => setEditingVocab(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary w-50 fw-bold text-white rounded-3">
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
        <div className="mobile-sticky-top">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <button
              className="btn btn-light text-dark btn-mobile-chip"
              onClick={() => {
                setIsStarted(false);
                setIsFullscreen(false);
              }}
            >
              ← Thoát
            </button>
            <span className="fw-bold text-dark">
              Thẻ {currentIndex + 1} / {vocabsToStudy.length}
            </span>
            <button
              className="btn btn-light text-dark btn-mobile-chip"
              onClick={toggleFullscreen}
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
          <div className="progress" style={{ height: '6px', borderRadius: '10px' }}>
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{
                width: `${((currentIndex + 1) / vocabsToStudy.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* CARD STACK DEPTH & POP-LAYOUT SWIPE */}
        <div className="flashcard-stage">
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
              transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.7 }}
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
          <div
            className="form-check form-switch bg-white px-3 py-2 rounded-4 shadow-sm border d-flex align-items-center justify-content-center gap-2 m-0"
            style={{ minHeight: '48px' }}
          >
            <input
              className="form-check-input m-0"
              type="checkbox"
              id="autoPlaySwitch"
              checked={autoPlay}
              onChange={() => setAutoPlay(!autoPlay)}
            />
            <label className="form-check-label text-dark fw-bold small m-0" htmlFor="autoPlaySwitch">
              🔊 Tự phát âm
            </label>
          </div>
          <div
            className="form-check form-switch bg-white px-3 py-2 rounded-4 shadow-sm border d-flex align-items-center justify-content-center gap-2 m-0"
            style={{ minHeight: '48px' }}
          >
            <input
              className="form-check-input m-0"
              type="checkbox"
              id="slideshowSwitch"
              checked={isSlideshow}
              onChange={() => setIsSlideshow(!isSlideshow)}
            />
            <label className="form-check-label text-dark fw-bold small m-0" htmlFor="slideshowSwitch">
              ▶️ Tự lật thẻ
            </label>
          </div>
        </div>

        <div className="mobile-bottom-bar">
          <div className="container px-0" style={{ maxWidth: '500px' }}>
            <div className="d-flex gap-2">
              <button
                className="btn btn-light text-dark btn-mobile-chip flex-fill"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                ← Trước
              </button>
              <button
                className="btn btn-warning text-dark btn-mobile-chip flex-fill"
                onClick={handleShuffle}
              >
                🔀 Trộn thẻ
              </button>
              <button
                className="btn btn-primary text-white btn-mobile-chip flex-fill"
                onClick={handleNext}
              >
                Tiếp →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashcardMode;