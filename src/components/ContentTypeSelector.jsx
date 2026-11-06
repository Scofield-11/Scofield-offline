import React from 'react';
import { BookOpen, ScrollText } from 'lucide-react';

function ContentTypeSelector({ contentType, setContentType }) {
  const isVocab = contentType === 'vocab';
  const isKanji = contentType === 'kanji';

  return (
    <div className="d-flex gap-2 mb-4">
      <button
        type="button"
        className={`btn w-50 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 ${
          isVocab ? 'btn-primary text-white' : 'btn-light'
        }`}
        onClick={() => setContentType('vocab')}
        style={{
          borderRadius: '14px',
          padding: '12px 16px',
          backgroundColor: isVocab ? undefined : 'var(--bg-elevated)',
          borderColor: isVocab ? undefined : 'var(--surface-border)',
          color: isVocab ? '#ffffff' : 'var(--text-main)',
          transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className={isVocab ? '' : 'icon-badge-indigo'}
          style={
            isVocab
              ? {
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                }
              : { width: '28px', height: '28px', borderRadius: '8px' }
          }
        >
          <BookOpen size={16} strokeWidth={2.4} />
        </div>
        <span>Từ vựng</span>
      </button>

      <button
        type="button"
        className={`btn w-50 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 ${
          isKanji ? 'btn-primary text-white' : 'btn-light'
        }`}
        onClick={() => setContentType('kanji')}
        style={{
          borderRadius: '14px',
          padding: '12px 16px',
          backgroundColor: isKanji ? undefined : 'var(--bg-elevated)',
          borderColor: isKanji ? undefined : 'var(--surface-border)',
          color: isKanji ? '#ffffff' : 'var(--text-main)',
          transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className={isKanji ? '' : 'icon-badge-rose'}
          style={
            isKanji
              ? {
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                }
              : { width: '28px', height: '28px', borderRadius: '8px' }
          }
        >
          <ScrollText size={16} strokeWidth={2.4} />
        </div>
        <span>Từ điển Kanji</span>
      </button>
    </div>
  );
}

export default ContentTypeSelector;
