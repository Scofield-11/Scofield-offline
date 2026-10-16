import React from 'react';
import SetSelector from './SetSelector';
import ContentTypeSelector from './ContentTypeSelector';
import GameModeSelector from './GameModeSelector';

function TestSetup({ sets, currentContentType, selectedSetId, setSelectedSetId, questionCount, setQuestionCount, poolSize, questionFormat, setQuestionFormat, isReversed, setIsReversed, kanjiFront, setKanjiFront, kanjiBack, setKanjiBack, generateTest }) {
  
  const hasFourFields = (() => {
    if (currentContentType === 'kanji') return true;
    if (String(selectedSetId).includes('ja') || String(selectedSetId).includes('kanji')) return true;
    
    let targetSets = [];
    if (String(selectedSetId).startsWith('folder_')) {
      const folderName = String(selectedSetId).substring(7);
      targetSets = sets.filter(s => (s.folder_path || '🏠 Thư mục gốc') === folderName);
    } else {
      const s = sets.find(set => set.id == selectedSetId);
      if (s) targetSets = [s];
    }

    if (targetSets.length > 0) {
      return targetSets.some(s => s.language === 'ja' || s.type === 'kanji' || (s.vocabularies && s.vocabularies.some(v => v.hanviet || v.hiragana)));
    }
    return false;
  })();

  const handleSwap = () => {
    if (hasFourFields) {
      setKanjiFront(kanjiBack);
      setKanjiBack(kanjiFront);
    } else {
      setIsReversed(!isReversed);
    }
  };

  return (
    <div className="container mt-3 fade-in-slide" style={{ maxWidth: '600px' }}>
      <div className="card shadow-sm border-0 p-3 p-md-4 rounded-4 bg-white">
        <h4 className="text-center mb-3 fw-bold text-dark">📝 Thiết lập Bài Thi</h4>
        
        <div className="mb-3">
          <label className="form-label fw-bold text-muted small mb-1">Học phần</label>
          <SetSelector sets={sets} selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="form-label fw-bold text-muted small mb-1">Số câu (Tối đa {poolSize})</label>
            <input 
              type="number" 
              className="form-control bg-light border-0 fw-bold text-dark" 
              style={{ borderRadius: '12px', height: '44px' }}
              value={questionCount} 
              onChange={(e) => setQuestionCount(Number(e.target.value))} 
              max={poolSize}
              min={1}
            />
          </div>
          <div className="col-6">
            <label className="form-label fw-bold text-muted small mb-1">Hình thức</label>
            <select 
              className="form-select bg-light border-0 fw-bold text-dark" 
              style={{ borderRadius: '12px', height: '44px' }}
              value={questionFormat} 
              onChange={(e) => setQuestionFormat(e.target.value)}
            >
              <option value="choice">Trắc nghiệm</option>
              <option value="typing">Tự luận</option>
              <option value="mixed">Hỗn hợp 50/50</option>
            </select>
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
            sectionLabel="Dạng câu hỏi"
          />
        </div>

        <button className="btn btn-primary btn-touch w-100" onClick={generateTest}>
          Bắt đầu làm bài 🚀
        </button>
      </div>
    </div>
  );
}

export default TestSetup;