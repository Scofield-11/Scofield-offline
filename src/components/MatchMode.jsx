import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import SetSelector from './SetSelector';
import GameModeSelector from './GameModeSelector';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  Timer,
  Flame,
  Trophy,
  Gamepad2,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  Layers,
  Check,
  Compass,
} from 'lucide-react';

function MatchMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [difficulty, setDifficulty] = useState(6); 

  const targetSets = React.useMemo(() => {
    if (!sets || sets.length === 0) return [];
    if (!selectedSetId) return [];
    const validSets = sets.filter(s => !s.title?.startsWith('_Thư mục:'));
    const idStr = String(selectedSetId);
    if (idStr.startsWith('multi_')) {
      const ids = idStr.replace('multi_', '').split(',').map(Number);
      return validSets.filter((s) => ids.includes(Number(s.id)));
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
          toast.success(`Kỷ lục mới: ${timeElapsed} giây!`);
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
        toast.success(`Điểm cao mới: ${score} điểm!`);
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

  const totalCardsCount = React.useMemo(() => {
    return targetSets.reduce(
      (sum, s) => sum + (s.vocab_count || (s.vocabularies ? s.vocabularies.length : 0)),
      0
    );
  }, [targetSets]);

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

  const isZh =
    String(selectedSetId).includes('zh') ||
    (targetSets.length > 0 && targetSets.every((s) => s.language === 'zh'));
  const wordLabel = isZh ? 'Chữ Hán' : 'Từ';
  const readingLabel = isZh ? 'Pinyin' : 'Phiên âm';

  const currentMatchRuleText = React.useMemo(() => {
    if (hasFourFields) {
      const map = isZh
        ? { kanji: 'Chữ Hán', word: 'Chữ Hán', hanviet: 'Hán Việt', hiragana: 'Pinyin', meaning: 'Ý nghĩa' }
        : { kanji: 'Từ vựng', word: 'Từ vựng', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      const a = map[kanjiMatchA] || 'Từ';
      const b = map[kanjiMatchB] || 'Nghĩa';
      return `${a} ↔ ${b}`;
    }
    return isReversed ? 'Nghĩa ↔ Từ' : 'Từ ↔ Nghĩa';
  }, [hasFourFields, isZh, kanjiMatchA, kanjiMatchB, isReversed]);

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="test-lobby-container">
        {/* Tiêu đề trang tối giản */}
        <div className="test-lobby-header">
          <h2 className="test-lobby-title">Đấu Trường Ghép Thẻ Phản Xạ</h2>
        </div>

        {/* Bố cục 2 Cột Studio (Max-width 980px) */}
        <div className="test-lobby-layout">
          {/* CỘT TRÁI (7/12): CẤU HÌNH ĐẤU TRƯỜNG */}
          <div className="test-lobby-config-col">
            {/* Card 1: Chế độ chơi */}
            <div className="test-lobby-card">
              <div className="test-lobby-card-title">Chế độ thi đấu</div>
              <div className="gms-grid gms-grid-2">
                <button
                  type="button"
                  className={`gms-card ${gameMode === 'normal' ? 'gms-card--active' : ''}`}
                  onClick={() => setGameMode('normal')}
                >
                  <div className="gms-card-icon icon-badge icon-badge-sky">
                    <Timer size={18} strokeWidth={2.2} />
                  </div>
                  <div className="gms-card-content">
                    <span className="gms-card-title">Tính giờ</span>
                    <span className="gms-card-desc">Ghép hết các cặp nhanh nhất</span>
                  </div>
                  {gameMode === 'normal' && (
                    <div className="gms-card-check" aria-hidden="true">
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  className={`gms-card ${gameMode === 'challenge' ? 'gms-card--active' : ''}`}
                  onClick={() => setGameMode('challenge')}
                >
                  <div className="gms-card-icon icon-badge icon-badge-amber">
                    <Flame size={18} strokeWidth={2.2} />
                  </div>
                  <div className="gms-card-content">
                    <span className="gms-card-title">Thử thách 60s</span>
                    <span className="gms-card-desc">Đua điểm & chuỗi Combo</span>
                  </div>
                  {gameMode === 'challenge' && (
                    <div className="gms-card-check" aria-hidden="true">
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Chọn học phần */}
            <div className="test-lobby-card">
              <div className="test-lobby-card-title">Học phần thi đấu</div>
              <SetSelector
                sets={sets}
                selectedSetId={selectedSetId}
                setSelectedSetId={setSelectedSetId}
              />
            </div>

            {/* Card 3: Luật ghép thẻ */}
            <div className="test-lobby-card">
              <GameModeSelector
                hasFourFields={hasFourFields}
                currentContentType={currentContentType}
                currentLanguage={isZh ? 'zh' : 'ja'}
                kanjiFront={kanjiMatchA}
                setKanjiFront={setKanjiMatchA}
                kanjiBack={kanjiMatchB}
                setKanjiBack={setKanjiMatchB}
                isReversed={isReversed}
                setIsReversed={setIsReversed}
                onSwap={handleSwap}
                sectionLabel="Luật ghép thẻ"
                presets={[
                  {
                    id: 'classic',
                    iconType: 'languages',
                    badgeClass: 'icon-badge-indigo',
                    label: `${wordLabel} ↔ Nghĩa`,
                    getDesc: (f, b) =>
                      f === 'meaning' && (b === 'word' || b === 'kanji')
                        ? `Nghĩa ↔ ${wordLabel}`
                        : `${wordLabel} ↔ Nghĩa`,
                    frontKey: (type) => (type === 'kanji' ? 'kanji' : 'word'),
                    backKey: () => 'meaning',
                    isActive: (f, b, type) => {
                      const w = type === 'kanji' ? 'kanji' : 'word';
                      return (
                        ((f === w || f === 'kanji' || f === 'word') && b === 'meaning') ||
                        (f === 'meaning' && (b === w || b === 'kanji' || b === 'word'))
                      );
                    },
                  },
                  {
                    id: 'speed',
                    iconType: 'forward',
                    badgeClass: 'icon-badge-amber',
                    label: `${wordLabel} ↔ ${readingLabel}`,
                    getDesc: (f, b) =>
                      f === 'hiragana' && (b === 'word' || b === 'kanji')
                        ? `${readingLabel} ↔ ${wordLabel}`
                        : `${wordLabel} ↔ ${readingLabel}`,
                    frontKey: (type) => (type === 'kanji' ? 'kanji' : 'word'),
                    backKey: () => 'hiragana',
                    isActive: (f, b, type) => {
                      const w = type === 'kanji' ? 'kanji' : 'word';
                      return (
                        ((f === w || f === 'kanji' || f === 'word') && b === 'hiragana') ||
                        (f === 'hiragana' && (b === w || b === 'kanji' || b === 'word'))
                      );
                    },
                  },
                  {
                    id: 'hanviet',
                    iconType: 'hanviet',
                    badgeClass: 'icon-badge-rose',
                    label: 'Hán Việt',
                    getDesc: (f, b) =>
                      f === 'meaning' && b === 'hanviet' ? 'Nghĩa ↔ Hán Việt' : 'Hán Việt ↔ Nghĩa',
                    frontKey: () => 'hanviet',
                    backKey: () => 'meaning',
                    isActive: (f, b) =>
                      (f === 'hanviet' && b === 'meaning') || (f === 'meaning' && b === 'hanviet'),
                  },
                  {
                    id: 'listening',
                    iconType: 'listening',
                    badgeClass: 'icon-badge-emerald',
                    label: `${readingLabel} ↔ Nghĩa`,
                    getDesc: (f, b) =>
                      f === 'meaning' && b === 'hiragana'
                        ? `Nghĩa ↔ ${readingLabel}`
                        : `${readingLabel} ↔ Nghĩa`,
                    frontKey: () => 'hiragana',
                    backKey: () => 'meaning',
                    isActive: (f, b) =>
                      (f === 'hiragana' && b === 'meaning') || (f === 'meaning' && b === 'hiragana'),
                  },
                ]}
                twoFieldPresets={[
                  {
                    id: 'forward',
                    iconType: 'forward',
                    badgeClass: 'icon-badge-indigo',
                    label: 'Xuôi',
                    description: 'Từ ↔ Nghĩa',
                    reversedValue: false,
                  },
                  {
                    id: 'backward',
                    iconType: 'backward',
                    badgeClass: 'icon-badge-amber',
                    label: 'Ngược',
                    description: 'Nghĩa ↔ Từ',
                    reversedValue: true,
                  },
                ]}
              />
            </div>

            {/* Card 4: Số cặp thẻ */}
            <div className="test-lobby-card">
              <div className="test-lobby-card-title d-flex justify-content-between align-items-center">
                <span>Quy mô bàn đấu</span>
                <span className="text-secondary fw-normal">
                  Tổng thẻ: <strong className="text-primary">{difficulty * 2}</strong> ô
                </span>
              </div>
              <div className="test-lobby-pills-row">
                {[4, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`test-lobby-pill ${difficulty === num ? 'active' : ''}`}
                    onClick={() => setDifficulty(num)}
                  >
                    {num} cặp ({num * 2} thẻ)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5/12, Sticky): TẤM VÉ ĐẤU TRƯỜNG PHẢN XẠ */}
          <div className="test-lobby-ticket-col">
            <div className="test-lobby-hero-card">
              {/* Chữ Hán chìm '速' (Tốc - Tốc độ) */}
              <div className="test-lobby-watermark-kanji" aria-hidden="true">
                速
              </div>

              <div className="test-lobby-hero-content">
                {/* Header */}
                <div className="test-lobby-hero-header">
                  <span className="test-lobby-hero-title">Tấm vé đấu trường phản xạ</span>
                  <span
                    className="badge bg-secondary-subtle text-secondary"
                    style={{ fontSize: '0.68rem', fontWeight: 600 }}
                  >
                    Speed Arena
                  </span>
                </div>

                {/* Khối Kỷ lục nổi bật */}
                <div className="test-lobby-count-hero-block">
                  <div className="test-lobby-hero-count-label d-flex align-items-center gap-1.5">
                    <Trophy size={14} strokeWidth={2.4} className="text-warning" />
                    <span>
                      {gameMode === 'normal' ? 'Kỷ lục thời gian' : 'Kỷ lục điểm số cao nhất'}
                    </span>
                  </div>
                  <div className="d-flex align-items-baseline">
                    <span className="test-lobby-hero-count-number">
                      {gameMode === 'normal'
                        ? bestTime !== null
                          ? `${bestTime}s`
                          : '--'
                        : highScore !== null
                        ? `${highScore}`
                        : '--'}
                    </span>
                    <span className="test-lobby-hero-count-unit">
                      {gameMode === 'normal'
                        ? 'giây nhanh nhất'
                        : 'điểm tích lũy'}
                    </span>
                  </div>
                  <div className="test-lobby-progress-track">
                    <div
                      className="test-lobby-progress-fill"
                      style={{
                        width:
                          gameMode === 'normal'
                            ? bestTime !== null
                              ? '100%'
                              : '0%'
                            : highScore !== null
                            ? '100%'
                            : '0%',
                      }}
                    />
                  </div>
                  <div className="test-lobby-progress-sublabel">
                    {gameMode === 'normal'
                      ? `Bàn đấu ${difficulty} cặp (${difficulty * 2} thẻ lật)`
                      : 'Chế độ sinh tồn 60 giây'}
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
                      {gameMode === 'normal' ? (
                        <Timer size={16} strokeWidth={2.2} />
                      ) : (
                        <Flame size={16} strokeWidth={2.2} />
                      )}
                    </div>
                    <div className="test-lobby-param-details">
                      <div className="test-lobby-param-label">Chế độ chơi</div>
                      <div className="test-lobby-param-value">
                        {gameMode === 'normal' ? 'Tính giờ phản xạ' : 'Thử thách 60 giây'}
                      </div>
                    </div>
                  </div>

                  <div className="test-lobby-param-item">
                    <div className="test-lobby-param-icon">
                      <Gamepad2 size={16} strokeWidth={2.2} />
                    </div>
                    <div className="test-lobby-param-details">
                      <div className="test-lobby-param-label">Quy mô bàn đấu</div>
                      <div className="test-lobby-param-value">
                        {difficulty * 2} thẻ ({difficulty} cặp)
                      </div>
                    </div>
                  </div>

                  <div className="test-lobby-param-item">
                    <div className="test-lobby-param-icon">
                      <Compass size={16} strokeWidth={2.2} />
                    </div>
                    <div className="test-lobby-param-details">
                      <div className="test-lobby-param-label">Luật ghép thẻ</div>
                      <div className="test-lobby-param-value" title={currentMatchRuleText}>
                        {currentMatchRuleText}
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
                    onClick={startGame}
                    disabled={totalCardsCount === 0}
                  >
                    <Gamepad2 size={18} strokeWidth={2.2} />
                    <span>Bắt đầu ván đấu</span>
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

  return (
    <div className={`container-fluid py-4 text-center transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
      
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="set-sheet-backdrop"
            style={{ zIndex: 9999 }}
            onClick={() => setShowExitModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="card border-0 shadow-lg rounded-4 p-4 text-center"
              style={{
                width: '90%',
                maxWidth: '400px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--surface-border)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-center mb-2">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.12)' }}
                >
                  <AlertTriangle size={28} className="text-danger" />
                </div>
              </div>
              <h5 className="fw-bold text-danger mb-2">Cảnh báo</h5>
              <p className="mb-4 fs-6" style={{ color: 'var(--text-secondary)' }}>
                Bạn đang trong ván chơi. Nếu thoát bây giờ sẽ mất toàn bộ tiến trình và điểm số. Bạn có chắc chắn muốn thoát?
              </p>
              <div className="d-flex gap-3">
                <button
                  className="btn btn-danger btn-touch fw-bold w-50 py-2 rounded-3"
                  onClick={() => {
                    setShowExitModal(false);
                    setIsStarted(false);
                    setIsFullscreen(false);
                  }}
                >
                  Thoát luôn
                </button>
                <button
                  className="btn btn-light btn-touch fw-bold w-50 py-2 rounded-3"
                  onClick={() => setShowExitModal(false)}
                >
                  Tiếp tục
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto" style={{ maxWidth: '900px', width: '100%' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <button className="btn-icon-soft chip-slate" onClick={toggleFullscreen} title="Toàn màn hình">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <h4 className="fw-bold m-0 text-center flex-grow-1" style={{ color: 'var(--text-main)' }}>
            {gameMode === 'challenge' ? 'Còn lại: ' : 'Thời gian: '}
            <span className={gameMode === 'challenge' && timeElapsed <= 10 ? 'text-danger shake d-inline-block' : 'text-primary'}>
              {timeElapsed}s
            </span>
          </h4>

          <button className="btn btn-mobile-chip chip-slate d-flex align-items-center gap-1" onClick={() => setShowExitModal(true)}>
            <ArrowLeft size={14} /> <span>Thoát</span>
          </button>
        </div>

        {gameMode === 'challenge' && (
          <div className="mb-4 d-flex flex-column align-items-center gap-2 position-relative">
            <div className="d-flex align-items-center gap-3">
              <h4
                className="fw-bold m-0 border px-4 py-2 rounded-pill shadow-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--surface-border)',
                  color: 'var(--text-main)',
                }}
              >
                Điểm: <span className="text-success">{score}</span>
              </h4>
              {combo > 1 && (
                <div className="position-relative">
                  <span className="badge rounded-pill bg-danger fs-5 px-3 py-2 shadow-sm streak-glow d-inline-flex align-items-center gap-1.5">
                    <span>Combo x{combo}</span>
                    <Flame size={16} />
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
          <div
            className="card shadow-lg border-0 p-5 mt-4 rounded-4 mx-auto text-center"
            style={{
              maxWidth: '600px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--surface-border)',
            }}
          >
            <div className="d-flex justify-content-center mb-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '76px',
                  height: '76px',
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                }}
              >
                <Trophy size={40} strokeWidth={2.4} className="text-warning" />
              </div>
            </div>
            <h2 className="text-success fw-bold mb-2">Tuyệt vời! Hoàn thành!</h2>
            {gameMode === 'normal' ? (
              <p className="fs-5 text-muted mb-4">
                Bạn đã hoàn thành trong <strong style={{ color: 'var(--text-main)' }}>{timeElapsed} giây</strong>.
              </p>
            ) : (
              <p className="fs-5 text-muted mb-4">
                Tổng điểm của bạn: <strong className="text-danger fs-3">{score}</strong>
              </p>
            )}
            <button
              className={`btn btn-touch mt-2 fw-bold w-100 py-3 ${
                gameMode === 'challenge' ? 'btn-danger text-white' : 'btn-primary'
              }`}
              onClick={startGame}
            >
              Chơi lại
            </button>
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

              let cardClasses = '';
              let cardStyles = {
                cursor: isMatched ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-surface)',
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