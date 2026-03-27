import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials } from '../store/authSlice';
import RoleGuard from './RoleGuard';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/');
  };

  return (
    <nav style={{ padding: '12px 24px', background: '#1a1a2e', display: 'flex', gap: 16, alignItems: 'center' }}>
      <Link to="/home" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>BrainHive</Link>
      {user && (
        <>
          <Link to="/home" style={{ color: '#ccc', textDecoration: 'none' }}>Home</Link>
          <Link to="/create-group" style={{ color: '#ccc', textDecoration: 'none' }}>Create Group</Link>
          <Link to="/join-group" style={{ color: '#ccc', textDecoration: 'none' }}>Join Group</Link>
          <Link to="/messages" style={{ color: '#ccc', textDecoration: 'none' }}>Messages</Link>
          <Link to="/sessions" style={{ color: '#ccc', textDecoration: 'none' }}>Sessions</Link>
          <Link to="/profile" style={{ color: '#ccc', textDecoration: 'none' }}>Profile</Link>
          <RoleGuard requiredRole="admin">
            <Link to="/admin" style={{ color: '#f0a500', textDecoration: 'none', fontWeight: 'bold' }}>Admin Dashboard</Link>
          </RoleGuard>
          <span style={{ marginLeft: 'auto', color: '#ccc' }}>
            {user.name} ({user.role})
          </span>
          <button onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
        </>
      )}
    </nav>
  );
};

export default Header;
