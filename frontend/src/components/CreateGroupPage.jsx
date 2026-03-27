import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createGroup } from '../store/groupsSlice';
import { addNotification } from '../store/notificationsSlice';

const CreateGroupPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(createGroup({ name: groupName, description: groupDescription, creatorId: user.id })).unwrap();
      dispatch(addNotification({ type: 'success', message: 'Group created successfully!' }));
      navigate(`/groups/${result.groupId}`);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to create group.' }));
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
      <h3>Create a Study Group</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8, padding: 8 }}
        />
        <textarea
          placeholder="Group Description"
          value={groupDescription}
          onChange={(e) => setGroupDescription(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8, padding: 8, minHeight: 80 }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>Create Group</button>
      </form>
    </div>
  );
};

export default CreateGroupPage;
