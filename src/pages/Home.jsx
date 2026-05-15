import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, TrendingUp, FolderOpen, ArrowRight, Library } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import '../App.css';
import './Home.css';

import { Filter, ChevronRight, FlaskConical, Palette, Briefcase, Utensils, MoreHorizontal } from 'lucide-react';

import { BookCardSkeleton, GenreCardSkeleton } from '../components/Skeleton';

function ReadingActivity({ history }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    return {
      day: days[d.getDay()],
      pages: history[dateStr] || 0,
      fullDate: dateStr
    };
  });

  const maxPages = Math.max(...last7Days.map(d => d.pages), 10);

  return (
    <div className="reading-activity card">
      <div className="activity-header">
        <h3>Reading Activity</h3>
        <p>Your progress over the last 7 days</p>
      </div>
      <div className="chart-container">
        {last7Days.map(d => {
          const height = (d.pages / maxPages) * 100;
          return (
            <div key={d.fullDate} className="chart-column">
              <div className="bar-wrapper">
                <div 
                  className="bar" 
                  style={{ height: `${height}%` }}
                  title={`${d.pages} pages read on ${d.day}`}
                >
                  {d.pages > 0 && <span className="bar-tooltip">{d.pages}</span>}
                </div>
              </div>
              <span className="day-label">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Home() {
  const { books, loading, selectDirectory, readingHistory } = useLibrary();
  const navigate = useNavigate();

  const recentlyRead = books
    .filter(b => b.lastRead)
    .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
    .slice(0, 5);

  const newBooks = books
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(0, 5);

  const authorMap = books.reduce((acc, book) => {
    const author = book.author || 'Unknown Author';
    if (author === 'Unknown Author') return acc;
    if (!acc[author]) {
      acc[author] = { name: author, books: 0, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=random` };
    }
    acc[author].books += 1;
    return acc;
  }, {});

  const topAuthors = Object.values(authorMap)
    .sort((a, b) => b.books - a.books)
    .slice(0, 4);

  const stats = {
    total: books.length,
    read: books.filter(b => b.category === 'Completed').length,
    planned: books.filter(b => b.category === 'Planned').length,
    reading: books.filter(b => b.category === 'Reading').length,
  };

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
      <div className="home-page fade-in">
        <section className="dashboard-section">
          <div className="section-header"><h2>Previous Reading</h2></div>
          <div className="horizontal-scroll">
            {[1, 2, 3, 4].map(i => <BookCardSkeleton key={i} />)}
          </div>
        </section>
        <section className="dashboard-section">
          <div className="section-header"><h2>Genres</h2></div>
          <div className="subjects-grid">
            {[1, 2, 3, 4, 5, 6].map(i => <GenreCardSkeleton key={i} />)}
          </div>
        </section>
      </div>
    );
  }


  return (
    <div className="home-page fade-in">
      
      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-icon accent"><BookOpen size={20} /></div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Books</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><CheckCircle size={20} /></div>
          <div className="stat-value">{stats.read}</div>
          <div className="stat-label">Finished</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon warning"><TrendingUp size={20} /></div>
          <div className="stat-value">{stats.reading}</div>
          <div className="stat-label">Currently Reading</div>
        </div>
      </div>

      <ReadingActivity history={readingHistory} />
      
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

      {/* Top Authors */}
      {topAuthors.length > 0 && (
        <section className="dashboard-section fade-in fade-in-delay-3">
          <div className="section-header">
            <h2>Top Authors</h2>
            <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
          </div>
          <div className="horizontal-scroll">
            {topAuthors.map(author => (
              <div key={author.name} className="author-card-large card" onClick={() => navigate(`/library?search=${encodeURIComponent(author.name)}`)}>
                <img src={author.avatar} alt={author.name} className="author-avatar-large" />
                <div className="author-info-large">
                  <h3>{author.name}</h3>
                  <p>{author.books} Books</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;
