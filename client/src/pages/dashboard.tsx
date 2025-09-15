import { useQuery } from '@tanstack/react-query';
import { getPressReleases, getAdvertisements, getUsageSummary } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function Dashboard() {
  const { toast } = useToast();

  const { data: releases, error: releasesError, isLoading: releasesLoading } = useQuery({
    queryKey: ['/api/releases'],
    queryFn: getPressReleases,
  });

  const { data: advertisements, error: adsError, isLoading: adsLoading } = useQuery({
    queryKey: ['/api/advertisements'],
    queryFn: getAdvertisements,
  });

  const { data: usage, error: usageError, isLoading: usageLoading } = useQuery({
    queryKey: ['/api/usage/summary'],
    queryFn: getUsageSummary,
  });

  useEffect(() => {
    if (releasesError) toast({ title: 'Error', description: 'Failed to load releases', variant: 'destructive' });
    if (adsError) toast({ title: 'Error', description: 'Failed to load advertisements', variant: 'destructive' });
    if (usageError) toast({ title: 'Error', description: 'Failed to load usage stats', variant: 'destructive' });
  }, [releasesError, adsError, usageError, toast]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Press Releases</CardTitle></CardHeader>
          <CardContent>
            {releasesLoading ? 'Loading...' : Array.isArray(releases) ? releases.length : 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Advertisements</CardTitle></CardHeader>
          <CardContent>
            {adsLoading ? 'Loading...' : Array.isArray(advertisements) ? advertisements.length : 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Token Usage (Month)</CardTitle></CardHeader>
          <CardContent>
            {usageLoading ? 'Loading...' : usage ? JSON.stringify(usage) : '—'}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
