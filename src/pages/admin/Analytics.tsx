import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Briefcase, FileText, MessageSquare } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Analytics() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [analytics, setAnalytics] = useState({
    userGrowth: [] as any[],
    applicationStatus: [] as any[],
    topCompanies: [] as any[],
    aiUsage: 0,
    avgProfileScore: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin]);

  const fetchAnalytics = async () => {
    // User growth over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: users } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    const usersByDay = users?.reduce((acc: any, user) => {
      const day = new Date(user.created_at).toLocaleDateString();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const userGrowth = Object.entries(usersByDay || {}).map(([date, count]) => ({
      date,
      users: count,
    }));

    // Application status distribution
    const { data: applications } = await supabase
      .from('job_applications')
      .select('status');

    const statusCount = applications?.reduce((acc: any, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const applicationStatus = Object.entries(statusCount || {}).map(([name, value]) => ({
      name,
      value,
    }));

    // Top companies by applications
    const { data: topCompaniesData } = await supabase
      .from('job_applications')
      .select('company')
      .limit(100);

    const companyCount = topCompaniesData?.reduce((acc: any, app) => {
      acc[app.company] = (acc[app.company] || 0) + 1;
      return acc;
    }, {});

    const topCompanies = Object.entries(companyCount || {})
      .map(([company, applications]) => ({ company, applications }))
      .sort((a: any, b: any) => b.applications - a.applications)
      .slice(0, 5);

    // AI usage
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    // Average profile score
    const { data: profiles } = await supabase
      .from('candidate_profiles')
      .select('profile_score');

    const avgScore = profiles?.reduce((sum, p) => sum + (p.profile_score || 0), 0) / (profiles?.length || 1);

    setAnalytics({
      userGrowth,
      applicationStatus,
      topCompanies,
      aiUsage: conversationCount || 0,
      avgProfileScore: Math.round(avgScore || 0),
    });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Analytics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">Platform Analytics</h1>
        <p className="text-muted-foreground">Track platform performance and user engagement</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.aiUsage}</div>
            <p className="text-xs text-muted-foreground">Total career coach sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Profile Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgProfileScore}%</div>
            <p className="text-xs text-muted-foreground">Platform average</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.applicationStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.applicationStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top Companies by Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topCompanies}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="company" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="applications" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
