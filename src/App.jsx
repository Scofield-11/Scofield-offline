import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import FlashcardMode from "./components/FlashcardMode";
import LearnMode from "./components/LearnMode";
import TestMode from "./components/TestMode";
import MatchMode from "./components/MatchMode";
import NotFound from "./pages/NotFound";
import { VocabProvider } from "./context/VocabContext";

const PageWrapper = ({ children }) => {
  const ref = useRef(null);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => {
        if (ref.current) {
          ref.current.style.transform = "none";
          ref.current.style.willChange = "auto";
        }
      }}
    >
      {children}
    </motion.div>
  );
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
      <Route path="/flashcards" element={<PageWrapper><FlashcardMode /></PageWrapper>} />
      <Route path="/learn" element={<PageWrapper><LearnMode /></PageWrapper>} />
      <Route path="/test" element={<PageWrapper><TestMode /></PageWrapper>} />
      <Route path="/match" element={<PageWrapper><MatchMode /></PageWrapper>} />
      <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
    </Routes>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("scofield_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("scofield_theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeEvent = (e) => {
      if (e.detail) setTheme(e.detail);
    };
    window.addEventListener("scofield-theme-change", handleThemeEvent);
    return () => window.removeEventListener("scofield-theme-change", handleThemeEvent);
  }, []);

  return (
    <VocabProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <div className="container-fluid py-4" style={{ maxWidth: "1200px" }}>
              <AnimatedRoutes />
            </div>
          </main>
        </div>
        <ToastContainer
          position="top-center"
          autoClose={1600}
          hideProgressBar={true}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover={false}
          theme={theme === "dark" ? "dark" : "colored"}
          style={{ top: "env(safe-area-inset-top, 12px)", zIndex: 20000 }}
        />
      </BrowserRouter>
    </VocabProvider>
  );
}

export default App;