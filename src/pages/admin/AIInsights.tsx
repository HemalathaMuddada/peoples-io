import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, TrendingUp, DollarSign, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function AIInsights() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [stats, setStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    avgRating: 0,
    totalConversations: 0,
    topModels: [] as any[],
  });
  const [recentConversations, setRecentConversations] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAIStats();
      fetchRecentConversations();
    }
  }, [isAdmin]);

  const fetchAIStats = async () => {
    // Get conversation ratings
    const { data: ratings } = await supabase
      .from('conversation_ratings')
      .select('rating');

    const avgRating = ratings?.length
      ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
      : 0;

    // Get total conversations
    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    // Placeholder stats for now (can be enhanced with actual AI usage tracking)
    const totalTokens = 0;
    const totalCost = 0;
    const topModels: any[] = [];

    setStats({
      totalTokens,
      totalCost,
      avgRating,
      totalConversations: count || 0,
      topModels,
    });
  };

  const fetchRecentConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        profiles:user_id(email),
        conversation_ratings(rating, feedback)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentConversations(data);
    }
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
            <BreadcrumbPage>AI Insights</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">AI Insights & Analytics</h1>
        <p className="text-muted-foreground">Monitor AI usage, costs, and performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total AI spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg User Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)} / 5</div>
            <Progress value={stats.avgRating * 20} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top AI Models Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topModels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No model usage data yet</p>
              ) : (
                stats.topModels.map((model: any, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{model.model || 'Unknown'}</span>
                      <Badge variant="outline">{model.count} calls</Badge>
                    </div>
                    <Progress value={(model.count / stats.topModels[0].count) * 100} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Conversation Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentConversations.filter(conv => conv.conversation_ratings?.[0]).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No conversation ratings yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentConversations
                    .filter(conv => conv.conversation_ratings?.[0])
                    .slice(0, 5)
                    .map((conv) => (
                      <TableRow key={conv.id}>
                        <TableCell className="text-sm">{conv.profiles?.email || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-current mr-1" />
                            {conv.conversation_ratings[0].rating}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {conv.conversation_ratings[0].feedback?.substring(0, 30) || 'No feedback'}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
