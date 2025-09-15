import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Centralized 401 handler registry (simple subscription pattern)
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

async function handleUnauthorized() {
  unauthorizedListeners.forEach((l) => {
    try { l(); } catch {}
  });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  if (res.status === 401) {
    await handleUnauthorized();
  }
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      await handleUnauthorized();
      return null;
    }
    if (res.status === 401) {
      await handleUnauthorized();
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Convenience typed helpers (can be expanded later)
export async function getPressReleases() {
  const res = await apiRequest('GET', '/api/releases');
  return res.json();
}

export async function getAdvertisements() {
  const res = await apiRequest('GET', '/api/advertisements');
  return res.json();
}

export async function getUsageSummary() {
  const res = await apiRequest('GET', '/api/usage/summary');
  return res.json();
}
