import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, TrendingUp, FolderOpen, ArrowRight, Library } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import '../App.css';
import './Home.css';

import { Filter, ChevronRight, FlaskConical, Palette, Briefcase, Utensils, MoreHorizontal } from 'lucide-react';

function Home() {
  const { books, loading, selectDirectory } = useLibrary();
  const navigate = useNavigate();

  const recentlyRead = books
    .filter(b => b.lastRead)
    .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
    .slice(0, 5);

  const newBooks = books
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(0, 5);

  const subjects = [
    { name: 'Self-improvement', icon: <FlaskConical size={24} />, color: 'var(--bg-secondary)' },
    { name: 'Fantasy', icon: <Palette size={24} />, color: 'var(--bg-secondary)' },
    { name: 'Novel', icon: <Briefcase size={24} />, color: 'var(--bg-secondary)' },
    { name: 'Biography', icon: <div className="dot-icon" />, color: 'var(--bg-secondary)' },
    { name: 'Sci-fi', icon: <Utensils size={24} />, color: 'var(--accent-primary)', textColor: 'var(--bg-primary)' },
    { name: 'Mystery Thriller', icon: <MoreHorizontal size={24} />, color: 'var(--bg-secondary)' },
    { name: 'Other', icon: <MoreHorizontal size={24} />, color: 'var(--bg-secondary)' },
  ];

  const handleGenreClick = (genre) => {
    navigate(`/library?genre=${encodeURIComponent(genre)}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your library...</p>
      </div>
    );
  }

  return (
    <div className="home-page fade-in">
      {/* Previous Reading */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Previous Reading</h2>
          <button className="filter-btn" onClick={() => navigate('/library')}><Filter size={14} /> Filter</button>
        </div>
        <div className="horizontal-scroll">
          {recentlyRead.length > 0 ? (
            recentlyRead.map(book => (
              <BookCard key={book.id} book={book} variant="simple" />
            ))
          ) : (
            <div className="empty-section">No recent reading found. Start a book from your library!</div>
          )}
        </div>
      </section>

      {/* Subjects Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Subjects section</h2>
        </div>
        <div className="subjects-grid">
          {subjects.map(subject => {
            const count = books.filter(b => b.genre === subject.name).length;
            return (
              <div 
                key={subject.name} 
                className="subject-card" 
                style={{ background: subject.color, color: subject.textColor || 'inherit' }}
                onClick={() => handleGenreClick(subject.name)}
              >
                <div className="subject-icon" style={{ color: subject.textColor || 'var(--text-muted)' }}>
                  {subject.icon}
                </div>
                <div className="subject-info">
                  <h3>{subject.name}</h3>
                  <p style={{ color: subject.textColor ? 'rgba(0,0,0,0.6)' : 'var(--text-muted)' }}>
                    {count} {count === 1 ? 'Book' : 'Books'} available
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* New Books */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>New books</h2>
          <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
        </div>
        <div className="horizontal-scroll">
          {newBooks.length > 0 ? (
            newBooks.map(book => (
              <BookCard key={book.id} book={book} variant="simple" />
            ))
          ) : (
            <div className="empty-section">
              <p>No books in your library yet.</p>
              <button className="btn btn-primary btn-sm" onClick={selectDirectory}>Add Folder</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
