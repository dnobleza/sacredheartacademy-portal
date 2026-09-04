import api from './api';

export const fetchTeacherDashboard = async () => {
  const response = await api.get('/teacher/dashboard');
  return response.data.data;
};

export const fetchTeacherClasses = async () => {
  const response = await api.get('/teacher/classes');
  return response.data.data;
};

export const fetchSectionRoster = async (sectionId) => {
  const response = await api.get(`/teacher/classes/sections/${sectionId}/students`);
  return response.data.data;
};

export const updateTeacherProfile = async (payload) => {
  const response = await api.put('/teacher/profile', payload);
  return response.data.data;
};
