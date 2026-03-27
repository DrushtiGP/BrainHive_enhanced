import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const GroupHomePage = () => {
  const { groupId } = useParams();  // Get groupId from the route
  const [groupDetails, setGroupDetails] = useState(null);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/groups/${groupId}`);
        setGroupDetails(response.data);
      } catch (error) {
        console.error('Error fetching group details:', error);
      }
    };

    fetchGroupDetails();
  }, [groupId]);

  if (!groupDetails) return <div>Loading group...</div>;

  return (
    <div className="group-home-page">
      <h2>{groupDetails.name}</h2>
      <p>{groupDetails.description}</p>

      {/* Display more dynamic content like members or session details */}
      <div className="group-members">
        <h3>Group Members:</h3>
        <ul>
          {groupDetails.members.map((member) => (
            <li key={member.id}>{member.name}</li>
          ))}
        </ul>
      </div>

      <div className="sessions">
        <h3>Upcoming Sessions:</h3>
        {groupDetails.sessions.length > 0 ? (
          <ul>
            {groupDetails.sessions.map((session) => (
              <li key={session.id}>
                <strong>{session.topic}</strong> - {new Date(session.timing).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming sessions yet.</p>
        )}
      </div>
    </div>
  );
};

export default GroupHomePage;
