import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMessages, sendMessage, clearMessages } from '../store/messagesSlice';
import { fetchUserGroups } from '../store/groupsSlice';
import { addNotification } from '../store/notificationsSlice';

const POLL_INTERVAL = 4000;
const MAX_LENGTH = 2000;

const GroupChat = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const groups = useSelector((state) => state.groups.list);
  const messages = useSelector((state) => state.messages.messages);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [text, setText] = useState('');
  const pollingRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user?.id) dispatch(fetchUserGroups(user.id));
  }, [user, dispatch]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (selectedGroup) {
      dispatch(fetchMessages(selectedGroup.id));
      pollingRef.current = setInterval(() => {
        dispatch(fetchMessages(selectedGroup.id));
      }, POLL_INTERVAL);
    } else {
      dispatch(clearMessages());
    }
    return () => clearInterval(pollingRef.current);
  }, [selectedGroup, dispatch]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (text.length > MAX_LENGTH) {
      dispatch(addNotification({ type: 'error', message: `Message cannot exceed ${MAX_LENGTH} characters.` }));
      return;
    }
    try {
      await dispatch(sendMessage({ groupId: selectedGroup.id, userId: user.id, message: text })).unwrap();
      setText('');
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to send message.' }));
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Group Chat</h2>
      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedGroup?.id || ''}
          onChange={(e) => {
            const g = groups.find((gr) => gr.id === parseInt(e.target.value));
            setSelectedGroup(g || null);
          }}
          style={{ padding: 8, minWidth: 200 }}
        >
          <option value="" disabled>Select a group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {selectedGroup && (
        <div>
          <h3>Messages in {selectedGroup.name}</h3>
          <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 12, minHeight: 200, maxHeight: 400, overflowY: 'auto', marginBottom: 12 }}>
            {messages.length === 0 ? (
              <p style={{ color: '#999' }}>No messages yet.</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <strong style={{ color: msg.user_id === user.id ? '#0066cc' : '#333' }}>
                    {msg.user_id === user.id ? 'You' : (msg.sender_name || `User ${msg.user_id}`)}
                  </strong>
                  {': '}{msg.message}
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#999' }}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                maxLength={MAX_LENGTH}
                style={{ width: '100%', padding: 8 }}
              />
              <div style={{ fontSize: 11, color: text.length > MAX_LENGTH * 0.9 ? 'red' : '#999', textAlign: 'right' }}>
                {text.length}/{MAX_LENGTH}
              </div>
            </div>
            <button type="submit" style={{ padding: '8px 16px', height: 36 }}>Send</button>
          </form>
        </div>
      )}

      {groups.length === 0 && (
        <p style={{ color: '#999' }}>You're not in any groups yet. Join or create one first.</p>
      )}
    </div>
  );
};

export default GroupChat;
