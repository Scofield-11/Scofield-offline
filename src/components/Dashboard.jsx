import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X, Flame, Sun, Moon, Volume2, LogOut, KeyRound, Shield } from 'lucide-react';
import api, {
  getSyncStatus,
  autoPullFromCloud,
  pushToSupabase,
  getCurrentUser,
  logoutUser,
} from '../api/axiosConfig';
import { VocabContext } from '../context/VocabContext';
import { toast } from 'react-toastify';
import { speakText } from '../utils/audio';

function Dashboard() {
  const { sets } = useContext(VocabContext);
  const currentUser = getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const [showPassModal, setShowPassModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const [todayTests, setTodayTests] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [last7DaysActive, setLast7DaysActive] = useState([false, false, false, false, false, false, false]);
  const [syncInfo, setSyncInfo] = useState(getSyncStatus());
  const [theme, setTheme] = useState(() => localStorage.getItem('scofield_theme') || 'light');

  useEffect(() => {
    const handleStatus = (e) => setSyncInfo(e.detail);
    const handleTheme = (e) => {
      if (e.detail) setTheme(e.detail);
    };
    window.addEventListener('scofield-sync-status', handleStatus);
    window.addEventListener('scofield-theme-change', handleTheme);
    return () => {
      window.removeEventListener('scofield-sync-status', handleStatus);
      window.removeEventListener('scofield-theme-change', handleTheme);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('scofield_theme', nextTheme);
    window.dispatchEvent(new CustomEvent('scofield-theme-change', { detail: nextTheme }));
  };

  const speakWord = (item) => {
    if (!item?.word) return;
    speakText(item.word, item.language || 'ja');
  };

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

        const dots = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          dots.push(activeDates.includes(dStr));
        }
        setLast7DaysActive(dots);

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return toast.warning('Vui lòng nhập đủ mật khẩu!');
    setChangingPass(true);
    try {
      await api.put('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      setShowPassModal(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi đổi mật khẩu!');
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn muốn đăng xuất khỏi tài khoản hiện tại?')) {
      logoutUser();
      toast.info('Đã đăng xuất!');
    }
  };

  return (
    <div
      className="container-fluid mt-1 mb-3 mx-auto px-2 px-md-3 position-relative"
      style={{ maxWidth: '1000px', zIndex: 1030 }}
    >
      {showPassModal && (
        <div
          className="set-sheet-backdrop"
          style={{ zIndex: 3000 }}
          onClick={() => setShowPassModal(false)}
        >
          <div
            className="card border-0 shadow-lg rounded-4 p-4 bg-white"
            style={{ width: '92%', maxWidth: '380px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <KeyRound size={17} className="text-primary" /> Đổi mật khẩu cá nhân
            </h6>
            <form onSubmit={handleChangePassword}>
              <input
                type="password"
                className="form-control mb-2 bg-light border-0 fw-semibold"
                placeholder="Mật khẩu hiện tại..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <input
                type="password"
                className="form-control mb-3 bg-light border-0 fw-semibold"
                placeholder="Mật khẩu mới (tối thiểu 4 ký tự)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-mobile-chip chip-slate"
                  onClick={() => setShowPassModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-mobile-chip btn-primary text-white"
                  disabled={changingPass}
                >
                  {changingPass ? 'Đang lưu...' : 'Lưu mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="position-relative mb-3" style={{ zIndex: 1040 }}>
        <div className="dashboard-hero-card p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center flex-wrap gap-2">
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill dashboard-hero-badge">
                <Sparkles size={14} />
                <span>{totalVocabCount} thẻ • {validSetsCount} bộ</span>
              </div>

              {currentUser && (
                <div className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill dashboard-hero-badge">
                  <span>👤 {currentUser.display_name || currentUser.username}</span>
                </div>
              )}
            </div>

            <div className="d-flex align-items-center flex-wrap gap-2">
              {currentUser?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="cloud-pill-btn text-decoration-none"
                  title="Quản trị người dùng & Reset mật khẩu"
                >
                  <Shield size={13} />
                  <span>Admin</span>
                </Link>
              )}

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
                    ? 'Đang lưu...'
                    : syncInfo.state === 'synced'
                    ? `Cloud ${syncInfo.lastSynced ? `(${syncInfo.lastSynced})` : ''}`
                    : 'Cloud Sync'}
                </span>
                <RefreshCw
                  size={13}
                  className={syncInfo.state === 'syncing' ? 'spin-anim' : ''}
                />
              </button>

              <button
                type="button"
                onClick={() => setShowPassModal(true)}
                className="cloud-pill-btn px-2"
                title="Đổi mật khẩu"
              >
                <KeyRound size={14} />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="cloud-pill-btn px-2"
                title="Đăng xuất"
              >
                <LogOut size={14} />
              </button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.9, rotate: 25 }}
                onClick={toggleTheme}
                className="cloud-pill-btn d-lg-none px-2"
                title={theme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}
                aria-label="Đổi giao diện Sáng/Tối"
              >
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24, mass: 0.6 }}
                  className="d-flex align-items-center"
                >
                  {theme === 'dark' ? <Sun size={15} color="#fde047" /> : <Moon size={15} />}
                </motion.span>
              </motion.button>
            </div>
          </div>

          <div ref={dropdownRef} className="position-relative">
            <div className="dashboard-search-box d-flex align-items-center px-3 py-1">
              <span className="pe-2 fs-5">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control border-0 py-2 fw-semibold text-dark shadow-none bg-transparent"
                placeholder="Tra cứu từ vựng, Hán tự, Hán Việt, ý nghĩa..."
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
                  <X size={16} />
                </button>
              ) : (
                <span className="d-none d-sm-inline-block search-kbd-hint">Ctrl K</span>
              )}
            </div>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="position-absolute w-100 bg-white rounded-4 mt-2 overflow-hidden text-start dashboard-search-dropdown"
                  style={{ zIndex: 2000, top: '100%', left: 0 }}
                >
                  <div
                    style={{ maxHeight: 'min(340px, 46vh)', overflowY: 'auto' }}
                    className="p-2"
                  >
                    {isSearching ? (
                      <div className="text-center p-4 text-muted small fw-bold">
                        ⏳ Đang tìm kiếm...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center p-4 text-muted small fw-bold">
                        📭 Không tìm thấy từ phù hợp
                      </div>
                    ) : (
                      searchResults.map((item, idx) => {
                        const parentSet = sets.find((s) => s.id === item.set_id);
                        const setTitle = parentSet ? parentSet.title : 'Khác';
                        return (
                          <div
                            key={idx}
                            className="p-2 px-3 rounded-3 mb-1 dashboard-search-item"
                            onClick={() => speakWord(item)}
                            title="Bấm để nghe phát âm"
                          >
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <div className="text-truncate d-flex align-items-center gap-2">
                                <span className="fw-bold text-dark fs-6">{item.word}</span>
                                {item.hanviet && (
                                  <span className="small fw-bold text-primary">
                                    [{item.hanviet}]
                                  </span>
                                )}
                                {item.hiragana && (
                                  <span className="small text-info fw-semibold">
                                    {item.hiragana}
                                  </span>
                                )}
                                <Volume2 size={14} className="text-muted flex-shrink-0" />
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="row g-2 align-items-stretch">
        <div className="col-6 col-lg-3">
          <div className="bento-stat-card h-100">
            <div className="bento-icon-wrap bento-purple">
              <Flame size={22} />
            </div>
            <div className="overflow-hidden flex-grow-1">
              <div className="bento-value">{currentStreak} ngày</div>
              <div className="bento-sub">{todayTests} bài hôm nay</div>
              <div className="streak-dots-row" title="7 ngày gần nhất">
                {last7DaysActive.map((active, i) => (
                  <span key={i} className={`streak-dot ${active ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <Link to="/flashcards" className="bento-stat-card bento-interactive h-100 text-decoration-none">
            <div className="bento-icon-wrap bento-indigo">🗂️</div>
            <div className="overflow-hidden">
              <div className="bento-value">Flashcards</div>
              <div className="bento-sub">Lật thẻ 3D →</div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-lg-3">
          <Link to="/learn" className="bento-stat-card bento-interactive h-100 text-decoration-none">
            <div className="bento-icon-wrap bento-emerald">🧠</div>
            <div className="overflow-hidden flex-grow-1">
              <div className="bento-value">Học thuộc</div>
              <div className="bento-sub">Ghi nhớ sâu →</div>
            </div>
          </Link>
        </div>

        <div className="col-6 col-lg-3">
          <Link to="/test" className="bento-stat-card bento-interactive h-100 text-decoration-none">
            <div className="bento-icon-wrap bento-amber">⚡</div>
            <div className="overflow-hidden">
              <div className="bento-value">Kiểm tra</div>
              <div className="bento-sub">Luyện phản xạ →</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;