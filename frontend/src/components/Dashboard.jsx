import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchUserGroups } from '../store/groupsSlice';
import { addNotification } from '../store/notificationsSlice';
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
    } catch (err) {
      // Recommendations are non-critical — fail silently
      console.warn('Could not load recommendations:', err.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div className="page-container">
      <div className="dashboard-welcome">
        <h2>Welcome back, {user?.name}!</h2>
        <p className="page-subtitle">Find your groups or start a new one.</p>
      </div>

      <div className="dashboard-actions">
        <button className="btn-primary" onClick={() => navigate('/create-group')}>+ Create Group</button>
        <button className="btn-secondary" onClick={() => navigate('/join-group')}>Join a Group</button>
      </div>

      <h3 className="section-heading" style={{ marginTop: 0 }}>Your Groups</h3>
      {groups.length === 0 ? (
        <div className="empty-state">
          <p>You're not in any groups yet.</p>
          <p style={{ marginTop: 8 }}>Create one or join an existing group to get started.</p>
        </div>
      ) : (
        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.id} className="group-list-item" onClick={() => navigate(`/groups/${g.id}`)}>
              <span className="group-list-item-name">{g.name}</span>
              {g.description && <span className="group-list-item-desc">{g.description}</span>}
            </li>
          ))}
        </ul>
      )}

      {/* ── Group Recommendation Agent ── */}
      <div style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h3 className="section-heading" style={{ margin: 0 }}>🔍 Recommended for You</h3>
          <button
            onClick={fetchRecommendations}
            disabled={loadingRecs}
            style={{
              background: 'none',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: 6,
              color: '#818cf8',
              fontSize: 12,
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            {loadingRecs ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {loadingRecs ? (
          <div className="empty-state" style={{ padding: '16px 0' }}>Finding groups for you...</div>
        ) : recommendations.length === 0 ? (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <p>No recommendations yet.</p>
            <p style={{ marginTop: 4, fontSize: 13 }}>
              Update your field of study in your profile to get personalized suggestions.
            </p>
          </div>
        ) : (
          <ul className="group-list">
            {recommendations.map((g) => (
              <li
                key={g.id}
                className="group-list-item"
                style={{ cursor: 'pointer', borderLeft: '3px solid rgba(99,102,241,0.5)' }}
                onClick={() => navigate('/join-group')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="group-list-item-name">{g.name}</span>
                    {g.description && <span className="group-list-item-desc">{g.description}</span>}
                  </div>
                  <span style={{
                    fontSize: 12,
                    color: '#6b7280',
                    whiteSpace: 'nowrap',
                    marginLeft: 12,
                  }}>
                    {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                  </span>
                </div>
                {g.reason && (
                  <div style={{
                    fontSize: 12,
                    color: '#818cf8',
                    marginTop: 4,
                    fontStyle: 'italic',
                  }}>
                    ✨ {g.reason}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
