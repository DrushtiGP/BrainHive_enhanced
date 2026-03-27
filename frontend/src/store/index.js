import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import groupsReducer from './groupsSlice';
import messagesReducer from './messagesSlice';
import notificationsReducer from './notificationsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupsReducer,
    messages: messagesReducer,
    notifications: notificationsReducer,
  },
});

export default store;
