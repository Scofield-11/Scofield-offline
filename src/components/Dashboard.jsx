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
      className="container-fluid mt-2 mb-4 mx-auto px-2 px-md-4 position-relative"
      style={{ maxWidth: '1080px', zIndex: 1030 }}
    >
      {/* TẦNG 1: AURORA COMMAND HERO */}
      <div className="position-relative mb-3" style={{ zIndex: 1040 }}>
        <div className="dashboard-hero-card p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill dashboard-hero-badge">
              <span>✨</span>
              <span>Scofield Smart Workspace</span>
            </div>

            <button
              type="button"
              onClick={handleQuickCloudSync}
              className="cloud-pill-btn"
              title="Bấm để đồng bộ ngay với Supabase"
            >
              <span
                className={`sync-status-dot ${syncInfo.state === 'syncing' ? 'pulse' : ''}`}
                style={{
                  backgroundColor:
                    syncInfo.state === 'syncing'
                      ? '#fbbf24'
                      : syncInfo.state === 'synced'
                      ? '#34d399'
                      : syncInfo.state === 'error'
                      ? '#f87171'
                      : '#cbd5e1',
                }}
              />
              <span>
                {syncInfo.state === 'syncing'
                  ? 'Đang đồng bộ...'
                  : syncInfo.state === 'synced'
                  ? `Cloud Synced ${syncInfo.lastSynced ? `(${syncInfo.lastSynced})` : ''}`
                  : 'Đồng bộ Cloud'}
              </span>
              <span>🔄</span>
            </button>
          </div>

          <div className="row align-items-center g-3">
            <div className="col-12 col-lg-5">
              <h3 className="fw-black mb-1 text-white hero-main-heading">
                Chinh phục ngoại ngữ mỗi ngày 🚀
              </h3>
              <p className="mb-0 text-white-50 small">
                Đã lưu trữ <strong className="text-white">{totalVocabCount}</strong> thẻ từ vựng trong{' '}
                <strong className="text-white">{validSetsCount}</strong> học phần.
              </p>
            </div>

            <div className="col-12 col-lg-7" ref={dropdownRef}>
              <div className="position-relative">
                <div className="dashboard-search-box d-flex align-items-center px-3 py-1">
                  <span className="pe-2 fs-5">🔍</span>
                  <input
                    type="text"
                    className="form-control border-0 py-2 fw-semibold text-dark shadow-none bg-transparent"
                    placeholder="Tra cứu nhanh từ vựng, Hán tự, Hán Việt, ý nghĩa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0 || searchQuery.trim()) setShowDropdown(true);
                    }}
                  />
                  {searchQuery ? (
                    <button
                      className="btn btn-sm text-muted border-0 py-1 px-2"
                      onClick={() => {
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                    >
                      ✕
                    </button>
                  ) : (
                    <span className="d-none d-sm-inline-block search-kbd-hint">Tra từ</span>
                  )}
                </div>

                {showDropdown && (
                  <div
                    className="position-absolute w-100 bg-white rounded-4 mt-2 overflow-hidden text-start dashboard-search-dropdown"
                    style={{ zIndex: 2000, top: '100%', left: 0 }}
                  >
                    <div
                      style={{ maxHeight: 'min(340px, 46vh)', overflowY: 'auto' }}
                      className="p-2"
                    >
                      {isSearching ? (
                        <div className="text-center p-4 text-muted small fw-bold">
                          ⏳ Đang tìm kiếm trong thư viện...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center p-4 text-muted small fw-bold">
                          📭 Không tìm thấy từ vựng phù hợp
                        </div>
                      ) : (
                        searchResults.map((item, idx) => {
                          const parentSet = sets.find((s) => s.id === item.set_id);
                          const setTitle = parentSet ? parentSet.title : 'Chưa phân loại';
                          return (
                            <div key={idx} className="p-2 px-3 rounded-3 mb-1 dashboard-search-item">
                              <div className="d-flex justify-content-between align-items-center gap-2">
                                <div className="text-truncate">
                                  <span className="fw-bold text-dark fs-6">{item.word}</span>
                                  {item.hanviet && (
                                    <span className="ms-2 small fw-bold text-primary">
                                      [{item.hanviet}]
                                    </span>
                                  )}
                                  {item.hiragana && (
                                    <span className="ms-2 small text-info fw-semibold">
                                      {item.hiragana}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="badge chip-primary rounded-pill flex-shrink-0"
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {setTitle}
                                </span>
                              </div>
                              <div className="text-secondary small mt-1">{item.meaning}</div>
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
      </div>

      {/* TẦNG 2: BENTO PRO GRID 4 Ô */}
      <div className="row g-2 g-md-3 align-items-stretch">
        <div className="col-6 col-lg-3">
          <div className="bento-stat-card h-100">
            <div className="bento-icon-wrap bento-purple">🔥</div>
            <div className="overflow-hidden">
              <div className="bento-label">CHUỖI HỌC TẬP</div>
              <div className="bento-value">{currentStreak} ngày</div>
              <div className="bento-sub">{todayTests} bài test hôm nay</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <Link to="/flashcards" className="bento-stat-card bento-interactive h-100 text-decoration-none">
            <div className="bento-icon-wrap bento-indigo">🗂️</div>
            <div className="overflow-hidden">
              <div className="bento-label">LẬT THẺ 3D</div>
              <div className="bento-value">Flashcards</div>
              <div className="bento-sub">Phát âm & Sổ tay →</div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-lg-3">
          <Link to="/learn" className="bento-stat-card bento-interactive h-100 text-decoration-none">
            <div className="bento-icon-wrap bento-emerald">🧠</div>
            <div className="overflow-hidden">
              <div className="bento-label">GHI NHỚ SÂU</div>
              <div className="bento-value">Học SRS</div>
              <div className="bento-sub">Trắc nghiệm + Gõ từ →</div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-lg-3">
          <Link to="/test" className="bento-stat-card bento-interactive h-100 text-decoration-none">
            <div className="bento-icon-wrap bento-amber">⚡</div>
            <div className="overflow-hidden">
              <div className="bento-label">LUYỆN PHẢN XẠ</div>
              <div className="bento-value">Kiểm tra</div>
              <div className="bento-sub">Chấm điểm tự động →</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;