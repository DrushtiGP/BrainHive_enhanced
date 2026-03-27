import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateGroupPage from './components/CreateGroupPage';
import JoinGroupPage from './components/JoinGroupPage';
import SessionWindow from './components/SessionWindow';
import GroupMessages from './components/GroupChat';
import LandingPage from './components/LandingPage';
import './App.css';

const App = () => {
  const [isLoginPage, setIsLoginPage] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null); // Track the current group
  const [groups, setGroups] = useState([]); // Track the list of groups user is part of

  const handleGroupCreated = async (group) => {
    try {
      const sessionResponse = await axios.post('http://localhost:3001/sessions', {
        groupId: group.id,
        topic: 'Introductory Session', // Static topic for now
        timing: new Date(),
      });
      setCurrentGroup(group);
      //alert('Group and session created successfully!');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const fetchUserGroups = async () => {
    if (loggedInUser) {
      try {
        const response = await axios.get(`http://localhost:3001/groups/user/${loggedInUser.id}`);
        setGroups(response.data.groups);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    }
  };

  // Fetch groups whenever the user logs in
  useEffect(() => {
    fetchUserGroups();
  }, [loggedInUser]);

  return (
    <Router>
      <AppContent
        isLoginPage={isLoginPage}
        setIsLoginPage={setIsLoginPage}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loggedInUser={loggedInUser}
        setLoggedInUser={setLoggedInUser}
        currentGroup={currentGroup}
        setCurrentGroup={setCurrentGroup}
        handleGroupCreated={handleGroupCreated}
        groups={groups} // Pass groups to be used in messaging
      />
    </Router>
  );
};

const AppContent = ({
  isLoginPage, setIsLoginPage, name, setName, email, setEmail, password, setPassword,
  loginEmail, setLoginEmail, loginPassword, setLoginPassword, loggedInUser, setLoggedInUser,
  currentGroup, setCurrentGroup, handleGroupCreated, groups,
}) => {
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/register', { name, email, password });
      // Show success message and redirect to login page
      //alert(response.data.message);
      setIsLoginPage(true);
    } catch (error) {
     // alert('Registration failed. ' + (error.response?.data?.error || 'Error'));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/login', {
        email: loginEmail,
        password: loginPassword,
      });
      setLoggedInUser(response.data.user);
      // Redirect to home page after successful login
      navigate('/home');
    } catch (error) {
      //alert('Login failed. ' + (error.response?.data?.error || 'Error'));
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    navigate('/');
  };

  const togglePage = () => {
    setIsLoginPage(!isLoginPage);
  };

  const AuthPage = () => (
    <div className="auth-page">
      {!loggedInUser ? (
        <div className="auth-card">
          <div className="auth-brand">
            <h1>BrainHive Study Groups</h1>
            <p>Collaborate. Learn. Grow.</p>
          </div>

          {isLoginPage ? (
            <>
              <h2 className="auth-title">Welcome back</h2>
              <form className="auth-form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button type="submit" className="auth-btn">Login</button>
              </form>
              <div className="auth-toggle">
                Don't have an account?
                <button onClick={togglePage}>Register here</button>
              </div>
            </>
          ) : (
            <>
              <h2 className="auth-title">Create an account</h2>
              <form className="auth-form" onSubmit={handleRegister}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" className="auth-btn">Register</button>
              </form>
              <div className="auth-toggle">
                Already have an account?
                <button onClick={togglePage}>Login here</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="auth-card dashboard-area">
          <h2>Welcome, {loggedInUser.name}!</h2>
          <button onClick={() => navigate('/create-group')}>Create Group</button>
          <button onClick={() => navigate('/join-group')}>Join Group</button>
          <button onClick={() => navigate('/messages')}>Group Messages</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/home" element={<AuthPage />} />
      <Route
        path="/create-group"
        element={<CreateGroupPage loggedInUser={loggedInUser} onGroupCreated={handleGroupCreated} />}
      />
      <Route path="/join-group" element={<JoinGroupPage loggedInUser={loggedInUser} />} />
      <Route
        path="/sessions"
        element={<SessionWindow loggedInUser={loggedInUser} currentGroup={currentGroup} />}
      />
      <Route
        path="/messages"
        element={<GroupMessages loggedInUser={loggedInUser} groups={groups} />}
      />
    </Routes>
  );
};

export default App;
