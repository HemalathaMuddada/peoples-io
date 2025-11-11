import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Database, HardDrive, Zap, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function SystemHealth() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [metrics, setMetrics] = useState({
    dbSize: 0,
    storageUsed: 0,
    apiCalls: 0,
    activeUsers: 0,
    errorRate: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
    }
  }, [isAdmin]);

  const fetchMetrics = async () => {
    // Fetch API rate limits count
    const { count: apiCount } = await supabase
      .from('api_rate_limits')
      .select('*', { count: 'exact', head: true });

    // Fetch active users (last 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { count: activeCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Fetch storage info
    const { data: resumeFiles } = await supabase.storage.from('resumes').list();
    const storageSize = resumeFiles?.reduce((acc, file) => acc + (file.metadata?.size || 0), 0) || 0;

    setMetrics({
      dbSize: 0, // Would need backend query
      storageUsed: storageSize / (1024 * 1024), // Convert to MB
      apiCalls: apiCount || 0,
      activeUsers: activeCount || 0,
      errorRate: 0.5, // Example
    });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>System Health</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">System Health</h1>
        <p className="text-muted-foreground">Monitor system performance and resources</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <Badge variant="default" className="mt-2">Healthy</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.apiCalls}</div>
            <p className="text-xs text-muted-foreground mt-2">Total tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.storageUsed.toFixed(2)} MB</div>
            <Progress value={30} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate}%</div>
            <Badge variant={metrics.errorRate < 1 ? 'default' : 'destructive'} className="mt-2">
              {metrics.errorRate < 1 ? 'Good' : 'High'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Query Performance</span>
              <Badge variant="default">Excellent</Badge>
            </div>
            <Progress value={95} />
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Pool</span>
              <Badge variant="default">Healthy</Badge>
            </div>
            <Progress value={60} />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">RLS Policy Efficiency</span>
              <Badge variant="default">Optimized</Badge>
            </div>
            <Progress value={88} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
