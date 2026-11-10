import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Play, Pause, Eye, EyeOff, Sparkles } from 'lucide-react';

// Bộ nhớ đệm tránh gọi lại mạng khi lật thẻ hoặc mở lại cùng 1 chữ Hán
const strokeDataCache = new Map();

const extractKanjiChars = (str) => {
  if (!str) return [];
  const matches = String(str).match(/[\u4e00-\u9faf\u3400-\u4dbf]/g);
  return matches ? [...new Set(matches)] : [];
};

function KanjiStrokeOrder({ text, size = 136, autoStart = true, compact = false }) {
  const kanjiChars = useMemo(() => extractKanjiChars(text), [text]);
  const [selectedCharIdx, setSelectedCharIdx] = useState(0);
  const [strokeData, setStrokeData] = useState({ paths: [], numbers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [animKey, setAnimKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [showNumbers, setShowNumbers] = useState(true);
  const [speed, setSpeed] = useState(1); // 1x hoặc 1.75x

  useEffect(() => {
    setSelectedCharIdx(0);
  }, [text]);

  const activeChar = kanjiChars[selectedCharIdx] || '';

  useEffect(() => {
    if (!activeChar) {
      setStrokeData({ paths: [], numbers: [] });
      return;
    }

    let isMounted = true;
    const hex = activeChar.codePointAt(0).toString(16).padStart(5, '0');

    if (strokeDataCache.has(hex)) {
      setStrokeData(strokeDataCache.get(hex));
      setError(false);
      setAnimKey((prev) => prev + 1);
      setIsPlaying(true);
      return;
    }

    setLoading(true);
    setError(false);

    fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.text();
      })
      .then((svgText) => {
        if (!isMounted) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');

        const pathNodes = doc.querySelectorAll('g[id^="kvg:StrokePaths"] path');
        const paths = Array.from(pathNodes).map((p) => p.getAttribute('d')).filter(Boolean);

        const numNodes = doc.querySelectorAll('g[id^="kvg:StrokeNumbers"] text');
        const numbers = Array.from(numNodes).map((t, idx) => {
          const transform = t.getAttribute('transform') || '';
          const match = transform.match(/matrix\([^)]+\s+([\d.]+)\s+([\d.]+)\)/);
          return {
            num: t.textContent || String(idx + 1),
            x: match ? parseFloat(match[1]) : 0,
            y: match ? parseFloat(match[2]) : 0,
          };
        });

        const parsed = { paths, numbers };
        strokeDataCache.set(hex, parsed);
        setStrokeData(parsed);
        setAnimKey((prev) => prev + 1);
        setIsPlaying(true);
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeChar]);

  if (kanjiChars.length === 0) return null;

  const strokeDuration = 0.52 / speed;
  const strokeGap = 0.12 / speed;

  const handleReplay = (e) => {
    e?.stopPropagation();
    setIsPlaying(true);
    setAnimKey((prev) => prev + 1);
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    setIsPlaying((prev) => !prev);
  };

  const toggleNumbers = (e) => {
    e?.stopPropagation();
    setShowNumbers((prev) => !prev);
  };

  const toggleSpeed = (e) => {
    e?.stopPropagation();
    setSpeed((prev) => (prev === 1 ? 1.75 : 1));
    setAnimKey((prev) => prev + 1);
    setIsPlaying(true);
  };

  const btnSize = compact ? 28 : 32;
  const iconSize = compact ? 13 : 14;

  return (
    <div
      className={`kanji-stroke-widget ${compact ? 'kanji-stroke-widget--compact' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Thanh chọn từng chữ Hán nếu cụm từ có nhiều chữ Hán */}
      {kanjiChars.length > 1 && (
        <div className="kanji-stroke-char-tabs mb-1">
          {kanjiChars.map((ch, idx) => (
            <button
              key={ch + idx}
              type="button"
              className={`kanji-stroke-char-tab ${selectedCharIdx === idx ? 'active' : ''}`}
              onClick={() => setSelectedCharIdx(idx)}
            >
              {ch}
            </button>
          ))}
        </div>
      )}

      <div className="kanji-stroke-main-stack">
        {/* Khung lưới tập viết chuẩn Nhật Bản */}
        <div
          className="kanji-stroke-canvas-box position-relative"
          style={{ width: size, height: size }}
          onClick={handleReplay}
          title="Chạm vào ô chữ để vẽ lại thứ tự nét"
        >
          <svg
            viewBox="0 0 109 109"
            width="100%"
            height="100%"
            className="kanji-stroke-svg"
          >
            {/* Đường gióng ô vuông nét đứt */}
            <line x1="54.5" y1="0" x2="54.5" y2="109" className="kanji-grid-line" />
            <line x1="0" y1="54.5" x2="109" y2="54.5" className="kanji-grid-line" />
            <line x1="0" y1="0" x2="109" y2="109" className="kanji-grid-line-diag" />
            <line x1="109" y1="0" x2="0" y2="109" className="kanji-grid-line-diag" />

            {/* Lớp nét chìm làm nền */}
            <g className="kanji-ghost-layer">
              {strokeData.paths.map((d, i) => (
                <path key={`ghost-${i}`} d={d} />
              ))}
            </g>

            {/* Lớp nét vẽ hoạt ảnh */}
            <g
              key={`anim-${activeChar}-${animKey}-${speed}`}
              className={`kanji-anim-layer ${isPlaying ? 'playing' : 'paused'}`}
            >
              {strokeData.paths.map((d, i) => (
                <path
                  key={`stroke-${i}`}
                  d={d}
                  pathLength="1"
                  className="kanji-animated-path"
                  style={{
                    animationDuration: `${strokeDuration}s`,
                    animationDelay: `${i * (strokeDuration + strokeGap)}s`,
                  }}
                />
              ))}
            </g>

            {/* Lớp số thứ tự nét */}
            {showNumbers && (
              <g className="kanji-number-layer">
                {strokeData.numbers.map((n, i) => (
                  <text key={`num-${i}`} x={n.x} y={n.y}>
                    {n.num}
                  </text>
                ))}
              </g>
            )}
          </svg>

          {loading && (
            <div className="kanji-stroke-overlay">
              <span className="small fw-bold text-secondary" style={{ fontSize: '0.7rem' }}>
                Đang tải...
              </span>
            </div>
          )}

          {error && !loading && (
            <div className="kanji-stroke-overlay">
              <span
                style={{
                  fontFamily: 'var(--font-jp-serif)',
                  fontSize: size * 0.54,
                  fontWeight: 700,
                  color: 'var(--brand-primary, #634ce2)',
                }}
              >
                {activeChar}
              </span>
            </div>
          )}

          </div>

        {/* Thanh điều khiển nét viết + Nhãn số nét nằm ngoài ô chữ (không che chữ Hán) */}
        {!error && (
          <div className="kanji-stroke-controls-dock">
            {!loading && strokeData.paths.length > 0 && (
              <span className="kanji-stroke-count-pill">
                {strokeData.paths.length} nét
              </span>
            )}

            <button
              type="button"
              className="btn-icon-soft chip-primary"
              style={{ width: btnSize, height: btnSize }}
              onClick={handleReplay}
              title="Vẽ lại từ đầu"
            >
              <RotateCcw size={iconSize} strokeWidth={2.3} />
            </button>

            <button
              type="button"
              className="btn-icon-soft chip-slate"
              style={{ width: btnSize, height: btnSize }}
              onClick={togglePlay}
              title={isPlaying ? 'Tạm dừng' : 'Tiếp tục'}
            >
              {isPlaying ? (
                <Pause size={iconSize} strokeWidth={2.3} />
              ) : (
                <Play size={iconSize} strokeWidth={2.3} />
              )}
            </button>

            <button
              type="button"
              className={`btn-icon-soft ${showNumbers ? 'chip-primary' : 'chip-slate'}`}
              style={{ width: btnSize, height: btnSize }}
              onClick={toggleNumbers}
              title="Ẩn/Hiện số thứ tự nét"
            >
              {showNumbers ? (
                <Eye size={iconSize} strokeWidth={2.3} />
              ) : (
                <EyeOff size={iconSize} strokeWidth={2.3} />
              )}
            </button>

            <button
              type="button"
              className="btn-icon-soft chip-slate fw-bold"
              style={{ width: btnSize, height: btnSize, fontSize: '0.65rem' }}
              onClick={toggleSpeed}
              title="Đổi tốc độ vẽ"
            >
              {speed === 1 ? '1x' : '2x'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default KanjiStrokeOrder;