import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LibraryProvider } from './context/LibraryContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import './App.css';
import Home from './pages/Home';
import Library from './pages/Library';
import ContinueReading from './pages/ContinueReading';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Reader from './components/Reader';

import TopBar from './components/TopBar';

function App() {
  return (
    <LibraryProvider>
      <ToastProvider>
        <Router>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <TopBar />
              <div className="content-wrapper">
                <div className="main-panel">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/reading" element={<ContinueReading />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/read/:id" element={<Reader />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            </main>
          </div>
        </Router>
      </ToastProvider>
    </LibraryProvider>
  );
}

export default App;
