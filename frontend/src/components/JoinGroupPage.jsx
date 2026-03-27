import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const JoinGroupPage = ({ loggedInUser }) => {
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (loggedInUser) {
      axios.get('http://localhost:3001/groups') // Get all available groups
        .then(response => {
          if (response.data.groups.length > 0) {
            setAvailableGroups(response.data.groups);
          } else {
            //alert('No groups available to join.');
          }
        })
        .catch(error => {
          console.error('Failed to fetch groups:', error);
          //alert('An error occurred while fetching groups.');
        });
    }
  }, [loggedInUser]);

  const handleJoinGroup = async (e) => {
    e.preventDefault();

    // Ensure loggedInUser is available
    if (!loggedInUser) {
      //alert('Please log in to join a group.');
      return;
    }

    try {
      await axios.post('http://localhost:3001/group-membership', {
        userId: loggedInUser.id,
        groupId: selectedGroupId,
        status: 'pending',
      });

      //alert('Join request sent for the group!');
      navigate('/home');
    } catch (error) {
      //alert('Failed to join group. ' + (error.response?.data?.error || 'Error'));
    }
  };

  return (
    <div>
      <h3>Join an Existing Group</h3>
      {availableGroups.length > 0 ? (
        <form onSubmit={handleJoinGroup}>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            required
          >
            <option value="">Select a Group</option>
            {availableGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} - {group.description}
              </option>
            ))}
          </select>
          <button type="submit">Join Group</button>
        </form>
      ) : (
        <p>No groups available to join.</p>
      )}
    </div>
  );
};

export default JoinGroupPage;
