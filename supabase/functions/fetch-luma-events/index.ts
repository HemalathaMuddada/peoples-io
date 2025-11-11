import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendar_api_id, period = 'future' } = await req.json();
    
    const lumaApiKey = Deno.env.get('LUMA_API_KEY');
    if (!lumaApiKey) {
      throw new Error('LUMA_API_KEY not configured');
    }

    if (!calendar_api_id) {
      throw new Error('calendar_api_id is required');
    }

    console.log('Fetching Luma events with params:', { calendar_api_id, period });

    const url = new URL('https://public-api.lu.ma/public/v1/calendar/list-events');
    url.searchParams.append('calendar_api_id', calendar_api_id);
    url.searchParams.append('period', period);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-luma-api-key': lumaApiKey,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Luma API error:', response.status, errorText);
      throw new Error(`Luma API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched Luma events:', data.entries?.length || 0, 'events');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Luma events:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
