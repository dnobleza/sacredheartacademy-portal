import api from './api';

export const fetchCashierDashboard = async () => {
  const response = await api.get('/cashier/dashboard');
  return response.data.data;
};

export const searchStudents = async (query) => {
  const response = await api.get('/cashier/students/search', { params: { q: query } });
  return response.data.data;
};

export const fetchStudentAccount = async (studentId) => {
  const response = await api.get(`/cashier/students/${studentId}/account`);
  return response.data.data;
};

export const fetchOutstanding = async ({ page = 1, limit = 20, search = '' } = {}) => {
  const response = await api.get('/cashier/outstanding', {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data.data;
};

export const createPayment = async (payload) => {
  const response = await api.post('/cashier/payments', payload);
  return response.data.data;
};

export const fetchPayments = async ({
  page = 1,
  limit = 20,
  search = '',
  from,
  to,
  method,
  paymentType,
} = {}) => {
  const response = await api.get('/cashier/payments', {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(method ? { method } : {}),
      ...(paymentType ? { payment_type: paymentType } : {}),
    },
  });
  return response.data.data;
};

export const fetchPayment = async (id) => {
  const response = await api.get(`/cashier/payments/${id}`);
  return response.data.data;
};

export const fetchCurrentSession = async () => {
  const response = await api.get('/cashier/sessions/current');
  return response.data.data;
};

export const fetchSessions = async () => {
  const response = await api.get('/cashier/sessions');
  return response.data.data;
};

export const openSession = async (payload) => {
  const response = await api.post('/cashier/sessions/open', payload);
  return response.data.data;
};

export const closeSession = async (payload) => {
  const response = await api.post('/cashier/sessions/close', payload);
  return response.data.data;
};

export const fetchDailyReport = async (date) => {
  const response = await api.get('/cashier/reports/daily', { params: date ? { date } : {} });
  return response.data.data;
};

export const fetchMonthlyReport = async (month) => {
  const response = await api.get('/cashier/reports/monthly', { params: month ? { month } : {} });
  return response.data.data;
};

export const fetchCollectionSummary = async () => {
  const response = await api.get('/cashier/reports/summary');
  return response.data.data;
};
