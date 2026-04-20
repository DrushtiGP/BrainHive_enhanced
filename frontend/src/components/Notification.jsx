import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { removeNotification } from '../store/notificationsSlice';

const AUTO_DISMISS_MS = 4000;

const typeStyles = {
  success: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', bar: '#16a34a' },
  error:   { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', bar: '#ef4444' },
  info:    { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', bar: '#3b82f6' },
};

const ToastItem = ({ n, onDismiss }) => {
  const timerRef = useRef(null);
  const styles = typeStyles[n.type] || typeStyles.info;

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(n.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [n.id, onDismiss]);

  return (
    <div style={{
      position: 'relative',
      padding: '14px 44px 14px 16px',
      borderRadius: 10,
      minWidth: 280,
      maxWidth: 380,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      background: styles.background,
      color: styles.color,
      border: styles.border,
      fontSize: '0.92rem',
      fontWeight: 500,
      lineHeight: 1.4,
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      animation: 'toastSlideIn 0.25s ease',
    }}>
      {n.message}

      <button
        onClick={() => onDismiss(n.id)}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: 8, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: styles.color, opacity: 0.5, lineHeight: 1, padding: 0,
        }}
      >×</button>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 3,
        background: styles.bar, borderRadius: '0 0 10px 10px',
        animation: `toastProgress ${AUTO_DISMISS_MS}ms linear forwards`,
      }} />
    </div>
  );
};

const Notification = () => {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.notifications.items);
  const onDismiss = (id) => dispatch(removeNotification(id));

  const content = (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(50px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: 20, right: 20,
        zIndex: 2147483647,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: items.length ? 'auto' : 'none',
      }}>
        {items.map((n) => <ToastItem key={n.id} n={n} onDismiss={onDismiss} />)}
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default Notification;
