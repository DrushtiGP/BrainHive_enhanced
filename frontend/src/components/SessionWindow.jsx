import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SessionWindow = ({ loggedInUser, currentGroup }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (currentGroup) {
      // Fetch messages for the current group
      axios
        .get(`http://localhost:3001/messages?groupId=${currentGroup.id}`)
        .then((response) => {
          setMessages(response.data.messages);
        })
        .catch((error) => {
          console.error('Error fetching messages:', error);
        });
    }
  }, [currentGroup]);

  const handleSendMessage = () => {
    if (!loggedInUser || !currentGroup) {
     // alert('User or Group not set.');
      return;
    }

    axios
      .post('http://localhost:3001/messages', {
        groupId: currentGroup.id,
        userId: loggedInUser.id,
        message: newMessage,
      })
      .then((response) => {
        setMessages([...messages, { ...response.data.message, userId: loggedInUser.id }]);
        setNewMessage('');
      })
      .catch((error) => {
        console.error('Error sending message:', error);
       // alert('Error sending message. Please try again.');
      });
  };

  return (
    <div>
      <h2>Group: {currentGroup?.name}</h2>
      <div>
        <h3>Messages</h3>
        <div>
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>User {msg.userId}: </strong>
              {msg.message}
            </div>
          ))}
        </div>
      </div>
      <div>
        <input
          type="text"
          placeholder="Type your message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};

export default SessionWindow;
