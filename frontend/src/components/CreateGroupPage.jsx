import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createGroup } from '../store/groupsSlice';
import { addNotification } from '../store/notificationsSlice';

const Icon = ({ d, size = 18, color = '#7c3aed' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d={d} />
  </svg>
);

const tips = [
  {
    icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    title: 'Be specific',
    desc: 'A focused name like "React.js Beginners" attracts the right people.',
  },
  {
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    title: 'Write a clear description',
    desc: 'Mention the subject, level, and what members will do together.',
  },
  {
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    title: 'You become the leader',
    desc: 'As creator, you can accept join requests and schedule sessions.',
  },
  {
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    title: 'Approval-based joining',
    desc: 'Members send a request — you decide who gets in.',
  },
];

const CreateGroupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await dispatch(createGroup({ name: groupName, description: groupDescription, creatorId: user.id })).unwrap();
      dispatch(addNotification({ type: 'success', message: 'Group created successfully!' }));
      navigate(`/groups/${result.groupId}`);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to create group.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container-wide">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>

        <div>
          <h2 className="page-title">Create a Study Group</h2>
          <p className="page-subtitle">Start a group and invite others to join.</p>
          <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input className="form-input" type="text" placeholder="e.g. Advanced Algorithms Study Group" value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="What will this group study? Who is it for?" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} required style={{ minHeight: 120, resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>

        <div style={{ paddingTop: 8 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 24 }}>Tips for a great group</h3>
          {tips.map((tip) => (
            <div key={tip.title} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon d={tip.icon} size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.9rem' }}>{tip.title}</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 3, lineHeight: 1.5 }}>{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default CreateGroupPage;
