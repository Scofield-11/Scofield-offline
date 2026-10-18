import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Lock, User, Smile, Sun, Moon, Sparkles } from 'lucide-react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('scofield_theme') || 'light');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('scofield_theme', nextTheme);
    window.dispatchEvent(new CustomEvent('scofield-theme-change', { detail: nextTheme }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      return toast.warning('Vui lòng nhập đầy đủ thông tin!');
    }

    if (mode === 'register' && password !== confirmPassword) {
      return toast.error('Mật khẩu xác nhận không khớp!');
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', {
          username: username.trim(),
          password,
        });
        toast.success(`Chào mừng ${res.data.user.display_name || res.data.user.username}!`);
        if (onAuthSuccess) onAuthSuccess(res.data.user);
      } else {
        const res = await api.post('/auth/register', {
          username: username.trim(),
          password,
          display_name: displayName.trim() || username.trim(),
        });
        toast.success('Tạo tài khoản thành công!');
        if (onAuthSuccess) onAuthSuccess(res.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center p-3 position-relative"
      style={{ maxWidth: '100%' }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className="btn-icon-soft chip-slate position-fixed top-0 end-0 m-3"
        title="Đổi giao diện Sáng/Tối"
      >
        {theme === 'dark' ? <Sun size={18} color="#fde047" /> : <Moon size={18} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="card border-0 rounded-4 shadow-lg overflow-hidden w-100"
        style={{ maxWidth: '430px' }}
      >
        <div className="dashboard-hero-card p-4 text-center rounded-0 border-0">
          <div
            className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-4 overflow-hidden shadow"
            style={{ width: '58px', height: '58px', border: '2px solid rgba(255,255,255,0.25)' }}
          >
            <img
              src="/sea_15651557.ico"
              alt="Scofield"
              className="w-100 h-100"
              style={{ objectFit: 'cover' }}
            />
          </div>
          <h4 className="fw-bold text-white mb-1">Scofield Workspace</h4>
          <div className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill dashboard-hero-badge">
            <Sparkles size={13} />
            <span>Nhật • Trung • Anh • Từ điển Kanji</span>
          </div>
        </div>

        <div className="card-body p-4 bg-white">
          <div className="set-sheet-segmented mb-4" style={{ gridTemplateColumns: '1fr 1fr', margin: 0 }}>
            <button
              type="button"
              className={`set-seg-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              {mode === 'login' && (
                <motion.div layoutId="authTabPill" className="set-seg-pill" />
              )}
              <LogIn size={15} />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              className={`set-seg-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              {mode === 'register' && (
                <motion.div layoutId="authTabPill" className="set-seg-pill" />
              )}
              <UserPlus size={15} />
              <span>Đăng ký</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-muted mb-1">
                TÊN ĐĂNG NHẬP
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0 text-muted">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-0 fw-semibold py-2"
                  placeholder="Nhập username (VD: namnguyen)..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted mb-1">
                  TÊN HIỂN THỊ
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-0 text-muted">
                    <Smile size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-0 fw-semibold py-2"
                    placeholder="Tên gọi của bạn (VD: Nam Nguyễn)..."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label small fw-bold text-muted mb-1">
                MẬT KHẨU
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0 text-muted">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  className="form-control bg-light border-0 fw-semibold py-2"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="mb-4">
                <label className="form-label small fw-bold text-muted mb-1">
                  XÁC NHẬN MẬT KHẨU
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-0 text-muted">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    className="form-control bg-light border-0 fw-semibold py-2"
                    placeholder="Nhập lại mật khẩu..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-touch w-100 mt-2"
              disabled={submitting}
            >
              {submitting
                ? '⏳ Đang đồng bộ dữ liệu...'
                : mode === 'login'
                ? '🚀 Đăng nhập vào kho học tập'
                : '✨ Tạo tài khoản & Bắt đầu học'}
            </button>
          </form>

          <div className="text-center mt-3">
            <span className="text-muted small">
              ☁️ Dữ liệu học tập được đồng bộ riêng biệt theo từng tài khoản
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AuthPage;