import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { jobTitle, difficulty, resumeId } = await req.json();

    // Get user's profile and resume
    const { data: profile } = await supabase
      .from("candidate_profiles")
      .select("id, current_title, years_experience, seniority")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    let resumeContext = "";
    if (resumeId) {
      const { data: resume } = await supabase
        .from("resumes")
        .select("text_content, parsed_json")
        .eq("id", resumeId)
        .eq("user_id", user.id)
        .single();
      
      if (resume) {
        resumeContext = resume.text_content || JSON.stringify(resume.parsed_json);
      }
    }

    const difficultyLevels = {
      easy: "entry-level, basic questions about fundamentals",
      medium: "intermediate-level, questions about practical application and problem-solving",
      hard: "senior-level, questions about system design, architecture, and leadership"
    };

    const systemPrompt = `You are an expert technical interviewer. Generate ${difficulty} interview questions for a ${jobTitle} position. 
The candidate has ${profile.years_experience} years of experience and is at ${profile.seniority} level.
${resumeContext ? `Candidate's background: ${resumeContext.substring(0, 1000)}` : ''}

Generate exactly 8 diverse interview questions covering:
- Technical skills (3 questions)
- Problem-solving and algorithms (2 questions)
- System design or architecture (1 question)
- Behavioral and situational (2 questions)

For ${difficulty} difficulty: ${difficultyLevels[difficulty as keyof typeof difficultyLevels]}

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "question text",
      "category": "technical|problem-solving|system-design|behavioral",
      "difficulty": "easy|medium|hard",
      "expectedDuration": 5
    }
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate interview questions for ${jobTitle} position at ${difficulty} difficulty.` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_interview_questions",
              description: "Generate interview questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        category: { type: "string", enum: ["technical", "problem-solving", "system-design", "behavioral"] },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        expectedDuration: { type: "number" }
                      },
                      required: ["question", "category", "difficulty", "expectedDuration"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_interview_questions" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    const questionsData = JSON.parse(toolCall.function.arguments);

    // Create mock interview record
    const { data: mockInterview, error: insertError } = await supabase
      .from("mock_interviews")
      .insert({
        profile_id: profile.id,
        job_title: jobTitle,
        difficulty: difficulty,
        questions: questionsData.questions,
        status: "pending"
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        interviewId: mockInterview.id,
        questions: questionsData.questions 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
