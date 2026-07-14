import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role: 'pcelar' | 'admin';
  is_active: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: String) => Promise<void>;
  logout: () => Promise<void>;
  registerUser: (formData: FormData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          // Verify and get fresh user info from server
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (err) {
          console.error("Token verification failed on boot:", err);
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: String) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));
      
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Neuspešna prijava.');
    }
  };

  const logout = async () => {
    try {
      // Call logout route to write logout action in audit log
      await api.post('/auth/logout');
    } catch (err) {
      console.error("Failed to log logout activity in audit log on server:", err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  const registerUser = async (formData: FormData) => {
    try {
      await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Don't auto-log in, let them log in manually or we can auto-login if registration returns user.
      // The spec says: "Pčelar se registruje i prijavljuje u aplikaciju."
      // Let's redirect to login after registration.
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Neuspešna registracija.');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (err) {
      console.error("Failed to refresh user data:", err);
    }
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout, registerUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
