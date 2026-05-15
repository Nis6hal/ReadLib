import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import './RightSidebar.css';

const POPULAR_BOOKS = [
  { id: 1, title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson', cover: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1482767451i/33539239.jpg' },
  { id: 2, title: 'Power of Subconscious Mind', author: 'Joseph Murphy', cover: 'https://m.media-amazon.com/images/I/71sBtM3Yi5L.jpg' },
  { id: 3, title: 'A Girl to Remember', author: 'Ajay K Pandey', cover: 'https://m.media-amazon.com/images/I/81O29P58xXL.jpg' },
  { id: 4, title: 'Sherlock Holmes', author: 'Arthur Conan', cover: 'https://m.media-amazon.com/images/I/71u9S+ZfUCL.jpg' },
];

const AUTHORS = [
  { name: 'Austin Kleon', books: 76, avatar: 'https://ui-avatars.com/api/?name=Austin+Kleon&background=random' },
  { name: 'Mark Manson', books: 33, avatar: 'https://ui-avatars.com/api/?name=Mark+Manson&background=random' },
  { name: 'Agatha Christie', books: 12, avatar: 'https://ui-avatars.com/api/?name=Agatha+Christie&background=random' },
];

function RightSidebar() {
  const navigate = useNavigate();
  const { books } = useLibrary();
  
  // Calculate dynamic popular books (recently read then progress)
  const popularBooks = [...books]
    .sort((a, b) => {
      if (a.lastRead && b.lastRead) return new Date(b.lastRead) - new Date(a.lastRead);
      if (a.lastRead) return -1;
      if (b.lastRead) return 1;
      return (b.progress || 0) - (a.progress || 0);
    })
    .slice(0, 4);

  // Calculate dynamic authors
  const authorMap = books.reduce((acc, book) => {
    const author = book.author || 'Unknown Author';
    if (author === 'Unknown Author') return acc;
    if (!acc[author]) {
      acc[author] = { name: author, books: 0, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=random` };
    }
    acc[author].books += 1;
    return acc;
  }, {});

  const authors = Object.values(authorMap)
    .sort((a, b) => b.books - a.books)
    .slice(0, 3);

  return (
    <aside className="right-sidebar">
      <section className="sidebar-section">
        <div className="section-header">
          <h3>Recent Reading</h3>
          <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
        </div>
        <div className="mini-book-list">
          {popularBooks.length > 0 ? popularBooks.map(book => (
            <div key={book.id} className="mini-book-card" onClick={() => navigate(`/read/${encodeURIComponent(book.id)}`)}>
              {book.cover ? (
                <img src={book.cover} alt={book.title} />
              ) : (
                <div className="mini-book-placeholder">{book.title.substring(0, 1)}</div>
              )}
              <div className="mini-book-info">
                <h4>{book.title}</h4>
                <p>{book.author}</p>
              </div>
            </div>
          )) : (
            <div className="special-empty">No books in progress</div>
          )}
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-header">
          <h3>Library Authors</h3>
          <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
        </div>
        <div className="author-list">
          {authors.length > 0 ? authors.map(author => (
            <div key={author.name} className="author-card" onClick={() => navigate(`/library?search=${encodeURIComponent(author.name)}`)}>
              <img src={author.avatar} alt={author.name} />
              <div className="author-info">
                <h4>{author.name}</h4>
                <p>{author.books} books</p>
              </div>
              <div className="author-stats">{author.books}</div>
            </div>
          )) : (
            <div className="special-empty">Scan library to see authors</div>
          )}
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-header">
          <h3>Quick Stats</h3>
          <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
        </div>
        <div className="quick-stats-grid">
          <div className="stat-mini-card">
            <span className="stat-val">{books.length}</span>
            <span className="stat-lab">Total</span>
          </div>
          <div className="stat-mini-card">
            <span className="stat-val">{books.filter(b => b.progress === 100).length}</span>
            <span className="stat-lab">Read</span>
          </div>
        </div>
      </section>
    </aside>
  );
}

export default RightSidebar;
