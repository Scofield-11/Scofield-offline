import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getSyncStatus, autoPullFromCloud, pushToSupabase } from "../api/axiosConfig";
import { toast } from "react-toastify";

function Navbar() {
  const location = useLocation();
  const [syncInfo, setSyncInfo] = useState(getSyncStatus());

  useEffect(() => {
    const handleStatus = (e) => setSyncInfo(e.detail);
    window.addEventListener("scofield-sync-status", handleStatus);
    return () => window.removeEventListener("scofield-sync-status", handleStatus);
  }, []);

  const handleManualSync = async () => {
    const pulled = await autoPullFromCloud(false);
    if (!pulled) {
      const pushed = await pushToSupabase();
      if (pushed) toast.success("☁️ Đã đồng bộ dữ liệu lên Supabase Cloud!");
    } else {
      toast.success("☁️ Đã kéo dữ liệu mới nhất từ Cloud về máy!");
    }
  };

  const navItems = [
    { path: "/", label: "Thư viện", sub: "Quản lý học phần", icon: "📚" },
    { path: "/flashcards", label: "Flashcards", sub: "Lật thẻ 3D", icon: "🗂️" },
    { path: "/learn", label: "Học SRS", sub: "Lặp lại ngắt quãng", icon: "🧠" },
    { path: "/test", label: "Kiểm tra", sub: "Đánh giá năng lực", icon: "📝" },
    { path: "/match", label: "Ghép thẻ", sub: "Phản xạ tốc độ", icon: "🎮" },
  ];

  const getDotColor = () => {
    if (syncInfo.state === "syncing") return "#f59e0b";
    if (syncInfo.state === "synced") return "#10b981";
    if (syncInfo.state === "error") return "#ef4444";
    return "#94a3b8";
  };

  return (
    <nav className="app-navigation print-d-none" aria-label="Main Navigation">
      {/* Header Logo Desktop */}
      <Link
        className="nav-brand-desktop d-none d-lg-flex align-items-center text-decoration-none"
        to="/"
      >
        <div className="nav-logo-box">
          <img
            src="/sea_15651557.ico"
            alt="Scofield Logo"
            width="34"
            height="34"
            className="rounded-circle"
          />
        </div>
        <div className="ms-3 overflow-hidden">
          <h4 className="fw-black mb-0 nav-brand-title">Scofield</h4>
          <span className="nav-brand-badge">LOCAL-FIRST PWA</span>
        </div>
      </Link>

      {/* Danh sách Menu */}
      <div className="nav-menu">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link-custom ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon-wrapper">
                <span className="nav-icon">{item.icon}</span>
              </span>
              <div className="d-none d-lg-flex flex-column nav-text-group">
                <span className="nav-text">{item.label}</span>
                <span className="nav-subtext">{item.sub}</span>
              </div>
              <span className="d-lg-none mobile-label">{item.label}</span>
              {isActive && <span className="nav-active-dot d-lg-none" />}
            </Link>
          );
        })}
      </div>

      {/* Card trạng thái Cloud ở đáy Sidebar PC */}
      <div className="nav-cloud-footer d-none d-lg-flex flex-column mt-auto">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <span
              className={`sync-status-dot ${syncInfo.state === "syncing" ? "pulse" : ""}`}
              style={{ backgroundColor: getDotColor() }}
            />
            <span className="fw-bold small text-white">Supabase Cloud</span>
          </div>
          {syncInfo.lastSynced && (
            <span className="text-white-50" style={{ fontSize: "0.7rem" }}>
              {syncInfo.lastSynced}
            </span>
          )}
        </div>
        <div className="text-white-50 mb-2" style={{ fontSize: "0.75rem" }}>
          {syncInfo.message || "Tự động lưu ngầm"}
        </div>
        <button
          type="button"
          className="btn btn-sm nav-sync-btn w-100"
          onClick={handleManualSync}
          disabled={syncInfo.state === "syncing"}
        >
          {syncInfo.state === "syncing" ? "⏳ Đang đồng bộ..." : "🔄 Đồng bộ ngay"}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Thư viện", icon: "📚" },
    { path: "/flashcards", label: "Flashcards", icon: "🗂️" },
    { path: "/learn", label: "Học SRS", icon: "🧠" },
    { path: "/test", label: "Kiểm tra", icon: "📝" },
    { path: "/match", label: "Ghép thẻ", icon: "🎮" },
  ];

  return (
    <nav className="app-navigation print-d-none" aria-label="Main Navigation">
      {/* Header Logo Desktop */}
      <Link
        className="nav-brand-desktop d-none d-lg-flex align-items-center mb-5 text-white text-decoration-none"
        to="/"
      >
        <img
          src="/sea_15651557.ico"
          alt="Logo"
          width="42"
          height="42"
          className="bg-white rounded-circle p-1 shadow-sm"
          style={{ minWidth: "42px" }}
        />
        <h3 className="fw-bold mb-0 ms-3 nav-text">Scofield</h3>
      </Link>

      {/* Danh sách Menu (Floating Dock trên Mobile / Sidebar trên Desktop) */}
      <div className="nav-menu">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link-custom ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon-wrapper">
                <span className="nav-icon">{item.icon}</span>
              </span>
              <span className="d-none d-lg-block fw-bold nav-text">{item.label}</span>
              <span className="d-lg-none mobile-label">{item.label}</span>
              {isActive && <span className="nav-active-dot d-lg-none" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default Navbar;