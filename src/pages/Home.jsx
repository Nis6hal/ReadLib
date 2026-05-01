import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, TrendingUp, FolderOpen, ArrowRight, Library } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import '../App.css';
import './Home.css';

function Home() {
  const { books, stats, loading, selectDirectory, dirHandle } = useLibrary();
  const navigate = useNavigate();

  const recentlyRead = books
    .filter(b => b.lastRead)
    .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
    .slice(0, 4);

  const currentlyReading = books.filter(b => b.category === 'Reading').slice(0, 4);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your library...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero / Welcome */}
      <div className="page-header fade-in">
        <h1>Welcome back 👋</h1>
        <p className="page-subtitle">Here's an overview of your reading journey</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-row fade-in fade-in-delay-1">
        <div className="card stat-card accent">
          <div className="stat-icon accent">
            <Library size={20} />
          </div>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Books</span>
        </div>
        <div className="card stat-card warning">
          <div className="stat-icon warning">
            <BookOpen size={20} />
          </div>
          <span className="stat-value">{stats.reading}</span>
          <span className="stat-label">Currently Reading</span>
        </div>
        <div className="card stat-card success">
          <div className="stat-icon success">
            <CheckCircle size={20} />
          </div>
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="card stat-card danger">
          <div className="stat-icon danger">
            <Clock size={20} />
          </div>
          <span className="stat-value">{stats.planned}</span>
          <span className="stat-label">Planned</span>
        </div>
      </div>

      {/* Prompt to add books if none */}
      {books.length === 0 && (
        <div className="empty-state card fade-in fade-in-delay-2">
          <div className="empty-state-icon">
            <FolderOpen size={36} color="var(--accent-primary)" />
          </div>
          <h3>Your library is empty</h3>
          <p>Select a folder containing your PDF books to get started. ReadLib will scan and organize them for you.</p>
          <button className="btn btn-primary" onClick={selectDirectory}>
            <FolderOpen size={18} /> Select Library Folder
          </button>
        </div>
      )}

      {/* Continue Reading Section */}
      {currentlyReading.length > 0 && (
        <section className="home-section fade-in fade-in-delay-2">
          <div className="section-header">
            <h2 className="section-title">
              <BookOpen size={22} /> Continue Reading
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reading')}>
              View All <ArrowRight size={16} />
            </button>
          </div>
          <div className="books-grid">
            {currentlyReading.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Opened */}
      {recentlyRead.length > 0 && (
        <section className="home-section fade-in fade-in-delay-3">
          <div className="section-header">
            <h2 className="section-title">
              <Clock size={22} /> Recently Opened
            </h2>
          </div>
          <div className="books-grid">
            {recentlyRead.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions - Show when user has books but none reading */}
      {books.length > 0 && currentlyReading.length === 0 && recentlyRead.length === 0 && (
        <div className="card quick-actions fade-in fade-in-delay-2">
          <h3>🚀 Ready to start reading?</h3>
          <p>Head to your library and pick a book to begin.</p>
          <button className="btn btn-primary" onClick={() => navigate('/library')}>
            <Library size={18} /> Browse Library
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;
