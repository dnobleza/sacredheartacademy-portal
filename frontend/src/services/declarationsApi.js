import api from './api';

/**
 * A student telling the school they have paid. It records a claim, not money:
 * only the cashier's confirmation creates a real payment.
 */
export const declarePayment = async (payload) => {
  const response = await api.post('/student/payments/declare', payload);
  return response.data.data;
};

export const fetchMyDeclarations = async () => {
  const response = await api.get('/student/payments');
  return response.data.data;
};

export const fetchDeclarations = async (status = 'pending') => {
  const response = await api.get('/cashier/declarations', { params: status ? { status } : {} });
  return response.data.data;
};

export const confirmDeclaration = async (id, payload = {}) => {
  const response = await api.post(`/cashier/declarations/${id}/confirm`, payload);
  return response.data.data;
};

export const rejectDeclaration = async (id, payload) => {
  const response = await api.post(`/cashier/declarations/${id}/reject`, payload);
  return response.data.data;
};
