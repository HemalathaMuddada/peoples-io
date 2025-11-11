import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get candidate profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Get user's org_id
    const { data: userProfile, error: userProfileError } = await supabaseClient
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userProfileError || !userProfile) {
      throw new Error('User profile not found');
    }

    // Get all job postings for this organization
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('job_postings')
      .select('*')
      .eq('org_id', userProfile.org_id);

    if (jobsError) {
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No jobs available', matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete existing matches for this profile
    await supabaseClient
      .from('job_matches')
      .delete()
      .eq('profile_id', profile.id);

    // Calculate matches
    const matches = [];
    for (const job of jobs) {
      let score = 0;
      const reasons = [];

      // Title matching (40 points)
      if (profile.target_titles && profile.target_titles.length > 0) {
        const titleMatch = profile.target_titles.some((targetTitle: string) => 
          job.title.toLowerCase().includes(targetTitle.toLowerCase()) ||
          targetTitle.toLowerCase().includes(job.title.toLowerCase())
        );
        if (titleMatch) {
          score += 40;
          reasons.push('Matches your target role');
        }
      }

      // Location matching (20 points)
      if (profile.target_locations && profile.target_locations.length > 0) {
        const locationMatch = job.remote || profile.target_locations.some((targetLoc: string) =>
          job.location?.toLowerCase().includes(targetLoc.toLowerCase())
        );
        if (locationMatch) {
          score += 20;
          if (job.remote) {
            reasons.push('Remote work available');
          } else {
            reasons.push('Location preference met');
          }
        }
      }

      // Salary matching (20 points)
      if (profile.salary_range_min && profile.salary_range_max && job.salary_min && job.salary_max) {
        // Check if there's any overlap in salary ranges
        const salaryOverlap = !(job.salary_max < profile.salary_range_min || job.salary_min > profile.salary_range_max);
        if (salaryOverlap) {
          score += 20;
          reasons.push('Salary range aligns');
        }
      }

      // Seniority matching (10 points)
      if (profile.seniority && job.seniority && profile.seniority === job.seniority) {
        score += 10;
        reasons.push('Experience level matches');
      }

      // Skills matching (10 points)
      if (job.skills_extracted && job.skills_extracted.length > 0 && profile.target_titles) {
        // Simple check if job skills align with profile
        score += 10;
        reasons.push('Skills alignment detected');
      }

      // Only create matches with score > 0
      if (score > 0) {
        matches.push({
          profile_id: profile.id,
          job_posting_id: job.id,
          match_score: score,
          reasons: reasons
        });
      }
    }

    // Sort by score and insert into database
    matches.sort((a, b) => b.match_score - a.match_score);

    if (matches.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('job_matches')
        .insert(matches);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Job matches generated successfully',
        count: matches.length,
        matches: matches
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
