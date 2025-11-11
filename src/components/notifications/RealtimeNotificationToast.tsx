import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, MessageCircle, Trophy, Bell } from "lucide-react";
import { notificationSound } from "@/utils/notificationSound";
import { pushNotificationManager } from "@/utils/pushNotifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

export const RealtimeNotificationToast = ({ userId }: { userId: string }) => {
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Fetch user preferences
    const fetchPreferences = async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId);

      if (data) {
        // Check if sound is enabled for any notification type
        const soundPref = data.find(p => p.notification_type === 'sound_enabled');
        setSoundEnabled(soundPref?.in_app_enabled ?? true);

        // Check push notification permission
        const pushPermission = pushNotificationManager.getPermissionStatus();
        setPushEnabled(pushPermission === 'granted');
      }
    };

    // Fetch the most recent notification ID to avoid showing old notifications on mount
    const fetchLatestNotification = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLastNotificationId(data.id);
      }
    };

    fetchPreferences();
    fetchLatestNotification();

    // Subscribe to new notifications
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          
          // Only show toast for new notifications (not on initial load)
          if (lastNotificationId && notification.id !== lastNotificationId) {
            showNotificationToast(notification);
          }
          setLastNotificationId(notification.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, lastNotificationId]);

  const trackNotificationEvent = async (notificationId: string, eventType: 'opened' | 'clicked') => {
    try {
      await supabase.from("notification_events").insert({
        notification_id: notificationId,
        user_id: userId,
        event_type: eventType,
        channel: 'in_app',
      });
    } catch (error) {
      console.error('Failed to track notification event:', error);
    }
  };

  const showNotificationToast = (notification: Notification) => {
    const getIcon = () => {
      if (notification.type.includes("job_match")) return Briefcase;
      if (notification.type.includes("message")) return MessageCircle;
      if (notification.type.includes("achievement") || notification.type.includes("badge")) return Trophy;
      return Bell;
    };

    const Icon = getIcon();

    // Determine if this is a critical notification
    const isCritical = 
      notification.type.includes("interview_reminder") ||
      notification.type.includes("application_deadline") ||
      notification.type.includes("urgent");

    // Play sound for critical notifications or if sound is enabled
    if (soundEnabled && isCritical) {
      notificationSound.play('urgent');
    } else if (soundEnabled) {
      notificationSound.play('default');
    }

    // Show browser push notification for critical alerts
    if (pushEnabled && isCritical) {
      pushNotificationManager.showNotification(notification.title, {
        body: notification.message,
        requireInteraction: true,
        tag: notification.type,
        data: { notificationId: notification.id },
      });
    }

    // Track opened event when notification is displayed
    trackNotificationEvent(notification.id, 'opened');

    toast(notification.title, {
      description: notification.message,
      icon: <Icon className="h-5 w-5" />,
      duration: isCritical ? 10000 : 5000,
      action: {
        label: "View",
        onClick: () => {
          // Track clicked event
          trackNotificationEvent(notification.id, 'clicked');
          
          // Mark as read when user clicks
          supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", notification.id)
            .then(() => {
              // Navigate based on notification type
              if (notification.type.includes("job_match")) {
                window.location.href = "/jobs";
              } else if (notification.type.includes("message")) {
                window.location.href = "/community";
              } else if (notification.type.includes("achievement")) {
                window.location.href = "/gamification";
              } else if (notification.type.includes("interview")) {
                window.location.href = "/applications";
              }
            });
        },
      },
    });
  };

  return null;
};
