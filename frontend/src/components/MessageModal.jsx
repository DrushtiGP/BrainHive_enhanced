import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MessageModal = ({ groupId, onClose, initialMessages }) => {
  const [messages, setMessages] = useState(initialMessages); // Use passed messages initially
  const [newMessage, setNewMessage] = useState(''); // For new messages to send

  useEffect(() => {
    setMessages(initialMessages); // Update messages if the initialMessages prop changes
  }, [initialMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return; // Don't send empty messages

    try {
      const response = await axios.post('http://localhost:3001/messages', {
        groupId: groupId,
        message: newMessage,
      });

      if (response.status === 200) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { user_id: groupId, message: newMessage, created_at: new Date().toISOString() },
        ]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>X</button>
        <h3>Messages in Group {groupId}</h3>
        <div>
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.user_id === groupId ? 'You' : 'User'}</strong>: {msg.message}
              <p>{new Date(msg.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message"
            required
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default MessageModal;
