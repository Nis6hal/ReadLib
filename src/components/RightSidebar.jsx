import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  
  return (
    <aside className="right-sidebar">
      <section className="sidebar-section">
        <div className="section-header">
          <h3>Popular books</h3>
          <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
        </div>
        <div className="mini-book-list">
          {POPULAR_BOOKS.map(book => (
            <div key={book.id} className="mini-book-card">
              <img src={book.cover} alt={book.title} />
              <div className="mini-book-info">
                <h4>{book.title}</h4>
                <p>{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-header">
          <h3>Writers and Authors</h3>
          <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
        </div>
        <div className="author-list">
          {AUTHORS.map(author => (
            <div key={author.name} className="author-card">
              <img src={author.avatar} alt={author.name} />
              <div className="author-info">
                <h4>{author.name}</h4>
                <p>{author.books} books</p>
              </div>
              <div className="author-stats">{author.books}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-header">
          <h3>Special books</h3>
          <button className="show-all" onClick={() => navigate('/library')}>Show all</button>
        </div>
        <div className="special-empty">No special items yet.</div>
      </section>
    </aside>
  );
}

export default RightSidebar;
