import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CalendarCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        const provider = state === 'google' ? 'google' : 'outlook';
        const redirectUri = `${window.location.origin}/calendar-callback`;

        // Exchange code for tokens via edge function
        const functionName = provider === 'google' 
          ? 'calendar-oauth-google' 
          : 'calendar-oauth-outlook';

        const { data, error: functionError } = await supabase.functions.invoke(functionName, {
          body: { code, redirectUri },
        });

        if (functionError) throw functionError;

        if (data.error) {
          throw new Error(data.error);
        }

        setStatus('success');
        toast.success(`${provider === 'google' ? 'Google' : 'Outlook'} Calendar connected successfully!`);
        
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } catch (error: any) {
        console.error('Calendar callback error:', error);
        setStatus('error');
        toast.error('Failed to connect calendar: ' + error.message);
        
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg">Connecting your calendar...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-600">Calendar connected successfully!</p>
            <p className="text-sm text-muted-foreground">Redirecting you back...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-red-600">Connection failed</p>
            <p className="text-sm text-muted-foreground">Redirecting you back...</p>
          </>
        )}
      </div>
    </div>
  );
}