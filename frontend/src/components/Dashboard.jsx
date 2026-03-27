import React, { useEffect, useState } from 'react';
import Axios from 'axios';

function Dashboard() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    Axios.get('http://localhost:5000/api/groups', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((response) => setGroups(response.data))
      .catch((error) => console.log(error));
  }, []);

  return (
    <div className="dashboard">
      <h1>Your Study Groups</h1>
      <ul>
        {groups.map((group) => (
          <li key={group.id}>{group.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
