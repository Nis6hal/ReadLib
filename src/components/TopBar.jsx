import React, { useState } from 'react';
import { Search, Sun, Moon, Dices } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from './Toast';
import './TopBar.css';


function TopBar() {
  const { userName, theme, toggleTheme, books } = useLibrary();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

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
    <div className="top-bar">
      <nav className="top-nav">
        <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>Dashboard</NavLink>
        <NavLink to="/library" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Library</NavLink>
      </nav>
      
      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search books..."
          value={searchInput}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
      </div>
      
      <div className="top-actions">
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

