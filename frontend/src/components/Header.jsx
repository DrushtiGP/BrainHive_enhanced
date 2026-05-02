import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials } from '../store/authSlice';
import RoleGuard from './RoleGuard';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    color: isActive(path) ? '#a78bfa' : '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: isActive(path) ? 600 : 400,
    padding: '4px 2px',
    borderBottom: isActive(path) ? '2px solid #a78bfa' : '2px solid transparent',
    transition: 'color 0.2s',
  });

  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <nav style={{
      padding: '0 48px',
      background: '#0f0f1a',
      display: 'flex',
      alignItems: 'center',
      height: 56,
      gap: 28,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand */}
      <Link to="/home" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.3px', marginRight: 8 }}>
        Brain<span style={{ color: '#a78bfa' }}>Hive</span>
      </Link>

      {user && (
        <>
          {/* Hide regular nav on admin page */}
          {!isAdminPage && (
            <>
              <Link to="/home" style={linkStyle('/home')}>Home</Link>
              <Link to="/create-group" style={linkStyle('/create-group')}>Create Group</Link>
              <Link to="/join-group" style={linkStyle('/join-group')}>Join Group</Link>
              <Link to="/profile" style={linkStyle('/profile')}>Profile</Link>
            </>
          )}
          <RoleGuard requiredRole="admin">
            <Link to="/admin" style={{ ...linkStyle('/admin'), color: isActive('/admin') ? '#fbbf24' : '#f0a500' }}>Admin</Link>
          </RoleGuard>

          {/* Right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 20, padding: '4px 12px 4px 4px',
            }}>
              {/* Avatar circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.75rem', fontWeight: 700,
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 500 }}>
                {user.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                padding: '5px 14px',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.22)'}
              onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.12)'}
            >
              Logout
            </button>
          </div>
        </>
      )}
    </nav>
  );
};

export default Header;
