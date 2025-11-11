import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  url: string | null;
}

interface JobMatch {
  id: string;
  match_score: number;
  job_postings: JobPosting;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Processing bulk application for user: ${user.id}`);

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('id, resume_primary_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Get all job matches for this profile
    const { data: matchesData, error: matchesError } = await supabase
      .from('job_matches')
      .select(`
        id,
        match_score,
        job_postings!inner (
          id,
          title,
          company,
          description,
          url
        )
      `)
      .eq('profile_id', profile.id)
      .order('match_score', { ascending: false });

    if (matchesError) {
      throw new Error(`Failed to fetch matches: ${matchesError.message}`);
    }

    if (!matchesData || matchesData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          applicationsCreated: 0,
          message: 'No job matches found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform the data to match our interface
    const matches: JobMatch[] = matchesData
      .map((m: any) => ({
        id: m.id,
        match_score: m.match_score,
        job_postings: Array.isArray(m.job_postings) ? m.job_postings[0] : m.job_postings
      }))
      .filter((m: JobMatch) => m.job_postings); // Filter out any with missing job data

    console.log(`Found ${matches.length} job matches`);

    // Get existing applications to avoid duplicates
    const { data: existingApps } = await supabase
      .from('job_applications')
      .select('job_posting_id')
      .eq('profile_id', profile.id);

    const existingJobIds = new Set(existingApps?.map(app => app.job_posting_id) || []);

    // Filter out jobs already applied to
    const matchesToApply = matches.filter(
      match => !existingJobIds.has(match.job_postings.id)
    );

    console.log(`${matchesToApply.length} new jobs to apply to`);

    if (matchesToApply.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          applicationsCreated: 0,
          message: 'You have already applied to all matched jobs'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get resume content if available
    let resumeContent = '';
    if (profile.resume_primary_id) {
      const { data: resume } = await supabase
        .from('resumes')
        .select('parsed_text')
        .eq('id', profile.resume_primary_id)
        .single();
      
      resumeContent = resume?.parsed_text || '';
    }

    const createdApplications = [];
    const errors = [];

    // Process each match
    for (const match of matchesToApply) {
      try {
        const job = match.job_postings;
        
        // Generate cover letter using Lovable AI
        let coverLetter = '';
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert career advisor who writes compelling, personalized cover letters. Write concise, professional cover letters that highlight relevant experience and enthusiasm for the role.'
                },
                {
                  role: 'user',
                  content: `Generate a professional cover letter for this job application:

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description?.substring(0, 1000) || 'No description available'}

${resumeContent ? `Candidate Resume Summary:\n${resumeContent.substring(0, 1500)}` : 'No resume available'}

Write a concise, compelling cover letter (250-350 words) that highlights relevant skills and demonstrates genuine interest in the role.`
                }
              ],
              max_tokens: 800,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            coverLetter = aiData.choices?.[0]?.message?.content || '';
            console.log(`Generated cover letter for ${job.company} - ${job.title}`);
          } else {
            console.warn(`Failed to generate cover letter for ${job.title}: ${aiResponse.status}`);
          }
        } catch (aiError) {
          console.error(`AI error for ${job.title}:`, aiError);
          // Continue without cover letter
        }

        // Create application
        const { data: application, error: appError } = await supabase
          .from('job_applications')
          .insert({
            profile_id: profile.id,
            job_posting_id: job.id,
            job_title: job.title,
            company: job.company,
            status: 'applied',
            applied_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (appError) {
          console.error(`Failed to create application for ${job.title}:`, appError);
          errors.push({ job: job.title, error: appError.message });
          continue;
        }

        // Store cover letter if generated
        if (coverLetter && application) {
          await supabase
            .from('application_documents')
            .insert({
              application_id: application.id,
              document_type: 'cover_letter',
              content: coverLetter,
            });
        }

        // Create application metrics for A/B testing
        if (application) {
          await supabase
            .from('application_metrics')
            .insert({
              application_id: application.id,
              resume_version_id: profile.resume_primary_id,
              response_received: false,
              interview_granted: false,
            });
        }

        createdApplications.push({
          jobTitle: job.title,
          company: job.company,
          hasCoverLetter: !!coverLetter,
        });

        console.log(`✓ Applied to ${job.company} - ${job.title}`);
      } catch (error) {
        console.error(`Error processing ${match.job_postings.title}:`, error);
        errors.push({ 
          job: match.job_postings.title, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        applicationsCreated: createdApplications.length,
        applications: createdApplications,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully applied to ${createdApplications.length} jobs${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Bulk apply error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
