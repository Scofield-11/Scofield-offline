import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, ChevronRight, User, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getCurrentUser, getSyncStatus } from '../api/axiosConfig';

function Breadcrumbs() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [syncInfo, setSyncInfo] = useState(() => getSyncStatus());

  useEffect(() => {
    const handleStatus = (e) => setSyncInfo(e.detail);
    const handleAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('scofield-sync-status', handleStatus);
    window.addEventListener('scofield-auth-changed', handleAuth);
    return () => {
      window.removeEventListener('scofield-sync-status', handleStatus);
      window.removeEventListener('scofield-auth-changed', handleAuth);
    };
  }, []);

  const routeConfig = {
    '/': { name: 'Thư viện bài học', desc: 'Trung tâm dữ liệu từ vựng & tiến độ học tập' },
    '/kanji': { name: 'Từ điển Kanji', desc: 'Tra cứu & luyện tập Hán tự' },
    '/flashcards': { name: 'Ôn tập Flashcards', desc: 'Lật thẻ phản xạ trí nhớ chủ động' },
    '/learn': { name: 'Học thuộc Spaced Repetition', desc: 'Ghi nhớ ngắt quãng & sửa lỗi sai' },
    '/test': { name: 'Phòng thi năng lực', desc: 'Trắc nghiệm & tự luận tính giờ' },
    '/match': { name: 'Đấu trường Ghép thẻ', desc: 'Thử thách ghép cặp tốc độ cao' },
    '/admin': { name: 'Quản trị hệ thống', desc: 'Phân quyền & giám sát người dùng' },
  };

  const currentRoute = routeConfig[location.pathname];
  if (!currentRoute) return null;

  const getSyncBadge = () => {
    if (syncInfo.state === 'syncing') {
      return {
        color: '#f59e0b',
        text: 'Đang lưu...',
        icon: <RefreshCw size={12} className="spin-anim flex-shrink-0" />,
      };
    }
    if (syncInfo.state === 'synced') {
      return {
        color: '#10b981',
        text: 'Đã đồng bộ',
        icon: <CheckCircle2 size={12} className="flex-shrink-0" />,
      };
    }
    if (syncInfo.state === 'error') {
      return {
        color: '#ef4444',
        text: 'Lỗi Sync',
        icon: <Cloud size={12} className="flex-shrink-0" />,
      };
    }
    return {
      color: '#94a3b8',
      text: 'Cloud Sync',
      icon: <Cloud size={12} className="flex-shrink-0" />,
    };
  };

  const syncBadge = getSyncBadge();
  const userName = currentUser?.display_name || currentUser?.username || 'Học viên';

  return (
    <nav className="workspace-topbar d-none d-lg-flex print-d-none" aria-label="Workspace Breadcrumb">
      {/* Bên trái: Điều hướng Workspace & Phụ đề trang */}
      <div className="workspace-topbar-left">
        <Link to="/" className="workspace-crumb-home" title="Về trang chủ">
          <Home size={15} strokeWidth={2.2} />
          <span>Trang chủ</span>
        </Link>

        {location.pathname !== '/' && (
          <>
            <ChevronRight size={13} strokeWidth={2.4} className="workspace-crumb-sep" />
            <div className="workspace-crumb-current-box">
              <span className="workspace-crumb-title">{currentRoute.name}</span>
              <span className="workspace-crumb-desc d-none d-xl-inline">{currentRoute.desc}</span>
            </div>
          </>
        )}
        {location.pathname === '/' && (
          <>
            <ChevronRight size={13} strokeWidth={2.4} className="workspace-crumb-sep" />
            <span className="workspace-crumb-desc">{currentRoute.desc}</span>
          </>
        )}
      </div>

      {/* Bên phải: Thông tin User & Trạng thái Cloud Sync */}
      <div className="workspace-topbar-right">
        <div className="workspace-topbar-pill workspace-user-pill" title={`Tài khoản: ${userName}`}>
          <div className="workspace-user-avatar">
            <User size={12} strokeWidth={2.4} />
          </div>
          <span className="workspace-user-name text-truncate">{userName}</span>
        </div>

        <div
          className="workspace-topbar-pill workspace-sync-pill"
          title={syncInfo.message || 'Trạng thái đồng bộ Cloud'}
        >
          <span className="workspace-sync-dot" style={{ backgroundColor: syncBadge.color }} />
          <span className="workspace-sync-text">{syncBadge.text}</span>
        </div>
      </div>
    </nav>
  );
}

export default Breadcrumbs;
