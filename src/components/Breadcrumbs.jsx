import React from 'react';
import { useLocation, Link } from 'react-router-dom';

function Breadcrumbs() {
  const location = useLocation();
  
  // Ánh xạ đường dẫn sang tên trang
  const routeNames = {
    '/': 'Quản lý Thư viện',
    '/flashcards': 'Ôn tập Flashcards',
    '/learn': 'Chế độ Học (SRS)',
    '/test': 'Kiểm tra năng lực',
    '/match': 'Trò chơi Ghép thẻ'
  };

  const currentTitle = routeNames[location.pathname];
  
  // Ẩn breadcrumb nếu ở trang 404
  if (!currentTitle) return null; 

  return (
    <nav aria-label="breadcrumb" className="mb-4 d-none d-lg-block fade-in-slide print-d-none">
      <ol className="breadcrumb bg-white px-4 py-3 rounded-4 shadow-sm mb-0">
        <li className="breadcrumb-item">
          <Link to="/" className="text-decoration-none fw-bold text-muted">
            🏠 Trang chủ
          </Link>
        </li>
        {location.pathname !== '/' && (
          <li className="breadcrumb-item active fw-bold text-primary" aria-current="page">
            {currentTitle}
          </li>
        )}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;