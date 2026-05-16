import React from 'react';
import { Search, Sun, Moon, Github } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import './TopBar.css';


function TopBar() {
  const { userName, theme, toggleTheme } = useLibrary();
  
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
        <input type="text" placeholder="Search here" />
      </div>
      
      <div className="top-actions">
        <a href="https://github.com/nis6hal/ReadLib" target="_blank" rel="noopener noreferrer" className="icon-btn" title="View Source on GitHub">
          <Github size={20} />
        </a>
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
