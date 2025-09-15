import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest, onUnauthorized } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        setUser(null);
      }
    } catch (_) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // Subscribe to global unauthorized events
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
      setLocation('/login');
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const data = await response.json();
      setUser(data.user);
    } catch (e) {
      setUser(null);
      throw e;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', { name, email, password });
      const data = await response.json();
      setUser(data.user);
    } catch (e) {
      setUser(null);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};