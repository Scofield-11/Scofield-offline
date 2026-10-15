import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import { AnimatePresence, motion } from "framer-motion";
import 'react-toastify/dist/ReactToastify.css';

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import FlashcardMode from "./components/FlashcardMode";
import LearnMode from "./components/LearnMode";
import TestMode from "./components/TestMode";
import MatchMode from "./components/MatchMode";
import ExamMode from './components/ExamMode';
import NotFound from "./pages/NotFound";
import { VocabProvider } from "./context/VocabContext";

// Component bọc từng trang để tạo hiệu ứng
const PageWrapper = ({ children }) => {
  const ref = useRef(null);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onAnimationComplete={() => {
                // Gỡ bỏ transform và will-change sau khi hiệu ứng kết thúc để mở khóa position: sticky
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

// Component xử lý hiệu ứng khi đổi Route
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        <Route path="/flashcards" element={<PageWrapper><FlashcardMode /></PageWrapper>} />
        <Route path="/learn" element={<PageWrapper><LearnMode /></PageWrapper>} />
        <Route path="/test" element={<PageWrapper><TestMode /></PageWrapper>} />
        <Route path="/match" element={<PageWrapper><MatchMode /></PageWrapper>} />
        <Route path="/exam" element={<PageWrapper><ExamMode /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {


  return (
    <VocabProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <div className="container-fluid py-4" style={{ maxWidth: '1200px' }}>
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
          theme="colored"
          style={{ top: 'env(safe-area-inset-top, 12px)', zIndex: 20000 }}
        />
      </BrowserRouter>
    </VocabProvider>
  );
}

export default App;