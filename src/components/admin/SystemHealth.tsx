import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Database, HardDrive, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function SystemHealth() {
  const [health, setHealth] = useState({
    apiStatus: 'healthy',
    dbStatus: 'healthy',
    storageUsage: 0,
    activeUsers: 0,
    responseTime: 0,
  });

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    const startTime = performance.now();
    
    try {
      // Test DB connection
      const { error: dbError } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      
      // Get storage usage (mock for now)
      const { data: storageData } = await supabase.storage.getBucket('resumes');
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      setHealth({
        apiStatus: responseTime < 1000 ? 'healthy' : 'slow',
        dbStatus: dbError ? 'error' : 'healthy',
        storageUsage: Math.random() * 100, // Mock data
        activeUsers: Math.floor(Math.random() * 50), // Mock data
        responseTime,
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth(prev => ({ ...prev, apiStatus: 'error' }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'slow': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'error': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const metrics = [
    {
      label: 'API Status',
      value: health.apiStatus,
      icon: Zap,
      color: getStatusColor(health.apiStatus),
    },
    {
      label: 'Database',
      value: health.dbStatus,
      icon: Database,
      color: getStatusColor(health.dbStatus),
    },
    {
      label: 'Response Time',
      value: `${health.responseTime}ms`,
      icon: Activity,
      color: health.responseTime < 500 ? getStatusColor('healthy') : getStatusColor('slow'),
    },
    {
      label: 'Active Now',
      value: health.activeUsers,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{metric.label}</span>
              </div>
              <Badge className={metric.color} variant="outline">
                {metric.value}
              </Badge>
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Usage
            </span>
            <span className="font-medium">{health.storageUsage.toFixed(1)}%</span>
          </div>
          <Progress value={health.storageUsage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
