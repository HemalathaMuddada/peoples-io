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
    const { skillGap, profileData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build context for AI
    const context = `
User Profile:
- Current Title: ${profileData?.current_title || 'Not specified'}
- Years Experience: ${profileData?.years_experience || 0}
- Seniority: ${profileData?.seniority || 'Not specified'}
- Target Titles: ${profileData?.target_titles?.join(', ') || 'Not specified'}

Skill Gap to Address:
- Skill: ${skillGap.skill_name}
- Gap Score: ${skillGap.gap_score}/100
- Rationale: ${skillGap.rationale}

Please analyze this skill gap and create a comprehensive learning path.
`;

    const systemPrompt = `You are an expert career development AI that creates personalized learning paths. 
Your goal is to help users develop specific skills by recommending relevant courses, learning resources, and a structured timeline.

Consider:
1. The user's current experience level and role
2. The specific skill gap and its severity
3. Industry-standard learning progression
4. Mix of theoretical and practical learning
5. Time-efficient learning strategies

Generate a learning path with:
- Prioritized list of topics to learn
- Specific course recommendations with realistic providers (Coursera, Udemy, LinkedIn Learning, freeCodeCamp, YouTube channels)
- Estimated time commitment
- Learning order and dependencies
- Additional resources (documentation, practice projects, communities)`;

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
              name: "create_learning_path",
              description: "Generate a structured learning path for skill development",
              parameters: {
                type: "object",
                properties: {
                  path_title: {
                    type: "string",
                    description: "Engaging title for the learning path"
                  },
                  path_description: {
                    type: "string",
                    description: "Brief description of what the user will learn"
                  },
                  estimated_hours: {
                    type: "integer",
                    description: "Total estimated hours to complete the path"
                  },
                  learning_modules: {
                    type: "array",
                    description: "Ordered list of learning modules",
                    items: {
                      type: "object",
                      properties: {
                        module_name: { type: "string" },
                        topics: {
                          type: "array",
                          items: { type: "string" }
                        },
                        estimated_hours: { type: "integer" }
                      },
                      required: ["module_name", "topics", "estimated_hours"]
                    }
                  },
                  courses: {
                    type: "array",
                    description: "Recommended courses from real providers",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Course title" },
                        provider: { 
                          type: "string", 
                          description: "Platform (e.g., Coursera, Udemy, LinkedIn Learning, freeCodeCamp, YouTube)"
                        },
                        url: { 
                          type: "string", 
                          description: "Direct URL to the course or search term if exact URL unknown"
                        },
                        estimated_hours: { type: "integer" },
                        difficulty: {
                          type: "string",
                          enum: ["beginner", "intermediate", "advanced"]
                        },
                        is_free: { type: "boolean" }
                      },
                      required: ["title", "provider", "url", "estimated_hours", "difficulty", "is_free"]
                    }
                  },
                  additional_resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { 
                          type: "string",
                          enum: ["documentation", "practice_project", "community", "blog", "tool"]
                        },
                        name: { type: "string" },
                        url: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["type", "name", "url", "description"]
                    }
                  },
                  milestones: {
                    type: "array",
                    description: "Key milestones to track progress",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        estimated_week: { type: "integer" }
                      },
                      required: ["title", "description", "estimated_week"]
                    }
                  }
                },
                required: ["path_title", "path_description", "estimated_hours", "learning_modules", "courses", "additional_resources", "milestones"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_learning_path" } }
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

    const learningPathData = JSON.parse(toolCall.function.arguments);
    console.log("Generated learning path:", JSON.stringify(learningPathData, null, 2));

    // Create learning path in database
    const { data: pathRecord, error: pathError } = await supabaseClient
      .from('learning_paths')
      .insert({
        profile_id: profileData.id,
        skill_gap_id: skillGap.id,
        title: learningPathData.path_title,
        description: learningPathData.path_description,
        estimated_hours: learningPathData.estimated_hours,
        status: 'active',
        progress: 0
      })
      .select()
      .single();

    if (pathError) {
      console.error("Error creating learning path:", pathError);
      throw pathError;
    }

    // Insert courses
    const coursesToInsert = learningPathData.courses.map((course: any) => ({
      learning_path_id: pathRecord.id,
      title: course.title,
      provider: course.provider,
      url: course.url,
      estimated_hours: course.estimated_hours,
      difficulty: course.difficulty,
      is_free: course.is_free,
      completed: false
    }));

    if (coursesToInsert.length > 0) {
      const { error: coursesError } = await supabaseClient
        .from('learning_path_courses')
        .insert(coursesToInsert);

      if (coursesError) {
        console.error("Error inserting courses:", coursesError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        learningPath: {
          ...pathRecord,
          ...learningPathData
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-learning-path function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
