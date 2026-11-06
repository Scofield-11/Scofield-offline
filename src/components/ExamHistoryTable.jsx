import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2, Clock, Calendar, ArrowDown } from 'lucide-react';
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
        className="card border rounded-3 overflow-hidden mb-3"
        style={{ cursor: 'pointer', background: 'var(--bg-surface)', borderColor: 'var(--surface-border)' }}
        onClick={() => setShowMainHistory(!showMainHistory)}
      >
        <div className="card-header p-3 p-md-4 border-0 d-flex justify-content-between align-items-center" style={{ background: 'var(--bg-surface)' }}>
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock size={18} style={{ color: 'var(--text-secondary)' }} />
            <span>Lịch sử làm bài</span>
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
                    <div key={dateKey} className="card border rounded-3 overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--surface-border)' }}>
                      <div
                        className="card-header p-3 p-md-4 border-0 d-flex justify-content-between align-items-center"
                        style={{ cursor: 'pointer', background: 'var(--bg-surface)' }}
                        onClick={() => toggleDate(dateKey)}
                      >
                        <h6 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Calendar size={15} style={{ color: 'var(--text-secondary)' }} />
                          <span>{dateKey}</span>
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
                            <div
                              className="card-body p-0 border-top"
                              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--surface-border)' }}
                            >
                              {/* Desktop Table View */}
                              <div className="d-none d-md-block table-responsive">
                                <table className="table table-hover mb-0 align-middle" style={{ color: 'var(--text-main)', borderColor: 'var(--surface-border)' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--surface-border)' }}>
                                      <th className="py-3 px-4 text-muted small fw-bold">Thời gian</th>
                                      <th className="py-3 text-muted small fw-bold">Tên bài thi</th>
                                      <th className="py-3 text-center text-muted small fw-bold">Kết quả</th>
                                      <th className="py-3 px-4 text-end text-muted small fw-bold">Chi tiết</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {records.map((record) => (
                                      <tr
                                        key={record.id}
                                        style={{ cursor: 'pointer', borderColor: 'var(--surface-border)' }}
                                        onClick={() => setViewHistory(record)}
                                      >
                                        <td className="text-muted small px-4">
                                          {record.full_date || record.date}
                                        </td>
                                        <td className="fw-bold" style={{ color: 'var(--text-main)' }}>{record.title}</td>
                                        <td className="text-center">
                                          <span
                                            className={`badge rounded-pill px-3 py-1.5 fw-bold ${
                                              record.score === record.total ? 'bg-success text-white' : 'chip-primary'
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

                              {/* Mobile List Card View */}
                              <div className="d-md-none p-2 d-flex flex-column gap-2">
                                {records.map((record) => (
                                  <div
                                    key={record.id}
                                    className="p-3 rounded-3 d-flex justify-content-between align-items-center"
                                    style={{
                                      backgroundColor: 'var(--bg-surface)',
                                      border: '1px solid var(--surface-border)',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setViewHistory(record)}
                                  >
                                    <div className="flex-grow-1 pe-2">
                                      <div className="fw-bold text-truncate" style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                        {record.title}
                                      </div>
                                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                        {record.full_date || record.date}
                                      </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                      <span
                                        className={`badge rounded-pill px-2.5 py-1 fw-bold ${
                                          record.score === record.total ? 'bg-success text-white' : 'chip-primary'
                                        }`}
                                        style={{ fontSize: '0.75rem' }}
                                      >
                                        {record.score}/{record.total}
                                      </span>
                                      <button
                                        className="btn btn-mobile-chip chip-primary py-1 px-2.5"
                                        style={{ fontSize: '0.75rem' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewHistory(record);
                                        }}
                                      >
                                        Xem
                                      </button>
                                    </div>
                                  </div>
                                ))}
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
                    <button className="btn btn-mobile-chip chip-primary px-4 py-2 d-inline-flex align-items-center gap-1.5" onClick={onLoadMore}>
                      <span>Tải thêm lịch sử</span>
                      <ArrowDown size={14} />
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
  