import api from './api';

/**
 * Messaging is role-agnostic: /messages is guarded by authentication only, so
 * every portal uses these same calls.
 */
export const fetchConversations = async () => {
  const response = await api.get('/messages/conversations');
  return response.data.data;
};

export const fetchThread = async (userId) => {
  const response = await api.get(`/messages/with/${userId}`);
  return response.data.data;
};

export const sendMessage = async (payload) => {
  const response = await api.post('/messages', payload);
  return response.data.data;
};

export const fetchRecipients = async (search) => {
  const response = await api.get('/messages/recipients', {
    params: search ? { search } : undefined,
  });
  return response.data.data;
};

export const fetchUnreadMessageCount = async () => {
  const response = await api.get('/messages/unread-count');
  return response.data.data.unread_count;
};
