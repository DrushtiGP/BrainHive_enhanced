import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroupById, respondToJoinRequest, removeMember, leaveGroup } from '../store/groupsSlice';
import { fetchMessages, sendMessage, clearMessages } from '../store/messagesSlice';
import { addNotification } from '../store/notificationsSlice';
import BotMessage from './BotMessage';
import api from '../api';

const POLL_INTERVAL = 4000;
const MAX_LENGTH = 2000;

const card = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #ede9fe',
  padding: '28px',
  boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
};

const GroupHomePage = () => {
  const { groupId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const group = useSelector(s => s.groups.currentGroup);
  const groupError = useSelector(s => s.groups.error);
  const user = useSelector(s => s.auth.user);
  const messages = useSelector(s => s.messages.messages);

  const [activeTab, setActiveTab] = useState('chat');
  const [text, setText] = useState('');
  const [sessions, setSessions] = useState([]);
  const [topic, setTopic] = useState('');
  const [timing, setTiming] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [summarizingId, setSummarizingId] = useState(null);
  const [sessionSummaries, setSessionSummaries] = useState({});
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  // Flashcards
  const [flashcards, setFlashcards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [flipped, setFlipped] = useState({});
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  // Progress tracker
  const [progressTopics, setProgressTopics] = useState([]);
  const [progressRatings, setProgressRatings] = useState([]);
  const [progressOverview, setProgressOverview] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const pollingRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { dispatch(fetchGroupById(groupId)); }, [groupId, dispatch]);

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (activeTab !== 'sessions') return;
    setLoadingSessions(true);
    api.get('/sessions', { params: { groupId } })
      .then(res => setSessions(res.data.sessions || []))
      .catch(() => dispatch(addNotification({ type: 'error', message: 'Failed to load sessions.' })))
      .finally(() => setLoadingSessions(false));
  }, [activeTab, groupId, dispatch]);

  useEffect(() => {
    if (activeTab !== 'resources') return;
    fetchResources();
  }, [activeTab, groupId]);

  useEffect(() => {
    if (activeTab !== 'flashcards') return;
    fetchFlashcards();
  }, [activeTab, groupId]);

  useEffect(() => {
    if (activeTab !== 'progress') return;
    fetchProgress();
  }, [activeTab, groupId]);

  const fetchProgress = async () => {
    setLoadingProgress(true);
    try {
      const [topicsRes, ratingsRes] = await Promise.all([
        api.get(`/groups/${groupId}/progress/topics`),
        api.get(`/groups/${groupId}/progress/ratings`),
      ]);
      setProgressTopics(topicsRes.data.topics || []);
      setProgressRatings(ratingsRes.data.ratings || []);
      // If leader, also fetch overview
      if (ratingsRes.data.isLeader) {
        const overviewRes = await api.get(`/groups/${groupId}/progress/overview`);
        setProgressOverview(overviewRes.data);
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to load progress.' }));
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    // Reject nonsense input
    const words = newTopicName.trim().split(/\s+/);
    const hasRealWord = words.some(w => w.length >= 3);
    const isRepetitive = new Set(newTopicName.toLowerCase().replace(/\s/g, '')).size < 3;
    if (!hasRealWord || isRepetitive) {
      dispatch(addNotification({ type: 'error', message: 'Please enter a valid topic name.' }));
      return;
    }

    setAddingTopic(true);
    try {
      await api.post(`/groups/${groupId}/progress/topics`, { name: newTopicName });
      setNewTopicName('');
      fetchProgress();
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to add topic.' }));
    } finally {
      setAddingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Delete this topic and all ratings for it?')) return;
    try {
      await api.delete(`/groups/${groupId}/progress/topics/${topicId}`);
      fetchProgress();
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete topic.' }));
    }
  };

  const handleRating = async (topicId, status) => {
    try {
      await api.put(`/groups/${groupId}/progress/ratings`, { topicId, status });
      fetchProgress();
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to save rating.' }));
    }
  };

  const fetchFlashcards = async () => {
    setLoadingCards(true);
    try {
      const res = await api.get(`/groups/${groupId}/flashcards`);
      setFlashcards(res.data.flashcards || []);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to load flashcards.' }));
    } finally {
      setLoadingCards(false);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/groups/${groupId}/flashcards`, { front: cardFront, back: cardBack });
      dispatch(addNotification({ type: 'success', message: 'Flashcard added!' }));
      setCardFront(''); setCardBack('');
      fetchFlashcards();
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to add card.' }));
    }
  };

  const handleGenerateCards = async (e) => {
    e.preventDefault();
    if (!genTopic.trim()) return;

    // Basic sanity check — reject obvious nonsense
    const words = genTopic.trim().split(/\s+/);
    const hasRealWord = words.some(w => w.length >= 3);
    const isRepetitive = new Set(genTopic.toLowerCase().replace(/\s/g, '')).size < 3;
    if (!hasRealWord || isRepetitive) {
      dispatch(addNotification({ type: 'error', message: 'Please enter a valid academic topic.' }));
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post(`/groups/${groupId}/flashcards/generate`, { topic: genTopic, count: 6 });
      dispatch(addNotification({ type: 'success', message: res.data.message }));
      setGenTopic('');
      fetchFlashcards();
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Generation failed.' }));
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Delete this flashcard?')) return;
    try {
      await api.delete(`/groups/${groupId}/flashcards/${cardId}`);
      setFlashcards(prev => prev.filter(c => c.id !== cardId));
      dispatch(addNotification({ type: 'success', message: 'Flashcard deleted.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete.' }));
    }
  };

  const toggleFlip = (id) => setFlipped(prev => ({ ...prev, [id]: !prev[id] }));

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const res = await api.get(`/groups/${groupId}/resources`);
      setResources(res.data.resources || []);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to load resources.' }));
    } finally {
      setLoadingResources(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      dispatch(addNotification({ type: 'error', message: 'File too large. Max 10 MB.' }));
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/groups/${groupId}/resources`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      dispatch(addNotification({ type: 'success', message: 'File uploaded!' }));
      fetchResources();
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Upload failed.' }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await api.delete(`/groups/${groupId}/resources/${resourceId}`);
      setResources(prev => prev.filter(r => r.id !== resourceId));
      dispatch(addNotification({ type: 'success', message: 'File deleted.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete.' }));
    }
  };

  const formatSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  const fileIcon = (m) => {
    if (m === 'application/pdf') return '📄';
    if (m.startsWith('image/')) return '🖼️';
    if (m.includes('word')) return '📝';
    if (m.includes('powerpoint') || m.includes('presentation')) return '📊';
    if (m.includes('excel') || m.includes('spreadsheet')) return '📈';
    return '📎';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (text.length > MAX_LENGTH) {
      dispatch(addNotification({ type: 'error', message: `Message cannot exceed ${MAX_LENGTH} characters.` }));
      return;
    }
    const botMatch = text.trim().match(/^@bot\s+(.+)/i);
    if (botMatch) {
      const question = botMatch[1];
      setText('');
      setBotLoading(true);
      try { await dispatch(sendMessage({ groupId, userId: user.id, message: text.trim() })).unwrap(); } catch {}
      try {
        await api.post('/agents/study-buddy', { groupId, userId: user.id, question });
        dispatch(fetchMessages(groupId));
      } catch (err) {
        dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Study Buddy unavailable.' }));
      } finally { setBotLoading(false); }
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
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to summarize.' }));
    } finally { setSummarizingId(null); }
  };

  const handleViewSummary = async (sessionId) => {
    if (sessionSummaries[sessionId]) return;
    try {
      const res = await api.get(`/agents/summarize/${sessionId}`);
      if (res.data.summary) setSessionSummaries(prev => ({ ...prev, [sessionId]: res.data.summary }));
      else dispatch(addNotification({ type: 'error', message: 'No summary available yet.' }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Could not load summary.' }));
    }
  };

  if (groupError) return (
    <div className="page-container">
      <p style={{ color: '#ef4444' }}>Failed to load group: {groupError}</p>
      <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => dispatch(fetchGroupById(groupId))}>Retry</button>
    </div>
  );

  if (!group) return <div className="page-container"><p style={{ color: '#9ca3af' }}>Loading group...</p></div>;

  const isLeader = Number(user?.id) === Number(group.creator_id);
  const acceptedMembers = group.members?.filter(m => m.status === 'accepted') || [];
  const pendingMembers = group.members?.filter(m => m.status === 'pending') || [];
  const isMember = acceptedMembers.some(m => m.id === user?.id);
  const tabs = ['chat', 'members', 'sessions', 'resources', 'flashcards', 'progress'];
  const tabLabel = { chat: '💬 Chat', members: `👥 Members (${acceptedMembers.length})`, sessions: '📅 Sessions', resources: '📁 Resources', flashcards: '🃏 Flashcards', progress: '📊 Progress' };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 48px' }}>

        {/* Header banner */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          borderRadius: 20, padding: '36px 48px', marginBottom: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20, boxShadow: '0 8px 32px rgba(124,58,237,0.25)',
        }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, margin: 0 }}>{group.name}</h2>
            {group.description && <p style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0', fontSize: '1rem' }}>{group.description}</p>}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 14px', fontSize: 13, color: '#fff' }}>
                👥 {acceptedMembers.length} member{acceptedMembers.length !== 1 ? 's' : ''}
              </span>
              {isLeader && (
                <span style={{ background: 'rgba(251,191,36,0.25)', borderRadius: 20, padding: '4px 14px', fontSize: 13, color: '#fde68a', fontWeight: 600, border: '1px solid rgba(251,191,36,0.4)' }}>
                  ⭐ Group Leader
                </span>
              )}
            </div>
          </div>
          {isMember && !isLeader && (
            <button onClick={handleLeaveGroup} style={{
              background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
              border: '1.5px solid rgba(239,68,68,0.35)', borderRadius: 10,
              padding: '10px 22px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}>Leave Group</button>
          )}
        </div>

        {/* Pill tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 12, padding: '6px', marginBottom: 28, border: '1px solid #ede9fe', width: 'fit-content' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: activeTab === tab ? 700 : 500,
              background: activeTab === tab ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'transparent',
              color: activeTab === tab ? '#fff' : '#6b7280', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>
              {tabLabel[tab]}
            </button>
          ))}
        </div>

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
            <div style={card}>
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#6366f1' }}>
                💡 Type <strong>@bot</strong> followed by your question to ask the Study Buddy AI.
              </div>
              <div className="chat-window" style={{ minHeight: 420, maxHeight: 520 }}>
                {messages.length === 0
                  ? <div className="empty-state">No messages yet. Say hello!</div>
                  : messages.map((msg, i) => msg.is_bot
                    ? <BotMessage key={i} content={msg.message} time={new Date(msg.created_at).toLocaleTimeString()} />
                    : (
                      <div key={i} className="chat-message">
                        <span className={msg.user_id === user.id ? 'chat-message-you' : 'chat-message-other'}>
                          {msg.user_id === user.id ? 'You' : (msg.sender_name || `User ${msg.user_id}`)}
                        </span>
                        {': '}{msg.message}
                        <span className="chat-message-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                    )
                  )
                }
                {botLoading && <div className="chat-message" style={{ color: '#818cf8', fontStyle: 'italic' }}>🤖 Study Buddy is thinking...</div>}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="chat-input-row" style={{ marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <input className="form-input" type="text" value={text} onChange={e => setText(e.target.value)}
                    placeholder="Type a message... or @bot <question>" maxLength={MAX_LENGTH} disabled={botLoading} />
                  <div className="chat-char-count" style={{ color: text.length > MAX_LENGTH * 0.9 ? '#ef4444' : '#9ca3af' }}>{text.length}/{MAX_LENGTH}</div>
                </div>
                <button type="submit" className="btn-primary" style={{ height: 44 }} disabled={botLoading}>{botLoading ? '...' : 'Send'}</button>
              </form>
            </div>
            <div style={card}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px' }}>Members</h3>
              {acceptedMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: Number(m.id) === Number(group.creator_id) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700,
                  }}>{m.name?.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e1b4b' }}>{m.name}</div>
                    {Number(m.id) === Number(group.creator_id) && <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Leader</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 20px' }}>
                Members <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '2px 10px', fontSize: 12, marginLeft: 8 }}>{acceptedMembers.length}</span>
              </h3>
              {acceptedMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f3f0ff' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: Number(m.id) === Number(group.creator_id) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700,
                  }}>{m.name?.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1e1b4b' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{m.email}</div>
                  </div>
                  {Number(m.id) === Number(group.creator_id) && (
                    <span style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>Leader</span>
                  )}
                  {isLeader && Number(m.id) !== Number(group.creator_id) && (
                    <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleRemoveMember(m.id)}>Remove</button>
                  )}
                </div>
              ))}
            </div>
            <div style={card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 20px' }}>
                Pending Requests <span style={{ background: pendingMembers.length > 0 ? 'rgba(245,158,11,0.15)' : '#ede9fe', color: pendingMembers.length > 0 ? '#d97706' : '#7c3aed', borderRadius: 20, padding: '2px 10px', fontSize: 12, marginLeft: 8 }}>{pendingMembers.length}</span>
              </h3>
              {!isLeader
                ? <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Only the group leader can manage join requests.</p>
                : pendingMembers.length === 0
                  ? <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div><p style={{ margin: 0 }}>No pending requests.</p></div>
                  : pendingMembers.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f3f0ff' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 15, fontWeight: 700 }}>{m.name?.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1e1b4b' }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{m.email}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-success" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleMembershipResponse(m.id, 'accepted')}>Accept</button>
                        <button className="btn-danger" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleMembershipResponse(m.id, 'rejected')}>Reject</button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
            <div style={card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 20px' }}>Scheduled Sessions</h3>
              {loadingSessions
                ? <div className="empty-state">Loading sessions...</div>
                : sessions.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}><div style={{ fontSize: 40, marginBottom: 12 }}>📅</div><p style={{ margin: 0 }}>No sessions scheduled yet.</p></div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sessions.map(s => (
                      <div key={s.id} style={{ border: '1px solid #ede9fe', borderRadius: 12, padding: '16px 20px', background: '#fafafa' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: '1rem' }}>{s.topic}</div>
                            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>🕐 {new Date(s.timing).toLocaleString()}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {isLeader
                              ? <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleSummarize(s.id)} disabled={summarizingId === s.id}>{summarizingId === s.id ? '⏳...' : '📝 Summarize'}</button>
                              : <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleViewSummary(s.id)}>📄 Summary</button>
                            }
                            {isLeader && <button className="btn-danger" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => handleDeleteSession(s.id)}>Delete</button>}
                          </div>
                        </div>
                        {sessionSummaries[s.id] && (
                          <div style={{ marginTop: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '12px 16px' }}>
                            <div style={{ color: '#6366f1', fontWeight: 600, fontSize: 12, marginBottom: 6 }}>📋 AI Summary</div>
                            <BotMessage content={sessionSummaries[s.id]} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
              }
            </div>
            {isLeader && (
              <div style={card}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 20px' }}>Schedule a New Session</h3>
                <form onSubmit={handleCreateSession}>
                  <div className="form-group">
                    <label className="form-label">Topic</label>
                    <input className="form-input" type="text" placeholder="e.g. Binary Trees Deep Dive" value={topic} onChange={e => setTopic(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" value={timing} onChange={e => setTiming(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Session</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* RESOURCES TAB */}
        {activeTab === 'resources' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
            <div style={card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 20px' }}>
                Shared Files <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '2px 10px', fontSize: 12, marginLeft: 8 }}>{resources.length}</span>
              </h3>
              {loadingResources
                ? <div className="empty-state">Loading resources...</div>
                : resources.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div><p style={{ margin: 0 }}>No files uploaded yet.</p></div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {resources.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: '1px solid #ede9fe', background: '#fafafa' }}>
                        <div style={{ width: 46, height: 46, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{fileIcon(r.mimetype)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.original_name}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{formatSize(r.size)} · {r.uploader_name} · {new Date(r.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <a href={`http://localhost:3001/groups/${groupId}/resources/${r.id}/download`} download={r.original_name}
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                            ⬇ Download
                          </a>
                          {(r.uploader_id === user?.id || isLeader) && (
                            <button className="btn-danger" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleDeleteResource(r.id)}>Delete</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
            <div style={card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 16px' }}>Upload a File</h3>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#f5f3ff'; }}
                onDragLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                onDrop={e => {
                  e.preventDefault(); e.currentTarget.style.background = 'transparent';
                  const file = e.dataTransfer.files[0];
                  if (file) { const dt = new DataTransfer(); dt.items.add(file); fileInputRef.current.files = dt.files; handleFileUpload({ target: fileInputRef.current }); }
                }}
                style={{ border: '2px dashed #c4b5fd', borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>☁️</div>
                <p style={{ color: '#7c3aed', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>{uploading ? 'Uploading...' : 'Click or drag & drop'}</p>
                <p style={{ color: '#9ca3af', fontSize: '0.78rem', marginTop: 6 }}>PDF, Word, PowerPoint, Excel, images — max 10 MB</p>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileUpload} disabled={uploading} />
              </div>
              <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Guidelines</p>
                <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12, color: '#6b7280', lineHeight: 1.8 }}>
                  <li>Max file size: 10 MB</li>
                  <li>All members can upload</li>
                  <li>Leaders can delete any file</li>
                  <li>You can delete your own files</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* FLASHCARDS TAB */}
        {activeTab === 'flashcards' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

            {/* Card grid */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: 0 }}>
                  Flashcards
                  <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '2px 10px', fontSize: 12, marginLeft: 10 }}>{flashcards.length}</span>
                </h3>
              </div>

              {loadingCards ? (
                <div className="empty-state">Loading flashcards...</div>
              ) : flashcards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
                  <p style={{ margin: 0 }}>No flashcards yet.</p>
                  <p style={{ marginTop: 6, fontSize: 13 }}>Create one manually or generate with AI.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {flashcards.map(c => (
                    <div key={c.id}
                      onClick={() => toggleFlip(c.id)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 14,
                        border: `2px solid ${flipped[c.id] ? '#7c3aed' : '#ede9fe'}`,
                        background: flipped[c.id] ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#fff',
                        padding: '24px 20px',
                        minHeight: 140,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.25s ease',
                        boxShadow: flipped[c.id] ? '0 6px 20px rgba(124,58,237,0.25)' : '0 2px 8px rgba(124,58,237,0.06)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: flipped[c.id] ? 'rgba(255,255,255,0.6)' : '#9ca3af', marginBottom: 10 }}>
                        {flipped[c.id] ? 'ANSWER' : 'QUESTION'}
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: flipped[c.id] ? '#fff' : '#1e1b4b', lineHeight: 1.5, flex: 1 }}>
                        {flipped[c.id] ? c.back : c.front}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                        <span style={{ fontSize: 11, color: flipped[c.id] ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
                          {flipped[c.id] ? 'Click to flip back' : 'Click to reveal'}
                        </span>
                        {(c.creator_id === user?.id || isLeader) && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteCard(c.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: flipped[c.id] ? 'rgba(255,255,255,0.5)' : '#d1d5db', padding: 0 }}
                          >🗑</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right panel — create + generate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* AI Generate */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✨</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e1b4b' }}>AI Generate</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Generate 6 cards from a topic</p>
                  </div>
                </div>
                <form onSubmit={handleGenerateCards}>
                  <div className="form-group">
                    <label className="form-label">Topic</label>
                    <input className="form-input" type="text" placeholder="e.g. Binary Search Trees"
                      value={genTopic} onChange={e => setGenTopic(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={generating}>
                    {generating ? '⏳ Generating...' : '✨ Generate Flashcards'}
                  </button>
                </form>
              </div>

              {/* Manual create */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✏️</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e1b4b' }}>Add Manually</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Write your own card</p>
                  </div>
                </div>
                <form onSubmit={handleAddCard}>
                  <div className="form-group">
                    <label className="form-label">Question / Term</label>
                    <input className="form-input" type="text" placeholder="What is Big O notation?"
                      value={cardFront} onChange={e => setCardFront(e.target.value)} maxLength={500} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Answer / Definition</label>
                    <textarea className="form-input" placeholder="A way to describe algorithm efficiency..."
                      value={cardBack} onChange={e => setCardBack(e.target.value)} maxLength={1000} required
                      style={{ minHeight: 90, resize: 'vertical' }} />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>+ Add Card</button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

            {/* Main content — member view or leader heatmap */}
            <div style={card}>
              {loadingProgress ? (
                <div className="empty-state">Loading progress...</div>
              ) : progressTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <p style={{ margin: 0 }}>No topics yet.</p>
                  <p style={{ marginTop: 6, fontSize: 13 }}>
                    {isLeader ? 'Add topics using the panel on the right.' : 'The group leader hasn\'t added any topics yet.'}
                  </p>
                </div>
              ) : isLeader && progressOverview ? (
                /* ── Leader: Heatmap grid ── */
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 20px' }}>
                    Group Progress Overview
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 600, borderBottom: '2px solid #ede9fe', minWidth: 160 }}>Topic</th>
                          {progressOverview.members.map(m => (
                            <th key={m.id} style={{ padding: '8px 10px', color: '#6b7280', fontWeight: 600, borderBottom: '2px solid #ede9fe', textAlign: 'center', minWidth: 90 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, margin: '0 auto 4px' }}>
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>{m.name.split(' ')[0]}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {progressOverview.topics.map((topic, ti) => (
                          <tr key={topic.id} style={{ background: ti % 2 === 0 ? '#fafafa' : '#fff' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e1b4b', borderBottom: '1px solid #f3f0ff' }}>{topic.name}</td>
                            {progressOverview.members.map(m => {
                              const status = progressOverview.ratingMap[topic.id]?.[m.id];
                              const cfg = {
                                understood: { bg: 'rgba(22,163,74,0.15)', color: '#16a34a', icon: '✅' },
                                reviewing:  { bg: 'rgba(245,158,11,0.15)', color: '#d97706', icon: '🔄' },
                                struggling: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626', icon: '❗' },
                              }[status] || { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af', icon: '—' };
                              return (
                                <td key={m.id} style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f3f0ff' }}>
                                  <span style={{
                                    display: 'inline-block', background: cfg.bg, color: cfg.color,
                                    borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600,
                                  }}>
                                    {cfg.icon}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                    {[['✅', 'Understood', '#16a34a'], ['🔄', 'Reviewing', '#d97706'], ['❗', 'Struggling', '#dc2626'], ['—', 'Not rated', '#9ca3af']].map(([icon, label, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color }}>
                        <span>{icon}</span><span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Member: own rating cards ── */
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 20px' }}>
                    My Progress
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {progressTopics.map(topic => {
                      const myRating = progressRatings.find(r => r.topic_id === topic.id);
                      const status = myRating?.status;
                      return (
                        <div key={topic.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 18px', borderRadius: 12,
                          border: `1.5px solid ${status === 'understood' ? 'rgba(22,163,74,0.3)' : status === 'reviewing' ? 'rgba(245,158,11,0.3)' : status === 'struggling' ? 'rgba(239,68,68,0.3)' : '#ede9fe'}`,
                          background: status === 'understood' ? 'rgba(22,163,74,0.05)' : status === 'reviewing' ? 'rgba(245,158,11,0.05)' : status === 'struggling' ? 'rgba(239,68,68,0.05)' : '#fafafa',
                        }}>
                          <span style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.95rem' }}>{topic.name}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[
                              { s: 'understood', icon: '✅', label: 'Got it', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
                              { s: 'reviewing',  icon: '🔄', label: 'Reviewing', color: '#d97706', bg: 'rgba(245,158,11,0.12)' },
                              { s: 'struggling', icon: '❗', label: 'Struggling', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
                            ].map(({ s, icon, label, color, bg }) => (
                              <button key={s} onClick={() => handleRating(topic.id, s)} style={{
                                background: status === s ? bg : 'transparent',
                                border: `1.5px solid ${status === s ? color : '#e5e7eb'}`,
                                borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                                fontSize: 12, fontWeight: status === s ? 700 : 400,
                                color: status === s ? color : '#9ca3af',
                                transition: 'all 0.15s',
                              }}>
                                {icon} {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right panel — leader: add topics; member: summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isLeader && (
                <div style={card}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 16px' }}>Manage Topics</h3>
                  <form onSubmit={handleAddTopic} style={{ marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">New Topic</label>
                      <input className="form-input" type="text" placeholder="e.g. Binary Search Trees"
                        value={newTopicName} onChange={e => setNewTopicName(e.target.value)} maxLength={200} required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={addingTopic}>
                      {addingTopic ? 'Adding...' : '+ Add Topic'}
                    </button>
                  </form>
                  {progressTopics.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Current topics:</p>
                      {progressTopics.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f0ff' }}>
                          <span style={{ fontSize: 13, color: '#1e1b4b' }}>{t.name}</span>
                          <button onClick={() => handleDeleteTopic(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: 0 }}>🗑</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Summary card */}
              <div style={card}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 14px' }}>Summary</h3>
                {progressTopics.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>No topics yet.</p>
                ) : isLeader && progressOverview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['struggling', 'reviewing', 'understood'].map(s => {
                      const count = Object.values(progressOverview.ratingMap).reduce((acc, memberMap) =>
                        acc + Object.values(memberMap).filter(v => v === s).length, 0);
                      const cfg = { understood: { color: '#16a34a', icon: '✅', label: 'Understood' }, reviewing: { color: '#d97706', icon: '🔄', label: 'Reviewing' }, struggling: { color: '#dc2626', icon: '❗', label: 'Struggling' } }[s];
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: `${cfg.color}15` }}>
                          <span style={{ fontSize: 13, color: cfg.color, fontWeight: 600 }}>{cfg.icon} {cfg.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['struggling', 'reviewing', 'understood'].map(s => {
                      const count = progressRatings.filter(r => r.status === s).length;
                      const cfg = { understood: { color: '#16a34a', icon: '✅', label: 'Understood' }, reviewing: { color: '#d97706', icon: '🔄', label: 'Reviewing' }, struggling: { color: '#dc2626', icon: '❗', label: 'Struggling' } }[s];
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: `${cfg.color}15` }}>
                          <span style={{ fontSize: 13, color: cfg.color, fontWeight: 600 }}>{cfg.icon} {cfg.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{count} / {progressTopics.length}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GroupHomePage;
