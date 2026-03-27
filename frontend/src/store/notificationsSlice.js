import { createSlice } from '@reduxjs/toolkit';

let nextId = 1;

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [] },
  reducers: {
    addNotification(state, action) {
      state.items.push({ id: nextId++, type: action.payload.type || 'info', message: action.payload.message });
    },
    removeNotification(state, action) {
      state.items = state.items.filter(n => n.id !== action.payload);
    },
  },
});

export const { addNotification, removeNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
