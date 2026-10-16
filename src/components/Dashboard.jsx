import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import api, { getSyncStatus, autoPullFromCloud, pushToSupabase } from '../api/axiosConfig';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';

function Dashboard() {
  const { sets } = useContext(VocabContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [todayTests, setTodayTests] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [syncInfo, setSyncInfo] = useState(getSyncStatus());

  useEffect(() => {
    const handleStatus = (e) => setSyncInfo(e.detail);
    window.addEventListener('scofield-sync-status', handleStatus);
    return () => window.removeEventListener('scofield-sync-status', handleStatus);
  }, []);

  const totalVocabCount = React.useMemo(() => {
    return (sets || [])
      .filter((s) => !s.title?.startsWith('_Thư mục:'))
      .reduce((sum, s) => sum + (s.vocab_count || 0), 0);
  }, [sets]);

  const validSetsCount = React.useMemo(() => {
    return (sets || []).filter((s) => !s.title?.startsWith('_Thư mục:')).length;
  }, [sets]);

  useEffect(() => {
    api
      .get('/test-history?skip=0&limit=100')
      .then((res) => {
        const history = res.data || [];
        const activeDates = [
          ...new Set(
            history
              .map((item) => {
                const match = item.date?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
              })
              .filter(Boolean)
          ),
        ].sort((a, b) => new Date(b) - new Date(a));

        const today = new Date();
        const tzTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const tTests = history.filter((item) => {
          const match = item.date?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
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
          const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
          if (activeDates.includes(yestStr)) {
            checkDate = yest;
          }
        }

        while (true) {
          const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
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
        api
          .get(`/search?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => {
            setSearchResults(res.data || []);
            setShowDropdown(true);
          })
          .catch((err) => console.error(err))
          .finally(() => setIsSearching(false));
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 200);

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

  const handleQuickCloudSync = async () => {
    const pulled = await autoPullFromCloud(false);
    if (!pulled) {
      const pushed = await pushToSupabase();
      if (pushed) toast.success('☁️ Đã đồng bộ lên Supabase Cloud!');
    } else {
      toast.success('☁️ Đã cập nhật dữ liệu mới từ Cloud!');
    }
  };

  return (
    <div
      className="container-fluid mt-1 mb-3 mx-auto px-2 px-md-3 position-relative"
      style={{ maxWidth: '1000px', zIndex: 1030 }}
    >
      <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2">
        {/* THANH TÌM KIẾM TỐI GIẢN */}
        <div className="position-relative flex-grow-1" ref={dropdownRef}>
          <div className="dashboard-search-box d-flex align-items-center px-3 py-1">
            <span className="pe-2">🔍</span>
            <input
              type="text"
              className="form-control form-control-sm border-0 py-2 fw-semibold text-dark shadow-none bg-transparent"
              placeholder="Tìm từ vựng, Hán tự, Hán Việt, nghĩa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0 || searchQuery.trim()) setShowDropdown(true);
              }}
            />
            {searchQuery && (
              <button
                className="btn btn-sm text-muted border-0 py-0 px-2"
                onClick={() => {
                  setSearchQuery('');
                  setShowDropdown(false);
                }}
              >
                ✕
              </button>
            )}
          </div>

          {showDropdown && (
            <div
              className="position-absolute w-100 bg-white rounded-4 mt-2 overflow-hidden text-start dashboard-search-dropdown"
              style={{ zIndex: 2000, top: '100%', left: 0 }}
            >
              <div style={{ maxHeight: 'min(320px, 45vh)', overflowY: 'auto' }} className="p-2">
                {isSearching ? (
                  <div className="text-center p-3 text-muted small fw-semibold">⏳ Đang tìm...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center p-3 text-muted small fw-semibold">📭 Không có kết quả</div>
                ) : (
                  searchResults.map((item, idx) => {
                    const parentSet = sets.find((s) => s.id === item.set_id);
                    const setTitle = parentSet ? parentSet.title : 'Khác';
                    return (
                      <div key={idx} className="p-2 px-3 rounded-3 mb-1 dashboard-search-item">
                        <div className="d-flex justify-content-between align-items-center gap-2">
                          <div className="text-truncate">
                            <span className="fw-bold text-dark">{item.word}</span>
                            {item.hanviet && (
                              <span className="ms-2 small fw-bold text-primary">[{item.hanviet}]</span>
                            )}
                            {item.hiragana && (
                              <span className="ms-2 small text-info fw-semibold">{item.hiragana}</span>
                            )}
                          </div>
                          <span className="badge chip-primary rounded-pill flex-shrink-0" style={{ fontSize: '0.68rem' }}>
                            {setTitle}
                          </span>
                        </div>
                        <div className="text-secondary small">{item.meaning}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* NHÓM CHỈ SỐ GỌN NHẸ */}
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-between justify-content-md-end">
          <div className="d-flex align-items-center gap-2">
            <span className="stat-mini-pill" title={`${todayTests} bài test hôm nay`}>
              🔥 <strong>{currentStreak}</strong> ngày
            </span>
            <span className="stat-mini-pill">
              📚 <strong>{totalVocabCount}</strong> thẻ ({validSetsCount} bộ)
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickCloudSync}
            className="stat-mini-pill border-0"
            style={{ cursor: 'pointer' }}
            title="Đồng bộ Supabase Cloud"
          >
            <span
              className={`sync-status-dot ${syncInfo.state === 'syncing' ? 'pulse' : ''}`}
              style={{
                backgroundColor:
                  syncInfo.state === 'syncing'
                    ? '#fbbf24'
                    : syncInfo.state === 'synced'
                    ? '#10b981'
                    : syncInfo.state === 'error'
                    ? '#ef4444'
                    : '#94a3b8',
              }}
            />
            <span>{syncInfo.state === 'syncing' ? 'Đang lưu...' : 'Cloud'}</span>
            <span>🔄</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;