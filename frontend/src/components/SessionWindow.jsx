import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserGroups } from '../store/groupsSlice';
import { addNotification } from '../store/notificationsSlice';
import RoleGuard from './RoleGuard';
import api from '../api';

const SessionWindow = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const groups = useSelector((state) => state.groups.list);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [topic, setTopic] = useState('');
  const [timing, setTiming] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) dispatch(fetchUserGroups(user.id));
  }, [user, dispatch]);

  useEffect(() => {
    if (!selectedGroupId) { setSessions([]); return; }
    setLoading(true);
    api.get('/sessions', { params: { groupId: selectedGroupId } })
      .then(res => setSessions(res.data.sessions || []))
      .catch(() => dispatch(addNotification({ type: 'error', message: 'Failed to load sessions.' })))
      .finally(() => setLoading(false));
  }, [selectedGroupId, dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sessions', { topic, timing, groupId: selectedGroupId });
      dispatch(addNotification({ type: 'success', message: 'Session created!' }));
      setTopic('');
      setTiming('');
      const res = await api.get('/sessions', { params: { groupId: selectedGroupId } });
      setSessions(res.data.sessions || []);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create session.' }));
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      dispatch(addNotification({ type: 'success', message: 'Session deleted.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete session.' }));
    }
  };

  const selectedGroup = groups.find(g => g.id === parseInt(selectedGroupId));
  const isLeader = selectedGroup && user?.id === selectedGroup.creator_id;

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2>Study Sessions</h2>

      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          style={{ padding: 8, minWidth: 220 }}
        >
          <option value="">Select a group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {selectedGroupId && (
        <>
          <h3>Upcoming Sessions</h3>
          {loading ? (
            <p style={{ color: '#999' }}>Loading...</p>
          ) : sessions.length === 0 ? (
            <p style={{ color: '#999' }}>No sessions scheduled yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
              {sessions.map((s) => (
                <li key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{s.topic}</strong>
                    <span style={{ marginLeft: 12, color: '#666', fontSize: 13 }}>
                      {new Date(s.timing).toLocaleString()}
                    </span>
                  </div>
                  {isLeader && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      style={{ color: 'red', background: 'none', border: '1px solid red', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isLeader && (
            <div>
              <h3>Schedule a New Session</h3>
              <form onSubmit={handleCreate}>
                <input
                  type="text"
                  placeholder="Session Topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  style={{ width: '100%', marginBottom: 8, padding: 8 }}
                />
                <input
                  type="datetime-local"
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  required
                  style={{ width: '100%', marginBottom: 8, padding: 8 }}
                />
                <button type="submit" style={{ padding: '8px 16px' }}>Create Session</button>
              </form>
            </div>
          )}
        </>
      )}

      {groups.length === 0 && (
        <p style={{ color: '#999' }}>You're not in any groups yet.</p>
      )}
    </div>
  );
};

export default SessionWindow;
