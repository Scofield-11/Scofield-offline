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
        style={{ maxWidth: '410px' }}
      >
        <div className="dashboard-hero-card p-4 text-center rounded-0 border-0">
          <div
            className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-4 overflow-hidden shadow"
            style={{ width: '60px', height: '60px', border: '2px solid rgba(255,255,255,0.3)' }}
          >
            <img
              src="/sea_15651557.ico"
              alt="Scofile"
              className="w-100 h-100"
              style={{ objectFit: 'cover' }}
            />
          </div>
          <h4 className="fw-bold text-white mb-0" style={{ letterSpacing: '0.5px' }}>
            Scofile
          </h4>
        </div>

        <div className="card-body p-4 bg-white">
          {/* Thanh chuyển đổi Đăng nhập / Đăng ký dạng Pill nổi */}
          <div
            className="d-grid p-1 mb-4 rounded-4 position-relative bg-light border"
            style={{ gridTemplateColumns: '1fr 1fr', gap: '4px' }}
          >
            <button
              type="button"
              onClick={() => setMode('login')}
              className="btn border-0 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 position-relative"
              style={{
                zIndex: 1,
                fontSize: '0.9rem',
                color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'color 0.2s ease',
              }}
            >
              {mode === 'login' && (
                <motion.div
                  layoutId="authTabPill"
                  className="position-absolute inset-0 rounded-3"
                  style={{
                    inset: 0,
                    background: 'var(--brand-gradient)',
                    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.28)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                />
              )}
              <LogIn size={16} />
              <span>Đăng nhập</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('register')}
              className="btn border-0 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 position-relative"
              style={{
                zIndex: 1,
                fontSize: '0.9rem',
                color: mode === 'register' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'color 0.2s ease',
              }}
            >
              {mode === 'register' && (
                <motion.div
                  layoutId="authTabPill"
                  className="position-absolute inset-0 rounded-3"
                  style={{
                    inset: 0,
                    background: 'var(--brand-gradient)',
                    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.28)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                />
              )}
              <UserPlus size={16} />
              <span>Đăng ký</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-muted mb-1">
                TÊN ĐĂNG NHẬP
              </label>
              <div className="input-group rounded-3 overflow-hidden border">
                <span className="input-group-text bg-light border-0 text-muted">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-0 fw-semibold py-2 shadow-none"
                  placeholder="Nhập tên đăng nhập..."
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
                <div className="input-group rounded-3 overflow-hidden border">
                  <span className="input-group-text bg-light border-0 text-muted">
                    <Smile size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-0 fw-semibold py-2 shadow-none"
                    placeholder="Nhập tên hiển thị..."
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
              <div className="input-group rounded-3 overflow-hidden border">
                <span className="input-group-text bg-light border-0 text-muted">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  className="form-control bg-light border-0 fw-semibold py-2 shadow-none"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted mb-1">
                  XÁC NHẬN MẬT KHẨU
                </label>
                <div className="input-group rounded-3 overflow-hidden border">
                  <span className="input-group-text bg-light border-0 text-muted">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    className="form-control bg-light border-0 fw-semibold py-2 shadow-none"
                    placeholder="Nhập lại mật khẩu..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="btn w-100 mt-2 py-2 fw-bold text-white rounded-3 d-flex align-items-center justify-content-center gap-2 border-0"
              style={{
                minHeight: '48px',
                fontSize: '1rem',
                background: 'var(--brand-gradient)',
                boxShadow: '0 6px 18px -4px rgba(109, 40, 217, 0.45)',
              }}
              disabled={submitting}
            >
              {submitting ? (
                <span>Đang xử lý...</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn size={18} />
                  <span>Đăng nhập</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Đăng ký</span>
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default AuthPage;