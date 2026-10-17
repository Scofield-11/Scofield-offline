import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { RefreshCw, Sun, Moon } from "lucide-react";
import { getSyncStatus, autoPullFromCloud, pushToSupabase } from "../api/axiosConfig";
import { toast } from "react-toastify";

const NAV_SPRING = { type: "spring", stiffness: 280, damping: 28, mass: 0.6 };

function Navbar() {
  const location = useLocation();
  const [syncInfo, setSyncInfo] = useState(getSyncStatus());
  const [theme, setTheme] = useState(() => localStorage.getItem("scofield_theme") || "light");

  useEffect(() => {
    const handleStatus = (e) => setSyncInfo(e.detail);
    const handleTheme = (e) => {
      if (e.detail) setTheme(e.detail);
    };
    window.addEventListener("scofield-sync-status", handleStatus);
    window.addEventListener("scofield-theme-change", handleTheme);
    return () => {
      window.removeEventListener("scofield-sync-status", handleStatus);
      window.removeEventListener("scofield-theme-change", handleTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("scofield_theme", nextTheme);
    window.dispatchEvent(new CustomEvent("scofield-theme-change", { detail: nextTheme }));
  };

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
    { path: "/learn", label: "Học thuộc", icon: "🧠" },
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
              {isActive && (
                <motion.div
                  layoutId="activeNavPill"
                  className="nav-active-pill"
                  transition={NAV_SPRING}
                />
              )}
              <span className="nav-icon-wrapper position-relative" style={{ zIndex: 2 }}>
                <span className="nav-icon">{item.icon}</span>
              </span>
              <span className="d-none d-lg-inline nav-text position-relative" style={{ zIndex: 2 }}>
                {item.label}
              </span>
              <span className="d-lg-none mobile-label position-relative" style={{ zIndex: 2 }}>
                {item.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId="activeNavDot"
                  className="nav-active-dot d-lg-none"
                  transition={NAV_SPRING}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="d-none d-lg-flex align-items-center gap-2 mt-auto w-100">
        <button
          type="button"
          className="btn nav-sync-btn d-flex align-items-center justify-content-between flex-grow-1"
          onClick={handleManualSync}
          disabled={syncInfo.state === "syncing"}
          title={syncInfo.message || "Đồng bộ dữ liệu"}
        >
          <span className="d-flex align-items-center gap-2 text-truncate">
            <span
              className={`sync-status-dot ${syncInfo.state === "syncing" ? "pulse" : ""}`}
              style={{ backgroundColor: getDotColor() }}
            />
            <span className="text-truncate">
              {syncInfo.state === "syncing" ? "Đang lưu..." : "Cloud Sync"}
            </span>
          </span>
          <RefreshCw
            size={14}
            className={syncInfo.state === "syncing" ? "spin-anim flex-shrink-0" : "flex-shrink-0"}
          />
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9, rotate: 25 }}
          className="btn nav-theme-btn d-flex align-items-center justify-content-center flex-shrink-0"
          onClick={toggleTheme}
          title={theme === "dark" ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
          aria-label="Toggle theme"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 24, mass: 0.6 }}
            className="d-flex align-items-center justify-content-center"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </motion.div>
        </motion.button>
      </div>
    </nav>
  );
}

export default Navbar;