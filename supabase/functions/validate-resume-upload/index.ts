import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// File magic numbers (signatures) for allowed file types
const FILE_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  doc: [0xD0, 0xCF, 0x11, 0xE0], // Microsoft Office legacy format
  docx: [0x50, 0x4B, 0x03, 0x04], // ZIP format (DOCX is a ZIP)
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting for uploads: 3 per minute, 20 per hour
    const endpoint = "validate-resume-upload";
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: recentRequests } = await supabase
      .from("api_rate_limits")
      .select("window_start")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)
      .gte("window_start", oneMinuteAgo.toISOString());

    if (recentRequests && recentRequests.length >= 3) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Too many upload attempts. Please wait a moment." 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } 
        }
      );
    }

    const { data: hourlyRequests } = await supabase
      .from("api_rate_limits")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)
      .gte("window_start", oneHourAgo.toISOString());

    if (hourlyRequests && hourlyRequests.length >= 20) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Hourly upload limit reached. Please try again later." 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } 
        }
      );
    }

    const { fileName, fileSize, mimeType, filePathInStorage } = await req.json();

    // Validate file size
    if (!fileSize || fileSize > MAX_FILE_SIZE) {
      console.warn(`File size validation failed: ${fileSize} bytes`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "File size must be less than 10MB" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate MIME type
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
      console.warn(`MIME type validation failed: ${mimeType}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Only PDF and Word documents are allowed" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download file from storage to verify magic numbers
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePathInStorage);

    if (downloadError || !fileData) {
      console.error("Failed to download file for validation:", downloadError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Failed to validate file" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read first 4 bytes to check file signature
    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const signature = Array.from(bytes.slice(0, 4));

    // Verify file signature matches declared MIME type
    let signatureValid = false;
    if (mimeType === "application/pdf") {
      signatureValid = signature.every((byte, i) => byte === FILE_SIGNATURES.pdf[i]);
    } else if (mimeType === "application/msword") {
      signatureValid = signature.every((byte, i) => byte === FILE_SIGNATURES.doc[i]);
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      signatureValid = signature.every((byte, i) => byte === FILE_SIGNATURES.docx[i]);
    }

    if (!signatureValid) {
      console.warn(`File signature mismatch for ${fileName}. Expected ${mimeType}, got signature: ${signature.map(b => b.toString(16)).join(' ')}`);
      
      // Delete the invalid file from storage
      await supabase.storage.from("resumes").remove([filePathInStorage]);
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "File type does not match content. File removed for security." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful validation
    await supabase.from("api_rate_limits").insert({
      user_id: user.id,
      endpoint,
      window_start: now.toISOString()
    });

    console.log(`File validation successful: ${fileName} (${fileSize} bytes, ${mimeType})`);

    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof Error ? error.message : "Validation failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
