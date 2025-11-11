import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { accessToken } = await req.json();
    
    if (!accessToken) {
      throw new Error('LinkedIn access token is required');
    }

    console.log('Fetching LinkedIn connections for user:', user.id);

    // Get user's candidate profile
    const { data: profile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Candidate profile not found');
    }

    // Fetch connections from LinkedIn API
    // Note: This requires LinkedIn Partner API access or specific OAuth scopes
    const connectionsResponse = await fetch('https://api.linkedin.com/v2/connections?q=viewer&start=0&count=500', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!connectionsResponse.ok) {
      const errorText = await connectionsResponse.text();
      console.error('LinkedIn API error:', errorText);
      
      // If API access is limited, return helpful message
      if (connectionsResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'LinkedIn API access restricted',
            message: 'Full connections data requires LinkedIn Partner API access. Consider manual import.',
            connections: []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`LinkedIn API error: ${errorText}`);
    }

    const connectionsData = await connectionsResponse.json();
    const connections = connectionsData.elements || [];

    console.log(`Found ${connections.length} connections`);

    // Process and store connections
    const connectionRecords = [];
    
    for (const conn of connections) {
      // Fetch detailed profile for each connection
      const profileResponse = await fetch(`https://api.linkedin.com/v2/people/(id:${conn.to})`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        
        connectionRecords.push({
          profile_id: profile.id,
          linkedin_id: conn.to,
          full_name: `${profileData.firstName?.localized?.en_US || ''} ${profileData.lastName?.localized?.en_US || ''}`.trim(),
          headline: profileData.headline?.localized?.en_US || null,
          current_company: profileData.positions?.elements?.[0]?.companyName || null,
          current_title: profileData.positions?.elements?.[0]?.title || null,
          profile_url: `https://www.linkedin.com/in/${profileData.vanityName || conn.to}`,
          avatar_url: profileData.profilePicture?.displayImage || null,
          location: profileData.location?.name || null,
          connection_degree: 1,
          last_synced_at: new Date().toISOString()
        });
      }
    }

    // Upsert connections to database
    const { data: insertedConnections, error: insertError } = await supabase
      .from('linkedin_connections')
      .upsert(connectionRecords, {
        onConflict: 'profile_id,linkedin_id',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error('Error inserting connections:', insertError);
      throw insertError;
    }

    console.log(`Successfully synced ${insertedConnections?.length || 0} connections`);

    // Trigger job matching after sync
    const matchResponse = await supabase.functions.invoke('match-connections-to-jobs', {
      body: { profileId: profile.id }
    });

    return new Response(
      JSON.stringify({
        success: true,
        connectionsCount: insertedConnections?.length || 0,
        message: 'LinkedIn connections synced successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-linkedin-connections:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});