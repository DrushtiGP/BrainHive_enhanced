import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addNotification } from '../store/notificationsSlice';
import api from '../api';

const JoinGroupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [allGroups, setAllGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api.get('/groups')
      .then((res) => setAllGroups(res.data.groups || []))
      .catch(() => dispatch(addNotification({ type: 'error', message: 'Failed to fetch groups.' })));
  }, [dispatch]);

  const filtered = allGroups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedGroup = allGroups.find(g => g.id === parseInt(selectedGroupId));

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    setJoining(true);
    try {
      await api.post('/group-membership', { userId: user.id, groupId: selectedGroupId });
      dispatch(addNotification({ type: 'success', message: 'Join request sent!' }));
      navigate('/home');
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to join group.' }));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 24 }}>
      <h3>Join a Study Group</h3>

      <input
        type="text"
        placeholder="Search by name or description..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setSelectedGroupId(''); }}
        style={{ width: '100%', padding: 8, marginBottom: 12, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: 4 }}
      />

      {filtered.length === 0 ? (
        <p style={{ color: '#999' }}>{search ? 'No groups match your search.' : 'No groups available to join.'}</p>
      ) : (
        <div style={{ border: '1px solid #ccc', borderRadius: 4, maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
          {filtered.map((g) => (
            <div
              key={g.id}
              onClick={() => setSelectedGroupId(String(g.id))}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                background: selectedGroupId === String(g.id) ? '#e8f0fe' : 'white',
                transition: 'background 0.1s',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{g.name}</div>
              {g.description && <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{g.description}</div>}
            </div>
          ))}
        </div>
      )}

      {selectedGroup && (
        <div style={{ background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 4, padding: 12, marginBottom: 16 }}>
          <strong>Selected:</strong> {selectedGroup.name}
          {selectedGroup.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{selectedGroup.description}</p>}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={!selectedGroupId || joining}
        style={{ padding: '8px 20px', opacity: !selectedGroupId ? 0.5 : 1, cursor: !selectedGroupId ? 'not-allowed' : 'pointer' }}
      >
        {joining ? 'Sending...' : 'Send Join Request'}
      </button>
    </div>
  );
};

export default JoinGroupPage;
