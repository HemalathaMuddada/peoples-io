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

    // Rate limiting: 10 requests per minute, 100 per hour
    const endpoint = "career-coach";
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
      if (minuteCount >= 10) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before trying again." }),
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

    if (hourlyRequests && hourlyRequests.length >= 100) {
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

    const { messages, profileId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user's profile for context and verify ownership
    let profile = null;
    if (profileId) {
      const { data: profileData, error: profileError } = await supabase
        .from("candidate_profiles")
        .select("*, resumes(*), job_targets(*)")
        .eq("id", profileId)
        .single();

      if (profileError || !profileData) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user owns this profile
      if (profileData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized to access this profile" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      profile = profileData;
    }

    // System prompt with career coach context
    const systemPrompt = `You are Career Agent, a pragmatic and encouraging outplacement coach helping professionals land their next role faster.

Your goals:
- Improve interview win rate through targeted coaching
- Create ATS-friendly resumes tailored to specific jobs
- Explain job matches with concrete reasons
- Guide strategic upskilling with measurable impact

User Profile:
${profile ? `
- Current Title: ${profile.current_title || "Not specified"}
- Years Experience: ${profile.years_experience || 0}
- Target Roles: ${profile.target_titles?.join(", ") || "Not specified"}
- Location: ${profile.location || "Not specified"}
- Resume Status: ${profile.resumes?.length || 0} resume(s) uploaded
` : "Profile not yet complete"}

Communication Style:
- Be concrete and quantify impact where possible
- Use bullet points and short action plans
- When uncertain, ask one clarifying question then propose next steps
- Never fabricate courses, jobs, or data
- Be encouraging but realistic

Available Tools:
- analyze_resume: Get detailed ATS score and improvement suggestions
- suggest_skills: Recommend upskilling based on target roles
- find_jobs: Search for matching job opportunities
- improve_linkedin: Get LinkedIn profile optimization suggestions
- create_resume_bullets: Generate achievement-focused bullet points

Always explain your reasoning and provide actionable next steps.`;

    // Call Lovable AI Gateway (non-streaming for tool handling)
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
          ...messages,
        ],
        stream: false,
        temperature: 0.8,
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_resume",
              description: "Analyze a resume and provide ATS score, keyword analysis, and improvement suggestions",
              parameters: {
                type: "object",
                properties: {
                  resumeId: { type: "string", description: "The ID of the resume to analyze" }
                },
                required: ["resumeId"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "suggest_skills",
              description: "Recommend skills to learn based on target roles and current skill gaps",
              parameters: {
                type: "object",
                properties: {
                  targetRole: { type: "string", description: "The target job role" },
                  currentSkills: { type: "array", items: { type: "string" }, description: "Current skills" }
                },
                required: ["targetRole"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "find_jobs",
              description: "Search for job opportunities matching the user's profile and preferences",
              parameters: {
                type: "object",
                properties: {
                  role: { type: "string", description: "Target job role" },
                  location: { type: "string", description: "Preferred location" },
                  remote: { type: "boolean", description: "Include remote jobs" }
                },
                required: ["role"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "improve_linkedin",
              description: "Get suggestions for improving LinkedIn profile sections",
              parameters: {
                type: "object",
                properties: {
                  section: { 
                    type: "string", 
                    enum: ["headline", "about", "experience"],
                    description: "Which section to improve" 
                  }
                },
                required: ["section"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "create_resume_bullets",
              description: "Generate achievement-focused bullet points for resume experience section",
              parameters: {
                type: "object",
                properties: {
                  role: { type: "string", description: "Job role/title" },
                  responsibilities: { type: "string", description: "Key responsibilities and achievements" },
                  targetJob: { type: "string", description: "Target job to tailor bullets for" }
                },
                required: ["role", "responsibilities"]
              }
            }
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices[0].message;
    
    // Check if AI wants to call a tool
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      
      if (toolCall.function.name === "analyze_resume") {
        const args = JSON.parse(toolCall.function.arguments);
        console.log("Calling analyze-resume function with ID:", args.resumeId);
        
        // Call the analyze-resume edge function
        const { data: resumeData, error: resumeError } = await supabase
          .from("resumes")
          .select("text_content, ats_score, ats_feedback")
          .eq("id", args.resumeId)
          .single();
        
        if (resumeError || !resumeData) {
          return new Response(
            JSON.stringify({ error: "Resume not found or not extracted yet" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // If resume hasn't been analyzed yet, analyze it now
        if (!resumeData.ats_score) {
          const analyzeResponse = await fetch(
            `${supabaseUrl}/functions/v1/analyze-resume`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ resumeId: args.resumeId }),
            }
          );
          
          if (!analyzeResponse.ok) {
            const error = await analyzeResponse.text();
            console.error("Resume analysis failed:", error);
            return new Response(
              JSON.stringify({ error: "Failed to analyze resume" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          const analysisResult = await analyzeResponse.json();
          
          // Format feedback into readable text
          let formattedFeedback = "";
          if (analysisResult.feedback) {
            const feedback = analysisResult.feedback;
            
            if (feedback.strengths && feedback.strengths.length > 0) {
              formattedFeedback += "\n### ✅ Strengths:\n";
              feedback.strengths.forEach((item: string) => {
                formattedFeedback += `- ${item}\n`;
              });
            }
            
            if (feedback.improvements && feedback.improvements.length > 0) {
              formattedFeedback += "\n### 🎯 Areas for Improvement:\n";
              feedback.improvements.forEach((item: string) => {
                formattedFeedback += `- ${item}\n`;
              });
            }
            
            if (feedback.missing_keywords && feedback.missing_keywords.length > 0) {
              formattedFeedback += "\n### 🔑 Missing Keywords:\n";
              formattedFeedback += feedback.missing_keywords.join(", ") + "\n";
            }
            
            if (feedback.recommendations && feedback.recommendations.length > 0) {
              formattedFeedback += "\n### 💡 Recommendations:\n";
              feedback.recommendations.forEach((item: string) => {
                formattedFeedback += `- ${item}\n`;
              });
            }
          }
          
          // Return the analysis directly as a formatted response
          return new Response(
            JSON.stringify({ 
              content: `## 📊 ATS Analysis Complete!\n\n**ATS Score: ${analysisResult.ats_score}/100**\n${formattedFeedback}\n\nWould you like me to help you improve any specific section?`
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        // Return existing analysis with formatted feedback
        let formattedFeedback = "";
        if (resumeData.ats_feedback) {
          const feedback = resumeData.ats_feedback;
          
          if (feedback.strengths && feedback.strengths.length > 0) {
            formattedFeedback += "\n### ✅ Strengths:\n";
            feedback.strengths.forEach((item: string) => {
              formattedFeedback += `- ${item}\n`;
            });
          }
          
          if (feedback.improvements && feedback.improvements.length > 0) {
            formattedFeedback += "\n### 🎯 Areas for Improvement:\n";
            feedback.improvements.forEach((item: string) => {
              formattedFeedback += `- ${item}\n`;
            });
          }
          
          if (feedback.missing_keywords && feedback.missing_keywords.length > 0) {
            formattedFeedback += "\n### 🔑 Missing Keywords:\n";
            formattedFeedback += feedback.missing_keywords.join(", ") + "\n";
          }
          
          if (feedback.recommendations && feedback.recommendations.length > 0) {
            formattedFeedback += "\n### 💡 Recommendations:\n";
            feedback.recommendations.forEach((item: string) => {
              formattedFeedback += `- ${item}\n`;
            });
          }
        }
        
        return new Response(
          JSON.stringify({ 
            content: `## 📊 Previous ATS Analysis\n\n**ATS Score: ${resumeData.ats_score}/100**\n${formattedFeedback}\n\nWould you like me to re-analyze or help with specific improvements?`
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }
    
    // No tool calls - return the AI's text response
    return new Response(
      JSON.stringify({ content: assistantMessage.content }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Career coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
