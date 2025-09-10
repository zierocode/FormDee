'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { notification } from 'antd';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  adminKey: string;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, adminKey }: { children: React.ReactNode; adminKey: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      setIsAuthenticated(response.ok);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        setIsAuthenticated(false);
        notification.success({
          message: 'Logged Out',
          description: 'Logged out successfully',
          placement: 'bottomRight',
        });
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      notification.error({
        message: 'Logout Failed',
        description: 'Failed to logout',
        placement: 'bottomRight',
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, adminKey, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}