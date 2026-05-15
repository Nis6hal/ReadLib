import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Library, Download, Mail, Phone, Settings, LogOut, BookOpen } from 'lucide-react';
import './Sidebar.css';

function Sidebar() {
  const navItems = [
    { to: '/', icon: <Home size={22} />, label: 'Home', end: true },
    { to: '/library', icon: <Library size={22} />, label: 'Library' },
    { to: '/reading', icon: <BookOpen size={22} />, label: 'Reading' },
    { to: '/downloads', icon: <Download size={22} />, label: 'Downloads' },
    { to: '/messages', icon: <Mail size={22} />, label: 'Messages' },
    { to: '/contact', icon: <Phone size={22} />, label: 'Contact' },
    { to: '/settings', icon: <Settings size={22} />, label: 'Settings' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <BookOpen size={28} className="logo-icon" />
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            end={item.end}
            className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            {item.icon}
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <button className="nav-item logout-btn" title="Logout">
          <LogOut size={22} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
