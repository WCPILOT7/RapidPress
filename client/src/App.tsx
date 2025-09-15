import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home"; // legacy generation page
import Dashboard from "@/pages/dashboard";
import Advertisements from "@/pages/advertisements";
import SimpleLanding from "@/pages/simple-landing";
import Login from "@/pages/login";
import Register from "@/pages/register";

function Router() {
  return (
    <Switch>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Navigation />
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/advertisements">
        <ProtectedRoute>
          <Navigation />
          <Advertisements />
        </ProtectedRoute>
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={SimpleLanding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
