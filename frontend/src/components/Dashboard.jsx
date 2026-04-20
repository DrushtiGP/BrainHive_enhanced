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
    </div>
  );
};

export default Dashboard;
