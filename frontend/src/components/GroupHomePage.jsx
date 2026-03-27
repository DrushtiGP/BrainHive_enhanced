import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroupById, respondToJoinRequest, removeMember, leaveGroup } from '../store/groupsSlice';
import { addNotification } from '../store/notificationsSlice';
import RoleGuard from './RoleGuard';

const GroupHomePage = () => {
  const { groupId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const group = useSelector((state) => state.groups.currentGroup);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchGroupById(groupId));
  }, [groupId, dispatch]);

  const handleMembershipResponse = async (memberId, status) => {
    try {
      await dispatch(respondToJoinRequest({ groupId, memberId, status })).unwrap();
      dispatch(addNotification({ type: 'success', message: `Request ${status}.` }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to update membership.' }));
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await dispatch(removeMember({ groupId, memberId })).unwrap();
      dispatch(addNotification({ type: 'success', message: 'Member removed.' }));
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to remove member.' }));
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await dispatch(leaveGroup({ groupId, userId: user.id })).unwrap();
      dispatch(addNotification({ type: 'success', message: 'You have left the group.' }));
      navigate('/home');
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err || 'Failed to leave group.' }));
    }
  };

  if (!group) return <div style={{ padding: 24 }}>Loading group...</div>;

  const isLeader = user?.id === group.creator_id;
  const acceptedMembers = group.members?.filter(m => m.status === 'accepted') || [];
  const pendingMembers = group.members?.filter(m => m.status === 'pending') || [];
  const isMember = acceptedMembers.some(m => m.id === user?.id);

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2>{group.name}</h2>
      <p style={{ color: '#666' }}>{group.description}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {isMember && !isLeader && (
          <button onClick={handleLeaveGroup} style={{ color: 'red', border: '1px solid red', background: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: 4 }}>
            Leave Group
          </button>
        )}
      </div>

      <div>
        <h3>Members ({acceptedMembers.length})</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {acceptedMembers.map((m) => (
            <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
              <span>{m.name}</span>
              <span style={{ color: '#999', fontSize: 13 }}>({m.email})</span>
              {m.id === group.creator_id && <span style={{ fontSize: 11, background: '#f0a500', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>Leader</span>}
              <RoleGuard creatorId={group.creator_id}>
                {m.id !== group.creator_id && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    style={{ marginLeft: 'auto', color: 'red', background: 'none', border: '1px solid red', padding: '2px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 12 }}
                  >
                    Remove
                  </button>
                )}
              </RoleGuard>
            </li>
          ))}
        </ul>
      </div>

      <RoleGuard creatorId={group.creator_id}>
        <div style={{ marginTop: 24 }}>
          <h3>Pending Join Requests ({pendingMembers.length})</h3>
          {pendingMembers.length === 0 ? (
            <p style={{ color: '#999' }}>No pending requests.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {pendingMembers.map((m) => (
                <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span>{m.name}</span>
                  <span style={{ color: '#999', fontSize: 13 }}>({m.email})</span>
                  <button onClick={() => handleMembershipResponse(m.id, 'accepted')} style={{ marginLeft: 'auto', color: 'green', border: '1px solid green', background: 'none', padding: '2px 8px', cursor: 'pointer', borderRadius: 4 }}>Accept</button>
                  <button onClick={() => handleMembershipResponse(m.id, 'rejected')} style={{ color: 'red', border: '1px solid red', background: 'none', padding: '2px 8px', cursor: 'pointer', borderRadius: 4 }}>Reject</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </RoleGuard>
    </div>
  );
};

export default GroupHomePage;
