import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Advertisements from "@/pages/advertisements";
import PureLanding from "@/pages/pure-landing";
import { Suspense, lazy } from "react";

// Lazy load heavy components only when needed
const LazyHome = lazy(() => import("@/pages/home"));
const LazyAdvertisements = lazy(() => import("@/pages/advertisements"));

function AppRouter() {
  const [location] = useLocation();
  
  // Landing page has ZERO dependencies - completely isolated
  if (location === '/') {
    return <PureLanding />;
  }
  
  // All other routes load full app with auth context
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Switch>
            <Route path="/dashboard">
              <ProtectedRoute>
                <Navigation />
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyHome />
                </Suspense>
              </ProtectedRoute>
            </Route>
            <Route path="/advertisements">
              <ProtectedRoute>
                <Navigation />
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyAdvertisements />
                </Suspense>
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return <AppRouter />;
}

export default App;