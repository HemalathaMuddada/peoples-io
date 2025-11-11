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

    const { sessionId, message, jobTitle, company, currentOffer, targetSalary } = await req.json();

    let session;
    if (sessionId) {
      // Load existing session
      const { data, error } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      
      if (error) throw error;
      session = data;
    } else {
      // Create new session
      const { data, error } = await supabase
        .from("negotiation_sessions")
        .insert({
          user_id: user.id,
          job_title: jobTitle,
          company: company,
          current_offer: currentOffer,
          target_salary: targetSalary,
          outcome: "in_progress",
          conversation_history: [],
        })
        .select()
        .single();

      if (error) throw error;
      session = data;
    }

    // Build conversation history
    const conversationHistory = session.conversation_history || [];
    if (message) {
      conversationHistory.push({ role: "user", content: message });
    }

    // Call Lovable AI for negotiation coaching
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
            content: `You are an expert salary negotiation coach. Help the user negotiate their salary effectively.
            
Context:
- Job Title: ${session.job_title}
- Company: ${session.company || "Not specified"}
- Current Offer: $${session.current_offer?.toLocaleString() || "Not specified"}
- Target Salary: $${session.target_salary?.toLocaleString() || "Not specified"}

Your role:
- Provide strategic advice on salary negotiation
- Roleplay as the hiring manager when requested
- Suggest specific phrases and responses
- Help build confidence
- Point out negotiation mistakes and suggest improvements
- Provide market data context when relevant

Be encouraging but realistic. Focus on practical tactics.`
          },
          ...conversationHistory
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // Update conversation history
    conversationHistory.push({ role: "assistant", content: aiMessage });

    // Update session
    await supabase
      .from("negotiation_sessions")
      .update({
        conversation_history: conversationHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    return new Response(JSON.stringify({ 
      sessionId: session.id,
      message: aiMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in salary negotiation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});