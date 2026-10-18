import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { VocabProvider } from './context/VocabContext';
import { getCurrentUser } from './api/axiosConfig';

import Navbar from './components/Navbar';
import Breadcrumbs from './components/Breadcrumbs';
import HomePage from './pages/HomePage';
import KanjiDictionary from './pages/KanjiDictionary';
import FlashcardMode from './components/FlashcardMode';
import LearnMode from './components/LearnMode';
import TestMode from './components/TestMode';
import MatchMode from './components/MatchMode';
import AdminUsersPage from './pages/AdminUsersPage';
import AuthPage from './pages/AuthPage';
import NotFound from './pages/NotFound';

function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const savedTheme = localStorage.getItem('scofield_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('scofield-auth-changed', handleAuthChange);
    return () => window.removeEventListener('scofield-auth-changed', handleAuthChange);
  }, []);

  return (
    <VocabProvider>
      <Router>
        {!currentUser ? (
          <AuthPage onAuthSuccess={(user) => setCurrentUser(user)} />
        ) : (
          <div className="app-layout">
            <Navbar />
            <main className="main-content">
              <Breadcrumbs />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/kanji" element={<KanjiDictionary />} />
                <Route path="/flashcards" element={<FlashcardMode />} />
                <Route path="/learn" element={<LearnMode />} />
                <Route path="/test" element={<TestMode />} />
                <Route path="/match" element={<MatchMode />} />
                <Route path="/admin" element={<AdminUsersPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        )}
        <ToastContainer
          position="top-right"
          autoClose={2200}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover={false}
          theme="colored"
        />
      </Router>
    </VocabProvider>
  );
}

export default App;