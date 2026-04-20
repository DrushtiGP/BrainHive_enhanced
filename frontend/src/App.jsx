import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser } from './store/authSlice';
import { addNotification } from './store/notificationsSlice';
import { fetchUserGroups } from './store/groupsSlice';
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CreateGroupPage from './components/CreateGroupPage';
import JoinGroupPage from './components/JoinGroupPage';
import GroupHomePage from './components/GroupHomePage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import Notification from './components/Notification';
import PasswordInput from './components/PasswordInput';
import './App.css';

const FIELD_OPTIONS = [
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'software_engineering', label: 'Software Engineering' },
  { value: 'information_technology', label: 'Information Technology' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'electrical_engineering', label: 'Electrical Engineering' },
  { value: 'mechanical_engineering', label: 'Mechanical Engineering' },
  { value: 'civil_engineering', label: 'Civil Engineering' },
  { value: 'chemical_engineering', label: 'Chemical Engineering' },
  { value: 'aerospace_engineering', label: 'Aerospace Engineering' },
  { value: 'biomedical_engineering', label: 'Biomedical Engineering' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'dentistry', label: 'Dentistry' },
  { value: 'public_health', label: 'Public Health' },
  { value: 'veterinary', label: 'Veterinary' },
  { value: 'law', label: 'Law' },
  { value: 'political_science', label: 'Political Science' },
  { value: 'international_relations', label: 'International Relations' },
  { value: 'business_administration', label: 'Business Administration' },
  { value: 'finance', label: 'Finance' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'economics', label: 'Economics' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'statistics', label: 'Statistics' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'environmental_science', label: 'Environmental Science' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'sociology', label: 'Sociology' },
  { value: 'anthropology', label: 'Anthropology' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'urban_planning', label: 'Urban Planning' },
  { value: 'interior_design', label: 'Interior Design' },
  { value: 'graphic_design', label: 'Graphic Design' },
  { value: 'fine_arts', label: 'Fine Arts' },
  { value: 'music', label: 'Music' },
  { value: 'film_media', label: 'Film & Media' },
  { value: 'journalism', label: 'Journalism' },
  { value: 'communications', label: 'Communications' },
  { value: 'education', label: 'Education' },
  { value: 'linguistics', label: 'Linguistics' },
  { value: 'history', label: 'History' },
  { value: 'literature', label: 'Literature' },
  { value: 'theology', label: 'Theology' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'food_science', label: 'Food Science' },
  { value: 'sports_science', label: 'Sports Science' },
  { value: 'social_work', label: 'Social Work' },
  { value: 'other', label: 'Other' },
];

const AuthPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((state) => state.auth);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', fieldOfStudy: '', fieldOfStudyCustom: '' });

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
    if (form.password !== form.confirmPassword) {
      dispatch(addNotification({ type: 'error', message: 'Passwords do not match.' }));
      return;
    }
    const result = await dispatch(registerUser({ name: form.name, email: form.email, password: form.password, fieldOfStudy: form.fieldOfStudy || undefined, fieldOfStudyCustom: form.fieldOfStudyCustom || undefined }));
    if (registerUser.fulfilled.match(result)) {
      dispatch(addNotification({ type: 'success', message: 'Registered successfully!' }));
      if (result.payload.user?.id) dispatch(fetchUserGroups(result.payload.user.id));
      navigate('/home');
    } else {
      dispatch(addNotification({ type: 'error', message: result.payload || 'Registration failed.' }));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>BrainHive</h1>
          <p>Collaborate. Learn. Grow.</p>
        </div>
        <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Create an account'}</h2>
        <form className="auth-form" onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <>
              <input type="text" placeholder="Full Name" value={form.name} onChange={set('name')} required />
              <select value={form.fieldOfStudy} onChange={set('fieldOfStudy')}>
                <option value="">Field of Study (optional)</option>
                {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {form.fieldOfStudy === 'other' && (
                <input type="text" placeholder="Please specify your field" value={form.fieldOfStudyCustom} onChange={set('fieldOfStudyCustom')} maxLength={100} />
              )}
            </>
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <PasswordInput placeholder="Password" value={form.password} onChange={set('password')} required />
          {!isLogin && (
            <PasswordInput placeholder="Confirm Password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
          )}
          <button type="submit" className="auth-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <div className="auth-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UnauthorizedPage = () => (
  <div style={{ padding: 40, textAlign: 'center' }}>
    <h2>403 — Not Authorized</h2>
    <p>You don't have permission to view this page.</p>
  </div>
);

const AppLayout = () => {
  const location = useLocation();
  const showHeader = location.pathname !== '/';
  return (
    <>
      <Notification />
      {showHeader && <Header />}
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/create-group" element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} />
      <Route path="/join-group" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />
      <Route path="/groups/:groupId" element={<ProtectedRoute><GroupHomePage /></ProtectedRoute>} />
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
    </>
  );
};

const App = () => (
  <Router>
    <AppLayout />
  </Router>
);

export default App;
