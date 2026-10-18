import React, { useState } from 'react';
import './GameModeSelector.css';

// ── Cấu hình mặc định cho Tiếng Nhật / Kanji (4 trường) ──
const DEFAULT_JA_PRESETS = [
  {
    id: 'translate',
    icon: '🧠',
    iconBg: '#ede9fe',
    label: 'Từ ➔ Nghĩa',
    getDesc: (f, b) => {
      return f === 'meaning' && (b === 'word' || b === 'kanji') ? 'Nghĩa ➔ Từ' : 'Từ ➔ Nghĩa';
    },
    frontKey: (type) => (type === 'kanji' ? 'kanji' : 'word'),
    backKey: () => 'meaning',
    isActive: (f, b, type) => {
      const w = type === 'kanji' ? 'kanji' : 'word';
      return (f === w && b === 'meaning') || (f === 'meaning' && b === w);
    },
  },
  {
    id: 'reading',
    icon: '🗣️',
    iconBg: '#fef3c7',
    label: 'Cách đọc',
    getDesc: (f, b) => {
      return f === 'hiragana' && (b === 'word' || b === 'kanji') ? 'Phiên âm ➔ Từ' : 'Từ ➔ Phiên âm';
    },
    frontKey: (type) => (type === 'kanji' ? 'kanji' : 'word'),
    backKey: () => 'hiragana',
    isActive: (f, b, type) => {
      const w = type === 'kanji' ? 'kanji' : 'word';
      return (f === w && b === 'hiragana') || (f === 'hiragana' && b === w);
    },
  },
  {
    id: 'hanviet',
    icon: '👑',
    iconBg: '#fee2e2',
    label: 'Hán Việt',
    getDesc: (f, b) => (f === 'meaning' && b === 'hanviet' ? 'Nghĩa ➔ Hán Việt' : 'Hán Việt ➔ Nghĩa'),
    frontKey: () => 'hanviet',
    backKey: () => 'meaning',
    isActive: (f, b) => (f === 'hanviet' && b === 'meaning') || (f === 'meaning' && b === 'hanviet'),
  },
  {
    id: 'listening',
    icon: '🎧',
    iconBg: '#dbeafe',
    label: 'Phiên âm',
    getDesc: (f, b) => (f === 'meaning' && b === 'hiragana' ? 'Nghĩa ➔ Kana' : 'Kana ➔ Nghĩa'),
    frontKey: () => 'hiragana',
    backKey: () => 'meaning',
    isActive: (f, b) => (f === 'hiragana' && b === 'meaning') || (f === 'meaning' && b === 'hiragana'),
  },
];

// ── Cấu hình riêng khi người dùng chọn Tiếng Trung (ZH - 4 trường) ──
const DEFAULT_ZH_PRESETS = [
  {
    id: 'zh_translate',
    icon: '🇨🇳',
    iconBg: '#fee2e2',
    label: 'Chữ Hán ➔ Nghĩa',
    getDesc: (f, b) => (f === 'meaning' && (b === 'word' || b === 'kanji') ? 'Nghĩa ➔ Chữ Hán' : 'Chữ Hán ➔ Nghĩa'),
    frontKey: () => 'word',
    backKey: () => 'meaning',
    isActive: (f, b) =>
      ((f === 'word' || f === 'kanji') && b === 'meaning') ||
      (f === 'meaning' && (b === 'word' || b === 'kanji')),
  },
  {
    id: 'zh_pinyin',
    icon: '🗣️',
    iconBg: '#fef3c7',
    label: 'Luyện Pinyin',
    getDesc: (f, b) => (f === 'hiragana' && (b === 'word' || b === 'kanji') ? 'Pinyin ➔ Chữ Hán' : 'Chữ Hán ➔ Pinyin'),
    frontKey: () => 'word',
    backKey: () => 'hiragana',
    isActive: (f, b) =>
      ((f === 'word' || f === 'kanji') && b === 'hiragana') ||
      (f === 'hiragana' && (b === 'word' || b === 'kanji')),
  },
  {
    id: 'zh_hanviet',
    icon: '👑',
    iconBg: '#ede9fe',
    label: 'Âm Hán Việt',
    getDesc: (f, b) => (f === 'meaning' && b === 'hanviet' ? 'Nghĩa ➔ Hán Việt' : 'Hán Việt ➔ Nghĩa'),
    frontKey: () => 'hanviet',
    backKey: () => 'meaning',
    isActive: (f, b) => (f === 'hanviet' && b === 'meaning') || (f === 'meaning' && b === 'hanviet'),
  },
  {
    id: 'zh_listening',
    icon: '🎧',
    iconBg: '#dbeafe',
    label: 'Pinyin ➔ Nghĩa',
    getDesc: (f, b) => (f === 'meaning' && b === 'hiragana' ? 'Nghĩa ➔ Pinyin' : 'Pinyin ➔ Nghĩa'),
    frontKey: () => 'hiragana',
    backKey: () => 'meaning',
    isActive: (f, b) => (f === 'hiragana' && b === 'meaning') || (f === 'meaning' && b === 'hiragana'),
  },
];

