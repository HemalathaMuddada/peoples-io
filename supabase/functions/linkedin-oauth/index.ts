import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirectUri } = await req.json();

    // Handle get_client_id action
    if (action === 'get_client_id') {
      const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID');
      if (!LINKEDIN_CLIENT_ID) {
        return new Response(
          JSON.stringify({ error: 'LinkedIn OAuth not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ clientId: LINKEDIN_CLIENT_ID }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!code || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Authorization code and redirect URI are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID');
    const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET');

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error('LinkedIn OAuth credentials not configured');
      return new Response(
        JSON.stringify({ error: 'LinkedIn OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Exchanging authorization code for access token');
    console.log('Redirect URI:', redirectUri); // Log for debugging

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error: errorText
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to exchange authorization code',
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Fetching LinkedIn profile data');

    // Fetch user profile using LinkedIn API v2
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Profile fetch failed:', {
        status: profileResponse.status,
        error: errorText
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch LinkedIn profile',
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = await profileResponse.json();
    console.log('LinkedIn profile fetched successfully', JSON.stringify(profileData));

    // Map LinkedIn OpenID Connect userinfo to our profile format
    // Note: OpenID Connect provides limited data compared to full LinkedIn Profile API
    const fullName = profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim();
    const location = profileData.locale?.country === 'US' ? 'United States' : (profileData.locale?.country || '');
    
    const mappedProfile = {
      headline: null, // OpenID doesn't provide professional headline
      location: location,
      currentTitle: null, // OpenID doesn't provide current job title
      linkedinUrl: profileData.sub ? `https://www.linkedin.com/in/${profileData.sub}` : '',
      email: profileData.email || '',
      fullName: fullName,
      avatarUrl: profileData.picture || '',
      // Note: LinkedIn OpenID Connect doesn't provide job title, company, or professional summary
      // Only basic identity information is available through this flow
    };

    return new Response(
      JSON.stringify({
        success: true,
        profileData: mappedProfile,
        accessToken: accessToken,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in linkedin-oauth function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
