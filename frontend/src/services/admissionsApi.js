import api from './api';

export const fetchAdmissions = async ({ page = 1, limit = 10, search = '', status = '' } = {}) => {
  const response = await api.get('/admin/admissions', {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
    },
  });

  return response.data.data;
};

export const fetchAdmission = async (id) => {
  const response = await api.get(`/admin/admissions/${id}`);
  return response.data.data;
};

export const updateAdmissionStatus = async (id, payload) => {
  const response = await api.put(`/admin/admissions/${id}/status`, payload);
  return response.data.data;
};

export const acceptAdmission = async (id) => {
  const response = await api.post(`/admin/admissions/${id}/accept`, {});
  return response.data.data;
};

export const deleteAdmission = async (id) => {
  const response = await api.delete(`/admin/admissions/${id}`);
  return response.data.data;
};
