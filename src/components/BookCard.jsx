import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Play, Check, BookOpen, Plus, X, Trash2, Pencil, Save, Star } from 'lucide-react';
import { useLibrary, GENRES } from '../context/LibraryContext';
import { useToast } from './Toast';
import BookDetailModal from './BookDetailModal';
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

function BookCard({ book: initialBook, viewMode = 'grid', variant = 'default' }) {
  const { updateBook, deleteBook, books } = useLibrary();
  // Always use the live book from context so inline edits stay fresh
  const book = books.find(b => b.id === initialBook.id) || initialBook;
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [editAuthor, setEditAuthor] = useState(book.author);
  const [editGenre, setEditGenre] = useState(book.genre || 'Other');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const editTitleRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ bottom: 0, right: 0 });

  const handleRead = (e) => {
    e?.stopPropagation();
    if (book.isManual) {
      addToast('This is a manual entry. No file linked.', 'info');
      setShowModal(true);
      return;
    }
    if (book.fileMissing) {
      addToast('File is missing from your local folder. Reading record preserved.', 'info');
      setShowModal(true);
      return;
    }
    navigate(`/read/${encodeURIComponent(book.id)}`);
  };

  const handleCardClick = () => {
    if (!isEditing) {
      setShowModal(true);
    }
  };

  const changeCategory = async (newCategory) => {
    if (book.category === newCategory) {
      setShowMenu(false);
      return;
    }
    const updated = { ...book, category: newCategory };
    await updateBook(updated);
    setShowMenu(false);
    addToast(`Moved to ${newCategory}`, 'success');
  };

  const toggleFavorite = async (e) => {
    e?.stopPropagation();
    const updated = { ...book, isFavorite: !book.isFavorite };
    await updateBook(updated);
    addToast(updated.isFavorite ? 'Added to Favorites' : 'Removed from Favorites', 'info');
  };

  const changeGenre = async (newGenre) => {
    if (book.genre === newGenre) {
      setShowMenu(false);
      return;
    }
    const updated = { ...book, genre: newGenre };
    await updateBook(updated);
    setShowMenu(false);
    addToast(`Genre updated to ${newGenre}`, 'success');
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditGenre(book.genre || 'Other');
    setShowMenu(false);
    setTimeout(() => editTitleRef.current?.focus(), 50);
  };

  const handleSaveEdit = async () => {
    const trimTitle = editTitle.trim();
    const trimAuthor = editAuthor.trim();
    if (!trimTitle) return;
    const updated = { ...book, title: trimTitle, author: trimAuthor || 'Unknown Author', genre: editGenre };
    await updateBook(updated);
    setIsEditing(false);
    addToast('Book details updated', 'success');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(book.title);
    setEditAuthor(book.author);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') handleCancelEdit();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await deleteBook(book.id);
    addToast(`"${book.title}" removed from library`, 'info');
  };

  // Position dropdown via portal when opened
  useEffect(() => {
    if (showMenu && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMenu]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        menuBtnRef.current && !menuBtnRef.current.contains(e.target)
      ) {
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

  if (variant === 'simple') {
    return (
      <>
        <div className="book-card-simple" onClick={handleCardClick}>
          <div className="book-cover-container">
          {hasCover ? (
            <img src={book.cover} alt={book.title} className="book-cover-img" />
          ) : (
            <div className="book-cover-art" style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
              <span>{initials || '?'}</span>
            </div>
          )}
          {book.progress > 0 && (
            <div className="progress-badge">{Math.round(book.progress)}%</div>
          )}
          {book.fileMissing && (
            <div className="missing-badge" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: '#ef4444', color: '#fff', padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', zIndex: 5 }}>Missing File</div>
          )}
        </div>
        <div className="book-info-simple">
          <h3 title={book.title}>{book.title}</h3>
          <p>{book.author}</p>
        </div>
      </div>
      {showModal && <BookDetailModal book={book} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // === LIST VIEW ===
  if (viewMode === 'list') {
    return (
      <>
        <div className="book-list-item card">
          <div
            className={`book-list-cover ${hasCover ? 'has-cover' : ''}`}
            style={!hasCover ? { background: `linear-gradient(145deg, ${color1}22, ${color2}11)` } : undefined}
            onClick={handleCardClick}
          >
          {hasCover ? (
            <img src={book.cover} alt={book.title} className="book-cover-img" loading="lazy" />
          ) : (
            <div className="book-cover-art-sm" style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
              <span className="book-initials-sm">{initials || '?'}</span>
            </div>
          )}
        </div>

        <div className="book-list-info" onClick={handleCardClick}>
          {isEditing ? (
            <div className="inline-edit" onClick={(e) => e.stopPropagation()}>
              <input ref={editTitleRef} value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={handleEditKeyDown} className="edit-input edit-title-input" placeholder="Title" />
              <input value={editAuthor} onChange={e => setEditAuthor(e.target.value)} onKeyDown={handleEditKeyDown} className="edit-input edit-author-input" placeholder="Author" />
            </div>
          ) : (
            <>
              <h3 className="book-title" title={book.title}>{book.title}</h3>
              <p className="book-author">{book.author}</p>
            </>
          )}
        </div>

        <div className="book-list-meta">
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span className={`badge badge-${book.category.toLowerCase()}`}>{book.category}</span>
            {book.fileMissing && (
              <span className="badge badge-missing" style={{ background: '#ef4444', color: '#fff' }}>Missing File</span>
            )}
          </div>
          <div className="list-progress">
            <div className="progress-bg">
              <div className="progress-fill" style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${color1}, ${color2})` }}></div>
            </div>
            <span className="progress-value-sm">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <div className="book-list-actions">
          {isEditing ? (
            <>
              <button className="btn-icon-sm" onClick={handleSaveEdit} title="Save"><Save size={15} /></button>
              <button className="btn-icon-sm" onClick={handleCancelEdit} title="Cancel"><X size={15} /></button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-sm" onClick={handleRead}><Play size={13} fill="currentColor" /> Read</button>
              <button className="btn-icon-sm" onClick={handleEdit} title="Edit"><Pencil size={14} /></button>
              <button className={`btn-icon-sm ${confirmDelete ? 'btn-danger-icon' : ''}`} onClick={handleDelete} title={confirmDelete ? 'Click again to confirm' : 'Delete'}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      {showModal && <BookDetailModal book={book} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // === GRID VIEW (default) ===
  return (
    <>
    <div className="card book-card">
      <div
        className={`book-cover ${hasCover ? 'has-cover' : ''}`}
        style={!hasCover ? { background: `linear-gradient(145deg, ${color1}22, ${color2}11)` } : undefined}
        onClick={handleCardClick}
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
          {book.fileMissing && (
            <span className="badge badge-missing" style={{ background: '#ef4444', color: '#fff', marginLeft: '0.35rem' }}>Missing File</span>
          )}
        </div>
        <button 
          className={`favorite-btn ${book.isFavorite ? 'active' : ''}`}
          onClick={toggleFavorite}
          title={book.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Star size={18} fill={book.isFavorite ? 'var(--accent-primary)' : 'none'} />
        </button>
      </div>

      <div className="book-info">
        {isEditing ? (
          <div className="inline-edit">
            <input
              ref={editTitleRef}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="edit-input edit-title-input"
              placeholder="Title"
            />
            <input
              value={editAuthor}
              onChange={e => setEditAuthor(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="edit-input edit-author-input"
              placeholder="Author"
            />
            <select 
              value={editGenre} 
              onChange={e => setEditGenre(e.target.value)}
              className="edit-input edit-genre-input"
            >
              {GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <div className="edit-actions">
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}><Save size={13} /> Save</button>
              <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}><X size={13} /> Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="book-title" title={book.title}>{book.title}</h3>
            <p className="book-author">{book.author}</p>
          </>
        )}

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

          <div>
            <button
              ref={menuBtnRef}
              className="btn-icon-sm"
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
            >
              {showMenu ? <X size={16} /> : <Plus size={16} />}
            </button>

            {showMenu && createPortal(
              <div
                ref={menuRef}
                className="dropdown-menu glass-panel"
                style={{
                  position: 'fixed',
                  bottom: `${menuPos.bottom}px`,
                  right: `${menuPos.right}px`,
                  zIndex: 9999,
                }}
              >
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

                <div className="dropdown-divider"></div>
                <div className="dropdown-header">Genre</div>
                <div className="genre-grid">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      className={`genre-item ${book.genre === g ? 'active' : ''}`}
                      onClick={() => changeGenre(g)}
                      title={g}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={toggleFavorite}>
                  <Star size={14} fill={book.isFavorite ? 'currentColor' : 'none'} />
                  {book.isFavorite ? 'Remove Favorite' : 'Mark as Favorite'}
                </button>
                <button className="dropdown-item" onClick={handleEdit}>
                  <Pencil size={14} /> Edit Details
                </button>
                <button className={`dropdown-item dropdown-item-danger ${confirmDelete ? 'confirm' : ''}`} onClick={handleDelete}>
                  <Trash2 size={14} /> {confirmDelete ? 'Confirm Delete?' : 'Delete'}
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
    </div>
    {showModal && <BookDetailModal book={book} onClose={() => setShowModal(false)} />}
    </>
  );
}

export default BookCard;
