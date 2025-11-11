import { supabase } from "@/integrations/supabase/client";

export class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  // Request permission for push notifications
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await this.registerServiceWorker();
    }
    
    return permission;
  }

  // Register service worker for push notifications
  private async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  // Show a browser push notification
  async showNotification(title: string, options: {
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  }) {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      // If service worker is available, use it for notifications
      if (this.registration) {
        await this.registration.showNotification(title, {
          ...options,
          icon: options.icon || '/favicon.png',
          badge: '/favicon.png',
        });
      } else {
        // Fallback to regular notification API
        new Notification(title, {
          ...options,
          icon: options.icon || '/favicon.png',
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Check if push notifications are supported and enabled
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Save push notification preference to database
  async savePushPreference(userId: string, enabled: boolean) {
    try {
      // Use type assertion to allow push_enabled field
      const { error } = await supabase
        .from('notification_preferences')
        .update({ push_enabled: enabled } as any)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save push preference:', error);
    }
  }
}

// Singleton instance
export const pushNotificationManager = new PushNotificationManager();
