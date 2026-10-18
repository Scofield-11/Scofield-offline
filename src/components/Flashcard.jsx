import { useState, useEffect, useRef } from 'react';
import { playSound, speakText } from '../utils/audio';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Star, Volume2, BookOpen, Edit3 } from 'lucide-react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

const FLIP_SPRING = { type: 'spring', stiffness: 180, damping: 22, mass: 0.7 };

function Flashcard({
  vocab,
  autoPlay,
  contentType = 'vocab',
  isReversed = false,
  kanjiFront = 'kanji',
  kanjiBack = 'meaning',
  flipped: controlledFlipped,
  onFlip,
  onSwipeNext,
  onSwipePrev,
  onEdit,
  onSaveNote,
}) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const [isStarred, setIsStarred] = useState(vocab?.is_starred || false);
  const isDraggingRef = useRef(false);

  const dragX = useMotionValue(0);
  const rotateZ = useTransform(dragX, [-200, 200], [-10, 10]);
  const nextBadgeOpacity = useTransform(dragX, [-110, -25], [1, 0]);
  const prevBadgeOpacity = useTransform(dragX, [25, 110], [0, 1]);

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
      toast.error('Lỗi khi lưu trạng thái sao');
    }
  };

  if (!vocab) return null;

  const vocabLangCode =
    vocab.language === 'en' ? 'en-US' : vocab.language === 'zh' ? 'zh-CN' : 'ja-JP';

  const frontField = contentType === 'kanji' ? kanjiFront : (kanjiFront || (isReversed ? 'meaning' : 'word'));
  const backField = contentType === 'kanji' ? kanjiBack : (kanjiBack || (isReversed ? 'word' : 'meaning'));

  const getAudioPayload = (field, isFrontSide) => {
    const mainWord = vocab.kanji || vocab.word || '';

    // Ở mặt tổng hợp (summary): ưu tiên phát âm từ vựng gốc ngoại ngữ nếu mặt trước đang là Nghĩa/Hán Việt
    if (field === 'summary') {
      if (frontField === 'word' || frontField === 'kanji') {
        return { text: vocab.meaning || mainWord, lang: vocab.meaning ? 'vi-VN' : vocabLangCode };
      }
      return { text: mainWord, lang: vocabLangCode };
    }

    if (field === 'kanji' || field === 'word') {
      return { text: mainWord, lang: vocabLangCode };
    }

    if (field === 'hiragana') {
      // Nếu là Tiếng Trung, Pinyin viết bằng chữ Latin nên cần truyền chữ Hán gốc vào bộ đọc zh-CN
      if (vocab.language === 'zh') {
        return { text: mainWord || vocab.hiragana || '', lang: 'zh-CN' };
      }
      return { text: vocab.hiragana || mainWord, lang: 'ja-JP' };
    }

    if (field === 'hanviet' || field === 'meaning') {
      const val = vocab[field] || '';
      if (!val) {
        return isFrontSide
          ? { text: mainWord, lang: vocabLangCode }
          : { text: vocab.meaning || mainWord, lang: 'vi-VN' };
      }
      return { text: val, lang: 'vi-VN' };
    }

    return { text: mainWord, lang: vocabLangCode };
  };

  const { text: frontText, lang: frontLang } = getAudioPayload(frontField, true);
  const { text: backText, lang: backLang } = getAudioPayload(backField, false);

  const renderField = (field, isFront) => {
    if (field === 'summary') {
      const showKanji = frontField !== 'kanji' && frontField !== 'word';
      const showHanviet = frontField !== 'hanviet';
      const showHiragana = frontField !== 'hiragana';
      const showMeaning = frontField !== 'meaning';
      const mainWord = vocab.kanji || vocab.word;
      const hasRuby = showKanji && mainWord && vocab.hiragana && vocab.hiragana !== mainWord;

      return (
        <div className="d-flex flex-column gap-2 text-center w-100 align-items-center justify-content-center h-100 px-2">
          {showKanji && mainWord && (
            <div
              className="fw-bold text-white text-break"
              style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.25rem)', fontFamily: 'var(--font-jp-serif)' }}
            >
              {hasRuby ? (
                <ruby className="jp-ruby">
                  {mainWord}
                  <rt>{vocab.hiragana}</rt>
                </ruby>
              ) : (
                mainWord
              )}
            </div>
          )}
          {showHanviet && vocab.hanviet && (
            <div className="hanviet-seal-badge">
              {vocab.hanviet}
            </div>
          )}
          {!hasRuby && showHiragana && vocab.hiragana && (
            <div className="fw-bold" style={{ color: '#67e8f9', fontSize: 'clamp(1.15rem, 4vw, 1.5rem)' }}>
              {vocab.hiragana}
            </div>
          )}
          {showMeaning && vocab.meaning && (
            <div className="text-white fw-bold text-break mt-1" style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.65rem)' }}>
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
              fontFamily: 'var(--font-jp-serif)',
              lineHeight: '1.25',
              color: isFront ? 'var(--text-primary)' : '#ffffff',
            }}
          >
            {val}
          </div>
        </div>
      );
    }

    if (displayField === 'hanviet') {
      return (
        <div className="fw-bold h-100 d-flex align-items-center justify-content-center px-2 text-break" style={{ color: isFront ? 'var(--brand-primary)' : '#fde047', fontSize: 'clamp(1.4rem, 5vw, 1.9rem)', letterSpacing: '1.5px' }}>
          {val}
        </div>
      );
    }
    if (displayField === 'hiragana') {
      return (
        <div className="fw-bold h-100 d-flex align-items-center justify-content-center px-2 text-break" style={{ color: isFront ? 'var(--text-primary)' : '#67e8f9', fontSize: 'clamp(1.4rem, 5vw, 1.9rem)' }}>
          {val}
        </div>
      );
    }
    return (
      <div className="fw-bold h-100 d-flex align-items-center justify-content-center px-2 text-break" style={{ color: isFront ? 'var(--text-primary)' : '#ffffff', fontSize: 'clamp(1.35rem, 5vw, 1.85rem)' }}>
        {val}
      </div>
    );
  };

  const speak = (text, lang) => {
    speakText(text, lang);
  };

  useEffect(() => {
    if (controlledFlipped === undefined) setInternalFlipped(false);
    if (autoPlay) setTimeout(() => speak(frontText, frontLang), 250);
  }, [vocab, autoPlay, contentType, isReversed]);

  const handleFlip = () => {
    if (isDraggingRef.current) return;
    playSound('pop');
    const newState = !flipped;
    if (onFlip) onFlip(newState);
    else setInternalFlipped(newState);
    if (autoPlay) speak(newState ? backText : frontText, newState ? backLang : frontLang);
  };

  const playAudio = (e, text, lang) => {
    e.stopPropagation();
    speak(text, lang);
  };

  const renderStarButton = () => (
    <button
      className="btn-icon-soft position-absolute top-0 start-0 m-3"
      style={{
        zIndex: 20,
        backgroundColor: isStarred ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-elevated)',
        borderColor: isStarred ? 'rgba(245, 158, 11, 0.45)' : 'var(--surface-border)',
        color: isStarred ? '#f59e0b' : 'var(--text-secondary)',
      }}
      onClick={handleToggleStar}
      title="Đánh dấu sao"
    >
      <Star size={18} fill={isStarred ? 'currentColor' : 'none'} strokeWidth={2} />
    </button>
  );

  return (
    <motion.div
      className="flashcard-container"
      style={{ perspective: '1200px', x: dragX, rotate: rotateZ }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      dragTransition={{ bounceStiffness: 260, bounceDamping: 26 }}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={(_, info) => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 60);
        if (info.offset.x < -85 || info.velocity.x < -500) {
          if (onSwipeNext) onSwipeNext();
        } else if (info.offset.x > 85 || info.velocity.x > 500) {
          if (onSwipePrev) onSwipePrev();
        }
      }}
      onClick={handleFlip}
    >
      <motion.div className="flashcard-swipe-badge next" style={{ opacity: nextBadgeOpacity }}>
        Tiếp theo →
      </motion.div>
      <motion.div className="flashcard-swipe-badge prev" style={{ opacity: prevBadgeOpacity }}>
        ← Quay lại
      </motion.div>

      <motion.div
        className="w-100 h-100 position-relative"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={FLIP_SPRING}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* MẶT TRƯỚC */}
        <div
          className="position-absolute w-100 h-100 d-flex flex-column rounded-4 flashcard-front-surface"
          style={{
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
          }}
        >
          {renderStarButton()}

          <div className="flex-grow-1 p-3 d-flex align-items-center justify-content-center text-center">
            {renderField(frontField, true)}
          </div>

          <div className="p-2 px-3 d-flex justify-content-between align-items-center bg-light border-top">
            <button className="btn btn-mobile-chip chip-slate" onClick={handleOpenNote}>
              <BookOpen size={14} /> <span>Sổ tay</span>
            </button>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Chạm để lật • Vuốt chuyển</span>
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
            background: 'var(--brand-gradient)',
            border: '1.5px solid var(--brand-primary)',
            boxShadow: '0 12px 28px -6px rgba(109, 40, 217, 0.3)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            className="flashcard-glare"
            initial={false}
            animate={{ x: flipped ? ['-100%', '100%'] : '-100%' }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
          {renderStarButton()}

          <button
            className="btn-icon-soft position-absolute top-0 end-0 m-3 border-0"
            style={{ zIndex: 20, backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(vocab);
            }}
            title="Sửa nhanh từ này"
          >
            <Edit3 size={16} />
          </button>

          <div className="flex-grow-1 p-3 d-flex align-items-center justify-content-center text-center position-relative" style={{ zIndex: 12 }}>
            {renderField(backField, false)}
          </div>

          <div className="p-2 px-3 d-flex justify-content-between align-items-center position-relative" style={{ backgroundColor: 'rgba(0,0,0,0.18)', zIndex: 12 }}>
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
    </motion.div>
  );
}

export default Flashcard;