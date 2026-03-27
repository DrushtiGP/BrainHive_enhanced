import React, { useState } from 'react';
import axios from 'axios';

const CreateGroupPage = ({ loggedInUser, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const handleGroupCreate = async (e) => {
    e.preventDefault();

    if (!loggedInUser) {
     // alert('Please log in to create a group.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/groups', {
        name: groupName,
        description: groupDescription,
        creatorId: loggedInUser.id,
      });

      await axios.post('http://localhost:3001/group-membership', {
        userId: loggedInUser.id,
        groupId: response.data.groupId,
        status: 'accepted',
      });

     // alert('Group created successfully!');
      
      // Trigger session handling logic in the parent component
      onGroupCreated(response.data); // Pass the group to the callback
    } catch (error) {
      //alert('Failed to create group. ' + (error.response?.data?.error || 'Error'));
    }
  };

  return (
    <div>
      <h3>Create a Study Group</h3>
      <form onSubmit={handleGroupCreate}>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
        />
        <textarea
          placeholder="Group Description"
          value={groupDescription}
          onChange={(e) => setGroupDescription(e.target.value)}
          required
        />
        <button type="submit">Create Group</button>
      </form>
    </div>
  );
};

export default CreateGroupPage;
