import { Link, useLocation } from "react-router-dom";

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