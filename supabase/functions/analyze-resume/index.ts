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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: 5 requests per minute, 50 per hour (lower than career-coach due to processing cost)
    const endpoint = "analyze-resume";
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check requests in the last minute
    const { data: recentRequests, error: rateCheckError } = await supabase
      .from("api_rate_limits")
      .select("request_count, window_start")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)
      .gte("window_start", oneMinuteAgo.toISOString())
      .order("window_start", { ascending: false });

    if (rateCheckError) {
      console.error("Rate limit check error:", rateCheckError);
    } else if (recentRequests && recentRequests.length > 0) {
      const minuteCount = recentRequests.filter(r => new Date(r.window_start) >= oneMinuteAgo).length;
      if (minuteCount >= 5) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before analyzing another resume." }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": "60"
            } 
          }
        );
      }
    }

    // Check requests in the last hour
    const { data: hourlyRequests } = await supabase
      .from("api_rate_limits")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)
      .gte("window_start", oneHourAgo.toISOString());

    if (hourlyRequests && hourlyRequests.length >= 50) {
      return new Response(
        JSON.stringify({ error: "Hourly rate limit exceeded. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600"
          } 
        }
      );
    }

    // Log this request
    await supabase.from("api_rate_limits").insert({
      user_id: user.id,
      endpoint,
      window_start: now.toISOString()
    });

    // Clean up old records (older than 1 hour)
    await supabase
      .from("api_rate_limits")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)
      .lt("window_start", oneHourAgo.toISOString());

    const { resumeId, textContent, targetRole } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get resume content and verify ownership
    let resumeText = textContent;
    if (resumeId && !textContent) {
      const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .select("text_content, user_id")
        .eq("id", resumeId)
        .single();
      
      if (resumeError || !resume) {
        return new Response(
          JSON.stringify({ error: "Resume not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user owns this resume
      if (resume.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized to access this resume" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resumeText = resume.text_content;
    }

    if (!resumeText) {
      throw new Error("No resume content provided");
    }

    // Analyze with AI
    const prompt = `Analyze this resume and provide:
1. ATS Score (0-100) based on:
   - Proper formatting and structure
   - Keyword optimization for ${targetRole || "the candidate's field"}
   - Quantified achievements and metrics
   - Clear contact information
   - Appropriate length and sections

2. Specific Issues (list each):
   - Missing sections or information
   - Formatting problems
   - Keyword gaps
   - Vague statements lacking metrics

3. Improvement Suggestions (prioritized list):
   - Quick wins (easy fixes with high impact)
   - Content improvements
   - Keyword additions
   - Formatting adjustments

Resume Content:
${resumeText.substring(0, 4000)}

Provide the response in JSON format:
{
  "atsScore": <number 0-100>,
  "issues": [
    {"category": "formatting|keywords|content|contact", "issue": "description", "severity": "high|medium|low"}
  ],
  "suggestions": [
    {"priority": "high|medium|low", "suggestion": "specific action", "impact": "expected improvement"}
  ],
  "keywordGaps": ["keyword1", "keyword2"],
  "strengths": ["strength1", "strength2"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are an expert ATS (Applicant Tracking System) analyst and resume coach. Provide detailed, actionable feedback in JSON format." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // Store analysis in database
    if (resumeId) {
      await supabase
        .from("resumes")
        .update({
          ats_score: analysis.atsScore,
          ats_feedback: analysis
        })
        .eq("id", resumeId);
    }

    return new Response(
      JSON.stringify(analysis),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Resume analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
