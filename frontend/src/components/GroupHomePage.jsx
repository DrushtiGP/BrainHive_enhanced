import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroupById, respondToJoinRequest, removeMember, leaveGroup } from '../store/groupsSlice';
import { fetchMessages, sendMessage, clearMessages } from '../store/messagesSlice';
import { addNotification } from '../store/notificationsSlice';
import RoleGuard from './RoleGuard';
import BotMessage from './BotMessage';
import api from '../api';

const POLL_INTERVAL = 4000;
const MAX_LENGTH = 2000;

const GroupHomePage = () => {
  const { groupId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const group = useSelector((state) => state.groups.currentGroup);
  const groupError = useSelector((state) => state.groups.error);
  const user = useSelector((state) => state.auth.user);
  const messages = useSelector((state) => state.messages.messages);

  const [activeTab, setActiveTab] = useState('chat');
  const [text, setText] = useState('');
  const [sessions, setSessions] = useState([]);
  const [topic, setTopic] = useState('');
  const [timing, setTiming] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [summarizingId, setSummarizingId] = useState(null);
  const [sessionSummaries, setSessionSummaries] = useState({});
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

    // Intercept @bot messages — route to Study Buddy agent
    const botMatch = text.trim().match(/^@bot\s+(.+)/i);
    if (botMatch) {
      const question = botMatch[1];
      setText('');
      setBotLoading(true);
      // Send the user's original message first
      try {
        await dispatch(sendMessage({ groupId, userId: user.id, message: text.trim() })).unwrap();
      } catch {}
      // Then call Study Buddy agent
      try {
        await api.post('/agents/study-buddy', { groupId, userId: user.id, question });
        dispatch(fetchMessages(groupId));
      } catch (err) {
        dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Study Buddy unavailable.' }));
      } finally {
        setBotLoading(false);
      }
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

  const handleSummarize = async (sessionId) => {
    setSummarizingId(sessionId);
    try {
      const res = await api.post(`/agents/summarize/${sessionId}`);
      setSessionSummaries(prev => ({ ...prev, [sessionId]: res.data.summary }));
      dispatch(addNotification({ type: 'success', message: 'Session summarized!' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to summarize session.' }));
    } finally {
      setSummarizingId(null);
    }
  };

  const handleViewSummary = async (sessionId) => {
    if (sessionSummaries[sessionId]) return; // already loaded
    try {
      const res = await api.get(`/agents/summarize/${sessionId}`);
      if (res.data.summary) {
        setSessionSummaries(prev => ({ ...prev, [sessionId]: res.data.summary }));
      } else {
        dispatch(addNotification({ type: 'error', message: 'No summary available yet.' }));
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Could not load summary.' }));
    }
  };

  if (groupError) return (
    <div className="page-container">
      <p style={{ color: '#ef4444' }}>Failed to load group: {groupError}</p>
      <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => dispatch(fetchGroupById(groupId))}>
        Retry
      </button>
    </div>
  );

  if (!group) return <div className="page-container"><p style={{ color: '#9ca3af' }}>Loading group...</p></div>;

  const isLeader = Number(user?.id) === Number(group.creator_id);
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
          {/* Study Buddy hint */}
          <div style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 10,
            fontSize: 13,
            color: '#a5b4fc',
          }}>
            💡 Tip: Type <strong>@bot</strong> followed by your question to ask the Study Buddy AI assistant.
          </div>

          <div className="chat-window">
            {messages.length === 0 ? (
              <div className="empty-state">No messages yet. Say hello!</div>
            ) : (
              messages.map((msg, i) => (
                msg.is_bot ? (
                  <BotMessage
                    key={i}
                    content={msg.message}
                    time={new Date(msg.created_at).toLocaleTimeString()}
                  />
                ) : (
                  <div key={i} className="chat-message">
                    <span className={msg.user_id === user.id ? 'chat-message-you' : 'chat-message-other'}>
                      {msg.user_id === user.id ? 'You' : (msg.sender_name || `User ${msg.user_id}`)}
                    </span>
                    {': '}{msg.message}
                    <span className="chat-message-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                )
              ))
            )}
            {botLoading && (
              <div className="chat-message" style={{ color: '#818cf8', fontStyle: 'italic' }}>
                🤖 Study Buddy is thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="chat-input-row">
            <div style={{ flex: 1 }}>
              <input
                className="form-input"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message... or @bot <question>"
                maxLength={MAX_LENGTH}
                disabled={botLoading}
              />
              <div className="chat-char-count" style={{ color: text.length > MAX_LENGTH * 0.9 ? '#ef4444' : '#9ca3af' }}>
                {text.length}/{MAX_LENGTH}
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ height: 44 }} disabled={botLoading}>
              {botLoading ? '...' : 'Send'}
            </button>
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
                {Number(m.id) === Number(group.creator_id) && <span className="badge-leader">Leader</span>}
                {isLeader && Number(m.id) !== Number(group.creator_id) && (
                  <button className="btn-danger" style={{ marginLeft: 'auto' }} onClick={() => handleRemoveMember(m.id)}>Remove</button>
                )}
              </li>
            ))}
          </ul>

          {isLeader && pendingMembers.length > 0 && (
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

          {isLeader && pendingMembers.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 16 }}>No pending join requests.</p>
          )}
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
                <li key={s.id} className="session-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span className="session-topic">{s.topic}</span>
                      <span className="session-time">{new Date(s.timing).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isLeader && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => handleSummarize(s.id)}
                          disabled={summarizingId === s.id}
                        >
                          {summarizingId === s.id ? '⏳ Summarizing...' : '📝 Summarize'}
                        </button>
                      )}
                      {!isLeader && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => handleViewSummary(s.id)}
                        >
                          📄 View Summary
                        </button>
                      )}
                      {isLeader && (
                        <button className="btn-danger" onClick={() => handleDeleteSession(s.id)}>Delete</button>
                      )}
                    </div>
                  </div>

                  {/* AI Summary panel */}
                  {sessionSummaries[s.id] && (
                    <div style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      width: '100%',
                    }}>
                      <strong style={{ color: '#818cf8', fontSize: 13 }}>📋 AI Summary</strong>
                      <BotMessage content={sessionSummaries[s.id]} />
                    </div>
                  )}
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
