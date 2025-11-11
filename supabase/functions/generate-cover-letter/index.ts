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

    const { jobTitle, company, jobDescription, resumeId } = await req.json();

    // Fetch resume content
    const { data: resume } = await supabase
      .from("resumes")
      .select("text_content, parsed_json")
      .eq("id", resumeId)
      .single();

    if (!resume) throw new Error("Resume not found");

    // Generate cover letter using Lovable AI
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
            content: "You are an expert career coach and professional writer specializing in creating compelling cover letters. Generate personalized, professional cover letters that highlight relevant experience and show genuine interest in the role."
          },
          {
            role: "user",
            content: `Create a professional cover letter for this job application:

Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription}

Candidate's Resume: ${resume.text_content || JSON.stringify(resume.parsed_json)}

Requirements:
- 3-4 paragraphs maximum
- Start with a strong opening that shows enthusiasm
- Highlight 2-3 most relevant experiences/skills from resume
- Show understanding of the company/role
- End with a clear call to action
- Professional but personable tone
- No generic phrases like "I am writing to apply"`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const coverLetter = data.choices[0].message.content;

    return new Response(JSON.stringify({ coverLetter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error generating cover letter:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});