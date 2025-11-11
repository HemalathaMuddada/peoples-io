import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, Briefcase, FileText, MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentActivity();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, 
        (payload) => handleNewActivity('user_signup', payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_applications' }, 
        (payload) => handleNewActivity('application', payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resumes' }, 
        (payload) => handleNewActivity('resume', payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, 
        (payload) => handleNewActivity('conversation', payload.new))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNewActivity = (type: string, data: any) => {
    const newActivity = {
      id: data.id,
      type,
      data,
      created_at: data.created_at || new Date().toISOString(),
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 20));
  };

  const fetchRecentActivity = async () => {
    const [profiles, applications, resumes, conversations] = await Promise.all([
      supabase.from('profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('job_applications').select('id, job_title, company, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('resumes').select('id, file_name, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('conversations').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const combined = [
      ...(profiles.data?.map(p => ({ type: 'user_signup', data: p, created_at: p.created_at })) || []),
      ...(applications.data?.map(a => ({ type: 'application', data: a, created_at: a.created_at })) || []),
      ...(resumes.data?.map(r => ({ type: 'resume', data: r, created_at: r.created_at })) || []),
      ...(conversations.data?.map(c => ({ type: 'conversation', data: c, created_at: c.created_at })) || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);

    setActivities(combined);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return <User className="h-4 w-4" />;
      case 'application': return <Briefcase className="h-4 w-4" />;
      case 'resume': return <FileText className="h-4 w-4" />;
      case 'conversation': return <MessageSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityText = (activity: any) => {
    switch (activity.type) {
      case 'user_signup':
        return `New user signed up: ${activity.data.email}`;
      case 'application':
        return `New application for ${activity.data.job_title} at ${activity.data.company}`;
      case 'resume':
        return `Resume uploaded: ${activity.data.file_name}`;
      case 'conversation':
        return `New AI conversation: ${activity.data.title}`;
      default:
        return 'Unknown activity';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup': return 'bg-blue-500/10 text-blue-600';
      case 'application': return 'bg-green-500/10 text-green-600';
      case 'resume': return 'bg-purple-500/10 text-purple-600';
      case 'conversation': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              activities.map((activity, index) => (
                <div 
                  key={`${activity.type}-${activity.data.id}-${index}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors animate-fade-in"
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getActivityText(activity)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
