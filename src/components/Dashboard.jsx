import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  X,
  Flame,
  Sun,
  Moon,
  Volume2,
  LogOut,
  KeyRound,
  Shield,
  Search,
  ArrowUpRight,
  Layers,
  Brain,
  Zap,
  User,
} from 'lucide-react';
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

  const totalVocabCount = useMemo(() => {
    return (sets || [])
      .filter((s) => !s.title?.startsWith('_Thư mục:'))
      .reduce((sum, s) => sum + (s.vocab_count || 0), 0);
  }, [sets]);

  const validSetsCount = useMemo(() => {
    return (sets || []).filter((s) => !s.title?.startsWith('_Thư mục:')).length;
  }, [sets]);

  const displayName = currentUser?.display_name || currentUser?.username || 'Học viên';

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
      style={{ maxWidth: '980px', zIndex: 1030 }}
    >
      {ReactDOM.createPortal(
        <AnimatePresence>
          {showPassModal && (
            <motion.div
              className="set-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setShowPassModal(false)}
            >
              <motion.div
                className="set-sheet-panel"
                style={{ maxWidth: '420px', height: 'auto', maxHeight: '85vh' }}
                initial={window.innerWidth < 768 ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 12 }}
                animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={window.innerWidth < 768 ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.7 }}
                drag={window.innerWidth < 768 ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90 || info.velocity.y > 500) {
                    setShowPassModal(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="set-sheet-grabber d-md-none" />

                <div className="set-sheet-header">
                  <div className="d-flex align-items-center gap-2">
                    <span className="btn-icon-soft chip-primary" style={{ width: '34px', height: '34px' }}>
                      <KeyRound size={16} />
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0 text-main">Đổi mật khẩu cá nhân</h6>
                      <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        Tài khoản: {currentUser?.username || 'Học viên'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-icon-soft chip-slate"
                    onClick={() => setShowPassModal(false)}
                    aria-label="Đóng"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="p-3 pt-2">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary mb-1">
                      MẬT KHẨU HIỆN TẠI
                    </label>
                    <input
                      type="password"
                      className="form-control bg-light border-0 fw-semibold py-2"
                      placeholder="Nhập mật khẩu hiện tại..."
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-secondary mb-1">
                      MẬT KHẨU MỚI
                    </label>
                    <input
                      type="password"
                      className="form-control bg-light border-0 fw-semibold py-2"
                      placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-light btn-touch w-50 fw-bold"
                      onClick={() => setShowPassModal(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-touch w-50 fw-bold text-white"
                      disabled={changingPass}
                    >
                      {changingPass ? 'Đang lưu...' : 'Lưu mật khẩu'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Hero Banner nghệ thuật đa tầng */}
      <div className="position-relative mb-3" style={{ zIndex: 1040 }}>
        <div className="dashboard-hero-card p-3 p-md-4">
          {/* Lớp trang trí hậu cảnh riêng (không cắt dropdown tìm kiếm) */}
          <div className="dashboard-hero-decor" aria-hidden="true">
            <span className="hero-decor-kanji hero-decor-kanji-1">語</span>
            <span className="hero-decor-kanji hero-decor-kanji-2">学</span>
            <svg
              className="hero-decor-pattern"
              width="240"
              height="240"
              viewBox="0 0 240 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="200" cy="40" r="80" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.12" />
              <circle cx="200" cy="40" r="130" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="6 8" opacity="0.08" />
              <circle cx="200" cy="40" r="180" stroke="#FFFFFF" strokeWidth="1" opacity="0.05" />
            </svg>
          </div>

          {/* Hàng 1: Dòng chào mừng + Cụm công cụ quản lý */}
          <div className="dashboard-hero-header position-relative d-flex justify-content-between align-items-center mb-2">
            <h2 className="dashboard-greeting-title text-white mb-0 text-truncate">
              Chào, {displayName}
            </h2>

            {/* Cụm nút công cụ Frosted Glass Pills (Cố định 1 hàng không rơi rớt) */}
            <div className="dashboard-hero-actions d-flex align-items-center flex-nowrap">
              {currentUser?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="cloud-pill-btn text-decoration-none"
                  title="Quản trị người dùng & Reset mật khẩu"
                >
                  <Shield size={14} strokeWidth={2.4} />
                  <span className="d-none d-md-inline">Admin</span>
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
                <span className="d-none d-md-inline">
                  {syncInfo.state === 'syncing'
                    ? 'Đang lưu...'
                    : syncInfo.state === 'synced'
                    ? `Cloud ${syncInfo.lastSynced ? `(${syncInfo.lastSynced})` : ''}`
                    : 'Cloud Sync'}
                </span>
                <RefreshCw
                  size={13}
                  strokeWidth={2.2}
                  className={syncInfo.state === 'syncing' ? 'spin-anim' : ''}
                />
              </button>

              <button
                type="button"
                onClick={() => setShowPassModal(true)}
                className="cloud-pill-btn btn-action-square"
                title="Đổi mật khẩu"
                aria-label="Đổi mật khẩu"
              >
                <KeyRound size={14} strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="cloud-pill-btn btn-action-square"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut size={14} strokeWidth={2.2} />
              </button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.9, rotate: 25 }}
                onClick={toggleTheme}
                className="cloud-pill-btn btn-action-square d-lg-none"
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

          {/* Hàng 2: Huy hiệu thống kê (Badge Row - Nằm ngay dưới Hàng 1, trên thanh Search) */}
          <div className="dashboard-hero-badges-row d-flex align-items-center flex-wrap gap-2 mb-3">
            <div className="dashboard-hero-badge">
              <Sparkles size={12} strokeWidth={2.4} />
              <span>⚡ {totalVocabCount} từ • {validSetsCount} bộ</span>
            </div>
            <div className="dashboard-hero-badge">
              <Flame size={12} strokeWidth={2.4} color="#FBBF24" />
              <span>🔥 {currentStreak} ngày</span>
            </div>
          </div>

          {/* Thanh Tìm Kiếm Spotlight */}
          <div ref={dropdownRef} className="position-relative">
            <div className="dashboard-search-box d-flex align-items-center px-3 py-1">
              <div className="d-flex align-items-center text-primary pe-2">
                <Search size={18} strokeWidth={2.4} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control border-0 py-2 fw-semibold dashboard-search-input shadow-none bg-transparent"
                placeholder="Tìm từ vựng, Kanji, ý nghĩa..."
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
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={16} strokeWidth={2.2} />
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
                      <div className="text-center p-4 text-muted small fw-bold d-flex align-items-center justify-content-center gap-2">
                        <RefreshCw size={14} className="spin-anim" />
                        <span>Đang tìm kiếm...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center p-4 text-muted small fw-bold d-flex align-items-center justify-content-center gap-2">
                        <Search size={14} />
                        <span>Không tìm thấy từ phù hợp</span>
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
                                <span className="fw-bold text-main fs-6">{item.word}</span>
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

      {/* 4 Thẻ Bento Stat Cards nâng cấp với Watermark chìm và Top Accent Lines */}
      <div className="row g-2 align-items-stretch">
        {/* Thẻ 1: Chuỗi Streak */}
        <div className="col-6 col-lg-3">
          <div className="bento-stat-card bento-accent-amber h-100">
            <span className="bento-watermark" aria-hidden="true">火</span>
            <div className="bento-icon-wrap bento-amber position-relative" style={{ zIndex: 1 }}>
              <Flame size={22} strokeWidth={2.4} />
            </div>
            <div className="bento-stat-content overflow-hidden flex-grow-1 position-relative" style={{ zIndex: 1 }}>
              <div className="bento-value">{currentStreak} ngày</div>
              <div className="bento-sub">{todayTests} bài hoàn thành</div>
              <div className="streak-dots-row" title="7 ngày gần nhất">
                {last7DaysActive.map((active, i) => (
                  <span key={i} className={`streak-dot ${active ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Thẻ 2: Flashcards */}
        <div className="col-6 col-lg-3">
          <Link
            to="/flashcards"
            className="bento-stat-card bento-accent-purple bento-interactive h-100 text-decoration-none"
          >
            <span className="bento-watermark" aria-hidden="true">憶</span>
            <div className="bento-icon-wrap bento-purple position-relative" style={{ zIndex: 1 }}>
              <Layers size={22} strokeWidth={2.2} />
            </div>
            <div className="bento-stat-content overflow-hidden flex-grow-1 position-relative" style={{ zIndex: 1 }}>
              <div className="bento-value">Flashcards</div>
              <div className="bento-sub">Lật thẻ</div>
            </div>
            <ArrowUpRight size={16} strokeWidth={2.4} className="bento-arrow position-relative" style={{ zIndex: 1 }} />
          </Link>
        </div>

        {/* Thẻ 3: Học thuộc */}
        <div className="col-6 col-lg-3">
          <Link
            to="/learn"
            className="bento-stat-card bento-accent-emerald bento-interactive h-100 text-decoration-none"
          >
            <span className="bento-watermark" aria-hidden="true">習</span>
            <div className="bento-icon-wrap bento-emerald position-relative" style={{ zIndex: 1 }}>
              <Brain size={22} strokeWidth={2.2} />
            </div>
            <div className="bento-stat-content overflow-hidden flex-grow-1 position-relative" style={{ zIndex: 1 }}>
              <div className="bento-value">Học thuộc</div>
              <div className="bento-sub">Ghi nhớ sâu</div>
            </div>
            <ArrowUpRight size={16} strokeWidth={2.4} className="bento-arrow position-relative" style={{ zIndex: 1 }} />
          </Link>
        </div>

        {/* Thẻ 4: Kiểm tra */}
        <div className="col-6 col-lg-3">
          <Link
            to="/test"
            className="bento-stat-card bento-accent-sky bento-interactive h-100 text-decoration-none"
          >
            <span className="bento-watermark" aria-hidden="true">試</span>
            <div className="bento-icon-wrap bento-sky position-relative" style={{ zIndex: 1 }}>
              <Zap size={22} strokeWidth={2.2} />
            </div>
            <div className="bento-stat-content overflow-hidden flex-grow-1 position-relative" style={{ zIndex: 1 }}>
              <div className="bento-value">Kiểm tra</div>
              <div className="bento-sub">Luyện thi</div>
            </div>
            <ArrowUpRight size={16} strokeWidth={2.4} className="bento-arrow position-relative" style={{ zIndex: 1 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
