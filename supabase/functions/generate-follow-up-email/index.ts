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

    const { application_id, tone = 'professional', suggestion_id } = await req.json();

    if (!application_id) {
      return new Response(JSON.stringify({ error: 'application_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get application details
    const { data: application } = await supabase
      .from('job_applications')
      .select('*, job_postings(*)')
      .eq('id', application_id)
      .single();

    if (!application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get full name from profiles table
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Calculate days since application
    const appliedDate = new Date(application.applied_at || application.created_at);
    const daysSince = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get follow-up suggestion if provided
    let followUpType = 'post_application';
    if (suggestion_id) {
      const { data: suggestion } = await supabase
        .from('follow_up_suggestions')
        .select('follow_up_type')
        .eq('id', suggestion_id)
        .single();
      if (suggestion) followUpType = suggestion.follow_up_type;
    }

    // Build context for AI
    const context = `
Generate a ${tone} follow-up email for a job application.

Candidate Information:
- Name: ${userProfile?.full_name || 'the candidate'}
- Current Title: ${profile.current_title || 'N/A'}
- Years of Experience: ${profile.years_experience || 'N/A'}

Application Details:
- Company: ${application.company}
- Position: ${application.job_title}
- Applied: ${daysSince} days ago
- Status: ${application.status}
- Follow-up Type: ${followUpType}

Context:
${followUpType === 'post_interview' 
  ? 'This is a follow-up after an interview. Express gratitude, reiterate interest, and inquire about next steps.'
  : followUpType === 'post_application'
  ? 'This is a follow-up after submitting an application. Express continued interest and ask about the hiring timeline.'
  : 'This is a general check-in to maintain engagement with the hiring team.'}

Generate a professional, concise follow-up email that:
1. Is personalized to the company and role
2. Shows genuine interest and enthusiasm
3. References specific details when possible
4. Asks a clear question to prompt a response
5. Maintains the ${tone} tone
6. Is 3-4 short paragraphs maximum
`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert career coach and professional email writer. Generate polished, effective follow-up emails for job applications that increase response rates.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_follow_up_email',
              description: 'Generate a professional follow-up email',
              parameters: {
                type: 'object',
                properties: {
                  subject: {
                    type: 'string',
                    description: 'Email subject line that is engaging and professional'
                  },
                  body: {
                    type: 'string',
                    description: 'Complete email body with proper formatting, greeting, main content, and signature'
                  },
                  key_points: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Key talking points included in the email'
                  }
                },
                required: ['subject', 'body', 'key_points']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_follow_up_email' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    const emailData = JSON.parse(toolCall.function.arguments);

    // Save email to database
    const { data: savedEmail, error: saveError } = await supabase
      .from('follow_up_emails')
      .insert({
        application_id,
        suggestion_id: suggestion_id || null,
        subject: emailData.subject,
        body: emailData.body,
        tone,
        status: 'draft'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving email:', saveError);
    }

    return new Response(JSON.stringify({
      ...emailData,
      email_id: savedEmail?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-follow-up-email:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
