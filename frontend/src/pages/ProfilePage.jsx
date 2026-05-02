import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { addNotification } from '../store/notificationsSlice';
import PasswordInput from '../components/PasswordInput';
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

const card = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #ede9fe',
  padding: '32px 28px',
  boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
};

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

  if (loading) return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 32px', color: '#9ca3af' }}>
      Loading profile...
    </div>
  );

  const initials = (authUser?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const fieldLabel = FIELD_OPTIONS.find(o => o.value === form.fieldOfStudy)?.label;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 48px' }}>

      {/* ── Profile hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        borderRadius: 20,
        padding: '32px 36px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '3px solid rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{authUser?.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '4px 0 0', fontSize: '0.9rem' }}>{authUser?.email}</p>
          {fieldLabel && (
            <span style={{
              display: 'inline-block', marginTop: 8,
              background: 'rgba(255,255,255,0.2)', borderRadius: 20,
              padding: '3px 12px', fontSize: 12, color: '#fff', fontWeight: 600,
            }}>
              {fieldLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Two cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Personal Info */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>👤</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e1b4b' }}>Personal Info</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Update your name and field of study</p>
            </div>
          </div>

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
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🔒</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e1b4b' }}>Change Password</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Min 8 chars, one letter and one number</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <PasswordInput className="form-input" value={pwForm.currentPassword} onChange={setPw('currentPassword')} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <PasswordInput className="form-input" value={pwForm.newPassword} onChange={setPw('newPassword')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <PasswordInput className="form-input" value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={saving}>
              {saving ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
