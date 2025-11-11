import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google token');
  }

  const data = await response.json();
  return data.access_token;
}

async function refreshMicrosoftToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID')!,
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET')!,
      grant_type: 'refresh_token',
      scope: 'Calendars.ReadWrite offline_access',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Microsoft token');
  }

  const data = await response.json();
  return data.access_token;
}

async function createGoogleEvent(accessToken: string, event: any) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      location: event.location || '',
      start: {
        dateTime: event.startTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endTime,
        timeZone: 'UTC',
      },
      attendees: event.attendees.map((email: string) => ({ email })),
      conferenceData: event.meetingLink ? {
        conferenceSolution: {
          key: { type: 'hangoutsMeet' }
        },
        createRequest: { requestId: crypto.randomUUID() }
      } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar API error:', error);
    throw new Error('Failed to create Google Calendar event');
  }

  return await response.json();
}

async function createOutlookEvent(accessToken: string, event: any) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: event.title,
      body: {
        contentType: 'HTML',
        content: event.description,
      },
      start: {
        dateTime: event.startTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endTime,
        timeZone: 'UTC',
      },
      location: {
        displayName: event.location || '',
      },
      attendees: event.attendees.map((email: string) => ({
        emailAddress: { address: email },
        type: 'required',
      })),
      isOnlineMeeting: !!event.meetingLink,
      onlineMeetingProvider: event.meetingLink ? 'teamsForBusiness' : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Outlook Calendar API error:', error);
    throw new Error('Failed to create Outlook Calendar event');
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewId, title, description, startTime, endTime, location, attendees, meetingLink } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get calendar connections
    const { data: connections, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id);

    if (connError) throw connError;

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No calendar connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Create event in all connected calendars
    for (const connection of connections) {
      let accessToken = connection.access_token;

      // Check if token is expired and refresh if needed
      if (connection.token_expiry && new Date(connection.token_expiry) < new Date()) {
        console.log(`Refreshing ${connection.provider} token`);
        
        if (connection.provider === 'google') {
          accessToken = await refreshGoogleToken(connection.refresh_token);
        } else if (connection.provider === 'outlook') {
          accessToken = await refreshMicrosoftToken(connection.refresh_token);
        }

        // Update stored token
        await supabase
          .from('calendar_connections')
          .update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          .eq('id', connection.id);
      }

      const eventData = {
        title,
        description,
        startTime,
        endTime,
        location,
        attendees: attendees || [],
        meetingLink,
      };

      try {
        if (connection.provider === 'google') {
          const event = await createGoogleEvent(accessToken, eventData);
          results.push({ provider: 'google', success: true, eventId: event.id, eventLink: event.htmlLink });
        } else if (connection.provider === 'outlook') {
          const event = await createOutlookEvent(accessToken, eventData);
          results.push({ provider: 'outlook', success: true, eventId: event.id, eventLink: event.webLink });
        }
      } catch (error: any) {
        console.error(`Failed to create event in ${connection.provider}:`, error);
        results.push({ provider: connection.provider, success: false, error: error.message });
      }
    }

    console.log(`Created calendar events for interview ${interviewId}:`, results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-calendar-event:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});