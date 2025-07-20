import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    // Show a fast loading skeleton that matches app layout
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded mr-3 animate-pulse" />
                <div className="hidden md:flex md:space-x-8">
                  <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                  <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                  <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                  <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg border p-6">
              <div className="w-3/4 h-6 bg-gray-200 rounded mb-2 animate-pulse" />
              <div className="w-1/2 h-4 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-200 rounded animate-pulse" />
                <div className="w-full h-3 bg-gray-200 rounded animate-pulse" />
                <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="bg-white rounded-lg border p-6">
              <div className="w-1/2 h-6 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="w-full h-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}