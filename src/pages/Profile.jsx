import React, { useEffect, useState } from 'react';
import { User, BookOpen, CheckCircle, Clock, TrendingUp, Award, Target, BarChart3, Flame } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import '../App.css';
import './Profile.css';

function Profile() {
  const { books, stats } = useLibrary();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger bar animations after mount
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const avgProgress = stats.total > 0
    ? Math.round(books.reduce((acc, b) => acc + (b.progress || 0), 0) / stats.total)
    : 0;

  // Distribution for visual bar chart
  const maxCategory = Math.max(stats.planned, stats.reading, stats.completed, 1);

  // Get reading rank
  const getRank = () => {
    if (stats.completed >= 20) return { label: 'Master Reader', emoji: '👑' };
    if (stats.completed >= 10) return { label: 'Avid Reader', emoji: '🌟' };
    if (stats.completed >= 5) return { label: 'Bookworm', emoji: '📖' };
    if (stats.completed >= 1) return { label: 'Getting Started', emoji: '🌱' };
    return { label: 'Newcomer', emoji: '✨' };
  };

  const rank = getRank();

  return (
    <div className="profile-page">
      <div className="page-header fade-in">
        <h1>Profile & Stats</h1>
        <p className="page-subtitle">Your reading insights at a glance</p>
      </div>

      {/* Avatar / Welcome Card */}
      <div className="card profile-hero fade-in fade-in-delay-1">
        <div className="profile-avatar">
          <User size={32} />
        </div>
        <div className="profile-hero-info">
          <h2>Book Lover</h2>
          <p className="profile-hero-sub">
            {stats.total > 0
              ? `You've added ${stats.total} book${stats.total !== 1 ? 's' : ''} to your library`
              : 'Start adding books to track your reading journey'}
          </p>
        </div>
        <div className="profile-hero-badge">
          <span className="rank-emoji">{rank.emoji}</span>
          <span>{rank.label}</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-row fade-in fade-in-delay-2">
        <div className="card stat-card accent">
          <div className="stat-icon accent"><Target size={20} /></div>
          <span className="stat-value">{completionRate}%</span>
          <span className="stat-label">Completion Rate</span>
        </div>
        <div className="card stat-card success">
          <div className="stat-icon success"><CheckCircle size={20} /></div>
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Books Completed</span>
        </div>
        <div className="card stat-card warning">
          <div className="stat-icon warning"><TrendingUp size={20} /></div>
          <span className="stat-value">{avgProgress}%</span>
          <span className="stat-label">Avg. Progress</span>
        </div>
        <div className="card stat-card danger">
          <div className="stat-icon danger"><Flame size={20} /></div>
          <span className="stat-value">{stats.reading}</span>
          <span className="stat-label">In Progress</span>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="card profile-chart-card fade-in fade-in-delay-3">
        <h3 className="section-title"><BarChart3 size={20} /> Category Distribution</h3>
        <div className="category-bars">
          <div className="category-bar-row">
            <span className="category-bar-label">Planned</span>
            <div className="category-bar-track">
              <div 
                className="category-bar-fill planned" 
                style={{ width: animated ? `${(stats.planned / maxCategory) * 100}%` : '0%' }}
              ></div>
            </div>
            <span className="category-bar-count">{stats.planned}</span>
          </div>
          <div className="category-bar-row">
            <span className="category-bar-label">Reading</span>
            <div className="category-bar-track">
              <div 
                className="category-bar-fill reading" 
                style={{ width: animated ? `${(stats.reading / maxCategory) * 100}%` : '0%' }}
              ></div>
            </div>
            <span className="category-bar-count">{stats.reading}</span>
          </div>
          <div className="category-bar-row">
            <span className="category-bar-label">Completed</span>
            <div className="category-bar-track">
              <div 
                className="category-bar-fill completed" 
                style={{ width: animated ? `${(stats.completed / maxCategory) * 100}%` : '0%' }}
              ></div>
            </div>
            <span className="category-bar-count">{stats.completed}</span>
          </div>
        </div>
      </div>

      {/* Reading Streak / Fun facts */}
      <div className="card profile-facts fade-in fade-in-delay-4">
        <h3 className="section-title"><BookOpen size={20} /> Quick Facts</h3>
        <div className="facts-grid">
          <div className="fact-item">
            <span className="fact-emoji">📚</span>
            <div className="fact-content">
              <span className="fact-value">{stats.total}</span>
              <span className="fact-text">Total books</span>
            </div>
          </div>
          <div className="fact-item">
            <span className="fact-emoji">🏆</span>
            <div className="fact-content">
              <span className="fact-value">{stats.completed}</span>
              <span className="fact-text">Finished</span>
            </div>
          </div>
          <div className="fact-item">
            <span className="fact-emoji">📖</span>
            <div className="fact-content">
              <span className="fact-value">{stats.reading}</span>
              <span className="fact-text">In progress</span>
            </div>
          </div>
          <div className="fact-item">
            <span className="fact-emoji">📋</span>
            <div className="fact-content">
              <span className="fact-value">{stats.planned}</span>
              <span className="fact-text">On the list</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
