import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GroupChat = ({ loggedInUser }) => {
  const [groups, setGroups] = useState([]); // List of groups user is a part of
  const [selectedGroup, setSelectedGroup] = useState(null); // The currently selected group for chatting
  const [message, setMessage] = useState(''); // The message being typed
  const [messages, setMessages] = useState([]); // The list of messages for the selected group
  const [loadingGroups, setLoadingGroups] = useState(true); // Loading state for groups
  const [loadingMessages, setLoadingMessages] = useState(false); // Loading state for messages
  const [error, setError] = useState(''); // Error message state

  // Fetch the groups the user is part of
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/groups/user/${loggedInUser.id}`);
        setGroups(response.data.groups);
      } catch (error) {
        setError('Error fetching groups. Please try again.');
      } finally {
        setLoadingGroups(false);
      }
    };

    if (loggedInUser) {
      fetchGroups();
    }
  }, [loggedInUser]);

  // Fetch messages for the selected group
  useEffect(() => {
    if (selectedGroup) {
      setLoadingMessages(true);
      const fetchMessages = async () => {
        try {
          const response = await axios.get(`http://localhost:3001/messages`, {
            params: { groupId: selectedGroup.id },
          });
          setMessages(response.data.messages);
        } catch (error) {
          setError('Error fetching messages. Please try again.');
        } finally {
          setLoadingMessages(false);
        }
      };

      fetchMessages();
    }
  }, [selectedGroup]);

  // Handle message sending
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) return; // Don't send empty messages

    try {
      await axios.post('http://localhost:3001/messages', {
        groupId: selectedGroup.id,
        userId: loggedInUser.id,
        message: message,
      });
      setMessage(''); // Clear the input after sending
      setMessages((prevMessages) => [
        ...prevMessages,
        { user_id: loggedInUser.id, message, created_at: new Date().toISOString() },
      ]);
    } catch (error) {
      setError('Error sending message. Please try again.');
    }
  };

  return (
    <div>
      <h2>Group Chat</h2>

      {/* Error Message */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Select a group to chat */}
      <div>
        <h3>Select a Group</h3>
        <select
          onChange={(e) => {
            const selected = groups.find((group) => group.id === parseInt(e.target.value));
            setSelectedGroup(selected);
            setMessages([]); // Clear messages when selecting a new group
          }}
          value={selectedGroup ? selectedGroup.id : ''}
        >
          <option value="" disabled>Select a group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* Display messages for the selected group */}
      {selectedGroup && (
        <div>
          <h3>Messages in {selectedGroup.name}</h3>

          {/* Loading state for messages */}
          {loadingMessages ? (
            <p>Loading messages...</p>
          ) : (
            <div>
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div key={index}>
                    <strong>{msg.user_id === loggedInUser.id ? 'You' : 'User'}</strong>: {msg.message}
                    <p>{new Date(msg.created_at).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p>No messages yet.</p>
              )}
            </div>
          )}

          {/* Message input and send button */}
          <form onSubmit={handleSendMessage}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
              required
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}

      {/* Loading state for groups */}
      {loadingGroups && !groups.length && <p>Loading your groups...</p>}
    </div>
  );
};

export default GroupChat;
