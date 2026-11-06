import React from 'react';

function LoadingSkeleton() {
  return (
    <div className="container mt-5" style={{ maxWidth: '850px' }}>
      <div className="d-flex justify-content-center mb-4">
        <div className="wisteria-skeleton" style={{ width: '220px', height: '36px', borderRadius: '12px' }} />
      </div>

      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="card shadow-sm border-0 rounded-4 mb-3 p-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <div className="d-flex flex-column gap-2.5">
            <div className="wisteria-skeleton" style={{ width: '40%', height: '22px' }} />
            <div className="wisteria-skeleton" style={{ width: '75%', height: '16px' }} />
            <div className="wisteria-skeleton" style={{ width: '55%', height: '16px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
