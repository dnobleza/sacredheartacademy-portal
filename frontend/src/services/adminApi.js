import api from './api';

/**
 * Thin wrappers over the admin CRUD endpoints. Every one is behind
 * authenticateToken + authorizeRoles('admin') on the server, so the browser
 * guard is convenience only.
 */
const resourcePath = (resource) => `/admin/${resource}`;

export const listResource = async (resource, { page = 1, limit = 10, search = '' } = {}) => {
  const params = { page, limit };

  if (search) {
    params.search = search;
  }

  const response = await api.get(resourcePath(resource), { params });
  const data = response.data.data;

  return {
    // The server names the array after the resource: students/teachers/parents.
    items: data[resource] || [],
    pagination: data.pagination,
  };
};

export const getResource = async (resource, id) => {
  const response = await api.get(`${resourcePath(resource)}/${id}`);
  return response.data.data;
};

export const createResource = async (resource, payload) => {
  const response = await api.post(resourcePath(resource), payload);
  return response.data.data;
};

export const updateResource = async (resource, id, payload) => {
  const response = await api.put(`${resourcePath(resource)}/${id}`, payload);
  return response.data.data;
};

export const deleteResource = async (resource, id) => {
  const response = await api.delete(`${resourcePath(resource)}/${id}`);
  return response.data.data;
};

/**
 * Access levels for the admin role, for the picker on the Admins form. The
 * server scopes the list to admin levels, so whatever comes back is safe to
 * offer.
 */
export const fetchAccessLevels = async () => {
  const response = await api.get('/admin/access-levels');
  return response.data.data.access_levels || [];
};

/**
 * No stats endpoint exists, so totals come from each list endpoint's
 * pagination block with the smallest possible page.
 */
export const fetchCounts = async () => {
  const resources = ['students', 'teachers', 'parents'];

  const results = await Promise.all(
    resources.map((resource) =>
      listResource(resource, { page: 1, limit: 1 })
        .then((data) => [resource, data.pagination.total])
        .catch(() => [resource, null]),
    ),
  );

  return Object.fromEntries(results);
};
