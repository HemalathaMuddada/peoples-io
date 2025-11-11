import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get applications that need follow-ups
    const { data: applications } = await supabase
      .from('job_applications')
      .select('*')
      .eq('profile_id', profile.id)
      .in('status', ['applied', 'interview'])
      .order('created_at', { ascending: false });

    if (!applications || applications.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const suggestions = [];
    const now = new Date();

    for (const app of applications) {
      const appliedDate = new Date(app.applied_at || app.created_at);
      const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if suggestion already exists
      const { data: existingSuggestion } = await supabase
        .from('follow_up_suggestions')
        .select('id')
        .eq('application_id', app.id)
        .eq('status', 'pending')
        .single();

      if (existingSuggestion) continue;

      let suggestedDate: Date | null = null;
      let followUpType = '';
      let priority = 'medium';
      let reason = '';

      // Logic for post-application follow-up
      if (app.status === 'applied' && daysSinceApplied >= 7 && daysSinceApplied <= 14) {
        suggestedDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // Tomorrow
        followUpType = 'post_application';
        priority = 'high';
        reason = `It's been ${daysSinceApplied} days since you applied. A follow-up shows continued interest.`;
      } else if (app.status === 'applied' && daysSinceApplied >= 14) {
        suggestedDate = new Date(); // Today
        followUpType = 'post_application';
        priority = 'urgent';
        reason = `It's been ${daysSinceApplied} days since you applied. Send a follow-up to check on your application status.`;
      } else if (app.status === 'applied' && daysSinceApplied >= 5 && daysSinceApplied < 7) {
        suggestedDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2); // In 2 days
        followUpType = 'post_application';
        priority = 'medium';
        reason = 'Consider following up within the next few days to express continued interest.';
      }

      // Logic for post-interview follow-up
      if (app.status === 'interview') {
        // Check interview schedules for this application
        const { data: interviews } = await supabase
          .from('interview_schedules')
          .select('scheduled_at, status')
          .eq('application_id', app.id)
          .order('scheduled_at', { ascending: false })
          .limit(1);

        if (interviews && interviews.length > 0) {
          const lastInterview = interviews[0];
          const interviewDate = new Date(lastInterview.scheduled_at);
          const daysSinceInterview = Math.floor((now.getTime() - interviewDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceInterview >= 3 && daysSinceInterview <= 7) {
            suggestedDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // Tomorrow
            followUpType = 'post_interview';
            priority = 'high';
            reason = `It's been ${daysSinceInterview} days since your interview. Send a thank you note and inquire about next steps.`;
          } else if (daysSinceInterview > 7) {
            suggestedDate = new Date(); // Today
            followUpType = 'post_interview';
            priority = 'urgent';
            reason = `It's been ${daysSinceInterview} days since your interview. Follow up to check on the decision timeline.`;
          }
        }
      }

      if (suggestedDate) {
        suggestions.push({
          application_id: app.id,
          suggested_date: suggestedDate.toISOString(),
          follow_up_type: followUpType,
          priority,
          reason,
          status: 'pending'
        });
      }
    }

    // Insert suggestions into database
    if (suggestions.length > 0) {
      const { error: insertError } = await supabase
        .from('follow_up_suggestions')
        .insert(suggestions);

      if (insertError) {
        console.error('Error inserting suggestions:', insertError);
      }
    }

    return new Response(JSON.stringify({ 
      suggestions,
      count: suggestions.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-follow-up-suggestions:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
