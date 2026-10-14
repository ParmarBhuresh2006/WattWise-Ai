import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('ww_token');
    const stored = localStorage.getItem('ww_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
      // Optionally re-validate token
      authApi.getMe()
        .then(res => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('ww_token'); localStorage.removeItem('ww_user'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('ww_token', token);
    localStorage.setItem('ww_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('ww_token', token);
    localStorage.setItem('ww_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ww_token');
    localStorage.removeItem('ww_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await authApi.getMe();
    setUser(res.data.user);
    localStorage.setItem('ww_user', JSON.stringify(res.data.user));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
