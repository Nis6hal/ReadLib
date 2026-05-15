import { Home, Library, Download, Mail, Phone, Settings, LogOut, BookOpen, RefreshCw } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from './Toast';
import './Sidebar.css';

function Sidebar() {
  const { scanDirectory, dirHandle } = useLibrary();
  const { addToast } = useToast();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const navItems = [
    { to: '/', icon: <Home size={22} />, label: 'Home', end: true },
    { to: '/library', icon: <Library size={22} />, label: 'Library' },
    { to: '/reading', icon: <BookOpen size={22} />, label: 'Reading' },
    { to: '/settings', icon: <Settings size={22} />, label: 'Settings' }
  ];

  const handleSync = async () => {
    if (!dirHandle) {
      addToast('Please select a library folder first', 'info');
      return;
    }
    setIsSyncing(true);
    try {
      await scanDirectory(dirHandle);
      addToast('Library synced with folder', 'success');
    } catch (err) {
      addToast('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

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
        <button 
          className={`nav-item sync-btn ${isSyncing ? 'spinning' : ''}`} 
          onClick={handleSync}
          title="Sync with folder"
          disabled={isSyncing}
        >
          <RefreshCw size={22} />
        </button>
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
