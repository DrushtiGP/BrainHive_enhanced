import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeNotification } from '../store/notificationsSlice';

const typeStyles = {
  success: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
  error:   { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
  info:    { background: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' },
};

const Notification = () => {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.notifications.items);

  if (!items.length) return null;

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((n) => (
        <div
          key={n.id}
          style={{
            padding: '12px 16px',
            borderRadius: 6,
            minWidth: 260,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            ...(typeStyles[n.type] || typeStyles.info),
          }}
        >
          <span>{n.message}</span>
          <button
            onClick={() => dispatch(removeNotification(n.id))}
            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Notification;
