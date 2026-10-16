import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2 } from 'lucide-react';
import EmptyState from './EmptyState';

const ACCORDION_TRANSITION = { duration: 0.24, ease: [0.22, 1, 0.36, 1] };

function ExamHistoryTable({ history, setViewHistory, handleClearHistory, onLoadMore, hasMore }) {
  const [expandedDates, setExpandedDates] = useState({});
  const [showMainHistory, setShowMainHistory] = useState(false);

  const toggleDate = (dateKey) => {
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const groupedHistory = history.reduce((acc, record) => {
    const dateKey = record.date.includes(' - ') ? record.date.split(' - ')[1] : record.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(record);
    return acc;
  }, {});

  return (
    <div className="mt-4 mb-5">
      <div
        className="card shadow-sm border-0 rounded-4 overflow-hidden mb-3"
        style={{ cursor: 'pointer' }}
        onClick={() => setShowMainHistory(!showMainHistory)}
      >
        <div className="card-header bg-white p-3 p-md-4 border-0 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold text-primary d-flex align-items-center gap-2">
            🕒 Lịch sử làm bài
          </h5>
          <span className="btn-icon-soft chip-slate">
            <motion.span
              animate={{ rotate: showMainHistory ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="d-inline-flex align-items-center"
            >
              <ChevronDown size={18} />
            </motion.span>
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showMainHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ACCORDION_TRANSITION}
            style={{ overflow: 'hidden' }}
          >
            {history.length > 0 && (
              <div className="d-flex justify-content-end mb-3">
                <button className="btn btn-mobile-chip chip-danger px-3" onClick={handleClearHistory}>
                  <Trash2 size={14} /> <span>Xóa lịch sử</span>
                </button>
              </div>
            )}

            {history.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu" message="Lịch sử làm bài thi của bạn sẽ được hiển thị tại đây." />
            ) : (
              <div className="d-flex flex-column gap-3 mb-4">
                {Object.entries(groupedHistory).map(([dateKey, records]) => {
                  const isExpanded = !!expandedDates[dateKey];
                  return (
                    <div key={dateKey} className="card shadow-sm border-0 rounded-4 overflow-hidden">
                      <div
                        className="card-header bg-white p-3 p-md-4 border-0 d-flex justify-content-between align-items-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleDate(dateKey)}
                      >
                        <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                          📅 {dateKey}{' '}
                          <span className="badge chip-primary rounded-pill">{records.length} bài</span>
                        </h6>
                        <span className="btn-icon-soft chip-slate">
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="d-inline-flex align-items-center"
                          >
                            <ChevronDown size={16} />
                          </motion.span>
                        </span>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={ACCORDION_TRANSITION}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="card-body p-0 border-top bg-light">
                              <div className="table-responsive">
                                <table className="table table-hover mb-0 align-middle">
                                  <thead className="table-light">
                                    <tr>
                                      <th className="py-3 px-4">Thời gian</th>
                                      <th className="py-3">Tên bài thi</th>
                                      <th className="py-3 text-center">Kết quả</th>
                                      <th className="py-3 px-4 text-end">Chi tiết</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {records.map((record) => (
                                      <tr
                                        key={record.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setViewHistory(record)}
                                      >
                                        <td className="text-muted small px-4">
                                          {record.full_date || record.date}
                                        </td>
                                        <td className="fw-bold">{record.title}</td>
                                        <td className="text-center">
                                          <span
                                            className={`badge rounded-pill px-3 py-2 ${
                                              record.score === record.total ? 'bg-success' : 'bg-primary'
                                            }`}
                                          >
                                            {record.score} / {record.total}
                                          </span>
                                        </td>
                                        <td className="text-end px-4">
                                          <button
                                            className="btn btn-mobile-chip chip-primary"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setViewHistory(record);
                                            }}
                                          >
                                            Xem lại
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {hasMore && onLoadMore && (
                  <div className="text-center mt-2">
                    <button className="btn btn-mobile-chip chip-primary px-4 py-2" onClick={onLoadMore}>
                      Tải thêm lịch sử ↓
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExamHistoryTable;
  const [expandedDates, setExpandedDates] = useState({});
  const [showMainHistory, setShowMainHistory] = useState(false);

  const toggleDate = (dateKey) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  // Nhóm lịch sử theo ngày (Xử lý tương thích cả 2 định dạng cũ/mới)
  const groupedHistory = history.reduce((acc, record) => {
    const dateKey = record.date.includes(' - ') ? record.date.split(' - ')[1] : record.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(record);
    return acc;
  }, {});

  return (
    <div className="mt-5 mb-5 fade-in-slide">
      <div 
        className="card shadow-sm border-0 rounded-4 overflow-hidden mb-3 transition-all hover-bg-light"
        style={{ cursor: 'pointer' }}
        onClick={() => setShowMainHistory(!showMainHistory)}
      >
        <div className="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center">
          <h4 className="mb-0 fw-bold text-primary d-flex align-items-center gap-2">
            🕒 Lịch sử làm bài
          </h4>
          <span className="text-muted fs-5 bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
            {showMainHistory ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {showMainHistory && (
        <div className="fade-in">
          {history.length > 0 && (
            <div className="d-flex justify-content-end mb-3">
              <button className="btn btn-outline-danger btn-sm rounded-pill fw-bold px-3 shadow-sm hover-bg-danger hover-text-white transition-all" onClick={handleClearHistory}>
                🗑️ Xóa lịch sử
              </button>
            </div>
          )}
          
          {history.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" message="Lịch sử làm bài thi của bạn sẽ được hiển thị tại đây." />
          ) : (
            <div className="d-flex flex-column gap-3 mb-5">
              {Object.entries(groupedHistory).map(([dateKey, records]) => {
                const isExpanded = expandedDates[dateKey];
                return (
                  <div key={dateKey} className="card shadow-sm border-0 rounded-4 overflow-hidden">
                    <div 
                      className="card-header bg-white p-4 border-0 d-flex justify-content-between align-items-center transition-all hover-bg-light"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleDate(dateKey)}
                    >
                      <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                        📅 {dateKey} <span className="badge bg-light text-primary border">{records.length} bài</span>
                      </h5>
                      <span className="text-muted fs-5 bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="card-body p-0 border-top bg-light fade-in">
                        <div className="table-responsive">
                          <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th className="py-3 px-4">Thời gian</th>
                                <th className="py-3">Tên bài thi</th>
                                <th className="py-3 text-center">Kết quả</th>
                                <th className="py-3 px-4 text-end">Chi tiết</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map(record => (
                                <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => setViewHistory(record)}>
                                  <td className="text-muted small px-4">{record.full_date || record.date}</td>
                                  <td className="fw-bold">{record.title}</td>
                                  <td className="text-center">
                                    <span className={`badge rounded-pill px-3 py-2 ${record.score === record.total ? 'bg-success' : 'bg-primary'}`}>
                                      {record.score} / {record.total}
                                    </span>
                                  </td>
                                  <td className="text-end px-4">
                                    <button className="btn btn-sm btn-outline-info fw-bold rounded-pill px-3 transition-all hover-scale" onClick={(e) => { e.stopPropagation(); setViewHistory(record); }}>
                                      Xem lại
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {hasMore && onLoadMore && (
                <div className="text-center mt-3">
                  <button className="btn btn-outline-primary px-5 py-2 fw-bold rounded-pill shadow-sm" onClick={onLoadMore}>
                    Tải thêm lịch sử ↓
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExamHistoryTable;