import api from './api';

export const fetchEnrollments = async ({
  page = 1,
  limit = 20,
  search = '',
  gradeLevelId = '',
  sectionId = '',
  unassigned = false,
} = {}) => {
  const response = await api.get('/admin/enrollments', {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(gradeLevelId ? { grade_level_id: gradeLevelId } : {}),
      ...(sectionId ? { section_id: sectionId } : {}),
      ...(unassigned ? { unassigned: 'true' } : {}),
    },
  });

  return response.data.data;
};

export const fetchSectionCapacity = async () => {
  const response = await api.get('/admin/enrollments/sections');
  return response.data.data;
};

export const enrollStudent = async (payload) => {
  const response = await api.post('/admin/enrollments', payload);
  return response.data.data;
};

export const moveEnrollment = async (id, payload) => {
  const response = await api.put(`/admin/enrollments/${id}`, payload);
  return response.data.data;
};

export const dropEnrollment = async (id) => {
  const response = await api.delete(`/admin/enrollments/${id}`);
  return response.data.data;
};
