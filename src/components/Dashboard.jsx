import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { VocabContext } from '../context/VocabContext';

function Dashboard() {
  const { sets } = useContext(VocabContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [todayTests, setTodayTests] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    api.get('/test-history?skip=0&limit=100')
      .then(res => {
        const history = res.data;
        const activeDates = [...new Set(history.map(item => {
          const match = item.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
        }).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));

        const today = new Date();
        const tzTodayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        const tTests = history.filter(item => {
          const match = item.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          return match && `${match[3]}-${match[2]}-${match[1]}` === tzTodayStr;
        }).length;

        setTodayTests(tTests);

        let streak = 0;
        let checkDate = new Date();
        if (activeDates.includes(tzTodayStr)) {
          streak = 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          const yestStr = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
          if (activeDates.includes(yestStr)) {
            checkDate = yest;
          }
        }

        while (true) {
          const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
          if (activeDates.includes(dStr)) {
            if (dStr !== tzTodayStr) streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }

        setCurrentStreak(streak);
      })
      .catch(console.error);
  }, [sets]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        api.get(`/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => {
            setSearchResults(res.data);
            setShowDropdown(true);
          })
          .catch(err => console.error(err))
          .finally(() => setIsSearching(false));
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="container-fluid mt-1 mb-3 mx-auto px-2 px-md-3" style={{ maxWidth: '1000px' }}>
      <div className="row g-2 g-md-3 fade-in-slide align-items-stretch">
        {/* Tầng 1: Thanh tìm kiếm gọn gàng */}
        <div className="col-12 position-relative" style={{ zIndex: 20 }}>
          <div className="card border-0 rounded-4 mesh-gradient-header p-3 p-md-4">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
              <div>
                <h5 className="fw-bold mb-1 text-dark">Hôm nay bạn muốn học gì? 🚀</h5>
                <p className="text-muted small mb-0 d-none d-md-block">
                  Tra cứu nhanh từ vựng, Hán tự và ôn tập mỗi ngày
                </p>
              </div>

              <div className="position-relative flex-grow-1" style={{ maxWidth: '520px' }} ref={dropdownRef}>
                <div className="input-group search-bar-3d bg-white px-2 py-1 d-flex align-items-center">
                  <span className="ps-2 pe-1 text-primary">🔍</span>
                  <input
                    type="text"
                    className="form-control border-0 py-1 fw-semibold text-dark shadow-none bg-transparent"
                    placeholder="Tìm từ vựng, Hán Việt, ý nghĩa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  />
                  {searchQuery && (
                    <button
                      className="btn btn-sm text-muted border-0 py-0 px-2"
                      onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                    >
                      ✖
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <div
                    className="position-absolute w-100 bg-white shadow-lg rounded-4 mt-2 overflow-hidden text-start fade-in-slide"
                    style={{ zIndex: 1050, top: '100%', left: 0, border: '1px solid #e2e8f0' }}
                  >
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="p-2">
                      {isSearching ? (
                        <div className="text-center p-3 text-muted small fw-bold">Đang tìm kiếm...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center p-3 text-muted small fw-bold">Không tìm thấy kết quả phù hợp</div>
                      ) : (
                        searchResults.map((item, idx) => {
                          const parentSet = sets.find(s => s.id === item.set_id);
                          const setTitle = parentSet ? parentSet.title : 'Chưa phân loại';
                          return (
                            <div key={idx} className="p-2 px-3 border-bottom border-light rounded-3 mb-1">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <span className="fw-bold text-dark">{item.word}</span>
                                  {item.hanviet && <span className="ms-2 small fw-bold text-primary">[{item.hanviet}]</span>}
                                  {item.hiragana && <span className="ms-2 small text-info fw-semibold">{item.hiragana}</span>}
                                </div>
                                <span className="badge bg-light text-secondary border rounded-pill" style={{ fontSize: '0.7rem' }}>
                                  {setTitle}
                                </span>
                              </div>
                              <div className="text-muted small mt-1">{item.meaning}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tầng 2: Bento Grid 4 ô nhỏ gọn (2 ô thống kê + 2 nút vào nhanh) */}
        <div className="col-6 col-md-3">
          <div className="card border-0 rounded-4 p-3 h-100 bg-white d-flex flex-row align-items-center gap-2">
            <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', backgroundColor: '#dcfce7', fontSize: '1.1rem', flexShrink: 0 }}>
              📝
            </div>
            <div className="overflow-hidden">
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>HÔM NAY</div>
              <div className="fw-bold text-success fs-6">{todayTests} bài test</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 rounded-4 p-3 h-100 bg-white d-flex flex-row align-items-center gap-2">
            <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', backgroundColor: '#fee2e2', fontSize: '1.1rem', flexShrink: 0 }}>
              🔥
            </div>
            <div className="overflow-hidden">
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>CHUỖI HỌC</div>
              <div className="fw-bold text-danger fs-6">{currentStreak} ngày</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <Link
            to="/flashcards"
            className="card border-0 rounded-4 p-3 h-100 bg-white text-decoration-none d-flex flex-row align-items-center gap-2 tap-effect"
          >
            <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', backgroundColor: '#f3e8ff', fontSize: '1.1rem', flexShrink: 0 }}>
              🗂️
            </div>
            <div>
              <div className="fw-bold text-primary" style={{ fontSize: '0.9rem' }}>Flashcards</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>Lật thẻ nhanh</div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-md-3">
          <Link
            to="/test"
            className="card border-0 rounded-4 p-3 h-100 bg-white text-decoration-none d-flex flex-row align-items-center gap-2 tap-effect"
          >
            <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', backgroundColor: '#dbeafe', fontSize: '1.1rem', flexShrink: 0 }}>
              ⚡
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>Kiểm tra</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>Luyện phản xạ</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;