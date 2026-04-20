import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { addNotification } from '../store/notificationsSlice';
import api from '../api';

const FIELD_OPTIONS = [
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'software_engineering', label: 'Software Engineering' },
  { value: 'information_technology', label: 'Information Technology' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'electrical_engineering', label: 'Electrical Engineering' },
  { value: 'mechanical_engineering', label: 'Mechanical Engineering' },
  { value: 'civil_engineering', label: 'Civil Engineering' },
  { value: 'chemical_engineering', label: 'Chemical Engineering' },
  { value: 'aerospace_engineering', label: 'Aerospace Engineering' },
  { value: 'biomedical_engineering', label: 'Biomedical Engineering' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'dentistry', label: 'Dentistry' },
  { value: 'public_health', label: 'Public Health' },
  { value: 'veterinary', label: 'Veterinary' },
  { value: 'law', label: 'Law' },
  { value: 'political_science', label: 'Political Science' },
  { value: 'international_relations', label: 'International Relations' },
  { value: 'business_administration', label: 'Business Administration' },
  { value: 'finance', label: 'Finance' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'economics', label: 'Economics' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'statistics', label: 'Statistics' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'environmental_science', label: 'Environmental Science' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'sociology', label: 'Sociology' },
  { value: 'anthropology', label: 'Anthropology' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'urban_planning', label: 'Urban Planning' },
  { value: 'interior_design', label: 'Interior Design' },
  { value: 'graphic_design', label: 'Graphic Design' },
  { value: 'fine_arts', label: 'Fine Arts' },
  { value: 'music', label: 'Music' },
  { value: 'film_media', label: 'Film & Media' },
  { value: 'journalism', label: 'Journalism' },
  { value: 'communications', label: 'Communications' },
  { value: 'education', label: 'Education' },
  { value: 'linguistics', label: 'Linguistics' },
  { value: 'history', label: 'History' },
  { value: 'literature', label: 'Literature' },
  { value: 'theology', label: 'Theology' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'food_science', label: 'Food Science' },
  { value: 'sports_science', label: 'Sports Science' },
  { value: 'social_work', label: 'Social Work' },
  { value: 'other', label: 'Other' },
];

const fieldBlock = (label, children) => (
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

  const [form, setForm] = useState({ name: '', fieldOfStudy: '', fieldOfStudyCustom: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const setPw = (f) => (e) => setPwForm(prev => ({ ...prev, [f]: e.target.value }));

  useEffect(() => {
    api.get('/profile')
      .then(res => {
        const u = res.data.user;
        setForm({ name: u.name || '', fieldOfStudy: u.fieldOfStudy || '', fieldOfStudyCustom: u.fieldOfStudyCustom || '' });
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
        fieldOfStudy: form.fieldOfStudy || null,
        fieldOfStudyCustom: form.fieldOfStudy === 'other' ? form.fieldOfStudyCustom : null,
      });
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

  if (loading) return <div className="page-container"><p style={{ color: '#9ca3af' }}>Loading profile...</p></div>;

  return (
    <div className="page-container-wide">
      <h2 className="page-title" style={{ marginBottom: 8 }}>My Profile</h2>
      <p className="page-subtitle">Manage your personal info and password.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 32, alignItems: 'start' }}>
        <div className="page-card">
          <h3 className="section-heading" style={{ marginTop: 0 }}>Personal Info</h3>
          <form onSubmit={handleSaveProfile}>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={authUser?.email || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Field of Study</label>
            <select className="form-input" value={form.fieldOfStudy} onChange={set('fieldOfStudy')}>
              <option value="">Not specified</option>
              {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.fieldOfStudy === 'other' && (
            <div className="form-group">
              <label className="form-label">Please specify</label>
              <input className="form-input" type="text" value={form.fieldOfStudyCustom} onChange={set('fieldOfStudyCustom')} maxLength={100} />
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
        </div>

        <div className="page-card">
          <h3 className="section-heading" style={{ marginTop: 0 }}>Change Password</h3>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Min 8 characters, at least one letter and one number.</p>

          <form onSubmit={handleChangePassword}>

          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={pwForm.newPassword} onChange={setPw('newPassword')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} required />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Change Password'}
          </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
