"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for persisted user on mount
    const loadUser = async () => {
      try {
        const storedUser = await authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (e) {
        console.error("Session restore failed", e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const user = await authService.login(email, password);
      setUser(user);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const user = await authService.register(name, email, password, role);
      setUser(user);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = async (updates) => {
    try {
      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Role helpers
  const role = user?.role || user?.account_type || 'user';
  const isBusiness = role === 'business' || role === 'admin'; // Admin has business privileges
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      role,
      isBusiness,
      isAdmin,
      login, 
      register, 
      logout, 
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
