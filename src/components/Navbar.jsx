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
    { path: "/", label: "Thư viện", icon: "📚" },
    { path: "/flashcards", label: "Thẻ nhớ", icon: "🗂️" },
    { path: "/learn", label: "Học SRS", icon: "🧠" },
    { path: "/test", label: "Kiểm tra", icon: "📝" },
    { path: "/match", label: "Ghép thẻ", icon: "🎮" },
  ];

  const getDotColor = () => {
    if (syncInfo.state === "syncing") return "#f59e0b";
    if (syncInfo.state === "synced") return "#10b981";
    if (syncInfo.state === "error") return "#ef4444";
    return "#94a3b8";
  };

  return (
    <nav className="app-navigation print-d-none" aria-label="Main Navigation">
      <Link
        className="nav-brand-desktop d-none d-lg-flex align-items-center text-decoration-none"
        to="/"
      >
        <div className="nav-logo-box">
          <img
            src="/sea_15651557.ico"
            alt="Scofield Logo"
            width="30"
            height="30"
            className="rounded-circle"
          />
        </div>
        <h5 className="fw-black mb-0 ms-2 nav-brand-title">Scofield</h5>
      </Link>

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
              <span className="d-none d-lg-inline nav-text">{item.label}</span>
              <span className="d-lg-none mobile-label">{item.label}</span>
              {isActive && <span className="nav-active-dot d-lg-none" />}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        className="btn nav-sync-btn d-none d-lg-flex align-items-center justify-content-between mt-auto w-100"
        onClick={handleManualSync}
        disabled={syncInfo.state === "syncing"}
        title={syncInfo.message || "Đồng bộ dữ liệu"}
      >
        <span className="d-flex align-items-center gap-2">
          <span
            className={`sync-status-dot ${syncInfo.state === "syncing" ? "pulse" : ""}`}
            style={{ backgroundColor: getDotColor() }}
          />
          <span>{syncInfo.state === "syncing" ? "Đang lưu..." : "Cloud Sync"}</span>
        </span>
        <span>🔄</span>
      </button>
    </nav>
  );
}

export default Navbar;