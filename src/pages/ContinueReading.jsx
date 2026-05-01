import React from 'react';
import { BookOpen, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import '../App.css';
import './ContinueReading.css';

function ContinueReading() {
  const { books, loading } = useLibrary();
  const navigate = useNavigate();

  const readingBooks = books
    .filter(b => b.category === 'Reading')
    .sort((a, b) => {
      // Sort by last read date (most recent first), then by progress
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
            ? `You have ${readingBooks.length} book${readingBooks.length !== 1 ? 's' : ''} in progress`
            : 'No books in progress'}
        </p>
      </div>

      {readingBooks.length > 0 ? (
        <div className="books-grid fade-in fade-in-delay-1">
          {readingBooks.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
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
