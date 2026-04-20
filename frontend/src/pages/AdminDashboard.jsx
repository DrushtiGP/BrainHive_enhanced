import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import api from '../api';
import { addNotification } from '../store/notificationsSlice';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'groups') fetchGroups();
    if (tab === 'pending') fetchPending();
  }, [tab]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (e) {
      setError('Failed to load users.');
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/admin/groups');
      setGroups(res.data.groups);
    } catch (e) {
      setError('Failed to load groups.');
    }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get('/admin/pending-requests');
      setPendingRequests(res.data.pendingRequests);
    } catch (e) {
      setError('Failed to load pending requests.');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      dispatch(addNotification({ type: 'success', message: 'User deleted.' }));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete user.');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await api.delete(`/admin/groups/${groupId}`);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      dispatch(addNotification({ type: 'success', message: 'Group deleted.' }));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete group.');
    }
  };

  return (
    <div className="page-container-wide">
      <h2 className="page-title">Admin Dashboard</h2>
      {error && <p style={{ color: '#ef4444', marginBottom: 12 }}>{error}</p>}

      <div className="tab-bar" style={{ marginTop: 20 }}>
          {['users', 'groups', 'pending'].map((t) => (
            <button
              key={t}
              className={`tab-btn${tab === t ? ' active' : ''}`}
              onClick={() => { setError(''); setTab(t); }}
            >
              {t === 'pending' ? 'Pending Requests' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <table className="data-table">
            <thead>
              <tr>{['ID', 'Name', 'Email', 'Role', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>user</td>
                  <td><button className="btn-danger" onClick={() => handleDeleteUser(u.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'groups' && (
          <table className="data-table">
            <thead>
              <tr>{['ID', 'Name', 'Creator ID', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td>{g.name}</td>
                  <td>{g.creator_id}</td>
                  <td><button className="btn-danger" onClick={() => handleDeleteGroup(g.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'pending' && (
          <table className="data-table">
            <thead>
              <tr>{['User', 'Email', 'Group', 'Requested At'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {pendingRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.user_name}</td>
                  <td>{r.user_email}</td>
                  <td>{r.group_name}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
};

export default AdminDashboard;
