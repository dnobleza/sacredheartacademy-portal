import api from './api';

export const fetchNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data.data;
};
