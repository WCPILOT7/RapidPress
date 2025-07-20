import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Advertisements from "@/pages/advertisements";
import Test from "@/pages/test";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Development mode bypass - check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isDev = urlParams.get('bypass') === 'true';

  // Simple routing debug - just show the test component for now
  return (
    <div>
      <Test />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
