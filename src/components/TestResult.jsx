import React from 'react';

function TestResult({ score, questions, onRestart, onCreateMistakeSet, onSaveNote }) {
  const percent = Math.round((score.correct / score.total) * 100);
  const wrongCount = score.total - score.correct;
  
  // Xác định màu sắc theo phần trăm
  const color = percent >= 80 ? 'var(--bs-success)' : percent >= 50 ? 'var(--bs-warning)' : 'var(--bs-danger)';

  return (
    <div className="container mt-5 print-container fade-in-slide" style={{ maxWidth: '800px' }}>
      <div className="card shadow-lg border-0 p-5 mb-5 text-center rounded-4 print-no-shadow bg-white position-relative overflow-hidden">
        <h3 className="fw-bold text-dark mb-5" style={{ zIndex: 2, position: 'relative' }}>Kết quả bài kiểm tra</h3>
        
        {/* Biểu đồ tròn CSS (Conic Gradient) */}
        <div className="mx-auto mb-4 position-relative d-flex justify-content-center align-items-center" 
             style={{ 
               width: '180px', height: '180px', 
               borderRadius: '50%', 
               background: `conic-gradient(${color} ${percent}%, #f0f0f0 ${percent}% 100%)`,
               boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
             }}>
          <div className="bg-white rounded-circle d-flex flex-column justify-content-center align-items-center" 
               style={{ width: '140px', height: '140px' }}>
            <h1 className="fw-bold mb-0" style={{ color: color, fontSize: '3rem' }}>{percent}%</h1>
          </div>
        </div>

        <p className="fs-5 fw-bold text-muted mb-5">Bạn trả lời đúng <strong>{score.correct} / {score.total}</strong> câu</p>
        
        <div className="d-flex flex-wrap justify-content-center gap-2 position-relative" style={{ zIndex: 2 }}>
          <button className="btn btn-primary btn-touch px-4" onClick={onRestart}>
            🔄 Làm đề mới
          </button>
          {wrongCount > 0 && (
            <button className="btn btn-warning btn-touch text-dark px-4" onClick={onCreateMistakeSet}>
              ✨ Lưu {wrongCount} câu sai
            </button>
          )}
          <button className="btn btn-light btn-touch px-3" onClick={() => window.print()}>
            🖨️ In
          </button>
        </div>
      </div>

      <h4 className="mb-4 fw-bold">Chi tiết bài làm:</h4>
      {questions.map((q, idx) => (
        <div key={idx} className={`card mb-4 border-0 shadow-sm rounded-4 ${q.isCorrect ? 'bg-light' : 'bg-danger'}`} style={{ '--bs-bg-opacity': q.isCorrect ? 1 : 0.05, breakInside: 'avoid' }}>
          <div className="card-body p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <h5 className="card-title fw-bold m-0" style={{ lineHeight: '1.5' }}>
                <span className={`badge me-2 ${q.isCorrect ? 'bg-success' : 'bg-danger'}`}>{idx + 1}</span> 
                {q.questionText}
              </h5>
              {!q.isCorrect && q.id && (
                <button className="btn btn-light rounded-circle shadow-sm border-0 fs-5 d-flex align-items-center justify-content-center transition-all hover-scale ms-3 d-print-none" style={{ width: '40px', height: '40px', color: '#8a2be2', flexShrink: 0 }} onClick={() => onSaveNote(q.id)} title="Lưu vào Note">
                  📓
                </button>
              )}
            </div>
            
            <div className="p-3 rounded-3 bg-white border shadow-sm mb-3">
              <span className="text-muted fw-bold d-block mb-1 fs-6">Lựa chọn của bạn:</span> 
              <span className={`fs-5 ${q.isCorrect ? 'text-success fw-bold' : 'text-danger fw-bold text-decoration-line-through'}`}>
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
        <button className="btn btn-outline-secondary px-5 py-3 fw-bold rounded-pill shadow-sm transition-all hover-scale" onClick={onRestart}>
          ← Đóng kết quả
        </button>
      </div>
    </div>
  );
}

export default TestResult;