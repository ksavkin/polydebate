'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, User, SignupRequestData, SignupVerifyData, LoginRequestData, LoginVerifyData, UpdateUserData } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signupRequestCode: (data: SignupRequestData) => Promise<{ success: boolean; message: string; expiryMinutes: number }>;
  signupVerifyCode: (data: SignupVerifyData) => Promise<{ success: boolean; message: string; user: User }>;
  loginRequestCode: (data: LoginRequestData) => Promise<{ success: boolean; message: string; expiryMinutes: number }>;
  loginVerifyCode: (data: LoginVerifyData) => Promise<{ success: boolean; message: string; user: User }>;
  logout: () => void;
  updateUser: (data: UpdateUserData) => Promise<{ success: boolean; message: string; user: User }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await apiClient.getCurrentUser();
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          // Clear invalid token
          apiClient.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const signupRequestCode = async (data: SignupRequestData) => {
    const response = await apiClient.signupRequestCode(data);
    return {
      success: response.success,
      message: response.message,
      expiryMinutes: response.expiry_minutes,
    };
  };

  const signupVerifyCode = async (data: SignupVerifyData) => {
    const response = await apiClient.signupVerifyCode(data);
    setUser(response.data.user);
    return {
      success: response.success,
      message: response.message,
      user: response.data.user,
    };
  };

  const loginRequestCode = async (data: LoginRequestData) => {
    const response = await apiClient.loginRequestCode(data);
    return {
      success: response.success,
      message: response.message,
      expiryMinutes: response.expiry_minutes,
    };
  };

  const loginVerifyCode = async (data: LoginVerifyData) => {
    const response = await apiClient.loginVerifyCode(data);
    setUser(response.data.user);
    return {
      success: response.success,
      message: response.message,
      user: response.data.user,
    };
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  const updateUser = async (data: UpdateUserData) => {
    const response = await apiClient.updateCurrentUser(data);
    setUser(response.data.user);
    return {
      success: response.success,
      message: response.message,
      user: response.data.user,
    };
  };

  const refreshUser = async () => {
    if (apiClient.isAuthenticated()) {
      try {
        const response = await apiClient.getCurrentUser();
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to refresh user:', error);
        logout();
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: user !== null,
    signupRequestCode,
    signupVerifyCode,
    loginRequestCode,
    loginVerifyCode,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
