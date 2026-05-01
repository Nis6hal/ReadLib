import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, BookOpen, Plus, X } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import './BookCard.css';

// Generate a unique gradient based on book title (fallback)
function getBookGradient(title) {
  const gradients = [
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f43f5e'],
    ['#14b8a6', '#06b6d4'],
    ['#f59e0b', '#ef4444'],
    ['#8b5cf6', '#d946ef'],
    ['#0ea5e9', '#6366f1'],
    ['#10b981', '#059669'],
    ['#f97316', '#eab308'],
    ['#e11d48', '#be185d'],
    ['#7c3aed', '#2563eb'],
    ['#06b6d4', '#10b981'],
    ['#dc2626', '#f97316'],
  ];
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function getInitials(title) {
  return title
    .replace(/[^a-zA-Z\s]/g, '')
    .split(' ')
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function BookCard({ book }) {
  const { updateBook } = useLibrary();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const handleRead = () => {
    navigate(`/read/${encodeURIComponent(book.id)}`);
  };

  const changeCategory = async (newCategory) => {
    const updated = { ...book, category: newCategory };
    await updateBook(updated);
    setShowMenu(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const progressPercent = book.progress || 0;
  const [color1, color2] = getBookGradient(book.title);
  const initials = getInitials(book.title);
  const hasCover = !!book.cover;

  return (
    <div className="card book-card">
      <div 
        className={`book-cover ${hasCover ? 'has-cover' : ''}`}
        style={!hasCover ? { background: `linear-gradient(145deg, ${color1}22, ${color2}11)` } : undefined}
        onClick={handleRead}
      >
        {hasCover ? (
          <img 
            src={book.cover} 
            alt={book.title} 
            className="book-cover-img" 
            loading="lazy"
          />
        ) : (
          <div className="book-cover-art" style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
            <span className="book-initials">{initials || '?'}</span>
          </div>
        )}
        <div className="category-badge">
          <span className={`badge badge-${book.category.toLowerCase()}`}>{book.category}</span>
        </div>
      </div>
      
      <div className="book-info">
        <h3 className="book-title" title={book.title}>{book.title}</h3>
        <p className="book-author">{book.author}</p>
        
        <div className="progress-container">
          <div className="progress-header">
            <span>Progress</span>
            <span className="progress-value">{Math.round(progressPercent)}%</span>
          </div>
          <div className="progress-bg">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${color1}, ${color2})`
              }}
            ></div>
          </div>
        </div>

        <div className="book-actions">
          <button className="btn btn-primary flex-1" onClick={handleRead}>
            <Play size={14} fill="currentColor" /> Read
          </button>
          
          <div className="dropdown" ref={menuRef}>
            <button 
              className="btn-icon-sm" 
              onClick={() => setShowMenu(!showMenu)}
              title="Change category"
            >
              {showMenu ? <X size={16} /> : <Plus size={16} />}
            </button>
            
            {showMenu && (
              <div className="dropdown-menu glass-panel">
                <div className="dropdown-header">Move to...</div>
                {['Planned', 'Reading', 'Completed'].map(cat => (
                  <button 
                    key={cat}
                    className={`dropdown-item ${book.category === cat ? 'active' : ''}`}
                    onClick={() => changeCategory(cat)}
                  >
                    {book.category === cat && <Check size={14} />}
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookCard;
