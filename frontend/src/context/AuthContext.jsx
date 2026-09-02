import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { requestNewAccessToken, setAccessToken } from '../services/api';

const AuthContext = createContext(null);

/**
 * Holds the signed-in user for the app. The access token itself lives in the
 * api module, not in state, so nothing renders it and nothing persists it.
 *
 * `status` starts as 'loading' while the initial refresh call is in flight —
 * ProtectedRoute must wait for that to settle, otherwise a signed-in user is
 * bounced to /login on every page load.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const applySession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    setProfile(data.profile || null);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setProfile(null);
    setStatus('anonymous');
  }, []);

  // Exchange the httpOnly refresh cookie for an access token on first load.
  useEffect(() => {
    let cancelled = false;

    // Shares the single in-flight refresh in api.js, so StrictMode's double
    // mount in development issues one request, not two.
    requestNewAccessToken()
      .then((session) => {
        if (!cancelled && session) {
          applySession(session);
        }
      })
      .catch(() => {
        // No cookie, or it expired — the visitor is simply signed out.
        if (!cancelled) {
          clearSession();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (email, password) => {
      const response = await api.post('/auth/login', { email, password }, { skipAuthRefresh: true });
      applySession(response.data.data);
      return response.data.data.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Sign out locally even if the request fails — the user asked to leave.
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      status,
      user,
      profile,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
    }),
    [status, user, profile, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
