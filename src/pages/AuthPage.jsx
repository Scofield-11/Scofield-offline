import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn,
  UserPlus,
  Lock,
  User,
  Sun,
  Moon,
  Sparkles,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    <div className="auth-studio-page">
      {/* Nút đổi theme góc trên bên phải */}
      <motion.button
        whileTap={{ scale: 0.9, rotate: 20 }}
        type="button"
        onClick={toggleTheme}
        className="auth-theme-floating-btn"
        title={theme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}
        aria-label="Đổi giao diện Sáng/Tối"
      >
        {theme === 'dark' ? <Sun size={18} color="#FDE047" /> : <Moon size={18} />}
      </motion.button>

      {/* Card Auth tối giản, cao cấp phong cách Linear / Raycast */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="auth-studio-card auth-minimal-card"
      >
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="auth-logo-box mx-auto mb-2.5">
            <img
              src="/sea_15651557.ico"
              alt="Scofield Logo"
              className="w-100 h-100"
              style={{ objectFit: 'cover', display: 'block' }}
            />
          </div>
          <h2 className="auth-brand-name mb-0">Scofield</h2>
        </div>

        {/* Segmented Tabs chuyển đổi Đăng nhập / Đăng ký */}
        <div className="auth-segmented-tabs mb-3.5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`auth-seg-btn ${mode === 'login' ? 'active' : ''}`}
          >
            {mode === 'login' && (
              <motion.div
                layoutId="authTabPill"
                className="auth-seg-pill"
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              />
            )}
            <LogIn size={15} strokeWidth={2.2} />
            <span>Đăng nhập</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('register')}
            className={`auth-seg-btn ${mode === 'register' ? 'active' : ''}`}
          >
            {mode === 'register' && (
              <motion.div
                layoutId="authTabPill"
                className="auth-seg-pill"
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              />
            )}
            <UserPlus size={15} strokeWidth={2.2} />
            <span>Đăng ký</span>
          </button>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Tên đăng nhập */}
          <div className="mb-2.5 auth-field-wrap">
            <div className="auth-input-group">
              <span className="auth-input-icon">
                <User size={16} strokeWidth={2.2} />
              </span>
              <input
                id="auth-username"
                type="text"
                className="auth-input-control"
                placeholder="Tên đăng nhập"
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

          {/* Tên hiển thị (chỉ khi đăng ký) */}
          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="mb-2.5 auth-field-wrap">
                  <div className="auth-input-group">
                    <span className="auth-input-icon">
                      <Sparkles size={16} strokeWidth={2.2} />
                    </span>
                    <input
                      id="auth-display-name"
                      type="text"
                      className="auth-input-control"
                      placeholder="Tên hiển thị (tùy chọn)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="nickname"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mật khẩu */}
          <div className="mb-2.5 auth-field-wrap">
            <div className="auth-input-group">
              <span className="auth-input-icon">
                <Lock size={16} strokeWidth={2.2} />
              </span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input-control"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu (chỉ khi đăng ký) */}
          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="mb-2.5 auth-field-wrap">
                  <div className="auth-input-group">
                    <span className="auth-input-icon">
                      <ShieldCheck size={16} strokeWidth={2.2} />
                    </span>
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="auth-input-control"
                      placeholder="Xác nhận mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nút Submit chính */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="auth-submit-btn mt-3"
            disabled={submitting}
          >
            {submitting ? (
              <div className="d-flex align-items-center justify-content-center gap-2">
                <Sparkles size={16} className="spin-anim" />
                <span>Đang xử lý...</span>
              </div>
            ) : mode === 'login' ? (
              <>
                <span>Đăng nhập</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </>
            ) : (
              <>
                <span>Tạo tài khoản</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default AuthPage;
