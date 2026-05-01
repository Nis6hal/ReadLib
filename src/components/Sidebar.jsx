import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Library, User, Settings, Menu, X } from 'lucide-react';
import './Sidebar.css';

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'Home', end: true },
    { to: '/reading', icon: <BookOpen size={20} />, label: 'Continue Reading' },
    { to: '/library', icon: <Library size={20} />, label: 'Library' },
    { to: '/profile', icon: <User size={20} />, label: 'Profile' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' }
  ];

  return (
    <aside className={`sidebar glass-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-icon">
          <BookOpen size={24} color="var(--accent-primary)" />
        </div>
        {!collapsed && <h2>ReadLib</h2>}
        <button 
          className="sidebar-toggle btn-icon"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
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
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        {!collapsed && <p className="version">ReadLib v1.0.0</p>}
      </div>
    </aside>
  );
}

export default Sidebar;
