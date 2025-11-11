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

    // Service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
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

    // Get user's profile to extract search parameters
    const { data: candidateProfile } = await supabaseClient
      .from('candidate_profiles')
      .select('target_titles, target_locations')
      .eq('user_id', user.id)
      .single();

    const { query, location, num_pages } = await req.json();
    
    // Use profile data or fallback to request parameters
    const searchQuery = query || (candidateProfile?.target_titles?.[0]) || 'Software Engineer';
    const searchLocation = location || (candidateProfile?.target_locations?.[0]) || 'United States';
    const pages = num_pages || 1;

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    console.log(`Fetching jobs for: ${searchQuery} in ${searchLocation}`);

    const jobsData = [];
    
    // Fetch jobs from JSearch API
    for (let page = 1; page <= pages; page++) {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}%20in%20${encodeURIComponent(searchLocation)}&page=${page}&num_pages=1`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        console.error(`JSearch API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        jobsData.push(...data.data);
      }
    }

    console.log(`Fetched ${jobsData.length} jobs from JSearch API`);

    // Transform and insert jobs into database
    const jobsToInsert = jobsData.map((job: any) => {
      // Extract skills from job description or qualifications
      const skills: string[] = [];
      const description = (job.job_description || '').toLowerCase();
      
      // Common tech skills to extract
      const commonSkills = [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 
        'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
        'Git', 'CI/CD', 'Agile', 'REST API', 'GraphQL', 'Terraform'
      ];
      
      commonSkills.forEach(skill => {
        if (description.includes(skill.toLowerCase())) {
          skills.push(skill);
        }
      });

      // Map job level to seniority
      let seniority = 'mid';
      const jobTitle = (job.job_title || '').toLowerCase();
      if (jobTitle.includes('senior') || jobTitle.includes('sr.')) {
        seniority = 'senior';
      } else if (jobTitle.includes('lead') || jobTitle.includes('principal') || jobTitle.includes('staff')) {
        seniority = 'lead';
      } else if (jobTitle.includes('junior') || jobTitle.includes('jr.') || jobTitle.includes('entry')) {
        seniority = 'entry';
      } else if (jobTitle.includes('director') || jobTitle.includes('vp') || jobTitle.includes('chief')) {
        seniority = 'executive';
      }

      return {
        org_id: userProfile.org_id,
        title: job.job_title || 'Untitled Position',
        company: job.employer_name || 'Unknown Company',
        location: job.job_city && job.job_state 
          ? `${job.job_city}, ${job.job_state}` 
          : (job.job_country || 'Remote'),
        remote: job.job_is_remote || false,
        description: job.job_description || '',
        seniority: seniority,
        salary_min: job.job_min_salary ? Math.round(job.job_min_salary) : null,
        salary_max: job.job_max_salary ? Math.round(job.job_max_salary) : null,
        skills_extracted: skills,
        posted_date: job.job_posted_at_datetime_utc || new Date().toISOString(),
        url: job.job_apply_link || job.job_google_link,
        external_id: job.job_id,
        source: 'jsearch'
      };
    });

    // Delete existing jobs from this source for this org (using admin client)
    await supabaseAdmin
      .from('job_postings')
      .delete()
      .eq('org_id', userProfile.org_id)
      .eq('source', 'jsearch');

    // Insert new jobs (using admin client)
    if (jobsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('job_postings')
        .insert(jobsToInsert);

      if (insertError) {
        console.error('Error inserting jobs:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully fetched and stored ${jobsToInsert.length} jobs`,
        count: jobsToInsert.length
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
