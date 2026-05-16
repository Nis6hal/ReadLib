import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, TrendingUp, FolderOpen, ArrowRight, Library, Flame, Target } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import '../App.css';
import './Home.css';

import { Filter, ChevronRight, FlaskConical, Palette, Briefcase, Utensils, MoreHorizontal, Brain } from 'lucide-react';

import { BookCardSkeleton, GenreCardSkeleton } from '../components/Skeleton';

function ReadingHeatmap({ history }) {
  const today = new Date();
  const daysToShow = 28; // 4 weeks
  
  const heatmapData = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (daysToShow - 1 - i));
    const dateStr = d.toLocaleDateString('en-CA');
    const pages = history[dateStr] || 0;
    
    let level = 0;
    if (pages > 0) level = 1;
    if (pages > 20) level = 2;
    if (pages > 50) level = 3;
    if (pages > 100) level = 4;
    
    return { date: dateStr, pages, level };
  });

  return (
    <div className="reading-activity card">
      <div className="activity-header">
        <h3>Reading Consistency</h3>
        <p>Activity over the last 4 weeks</p>
      </div>
      <div className="heatmap-container">
        <div className="heatmap-grid">
          {heatmapData.map((d) => (
            <div 
              key={d.date} 
              className={`heatmap-cell level-${d.level}`} 
              title={`${d.date}: ${d.pages} pages`}
            >
              {d.pages > 0 && <span className="cell-tooltip">{d.pages} pages</span>}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-cells">
            <div className="heatmap-cell level-0"></div>
            <div className="heatmap-cell level-1"></div>
            <div className="heatmap-cell level-2"></div>
            <div className="heatmap-cell level-3"></div>
            <div className="heatmap-cell level-4"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const { books, loading, selectDirectory, readingHistory, yearlyGoal, calculateStreak } = useLibrary();
  const navigate = useNavigate();

  const streak = calculateStreak();
  const booksReadThisYear = books.filter(b => b.category === 'Completed' && b.lastRead && new Date(b.lastRead).getFullYear() === new Date().getFullYear()).length;
  const goalProgress = Math.min(100, Math.round((booksReadThisYear / yearlyGoal) * 100));

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
    { name: 'Psychology', icon: <Brain size={24} />, color: 'var(--bg-secondary)' },
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
        <div className="stat-card flame">
          <div className="stat-icon flame"><Flame size={20} /></div>
          <div className="stat-value">{streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat-card target">
          <div className="stat-icon target"><Target size={20} /></div>
          <div className="stat-value">{booksReadThisYear}/{yearlyGoal}</div>
          <div className="stat-label">Yearly Goal</div>
          <div className="stat-progress">
            <div className="stat-progress-bar" style={{ width: `${goalProgress}%` }}></div>
          </div>
        </div>
      </div>

      <ReadingHeatmap history={readingHistory} />
      
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
