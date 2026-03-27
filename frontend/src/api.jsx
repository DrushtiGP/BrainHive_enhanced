// src/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001', // your backend server URL
});

export default api;
