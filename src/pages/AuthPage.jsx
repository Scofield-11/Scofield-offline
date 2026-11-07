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
  Layers,
  Zap,
  Cloud,
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

      {/* Khung trung tâm Split-Screen Auth Studio */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="auth-studio-card"
      >
        {/* CỘT TRÁI: Brand & Feature Showcase */}
        <div className="auth-showcase-panel">
          {/* Họa tiết hậu cảnh nghệ thuật chìm */}
          <div className="auth-showcase-decor" aria-hidden="true">
            <span className="auth-decor-kanji auth-decor-kanji-1">語</span>
            <span className="auth-decor-kanji auth-decor-kanji-2">学</span>
            <span className="auth-decor-kanji auth-decor-kanji-3">憶</span>
            <svg
              className="auth-decor-svg"
              width="300"
              height="300"
              viewBox="0 0 300 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="260" cy="40" r="120" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="6 8" opacity="0.10" />
              <circle cx="260" cy="40" r="200" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="8 10" opacity="0.06" />
              <circle cx="260" cy="40" r="270" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.04" />
            </svg>
          </div>

          <div className="auth-showcase-content position-relative" style={{ zIndex: 1 }}>
            {/* Logo Thương hiệu */}
            <div className="d-flex align-items-center gap-2.5 mb-4">
              <div className="auth-logo-box">
                <img
                  src="/sea_15651557.ico"
                  alt="Scofield Logo"
                  className="w-100 h-100"
                  style={{ objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="auth-brand-name mb-0">Scofield</h3>
                <span className="auth-brand-badge">STUDIO</span>
              </div>
            </div>

            {/* Tiêu đề & Giới thiệu */}
            <h1 className="auth-showcase-title text-white mb-2">
              Nền tảng Học Từ Vựng & Hán Tự Thế Hệ Mới
            </h1>
            <p className="auth-showcase-subtitle text-white-50 mb-4">
              Tối ưu hóa khả năng ghi nhớ dài hạn với phương pháp Spaced Repetition (SRS) và luyện phản xạ tốc độ cao.
            </p>

            {/* 3 Thẻ tính năng kính mờ (Frosted Glass Feature Cards) */}
            <div className="d-flex flex-column gap-2.5 auth-features-list">
              <div className="auth-feature-pill">
                <div className="auth-feature-icon auth-feature-amber">
                  <Layers size={18} strokeWidth={2.4} />
                </div>
                <div className="auth-feature-text">
                  <div className="auth-feature-label">Flashcards 3D & SRS</div>
                  <div className="auth-feature-desc">Ghi nhớ chủ động từ vựng Nhật - Trung - Anh</div>
                </div>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon auth-feature-sky">
                  <Zap size={18} strokeWidth={2.4} />
                </div>
                <div className="auth-feature-text">
                  <div className="auth-feature-label">Phòng Thi & Phản Xạ</div>
                  <div className="auth-feature-desc">Trắc nghiệm, tự luận và ghép thẻ tốc độ cao</div>
                </div>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon auth-feature-emerald">
                  <Cloud size={18} strokeWidth={2.4} />
                </div>
                <div className="auth-feature-text">
                  <div className="auth-feature-label">Local-First & Cloud Sync</div>
                  <div className="auth-feature-desc">Học tập mượt mà Offline, tự động đồng bộ tức thì</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Biểu mẫu Tương tác */}
        <div className="auth-form-panel">
          {/* Header Form */}
          <div className="mb-4">
            <h2 className="auth-form-title mb-1">
              {mode === 'login' ? 'Chào mừng bạn!' : 'Tạo tài khoản mới'}
            </h2>
            <p className="auth-form-subtitle text-secondary mb-0">
              {mode === 'login'
                ? 'Đăng nhập để tiếp tục hành trình học tập hôm nay.'
                : 'Bắt đầu làm chủ kho từ vựng đa ngôn ngữ ngay bây giờ.'}
            </p>
          </div>

          {/* Segmented Tabs chuyển đổi Đăng nhập / Đăng ký */}
          <div className="auth-segmented-tabs mb-4">
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
            <div className="mb-3 auth-field-wrap">
              <label htmlFor="auth-username" className="auth-field-label">
                TÊN ĐĂNG NHẬP <span className="text-danger">*</span>
              </label>
              <div className="auth-input-group">
                <span className="auth-input-icon">
                  <User size={16} strokeWidth={2.2} />
                </span>
                <input
                  id="auth-username"
                  type="text"
                  className="auth-input-control"
                  placeholder="Nhập tên đăng nhập của bạn..."
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
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="mb-3 auth-field-wrap">
                    <label htmlFor="auth-display-name" className="auth-field-label">
                      TÊN HIỂN THỊ (TÙY CHỌN)
                    </label>
                    <div className="auth-input-group">
                      <span className="auth-input-icon">
                        <Sparkles size={16} strokeWidth={2.2} />
                      </span>
                      <input
                        id="auth-display-name"
                        type="text"
                        className="auth-input-control"
                        placeholder="Tên bạn muốn hiển thị trên Dashboard..."
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
            <div className="mb-3 auth-field-wrap">
              <label htmlFor="auth-password" className="auth-field-label">
                MẬT KHẨU <span className="text-danger">*</span>
              </label>
              <div className="auth-input-group">
                <span className="auth-input-icon">
                  <Lock size={16} strokeWidth={2.2} />
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input-control"
                  placeholder="Nhập mật khẩu..."
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="mb-3 auth-field-wrap">
                    <label htmlFor="auth-confirm-password" className="auth-field-label">
                      XÁC NHẬN MẬT KHẨU <span className="text-danger">*</span>
                    </label>
                    <div className="auth-input-group">
                      <span className="auth-input-icon">
                        <ShieldCheck size={16} strokeWidth={2.2} />
                      </span>
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="auth-input-control"
                        placeholder="Nhập lại mật khẩu để xác nhận..."
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
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <div className="d-flex align-items-center gap-2">
                  <Sparkles size={18} className="spin-anim" />
                  <span>Đang xử lý thông tin...</span>
                </div>
              ) : mode === 'login' ? (
                <>
                  <span>Đăng nhập ngay</span>
                  <ArrowRight size={18} strokeWidth={2.4} />
                </>
              ) : (
                <>
                  <span>Tạo tài khoản & Bắt đầu</span>
                  <ArrowRight size={18} strokeWidth={2.4} />
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
