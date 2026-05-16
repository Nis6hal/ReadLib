import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Play, X, Star, Bookmark, BookOpen, CheckCircle, Upload, Edit2, Check, StickyNote, Sparkles } from 'lucide-react';
import { useLibrary, GENRES } from '../context/LibraryContext';
import { useToast } from './Toast';
import './BookDetailModal.css';

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

function timeAgo(dateStr) {
  if (!dateStr) return 'Never read';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
}

function BookDetailModal({ book, onClose }) {
  const { updateBook, books } = useLibrary();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const coverInputRef = useRef(null);

  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [draftTitle, setDraftTitle] = useState(book.title);
  const [draftAuthor, setDraftAuthor] = useState(book.author);

  // Notes state
  const [notes, setNotes] = useState(book.notes || '');
  const [notesSaved, setNotesSaved] = useState(true);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  const handleRead = () => navigate(`/read/${encodeURIComponent(book.id)}`);

  const changeCategory = async (newCategory) => {
    if (book.category === newCategory) return;
    await updateBook({ ...book, category: newCategory });
    addToast(`Added to ${newCategory}`, 'success');
  };

  const toggleFavorite = async () => {
    const updated = { ...book, isFavorite: !book.isFavorite };
    await updateBook(updated);
    addToast(updated.isFavorite ? 'Added to Favorites ⭐' : 'Removed from Favorites', 'info');
  };

  const changeGenre = async (newGenre) => {
    if (book.genre === newGenre) return;
    await updateBook({ ...book, genre: newGenre });
    addToast(`Genre updated to ${newGenre}`, 'success');
  };

  const saveTitle = async () => {
    if (draftTitle.trim() && draftTitle !== book.title) {
      await updateBook({ ...book, title: draftTitle.trim() });
      addToast('Title updated', 'success');
    } else {
      setDraftTitle(book.title);
    }
    setEditingTitle(false);
  };

  const saveAuthor = async () => {
    if (draftAuthor.trim() && draftAuthor !== book.author) {
      await updateBook({ ...book, author: draftAuthor.trim() });
      addToast('Author updated', 'success');
    } else {
      setDraftAuthor(book.author);
    }
    setEditingAuthor(false);
  };

  const saveNotes = async () => {
    await updateBook({ ...book, notes });
    setNotesSaved(true);
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      await updateBook({ ...book, cover: reader.result });
      addToast('Cover updated! 🎨', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Similar books: same genre or same author, excluding current
  const similarBooks = books
    .filter(b => b.id !== book.id && (b.genre === book.genre || b.author === book.author))
    .slice(0, 4);

  const [color1, color2] = getBookGradient(book.title);
  const initials = getInitials(book.title);
  const hasCover = !!book.cover;

  const tabs = [
    { id: 'info', label: 'Info', icon: <BookOpen size={14} /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote size={14} /> },
    { id: 'similar', label: 'Similar', icon: <Sparkles size={14} /> },
  ];

  return createPortal(
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`modal-content book-detail-modal card ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn btn-icon" onClick={handleClose}><X size={20} /></button>

        <div className="modal-body">
          {/* Left column — cover + actions */}
          <div className="modal-left">
            <div className="modal-cover-wrapper">
              <div
                className={`modal-cover ${hasCover ? 'has-cover' : ''}`}
                style={!hasCover ? { background: `linear-gradient(135deg, ${color1}, ${color2})` } : undefined}
              >
                {hasCover
                  ? <img src={book.cover} alt={book.title} />
                  : <span className="modal-initials">{initials || '?'}</span>
                }
              </div>
              <button
                className="cover-upload-btn"
                onClick={() => coverInputRef.current?.click()}
                title="Upload custom cover"
              >
                <Upload size={14} /> Change Cover
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCoverUpload}
              />
            </div>

            <button className="btn btn-primary modal-read-btn" onClick={handleRead}>
              <Play size={18} fill="currentColor" /> Read Book
            </button>

            {book.lastRead && (
              <p className="modal-last-read">📖 {timeAgo(book.lastRead)}</p>
            )}
          </div>

          {/* Right column */}
          <div className="modal-right">
            {/* Title (inline editable) */}
            <div className="modal-header">
              <div className="modal-title-row">
                {editingTitle ? (
                  <div className="inline-edit-wrap">
                    <input
                      className="inline-edit-input"
                      value={draftTitle}
                      onChange={e => setDraftTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveTitle()}
                      onBlur={saveTitle}
                      autoFocus
                    />
                    <button className="inline-edit-save" onClick={saveTitle}><Check size={16} /></button>
                  </div>
                ) : (
                  <h2 onClick={() => setEditingTitle(true)} className="editable-title" title="Click to edit">
                    {book.title}
                    <Edit2 size={14} className="edit-hint-icon" />
                  </h2>
                )}
                <button className={`favorite-btn-large ${book.isFavorite ? 'active' : ''}`} onClick={toggleFavorite}>
                  <Star size={24} fill={book.isFavorite ? 'var(--accent-primary)' : 'none'} />
                </button>
              </div>

              {/* Author (inline editable) */}
              {editingAuthor ? (
                <div className="inline-edit-wrap">
                  <input
                    className="inline-edit-input inline-edit-author"
                    value={draftAuthor}
                    onChange={e => setDraftAuthor(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveAuthor()}
                    onBlur={saveAuthor}
                    autoFocus
                  />
                </div>
              ) : (
                <p className="modal-author editable-author" onClick={() => setEditingAuthor(true)} title="Click to edit">
                  by {book.author} <Edit2 size={12} className="edit-hint-icon" />
                </p>
              )}

              <div className="modal-meta-row">
                <span className={`badge badge-${book.category.toLowerCase()}`}>{book.category}</span>
                <select className="modal-genre-select" value={book.genre || 'Other'} onChange={e => changeGenre(e.target.value)}>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="modal-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`modal-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {activeTab === 'info' && (
              <div className="tab-panel">
                <div className="modal-section">
                  <h3>Collections</h3>
                  <div className="collection-buttons">
                    <button className={`collection-btn ${book.category === 'Planned' ? 'active' : ''}`} onClick={() => changeCategory('Planned')}>
                      <Bookmark size={16} /> Must Read
                    </button>
                    <button className={`collection-btn ${book.category === 'Reading' ? 'active' : ''}`} onClick={() => changeCategory('Reading')}>
                      <BookOpen size={16} /> Reading
                    </button>
                    <button className={`collection-btn ${book.category === 'Completed' ? 'active' : ''}`} onClick={() => changeCategory('Completed')}>
                      <CheckCircle size={16} /> Finished
                    </button>
                  </div>
                </div>
                <div className="modal-section">
                  <h3>Progress</h3>
                  <div className="progress-container modal-progress">
                    <div className="progress-header">
                      <span>{Math.round(book.progress || 0)}% Complete</span>
                      {book.pageCount > 0 && <span className="page-count-hint">{Math.round(((book.progress || 0) / 100) * book.pageCount)} / {book.pageCount} pages</span>}
                    </div>
                    <div className="progress-bg">
                      <div className="progress-fill" style={{ width: `${book.progress || 0}%`, background: `linear-gradient(90deg, ${color1}, ${color2})` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Notes */}
            {activeTab === 'notes' && (
              <div className="tab-panel notes-panel">
                <p className="notes-hint">Your personal notes about this book. Auto-saved when you leave.</p>
                <textarea
                  className="notes-textarea"
                  placeholder="Write your thoughts, quotes, or key takeaways here..."
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
                  onBlur={saveNotes}
                />
                <span className="notes-status">{notesSaved ? '✓ Saved' : 'Unsaved changes...'}</span>
              </div>
            )}

            {/* Tab: Similar */}
            {activeTab === 'similar' && (
              <div className="tab-panel">
                {similarBooks.length > 0 ? (
                  <div className="similar-books-grid">
                    {similarBooks.map(b => {
                      const [c1, c2] = getBookGradient(b.title);
                      return (
                        <div key={b.id} className="similar-book-card" onClick={() => navigate(`/read/${encodeURIComponent(b.id)}`)}>
                          <div className="similar-cover" style={b.cover ? undefined : { background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                            {b.cover ? <img src={b.cover} alt={b.title} /> : <span>{getInitials(b.title)}</span>}
                          </div>
                          <div className="similar-info">
                            <p className="similar-title">{b.title}</p>
                            <p className="similar-author">{b.author}</p>
                            <p className="similar-match">{b.genre === book.genre ? `📚 ${b.genre}` : `✍️ Same author`}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="similar-empty">
                    <Sparkles size={32} />
                    <p>No similar books found in your library yet.</p>
                    <span>Add more books with the same genre or author to see suggestions.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BookDetailModal;
