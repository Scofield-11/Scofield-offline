import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import LoadingSkeleton from './LoadingSkeleton';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import { playSound } from '../utils/audio';
import SetSelector from './SetSelector';
import GameModeSelector from './GameModeSelector';
import { motion, AnimatePresence } from 'framer-motion';

const CHUNK_SIZE = 7;

function LearnMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('lang_ja');
  const [allData, setAllData] = useState([]); 

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

  useEffect(() => { fetchSets(); }, [fetchSets]);

  const [isStarted, setIsStarted] = useState(false);
  const [isReversed, setIsReversed] = useState(false); 
  const [kanjiFront, setKanjiFront] = useState('kanji');
  const [kanjiBack, setKanjiBack] = useState('meaning');
  
  const [rounds, setRounds] = useState([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentRoundWords, setCurrentRoundWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [mode, setMode] = useState('choice'); 
  const [options, setOptions] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  const [isShaking, setIsShaking] = useState(false);
  const [onlyDue, setOnlyDue] = useState(false); 

  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0); 
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const srsAnsweredRefs = useRef(new Set());

  const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

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

  const handleExit = () => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    setIsFullscreen(false);
    setIsStarted(false);
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

  const hasFourFields = (() => {
    if (currentContentType === 'kanji') return true;
    if (String(selectedSetId).includes('ja') || String(selectedSetId).includes('kanji')) return true;
    if (targetSets.length > 0) {
      return targetSets.some(s => s.language === 'ja' || (s.vocabularies && s.vocabularies.some(v => v.hanviet || v.hiragana)));
    }
    return false;
  })();

  const getFrontLabel = () => {
    if (currentContentType === 'kanji') {
      const map = { kanji: 'Hán tự', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      return map[kanjiFront];
    }
    return isReversed ? 'Ý nghĩa' : 'Từ vựng';
  };

  const getBackLabel = () => {
    if (currentContentType === 'kanji') {
      const map = { kanji: 'Hán tự', hanviet: 'Hán Việt', hiragana: 'Phiên âm', meaning: 'Ý nghĩa' };
      return map[kanjiBack];
    }
    return isReversed ? 'Từ vựng' : 'Ý nghĩa';
  };

  const getQuestionText = (vocab) => {
    if (!vocab) return "";
    let front = currentContentType === 'kanji' ? kanjiFront : (hasFourFields ? (kanjiFront === 'kanji' ? 'word' : kanjiFront) : (isReversed ? 'meaning' : 'word'));
    if (!vocab[front] && (front === 'hanviet' || front === 'hiragana')) front = 'word';
    return vocab[front] || "";
  };

  const getAnswerText = (vocab) => {
    if (!vocab) return "";
    let back = currentContentType === 'kanji' ? kanjiBack : (hasFourFields ? (kanjiBack === 'meaning' && kanjiFront === 'kanji' ? 'meaning' : (kanjiBack === 'kanji' ? 'word' : kanjiBack)) : (isReversed ? 'word' : 'meaning'));
    if (!vocab[back] && (back === 'hanviet' || back === 'hiragana')) back = 'word';
    return vocab[back] || "";
  };

  const handleSwap = () => {
    if (hasFourFields) {
      setKanjiFront(kanjiBack);
      setKanjiBack(kanjiFront);
    } else {
      setIsReversed(!isReversed);
    }
  };

  const updateSRS = async (vocabId, isCorrect) => {
    if (currentContentType === 'kanji') return; 
    if (srsAnsweredRefs.current.has(vocabId)) return;
    srsAnsweredRefs.current.add(vocabId);
    try { await api.put(`/vocabularies/${vocabId}/srs`, { is_correct: isCorrect }); } 
    catch (err) { console.error("Lỗi cập nhật SRS:", err); }
  };

  const playAudio = (text, type = 'normal') => {
    if (!text) return;
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
    if (!hasJapanese) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = type === 'error' ? 0.8 : 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

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
    
    setSets(prev => prev.map(p => fullSets.find(fs => fs.id === p.id) || p));
    pool = fullSets.flatMap(s => s.vocabularies || []);

    if (onlyDue) {
      if (currentContentType === 'kanji') return toast.warning("Chế độ ôn tập đến hạn (SRS) chưa hỗ trợ cho Kanji!");
      const now = new Date();
      pool = pool.filter(v => v.next_review && new Date(v.next_review) <= now);
      if (pool.length === 0) return toast.success("Tuyệt vời! Không có từ vựng nào đến hạn.");
    }

    if (pool.length === 0) return toast.warning("Học phần này chưa có dữ liệu phù hợp!");

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const chunked = [];
    for (let i = 0; i < shuffled.length; i += CHUNK_SIZE) chunked.push(shuffled.slice(i, i + CHUNK_SIZE));
    
    setRounds(chunked);
    setCurrentRoundIndex(0);
    setCurrentWordIndex(0);
    setMode('choice');
    setCurrentRoundWords([...chunked[0]]);
    
    setAllData(pool);
    generateOptions(chunked[0][0], pool);
    setStreak(0);
    setMaxStreak(0);
    srsAnsweredRefs.current.clear();
    setIsStarted(true);
    setIsFinished(false);
    if (window.innerWidth < 768 && !isFullscreen) toggleFullscreen();
  };

  const generateOptions = (currentWord, fullData) => {
    if (!currentWord) return;
    const isKatakana = (text) => /^[ァ-ヶー]+$/.test(text || '');
    const currentLang = currentWord.language || 'ja';
    
    let validDistractors = fullData.filter(v => {
        if (!v || v.id === currentWord.id) return false;
        if (currentContentType === 'vocab' && (v.language || 'ja') !== currentLang) return false;
        const vBack = currentContentType === 'kanji' ? kanjiBack : (hasFourFields ? (kanjiBack === 'meaning' && kanjiFront === 'kanji' ? 'meaning' : (kanjiBack === 'kanji' ? 'word' : kanjiBack)) : (isReversed ? 'word' : 'meaning'));
        if ((vBack === 'hanviet' || vBack === 'hiragana') && !v[vBack]) return false;
        return true;
    });

    const maxSampleSize = Math.min(validDistractors.length, 60);
    const sampleVocabs = [...validDistractors].sort(() => 0.5 - Math.random()).slice(0, maxSampleSize);
    const currentText = getAnswerText(currentWord) || '';

    const scoredAnswers = sampleVocabs.map(v => {
        let itemScore = 0;
        const vText = getAnswerText(v) || '';
        if (currentText && vText) {
          currentText.split('').forEach(c => { if (vText.includes(c)) itemScore += 1; });
        }
        if (currentLang === 'ja' && isKatakana(currentText) && isKatakana(vText)) itemScore += 5;
        return { ...v, itemScore: itemScore + Math.random() * 1.5 }; 
    });

    scoredAnswers.sort((a, b) => b.itemScore - a.itemScore);
    
    let wrongAnswers = [];
    const normalizeStr = (text) => (text || '').toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
    const normalizedCorrect = normalizeStr(getAnswerText(currentWord));
    const usedNormalizedAnswers = new Set([normalizedCorrect]); 
    
    for (let i = 0; i < scoredAnswers.length; i++) {
      const rawAnsStr = getAnswerText(scoredAnswers[i]) || '';
      const normalizedAns = normalizeStr(rawAnsStr);
      if (!usedNormalizedAnswers.has(normalizedAns) && normalizedAns !== "") {
        wrongAnswers.push(scoredAnswers[i]);
        usedNormalizedAnswers.add(normalizedAns);
      }
      if (wrongAnswers.length === 3) break;
    }
    
    setOptions([...wrongAnswers, currentWord].sort(() => 0.5 - Math.random()));
  };

  const handleNextAfterFeedback = () => {
    setFeedback(null);
    setInputText('');

    if (currentWordIndex < currentRoundWords.length - 1) {
      const nextWord = currentRoundWords[currentWordIndex + 1];
      setCurrentWordIndex(currentWordIndex + 1);
      if (mode === 'choice') generateOptions(nextWord, allData);
    } else {
      const goToNextRound = () => {
        if (currentRoundIndex < rounds.length - 1) {
          const nextRoundIdx = currentRoundIndex + 1;
          setCurrentRoundIndex(nextRoundIdx);
          setCurrentWordIndex(0);
          setMode('choice');
          setCurrentRoundWords([...rounds[nextRoundIdx]]);
          generateOptions(rounds[nextRoundIdx][0], allData);
        } else {
          setIsFinished(true);
          playSound('win');
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
          vibrate([100, 50, 100, 50, 200]); 
        }
      };

      if (mode === 'choice') {
        const typingWords = rounds[currentRoundIndex];
        if (typingWords.length > 0) {
          setMode('typing');
          setCurrentWordIndex(0);
          setCurrentRoundWords([...typingWords]);
        } else {
          goToNextRound();
        }
      } else {
        goToNextRound();
      }
    }
  };

  const handleWrongAnswer = (currentWord, correctAnswerText, userAnsText) => {
    playSound('wrong'); 
    vibrate([200, 100, 200]); 
    setStreak(0);
    updateSRS(currentWord.id, false);
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    
    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[currentRoundIndex] = newRounds[currentRoundIndex].filter(w => w.id !== currentWord.id);
      if (currentRoundIndex < newRounds.length - 1) {
        newRounds[currentRoundIndex + 1] = [...newRounds[currentRoundIndex + 1], currentWord];
      } else {
        newRounds.push([currentWord]);
      }
      return newRounds;
    });
    
    setFeedback({ isCorrect: false, correctAnswer: correctAnswerText, yourAnswer: userAnsText });
    playAudio(correctAnswerText, 'error');
  };

  const handleCorrectAnswer = (currentWord) => {
    playSound('correct');
    vibrate(40);
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak > maxStreak) setMaxStreak(newStreak);
    updateSRS(currentWord.id, true);
    handleNextAfterFeedback();
  };

  const handleChoiceSubmit = (selectedOption) => {
    const currentWord = currentRoundWords[currentWordIndex];
    if (selectedOption.id === currentWord.id) {
      handleCorrectAnswer(currentWord);
    } else {
      const correctAnsStr = getAnswerText(currentWord);
      const userAnsStr = getAnswerText(selectedOption);
      handleWrongAnswer(currentWord, correctAnsStr, userAnsStr);
    }
  };

  const checkFuzzyMatch = (input, correctStr) => {
    if(!correctStr) return false;
    const clean = (str) => str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim().toLowerCase();
    if (clean(input) === clean(correctStr)) return true;
    return correctStr.split(',').map(s => clean(s)).includes(clean(input));
  };

  const handleTypeSubmit = (e) => {
    e.preventDefault();
    const currentWord = currentRoundWords[currentWordIndex];
    const correctAnsStr = getAnswerText(currentWord);
    
    if (checkFuzzyMatch(inputText, correctAnsStr)) {
      handleCorrectAnswer(currentWord);
    } else {
      handleWrongAnswer(currentWord, correctAnsStr, inputText.trim() || "(Để trống)");
    }
  };

  const handleDontKnow = () => {
    const currentWord = currentRoundWords[currentWordIndex];
    handleWrongAnswer(currentWord, getAnswerText(currentWord), "Không biết 🤷‍♂️");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isStarted && !isFinished && !feedback && mode === 'choice') {
        const key = parseInt(e.key);
        if (key >= 1 && key <= options.length) {
          handleChoiceSubmit(options[key - 1]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isFinished, feedback, mode, options, currentRoundWords, currentWordIndex]);

  if (loading) return <LoadingSkeleton />;

  if (!isStarted) {
    return (
      <div className="container mt-3 fade-in-slide" style={{ maxWidth: '600px' }}>
        <div className="card shadow-sm border-0 p-3 p-md-4 rounded-4 bg-white">
          <h4 className="text-center mb-3 fw-bold text-dark">🧠 Chế độ Học SRS</h4>
          
          <div className="mb-3">
            <label className="form-label fw-bold text-muted small mb-1">Học phần</label>
            <SetSelector 
              sets={sets} 
              selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} 
            />
          </div>

          <div className="mb-3 text-start">
            <div className="form-check form-switch d-flex align-items-center gap-2 bg-light p-2 px-3 rounded-3">
              <input className="form-check-input m-0" type="checkbox" id="srsToggle" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} style={{ cursor: 'pointer' }} />
              <label className="form-check-label fw-semibold text-dark small m-0" htmlFor="srsToggle" style={{ cursor: 'pointer' }}>Chỉ ôn các từ đến hạn (SRS)</label>
            </div>
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
              sectionLabel="Kỹ năng"
            />
          </div>

          <button 
            className="btn btn-primary btn-touch w-100" 
            onClick={handleStart}
          >
            Bắt đầu học 🧠
          </button>
        </div>
      </div>
    );
  }

  const currentWord = currentRoundWords[currentWordIndex];
  const questionText = getQuestionText(currentWord);
  const modeOffset = mode === 'choice' ? 0 : 0.5;
  const wordProgress = currentRoundWords.length > 0 ? (currentWordIndex / currentRoundWords.length) * 0.5 : 0;
  const progressPercent = Math.round(((currentRoundIndex + modeOffset + wordProgress) / rounds.length) * 100) || 0;

  return (
    <div className={`container-fluid py-4 transition-all ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
      <div className="mx-auto" style={{ maxWidth: '650px', width: '100%' }}>
        
        {!isFinished && (
          <div className="card border-0 rounded-4 p-3 mb-4 bg-white shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-mobile-chip chip-slate"
                  onClick={handleExit}
                >
                  ← Thoát
                </button>
                <button
                  className="btn btn-icon-soft chip-primary"
                  onClick={toggleFullscreen}
                  title="Toàn màn hình"
                >
                  {isFullscreen ? '↙️' : '⛶'}
                </button>
              </div>
              
              {/* NÂNG CẤP THANH STREAK */}
              <div className="d-flex align-items-center gap-3 fw-bold text-muted">
                <AnimatePresence>
                  {streak > 0 && (
                    <motion.div 
                      key={`streak-${streak}`}
                      initial={{ scale: 0.8, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="d-flex align-items-center bg-white rounded-pill shadow-sm overflow-hidden border" 
                      style={{ 
                        height: '40px',
                        borderColor: streak >= 5 ? '#ff4757' : '#ffa502',
                        boxShadow: streak >= 5 ? '0 4px 15px rgba(255, 71, 87, 0.3)' : '0 2px 8px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div className="px-3 h-100 d-flex align-items-center fw-black fs-6 text-white" 
                           style={{ background: streak >= 5 ? 'linear-gradient(135deg, #ff6b81, #ff4757)' : 'linear-gradient(135deg, #feca57, #ff9f43)' }}>
                        <motion.span 
                           animate={streak >= 5 ? { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] } : {}} 
                           transition={{ repeat: Infinity, duration: 1.2 }}
                        >
                          🔥
                        </motion.span> 
                        <span className="ms-1">{streak}</span>
                      </div>
                      <div className="d-none d-sm-flex align-items-center gap-1 px-2" style={{ width: '70px' }}>
                        {[...Array(5)].map((_, i) => {
                          const isActive = i < (streak > 0 ? ((streak - 1) % 5) + 1 : 0);
                          return (
                            <motion.div 
                              key={i} 
                              initial={false}
                              animate={{ 
                                scaleY: isActive ? 1.6 : 1, 
                                backgroundColor: isActive ? (streak >= 5 ? '#ff4757' : '#ffa502') : '#f1f2f6'
                              }}
                              transition={{ duration: 0.2 }}
                              className="rounded-pill" 
                              style={{ height: '6px', flexGrow: 1 }}
                            />
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="fs-5" style={{ color: '#8a2be2' }}>{progressPercent}%</span>
              </div>
            </div>

            {/* NÂNG CẤP THANH PROGRESS */}
            <div className="progress shadow-sm overflow-hidden" style={{ height: '10px', borderRadius: '10px', backgroundColor: '#f1f2f6' }}>
              <motion.div 
                className="progress-bar" 
                role="progressbar" 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ backgroundColor: '#8a2be2', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}
              />
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {isFinished ? (
            <motion.div 
              key="finished"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="card shadow-lg border-0 p-5 rounded-4 mx-auto bg-white text-center"
            >
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }} 
                transition={{ delay: 0.2, type: "spring" }}
                className="display-1 mb-3"
              >🏆</motion.div>
              <h2 className="fw-bold text-success mb-3">Bài học hoàn tất!</h2>
              <p className="fs-5 text-muted mb-4">Bạn vừa hoàn thành một phiên vắt óc rất chất lượng.</p>
              
              <div className="row g-3 mb-5">
                <div className="col-6">
                  <div className="bg-light p-4 rounded-4 h-100 border text-center" style={{ borderColor: '#ff9f43', borderWidth: '2px !important' }}>
                    <h2 className="fw-bold mb-0" style={{ color: '#ff9f43' }}>🔥 {maxStreak}</h2>
                    <span className="fw-bold text-muted small">CHUỖI DÀI NHẤT</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="bg-light p-4 rounded-4 h-100 border text-center" style={{ borderColor: '#8a2be2', borderWidth: '2px !important' }}>
                    <h2 className="fw-bold mb-0" style={{ color: '#8a2be2' }}>⚡ {rounds.flat().length * 10}</h2>
                    <span className="fw-bold text-muted small">ĐIỂM KINH NGHIỆM</span>
                  </div>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-lg fw-bold w-100 shadow-sm text-white" 
                style={{ backgroundColor: '#8a2be2' }} 
                onClick={handleExit}
              >
                Hoàn thành & Quay lại
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="playing-card"
              initial={{ opacity: 0, y: 20 }}
              animate={isShaking ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } } : { opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="card shadow-sm border-0 rounded-4 bg-white"
            >
              <div className="card-body p-4 p-md-5">
                {feedback ? (
                  <div className="text-center">
                    <motion.h5 
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-danger fw-bold mb-4 d-flex justify-content-center align-items-center gap-2"
                    >
                      <span style={{ fontSize: '1.4rem' }}>❌</span> Chưa chính xác! Từ này sẽ được hỏi lại.
                    </motion.h5>
                    
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 mb-4 bg-light rounded-4 text-start shadow-sm" 
                      style={{ borderLeft: '5px solid #ff4757' }}
                    >
                      <p className="mb-2"><strong>Câu hỏi:</strong> <span className="fs-5 fw-bold" style={{ color: '#8a2be2' }}>{questionText}</span></p>
                      <p className="text-muted mb-3"><strong>Bạn chọn/gõ:</strong> <span className="text-decoration-line-through">{feedback.yourAnswer}</span></p>
                      <p className="text-success fs-4 mb-0 fw-black d-flex align-items-center">
                        <span className="me-2">✓</span> {feedback.correctAnswer}
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="btn btn-sm btn-white rounded-circle ms-3 shadow-sm border d-flex align-items-center justify-content-center" 
                          onClick={() => playAudio(feedback.correctAnswer)} 
                          title="Nghe lại"
                          style={{ width: '36px', height: '36px', backgroundColor: 'white' }}
                        >
                          🔊
                        </motion.button>
                      </p>
                    </motion.div>
                    
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary btn-lg fw-bold w-100 mt-2 shadow-sm text-white" 
                      style={{ backgroundColor: '#8a2be2', borderRadius: '14px', border: 'none' }} 
                      onClick={handleNextAfterFeedback} 
                      autoFocus
                    >
                      Đã hiểu, tiếp tục
                    </motion.button>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="badge bg-light text-muted border mb-4 fw-bold px-3 py-2 fs-6 shadow-sm rounded-pill">
                      {mode === 'choice' ? '👆 Chọn đáp án đúng' : '⌨️ Gõ đáp án chính xác'}
                    </span>
                    
                    <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
                      <motion.h3 
                        key={questionText}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-dark fw-bold m-0" 
                        style={{ fontSize: '2.5rem' }}
                      >
                        {questionText}
                      </motion.h3>
                      <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: '#f1f2f6' }}
                        whileTap={{ scale: 0.9 }}
                        className="btn btn-white rounded-circle shadow-sm border d-flex align-items-center justify-content-center" 
                        onClick={() => playAudio(questionText)} 
                        title="Phát âm"
                        style={{ width: '46px', height: '46px' }}
                      >
                        🔊
                      </motion.button>
                    </div>
                    
                    {mode === 'choice' ? (
                      <div className="d-flex flex-column gap-3 mt-4">
                        {options.map((opt, i) => (
                          <motion.button 
                            key={opt.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                            whileHover={{ scale: 1.01, backgroundColor: '#f8f9fa', borderColor: '#ced4da' }}
                            whileTap={{ scale: 0.98 }}
                            className="btn btn-white border py-3 text-start px-4 fs-5 fw-bold transition-all d-flex align-items-center shadow-sm" 
                            style={{ borderRadius: '14px', color: '#2f3542', backgroundColor: 'white' }}
                            onClick={() => handleChoiceSubmit(opt)}
                          >
                            <span className="badge me-3 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: '#f1f2f6', color: '#57606f', borderRadius: '10px' }}>
                              {i + 1}
                            </span>
                            <span className="flex-grow-1 text-wrap">{getAnswerText(opt)}</span>
                          </motion.button>
                        ))}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-3 text-end">
                          <button className="btn btn-link text-muted fw-bold text-decoration-none border-0" onClick={handleDontKnow}>Tôi không biết câu này 🤷‍♂️</button>
                        </motion.div>
                      </div>
                    ) : (
                      <motion.form 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleTypeSubmit} 
                        className="mt-4"
                      >
                        <div className="position-relative mb-4">
                          <input 
                            type="text" 
                            className="form-control form-control-lg text-center py-4 bg-light fw-bold shadow-sm" 
                            placeholder={`Nhập ${getBackLabel().toLowerCase()} vào đây...`}
                            value={inputText} onChange={(e) => setInputText(e.target.value)} autoComplete="off" autoFocus
                            style={{ fontSize: '1.5rem', borderRadius: '16px', border: '2px solid #dee2e6' }}
                          />
                        </div>
                        <div className="d-flex gap-3">
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            type="button" 
                            className="btn btn-white w-50 py-3 fs-5 fw-bold border shadow-sm rounded-4 text-muted" 
                            onClick={handleDontKnow}
                          >
                            Bỏ qua
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            type="submit" 
                            className="btn w-50 py-3 fs-5 fw-bold shadow-sm rounded-4 text-white" 
                            style={{ backgroundColor: '#8a2be2' }}
                          >
                            Kiểm tra
                          </motion.button>
                        </div>
                      </motion.form>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default LearnMode;