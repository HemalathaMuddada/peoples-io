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

    const { applicationId, jobDescription, resumeId, hasCoverLetter, appliedWithinHours } = await req.json();

    // Fetch resume
    const { data: resume } = await supabase
      .from("resumes")
      .select("ats_score, text_content")
      .eq("id", resumeId)
      .single();

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Calculate application health score
    let score = 0;
    const factors: any[] = [];

    // Resume ATS Score (30 points)
    if (resume?.ats_score) {
      const atsPoints = Math.round((resume.ats_score / 100) * 30);
      score += atsPoints;
      factors.push({
        factor: "Resume ATS Score",
        points: atsPoints,
        maxPoints: 30,
        status: resume.ats_score >= 80 ? "good" : resume.ats_score >= 60 ? "ok" : "poor",
        message: `Your resume scores ${resume.ats_score}% on ATS compatibility`
      });
    } else {
      factors.push({
        factor: "Resume ATS Score",
        points: 0,
        maxPoints: 30,
        status: "missing",
        message: "Resume hasn't been analyzed for ATS compatibility"
      });
    }

    // Cover Letter (20 points)
    if (hasCoverLetter) {
      score += 20;
      factors.push({
        factor: "Cover Letter",
        points: 20,
        maxPoints: 20,
        status: "good",
        message: "Cover letter included with application"
      });
    } else {
      factors.push({
        factor: "Cover Letter",
        points: 0,
        maxPoints: 20,
        status: "missing",
        message: "No cover letter - consider adding one for higher success rate"
      });
    }

    // Application Timing (15 points)
    if (appliedWithinHours <= 48) {
      score += 15;
      factors.push({
        factor: "Application Timing",
        points: 15,
        maxPoints: 15,
        status: "good",
        message: `Applied within ${appliedWithinHours} hours of posting`
      });
    } else if (appliedWithinHours <= 168) {
      score += 10;
      factors.push({
        factor: "Application Timing",
        points: 10,
        maxPoints: 15,
        status: "ok",
        message: "Applied within a week - still good timing"
      });
    } else {
      factors.push({
        factor: "Application Timing",
        points: 0,
        maxPoints: 15,
        status: "late",
        message: "Applied more than a week after posting"
      });
    }

    // Profile Completeness (15 points)
    if (profile?.full_name && profile?.avatar_url) {
      score += 15;
      factors.push({
        factor: "Profile Complete",
        points: 15,
        maxPoints: 15,
        status: "good",
        message: "Professional profile with photo"
      });
    } else if (profile?.full_name) {
      score += 10;
      factors.push({
        factor: "Profile Complete",
        points: 10,
        maxPoints: 15,
        status: "ok",
        message: "Profile name set, consider adding a photo"
      });
    } else {
      factors.push({
        factor: "Profile Complete",
        points: 0,
        maxPoints: 15,
        status: "incomplete",
        message: "Complete your profile for better presentation"
      });
    }

    // Resume-Job Match (20 points) - Use AI to analyze
    const matchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are an expert recruiter. Analyze how well a resume matches a job description."
          },
          {
            role: "user",
            content: `Rate this match on a scale of 0-20:

Job Description: ${jobDescription}

Resume: ${resume?.text_content || "No resume content"}

Return only a JSON object:
{
  "matchScore": number between 0-20,
  "reasoning": "brief explanation"
}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (matchResponse.ok) {
      const matchData = await matchResponse.json();
      const matchResult = JSON.parse(matchData.choices[0].message.content);
      score += matchResult.matchScore;
      factors.push({
        factor: "Resume-Job Match",
        points: matchResult.matchScore,
        maxPoints: 20,
        status: matchResult.matchScore >= 15 ? "good" : matchResult.matchScore >= 10 ? "ok" : "poor",
        message: matchResult.reasoning
      });
    }

    return new Response(JSON.stringify({
      score,
      maxScore: 100,
      percentage: score,
      factors,
      recommendations: factors
        .filter((f: any) => f.status !== "good")
        .map((f: any) => f.message)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error analyzing application:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});