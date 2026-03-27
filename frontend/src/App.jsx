import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser } from './store/authSlice';
import { addNotification } from './store/notificationsSlice';
import { fetchUserGroups } from './store/groupsSlice';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CreateGroupPage from './components/CreateGroupPage';
import JoinGroupPage from './components/JoinGroupPage';
import SessionWindow from './components/SessionWindow';
import GroupChat from './components/GroupChat';
import GroupHomePage from './components/GroupHomePage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import Notification from './components/Notification';
import './App.css';

const AuthPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', university: '', fieldOfStudy: '', yearOfStudy: '' });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email: form.email, password: form.password }));
    if (loginUser.fulfilled.match(result)) {
      dispatch(addNotification({ type: 'success', message: 'Logged in successfully!' }));
      if (result.payload.user?.id) dispatch(fetchUserGroups(result.payload.user.id));
      navigate('/home');
    } else {
      dispatch(addNotification({ type: 'error', message: result.payload || 'Login failed.' }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const result = await dispatch(registerUser({ name: form.name, email: form.email, password: form.password, university: form.university, fieldOfStudy: form.fieldOfStudy, yearOfStudy: form.yearOfStudy ? parseInt(form.yearOfStudy) : undefined }));
    if (registerUser.fulfilled.match(result)) {
      dispatch(addNotification({ type: 'success', message: 'Registered successfully!' }));
      if (result.payload.user?.id) dispatch(fetchUserGroups(result.payload.user.id));
      navigate('/home');
    } else {
      dispatch(addNotification({ type: 'error', message: result.payload || 'Registration failed.' }));
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center' }}>BrainHive</h1>
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={isLogin ? handleLogin : handleRegister}>
        {!isLogin && (
          <>
            <input type="text" placeholder="Full Name" value={form.name} onChange={set('name')} required style={{ width: '100%', marginBottom: 8, padding: 8, boxSizing: 'border-box' }} />
            <input type="text" placeholder="University / Institution" value={form.university} onChange={set('university')} style={{ width: '100%', marginBottom: 8, padding: 8, boxSizing: 'border-box' }} />
            <input type="text" placeholder="Field of Study (e.g. Computer Science)" value={form.fieldOfStudy} onChange={set('fieldOfStudy')} style={{ width: '100%', marginBottom: 8, padding: 8, boxSizing: 'border-box' }} />
            <select value={form.yearOfStudy} onChange={set('yearOfStudy')} style={{ width: '100%', marginBottom: 8, padding: 8, boxSizing: 'border-box' }}>
              <option value="">Year of Study (optional)</option>
              {[1,2,3,4,5,6,7,8].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </>
        )}
        <div>
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
        </div>
        <div>
          <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
        </div>
        <button type="submit" disabled={status === 'loading'} style={{ width: '100%', padding: 10 }}>
          {status === 'loading' ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 12 }}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc' }}>
          {isLogin ? 'Register here' : 'Login here'}
        </button>
      </p>
    </div>
  );
};

const UnauthorizedPage = () => (
  <div style={{ padding: 40, textAlign: 'center' }}>
    <h2>403 — Not Authorized</h2>
    <p>You don't have permission to view this page.</p>
  </div>
);

const App = () => (
  <Router>
    <Notification />
    <Header />
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/create-group" element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} />
      <Route path="/join-group" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />
      <Route path="/groups/:groupId" element={<ProtectedRoute><GroupHomePage /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute><SessionWindow /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleGuard requiredRole="admin" redirect>
              <AdminDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
    </Routes>
  </Router>
);

export default App;
