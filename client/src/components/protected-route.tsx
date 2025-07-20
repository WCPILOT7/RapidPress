import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, ensureAuth } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Ensure auth is checked when accessing protected routes
    ensureAuth().then((authenticatedUser) => {
      if (!authenticatedUser && !isLoading) {
        setLocation('/');
      }
    });
  }, [ensureAuth, isLoading, setLocation]);

  // Show loading only when actively checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}