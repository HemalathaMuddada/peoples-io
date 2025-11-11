import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationData {
  date: string;
  month: number;
  dayOfWeek: number;
  responseReceived: boolean;
  interviewGranted: boolean;
  responseTimeHours: number | null;
  jobTitle: string;
  company: string;
}

interface VersionData {
  versionId: string;
  versionTitle: string;
  applications: ApplicationData[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { versions } = await req.json();
    
    if (!versions || !Array.isArray(versions) || versions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No version data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing ${versions.length} resume versions with ML model`);

    // Analyze patterns and prepare context for AI
    const analysisContext = analyzePatterns(versions);
    
    // Build comprehensive prompt for AI analysis
    const prompt = buildAnalysisPrompt(versions, analysisContext);

    console.log("Calling AI model for enhanced predictions");

    // Call Lovable AI for sophisticated analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert career analytics AI specializing in job application performance analysis. 
Your task is to analyze resume version performance data considering:
- Seasonal hiring patterns (Q1-Q4 trends, holiday periods)
- Day-of-week application timing
- Job market trends and economic indicators
- Industry-specific hiring cycles
- Response time patterns

Provide actionable predictions with confidence scores and specific recommendations.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0].message.content;

    console.log("AI analysis completed successfully");

    // Parse AI response and combine with statistical analysis
    const enhancedPredictions = combineAnalysis(versions, analysisContext, aiAnalysis);

    return new Response(
      JSON.stringify({ predictions: enhancedPredictions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in predict-resume-performance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function analyzePatterns(versions: VersionData[]) {
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  
  // Analyze seasonal patterns
  const seasonalData = {
    Q1: { apps: 0, responses: 0, interviews: 0 },
    Q2: { apps: 0, responses: 0, interviews: 0 },
    Q3: { apps: 0, responses: 0, interviews: 0 },
    Q4: { apps: 0, responses: 0, interviews: 0 },
  };

  // Analyze day-of-week patterns
  const dayOfWeekData = new Array(7).fill(0).map(() => ({ apps: 0, responses: 0, interviews: 0 }));

  // Analyze industry/role patterns
  const rolePatterns: Record<string, { apps: number; responses: number; interviews: number }> = {};

  versions.forEach(version => {
    version.applications.forEach(app => {
      const quarter = `Q${Math.floor(app.month / 3) + 1}` as keyof typeof seasonalData;
      
      seasonalData[quarter].apps++;
      if (app.responseReceived) seasonalData[quarter].responses++;
      if (app.interviewGranted) seasonalData[quarter].interviews++;

      dayOfWeekData[app.dayOfWeek].apps++;
      if (app.responseReceived) dayOfWeekData[app.dayOfWeek].responses++;
      if (app.interviewGranted) dayOfWeekData[app.dayOfWeek].interviews++;

      // Extract general role category
      const roleCategory = extractRoleCategory(app.jobTitle);
      if (!rolePatterns[roleCategory]) {
        rolePatterns[roleCategory] = { apps: 0, responses: 0, interviews: 0 };
      }
      rolePatterns[roleCategory].apps++;
      if (app.responseReceived) rolePatterns[roleCategory].responses++;
      if (app.interviewGranted) rolePatterns[roleCategory].interviews++;
    });
  });

  // Calculate best days
  const bestDays = dayOfWeekData
    .map((data, index) => ({
      day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index],
      successRate: data.apps > 0 ? (data.interviews / data.apps) * 100 : 0,
      apps: data.apps,
    }))
    .filter(d => d.apps > 2)
    .sort((a, b) => b.successRate - a.successRate);

  // Calculate seasonal trends
  const seasonalTrends = Object.entries(seasonalData).map(([quarter, data]) => ({
    quarter,
    successRate: data.apps > 0 ? (data.interviews / data.apps) * 100 : 0,
    apps: data.apps,
  }));

  return {
    currentQuarter,
    currentMonth,
    seasonalData,
    dayOfWeekData,
    rolePatterns,
    bestDays,
    seasonalTrends,
    totalApplications: versions.reduce((sum, v) => sum + v.applications.length, 0),
  };
}

function extractRoleCategory(jobTitle: string): string {
  const title = jobTitle.toLowerCase();
  if (title.includes("engineer") || title.includes("developer")) return "Engineering";
  if (title.includes("manager") || title.includes("lead")) return "Management";
  if (title.includes("designer") || title.includes("ux") || title.includes("ui")) return "Design";
  if (title.includes("data") || title.includes("analyst")) return "Data";
  if (title.includes("marketing")) return "Marketing";
  if (title.includes("sales")) return "Sales";
  return "Other";
}

function buildAnalysisPrompt(versions: VersionData[], context: any): string {
  return `Analyze the following resume version performance data and provide enhanced predictions:

CURRENT CONTEXT:
- Current Month: ${context.currentMonth + 1}/12
- Current Quarter: Q${context.currentQuarter}
- Total Applications Analyzed: ${context.totalApplications}

SEASONAL PATTERNS DETECTED:
${context.seasonalTrends.map((s: any) => 
  `${s.quarter}: ${s.apps} applications, ${s.successRate.toFixed(1)}% interview rate`
).join("\n")}

BEST DAYS TO APPLY:
${context.bestDays.slice(0, 3).map((d: any) => 
  `${d.day}: ${d.successRate.toFixed(1)}% success rate (${d.apps} apps)`
).join("\n")}

RESUME VERSIONS DATA:
${versions.map((v, i) => {
  const recentApps = v.applications.slice(-10);
  const recentResponseRate = recentApps.length > 0 
    ? (recentApps.filter(a => a.responseReceived).length / recentApps.length) * 100 
    : 0;
  const recentInterviewRate = recentApps.length > 0
    ? (recentApps.filter(a => a.interviewGranted).length / recentApps.length) * 100
    : 0;
  
  return `Version ${i + 1}: "${v.versionTitle}"
  - Total Applications: ${v.applications.length}
  - Recent Response Rate (last 10): ${recentResponseRate.toFixed(1)}%
  - Recent Interview Rate (last 10): ${recentInterviewRate.toFixed(1)}%
  - Most Common Roles: ${Object.keys(context.rolePatterns).slice(0, 3).join(", ")}`;
}).join("\n\n")}

TASK:
For each resume version, provide:
1. Predicted response rate for next 4 weeks (considering current month/quarter trends)
2. Predicted interview rate for next 4 weeks
3. Confidence level (high/medium/low) based on data quality and consistency
4. Specific external factors affecting predictions (seasonal hiring, market trends)
5. Optimal timing recommendation (best days/weeks to use this version)
6. Overall recommendation (which version to use and why)

Format your response as JSON with this structure:
{
  "versions": [
    {
      "versionTitle": "...",
      "predictedResponseRate": number,
      "predictedInterviewRate": number,
      "confidence": "high|medium|low",
      "externalFactors": ["factor1", "factor2"],
      "optimalTiming": "specific recommendation",
      "recommendation": "detailed recommendation"
    }
  ],
  "overallRecommendation": "which version to prioritize and why",
  "marketInsights": "current job market observations"
}`;
}

function combineAnalysis(versions: VersionData[], context: any, aiAnalysis: string): any[] {
  try {
    // Extract JSON from AI response
    const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse AI response, using fallback");
      return createFallbackPredictions(versions, context);
    }

    const aiPredictions = JSON.parse(jsonMatch[0]);
    
    // Combine AI insights with statistical analysis
    return versions.map((version, index) => {
      const aiVersion = aiPredictions.versions[index] || aiPredictions.versions[0];
      
      // Calculate statistical baseline
      const recentApps = version.applications.slice(-10);
      const baselineResponseRate = recentApps.length > 0
        ? (recentApps.filter(a => a.responseReceived).length / recentApps.length) * 100
        : 0;
      const baselineInterviewRate = recentApps.length > 0
        ? (recentApps.filter(a => a.interviewGranted).length / recentApps.length) * 100
        : 0;

      return {
        versionId: version.versionId,
        versionTitle: version.versionTitle,
        predictedResponseRate: aiVersion.predictedResponseRate || baselineResponseRate,
        predictedInterviewRate: aiVersion.predictedInterviewRate || baselineInterviewRate,
        currentResponseRate: baselineResponseRate,
        currentInterviewRate: baselineInterviewRate,
        confidence: aiVersion.confidence || "medium",
        externalFactors: aiVersion.externalFactors || [],
        optimalTiming: aiVersion.optimalTiming || "Apply during weekdays",
        recommendation: aiVersion.recommendation || "Continue monitoring performance",
        marketInsights: aiPredictions.marketInsights || "",
        seasonalTrend: context.seasonalTrends.find((t: any) => t.quarter === `Q${context.currentQuarter}`)?.successRate || 0,
        bestDays: context.bestDays.slice(0, 3).map((d: any) => d.day),
      };
    });
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return createFallbackPredictions(versions, context);
  }
}

function createFallbackPredictions(versions: VersionData[], context: any): any[] {
  return versions.map(version => {
    const recentApps = version.applications.slice(-10);
    const responseRate = recentApps.length > 0
      ? (recentApps.filter(a => a.responseReceived).length / recentApps.length) * 100
      : 0;
    const interviewRate = recentApps.length > 0
      ? (recentApps.filter(a => a.interviewGranted).length / recentApps.length) * 100
      : 0;

    return {
      versionId: version.versionId,
      versionTitle: version.versionTitle,
      predictedResponseRate: responseRate * 1.05, // Slight optimistic adjustment
      predictedInterviewRate: interviewRate * 1.05,
      currentResponseRate: responseRate,
      currentInterviewRate: interviewRate,
      confidence: version.applications.length >= 10 ? "medium" : "low",
      externalFactors: ["Limited data for detailed analysis"],
      optimalTiming: `Best days: ${context.bestDays.slice(0, 2).map((d: any) => d.day).join(", ")}`,
      recommendation: "Continue tracking performance to improve predictions",
      seasonalTrend: 0,
      bestDays: context.bestDays.slice(0, 3).map((d: any) => d.day),
    };
  });
}
