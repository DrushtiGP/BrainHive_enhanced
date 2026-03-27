import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api';

export const fetchUserGroups = createAsyncThunk('groups/fetchUserGroups', async (userId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/groups/user/${userId}`);
    return res.data.groups || [];
  } catch (err) {
    // 404 just means no groups yet — not an error
    if (err.response?.status === 404) return [];
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch groups');
  }
});

export const fetchGroupById = createAsyncThunk('groups/fetchGroupById', async (groupId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/groups/${groupId}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to fetch group');
  }
});

export const createGroup = createAsyncThunk('groups/createGroup', async ({ name, description, creatorId }, { rejectWithValue }) => {
  try {
    const res = await api.post('/groups', { name, description, creatorId });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to create group');
  }
});

export const respondToJoinRequest = createAsyncThunk(
  'groups/respondToJoinRequest',
  async ({ groupId, memberId, status }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/groups/${groupId}/members/${memberId}`, { status });
      return { memberId, status, message: res.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update membership');
    }
  }
);

export const removeMember = createAsyncThunk(
  'groups/removeMember',
  async ({ groupId, memberId }, { rejectWithValue }) => {
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      return { memberId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to remove member');
    }
  }
);

export const leaveGroup = createAsyncThunk(
  'groups/leaveGroup',
  async ({ groupId, userId }, { rejectWithValue }) => {
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      return { groupId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to leave group');
    }
  }
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState: {
    list: [],
    currentGroup: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    clearCurrentGroup(state) { state.currentGroup = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserGroups.fulfilled, (state, action) => { state.list = action.payload || []; })
      .addCase(fetchUserGroups.rejected, (state) => { state.list = []; })
      .addCase(fetchGroupById.fulfilled, (state, action) => { state.currentGroup = action.payload; })
      .addCase(createGroup.fulfilled, (state) => { state.status = 'idle'; })
      .addCase(leaveGroup.fulfilled, (state, action) => {
        state.list = state.list.filter(g => g.id !== action.payload.groupId);
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        if (state.currentGroup?.members) {
          state.currentGroup.members = state.currentGroup.members.filter(
            m => m.id !== action.payload.memberId
          );
        }
      })
      .addCase(respondToJoinRequest.fulfilled, (state, action) => {
        if (state.currentGroup?.members) {
          if (action.payload.status === 'rejected') {
            state.currentGroup.members = state.currentGroup.members.filter(
              m => m.id !== action.payload.memberId
            );
          } else {
            state.currentGroup.members = state.currentGroup.members.map(m =>
              m.id === action.payload.memberId ? { ...m, status: action.payload.status } : m
            );
          }
        }
      });
  },
});

export const { clearCurrentGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
