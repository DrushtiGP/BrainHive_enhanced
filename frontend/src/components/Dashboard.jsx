import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchUserGroups } from '../store/groupsSlice';
import api from '../api';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const groups = useSelector((state) => state.groups.list);

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserGroups(user.id));
      fetchRecommendations();
    }
  }, [user, dispatch]);

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await api.get('/agents/recommendations', { params: { userId: user?.id } });
      setRecommendations(res.data.recommendations || []);
    } catch {
      // non-critical, fail silently
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 48px' }}>

      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        borderRadius: 20,
        padding: '36px 40px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
      }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Welcome back, {user?.name}! 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0', fontSize: '0.95rem' }}>
            {groups.length > 0
              ? `You're in ${groups.length} group${groups.length !== 1 ? 's' : ''}. Keep it up!`
              : 'Start by creating or joining a study group.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/create-group')}
            style={{
              background: '#fff',
              color: '#7c3aed',
              border: 'none',
              borderRadius: 10,
              padding: '11px 22px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            + Create Group
          </button>
          <button
            onClick={() => navigate('/join-group')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.5)',
              borderRadius: 10,
              padding: '11px 22px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            Join a Group
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left: Your Groups ── */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #ede9fe',
          padding: '24px 28px',
          boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: 0 }}>
              📚 Your Groups
            </h3>
            <span style={{
              background: '#ede9fe',
              color: '#7c3aed',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {groups.length}
            </span>
          </div>

          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No groups yet.</p>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem' }}>Create one or join an existing group.</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {groups.map((g) => (
                <li
                  key={g.id}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 10,
                    marginBottom: 8,
                    cursor: 'pointer',
                    border: '1px solid #f3f0ff',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#c4b5fd'; }}
                  onMouseOut={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#f3f0ff'; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                  }}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#4f46e5', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {g.name}
                    </div>
                    {g.description && (
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.description}
                      </div>
                    )}
                  </div>
                  <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Right: Recommendations ── */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #ede9fe',
          padding: '24px 28px',
          boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b', margin: 0 }}>
              ✨ Recommended for You
            </h3>
            <button
              onClick={fetchRecommendations}
              disabled={loadingRecs}
              style={{
                background: 'none',
                border: '1px solid #c4b5fd',
                borderRadius: 6,
                color: '#7c3aed',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                cursor: 'pointer',
              }}
            >
              {loadingRecs ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>

          {loadingRecs ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
              Finding groups for you...
            </div>
          ) : recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>No recommendations yet.</p>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem' }}>
                Update your field of study in your profile for personalized suggestions.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recommendations.map((g) => (
                <li
                  key={g.id}
                  onClick={() => navigate('/join-group')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    marginBottom: 8,
                    cursor: 'pointer',
                    border: '1px solid #f3f0ff',
                    borderLeft: '3px solid #7c3aed',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f5f3ff'}
                  onMouseOut={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.95rem' }}>{g.name}</span>
                    {g.member_count != null && (
                      <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {g.description && (
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 3 }}>{g.description}</div>
                  )}
                  {g.reason && (
                    <div style={{ fontSize: '0.78rem', color: '#7c3aed', marginTop: 5, fontStyle: 'italic' }}>
                      ✨ {g.reason}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
