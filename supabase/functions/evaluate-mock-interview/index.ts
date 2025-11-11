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

    const { interviewId, answers } = await req.json();

    // Get mock interview
    const { data: interview, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*, candidate_profiles!inner(user_id)")
      .eq("id", interviewId)
      .single();

    if (fetchError || !interview) throw new Error("Interview not found");
    if (interview.candidate_profiles.user_id !== user.id) throw new Error("Unauthorized");

    const systemPrompt = `You are an expert technical interviewer providing detailed feedback on interview answers.
Evaluate each answer based on:
- Technical accuracy and depth
- Communication clarity
- Problem-solving approach
- Completeness of the answer

Provide specific, actionable feedback and suggest improvements.

Return your response as a JSON object with this exact structure:
{
  "overallScore": 75,
  "evaluations": [
    {
      "questionIndex": 0,
      "score": 80,
      "strengths": ["point 1", "point 2"],
      "improvements": ["suggestion 1", "suggestion 2"],
      "feedback": "detailed feedback text"
    }
  ],
  "summary": "overall assessment text",
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

    const questionsAndAnswers = interview.questions.map((q: any, idx: number) => ({
      question: q.question,
      category: q.category,
      answer: answers[idx]?.answer || "No answer provided"
    }));

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
          { 
            role: "user", 
            content: `Evaluate these interview answers:\n${JSON.stringify(questionsAndAnswers, null, 2)}` 
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_interview",
              description: "Evaluate interview answers",
              parameters: {
                type: "object",
                properties: {
                  overallScore: { type: "number" },
                  evaluations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        questionIndex: { type: "number" },
                        score: { type: "number" },
                        strengths: { type: "array", items: { type: "string" } },
                        improvements: { type: "array", items: { type: "string" } },
                        feedback: { type: "string" }
                      },
                      required: ["questionIndex", "score", "strengths", "improvements", "feedback"]
                    }
                  },
                  summary: { type: "string" },
                  recommendations: { type: "array", items: { type: "string" } }
                },
                required: ["overallScore", "evaluations", "summary", "recommendations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "evaluate_interview" } }
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
    const evaluation = JSON.parse(toolCall.function.arguments);

    // Calculate duration (simple estimate based on answer lengths)
    const totalChars = answers.reduce((sum: number, a: any) => sum + (a.answer?.length || 0), 0);
    const estimatedMinutes = Math.max(10, Math.round(totalChars / 1000 * 2));

    // Update mock interview with results
    const { error: updateError } = await supabase
      .from("mock_interviews")
      .update({
        answers: answers,
        feedback: evaluation,
        score: evaluation.overallScore,
        duration_minutes: estimatedMinutes,
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", interviewId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        score: evaluation.overallScore,
        feedback: evaluation 
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
