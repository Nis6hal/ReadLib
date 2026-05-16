import React from 'react';
import { BookOpen, Library, Play, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import '../App.css';
import './ContinueReading.css';

function getBookGradient(title) {
  const gradients = [
    ['#6366f1', '#8b5cf6'], ['#ec4899', '#f43f5e'], ['#14b8a6', '#06b6d4'],
    ['#f59e0b', '#ef4444'], ['#8b5cf6', '#d946ef'], ['#0ea5e9', '#6366f1'],
    ['#10b981', '#059669'], ['#f97316', '#eab308'],
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) { hash = title.charCodeAt(i) + ((hash << 5) - hash); }
  return gradients[Math.abs(hash) % gradients.length];
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ContinueReading() {
  const { books, loading } = useLibrary();
  const navigate = useNavigate();

  const readingBooks = books
    .filter(b => b.category === 'Reading')
    .sort((a, b) => {
      if (a.lastRead && b.lastRead) return new Date(b.lastRead) - new Date(a.lastRead);
      if (a.lastRead) return -1;
      if (b.lastRead) return 1;
      return b.progress - a.progress;
    });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="continue-reading-page">
      <div className="page-header fade-in">
        <h1>Continue Reading</h1>
        <p className="page-subtitle">
          {readingBooks.length > 0
            ? `${readingBooks.length} book${readingBooks.length !== 1 ? 's' : ''} in progress`
            : 'No books in progress'}
        </p>
      </div>

      {readingBooks.length > 0 ? (
        <div className="reading-cards-list fade-in fade-in-delay-1">
          {readingBooks.map(book => {
            const [c1, c2] = getBookGradient(book.title);
            const ago = timeAgo(book.lastRead);
            const progress = Math.round(book.progress || 0);
            return (
              <div key={book.id} className="reading-card card">
                {/* Cover */}
                <div
                  className="rc-cover"
                  style={book.cover ? undefined : { background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                >
                  {book.cover
                    ? <img src={book.cover} alt={book.title} />
                    : <BookOpen size={28} color="rgba(255,255,255,0.8)" />
                  }
                </div>

                {/* Info */}
                <div className="rc-info">
                  <p className="rc-title">{book.title}</p>
                  <p className="rc-author">{book.author}</p>

                  <div className="rc-progress-area">
                    <div className="rc-progress-labels">
                      <span>{progress}% complete</span>
                      {ago && (
                        <span className="rc-last-read">
                          <Clock size={12} /> {ago}
                        </span>
                      )}
                    </div>
                    <div className="progress-bg">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${c1}, ${c2})` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <button
                  className="rc-continue-btn"
                  onClick={() => navigate(`/read/${encodeURIComponent(book.id)}`)}
                >
                  <Play size={16} fill="currentColor" />
                  Continue
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state card fade-in fade-in-delay-1">
          <div className="empty-state-icon">
            <BookOpen size={36} color="var(--accent-primary)" />
          </div>
          <h3>Nothing in progress</h3>
          <p>Browse your library and start reading a book. It will appear here for quick access.</p>
          <button className="btn btn-primary" onClick={() => navigate('/library')}>
            <Library size={18} /> Browse Library
          </button>
        </div>
      )}
    </div>
  );
}

export default ContinueReading;
