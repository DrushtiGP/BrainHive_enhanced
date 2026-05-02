import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import api from '../api';
import { addNotification } from '../store/notificationsSlice';

const SEVERITY_COLORS = {
  high:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.5)',   text: '#ef4444', label: '#fff' },
  medium: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.5)',  text: '#d97706', label: '#fff' },
  low:    { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.4)',  text: '#4f46e5', label: '#fff' },
};

const StatCard = ({ label, value, highlight }) => (
  <div style={{
    background: highlight ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${highlight ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 10,
    padding: '16px 18px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: 28, fontWeight: 700, color: highlight ? '#ef4444' : '#f9fafb' }}>{value}</div>
    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{label}</div>
  </div>
);

const PAGE_SIZE = 10;

const Pagination = ({ page, total, pageSize, onPage }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
      <button
        className="btn-secondary"
        style={{ padding: '4px 12px', fontSize: 13 }}
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >← Prev</button>
      <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {totalPages} ({total} total)</span>
      <button
        className="btn-secondary"
        style={{ padding: '4px 12px', fontSize: 13 }}
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
      >Next →</button>
    </div>
  );
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('users');

  // Users
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  // Groups
  const [groups, setGroups] = useState([]);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [groupsPage, setGroupsPage] = useState(1);
  // Pending
  const [pendingRequests, setPendingRequests] = useState([]);
  // Onboarding
  const [onboardUserId, setOnboardUserId] = useState('');
  const [onboardGroupId, setOnboardGroupId] = useState('');
  const [onboardResult, setOnboardResult] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);
  // Health
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setOnboardResult('');
    if (tab === 'users')    fetchUsers(1);
    if (tab === 'groups')   fetchGroups(1);
    if (tab === 'pending')  fetchPending();
    if (tab === 'health')   fetchHealth();
    if (tab === 'onboard')  { fetchUsers(1); fetchGroups(1); }
  }, [tab]);

  const fetchUsers = async (page = usersPage) => {
    try {
      const res = await api.get('/admin/users', { params: { page, pageSize: PAGE_SIZE } });
      setUsers(res.data.users || []);
      setUsersTotal(res.data.total || 0);
      setUsersPage(page);
    } catch (e) { setError('Failed to load users.'); }
  };

  const fetchGroups = async (page = groupsPage) => {
    try {
      const res = await api.get('/admin/groups', { params: { page, pageSize: PAGE_SIZE } });
      setGroups(res.data.groups || []);
      setGroupsTotal(res.data.total || 0);
      setGroupsPage(page);
    } catch (e) { setError('Failed to load groups.'); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      dispatch(addNotification({ type: 'success', message: `Role updated to '${newRole}'.` }));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update role.');
    }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get('/admin/pending-requests');
      setPendingRequests(res.data.pendingRequests || []);
    } catch (e) { setError('Failed to load pending requests.'); }
  };

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setError('');
    try {
      const res = await api.get('/agents/health');
      setHealthData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load platform health.');
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      dispatch(addNotification({ type: 'success', message: 'User deleted.' }));
    } catch (e) { setError(e.response?.data?.error || 'Failed to delete user.'); }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group permanently?')) return;
    try {
      await api.delete(`/admin/groups/${groupId}`);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      dispatch(addNotification({ type: 'success', message: 'Group deleted.' }));
    } catch (e) { setError(e.response?.data?.error || 'Failed to delete group.'); }
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!onboardUserId || !onboardGroupId) {
      setError('Both User ID and Group ID are required.');
      return;
    }
    setOnboardLoading(true);
    setOnboardResult('');
    setError('');
    try {
      const res = await api.post('/agents/onboard', {
        userId: parseInt(onboardUserId),
        groupId: parseInt(onboardGroupId),
      });
      setOnboardResult(res.data.welcomeMessage || 'Onboarding message sent successfully.');
      dispatch(addNotification({ type: 'success', message: 'Onboarding message sent!' }));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to trigger onboarding.');
    } finally {
      setOnboardLoading(false);
    }
  };

  const TABS = [
    { id: 'users',     label: '👥 Users' },
    { id: 'groups',    label: '📚 Groups' },
    { id: 'pending',   label: '⏳ Pending Requests' },
    { id: 'onboard',   label: '👋 Onboarding Agent' },
    { id: 'health',    label: '🛠️ Platform Health' },
  ];

  return (
    <div className="page-container-wide">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Admin Dashboard</h2>
        <span style={{
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 12,
          color: '#818cf8',
        }}>
          🔐 Admin Access
        </span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#ef4444',
          marginBottom: 16,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="tab-bar" style={{ marginTop: 16, flexWrap: 'wrap', gap: 6 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#131415ff', fontSize: 13, marginBottom: 12 }}>
            {usersTotal} registered user{usersTotal !== 1 ? 's' : ''}
          </p>
          <table className="data-table">
            <thead>
              <tr>{['ID', 'Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role || 'user'}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{
                        background: u.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${u.role === 'admin' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: 4,
                        padding: '3px 8px',
                        fontSize: 12,
                        color: u.role === 'admin' ? '#818cf8' : '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={{ color: '#09090bff', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleDeleteUser(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#0c0f14ff' }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={usersPage} total={usersTotal} pageSize={PAGE_SIZE} onPage={fetchUsers} />
        </div>
      )}

      {/* ── GROUPS TAB ── */}
      {tab === 'groups' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#07080aff', fontSize: 13, marginBottom: 12 }}>
            {groupsTotal} group{groupsTotal !== 1 ? 's' : ''} on the platform
          </p>
          <table className="data-table">
            <thead>
              <tr>{['ID', 'Name', 'Description', 'Creator ID', 'Created', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td>{g.name}</td>
                  <td style={{ color: '#0d1015ff', fontSize: 12, maxWidth: 200 }}>{g.description || '—'}</td>
                  <td>{g.creator_id}</td>
                  <td style={{ color: '#0e1217ff', fontSize: 12 }}>{new Date(g.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleDeleteGroup(g.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>No groups found.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={groupsPage} total={groupsTotal} pageSize={PAGE_SIZE} onPage={fetchGroups} />
        </div>
      )}

      {/* ── PENDING REQUESTS TAB ── */}
      {tab === 'pending' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#090b0eff', fontSize: 13, marginBottom: 12 }}>
            {pendingRequests.length} pending join request{pendingRequests.length !== 1 ? 's' : ''} platform-wide
          </p>
          <table className="data-table">
            <thead>
              <tr>{['User', 'Email', 'Group', 'Requested At'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {pendingRequests.map(r => (
                <tr key={r.id}>
                  <td>{r.user_name}</td>
                  <td style={{ color: '#060709ff', fontSize: 12 }}>{r.user_email}</td>
                  <td>{r.group_name}</td>
                  <td style={{ color: '#06080bff', fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {pendingRequests.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>No pending requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ONBOARDING AGENT TAB ── */}
      {tab === 'onboard' && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <h3 style={{ color: '#020304ff', margin: '0 0 6px' }}>👋 Onboarding Agent</h3>
            <p style={{ color: '#080b11ff', fontSize: 13, margin: 0 }}>
              Manually trigger a personalised welcome message for any user in any group.
              The AI generates a message with group details, upcoming sessions, and active members.
            </p>
          </div>

          {/* Quick reference tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            {/* Users reference */}
            <div>
              <h4 style={{ color: '#060709ff', fontSize: 13, marginBottom: 8 }}>Available Users (for User ID)</h4>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                overflow: 'hidden',
                maxHeight: 220,
                overflowY: 'auto',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#0d0e11ff' }}>ID</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#090a0bff' }}>Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#090a0bff' }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr
                        key={u.id}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                        onClick={() => setOnboardUserId(String(u.id))}
                      >
                        <td style={{ padding: '7px 12px', color: '#818cf8', fontWeight: 600 }}>{u.id}</td>
                        <td style={{ padding: '7px 12px', color: '#0a0b0dff' }}>{u.name}</td>
                        <td style={{ padding: '7px 12px', color: '#07080aff', fontSize: 12 }}>{u.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>Click a row to select the user ID</p>
            </div>

            {/* Groups reference */}
            <div>
              <h4 style={{ color: '#07090dff', fontSize: 13, marginBottom: 8 }}>Available Groups (for Group ID)</h4>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                overflow: 'hidden',
                maxHeight: 220,
                overflowY: 'auto',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#06070aff' }}>ID</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#0c0e13ff' }}>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => (
                      <tr
                        key={g.id}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                        onClick={() => setOnboardGroupId(String(g.id))}
                      >
                        <td style={{ padding: '7px 12px', color: '#818cf8', fontWeight: 600 }}>{g.id}</td>
                        <td style={{ padding: '7px 12px', color: '#0c0d0fff' }}>{g.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>Click a row to select the group ID</p>
            </div>
          </div>

          {/* Trigger form */}
          <form onSubmit={handleOnboard} style={{ maxWidth: 480 }}>
            <h4 style={{ color: '#060708ff', marginBottom: 14 }}>Trigger Onboarding</h4>
            <div className="form-group">
              <label className="form-label">User ID</label>
              <input
                className="form-input"
                type="number"
                placeholder="e.g. 3"
                value={onboardUserId}
                onChange={e => setOnboardUserId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Group ID</label>
              <input
                className="form-input"
                type="number"
                placeholder="e.g. 1"
                value={onboardGroupId}
                onChange={e => setOnboardGroupId(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={onboardLoading}>
              {onboardLoading ? '⏳ Generating welcome message...' : '👋 Send Onboarding Message'}
            </button>
          </form>

          {/* Result */}
          {onboardResult && (
            <div style={{
              marginTop: 20,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10,
              padding: '14px 18px',
              maxWidth: 600,
            }}>
              <div style={{ color: '#10b981', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                ✅ Onboarding message sent to group chat
              </div>
              <div style={{ color: '#111827', fontSize: 14, lineHeight: 1.6 }}>{onboardResult}</div>
            </div>
          )}
        </div>
      )}

      {/* ── PLATFORM HEALTH TAB ── */}
      {tab === 'health' && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <h3 style={{ color: '#0b0c0eff', margin: '0 0 4px' }}>🛠️ Platform Health Agent</h3>
              <p style={{ color: '#101215ff', fontSize: 13, margin: 0 }}>
                AI-powered diagnostics — identifies inactive groups, stale requests, and anomalies.
              </p>
            </div>
            <button
              className="btn-secondary"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={fetchHealth}
              disabled={loadingHealth}
            >
              {loadingHealth ? '⏳ Analyzing...' : '↻ Re-run Analysis'}
            </button>
          </div>

          {loadingHealth && (
            <div className="empty-state">Running AI platform health analysis...</div>
          )}

          {!loadingHealth && healthData && (
            <>
              {/* Stats grid */}
              <h3 className="section-heading">Platform Statistics</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 12,
                marginBottom: 28,
              }}>
                <StatCard label="Total Users"        value={healthData.stats.totalUsers} />
                <StatCard label="Total Groups"       value={healthData.stats.totalGroups} />
                <StatCard label="New Users (7d)"     value={healthData.stats.newUsersWeek} />
                <StatCard label="Inactive Groups"    value={healthData.stats.inactiveGroups}    highlight={healthData.stats.inactiveGroups > 0} />
                <StatCard label="Stale Requests"     value={healthData.stats.stalePending}      highlight={healthData.stats.stalePending > 0} />
                <StatCard label="Sessionless Groups" value={healthData.stats.sessionlessGroups} highlight={healthData.stats.sessionlessGroups > 0} />
              </div>

              {/* AI Alerts */}
              <h3 className="section-heading">AI-Generated Alerts</h3>
              {healthData.alerts.length === 0 ? (
                <div style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 8,
                  padding: '14px 18px',
                  color: '#10b981',
                  fontSize: 14,
                }}>
                  ✅ No issues detected. Platform looks healthy!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {healthData.alerts.map((alert, i) => {
                    const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low;
                    return (
                      <div key={i} style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}>
                        <span style={{
                          background: colors.border,
                          color: colors.label,
                          borderRadius: 4,
                          padding: '2px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {alert.severity}
                        </span>
                        <div>
                          <div style={{ color: '#111827', fontSize: 14, fontWeight: 500 }}>{alert.message}</div>
                          {alert.count > 0 && (
                            <div style={{ color: '#374151', fontSize: 12, marginTop: 3 }}>
                              Affected: {alert.count}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!loadingHealth && !healthData && !error && (
            <div className="empty-state">Click "Re-run Analysis" to generate a health report.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
