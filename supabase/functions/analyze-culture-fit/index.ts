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
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { companyName, profileId } = await req.json();

    // Get user profile for preferences
    const { data: profile } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    // Check if we have cached culture data
    const { data: cultureData } = await supabase
      .from("company_culture_data")
      .select("*")
      .eq("company_name", companyName)
      .single();

    let companyInfo = cultureData;

    // If no cache or stale (>30 days), analyze using AI
    if (!cultureData || (new Date().getTime() - new Date(cultureData.last_updated).getTime()) > 30 * 24 * 60 * 60 * 1000) {
      console.log("Analyzing company culture with AI...");
      
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
              content: "You are a company culture analyst. Provide objective analysis based on available public information."
            },
            {
              role: "user",
              content: `Analyze the company culture for ${companyName}. Provide scores (0-5) and summary for:
- Work-life balance
- Diversity & inclusion
- Career growth opportunities
- Innovation culture
- Team collaboration
- Leadership quality
- Compensation & benefits
- Work environment

Return as JSON:
{
  "culture_scores": {
    "work_life_balance": 4.2,
    "diversity": 3.8,
    "growth": 4.5,
    "innovation": 4.0,
    "collaboration": 4.3,
    "leadership": 3.9,
    "compensation": 4.1,
    "environment": 4.0
  },
  "review_summary": "Brief 2-3 sentence summary of the company culture"
}`
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      // Save to cache
      const { data: saved } = await supabase
        .from("company_culture_data")
        .upsert({
          company_name: companyName,
          culture_scores: analysis.culture_scores,
          review_summary: analysis.review_summary,
          total_reviews: 0,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      companyInfo = saved;
    }

    // Calculate fit score based on user preferences
    let fitScore = 0;
    const fitBreakdown: any = {};

    if (profile && companyInfo) {
      const preferences = {
        work_life_balance: profile.work_environment_preference === "flexible" ? 5 : 3,
        diversity: 4,
        growth: 5,
        innovation: profile.work_style_preferences?.includes("innovative") ? 5 : 3,
        collaboration: profile.team_size_preference === "small" ? 4 : 3,
      };

      const scores = companyInfo.culture_scores as any;
      let totalWeight = 0;

      Object.keys(preferences).forEach(key => {
        const userPref = preferences[key as keyof typeof preferences];
        const companyScore = scores[key] || 3;
        const weight = userPref;
        const match = 5 - Math.abs(userPref - companyScore);
        
        fitBreakdown[key] = {
          userPreference: userPref,
          companyScore: companyScore,
          matchScore: match,
        };

        fitScore += match * weight;
        totalWeight += weight * 5;
      });

      fitScore = Math.round((fitScore / totalWeight) * 100);
    }

    return new Response(JSON.stringify({
      company: companyName,
      cultureData: companyInfo,
      fitScore: fitScore,
      fitBreakdown: fitBreakdown,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error analyzing culture fit:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});