import api from './api';

/**
 * The signed-in user's own profile, whatever their role. The server resolves
 * the record from the token, so there is no id to pass and no way to reach
 * somebody else's.
 */
export const fetchMyProfile = async () => {
  const response = await api.get('/profile');
  return response.data.data;
};

/**
 * Accepts contact_number, address and photo_id only; the server ignores
 * anything else.
 */
export const updateMyProfile = async (payload) => {
  const response = await api.put('/profile', payload);
  return response.data.data;
};
