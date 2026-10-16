import { useState, useEffect } from "react";
import { playSound } from '../utils/audio';
import { motion } from 'framer-motion';
import { Star, Volume2, BookOpen, Edit3 } from 'lucide-react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

function Flashcard({ vocab, autoPlay, contentType = 'vocab', isReversed = false, kanjiFront = 'kanji', kanjiBack = 'meaning', onEdit, onSaveNote }) {
  const [flipped, setFlipped] = useState(false);
  const [isStarred, setIsStarred] = useState(vocab?.is_starred || false);

  useEffect(() => {
    if (vocab) setIsStarred(vocab.is_starred || false);
  }, [vocab]);

  const handleOpenNote = (e) => {
    e.stopPropagation();
    if (onSaveNote && vocab) onSaveNote(vocab);
  };

  const handleToggleStar = async (e) => {
    e.stopPropagation();
    const newStarState = !isStarred;
    setIsStarred(newStarState);
    playSound('pop');
    try {
      await api.put(`/vocabularies/${vocab.id}/star`, { is_starred: newStarState });
    } catch (err) {
      setIsStarred(!newStarState);
      toast.error("Lỗi khi lưu trạng thái sao");
    }
  };

  if (!vocab) return null;

  const detectLanguage = (text, field) => {
    if (field === 'kanji' || field === 'hiragana') return 'ja-JP';
    if (field === 'word') return vocab.language === 'en' ? 'en-US' : 'ja-JP';
    if (field === 'hanviet' || field === 'meaning' || field === 'summary') return 'vi-VN';
    if (!text) return 'en-US';
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
    return hasJapanese ? 'ja-JP' : 'en-US';
  };

  const frontField = contentType === 'kanji' ? kanjiFront : (kanjiFront || (isReversed ? 'meaning' : 'word'));
  const backField = contentType === 'kanji' ? kanjiBack : (kanjiBack || (isReversed ? 'word' : 'meaning'));

  const getFallbackText = (field) => {
    if (field === 'summary') return vocab.meaning;
    if (field === 'kanji' || field === 'word') return vocab.kanji || vocab.word || '';
    let text = vocab[field] || '';
    if (!text && (field === 'hanviet' || field === 'hiragana')) {
      text = vocab.word || vocab.kanji || '';
    }
    return text;
  };

  const frontText = getFallbackText(frontField);
  const backText = getFallbackText(backField);

  const frontLang = detectLanguage(frontText, frontField);
  const backLang = detectLanguage(backText, backField);

  const renderField = (field, isFront) => {
    if (field === 'summary') {
      const showKanji = frontField !== 'kanji' && frontField !== 'word';
      const showHanviet = frontField !== 'hanviet';
      const showHiragana = frontField !== 'hiragana';
      const showMeaning = frontField !== 'meaning';

      return (
        <div className="d-flex flex-column gap-2 text-center w-100 align-items-center justify-content-center h-100 px-2">
          {showKanji && (vocab.kanji || vocab.word) && (
            <div className="fw-bold text-white text-break" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.1rem)', fontFamily: '"Yu Mincho", "MS Mincho", serif' }}>
              {vocab.kanji || vocab.word}
            </div>
          )}
          {showHanviet && vocab.hanviet && (
            <div className="fw-bold text-uppercase" style={{ color: '#fde047', fontSize: '0.95rem', letterSpacing: '2px' }}>
              [{vocab.hanviet}]
            </div>
          )}
          {showHiragana && vocab.hiragana && (
            <div className="fw-bold" style={{ color: '#67e8f9', fontSize: 'clamp(1.15rem, 4vw, 1.5rem)' }}>
              {vocab.hiragana}
            </div>
          )}
          {showMeaning && vocab.meaning && (
            <div className="text-white fw-bold text-break" style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.65rem)' }}>
              {vocab.meaning}
            </div>
          )}
        </div>
      );
    }

    let displayField = field;
    if (!vocab[field] && (field === 'hanviet' || field === 'hiragana')) {
      displayField = isFront ? 'word' : 'meaning';
    }

    const val =
      displayField === 'kanji' || displayField === 'word'
        ? vocab.kanji || vocab.word || ''
        : vocab[displayField] || '';
    const isLong = val.length > 12;

    if (displayField === 'kanji' || displayField === 'word') {
      return (
        <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 px-2">
          <div
            className="fw-bold text-break"
            style={{
              fontSize: isLong ? 'clamp(1.5rem, 5.5vw, 2.2rem)' : 'clamp(2.1rem, 8vw, 3.2rem)',
              fontFamily: '"Yu Mincho", "MS Mincho", serif',
              lineHeight: '1.25',
              color: isFront ? '#0f172a' : '#ffffff',
            }}
          >
            {val}
          </div>
        </div>
      );
    }

    if (displayField === 'hanviet') {
      return (
        <div className="fw-bold h-100 d-flex align-items-center justify-content-center px-2 text-break" style={{ color: isFront ? '#7c3aed' : '#fde047', fontSize: 'clamp(1.4rem, 5vw, 1.9rem)', letterSpacing: '1.5px' }}>
          {val}
        </div>
      );
    }
    if (displayField === 'hiragana') {
      return (
        <div className="fw-bold h-100 d-flex align-items-center justify-content-center px-2 text-break" style={{ color: isFront ? '#334155' : '#67e8f9', fontSize: 'clamp(1.4rem, 5vw, 1.9rem)' }}>
          {val}
        </div>
      );
    }
    return (
      <div className="fw-bold h-100 d-flex align-items-center justify-content-center px-2 text-break" style={{ color: isFront ? '#0f172a' : '#ffffff', fontSize: 'clamp(1.35rem, 5vw, 1.85rem)' }}>
        {val}
      </div>
    );
  };

  const speak = (text, lang) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    setFlipped(false);
    if (autoPlay) setTimeout(() => speak(frontText, frontLang), 250);
  }, [vocab, autoPlay, contentType, isReversed]);

  const handleFlip = () => {
    playSound('pop');
    const newState = !flipped;
    setFlipped(newState);
    if (autoPlay) speak(newState ? backText : frontText, newState ? backLang : frontLang);
  };

  const playAudio = (e, text, lang) => {
    e.stopPropagation();
    speak(text, lang);
  };

  const renderStarButton = () => (
    <button
      className="btn-icon-soft position-absolute top-0 start-0 m-3 border-0 tap-effect"
      style={{
        zIndex: 20,
        backgroundColor: isStarred ? '#fef3c7' : '#f1f5f9',
        color: isStarred ? '#f59e0b' : '#94a3b8',
      }}
      onClick={handleToggleStar}
      title="Đánh dấu sao"
    >
      <Star size={18} fill={isStarred ? "currentColor" : "none"} strokeWidth={2} />
    </button>
  );

  return (
    <div className="flashcard-container tap-effect" onClick={handleFlip} style={{ perspective: '1200px' }}>
      <motion.div
        className="w-100 h-100 position-relative"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* MẶT TRƯỚC */}
        <div
          className="position-absolute w-100 h-100 d-flex flex-column rounded-4 bg-white"
          style={{
            backfaceVisibility: 'hidden',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
          }}
        >
          {renderStarButton()}

          <div className="flex-grow-1 p-3 d-flex align-items-center justify-content-center text-center">
            {renderField(frontField, true)}
          </div>

          <div className="p-2 px-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
            <button
              className="btn btn-mobile-chip chip-slate"
              onClick={handleOpenNote}
            >
              <BookOpen size={14} /> <span>Sổ tay</span>
            </button>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Chạm để lật</span>
            <button
              className="btn btn-mobile-chip chip-primary"
              onClick={(e) => playAudio(e, frontText, frontLang)}
            >
              <Volume2 size={14} /> <span>Nghe</span>
            </button>
          </div>
        </div>

        {/* MẶT SAU */}
        <div
          className="position-absolute w-100 h-100 d-flex flex-column rounded-4"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
            border: '1.5px solid #6d28d9',
            boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.25)',
            overflow: 'hidden',
          }}
        >
          {renderStarButton()}

          <button
            className="btn-icon-soft position-absolute top-0 end-0 m-3 border-0 tap-effect"
            style={{ zIndex: 20, backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
            onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(vocab); }}
            title="Sửa nhanh từ này"
          >
            <Edit3 size={16} />
          </button>

          <div className="flex-grow-1 p-3 d-flex align-items-center justify-content-center text-center">
            {renderField(backField, false)}
          </div>

          <div className="p-2 px-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <button
              className="btn btn-mobile-chip text-white border-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              onClick={handleOpenNote}
            >
              <BookOpen size={14} /> <span>Sổ tay</span>
            </button>
            <button
              className="btn btn-mobile-chip bg-white text-primary border-0"
              onClick={(e) => playAudio(e, backText, backLang)}
            >
              <Volume2 size={14} /> <span>Nghe</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Flashcard;