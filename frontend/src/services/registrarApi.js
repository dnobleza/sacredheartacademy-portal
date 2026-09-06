import api from './api';

export const fetchRegistrarDashboard = async () => {
  const response = await api.get('/admin/registrar-dashboard');
  return response.data.data;
};
