import React, { useState, useEffect, useContext, useRef } from 'react';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import confetti from 'canvas-confetti';
import api from '../api/axiosConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, Maximize2, Minimize2 } from 'lucide-react';
import TestSetup from './TestSetup';
import TestResult from './TestResult';
import ExamHistoryTable from './ExamHistoryTable';
import SaveNoteModal from './SaveNoteModal';

const MODAL_SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 };

function TestMode() {
  const { sets, setSets, loading, fetchSets } = useContext(VocabContext);
  const [selectedSetId, setSelectedSetId] = useState('lang_ja');
  const [allData, setAllData] = useState([]); 

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

  useEffect(() => { fetchSets(); }, [fetchSets]);
  
  const [poolSize, setPoolSize] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const [questionCount, setQuestionCount] = useState(10);
  const [questionFormat, setQuestionFormat] = useState('choice'); 
  
  const [isReversed, setIsReversed] = useState(false); 
  const [kanjiFront, setKanjiFront] = useState('kanji');
  const [kanjiBack, setKanjiBack] = useState('meaning');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const questionStripRef = useRef(null);

  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const [history, setHistory] = useState([]);
  const [viewHistory, setViewHistory] = useState(null);
  const [noteModalVocab, setNoteModalVocab] = useState(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const fetchHistory = async (reset = false) => {
    try {
      const skip = reset ? 0 : historyPage * 10;
      const res = await api.get(`/test-history?skip=${skip}&limit=10`);
      if (reset) {
        setHistory(res.data);
        setHistoryPage(1);
      } else {
        setHistory(prev => [...prev, ...res.data]);
        setHistoryPage(prev => prev + 1);
      }
      setHasMoreHistory(res.data.length === 10);
    } catch (error) {
      toast.error("Lỗi tải lịch sử Test!");
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử Test?")) {
      try {
        await api.delete('/test-history/all');
        setHistory([]);
        toast.success("Đã xóa lịch sử thành công!");
      } catch (error) {
        toast.error("Lỗi xóa lịch sử!");
      }
    }
  };

  const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = containerRef.current;
      if (elem?.requestFullscreen) {
        elem.requestFullscreen().catch(() => setIsFullscreen(true)); // Fallback CSS nếu API bị chặn
      } else if (elem?.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(); // Dành cho iOS Safari cũ
        setIsFullscreen(true);
      } else {
        setIsFullscreen(true); // Fallback toàn bộ bằng CSS cho Mobile
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => setIsFullscreen(false));
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen(false); // Tắt CSS Fullscreen
      }
    }
  };

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    setShowExitModal(false);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    setIsFullscreen(false); // Dọn dẹp trạng thái
    setIsTestStarted(false);
    setIsTestFinished(false);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handleFs);
    document.addEventListener("webkitfullscreenchange", handleFs); // Lắng nghe sự kiện của Safari
    return () => {
      document.removeEventListener("fullscreenchange", handleFs);
      document.removeEventListener("webkitfullscreenchange", handleFs);
    };
  }, []);

  // KHÓA LỐI THOÁT KHI ĐANG LÀM BÀI TEST
  useEffect(() => {
    if (isTestStarted && !isTestFinished) {
      window.history.pushState(null, '', window.location.href);
      
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href); // Chặn back
        setShowExitModal(true);
      };
      
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = ''; // Bắt buộc để trình duyệt hiện cảnh báo chuẩn khi đóng tab
      };

      const handleLinkClick = (e) => {
        const link = e.target.closest('a');
        if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
          e.preventDefault();
          e.stopPropagation(); // Chặn click menu nội bộ
          setShowExitModal(true);
        }
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('click', handleLinkClick, { capture: true });

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('click', handleLinkClick, { capture: true });
      };
    }
  }, [isTestStarted, isTestFinished]);

  useEffect(() => {
    const size = targetSets.reduce((sum, s) => sum + (s.vocab_count || 0), 0);
    setPoolSize(size);
    setQuestionCount(size || 10);
  }, [selectedSetId, sets, currentContentType]);



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
        (s) =>
          s.language === 'ja' ||
          s.language === 'zh' ||
          s.type === 'kanji' ||
          (s.vocabularies && s.vocabularies.some((v) => v.hanviet || v.hiragana))
      );
    }
    return false;
  })();

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

  const generateTest = async () => {
    vibrate(40);
    let pool = [];
    let _allData = [];

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
    _allData = pool;

    setAllData(_allData);
    let allData = _allData; // Dùng biến local cho code dưới

    if (pool.length === 0) return toast.warning("Khu vực này chưa có dữ liệu nào!");

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selectedVocabs = shuffled.slice(0, Math.min(questionCount, pool.length));

    const newQuestions = selectedVocabs.map((vocab) => {
      let type = questionFormat;
      if (questionFormat === 'mixed') type = Math.random() > 0.5 ? 'choice' : 'typing';

      const questionText = getQuestionText(vocab);
      const correctAnswer = getAnswerText(vocab);
      
      let options = [];
      if (type === 'choice') {
        const isKatakana = (text) => /^[ァ-ヶー]+$/.test(text || '');
        const currentLang = vocab.language || 'ja';
        
        let validDistractors = allData.filter(v => {
            if (v.id === vocab.id) return false;
            if (currentContentType === 'vocab' && (v.language || 'ja') !== currentLang) return false;
            
            const vBack = currentContentType === 'kanji' ? kanjiBack : (hasFourFields ? (kanjiBack === 'meaning' && kanjiFront === 'kanji' ? 'meaning' : (kanjiBack === 'kanji' ? 'word' : kanjiBack)) : (isReversed ? 'word' : 'meaning'));
            if ((vBack === 'hanviet' || vBack === 'hiragana') && !v[vBack]) return false;
            
            return true;
        });

        const maxSampleSize = Math.min(validDistractors.length, 100);
        const sampleVocabs = [...validDistractors].sort(() => 0.5 - Math.random()).slice(0, maxSampleSize);
        
        const currentText = getAnswerText(vocab);

        const scoredAnswers = sampleVocabs.map(v => {
            let itemScore = 0;
            const vText = getAnswerText(v);
            
            if (currentText && vText) {
              currentText.split('').forEach(c => { if (vText.includes(c)) itemScore += 1; });
            }
            
            if (currentLang === 'ja' && isKatakana(currentText) && isKatakana(vText)) {
              itemScore += 5; // Ưu tiên xếp điểm cao cho Katakana
            }
            
            return { ...v, itemScore: itemScore + Math.random() * 1.5 }; 
        });          
        scoredAnswers.sort((a, b) => b.itemScore - a.itemScore);
        
        let wrongAnswers = [];
        const normalizeStr = (text) =>
          String(text || '')
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .toLowerCase()
            .replace(/[.\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .replace(/\s+/g, ' ')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .sort()
            .join(',');
        
        const normalizedCorrect = normalizeStr(correctAnswer);
        const usedNormalizedAnswers = new Set([normalizedCorrect]); 
        
        for (let i = 0; i < scoredAnswers.length; i++) {
          const rawAnsStr = getAnswerText(scoredAnswers[i]);
          const normalizedAns = normalizeStr(rawAnsStr);
          
          if (!usedNormalizedAnswers.has(normalizedAns) && normalizedAns !== "") {
            wrongAnswers.push(rawAnsStr);
            usedNormalizedAnswers.add(normalizedAns);
          }
          if (wrongAnswers.length === 3) break;
        }

        if (wrongAnswers.length < 3) {
          const backupVocabs = allData.sort(() => 0.5 - Math.random());
          for (let i = 0; i < backupVocabs.length; i++) {
            const rawAnsStr = getAnswerText(backupVocabs[i]);
            const normalizedAns = normalizeStr(rawAnsStr);
            if (!usedNormalizedAnswers.has(normalizedAns) && normalizedAns !== "") {
              wrongAnswers.push(rawAnsStr);
              usedNormalizedAnswers.add(normalizedAns);
            }
            if (wrongAnswers.length === 3) break;
          }
        }
        
        options = [...wrongAnswers, correctAnswer].sort(() => 0.5 - Math.random());
      }

      return { id: vocab.id, type, questionText, correctAnswer, options, userAnswer: '', isCorrect: null };
    });

    setQuestions(newQuestions);
    setIsTestStarted(true);
    setIsTestFinished(false);
    if (window.innerWidth < 768 && !isFullscreen) toggleFullscreen();
  };

  const handleAnswerChange = (index, value) => {
    vibrate(20);
    const updatedQuestions = [...questions];
    updatedQuestions[index].userAnswer = value;
    setQuestions(updatedQuestions);

    // Tự động cuộn thanh .mobile-question-strip sao cho ô idx + 1 nằm giữa
    if (questionStripRef.current) {
      const stripEl = questionStripRef.current;
      const btnEl = stripEl.children[index];
      if (btnEl) {
        const scrollLeft = btnEl.offsetLeft - stripEl.clientWidth / 2 + btnEl.clientWidth / 2;
        stripEl.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  };

  const handleAttemptSubmit = () => {
    const answeredCount = questions.filter(q => q.userAnswer.trim() !== '').length;
    if (answeredCount === 0) {
      vibrate([100, 50, 100]);
      return toast.error("Vui lòng trả lời ít nhất 1 câu trước khi nộp bài!");
    }
    setShowSubmitModal(true);
  };

  const confirmSubmitTest = () => {
    setShowSubmitModal(false);
    let correctCount = 0;
    const gradedQuestions = questions.map(q => {
        const clean = (str) =>
          String(str || '')
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        let isCorrect = false;
        const cleanedUser = clean(q.userAnswer);
        
        if (q.type === 'choice') {
          isCorrect = cleanedUser !== '' && clean(q.correctAnswer) === cleanedUser;
        } else {
          isCorrect =
            cleanedUser !== '' &&
            (clean(q.correctAnswer) === cleanedUser ||
              String(q.correctAnswer || '')
                .split(/[,;/]+/)
                .map(s => clean(s))
                .filter(Boolean)
                .includes(cleanedUser));
        }
        
        if (isCorrect) correctCount++;
        return { ...q, isCorrect };
      });

    setQuestions(gradedQuestions);
    setScore({ correct: correctCount, total: gradedQuestions.length });
    setIsTestFinished(true);
    window.scrollTo(0, 0);

    // LƯU LỊCH SỬ TEST
    const isCustom = String(selectedSetId).startsWith('lang_') || String(selectedSetId).startsWith('all_') || String(selectedSetId).startsWith('folder_');
    const setName = isCustom ? (String(selectedSetId).startsWith('folder_') ? `Thư mục: ${String(selectedSetId).substring(7)}` : 'Nhiều học phần') : (targetSets[0]?.title || 'Học phần tùy chỉnh');
    const wrongDetails = gradedQuestions.filter(q => !q.isCorrect).map(q => ({
      question: q.questionText,
      correct_ans: q.correctAnswer,
      user_ans: q.userAnswer,
      vocabId: q.id 
    }));
    
    api.post('/test-history', {
      set_id: isCustom ? null : parseInt(selectedSetId),
      title: `Test: ${setName}`,
      score: correctCount,
      total: gradedQuestions.length,
      wrong_details: wrongDetails
    }).then(() => fetchHistory(true)).catch(() => toast.error("Lỗi lưu lịch sử!"));
    
    const ratio = correctCount / gradedQuestions.length;
    if (ratio >= 0.8) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      vibrate([100, 50, 100, 50, 200]);
    } else if (ratio >= 0.5) {
      vibrate([50, 50, 50]);
    } else {
      vibrate([200, 100, 200]);
    }
  };

  const scrollToQuestion = (idx) => {
    const element = document.getElementById(`test-question-${idx}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (loading) return (
    <div className="container mt-5 text-center" style={{ maxWidth: '850px' }}>
      <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
      <h5 className="text-muted fw-bold">Đang tải dữ liệu...</h5>
    </div>
  );

  if (viewHistory) {
    return (
      <div className="container mt-4 fade-in-slide" style={{ maxWidth: '800px' }}>
        {noteModalVocab && <SaveNoteModal vocab={noteModalVocab} sets={sets} onClose={() => setNoteModalVocab(null)} onSaveSuccess={() => fetchSets(false, true)} />}
        <button className="btn btn-outline-secondary fw-bold rounded-pill mb-4 px-4 shadow-sm" onClick={() => setViewHistory(null)}>← Quay lại danh sách</button>
        <div className="alert alert-info shadow-sm border-0 mb-4 rounded-4 p-4">
          <h4 className="fw-bold mb-3 text-primary">{viewHistory.title}</h4>
          <p className="mb-0 text-dark">
            Ngày làm: <strong>{viewHistory.date}</strong> <br/>
            Kết quả: <strong className="text-primary fs-5">{viewHistory.score} / {viewHistory.total}</strong>
          </p>
        </div>
        
        {viewHistory.wrongDetails && viewHistory.wrongDetails.length === 0 ? (
          <div className="alert alert-success fw-bold p-4 rounded-4 shadow-sm border-0">Tuyệt vời! Bạn không làm sai câu nào trong phiên này.</div>
        ) : (
          <div>
            <h5 className="text-danger fw-bold mb-4">Các câu làm sai:</h5>
            {viewHistory.wrongDetails && viewHistory.wrongDetails.map((q, i) => (
              <div key={i} className="bg-white rounded-4 shadow-sm mb-4 p-4" style={{ transform: 'none' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="mb-0 text-dark fw-bold">{q.question}</h5>
                  {q.vocabId && (
                    <button className="btn-icon-soft chip-primary ms-3 flex-shrink-0" onClick={async () => {
                      let vocab = sets.flatMap(s => s.vocabularies || []).find(v => v.id === q.vocabId);
                      if (!vocab) {
                        try {
                           const res = await api.get(`/sets/${q.setId || selectedSetId}`);
                           vocab = res.data.vocabularies.find(v => v.id === q.vocabId);
                        } catch(e) {}
                      }
                      if (vocab) setNoteModalVocab(vocab);
                    }} title="Lưu vào Note">
                      <BookMarked size={16} />
                    </button>
                  )}
                </div>
                <div className="p-3 rounded-3 bg-light border shadow-sm mb-3">
                  <span className="text-muted fw-bold d-block mb-1 fs-6">Lựa chọn của bạn:</span>
                  <span className="text-danger fw-bold text-decoration-line-through fs-5">{q.user_ans || '(Bỏ trống)'}</span>
                </div>
                <div className="p-3 rounded-3 bg-white border border-success border-2 shadow-sm">
                  <span className="text-success fw-bold d-block mb-1 fs-6">✓ Đáp án đúng:</span>
                  <span className="text-dark fw-bold fs-5">{q.correct_ans}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!isTestStarted) {
    return (
      <>
        <TestSetup 
          sets={sets} currentContentType={currentContentType}
          selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId}
          questionCount={questionCount} setQuestionCount={setQuestionCount} poolSize={poolSize}
          questionFormat={questionFormat} setQuestionFormat={setQuestionFormat}
          isReversed={isReversed} setIsReversed={setIsReversed}
          kanjiFront={kanjiFront} setKanjiFront={setKanjiFront}
          kanjiBack={kanjiBack} setKanjiBack={setKanjiBack}
          generateTest={generateTest}
        />
        <div className="container mb-5" style={{ maxWidth: '650px' }}>
          <ExamHistoryTable history={history} setViewHistory={setViewHistory} handleClearHistory={handleClearHistory} onLoadMore={() => fetchHistory(false)} hasMore={hasMoreHistory} />
        </div>
      </>
    );
  }

  const handleCreateMistakeSet = async () => {
    const wrongQs = questions.filter(q => !q.isCorrect);
    if (wrongQs.length === 0) return;
    const title = window.prompt("Nhập tên học phần ôn tập:", "Ôn tập câu sai - Bài Test");
    if (!title || !title.trim()) return;
    const rawText = wrongQs.map(q => `${q.questionText} | ${q.correctAnswer}`).join('\n');
    try {
      await api.post("/vocabularies/bulk-import", { title: title.trim(), raw_text: rawText });
      await fetchSets(false, true);
      toast.success(`Đã tạo học phần: ${title}`);
    } catch (error) { toast.error("Lỗi khi tạo học phần ôn tập"); }
  };

  if (isTestFinished) {
    return (
      <div className={`container-fluid py-4 ${isFullscreen ? 'bg-light mobile-fullscreen pt-4' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh', overflowY: 'auto' } : {}}>
        {noteModalVocab && <SaveNoteModal vocab={noteModalVocab} sets={sets} onClose={() => setNoteModalVocab(null)} onSaveSuccess={() => fetchSets(false, true)} />}
        <div className="d-flex justify-content-between align-items-center mx-auto mb-4 d-print-none" style={{ maxWidth: '800px' }}>
          <button className="btn btn-mobile-chip chip-slate px-3" onClick={() => { setIsTestStarted(false); setIsTestFinished(false); window.scrollTo(0,0); }}>
            ← Đóng kết quả
          </button>
          <button className="btn-icon-soft chip-slate" onClick={toggleFullscreen} title="Toàn màn hình (F)">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
        <TestResult score={score} questions={questions} onRestart={() => { setIsTestStarted(false); setIsTestFinished(false); window.scrollTo(0,0); }} onCreateMistakeSet={handleCreateMistakeSet} onSaveNote={(vocabId) => {
          const vocab = allData.find(v => v.id === vocabId);
          if (vocab) setNoteModalVocab(vocab);
        }} />
      </div>
    );
  }

  const answeredCount = questions.filter(q => q.userAnswer.trim() !== '').length;

  return (
    <div className={`container-fluid py-4 ${isFullscreen ? 'bg-light overflow-auto mobile-fullscreen' : ''}`} ref={containerRef} style={isFullscreen ? { minHeight: '100vh' } : {}}>
      
      {/* MODAL XÁC NHẬN THOÁT */}
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
              transition={MODAL_SPRING}
              className="card border-0 shadow-lg rounded-4 p-4 text-center"
              style={{ width: '90%', maxWidth: '400px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="fw-bold text-danger mb-3">Cảnh báo</h4>
              <p className="text-dark mb-4 fs-6">Bạn đang làm bài kiểm tra. Nếu thoát, kết quả hiện tại sẽ bị hủy. Bạn có chắc chắn muốn thoát?</p>
              <div className="d-flex gap-3">
                <button className="btn btn-danger btn-touch fw-bold w-50 py-2 rounded-3" onClick={confirmExit}>Hủy bài thi</button>
                <button className="btn btn-light btn-touch fw-bold w-50 py-2 rounded-3" onClick={() => setShowExitModal(false)}>Tiếp tục</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL XÁC NHẬN NỘP BÀI */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="set-sheet-backdrop"
            style={{ zIndex: 9999 }}
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={MODAL_SPRING}
              className="card border-0 shadow-lg rounded-4 p-4 text-center"
              style={{ width: '90%', maxWidth: '400px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="fw-bold text-primary mb-3">Nộp bài</h4>
              <p className="text-dark mb-4 fs-6">Bạn đã hoàn thành <strong className="text-success">{answeredCount}/{questions.length}</strong> câu. Bạn có chắc chắn muốn kết thúc bài thi?</p>
              <div className="d-flex gap-3">
                <button className="btn btn-light btn-touch fw-bold w-50 py-2 rounded-3" onClick={() => setShowSubmitModal(false)}>Hủy</button>
                <button className="btn btn-primary btn-touch fw-bold w-50 py-2 rounded-3" onClick={confirmSubmitTest}>Nộp bài</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto has-mobile-bottom-bar" style={{ maxWidth: '900px' }}>
        <div className="mobile-sticky-top d-print-none">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <button className="btn btn-light text-dark btn-mobile-chip" onClick={handleExit}>
              ← Thoát
            </button>
            <span className="fw-bold text-primary">
              Đã làm: {answeredCount} / {questions.length}
            </span>
            <button
              className="btn btn-light text-dark btn-mobile-chip"
              onClick={toggleFullscreen}
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isFullscreen ? 'Thu nhỏ' : 'Phóng to'}</span>
            </button>
          </div>

          <div className="progress mb-2" style={{ height: '6px', borderRadius: '8px' }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            ></div>
          </div>

          <div className="mobile-question-strip" ref={questionStripRef}>
            {questions.map((q, idx) => {
              const isAnswered = q.userAnswer.trim() !== '';
              return (
                <button
                  key={idx}
                  className={`btn ${
                    isAnswered ? 'btn-primary text-white border-primary' : 'bg-white text-dark border'
                  }`}
                  onClick={() => scrollToQuestion(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* NỘI DUNG BÀI THI */}
        <div>
          {questions.map((q, idx) => (
            <div
              id={`test-question-${idx}`}
              key={idx}
              className="card border-0 mb-3 rounded-4 fade-in-slide test-question-card"
            >
              <div className="card-body p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="badge chip-primary rounded-pill px-3 py-1">
                    Câu {idx + 1} / {questions.length}
                  </span>
                  <span className="text-muted small fw-semibold">
                    {q.type === 'choice' ? 'Chọn 1 đáp án đúng' : 'Điền đáp án'}
                  </span>
                </div>

                <h4 className="my-3 fw-bold text-dark" style={{ lineHeight: '1.4' }}>
                  {q.questionText}
                </h4>

                {q.type === 'choice' ? (
                  <div className="row g-2 g-md-3 mt-1">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = q.userAnswer === opt;
                      const optionLabel = String.fromCharCode(65 + oIdx);
                      return (
                        <div className="col-12 col-sm-6" key={oIdx}>
                          <button
                            className={`btn w-100 text-start p-3 fw-semibold test-option-btn ${
                              isSelected ? 'selected' : ''
                            }`}
                            onClick={() => handleAnswerChange(idx, opt)}
                          >
                            <span className="test-option-badge">{optionLabel}</span>
                            <span className="text-wrap flex-grow-1">{opt}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3">
                    <input
                      type="text"
                      className="form-control form-control-lg py-3 px-3 bg-light fw-bold d-print-none shadow-sm rounded-4 text-center"
                      placeholder="Gõ đáp án chính xác vào đây..."
                      value={q.userAnswer}
                      onChange={(e) => handleAnswerChange(idx, e.target.value)}
                      autoComplete="off"
                      style={{ border: '2px solid var(--surface-border)' }}
                    />
                    <div className="print-blank-line d-none d-print-block"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* THANH CÔNG CỤ GHIM ĐÁY MÀN HÌNH (MOBILE-BOTTOM-BAR) */}
        <div className="mobile-bottom-bar d-print-none">
          <div className="container px-0" style={{ maxWidth: '900px' }}>
            <div className="d-flex gap-2">
              <button className="btn btn-light text-danger btn-mobile-chip" onClick={handleExit}>
                ✖ Hủy
              </button>
              <button
                className="btn btn-success btn-touch flex-grow-1 shadow-sm"
                onClick={handleAttemptSubmit}
              >
                ✅ Nộp bài ngay ({answeredCount}/{questions.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestMode;