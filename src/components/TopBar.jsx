import React from 'react';
import { Search, Bell, Mail } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import './TopBar.css';


function TopBar() {
  const { userName } = useLibrary();
  
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="top-bar">
      <nav className="top-nav">
        <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>Library</NavLink>
        <NavLink to="/library" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Books</NavLink>
        <NavLink to="/library" className="nav-link">Authors</NavLink>
      </nav>
      
      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input type="text" placeholder="Search here" />
      </div>
      
      <div className="top-actions">
        <button className="icon-btn"><Bell size={20} /></button>
        <button className="icon-btn"><Mail size={20} /></button>
        <div className="user-profile">
          <span className="user-name">{userName}</span>
          <div className="user-avatar-initials">{initials}</div>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
