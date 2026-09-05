import axios from 'axios';

/**
 * A bare client for the endpoints that work signed out. It deliberately does
 * not reuse services/api.js: that instance attaches a bearer token and its 401
 * interceptor tries to refresh the session, which is meaningless — and
 * confusing to debug — for a visitor who has no session at all.
 */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export const fetchAdmissionGradeLevels = async () => {
  const response = await publicApi.get('/admissions/grade-levels');
  return response.data.data;
};

export const submitAdmissionApplication = async (payload) => {
  const response = await publicApi.post('/admissions', payload);
  return response.data.data;
};


/**
 * The school's public news feed. The server returns only announcements posted
 * to everyone, and deliberately carries no author — the public site credits
 * the school itself.
 */
export const fetchPublicAnnouncements = async () => {
  const response = await publicApi.get('/announcements');
  return response.data.data;
};

export const publicAnnouncementImageUrl = (announcementId) =>
  `${publicApi.defaults.baseURL}/announcements/${announcementId}/image`;

export default publicApi;
