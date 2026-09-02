import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  // Required: the refresh token lives in an httpOnly cookie that the browser
  // only sends on cross-origin requests when credentials are enabled.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * The access token is held in module scope — never in localStorage or
 * sessionStorage, so a cross-site script cannot read it. It is deliberately
 * lost on reload; AuthContext calls /auth/refresh to mint a new one.
 */
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Shared across concurrent 401s so a burst of failed requests triggers exactly
// one refresh call rather than one per request.
let refreshRequest = null;

export const requestNewAccessToken = () => {
  if (!refreshRequest) {
    refreshRequest = api
      .post('/auth/refresh', {}, { skipAuthRefresh: true })
      .then((response) => {
        const session = response.data?.data || null;
        setAccessToken(session?.accessToken);
        return session;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthFailure = error.response?.status === 401;

    // Never retry the refresh call itself, or a request already retried once.
    if (!isAuthFailure || !original || original.skipAuthRefresh || original.retriedAfterRefresh) {
      return Promise.reject(error);
    }

    try {
      const session = await requestNewAccessToken();

      if (!session?.accessToken) {
        return Promise.reject(error);
      }

      original.retriedAfterRefresh = true;
      return await api(original);
    } catch {
      setAccessToken(null);
      return Promise.reject(error);
    }
  },
);

/**
 * Pulls the message out of the backend's { success, code, message } error
 * shape, falling back to something useful when the server cannot be reached.
 */
export const extractErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.request && !error.response) {
    return 'Cannot reach the server. Please check your connection and try again.';
  }

  return fallback;
};

export default api;
