import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import SetSelector from './SetSelector';
import GameModeSelector from './GameModeSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';

function MatchMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('lang_ja');
  const [difficulty, setDifficulty] = useState(6); 

  const targetSets = React.useMemo(() => {
    if (!sets || sets.length === 0) return [];
    const validSets = sets.filter(s => !s.title?.startsWith('_Thư mục:'));
    const idStr = String(selectedSetId);
    if (idStr.startsWith('lang_') || idStr.startsWith('all_')) {
      const lang = idStr.replace('lang_', '').replace('all_', '');
      if (lang === 'kanji') return validSets.filter(s => s.type === 'kanji');
      if (lang === 'en') return validSets.filter(s => s.type !== 'kanji' && s.language === 'en');
      if (lang === 'zh') return validSets.filter((s) => s.type !== 'kanji' && s.language === 'zh');
      return validSets.filter(s => s.type !== 'kanji' && (s.language || 'ja') === 'ja');
    }
    if (idStr.startsWith('folder_')) {
      const folderName = idStr.substring(7);
      return validSets.filter(s => (s.folder_path || '🏠 Thư mục gốc') === folderName);
    }
    const targetSet = validSets.find(s => s.id == selectedSetId);
    return targetSet ? [targetSet] : [];
  }, [selectedSetId, sets]);

  const currentContentType = (targetSets.length > 0 && targetSets.every(s => s.type === 'kanji')) ? 'kanji' : 'vocab'; 
  const [gameMode, setGameMode] = useState('normal'); 
  const [kanjiMatchA, setKanjiMatchA] = useState('kanji');
  const [kanjiMatchB, setKanjiMatchB] = useState('meaning');
  const [isReversed, setIsReversed] = useState(false);
  
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastMatchTime, setLastMatchTime] = useState(null);
  const [highScore, setHighScore] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  useEffect(() => {
    setBestTime(localStorage.getItem(`matchBest_${selectedSetId}_${difficulty}_${currentContentType}`) || null);
    setHighScore(localStorage.getItem(`matchScore_${selectedSetId}_${currentContentType}`) || null);
  }, [selectedSetId, difficulty, currentContentType]);
  
  const [isStarted, setIsStarted] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [errorCards, setErrorCards] = useState([]); 
  const [successCards, setSuccessCards] = useState([]); 
  const [isAnimating, setIsAnimating] = useState(false); 
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isWrongMatch, setIsWrongMatch] = useState(false);

  const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

  const hasFourFields = (() => {
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
        s =>
          s.language === 'ja' ||
          s.language === 'zh' ||
          s.type === 'kanji' ||
          (s.vocabularies && s.vocabularies.some(v => v.hanviet || v.hiragana))
      );
    }
    return false;
  })();

  const handleSwap = () => {
    if (hasFourFields) {
      setKanjiMatchA(kanjiMatchB);
      setKanjiMatchB(kanjiMatchA);
    } else {
      setIsReversed(!isReversed);
    }
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
    const handleFs = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handleFs);
    document.addEventListener("webkitfullscreenchange", handleFs);
    return () => {
      document.removeEventListener("fullscreenchange", handleFs);
      document.removeEventListener("webkitfullscreenchange", handleFs);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isStarted && !isFinished) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          if (gameMode === 'challenge') {
            if (prev <= 1) { setIsFinished(true); return 0; }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, isFinished, gameMode]);

  useEffect(() => {
    if (cards.length > 0 && matchedIds.length === cards.length / 2) {
      if (gameMode === 'challenge') generateCards(); 
      else {
        setIsFinished(true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        vibrate([100, 50, 100, 50, 200]);
        const key = `matchBest_${selectedSetId}_${cards.length / 2}_${currentContentType}`;
        if (!bestTime || timeElapsed < bestTime) {
          localStorage.setItem(key, timeElapsed);
          setBestTime(timeElapsed);
          toast.success(`🎉 Kỷ lục mới: ${timeElapsed} giây!`);
        }
      }
    }
  }, [matchedIds, cards, gameMode, timeElapsed, bestTime, selectedSetId, currentContentType]);

  useEffect(() => {
    if (isFinished && gameMode === 'challenge') {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      vibrate([100, 50, 100, 50, 200]);
      if (!highScore || score > highScore) {
        localStorage.setItem(`matchScore_${selectedSetId}_${currentContentType}`, score);
        setHighScore(score);
        toast.success(`🏆 Điểm cao mới: ${score} điểm!`);
      }
    }
  }, [isFinished, gameMode, score, highScore, selectedSetId, currentContentType]);

  const getCardTexts = (vocab) => {
    let faceA = currentContentType === 'kanji' ? kanjiMatchA : (hasFourFields ? (kanjiMatchA === 'kanji' ? 'word' : kanjiMatchA) : (isReversed ? 'meaning' : 'word'));
    let faceB = currentContentType === 'kanji' ? kanjiMatchB : (hasFourFields ? (kanjiMatchB === 'meaning' && kanjiMatchA === 'kanji' ? 'meaning' : (kanjiMatchB === 'kanji' ? 'word' : kanjiMatchB)) : (isReversed ? 'word' : 'meaning'));
    if (!vocab[faceA] && (faceA === 'hanviet' || faceA === 'hiragana')) faceA = 'word';
    if (!vocab[faceB] && (faceB === 'hanviet' || faceB === 'hiragana')) faceB = 'word';
    
    return [vocab[faceA] || "", vocab[faceB] || ""];
  };

  const generateCards = async () => {
    if (targetSets.length === 0) {
      toast.warning("Không có học phần nào phù hợp!");
      return false;
    }

    const fullSets = await Promise.all(targetSets.map(async (s) => {
      if (s.vocabularies && s.vocabularies.length > 0) return s;
      try {
        const res = await api.get(`/sets/${s.id}`);
        return res.data;
      } catch (e) { return s; }
    }));
    
    setSets(prev => prev.map(p => fullSets.find(fs => fs.id === p.id) || p));
    const pool = fullSets.flatMap(s => s.vocabularies || []);

    if (pool.length < 2) {
      toast.warning(`Học phần này cần ít nhất 2 thẻ (từ vựng) để chơi ghép thẻ!`);
      return false;
    }

    const actualDifficulty = Math.min(difficulty, pool.length);
    const pivotIndex = Math.floor(Math.random() * pool.length);
    const pivotWord = pool[pivotIndex];
    
    const scoredPool = pool.map(v => {
      let sc = v.id === pivotWord.id ? 999 : 0;
      const currentText = currentContentType === 'kanji' ? pivotWord[kanjiMatchA] : pivotWord.word;
      const vText = currentContentType === 'kanji' ? v[kanjiMatchA] : v.word;
      if (currentText && vText) {
        currentText.split('').forEach(c => { if (vText.includes(c)) sc += 1; });
      }
      return { ...v, score: sc + Math.random() };
    }).sort((a, b) => b.score - a.score);
    
    const initialCards = [];
    scoredPool.slice(0, actualDifficulty).forEach(vocab => {
      const [text1, text2] = getCardTexts(vocab);
      initialCards.push({ id: `cardA-${vocab.id}-${Date.now()}`, matchId: vocab.id, text: text1 });
      initialCards.push({ id: `cardB-${vocab.id}-${Date.now()}`, matchId: vocab.id, text: text2 });
    });
    setCards(initialCards.sort(() => 0.5 - Math.random()));
    setMatchedIds([]);
    return true;
  };

  const startGame = async () => {
    const success = await generateCards();
    if (!success) return;

    setSelectedCards([]);
    setErrorCards([]);
    setSuccessCards([]);
    setIsAnimating(false);
    setTimeElapsed(gameMode === 'challenge' ? 60 : 0);
    setScore(0);
    setCombo(0);
    setLastMatchTime(null);
    setIsFinished(false);
    setIsStarted(true);
    if (!isFullscreen) toggleFullscreen();
  };

  const handleCardClick = (card) => {
    if (isAnimating || matchedIds.includes(card.matchId) || selectedCards.length === 2 || selectedCards.find(c => c.id === card.id)) return;
    vibrate(20);

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setIsAnimating(true); 
      if (newSelected[0].matchId === newSelected[1].matchId) {
        vibrate(50);
        const now = Date.now();
        let newCombo = 1;
        if (lastMatchTime && (now - lastMatchTime < 2500)) newCombo = combo + 1; 
        
        setCombo(newCombo);
        setScore(s => s + (10 * newCombo));
        setLastMatchTime(now);
        setSuccessCards([newSelected[0].id, newSelected[1].id]);

        setTimeout(() => {
          setMatchedIds(prev => [...prev, newSelected[0].matchId]);
          setSelectedCards([]);
          setSuccessCards([]);
          setIsAnimating(false); 
        }, 500);
      } else {
        vibrate([200, 100, 200]);
        setCombo(0); 
        setErrorCards([newSelected[0].id, newSelected[1].id]);
        setIsWrongMatch(true); // Kích hoạt chớp đỏ màn hình
        setTimeout(() => setIsWrongMatch(false), 400);

        setTimeout(() => {
          setSelectedCards([]);
          setErrorCards([]);
          setIsAnimating(false); 
        }, 800);
      }
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="container mt-3 fade-in-slide" style={{ maxWidth: '600px' }}>
        <div className="card shadow-sm border-0 p-3 p-md-4 rounded-4 bg-white">
          <h4 className="text-center mb-3 fw-bold text-dark">🎮 Ghép Thẻ Phản Xạ</h4>

          <div className="mb-3">
            <label className="form-label fw-bold text-muted small mb-1">Chế độ chơi</label>
            <div className="set-sheet-segmented mb-0" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button
                type="button"
                className={`set-seg-btn ${gameMode === 'normal' ? 'active' : ''}`}
                onClick={() => setGameMode('normal')}
              >
                ⏱️ Tính giờ
              </button>
              <button
                type="button"
                className={`set-seg-btn ${gameMode === 'challenge' ? 'active' : ''}`}
                onClick={() => setGameMode('challenge')}
              >
                🔥 Thử thách 60s
              </button>
            </div>
          </div>

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
              kanjiFront={kanjiMatchA}
              setKanjiFront={setKanjiMatchA}
              kanjiBack={kanjiMatchB}
              setKanjiBack={setKanjiMatchB}
              isReversed={isReversed}
              setIsReversed={setIsReversed}
              onSwap={handleSwap}
              sectionLabel="Luật ghép"
              presets={[
                {
                  id: 'classic', icon: '🏛️', iconBg: '#ede9fe', label: 'Từ ↔ Nghĩa',
                  getDesc: (f, b, type) => { const w = type === 'kanji' ? 'Hán tự' : 'Từ'; return f === 'meaning' && (b === 'word' || b === 'kanji') ? `Nghĩa ↔ ${w}` : `${w} ↔ Nghĩa`; },
                  frontKey: (type) => type === 'kanji' ? 'kanji' : 'word', backKey: () => 'meaning',
                  isActive: (f, b, type) => { const w = type === 'kanji' ? 'kanji' : 'word'; return ((f === w) && b === 'meaning') || (f === 'meaning' && b === w); }
                },
                {
                  id: 'speed', icon: '⚡', iconBg: '#fef3c7', label: 'Từ ↔ Kana',
                  getDesc: (f, b, type) => { const w = type === 'kanji' ? 'Hán tự' : 'Từ'; return f === 'hiragana' && (b === 'word' || b === 'kanji') ? `Kana ↔ ${w}` : `${w} ↔ Kana`; },
                  frontKey: (type) => type === 'kanji' ? 'kanji' : 'word', backKey: () => 'hiragana',
                  isActive: (f, b, type) => { const w = type === 'kanji' ? 'kanji' : 'word'; return ((f === w) && b === 'hiragana') || (f === 'hiragana' && b === w); }
                },
                {
                  id: 'hanviet', icon: '👑', iconBg: '#fee2e2', label: 'Hán Việt',
                  getDesc: (f, b) => f === 'meaning' && b === 'hanviet' ? 'Nghĩa ↔ Hán Việt' : 'Hán Việt ↔ Nghĩa',
                  frontKey: () => 'hanviet', backKey: () => 'meaning',
                  isActive: (f, b) => (f === 'hanviet' && b === 'meaning') || (f === 'meaning' && b === 'hanviet')
                },
                {
                  id: 'listening', icon: '🎧', iconBg: '#dbeafe', label: 'Kana ↔ Nghĩa',
                  getDesc: (f, b) => f === 'meaning' && b === 'hiragana' ? 'Nghĩa ↔ Kana' : 'Kana ↔ Nghĩa',
                  frontKey: () => 'hiragana', backKey: () => 'meaning',
                  isActive: (f, b) => (f === 'hiragana' && b === 'meaning') || (f === 'meaning' && b === 'hiragana')
                }
              ]}
              twoFieldPresets={[
                { id: 'forward', icon: '🧠', iconBg: '#ede9fe', label: 'Xuôi', description: 'Từ ↔ Nghĩa', reversedValue: false },
                { id: 'backward', icon: '🇻🇳', iconBg: '#fef3c7', label: 'Ngược', description: 'Nghĩa ↔ Từ', reversedValue: true },
              ]}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold text-muted small mb-1">Số cặp thẻ</label>
            <div className="d-flex gap-2">
              {[4, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`btn btn-mobile-chip flex-fill ${difficulty === num ? 'btn-primary text-white' : 'chip-slate'}`}
                  onClick={() => setDifficulty(num)}
                >
                  {num} cặp
                </button>
              ))}
            </div>
          </div>

          {gameMode === 'normal' && bestTime !== null && (
            <div className="chip-primary text-center fw-bold py-2 px-3 mb-3 rounded-3 small">
              🏆 Kỷ lục: {bestTime} giây
            </div>
          )}
          {gameMode === 'challenge' && highScore !== null && (
            <div className="chip-warning text-center fw-bold py-2 px-3 mb-3 rounded-3 small">
              🏆 Điểm cao nhất: {highScore} điểm
            </div>
          )}

          <button
            className={`btn btn-touch w-100 ${gameMode === 'challenge' ? 'btn-danger text-white' : 'btn-primary'}`}
            onClick={startGame}
          >
            Bắt đầu chơi 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container-fluid py-4 text-center transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
      
      {showExitModal && (
        <div className="modal d-flex align-items-center justify-content-center fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="card border-0 shadow-lg rounded-4 p-4 text-center" style={{ width: '90%', maxWidth: '400px' }}>
            <h4 className="fw-bold text-danger mb-3">Cảnh báo</h4>
            <p className="text-dark mb-4 fs-5">Bạn đang trong ván chơi. Nếu thoát bây giờ sẽ mất toàn bộ tiến trình và điểm số. Chắc chắn thoát?</p>
            <div className="d-flex gap-3">
              <button className="btn btn-danger fw-bold w-50 py-2 rounded-3" onClick={() => { setShowExitModal(false); setIsStarted(false); setIsFullscreen(false); }}>Thoát luôn</button>
              <button className="btn btn-secondary fw-bold w-50 py-2 rounded-3" onClick={() => setShowExitModal(false)}>Tiếp tục chơi</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto" style={{ maxWidth: '900px', width: '100%' }}>
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <button className="btn-icon-soft chip-slate" onClick={toggleFullscreen} title="Toàn màn hình">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <h4 className="fw-bold m-0 text-center flex-grow-1">
            {gameMode === 'challenge' ? 'Còn lại: ' : 'Thời gian: '}
            <span className={gameMode === 'challenge' && timeElapsed <= 10 ? 'text-danger shake d-inline-block' : 'text-primary'}>{timeElapsed}s</span>
          </h4>
          
          <button className="btn btn-mobile-chip chip-slate" onClick={() => setShowExitModal(true)}>Thoát</button>
        </div>

        {gameMode === 'challenge' && (
          <div className="mb-4 d-flex flex-column align-items-center gap-2 position-relative">
            <div className="d-flex align-items-center gap-3">
              <h4 className="fw-bold m-0 border px-4 py-2 rounded-pill bg-white shadow-sm">
                Điểm: <span className="text-success">{score}</span>
              </h4>
              {combo > 1 && (
                <div className="position-relative">
                  <span className="badge rounded-pill bg-danger fs-5 px-3 py-2 shadow-sm streak-glow">
                    Combo x{combo} 🔥
                  </span>
                  <div className="position-absolute top-100 start-50 translate-middle-x mt-2 w-100 overflow-hidden rounded-pill" style={{ height: '6px', backgroundColor: 'rgba(220,53,69,0.2)' }}>
                    <div key={combo} className="bg-danger h-100 combo-timer-bar rounded-pill"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isFinished ? (
          <div className="card shadow-lg border-0 p-5 mt-4 rounded-4 mx-auto bg-white" style={{ maxWidth: '600px' }}>
            <h2 className="text-success fw-bold mb-3">🎉 Tuyệt vời!</h2>
            {gameMode === 'normal' ? (
              <p className="fs-5 text-muted mb-4">Bạn đã hoàn thành trong <strong className="text-dark">{timeElapsed} giây</strong>.</p>
            ) : (
              <p className="fs-5 text-muted mb-4">Tổng điểm của bạn: <strong className="text-danger fs-3">{score}</strong></p>
            )}
            <button className={`btn btn-touch mt-2 fw-bold w-100 ${gameMode === 'challenge' ? 'btn-danger text-white' : 'btn-primary'}`} onClick={startGame}>Chơi lại</button>
          </div>
        ) : (
          <motion.div 
            animate={isWrongMatch ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } } : {}}
            className={`row g-3 px-2 ${isWrongMatch ? 'screen-flash-error rounded-4' : ''}`}
          >
            {cards.map((card, index) => {
              const isSelected = selectedCards.some(c => c.id === card.id) && !successCards.includes(card.id);
              const isMatched = matchedIds.includes(card.matchId);
              const isError = errorCards.includes(card.id);
              const isSuccess = successCards.includes(card.id);

              let cardClasses = 'bg-white text-dark';
              let cardStyles = {
                cursor: isMatched ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--surface-border)',
                pointerEvents: isMatched ? 'none' : 'auto',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
              };

              if (window.innerWidth > 768) {
                cardStyles.minHeight = '120px';
              }

              if (isSelected) {
                cardClasses = 'match-card-selected text-white';
                cardStyles.background = 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)';
                cardStyles.color = '#ffffff';
                cardStyles.border = '3px solid #fde047';
                cardStyles.boxShadow =
                  '0 0 0 4px rgba(139, 92, 246, 0.38), 0 10px 24px -4px rgba(109, 40, 217, 0.55)';
              } else if (isError) {
                cardClasses = 'match-card-error text-white';
                cardStyles.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                cardStyles.color = '#ffffff';
                cardStyles.border = '3px solid #fecaca';
                cardStyles.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.35)';
              } else if (isSuccess) {
                cardClasses = 'match-card-matched text-white';
                cardStyles.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                cardStyles.color = '#ffffff';
                cardStyles.border = '3px solid #a7f3d0';
                cardStyles.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.35)';
              }

              return (
                <div className="col-6 col-md-4 col-lg-3 d-flex" key={card.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.75, y: 15 }}
                    animate={
                      isMatched
                        ? { scale: 0.7, opacity: 0, filter: 'blur(6px)', y: 0 }
                        : isSuccess
                        ? { opacity: 1, scale: 1.06, y: 0, filter: 'blur(0px)' }
                        : isError
                        ? { opacity: 1, scale: [1, 1.05, 0.95, 1], y: 0 }
                        : isSelected
                        ? { opacity: 1, scale: 1.04, y: -4, filter: 'blur(0px)' }
                        : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
                    }
                    transition={
                      isMatched || isSuccess || isError || isSelected
                        ? { type: 'spring', stiffness: 380, damping: 26, mass: 0.7 }
                        : { delay: index * 0.025, type: 'spring', stiffness: 400, damping: 25 }
                    }
                    whileHover={!isSelected && !isSuccess && !isError && !isMatched ? { scale: 1.02 } : {}}
                    whileTap={!isSelected && !isSuccess && !isError && !isMatched ? { scale: 0.95 } : {}}
                    className={`card w-100 rounded-4 match-card-ratio ${cardClasses}`}
                    style={cardStyles}
                    onClick={() => handleCardClick(card)}
                  >
                    {isSelected && (
                      <span
                        className="position-absolute top-0 end-0 m-2 px-2 py-0 rounded-pill fw-bold"
                        style={{
                          fontSize: '0.65rem',
                          backgroundColor: '#fde047',
                          color: '#1e1b4b',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                        }}
                      >
                        ✓ Đang chọn
                      </span>
                    )}
                    <div
                      className="card-body d-flex align-items-center justify-content-center p-3 text-wrap text-center w-100"
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: isSelected || isError || isSuccess ? '#ffffff' : 'var(--text-primary)',
                      }}
                    >
                      {card.text}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default MatchMode;