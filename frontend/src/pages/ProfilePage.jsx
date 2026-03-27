import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { addNotification } from '../store/notificationsSlice';
import api from '../api';

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const field = (label, children) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4, fontSize: 13, color: '#555' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = { width: '100%', padding: 8, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: 4 };

const ProfilePage = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [form, setForm] = useState({ name: '', university: '', fieldOfStudy: '', yearOfStudy: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const setPw = (f) => (e) => setPwForm(prev => ({ ...prev, [f]: e.target.value }));

  useEffect(() => {
    api.get('/profile')
      .then(res => {
        const u = res.data.user;
        setForm({ name: u.name || '', university: u.university || '', fieldOfStudy: u.fieldOfStudy || '', yearOfStudy: u.yearOfStudy || '' });
      })
      .catch(() => dispatch(addNotification({ type: 'error', message: 'Failed to load profile.' })))
      .finally(() => setLoading(false));
  }, [dispatch]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', {
        name: form.name,
        university: form.university || null,
        fieldOfStudy: form.fieldOfStudy || null,
        yearOfStudy: form.yearOfStudy ? parseInt(form.yearOfStudy) : null,
      });
      // Update Redux store with new name
      dispatch(setCredentials({ user: { ...authUser, name: form.name }, token }));
      dispatch(addNotification({ type: 'success', message: 'Profile updated.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to update profile.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      dispatch(addNotification({ type: 'error', message: 'New passwords do not match.' }));
      return;
    }
    if (pwForm.newPassword.length < 6) {
      dispatch(addNotification({ type: 'error', message: 'New password must be at least 6 characters.' }));
      return;
    }
    setSaving(true);
    try {
      await api.put('/profile', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      dispatch(addNotification({ type: 'success', message: 'Password changed successfully.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to change password.' }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 24 }}>
      <h2>My Profile</h2>

      <form onSubmit={handleSaveProfile} style={{ marginBottom: 40 }}>
        <h3 style={{ marginBottom: 16 }}>Personal Info</h3>

        {field('Full Name',
          <input type="text" value={form.name} onChange={set('name')} required style={inputStyle} />
        )}
        {field('Email',
          <input type="email" value={authUser?.email || ''} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#999' }} />
        )}
        {field('University / Institution',
          <input type="text" placeholder="e.g. MIT, Oxford" value={form.university} onChange={set('university')} style={inputStyle} />
        )}
        {field('Field of Study',
          <input type="text" placeholder="e.g. Computer Science, Medicine" value={form.fieldOfStudy} onChange={set('fieldOfStudy')} style={inputStyle} />
        )}
        {field('Year of Study',
          <select value={form.yearOfStudy} onChange={set('yearOfStudy')} style={inputStyle}>
            <option value="">Not specified</option>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        )}

        <button type="submit" disabled={saving} style={{ padding: '8px 20px', marginTop: 8 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <form onSubmit={handleChangePassword}>
        <h3 style={{ marginBottom: 16 }}>Change Password</h3>

        {field('Current Password',
          <input type="password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} required style={inputStyle} />
        )}
        {field('New Password',
          <input type="password" value={pwForm.newPassword} onChange={setPw('newPassword')} required minLength={6} style={inputStyle} />
        )}
        {field('Confirm New Password',
          <input type="password" value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} required style={inputStyle} />
        )}

        <button type="submit" disabled={saving} style={{ padding: '8px 20px', marginTop: 8 }}>
          {saving ? 'Saving...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
