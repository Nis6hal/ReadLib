import React, { useState } from 'react';
import { Search, Sun, Moon, Dices } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from './Toast';
import './TopBar.css';


function TopBar() {
  const { userName, theme, toggleTheme, books } = useLibrary();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchInput, setSearchInput] = useState('');

  // Hide TopBar in reading mode
  if (location.pathname.startsWith('/read/')) return null;

  const handleRoulette = () => {
    if (!books || books.length === 0) {
      addToast("Add some books first to play Book Roulette! 🎲", 'info');
      return;
    }
    const randomIndex = Math.floor(Math.random() * books.length);
    const randomBook = books[randomIndex];
    addToast(`The universe chose: ${randomBook.title} 🎲`, 'success');
    navigate(`/read/${encodeURIComponent(randomBook.id)}`);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (val.trim()) {
      navigate(`/library?search=${encodeURIComponent(val.trim())}`);
    } else {
      navigate('/library');
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchInput('');
      navigate('/library');
      e.target.blur();
    }
  };
  
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="app-header-container">
      <nav className="app-header-nav">
        <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>Dashboard</NavLink>
        <NavLink to="/library" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Library</NavLink>
      </nav>
      
      <div className="app-header-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search books..."
          value={searchInput}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
      </div>
      
      <div className="app-header-actions">
        <button className="icon-btn" onClick={handleRoulette} title="Book Roulette 🎲">
          <Dices size={20} />
        </button>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="user-profile">
          <span className="user-name">{userName}</span>
          <div className="user-avatar-initials">{initials}</div>
        </div>
      </div>
    </div>
  );
}

export default TopBar;

