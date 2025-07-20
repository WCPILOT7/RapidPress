import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

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
  ensureAuth: () => Promise<User | null>;
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
  const [isLoading, setIsLoading] = useState(false); // Don't block initial render
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const checkAuth = async () => {
    if (hasCheckedAuth) return; // Prevent duplicate checks
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setIsLoading(false);
      setHasCheckedAuth(true);
    }
  };

  // REMOVED: No automatic auth check on load - completely manual
  // Auth will only be checked when explicitly called by ProtectedRoute
  // This eliminates all database calls on landing page load

  const login = async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();
    setUser(data.user);
    setHasCheckedAuth(true); // Mark as authenticated without extra API call
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/register', { name, email, password });
    const data = await response.json();
    setUser(data.user);
    setHasCheckedAuth(true); // Mark as authenticated without extra API call
  };

  const logout = async () => {
    await apiRequest('POST', '/api/auth/logout');
    setUser(null);
    setHasCheckedAuth(false); // Reset auth check state
  };

  // Expose checkAuth for manual calls when needed
  const ensureAuth = async () => {
    if (!hasCheckedAuth) {
      await checkAuth();
    }
    return user;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, ensureAuth }}>
      {children}
    </AuthContext.Provider>
  );
};