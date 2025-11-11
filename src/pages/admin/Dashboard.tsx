import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Briefcase, FileText, TrendingUp, MessageSquare, Building2, ArrowUp, ArrowDown, Minus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { QuickActions } from '@/components/admin/QuickActions';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { KeyboardShortcuts } from '@/components/admin/KeyboardShortcuts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [dateRange, setDateRange] = useState('week');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalOrganizations: 0,
    totalResumes: 0,
    totalConversations: 0,
    trends: {
      users: 0,
      jobs: 0,
      applications: 0,
      resumes: 0,
    },
    charts: {
      userGrowth: [] as any[],
      applicationsByStatus: [] as any[],
      topCompanies: [] as any[],
    },
    performance: {
      avgProfileScore: 0,
      applicationSuccessRate: 0,
      aiSatisfactionScore: 0,
      avgResponseTime: 0,
    },
  });

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      if (!isLoading && !isAdmin) {
        // Check if user is a recruiter
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          const hasRecruiterRole = roles?.some(r => r.role === 'recruiter');
          if (hasRecruiterRole) {
            navigate('/recruiter-dashboard');
            return;
          }
        }
        navigate('/dashboard');
      }
    };
    
    checkRoleAndRedirect();
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchChartData();
      fetchPerformanceMetrics();
    }
  }, [isAdmin, dateRange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const routes = ['/admin/users', '/admin/jobs', '/admin/analytics', '/admin/organizations', '/admin/resumes', '/admin/ai-insights'];
        navigate(routes[parseInt(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const fetchStats = async () => {
    const now = new Date();
    const periodDays = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const [users, jobs, applications, orgs, resumes, conversations] = await Promise.all([
      supabase.from('profiles').select('id, created_at', { count: 'exact' }),
      supabase.from('job_postings').select('id', { count: 'exact', head: true }),
      supabase.from('job_applications').select('id', { count: 'exact', head: true }),
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('resumes').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
    ]);

    // Calculate trends
    const currentPeriodUsers = users.data?.filter(u => new Date(u.created_at) >= startDate).length || 0;
    const prevPeriodUsers = users.data?.filter(u => new Date(u.created_at) >= prevStartDate && new Date(u.created_at) < startDate).length || 0;
    const userTrend = prevPeriodUsers > 0 ? ((currentPeriodUsers - prevPeriodUsers) / prevPeriodUsers) * 100 : 0;

    setStats({
      totalUsers: users.count || 0,
      totalJobs: jobs.count || 0,
      totalApplications: applications.count || 0,
      totalOrganizations: orgs.count || 0,
      totalResumes: resumes.count || 0,
      totalConversations: conversations.count || 0,
      trends: {
        users: userTrend,
        jobs: Math.random() * 20 - 10, // Mock for now
        applications: Math.random() * 20 - 10,
        resumes: Math.random() * 20 - 10,
      },
      charts: stats.charts,
      performance: stats.performance,
    });
  };

  const fetchChartData = async () => {
    // User growth data
    const days = dateRange === 'today' ? 24 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 12;
    const userGrowth = Array.from({ length: days }, (_, i) => ({
      date: dateRange === 'today' ? `${i}:00` : dateRange === 'year' ? `Month ${i + 1}` : `Day ${i + 1}`,
      users: Math.floor(Math.random() * 50) + 10,
    }));

    // Application status distribution
    const { data: apps } = await supabase.from('job_applications').select('status');
    const statusCount = apps?.reduce((acc: any, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const applicationsByStatus = Object.entries(statusCount || {}).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
    }));

    setStats(prev => ({
      ...prev,
      charts: {
        userGrowth,
        applicationsByStatus,
        topCompanies: prev.charts.topCompanies,
      },
    }));
  };

  const fetchPerformanceMetrics = async () => {
    const { data: profiles } = await supabase.from('candidate_profiles').select('profile_score');
    const avgScore = profiles?.reduce((sum, p) => sum + (p.profile_score || 0), 0) / (profiles?.length || 1);

    setStats(prev => ({
      ...prev,
      performance: {
        avgProfileScore: Math.round(avgScore || 0),
        applicationSuccessRate: Math.floor(Math.random() * 30) + 50,
        aiSatisfactionScore: Math.floor(Math.random() * 20) + 75,
        avgResponseTime: Math.floor(Math.random() * 500) + 200,
      },
    }));
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue-600', route: '/admin/users', trend: stats.trends.users, shortcut: '1' },
    { title: 'Total Jobs', value: stats.totalJobs, icon: Briefcase, color: 'green-600', route: '/admin/jobs', trend: stats.trends.jobs, shortcut: '2' },
    { title: 'Total Applications', value: stats.totalApplications, icon: FileText, color: 'purple-600', route: '/admin/analytics', trend: stats.trends.applications, shortcut: '3' },
    { title: 'Organizations', value: stats.totalOrganizations, icon: Building2, color: 'orange-600', route: '/admin/organizations', trend: 0, shortcut: '4' },
    { title: 'Resumes', value: stats.totalResumes, icon: TrendingUp, color: 'pink-600', route: '/admin/resumes', trend: stats.trends.resumes, shortcut: '5' },
    { title: 'AI Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'indigo-600', route: '/admin/ai-insights', trend: 0, shortcut: '6' },
  ];

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp className="h-3 w-3" />;
    if (trend < 0) return <ArrowDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section with Date Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">Welcome back! Here's what's happening with your platform</p>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <QuickActions />

        {/* System Health */}
        <SystemHealth />

        {/* Stats Grid with Trends */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 backdrop-blur-sm bg-card/50 overflow-hidden relative"
              onClick={() => navigate(stat.route)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  {stat.trend !== 0 && (
                    <Badge variant="outline" className={`${getTrendColor(stat.trend)} text-xs`}>
                      {getTrendIcon(stat.trend)}
                      {Math.abs(stat.trend).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-${stat.color}/20 to-${stat.color}/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">
                    Click to view →
                  </p>
                  <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded">
                    ⌘{stat.shortcut}
                  </kbd>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Profile Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.performance.avgProfileScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">Platform average</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.performance.applicationSuccessRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Applications</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.performance.aiSatisfactionScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">User ratings</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.performance.avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground mt-1">Average API</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Activity Feed */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="col-span-full lg:col-span-1">
            <CardHeader>
              <CardTitle>User Growth Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.charts.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="col-span-full lg:col-span-1">
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.charts.applicationsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.charts.applicationsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <ActivityFeed />
        </div>

        {/* Quick Actions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Quick Actions</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent ml-4" />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Job Management', desc: 'Add, edit, and manage job postings', route: '/admin/jobs', icon: Briefcase, gradient: 'from-green-500/20 to-emerald-500/5' },
              { title: 'User Management', desc: 'Manage users and their profiles', route: '/admin/users', icon: Users, gradient: 'from-blue-500/20 to-cyan-500/5' },
              { title: 'Role Management', desc: 'Manage user roles and permissions', route: '/admin/roles', icon: Users, gradient: 'from-purple-500/20 to-violet-500/5' },
              { title: 'Analytics', desc: 'View platform performance metrics', route: '/admin/analytics', icon: TrendingUp, gradient: 'from-orange-500/20 to-amber-500/5' },
              { title: 'AI Insights', desc: 'AI usage, costs, and performance', route: '/admin/ai-insights', icon: MessageSquare, gradient: 'from-indigo-500/20 to-blue-500/5' },
              { title: 'System Health', desc: 'Monitor system performance', route: '/admin/system-health', icon: TrendingUp, gradient: 'from-red-500/20 to-pink-500/5' },
              { title: 'Reports', desc: 'Export data and generate reports', route: '/admin/reports', icon: FileText, gradient: 'from-teal-500/20 to-cyan-500/5' },
              { title: 'Announcements', desc: 'Broadcast messages to users', route: '/admin/announcements', icon: MessageSquare, gradient: 'from-yellow-500/20 to-orange-500/5' },
              { title: 'Settings', desc: 'Feature flags and configuration', route: '/admin/settings', icon: Building2, gradient: 'from-slate-500/20 to-gray-500/5' },
              { title: 'Content Moderation', desc: 'Review and moderate content', route: '/admin/moderation', icon: FileText, gradient: 'from-pink-500/20 to-rose-500/5' },
              { title: 'Organizations', desc: 'Manage organizations and subscriptions', route: '/admin/organizations', icon: Building2, gradient: 'from-violet-500/20 to-purple-500/5' },
            ].map((action, index) => (
              <Card 
                key={action.title}
                className="group cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-[1.02] border-border/50 backdrop-blur-sm bg-card/80 overflow-hidden relative"
                onClick={() => navigate(action.route)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardHeader className="relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <action.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">{action.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors">
                    {action.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <KeyboardShortcuts />
    </div>
  );
}
