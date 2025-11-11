import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { intelligenceData } = await req.json();

    // Build context from intelligence data
    const context = {
      salary: {
        sessions: intelligenceData.salaryData?.length || 0,
        avgTarget: intelligenceData.salaryData?.reduce((acc: number, s: any) => acc + (s.target_salary || 0), 0) / (intelligenceData.salaryData?.length || 1),
      },
      culture: {
        companiesAnalyzed: intelligenceData.cultureData?.length || 0,
        avgFitScore: intelligenceData.cultureData?.reduce((acc: number, c: any) => acc + (c.fit_score || 0), 0) / (intelligenceData.cultureData?.length || 1),
        topCompanies: intelligenceData.cultureData?.slice(0, 3).map((c: any) => ({
          name: c.company_name,
          score: c.fit_score,
        })),
      },
      interviews: {
        completed: intelligenceData.interviewData?.length || 0,
        avgScore: intelligenceData.interviewData?.reduce((acc: number, i: any) => acc + (i.score || 0), 0) / (intelligenceData.interviewData?.length || 1),
        difficulties: intelligenceData.interviewData?.map((i: any) => i.difficulty),
      },
      resumes: {
        versionsCount: intelligenceData.resumeVersions?.length || 0,
        totalApplications: intelligenceData.applications?.length || 0,
        bestVersion: intelligenceData.resumeVersions?.[0],
      },
    };

    const prompt = `You are a career intelligence advisor analyzing a job seeker's comprehensive data.

Career Intelligence Summary:
- Salary Negotiations: ${context.salary.sessions} sessions, avg target $${Math.round(context.salary.avgTarget).toLocaleString()}
- Culture Fit: ${context.culture.companiesAnalyzed} companies analyzed, avg fit ${Math.round(context.culture.avgFitScore)}%
- Interview Prep: ${context.interviews.completed} mock interviews, avg score ${Math.round(context.interviews.avgScore)}%
- Resume Performance: ${context.resumes.versionsCount} versions tested, ${context.resumes.totalApplications} applications sent

Based on this data, provide 5-7 specific, actionable recommendations to improve their job search success. Consider:
- Gaps in their preparation (e.g., low interview scores, poor culture matches)
- Strengths to leverage (e.g., high-performing resume versions)
- Next steps to take (e.g., target specific companies, practice more interviews)
- Strategic insights across all four intelligence areas

Format: Return a JSON array of recommendation strings. Each should be specific, actionable, and under 100 words.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert career advisor specializing in data-driven job search strategies. Provide specific, actionable recommendations based on user data.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_recommendations",
              description: "Return personalized career recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of 5-7 specific, actionable recommendations",
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const recommendations = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error generating recommendations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
