import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroupById, respondToJoinRequest, removeMember, leaveGroup } from '../store/groupsSlice';
import { fetchMessages, sendMessage, clearMessages } from '../store/messagesSlice';
import { addNotification } from '../store/notificationsSlice';
import RoleGuard from './RoleGuard';
import api from '../api';

const POLL_INTERVAL = 4000;
const MAX_LENGTH = 2000;

const GroupHomePage = () => {
  const { groupId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const group = useSelector((state) => state.groups.currentGroup);
  const user = useSelector((state) => state.auth.user);
  const messages = useSelector((state) => state.messages.messages);

  const [activeTab, setActiveTab] = useState('chat');
  const [text, setText] = useState('');
  const [sessions, setSessions] = useState([]);
  const [topic, setTopic] = useState('');
  const [timing, setTiming] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const pollingRef = useRef(null);
  const bottomRef = useRef(null);

  // Fetch group details
  useEffect(() => {
    dispatch(fetchGroupById(groupId));
  }, [groupId, dispatch]);

  // Chat polling — only when chat tab is active
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (activeTab === 'chat') {
      dispatch(fetchMessages(groupId));
      pollingRef.current = setInterval(() => dispatch(fetchMessages(groupId)), POLL_INTERVAL);
    } else {
      dispatch(clearMessages());
    }
    return () => clearInterval(pollingRef.current);
  }, [activeTab, groupId, dispatch]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions when sessions tab is active
  useEffect(() => {
    if (activeTab !== 'sessions') return;
    setLoadingSessions(true);
    api.get('/sessions', { params: { groupId } })
      .then(res => setSessions(res.data.sessions || []))
      .catch(() => dispatch(addNotification({ type: 'error', message: 'Failed to load sessions.' })))
      .finally(() => setLoadingSessions(false));
  }, [activeTab, groupId, dispatch]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (text.length > MAX_LENGTH) {
      dispatch(addNotification({ type: 'error', message: `Message cannot exceed ${MAX_LENGTH} characters.` }));
      return;
    }
    try {
      await dispatch(sendMessage({ groupId, userId: user.id, message: text })).unwrap();
      setText('');
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to send message.' }));
    }
  };

  const handleMembershipResponse = async (memberId, status) => {
    try {
      await dispatch(respondToJoinRequest({ groupId, memberId, status })).unwrap();
      dispatch(addNotification({ type: 'success', message: `Request ${status}.` }));
      dispatch(fetchGroupById(groupId));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to update membership.' }));
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await dispatch(removeMember({ groupId, memberId })).unwrap();
      dispatch(addNotification({ type: 'success', message: 'Member removed.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to remove member.' }));
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await dispatch(leaveGroup({ groupId, userId: user.id })).unwrap();
      dispatch(addNotification({ type: 'success', message: 'You have left the group.' }));
      navigate('/home');
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to leave group.' }));
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sessions', { topic, timing, groupId });
      dispatch(addNotification({ type: 'success', message: 'Session created!' }));
      setTopic(''); setTiming('');
      const res = await api.get('/sessions', { params: { groupId } });
      setSessions(res.data.sessions || []);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create session.' }));
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      dispatch(addNotification({ type: 'success', message: 'Session deleted.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete session.' }));
    }
  };

  if (!group) return <div className="page-container"><p style={{ color: '#9ca3af' }}>Loading group...</p></div>;

  const isLeader = user?.id === group.creator_id;
  const acceptedMembers = group.members?.filter(m => m.status === 'accepted') || [];
  const pendingMembers = group.members?.filter(m => m.status === 'pending') || [];
  const isMember = acceptedMembers.some(m => m.id === user?.id);

  const tabs = ['chat', 'members', 'sessions'];

  return (
    <div className="page-container-wide">
      {/* Group header */}
      <div className="group-header">
        <div>
          <h2>{group.name}</h2>
          <p>{group.description}</p>
        </div>
        {isMember && !isLeader && (
          <button className="btn-danger" onClick={handleLeaveGroup}>Leave Group</button>
        )}
      </div>

        {/* Tabs */}
        <div className="tab-bar">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`tab-btn${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'chat' ? 'Chat' : tab === 'members' ? `Members (${acceptedMembers.length})` : 'Sessions'}
            </button>
          ))}
        </div>

        {/* ── CHAT TAB ── */}
        {activeTab === 'chat' && (
          <div>
            <div className="chat-window">
              {messages.length === 0 ? (
                <div className="empty-state">No messages yet. Say hello!</div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className="chat-message">
                    <span className={msg.user_id === user.id ? 'chat-message-you' : 'chat-message-other'}>
                      {msg.user_id === user.id ? 'You' : (msg.sender_name || `User ${msg.user_id}`)}
                    </span>
                    {': '}{msg.message}
                    <span className="chat-message-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="chat-input-row">
              <div style={{ flex: 1 }}>
                <input className="form-input" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." maxLength={MAX_LENGTH} />
                <div className="chat-char-count" style={{ color: text.length > MAX_LENGTH * 0.9 ? '#ef4444' : '#9ca3af' }}>{text.length}/{MAX_LENGTH}</div>
              </div>
              <button type="submit" className="btn-primary" style={{ height: 44 }}>Send</button>
            </form>
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <div>
            <ul className="member-list">
              {acceptedMembers.map((m) => (
                <li key={m.id} className="member-item">
                  <span className="member-name">{m.name}</span>
                  <span className="member-email">({m.email})</span>
                  {m.id === group.creator_id && <span className="badge-leader">Leader</span>}
                  <RoleGuard creatorId={group.creator_id}>
                    {m.id !== group.creator_id && (
                      <button className="btn-danger" style={{ marginLeft: 'auto' }} onClick={() => handleRemoveMember(m.id)}>Remove</button>
                    )}
                  </RoleGuard>
                </li>
              ))}
            </ul>

            <RoleGuard creatorId={group.creator_id}>
              {pendingMembers.length > 0 && (
                <div>
                  <h3 className="section-heading">Pending Requests ({pendingMembers.length})</h3>
                  <ul className="member-list">
                    {pendingMembers.map((m) => (
                      <li key={m.id} className="member-item">
                        <span className="member-name">{m.name}</span>
                        <span className="member-email">({m.email})</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <button className="btn-success" onClick={() => handleMembershipResponse(m.id, 'accepted')}>Accept</button>
                          <button className="btn-danger" onClick={() => handleMembershipResponse(m.id, 'rejected')}>Reject</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </RoleGuard>
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {activeTab === 'sessions' && (
          <div>
            {loadingSessions ? (
              <div className="empty-state">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="empty-state">No sessions scheduled yet.</div>
            ) : (
              <ul className="session-list">
                {sessions.map((s) => (
                  <li key={s.id} className="session-item">
                    <div style={{ flex: 1 }}>
                      <span className="session-topic">{s.topic}</span>
                      <span className="session-time">{new Date(s.timing).toLocaleString()}</span>
                    </div>
                    {isLeader && <button className="btn-danger" onClick={() => handleDeleteSession(s.id)}>Delete</button>}
                  </li>
                ))}
              </ul>
            )}

            {isLeader && (
              <div style={{ marginTop: 28 }}>
                <h3 className="section-heading">Schedule a New Session</h3>
                <form onSubmit={handleCreateSession}>
                  <div className="form-group">
                    <label className="form-label">Topic</label>
                    <input className="form-input" type="text" placeholder="Session topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" value={timing} onChange={(e) => setTiming(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary">Create Session</button>
                </form>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default GroupHomePage;
