import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { profileId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user's learning history
    const { data: learningPaths } = await supabaseClient
      .from('learning_paths')
      .select(`
        *,
        skill_gaps(*, skills(*)),
        learning_path_courses(*)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    // Fetch profile data
    const { data: profile } = await supabaseClient
      .from('candidate_profiles')
      .select('current_title, target_titles, years_experience, seniority')
      .eq('id', profileId)
      .single();

    // Fetch all skill gaps
    const { data: skillGaps } = await supabaseClient
      .from('skill_gaps')
      .select('*, skills(*)')
      .eq('profile_id', profileId)
      .order('gap_score', { ascending: false })
      .limit(10);

    // Analyze learning patterns
    const completedPaths = learningPaths?.filter(p => p.status === 'completed') || [];
    const activePaths = learningPaths?.filter(p => p.status === 'active') || [];
    const totalCourses = learningPaths?.reduce((sum, p) => sum + (p.learning_path_courses?.length || 0), 0) || 0;
    const completedCourses = learningPaths?.reduce((sum, p) => 
      sum + (p.learning_path_courses?.filter((c: any) => c.completed)?.length || 0), 0) || 0;
    const avgCompletionRate = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;
    const totalTimeSpent = learningPaths?.reduce((sum, p) => sum + (p.total_time_spent_minutes || 0), 0) || 0;

    // Build context for AI
    const context = `
User Profile:
- Current Role: ${profile?.current_title || 'Not specified'}
- Target Roles: ${profile?.target_titles?.join(', ') || 'Not specified'}
- Experience: ${profile?.years_experience || 0} years
- Seniority: ${profile?.seniority || 'Not specified'}

Learning History:
- Completed Learning Paths: ${completedPaths.length}
- Active Learning Paths: ${activePaths.length}
- Overall Completion Rate: ${Math.round(avgCompletionRate)}%
- Total Learning Time: ${Math.round(totalTimeSpent / 60)} hours

Completed Courses:
${completedPaths.map(p => `
- ${p.title} (${p.completion_percentage}% complete, ${Math.round((p.total_time_spent_minutes || 0) / 60)}h spent)
  Courses: ${p.learning_path_courses?.map((c: any) => c.title).join(', ') || 'None'}
`).join('\n')}

Current Active Learning:
${activePaths.map(p => `
- ${p.title} (${p.completion_percentage}% complete)
  Focus: ${p.skill_gaps?.skills?.name || 'General'}
`).join('\n')}

Top Skill Gaps (Unaddressed):
${skillGaps?.filter(gap => 
  !learningPaths?.some(p => p.skill_gap_id === gap.id)
).slice(0, 5).map(gap => `
- ${gap.skills.name} (${Math.round(gap.gap_score * 100)}% gap)
  Category: ${gap.skills.category}
  Rationale: ${gap.rationale}
`).join('\n')}

Learning Patterns:
- Avg time per path: ${learningPaths && learningPaths.length > 0 ? Math.round((totalTimeSpent / 60) / learningPaths.length) : 0} hours
- Completion tendency: ${avgCompletionRate >= 75 ? 'High completer' : avgCompletionRate >= 50 ? 'Moderate completer' : 'Needs motivation'}
`;

    const systemPrompt = `You are an expert career development AI that generates personalized learning path recommendations.

Analyze the user's:
1. Completed learning paths and courses
2. Current active learning
3. Skill gaps that haven't been addressed
4. Learning patterns and completion rates
5. Career goals and experience level

Generate 3-5 learning path recommendations that:
- Build on completed skills (progressive learning)
- Address critical unaddressed skill gaps
- Align with target career roles
- Match the user's learning pace and style
- Include prerequisite awareness
- Provide clear value propositions

For each recommendation, explain:
- Why this path is recommended now
- How it builds on existing knowledge
- Which career goals it supports
- Expected time commitment
- Key skills that will be developed`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_learning_paths",
              description: "Generate personalized learning path recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    description: "List of recommended learning paths",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Clear, engaging title for the learning path"
                        },
                        skill_focus: {
                          type: "string",
                          description: "Primary skill this path develops"
                        },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "Priority level based on career goals and skill gaps"
                        },
                        rationale: {
                          type: "string",
                          description: "Why this path is recommended now (2-3 sentences)"
                        },
                        builds_on: {
                          type: "array",
                          items: { type: "string" },
                          description: "Skills or courses this builds upon"
                        },
                        estimated_hours: {
                          type: "integer",
                          description: "Estimated total hours to complete"
                        },
                        difficulty: {
                          type: "string",
                          enum: ["beginner", "intermediate", "advanced"],
                          description: "Difficulty level"
                        },
                        career_impact: {
                          type: "string",
                          description: "How this impacts career goals"
                        },
                        key_outcomes: {
                          type: "array",
                          items: { type: "string" },
                          description: "3-5 key skills or abilities gained"
                        },
                        suggested_courses: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              provider: { type: "string" },
                              estimated_hours: { type: "integer" }
                            },
                            required: ["title", "provider", "estimated_hours"]
                          },
                          description: "3-5 recommended courses for this path"
                        }
                      },
                      required: ["title", "skill_focus", "priority", "rationale", "builds_on", "estimated_hours", "difficulty", "career_impact", "key_outcomes", "suggested_courses"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_learning_paths" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const recommendations = JSON.parse(toolCall.function.arguments);
    console.log("Generated recommendations:", JSON.stringify(recommendations, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations: recommendations.recommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-learning-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
