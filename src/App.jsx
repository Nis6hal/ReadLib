import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LibraryProvider } from './context/LibraryContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import './App.css';
import Home from './pages/Home';
import Library from './pages/Library';
import ContinueReading from './pages/ContinueReading';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PdfViewer from './components/PdfViewer';

function App() {
  return (
    <LibraryProvider>
      <ToastProvider>
        <Router>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/reading" element={<ContinueReading />} />
                <Route path="/library" element={<Library />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/read/:id" element={<PdfViewer />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ToastProvider>
    </LibraryProvider>
  );
}

export default App;