// ── Cấu hình mặc định cho 2 trường (Tiếng Anh) ──
const DEFAULT_TWO_FIELD_PRESETS = [
  {
    id: 'forward',
    icon: '🇬🇧',
    iconBg: '#dbeafe',
    label: 'Xuôi',
    description: 'Từ ➔ Nghĩa',
    reversedValue: false,
  },
  {
    id: 'backward',
    icon: '🇻🇳',
    iconBg: '#fef3c7',
    label: 'Ngược',
    description: 'Nghĩa ➔ Từ',
    reversedValue: true,
  },
];

function GameModeSelector({
  hasFourFields,
  currentContentType = 'vocab',
  currentLanguage = 'ja',
  isReversed = false,
  setIsReversed,
  kanjiFront,
  setKanjiFront,
  kanjiBack,
  setKanjiBack,
  onSwap,
  presets,
  twoFieldPresets,
  sectionLabel = 'Chọn kỹ năng rèn luyện',
}) {
  const [swapRotation, setSwapRotation] = useState(0);
  const isChinese = currentLanguage === 'zh';

  const fourFieldPresets = presets || (isChinese ? DEFAULT_ZH_PRESETS : DEFAULT_JA_PRESETS);
  const twoPresets = twoFieldPresets || DEFAULT_TWO_FIELD_PRESETS;

  const handleSwapClick = () => {
    setSwapRotation((prev) => prev + 180);
    if (onSwap) onSwap();
  };

  const handleFourFieldSelect = (preset) => {
    const isWord = preset.frontKey(currentContentType);
    const targetBack = preset.backKey(currentContentType);

    if (preset.isActive(kanjiFront, kanjiBack, currentContentType)) {
      if (onSwap) onSwap();
    } else {
      setKanjiFront(isWord);
      setKanjiBack(targetBack);
    }
  };

  const handleTwoFieldSelect = (preset) => {
    if (isReversed === preset.reversedValue) {
      if (onSwap) onSwap();
    } else {
      setIsReversed(preset.reversedValue);
    }
  };

  const getDirectionLabel = () => {
    if (hasFourFields) {
      const map = isChinese
        ? {
            kanji: 'Chữ Hán',
            word: 'Chữ Hán',
            hanviet: 'Hán Việt',
            hiragana: 'Pinyin',
            meaning: 'Ý nghĩa',
            summary: 'Chi tiết',
          }
        : {
            kanji: 'Từ vựng',
            word: 'Từ vựng',
            hanviet: 'Hán Việt',
            hiragana: 'Phiên âm',
            meaning: 'Ý nghĩa',
            summary: 'Chi tiết',
          };
      return `${map[kanjiFront] || 'A'} → ${map[kanjiBack] || 'B'}`;
    }
    return isReversed ? 'Nghĩa → Từ' : 'Từ → Nghĩa';
  };

  return (
    <div className="gms-container">
      <div className="gms-header">
        <span className="gms-section-label">{sectionLabel}</span>
        <button
          type="button"
          className="gms-swap-btn"
          onClick={handleSwapClick}
          title={`Đảo chiều: ${getDirectionLabel()}`}
        >
          <span className="gms-swap-icon" style={{ transform: `rotate(${swapRotation}deg)` }}>
            🔄
          </span>
          <span className="gms-swap-label">{getDirectionLabel()}</span>
        </button>
      </div>

      {hasFourFields ? (
        <div className="gms-grid gms-grid-4">
          {fourFieldPresets.map((preset) => {
            const active = preset.isActive(kanjiFront, kanjiBack, currentContentType);
            const desc = preset.getDesc(kanjiFront, kanjiBack, currentContentType);
            return (
              <button
                type="button"
                key={preset.id}
                className={`gms-card ${active ? 'gms-card--active' : ''}`}
                onClick={() => handleFourFieldSelect(preset)}
              >
                <div
                  className="gms-card-icon"
                  style={active ? undefined : { backgroundColor: preset.iconBg || 'var(--bg-elevated)' }}
                >
                  <span className="gms-card-emoji">{preset.icon}</span>
                </div>
                <div className="gms-card-content">
                  <span className="gms-card-title">{preset.label}</span>
                  <span className="gms-card-desc">{desc}</span>
                </div>
                {active && <div className="gms-card-check">✓</div>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="gms-grid gms-grid-2">
          {twoPresets.map((preset) => {
            const active = isReversed === preset.reversedValue;
            return (
              <button
                type="button"
                key={preset.id}
                className={`gms-card ${active ? 'gms-card--active' : ''}`}
                onClick={() => handleTwoFieldSelect(preset)}
              >
                <div
                  className="gms-card-icon"
                  style={active ? undefined : { backgroundColor: preset.iconBg || 'var(--bg-elevated)' }}
                >
                  <span className="gms-card-emoji">{preset.icon}</span>
                </div>
                <div className="gms-card-content">
                  <span className="gms-card-title">{preset.label}</span>
                  <span className="gms-card-desc">{preset.description}</span>
                </div>
                {active && <div className="gms-card-check">✓</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GameModeSelector;