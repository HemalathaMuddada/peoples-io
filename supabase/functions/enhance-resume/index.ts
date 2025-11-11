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
    const { resumeId } = await req.json();
    
    if (!resumeId) {
      return new Response(
        JSON.stringify({ error: "resumeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the resume
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .single();

    if (resumeError || !resume) {
      console.error("Resume fetch error:", resumeError);
      return new Response(
        JSON.stringify({ error: "Resume not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!resume.text_content) {
      return new Response(
        JSON.stringify({ error: "Resume has no text content to enhance" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get ATS feedback for missing keywords and suggestions
    const atsFeedback = resume.ats_feedback || {};
    const missingKeywords = atsFeedback.missing_keywords || atsFeedback.keywordGaps || [];
    const improvements = atsFeedback.improvements || [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create enhancement prompt
    const systemPrompt = `You are an expert resume writer and ATS optimization specialist. Your task is to enhance resumes to:
1. Score 90+ in ATS systems by incorporating relevant keywords naturally
2. Use modern, clean formatting that is both ATS-friendly and visually appealing
3. Transform vague descriptions into quantifiable achievements with metrics
4. Maintain professional tone and accuracy
5. Keep the resume concise (1-2 pages max)

Format the enhanced resume in well-structured markdown with clear sections.`;

    const userPrompt = `Enhance this resume to score higher in ATS systems:

ORIGINAL RESUME:
${resume.text_content}

${missingKeywords.length > 0 ? `MISSING KEYWORDS TO INCORPORATE (naturally):
${missingKeywords.join(", ")}` : ""}

${improvements.length > 0 ? `AREAS FOR IMPROVEMENT:
${improvements.join("\n")}` : ""}

Please provide an enhanced version that:
- Incorporates missing keywords naturally throughout
- Uses action verbs and quantifiable achievements
- Has clear sections: Summary, Experience, Skills, Education
- Is ATS-optimized with clean formatting
- Highlights measurable results and impact

Return ONLY the enhanced resume content in markdown format.`;

    console.log("Calling AI to enhance resume...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to enhance resume" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let enhancedContent = aiData.choices?.[0]?.message?.content;

    if (!enhancedContent) {
      return new Response(
        JSON.stringify({ error: "No enhanced content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up markdown code blocks if present
    enhancedContent = enhancedContent
      .replace(/```markdown\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log("Resume enhanced successfully");

    // Convert to plain text for DOCX (strip markdown formatting for cleaner output)
    const plainText = enhancedContent
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italics
      .replace(/`([^`]+)`/g, '$1') // Remove code formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Convert links to plain text

    return new Response(
      JSON.stringify({
        success: true,
        enhancedContent: plainText,
        originalContent: resume.text_content,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in enhance-resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
