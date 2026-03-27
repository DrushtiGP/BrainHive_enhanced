import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api';

export const fetchMessages = createAsyncThunk('messages/fetch', async (groupId, { rejectWithValue }) => {
  try {
    const res = await api.get('/messages', { params: { groupId } });
    return res.data.messages || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch messages');
  }
});

export const sendMessage = createAsyncThunk('messages/send', async ({ groupId, userId, message }, { rejectWithValue }) => {
  try {
    await api.post('/messages', { groupId, userId, message });
    return { groupId, userId, message, created_at: new Date().toISOString() };
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to send message');
  }
});

const messagesSlice = createSlice({
  name: 'messages',
  initialState: { messages: [], status: 'idle', error: null },
  reducers: {
    clearMessages(state) { state.messages = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.fulfilled, (state, action) => { state.messages = action.payload; })
      .addCase(sendMessage.fulfilled, (state, action) => { state.messages.push(action.payload); });
  },
});

export const { clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;
