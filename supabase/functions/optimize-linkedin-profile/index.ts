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
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare profile data for AI analysis
    const profileContext = `
LinkedIn Profile Analysis:
- Headline: ${profile.headline || 'Not set'}
- Current Title: ${profile.current_title || 'Not set'}
- Location: ${profile.location || 'Not set'}
- Years of Experience: ${profile.years_experience || 'Not specified'}
- Seniority: ${profile.seniority || 'Not specified'}
- Skills: ${profile.skills?.join(', ') || 'None listed'}
- Target Titles: ${profile.target_titles?.join(', ') || 'Not specified'}
- Salary Range: ${profile.salary_range_min && profile.salary_range_max ? `$${profile.salary_range_min} - $${profile.salary_range_max}` : 'Not set'}
- LinkedIn URL: ${profile.linkedin_url || 'Not set'}
`;

    // Call Lovable AI for optimization suggestions
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
            content: 'You are a LinkedIn profile optimization expert. Analyze profiles and provide actionable, specific suggestions to improve visibility, engagement, and job opportunities. Focus on headline, summary, experience descriptions, skills, and keywords.'
          },
          {
            role: 'user',
            content: profileContext
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_linkedin_suggestions',
              description: 'Provide comprehensive LinkedIn profile optimization suggestions',
              parameters: {
                type: 'object',
                properties: {
                  overall_score: {
                    type: 'number',
                    description: 'Overall profile score from 0-100'
                  },
                  headline_suggestions: {
                    type: 'object',
                    properties: {
                      current_issues: { type: 'array', items: { type: 'string' } },
                      improvements: { type: 'array', items: { type: 'string' } },
                      examples: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  skills_suggestions: {
                    type: 'object',
                    properties: {
                      missing_key_skills: { type: 'array', items: { type: 'string' } },
                      trending_skills: { type: 'array', items: { type: 'string' } },
                      skill_prioritization: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  summary_suggestions: {
                    type: 'object',
                    properties: {
                      structure_tips: { type: 'array', items: { type: 'string' } },
                      keyword_recommendations: { type: 'array', items: { type: 'string' } },
                      tone_guidance: { type: 'string' }
                    }
                  },
                  visibility_tips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tips to increase profile visibility and searchability'
                  },
                  quick_wins: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Quick, easy changes with high impact'
                  }
                },
                required: ['overall_score', 'headline_suggestions', 'skills_suggestions', 'summary_suggestions', 'visibility_tips', 'quick_wins']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_linkedin_suggestions' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate suggestions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    const suggestions = JSON.parse(toolCall.function.arguments);

    // Save suggestions to database
    await supabase
      .from('linkedin_optimization_suggestions')
      .insert({
        profile_id: profile.id,
        suggestions: suggestions,
        overall_score: suggestions.overall_score
      });

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in optimize-linkedin-profile:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
