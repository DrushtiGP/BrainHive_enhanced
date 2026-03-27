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
    <div style={{ padding: 24 }}>
      <h2>Admin Dashboard</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['users', 'groups', 'pending'].map((t) => (
          <button key={t} onClick={() => { setError(''); setTab(t); }}
            style={{ fontWeight: tab === t ? 'bold' : 'normal', textTransform: 'capitalize' }}>
            {t === 'pending' ? 'Pending Requests' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['ID', 'Name', 'Email', 'Role', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: 8 }}>{u.id}</td>
                <td style={{ padding: 8 }}>{u.name}</td>
                <td style={{ padding: 8 }}>{u.email}</td>
                <td style={{ padding: 8 }}>user</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => handleDeleteUser(u.id)} style={{ color: 'red' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'groups' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['ID', 'Name', 'Creator ID', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td style={{ padding: 8 }}>{g.id}</td>
                <td style={{ padding: 8 }}>{g.name}</td>
                <td style={{ padding: 8 }}>{g.creator_id}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => handleDeleteGroup(g.id)} style={{ color: 'red' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'pending' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['User', 'Email', 'Group', 'Requested At'].map(h => <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {pendingRequests.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: 8 }}>{r.user_name}</td>
                <td style={{ padding: 8 }}>{r.user_email}</td>
                <td style={{ padding: 8 }}>{r.group_name}</td>
                <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDashboard;
