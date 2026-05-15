import { Search, Bell, Mail } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './TopBar.css';

function TopBar() {
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
          <span className="user-name">Abhishek Saha</span>
          <img src="https://ui-avatars.com/api/?name=Abhishek+Saha&background=fbc02d&color=1e2f2f" alt="Profile" className="user-avatar" />
        </div>
      </div>
    </div>
  );
}

export default TopBar;
