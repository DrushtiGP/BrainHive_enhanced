import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchUserGroups } from '../store/groupsSlice';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const groups = useSelector((state) => state.groups.list);

  useEffect(() => {
    if (user?.id) dispatch(fetchUserGroups(user.id));
  }, [user, dispatch]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Welcome back, {user?.name}!</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/create-group')}>Create Group</button>
        <button onClick={() => navigate('/join-group')}>Join Group</button>
        <button onClick={() => navigate('/messages')}>Messages</button>
        <button onClick={() => navigate('/sessions')}>Sessions</button>
      </div>

      <h3>Your Groups</h3>
      {groups.length === 0 ? (
        <p>You're not in any groups yet. Create or join one!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {groups.map((g) => (
            <li key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <button
                onClick={() => navigate(`/groups/${g.id}`)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}
              >
                {g.name}
              </button>
              <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>{g.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
