import { supabase } from "@/integrations/supabase/client";

interface ScheduleNotificationParams {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  data?: any;
  channel: 'email' | 'in_app' | 'push';
  useSmartScheduling?: boolean;
  minDelayMinutes?: number;
}

/**
 * Schedule a notification for optimal delivery time based on user engagement patterns
 */
export async function scheduleNotification({
  userId,
  notificationType,
  title,
  message,
  data,
  channel,
  useSmartScheduling = true,
  minDelayMinutes = 15,
}: ScheduleNotificationParams): Promise<{ success: boolean; scheduledFor?: string; error?: string }> {
  try {
    let scheduledFor: string;

    if (useSmartScheduling) {
      // Call the database function to calculate optimal send time
      const { data: optimalTime, error: calcError } = await supabase
        .rpc('calculate_next_optimal_send_time', {
          p_user_id: userId,
          p_notification_type: notificationType,
          p_min_delay_minutes: minDelayMinutes,
        });

      if (calcError) {
        console.error('Error calculating optimal time:', calcError);
        // Fall back to immediate scheduling
        scheduledFor = new Date(Date.now() + minDelayMinutes * 60 * 1000).toISOString();
      } else {
        scheduledFor = optimalTime;
      }
    } else {
      // Schedule immediately (with min delay)
      scheduledFor = new Date(Date.now() + minDelayMinutes * 60 * 1000).toISOString();
    }

    // Insert into scheduled_notifications table
    const { error: insertError } = await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        title,
        message,
        data: data || {},
        channel,
        scheduled_for: scheduledFor,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error scheduling notification:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, scheduledFor };
  } catch (error) {
    console.error('Unexpected error in scheduleNotification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a notification immediately without scheduling
 */
export async function sendNotificationNow({
  userId,
  notificationType,
  title,
  message,
  data,
}: Omit<ScheduleNotificationParams, 'channel' | 'useSmartScheduling' | 'minDelayMinutes'>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        org_id: (await supabase.auth.getUser()).data.user?.user_metadata?.org_id || '',
        user_id: userId,
        type: notificationType as any,
        payload_json: {
          title,
          message,
          ...data,
        },
      });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in sendNotificationNow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}