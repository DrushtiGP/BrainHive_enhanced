import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addNotification } from '../store/notificationsSlice';
import api from '../api';

const Icon = ({ d, size = 16, color = '#7c3aed' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d={d} />
  </svg>
);

const howItWorks = [
  {
    icon: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
    title: 'Search',
    desc: 'Type a keyword to filter groups by name or description.',
  },
  {
    icon: 'M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3',
    title: 'Request to join',
    desc: 'Select a group and send a join request to the group leader.',
  },
  {
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    title: 'Wait for approval',
    desc: 'The group leader will accept or reject your request.',
  },
  {
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    title: 'Start collaborating',
    desc: 'Once accepted, you can chat and join study sessions.',
  },
];

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

  const handleJoin = async () => {
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
    <div className="page-container-wide">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>

        {/* Left */}
        <div>
          <h2 className="page-title">Join a Study Group</h2>
          <p className="page-subtitle">Find a group that matches your interests.</p>

          <div style={{ marginTop: 32 }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search by name or description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedGroupId(''); }}
            />

            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0', textAlign: 'left' }}>
                {search ? 'No groups match your search.' : 'No groups available to join.'}
              </div>
            ) : (
              <div className="group-search-list">
                {filtered.map((g) => (
                  <div
                    key={g.id}
                    className={`group-search-item${selectedGroupId === String(g.id) ? ' selected' : ''}`}
                    onClick={() => setSelectedGroupId(String(g.id))}
                  >
                    <div style={{ fontWeight: 600, color: '#1e1b4b' }}>{g.name}</div>
                    {g.description && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{g.description}</div>}
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ marginTop: 16, width: '100%' }}
              onClick={handleJoin}
              disabled={!selectedGroupId || joining}
            >
              {joining ? 'Sending request...' : 'Send Join Request'}
            </button>
          </div>
        </div>

        {/* Right */}
        <div style={{ paddingTop: 8 }}>
          {selectedGroup ? (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Selected Group</h3>
              <div style={{ background: '#fff', border: '1.5px solid #c4b5fd', borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#4f46e5', marginBottom: 8 }}>{selectedGroup.name}</div>
                {selectedGroup.description && <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{selectedGroup.description}</p>}
              </div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 24 }}>How joining works</h3>
              {howItWorks.map((step, i) => (
                <div key={step.title} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon d={step.icon} size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.9rem' }}>{step.title}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 3, lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default JoinGroupPage;
