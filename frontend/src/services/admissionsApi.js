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

/**
 * Documents live behind the authenticated admin endpoint, so they cannot be
 * used as a plain src/href. Fetch the bytes and hand back an object URL the
 * caller revokes when it is done, the same way imagesApi does.
 */
export const fetchAdmissionDocumentUrl = async (applicationId, documentId) => {
  const response = await api.get(`/admin/admissions/${applicationId}/documents/${documentId}`, {
    responseType: 'blob',
  });

  return URL.createObjectURL(response.data);
};

export const updateAdmissionStatus = async (id, payload) => {
  const response = await api.put(`/admin/admissions/${id}/status`, payload);
  return response.data.data;
};

/**
 * Sends an application back to the applicant with the specific items to fix.
 */
export const returnAdmission = async (id, payload) => {
  const response = await api.put(`/admin/admissions/${id}/return`, payload);
  return response.data.data;
};

/**
 * Approving places the student, so the grade level and section are required.
 */
export const acceptAdmission = async (id, payload) => {
  const response = await api.post(`/admin/admissions/${id}/accept`, payload);
  return response.data.data;
};

export const deleteAdmission = async (id) => {
  const response = await api.delete(`/admin/admissions/${id}`);
  return response.data.data;
};
