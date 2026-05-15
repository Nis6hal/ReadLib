import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X, Star, Bookmark, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { useLibrary, GENRES } from '../context/LibraryContext';
import { useToast } from './Toast';
import './BookDetailModal.css';

// Reuse helper functions from BookCard
function getBookGradient(title) {
  const gradients = [
    ['#6366f1', '#8b5cf6'], ['#ec4899', '#f43f5e'], ['#14b8a6', '#06b6d4'],
    ['#f59e0b', '#ef4444'], ['#8b5cf6', '#d946ef'], ['#0ea5e9', '#6366f1'],
    ['#10b981', '#059669'], ['#f97316', '#eab308'], ['#e11d48', '#be185d'],
    ['#7c3aed', '#2563eb'], ['#06b6d4', '#10b981'], ['#dc2626', '#f97316'],
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) { hash = title.charCodeAt(i) + ((hash << 5) - hash); }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(title) {
  return title.replace(/[^a-zA-Z\s]/g, '').split(' ').filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function BookDetailModal({ book, onClose }) {
  const { updateBook } = useLibrary();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250); // match animation duration
  };

  const handleRead = () => {
    navigate(`/read/${encodeURIComponent(book.id)}`);
  };

  const changeCategory = async (newCategory) => {
    if (book.category === newCategory) return;
    const updated = { ...book, category: newCategory };
    await updateBook(updated);
    addToast(`Added to ${newCategory}`, 'success');
  };

  const toggleFavorite = async () => {
    const updated = { ...book, isFavorite: !book.isFavorite };
    await updateBook(updated);
    addToast(updated.isFavorite ? 'Added to Favorites' : 'Removed from Favorites', 'info');
  };

  const [color1, color2] = getBookGradient(book.title);
  const initials = getInitials(book.title);
  const hasCover = !!book.cover;

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`modal-content book-detail-modal card ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn btn-icon" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="modal-body">
          <div className="modal-left">
            <div className={`modal-cover ${hasCover ? 'has-cover' : ''}`} style={!hasCover ? { background: `linear-gradient(135deg, ${color1}, ${color2})` } : undefined}>
              {hasCover ? (
                <img src={book.cover} alt={book.title} />
              ) : (
                <span className="modal-initials">{initials || '?'}</span>
              )}
            </div>
            <button className="btn btn-primary modal-read-btn" onClick={handleRead}>
              <Play size={18} fill="currentColor" /> Read Book
            </button>
          </div>

          <div className="modal-right">
            <div className="modal-header">
              <div className="modal-title-row">
                <h2>{book.title}</h2>
                <button className={`favorite-btn-large ${book.isFavorite ? 'active' : ''}`} onClick={toggleFavorite}>
                  <Star size={24} fill={book.isFavorite ? 'var(--accent-primary)' : 'none'} />
                </button>
              </div>
              <p className="modal-author">by {book.author}</p>
              <span className={`badge badge-${book.category.toLowerCase()}`}>{book.category}</span>
            </div>

            <div className="modal-section">
              <h3>Collections</h3>
              <div className="collection-buttons">
                <button 
                  className={`collection-btn ${book.category === 'Planned' ? 'active' : ''}`}
                  onClick={() => changeCategory('Planned')}
                >
                  <Bookmark size={16} /> Must Read
                </button>
                <button 
                  className={`collection-btn ${book.category === 'Reading' ? 'active' : ''}`}
                  onClick={() => changeCategory('Reading')}
                >
                  <BookOpen size={16} /> Reading
                </button>
                <button 
                  className={`collection-btn ${book.category === 'Completed' ? 'active' : ''}`}
                  onClick={() => changeCategory('Completed')}
                >
                  <CheckCircle size={16} /> Finished
                </button>
              </div>
            </div>

            <div className="modal-section">
              <h3>Progress</h3>
              <div className="progress-container modal-progress">
                <div className="progress-header">
                  <span>{Math.round(book.progress || 0)}% Complete</span>
                </div>
                <div className="progress-bg">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${book.progress || 0}%`,
                      background: `linear-gradient(90deg, ${color1}, ${color2})`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetailModal;
