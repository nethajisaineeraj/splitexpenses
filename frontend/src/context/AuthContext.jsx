import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  async function login(values) {
    const { data } = await api.post('/auth/login', values);
    setUser(data.user);
  }

  async function register(values) {
    const { data } = await api.post('/auth/register', values);
    setUser(data.user);
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  async function forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  }

  async function resetPassword(token, password) {
    const { data } = await api.post(`/auth/reset-password/${token}`, { password });
    return data;
  }

  const value = useMemo(() => ({ user, loading, login, register, logout, forgotPassword, resetPassword }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
