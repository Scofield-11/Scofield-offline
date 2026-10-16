import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import Flashcard from './Flashcard';
import SaveNoteModal from './SaveNoteModal';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import { playSound } from '../utils/audio'; // Import âm thanh
import SetSelector from './SetSelector';
import ContentTypeSelector from './ContentTypeSelector';
import GameModeSelector from './GameModeSelector';

function FlashcardMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('lang_ja');

  const targetSets = React.useMemo(() => {
    if (!sets || sets.length === 0) return [];
    const idStr = String(selectedSetId);
    if (idStr.startsWith('lang_') || idStr.startsWith('all_')) {
      const lang = idStr.replace('lang_', '').replace('all_', '');
      if (lang === 'kanji') return sets.filter(s => s.type === 'kanji');
      if (lang === 'en') return sets.filter(s => s.type !== 'kanji' && s.language === 'en');
      return sets.filter(s => s.type !== 'kanji' && (s.language || 'ja') === 'ja');
    }
    if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      return sets.filter(s => (s.folder_path || '🏠 Thư mục gốc') === folderName);
    }
    const targetSet = sets.find(s => s.id == selectedSetId);
    return targetSet ? [targetSet] : [];
  }, [selectedSetId, sets]);

  const currentContentType = (targetSets.length > 0 && targetSets.every(s => s.type === 'kanji')) ? 'kanji' : 'vocab';

  const hasFourFields = (() => {
    if (currentContentType === 'kanji') return true;
    if (String(selectedSetId).includes('ja') || String(selectedSetId).includes('kanji')) return true;
    if (targetSets.length > 0) {
      return targetSets.some(s => s.language === 'ja' || s.type === 'kanji' || (s.vocabularies && s.vocabularies.some(v => v.hanviet || v.hiragana)));
    }
    return false;
  })();

  useEffect(() => { fetchSets(); }, [fetchSets]);
  
  const [vocabsToStudy, setVocabsToStudy] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [editingVocab, setEditingVocab] = useState(null);
  const [noteModalVocab, setNoteModalVocab] = useState(null); 

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem("flashcardAutoPlay") === "true");
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [kanjiFront, setKanjiFront] = useState('kanji');
  const [kanjiBack, setKanjiBack] = useState('summary'); // Mặc định mặt sau là Hiện toàn bộ thông tin
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleSwap = () => {
    if (hasFourFields) {
      const w = currentContentType === 'kanji' ? 'kanji' : 'word';
      // Cố định mặt sau luôn là 'summary', chỉ đảo mặt trước giữa Từ vựng và Ý nghĩa
      setKanjiFront(kanjiFront === w ? 'meaning' : w);
      setKanjiBack('summary');
    } else {
      setIsReversed(!isReversed);
    }
  };
  const containerRef = useRef(null);

  // States dành cho tính năng Vuốt trên Mobile
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => { localStorage.setItem("flashcardAutoPlay", autoPlay); }, [autoPlay]);

  const vibrate = (ms = 40) => { if (navigator.vibrate) navigator.vibrate(ms); };

  const handleStart = async () => {
    let pool = [];

    if (targetSets.length === 0) return toast.warning("Không có học phần nào phù hợp!");

    toast.info("Đang tải dữ liệu...", { autoClose: 1000 });
    const fullSets = await Promise.all(targetSets.map(async (s) => {
      if (s.vocabularies && s.vocabularies.length > 0) return s;
      try {
        const res = await api.get(`/sets/${s.id}`);
        return res.data;
      } catch (e) { return s; }
    }));
    
    // Cập nhật lại context để lần sau không phải tải lại
    setSets(prev => prev.map(p => fullSets.find(fs => fs.id === p.id) || p));
    pool = fullSets.flatMap(s => s.vocabularies || []);


    if (pool.length === 0) return toast.warning("Học phần này chưa có dữ liệu!");

    setVocabsToStudy(pool);
    setCurrentIndex(0);
    setIsStarted(true);
    setIsFinished(false);
    setIsSlideshow(false);
    if (window.innerWidth < 768 && !isFullscreen) toggleFullscreen();
  };

  const handleNext = useCallback(() => {
    vibrate();
    playSound('pop'); // Tiếng pop khi chuyển thẻ
    if (currentIndex < vocabsToStudy.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      setIsSlideshow(false); 
      playSound('win'); // Tiếng hoàn thành
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [currentIndex, vocabsToStudy.length]);

  const handlePrev = useCallback(() => {
    vibrate();
    playSound('pop');
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const handleShuffle = () => {
    vibrate(60);
    const shuffled = [...vocabsToStudy].sort(() => 0.5 - Math.random());
    setVocabsToStudy(shuffled);
    setCurrentIndex(0); 
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

  // Logic Vuốt ngón tay
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = Math.abs(touchStart.y - touchEnd.y);
    
    // Yêu cầu vuốt ngang hơn 50px và lớn hơn độ lệch dọc
    if (Math.abs(distanceX) > 50 && Math.abs(distanceX) > distanceY) {
      if (distanceX > 0) handleNext(); // Vuốt sang trái
      else handlePrev(); // Vuốt sang phải
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handleFs);
    document.addEventListener("webkitfullscreenchange", handleFs);
    return () => {
      document.removeEventListener("fullscreenchange", handleFs);
      document.removeEventListener("webkitfullscreenchange", handleFs);
    };
  }, []);

  useEffect(() => {
    if (!isStarted || isFinished || editingVocab || noteModalVocab) return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space') { e.preventDefault(); document.querySelector('.flashcard-container')?.click(); } 
      else if (e.code === 'ArrowRight') handleNext();
      else if (e.code === 'ArrowLeft') handlePrev();
      else if (e.code === 'KeyF') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isFinished, editingVocab, noteModalVocab, handleNext, handlePrev]);

  useEffect(() => {
    let flipTimer, nextTimer;
    if (isSlideshow && !isFinished && isStarted && !editingVocab && !noteModalVocab) {
      flipTimer = setTimeout(() => document.querySelector('.flashcard-container')?.click(), 2500); 
      nextTimer = setTimeout(() => handleNext(), 5000); 
    }
    return () => { clearTimeout(flipTimer); clearTimeout(nextTimer); };
  }, [currentIndex, isSlideshow, isFinished, isStarted, editingVocab, noteModalVocab, handleNext]);

  const handleQuickSave = async (e) => {
    e.preventDefault();
    try {
      if (currentContentType === 'kanji') {
        await api.put(`/kanji/${editingVocab.id}`, editingVocab);
      } else {
        await api.put(`/vocabularies/${editingVocab.id}`, editingVocab);
      }
      setVocabsToStudy(prev => {
        const newArr = [...prev];
        newArr[currentIndex] = editingVocab;
        return newArr;
      });
      toast.success("Đã lưu chỉnh sửa!");
      setEditingVocab(null);
    } catch (err) { toast.error("Lỗi khi lưu!"); }
  };



  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="container mt-5 fade-in-slide" style={{ maxWidth: '700px' }}>
        <div className="card shadow-sm border-0 p-4 p-md-5 rounded-4 bg-white" style={{ borderRadius: '24px' }}>
          <h3 className="text-center mb-5 fw-bold text-dark" style={{ opacity: 0.8 }}>Thiết lập Flashcards</h3>
          
          <div className="mb-4">
            <label className="form-label fw-bold text-muted mb-2">1. Chọn học phần muốn ôn:</label>
            <SetSelector 
              sets={sets} 
              selectedSetId={selectedSetId} 
              setSelectedSetId={setSelectedSetId} 
            />
          </div>

          <div className="mb-5">
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
              sectionLabel="Chọn chế độ lật thẻ"
              presets={[
                {
                  id: 'recognition',
                  icon: '🧠',
                  iconBg: '#ede9fe',
                  label: 'Nhận diện (Đọc hiểu)',
                  getDesc: (f, b, type) => {
                    const w = type === 'kanji' ? 'Hán tự' : 'Từ vựng';
                    return `Nhìn ${w} ➔ Hiện toàn bộ thông tin`;
                  },
                  frontKey: (type) => type === 'kanji' ? 'kanji' : 'word',
                  backKey: () => 'summary',
                  isActive: (f, b, type) => {
                    const w = type === 'kanji' ? 'kanji' : 'word';
                    return f === w && b === 'summary';
                  }
                },
                {
                  id: 'recall',
                  icon: '🇻🇳',
                  iconBg: '#fef3c7',
                  label: 'Hồi tưởng (Sản sinh)',
                  getDesc: (f, b, type) => {
                    return `Nhìn Ý nghĩa ➔ Hiện toàn bộ thông tin`;
                  },
                  frontKey: () => 'meaning',
                  backKey: () => 'summary',
                  isActive: (f, b, type) => {
                    return f === 'meaning' && b === 'summary';
                  }
                },
                {
                  id: 'reading',
                  icon: '🗣️',
                  iconBg: '#dbeafe',
                  label: 'Luyện đọc Âm',
                  getDesc: () => 'Nhìn Phiên âm ➔ Hiện toàn bộ thông tin',
                  frontKey: () => 'hiragana',
                  backKey: () => 'summary',
                  isActive: (f, b) => f === 'hiragana' && b === 'summary'
                },
                {
                  id: 'hanviet',
                  icon: '👑',
                  iconBg: '#fee2e2',
                  label: 'Ôn tập Hán Việt',
                  getDesc: () => 'Nhìn Hán Việt ➔ Hiện toàn bộ thông tin',
                  frontKey: () => 'hanviet',
                  backKey: () => 'summary',
                  isActive: (f, b) => f === 'hanviet' && b === 'summary'
                }
              ]}
              twoFieldPresets={[
                { id: 'forward', icon: '🧠', iconBg: '#ede9fe', label: 'Học Toàn Diện', description: 'Nhìn Từ vựng ➔ Xem Ý nghĩa', reversedValue: false },
                { id: 'backward', icon: '🇻🇳', iconBg: '#fef3c7', label: 'Hồi Tưởng', description: 'Nhìn Ý nghĩa ➔ Xem Từ vựng', reversedValue: true },
              ]}
            />
          </div>

          <button 
            className="btn btn-lg w-100 fw-bold shadow-lg text-white hover-scale" 
            style={{ borderRadius: '14px', padding: '16px', backgroundColor: '#8a2be2', border: 'none' }} 
            onClick={handleStart}
          >
            Bắt đầu lật thẻ
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="container mt-5 text-center fade-in-slide">
        <div className="card shadow-lg border-0 p-5 rounded-4 mx-auto text-white position-relative overflow-hidden" style={{ maxWidth: '500px', backgroundColor: '#8a2be2' }}>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <div className="display-1 mb-3">🎓</div>
            <h2 className="fw-bold mb-3">Chúc mừng!</h2>
            <p className="fs-5 opacity-75 mb-4">Bạn đã ôn tập xong <strong>{vocabsToStudy.length}</strong> thẻ từ vựng.</p>
            <div className="d-flex flex-column gap-3">
              <button className="btn btn-warning py-3 fw-bold text-dark fs-5 shadow-sm rounded-4 hover-scale" onClick={handleShuffle}>🔀 Trộn & Học lại</button>
              <button className="btn btn-light py-3 fw-bold fs-5 text-primary shadow-sm rounded-4 hover-scale" onClick={() => { setIsStarted(false); setIsFullscreen(false); }}>Học phần khác</button>
            </div>
          </div>
          <div className="position-absolute bg-white opacity-10 rounded-circle" style={{ width: '200px', height: '200px', top: '-50px', right: '-50px' }}></div>
          <div className="position-absolute bg-white opacity-10 rounded-circle" style={{ width: '150px', height: '150px', bottom: '-20px', left: '-50px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container-fluid py-4 text-center transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
      
      {editingVocab && (
        <div className="modal d-flex align-items-center justify-content-center fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4" style={{ width: '90%', maxWidth: '400px' }}>
            <h5 className="fw-bold mb-4" style={{ color: '#8a2be2' }}>✏️ Sửa nhanh thẻ</h5>
            <form onSubmit={handleQuickSave}>
              {currentContentType === 'kanji' ? (
                <>
                  <input type="text" className="form-control bg-light border-0 mb-3 fw-bold shadow-sm" value={editingVocab.kanji} onChange={e => setEditingVocab({...editingVocab, kanji: e.target.value})} placeholder="Kanji" required />
                  <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hanviet} onChange={e => setEditingVocab({...editingVocab, hanviet: e.target.value})} placeholder="Hán Việt" required />
                  <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hiragana} onChange={e => setEditingVocab({...editingVocab, hiragana: e.target.value})} placeholder="Hiragana" required />
                  <input type="text" className="form-control bg-light border-0 mb-4 shadow-sm" value={editingVocab.meaning} onChange={e => setEditingVocab({...editingVocab, meaning: e.target.value})} placeholder="Ý nghĩa" required />
                </>
              ) : (
                <>
                  <input type="text" className="form-control bg-light border-0 mb-3 fw-bold shadow-sm" value={editingVocab.word} onChange={e => setEditingVocab({...editingVocab, word: e.target.value})} placeholder="Từ vựng" required />
                  {(editingVocab.language || 'ja') === 'ja' && (
                    <>
                      <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hanviet || ''} onChange={e => setEditingVocab({...editingVocab, hanviet: e.target.value})} placeholder="Hán Việt" />
                      <input type="text" className="form-control bg-light border-0 mb-3 shadow-sm" value={editingVocab.hiragana || ''} onChange={e => setEditingVocab({...editingVocab, hiragana: e.target.value})} placeholder="Cách đọc" />
                    </>
                  )}
                  <input type="text" className="form-control bg-light border-0 mb-4 shadow-sm" value={editingVocab.meaning} onChange={e => setEditingVocab({...editingVocab, meaning: e.target.value})} placeholder="Ý nghĩa" required />
                </>
              )}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-secondary w-50 fw-bold rounded-3" onClick={() => setEditingVocab(null)}>Hủy</button>
                <button type="submit" className="btn w-50 fw-bold text-white rounded-3" style={{ backgroundColor: '#8a2be2' }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {noteModalVocab && (
        <SaveNoteModal vocab={noteModalVocab} sets={sets} onClose={() => setNoteModalVocab(null)} onSaveSuccess={() => fetchSets(false, true)} />
      )}

      <div className="mx-auto has-mobile-bottom-bar" style={{ maxWidth: '500px' }}>
        {/* THANH TRẠNG THÁI GHIM ĐỈNH MÀN HÌNH */}
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
              {isFullscreen ? '↙️' : '⛶'}
            </button>
          </div>
          <div className="progress" style={{ height: '6px', borderRadius: '10px' }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${((currentIndex + 1) / vocabsToStudy.length) * 100}%`,
                backgroundColor: '#8a2be2',
              }}
            ></div>
          </div>
        </div>

        <div
          className="d-flex justify-content-center fade-in-slide"
          key={currentIndex}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <Flashcard
            vocab={vocabsToStudy[currentIndex]}
            autoPlay={autoPlay}
            contentType={currentContentType}
            isReversed={isReversed}
            kanjiFront={kanjiFront}
            kanjiBack={kanjiBack}
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
        </div>

        <div className="action-grid-2col mt-3">
          <div className="form-check form-switch bg-white px-3 py-2 rounded-4 shadow-sm border d-flex align-items-center justify-content-center gap-2 m-0" style={{ minHeight: '48px' }}>
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
          <div className="form-check form-switch bg-white px-3 py-2 rounded-4 shadow-sm border d-flex align-items-center justify-content-center gap-2 m-0" style={{ minHeight: '48px' }}>
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

        {/* THANH CÔNG CỤ GHIM ĐÁY MÀN HÌNH (MOBILE-BOTTOM-BAR) */}
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
                className="btn text-white btn-mobile-chip flex-fill"
                style={{ backgroundColor: '#8a2be2' }}
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