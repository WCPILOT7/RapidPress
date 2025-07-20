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
  // Simple test - bypass all routing for now
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Test</h1>
      <p>Current URL: {window.location.href}</p>
      <p>Search: {window.location.search}</p>
      <p>Bypass: {new URLSearchParams(window.location.search).get('bypass')}</p>
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
