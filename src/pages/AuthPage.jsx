import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Sparkles,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const usernameInputRef = useRef(null);
  const displayNameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const handleUsernameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Chặn tự động submit form khi nhấn Enter ở ô tài khoản
      if (!isLogin && displayNameInputRef.current) {
        displayNameInputRef.current.focus();
      } else {
        passwordInputRef.current?.focus();
      }
    }
  };

  const handleDisplayNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Chặn submit và nhảy xuống ô mật khẩu
      passwordInputRef.current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      usernameInputRef.current?.focus();
      return toast.warning('Vui lòng nhập tên đăng nhập!');
    }
    if (!password) {
      passwordInputRef.current?.focus();
      return toast.warning('Vui lòng nhập mật khẩu!');
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { username: username.trim(), password }
        : {
            username: username.trim(),
            password,
            display_name: displayName.trim() || username.trim(),
          };

      const res = await api.post(endpoint, payload);
      toast.success(res.data?.message || (isLogin ? 'Đăng nhập thành công!' : 'Đăng ký thành công!'));
      if (onAuthSuccess) onAuthSuccess(res.data?.user);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (loginMode) => {
    setIsLogin(loginMode);
    setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 50);
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'var(--bg-body, var(--bg-elevated))' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="card border-0 rounded-4 shadow-lg overflow-hidden w-100"
        style={{
          maxWidth: '440px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--surface-border)',
        }}
      >
        {/* Header thương hiệu Scofield */}
        <div
          className="p-4 text-white position-relative overflow-hidden"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <div className="d-flex align-items-center gap-3 position-relative" style={{ zIndex: 2 }}>
            <div
              className="rounded-3 overflow-hidden shadow-sm flex-shrink-0"
              style={{
                width: '46px',
                height: '46px',
                border: '2px solid rgba(255,255,255,0.35)',
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <img
                src="/sea_15651557.ico"
                alt="Scofield Logo"
                className="w-100 h-100"
                style={{ objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0 text-white">Scofield</h4>
                <span
                  className="badge rounded-pill"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    fontSize: '0.68rem',
                    letterSpacing: '0.06em',
                  }}
                >
                  CLOUD PRO
                </span>
              </div>
              <p className="mb-0 small text-white opacity-85 mt-1">
                Không gian học từ vựng & Kanji thông minh
              </p>
            </div>
          </div>
        </div>

        <div className="card-body p-4 p-md-4">
          {/* Chuyển đổi Đăng nhập / Đăng ký */}
          <div
            className="d-grid p-1 rounded-3 mb-4"
            style={{
              gridTemplateColumns: '1fr 1fr',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--surface-border)',
              gap: '6px',
            }}
          >
            <button
              type="button"
              className={`btn py-2 fw-bold rounded-3 border-0 d-flex align-items-center justify-content-center gap-2 ${
                isLogin ? 'btn-primary text-white shadow-sm' : 'text-secondary bg-transparent'
              }`}
              onClick={() => switchMode(true)}
            >
              <LogIn size={16} strokeWidth={2.2} />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              className={`btn py-2 fw-bold rounded-3 border-0 d-flex align-items-center justify-content-center gap-2 ${
                !isLogin ? 'btn-primary text-white shadow-sm' : 'text-secondary bg-transparent'
              }`}
              onClick={() => switchMode(false)}
            >
              <UserPlus size={16} strokeWidth={2.2} />
              <span>Đăng ký</span>
            </button>
          </div>

          {/* Form với khoảng cách thoáng (gap: 20px) giữa các trường */}
          <form onSubmit={handleSubmit} className="d-flex flex-column" style={{ gap: '20px' }}>
            {/* Trường 1: Tên đăng nhập */}
            <div>
              <label
                className="form-label small fw-bold text-secondary mb-2 d-flex align-items-center gap-1.5"
                style={{ letterSpacing: '0.04em' }}
              >
                <User size={14} strokeWidth={2.4} className="text-primary" />
                <span>TÊN ĐĂNG NHẬP</span>
              </label>
              <input
                ref={usernameInputRef}
                type="text"
                className="form-control fw-semibold py-2.5 px-3"
                placeholder="Nhập tên tài khoản (VD: scofield)..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleUsernameKeyDown}
                enterKeyHint="next"
                autoComplete="username"
                autoFocus
                style={{
                  minHeight: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--surface-border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            {/* Trường 2 (Chỉ hiện khi Đăng ký): Tên hiển thị */}
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div>
                    <label
                      className="form-label small fw-bold text-secondary mb-2 d-flex align-items-center gap-1.5"
                      style={{ letterSpacing: '0.04em' }}
                    >
                      <BadgeCheck size={14} strokeWidth={2.4} className="text-primary" />
                      <span>TÊN HIỂN THỊ (TÙY CHỌN)</span>
                    </label>
                    <input
                      ref={displayNameInputRef}
                      type="text"
                      className="form-control fw-semibold py-2.5 px-3"
                      placeholder="Tên gọi hiển thị trên bảng điều khiển..."
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onKeyDown={handleDisplayNameKeyDown}
                      enterKeyHint="next"
                      autoComplete="name"
                      style={{
                        minHeight: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--surface-border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trường 3: Mật khẩu */}
            <div>
              <label
                className="form-label small fw-bold text-secondary mb-2 d-flex align-items-center gap-1.5"
                style={{ letterSpacing: '0.04em' }}
              >
                <Lock size={14} strokeWidth={2.4} className="text-primary" />
                <span>MẬT KHẨU</span>
              </label>
              <div className="position-relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  className="form-control fw-semibold py-2.5 ps-3 pe-5"
                  placeholder="Nhập mật khẩu của bạn..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  enterKeyHint="done"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  style={{
                    minHeight: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--surface-border)',
                    color: 'var(--text-main)',
                  }}
                />
                <button
                  type="button"
                  className="btn border-0 position-absolute top-50 end-0 translate-middle-y me-1 text-secondary d-flex align-items-center justify-content-center"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Nút hành động chính */}
            <div className="pt-2">
              <button
                type="submit"
                className="btn btn-primary btn-touch w-100 py-3 fw-bold text-white rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
                style={{ minHeight: '50px', fontSize: '1rem' }}
              >
                {loading ? (
                  <span>Đang xử lý...</span>
                ) : isLogin ? (
                  <>
                    <span>Đăng nhập vào hệ thống</span>
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </>
                ) : (
                  <>
                    <Sparkles size={18} strokeWidth={2.2} />
                    <span>Tạo tài khoản mới</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default AuthPage;