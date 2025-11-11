import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, AlertTriangle, Info, CheckCircle, X, Settings, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    
    // Set up realtime subscription for new notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `channel=eq.in_app`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          setNotifications(prev => [{
            id: newNotif.id,
            type: getNotificationType(newNotif.type),
            title: getNotificationTitle(newNotif.type),
            message: getNotificationMessage(newNotif.type, newNotif.payload_json),
            created_at: newNotif.created_at,
            read: !!newNotif.read_at,
          }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or('channel.eq.in_app,channel.is.null')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedNotifications = data?.map((n: any) => ({
        id: n.id,
        type: getNotificationType(n.type),
        title: getNotificationTitle(n.type),
        message: getNotificationMessage(n.type, n.payload_json),
        created_at: n.created_at,
        read: !!n.read_at,
      })) || [];

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationType = (type: string): 'info' | 'warning' | 'success' | 'error' => {
    if (type.includes('error') || type.includes('failed')) return 'error';
    if (type.includes('warning') || type.includes('reminder')) return 'warning';
    if (type.includes('success') || type.includes('completed') || type.includes('approved')) return 'success';
    return 'info';
  };

  const getNotificationTitle = (type: string): string => {
    const titles: Record<string, string> = {
      'welcome': 'Welcome!',
      'application_submitted': 'Application Submitted',
      'interview_scheduled': 'Interview Scheduled',
      'job_match_alert': 'New Job Matches',
      'profile_achievement': 'Achievement Unlocked',
      'mentorship_request': 'New Mentorship Request',
      'session_reminder': 'Upcoming Session',
    };
    return titles[type] || 'Notification';
  };

  const getNotificationMessage = (type: string, payload: any): string => {
    if (!payload) return 'You have a new notification';
    
    switch (type) {
      case 'application_submitted':
        return `Your application to ${payload.company} has been submitted`;
      case 'interview_scheduled':
        return `Interview scheduled with ${payload.company} on ${payload.interviewDate}`;
      case 'job_match_alert':
        return `${payload.matchCount} new job matches found for you`;
      default:
        return payload.message || 'You have a new notification';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      // Track opened event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("notification_events").insert({
          notification_id: id,
          user_id: user.id,
          event_type: 'opened',
          channel: 'in_app',
        });
      }

      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      // Optionally delete from database or just hide in UI
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      case 'success': return 'bg-green-500/10 border-green-500/20';
      default: return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notification-analytics')}
              className="h-8 w-8"
              title="Analytics"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notification-preferences')}
              className="h-8 w-8"
              title="Preferences"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    notification.read ? 'bg-muted/30' : getColor(notification.type)
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 -mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
