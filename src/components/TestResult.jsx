import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Sparkles, BookMarked } from 'lucide-react';

function TestResult({ score, questions, onRestart, onCreateMistakeSet, onSaveNote }) {
  const percent = Math.round((score.correct / score.total) * 100) || 0;
  const wrongCount = score.total - score.correct;
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    let startTime = null;
    const duration = 1100;
    let rafId;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPercent(Math.round(eased * percent));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [percent]);

  const strokeColor =
    percent >= 80 ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444';

  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="container mt-4 print-container" style={{ maxWidth: '800px' }}>
      <div className="card shadow-lg border-0 p-4 p-md-5 mb-5 text-center rounded-4 print-no-shadow bg-white position-relative overflow-hidden">
        <h3 className="fw-bold text-dark mb-4" style={{ zIndex: 2, position: 'relative' }}>
          Kết quả bài kiểm tra
        </h3>

        {/* Biểu đồ SVG <motion.circle> mượt mà */}
        <div
          className="mx-auto mb-4 position-relative d-flex justify-content-center align-items-center"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--surface-border)"
              strokeWidth={strokeWidth}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          </svg>
          <div className="position-absolute d-flex flex-column justify-content-center align-items-center">
            <h1 className="fw-bold mb-0" style={{ color: strokeColor, fontSize: '2.75rem' }}>
              {displayPercent}%
            </h1>
          </div>
        </div>

        <p className="fs-5 fw-bold text-muted mb-4">
          Bạn trả lời đúng <strong>{score.correct} / {score.total}</strong> câu
        </p>

        <div className="d-flex flex-wrap justify-content-center gap-2 position-relative" style={{ zIndex: 2 }}>
          <button className="btn btn-primary btn-touch px-4" onClick={onRestart}>
            <RefreshCw size={16} /> <span>Làm đề mới</span>
          </button>
          {wrongCount > 0 && (
            <button className="btn btn-warning btn-touch text-dark px-4" onClick={onCreateMistakeSet}>
              <Sparkles size={16} /> <span>Lưu {wrongCount} câu sai</span>
            </button>
          )}
          <button className="btn btn-light btn-touch px-3" onClick={() => window.print()}>
            🖨️ In
          </button>
        </div>
      </div>

      <h4 className="mb-4 fw-bold text-dark">Chi tiết bài làm:</h4>
      {questions.map((q, idx) => (
        <div
          key={idx}
          className={`card mb-3 border-0 shadow-sm rounded-4 ${q.isCorrect ? 'bg-light' : 'bg-white'}`}
          style={{ breakInside: 'avoid' }}
        >
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h5 className="card-title fw-bold m-0 text-dark" style={{ lineHeight: '1.5' }}>
                <span className={`badge me-2 ${q.isCorrect ? 'bg-success' : 'bg-danger'}`}>
                  {idx + 1}
                </span>
                {q.questionText}
              </h5>
              {!q.isCorrect && q.id && (
                <button
                  className="btn-icon-soft chip-primary ms-3 d-print-none flex-shrink-0"
                  onClick={() => onSaveNote(q.id)}
                  title="Lưu vào Note"
                >
                  <BookMarked size={16} />
                </button>
              )}
            </div>

            <div className="p-3 rounded-3 bg-white border shadow-sm mb-3">
              <span className="text-muted fw-bold d-block mb-1 fs-6">Lựa chọn của bạn:</span>
              <span
                className={`fs-5 ${
                  q.isCorrect ? 'text-success fw-bold' : 'text-danger fw-bold text-decoration-line-through'
                }`}
              >
                {q.userAnswer || '(Bỏ trống)'}
              </span>
            </div>

            {!q.isCorrect && (
              <div className="p-3 rounded-3 bg-white border border-success border-2 shadow-sm">
                <span className="text-success fw-bold d-block mb-1 fs-6">✓ Đáp án đúng:</span>
                <span className="text-dark fw-bold fs-5">{q.correctAnswer}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="text-center mt-5 mb-4 d-print-none">
        <button className="btn btn-light btn-touch px-5" onClick={onRestart}>
          ← Đóng kết quả
        </button>
      </div>
    </div>
  );
}

export default TestResult;
  