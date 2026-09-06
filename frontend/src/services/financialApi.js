import api from './api';

/**
 * A student's own account. The server scopes it to the signed-in student, so
 * there is no id to pass.
 */
export const fetchMyFinancialAccount = async () => {
  const response = await api.get('/student/account');
  return response.data.data;
};

export const fetchMyChildren = async () => {
  const response = await api.get('/parent/children');
  return response.data.data;
};

/**
 * A parent may only read a child linked to them through student_parents; the
 * server refuses anything else.
 */
export const fetchChildAccount = async (studentId) => {
  const response = await api.get(`/parent/children/${studentId}/account`);
  return response.data.data;
};
