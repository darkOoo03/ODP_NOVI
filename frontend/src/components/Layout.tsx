import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  Box, 
  Activity, 
  GitCompare, 
  ClipboardList, 
  Award, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  UserCheck
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Da li ste sigurni da želite da se odjavite?')) {
      await logout();
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/hives', label: 'Moje košnice', icon: <Box size={20} /> },
    { path: '/queens', label: 'Moje matice', icon: <Activity size={20} /> },
    { path: '/assignments', label: 'Dodele matica', icon: <GitCompare size={20} /> },
    { path: '/quality-checks', label: 'Pregledi kvaliteta', icon: <ClipboardList size={20} /> },
    { path: '/ranking', label: 'Rang lista', icon: <Award size={20} /> },
    { path: '/profile', label: 'Moj Profil', icon: <User size={20} /> },
  ];

  const adminMenuItems = [
    { path: '/admin', label: 'Admin Panel', icon: <Settings size={20} /> },
  ];

  const activeClass = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return 'nav-item active';
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return 'nav-item active';
    return 'nav-item';
  };

  const getAvatarUrl = (path: string | null) => {
    if (!path) return '/default-avatar.png'; // Handled via CSS if image fails
    return `http://localhost:5000${path}`;
  };

  return (
    <div className="app-layout">
      {/* Mobile Topbar */}
      <header className="mobile-header">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="brand-name">Queen Tracker</span>
        <div className="mobile-user">
          <img 
            src={getAvatarUrl(user?.avatar || null)} 
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }}
            alt="Avatar" 
          />
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-icon">🐝</div>
          <span>Queen Tracker</span>
        </div>

        <div className="user-profile-summary">
          <div className="user-avatar-container">
            <img 
              src={getAvatarUrl(user?.avatar || null)} 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }}
              alt="Profile" 
            />
          </div>
          <div className="user-info-text">
            <h4>{user ? `${user.first_name} ${user.last_name}` : ''}</h4>
            <p className="user-role-badge">
              {user?.role === 'admin' ? 'Administrator' : 'Pčelar'}
            </p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-title">Meni</p>
          <ul>
            {menuItems.map((item) => (
              <li key={item.path} onClick={() => setSidebarOpen(false)}>
                <Link to={item.path} className={activeClass(item.path)}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {user?.role === 'admin' && (
            <>
              <p className="nav-section-title">Administracija</p>
              <ul>
                {adminMenuItems.map((item) => (
                  <li key={item.path} onClick={() => setSidebarOpen(false)}>
                    <Link to={item.path} className={activeClass(item.path)}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="sidebar-footer">
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={20} />
              <span>Odjavi se</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Desktop Header */}
        <header className="desktop-header">
          <div className="header-breadcrumbs">
            {location.pathname.split('/').filter(x => x).map((crumb, idx, arr) => (
              <span key={idx}>
                {crumb.charAt(0).toUpperCase() + crumb.slice(1)}
                {idx < arr.length - 1 && <span className="separator">/</span>}
              </span>
            ))}
          </div>
          <div className="header-user-actions">
            <span className="user-display-name">
              Zdravo, <strong>{user?.first_name}</strong>
            </span>
            <div className="header-avatar" onClick={() => navigate('/profile')}>
              <img 
                src={getAvatarUrl(user?.avatar || null)} 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }}
                alt="Profile" 
              />
            </div>
          </div>
        </header>

        <main className="content-container animated fadeIn">
          {children}
        </main>
      </div>

      {/* Overlay when sidebar open on mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default Layout;
