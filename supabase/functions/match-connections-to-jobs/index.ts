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

    const { profileId } = await req.json();

    console.log('Matching connections to jobs for profile:', profileId);

    // Get user's connections
    const { data: connections, error: connectionsError } = await supabase
      .from('linkedin_connections')
      .select('*')
      .eq('profile_id', profileId);

    if (connectionsError) {
      throw connectionsError;
    }

    // Get candidate profile with org_id
    const { data: profile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('org_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Get active job postings in user's org
    const { data: jobs, error: jobsError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('org_id', profile.org_id);

    if (jobsError) {
      throw jobsError;
    }

    console.log(`Found ${connections?.length || 0} connections and ${jobs?.length || 0} jobs`);

    const matches = [];

    // Match connections to jobs based on company
    for (const job of jobs || []) {
      const companyMatches = connections?.filter(conn => 
        conn.current_company && 
        job.company &&
        conn.current_company.toLowerCase().includes(job.company.toLowerCase()) ||
        job.company.toLowerCase().includes(conn.current_company.toLowerCase())
      ) || [];

      for (const connection of companyMatches) {
        const matchStrength = calculateMatchStrength(connection, job);
        
        matches.push({
          job_posting_id: job.id,
          connection_id: connection.id,
          profile_id: profileId,
          match_type: 'same_company',
          match_strength: matchStrength,
          notes: `${connection.full_name} works at ${connection.current_company} as ${connection.current_title || 'Unknown role'}`
        });
      }
    }

    // Upsert matches to database
    if (matches.length > 0) {
      const { data: insertedMatches, error: matchError } = await supabase
        .from('connection_job_matches')
        .upsert(matches, {
          onConflict: 'job_posting_id,connection_id',
          ignoreDuplicates: false
        })
        .select();

      if (matchError) {
        console.error('Error inserting matches:', matchError);
        throw matchError;
      }

      console.log(`Created ${insertedMatches?.length || 0} connection matches`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchesCount: matches.length,
        message: 'Connection matches updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in match-connections-to-jobs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateMatchStrength(connection: any, job: any): number {
  let strength = 50; // Base strength
  
  // Same company is a strong match
  if (connection.current_company && job.company &&
      connection.current_company.toLowerCase() === job.company.toLowerCase()) {
    strength += 30;
  }
  
  // Title relevance
  if (connection.current_title && job.title) {
    const titleWords = job.title.toLowerCase().split(' ');
    const connTitleWords = connection.current_title.toLowerCase().split(' ');
    const commonWords = titleWords.filter((word: string) => connTitleWords.includes(word)).length;
    strength += Math.min(20, commonWords * 5);
  }
  
  // Connection degree (1st degree is stronger)
  if (connection.connection_degree === 1) {
    strength += 10;
  }
  
  return Math.min(100, strength);
}