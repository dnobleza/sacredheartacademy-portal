import api from './api';

/**
 * Every endpoint here is scoped to the signed-in student by the server, so
 * none of them take a student id.
 */
export const fetchStudentDashboard = async () => {
  const response = await api.get('/student/dashboard');
  return response.data.data;
};

export const fetchStudentProfile = async () => {
  const response = await api.get('/student/profile');
  return response.data.data;
};

export const fetchStudentClasses = async () => {
  const response = await api.get('/student/classes');
  return response.data.data;
};

export const fetchStudentSchedule = async () => {
  const response = await api.get('/student/schedule');
  return response.data.data;
};

export const fetchStudentGrades = async () => {
  const response = await api.get('/student/grades');
  return response.data.data;
};

export const fetchStudentAttendance = async () => {
  const response = await api.get('/student/attendance');
  return response.data.data;
};
