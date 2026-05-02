import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createGroup } from '../store/groupsSlice';
import { addNotification } from '../store/notificationsSlice';

const tips = [
  { icon: '✏️', title: 'Be specific', desc: 'A focused name like "React.js Beginners" attracts the right people.' },
  { icon: '📄', title: 'Write a clear description', desc: 'Mention the subject, level, and what members will do together.' },
  { icon: '👑', title: 'You become the leader', desc: 'As creator, you can accept join requests and schedule sessions.' },
  { icon: '🔒', title: 'Approval-based joining', desc: 'Members send a request — you decide who gets in.' },
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
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 48px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>Create a Study Group</h2>
        <p style={{ color: '#9ca3af', marginTop: 6, fontSize: '0.95rem' }}>Start a group and invite others to join.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

        {/* ── Form card ── */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #ede9fe',
          padding: '32px 36px',
          boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', marginBottom: 24, marginTop: 0 }}>
            Group Details
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                Group Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Advanced Algorithms Study Group"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="form-input"
                placeholder="What will this group study? Who is it for? What's the goal?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                required
                style={{ minHeight: 130, resize: 'vertical' }}
              />
            </div>

            {/* Preview */}
            {groupName && (
              <div style={{
                background: '#f5f3ff',
                border: '1px solid #c4b5fd',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  Preview
                </div>
                <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: '0.95rem' }}>{groupName}</div>
                {groupDescription && (
                  <div style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: 4, lineHeight: 1.5 }}>{groupDescription}</div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '13px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Creating...' : '+ Create Group'}
            </button>
          </form>
        </div>

        {/* ── Tips card ── */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #ede9fe',
          padding: '32px 36px',
          boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', marginBottom: 24, marginTop: 0 }}>
            Tips for a great group
          </h3>
          {tips.map((tip, i) => (
            <div key={tip.title} style={{
              display: 'flex',
              gap: 16,
              marginBottom: i < tips.length - 1 ? 24 : 0,
              paddingBottom: i < tips.length - 1 ? 24 : 0,
              borderBottom: i < tips.length - 1 ? '1px solid #f3f0ff' : 'none',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {tip.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.9rem' }}>{tip.title}</div>
                <div style={{ color: '#6b7280', fontSize: '0.83rem', marginTop: 4, lineHeight: 1.6 }}>{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default CreateGroupPage;
