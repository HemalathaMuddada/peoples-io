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

    const { resumeId, filePath } = await req.json();

    if (!resumeId || !filePath) {
      return new Response(
        JSON.stringify({ error: "Missing resumeId or filePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracting text from resume ${resumeId}, file: ${filePath}`);

    // Verify the resume belongs to this user
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("user_id, file_name")
      .eq("id", resumeId)
      .single();

    if (resumeError || !resume) {
      return new Response(
        JSON.stringify({ error: "Resume not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (resume.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to access this resume" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text based on file type
    let extractedText = "";
    const fileName = resume.file_name.toLowerCase();
    const arrayBuffer = await fileData.arrayBuffer();
    
    try {
      if (fileName.endsWith('.pdf')) {
        // PDF extraction using pdfjs-serverless (designed for edge functions)
        const { getDocument } = await import("https://esm.sh/pdfjs-serverless@0.3.2");
        
        const typedArray = new Uint8Array(arrayBuffer);
        const doc = await getDocument(typedArray).promise;
        console.log(`PDF has ${doc.numPages} pages`);
        
        const maxChars = 20000;
        let fullText = "";
        
        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          if (fullText.length >= maxChars) break;
          
          const page = await doc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str || "")
            .join(" ");
          
          fullText += (fullText ? "\n\n" : "") + pageText;
        }
        
        extractedText = fullText.substring(0, maxChars);
        console.log(`Extracted ${extractedText.length} characters from PDF`);
        
      } else if (fileName.endsWith('.docx')) {
        // DOCX extraction using JSZip and basic XML parsing
        const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
        const zip = new JSZip();
        const loaded = await zip.loadAsync(arrayBuffer);
        const docXml = await loaded.file('word/document.xml')?.async('text');
        
        if (!docXml) {
          console.warn('DOCX missing word/document.xml');
        } else {
          // Basic XML to text conversion: remove tags and clean up
          extractedText = docXml
            .replace(/<w:p[^>]*>/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 20000);
          console.log(`Extracted ${extractedText.length} characters from DOCX`);
        }
        
      } else if (fileName.endsWith('.doc')) {
        // Legacy .doc format is not supported (requires complex binary parsing)
        console.log(`Legacy .doc format not supported: ${resume.file_name}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            unsupported: true, 
            reason: 'Legacy .doc format is not supported. Please convert to PDF or DOCX.' 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      } else {
        console.log(`Unsupported file type: ${resume.file_name}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            unsupported: true, 
            reason: 'Unsupported file type. Please upload PDF or DOCX.' 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (parseError) {
      console.error("File parsing error:", parseError);
      extractedText = "";
      // OCR fallback for scanned PDFs (when no selectable text in PDF)
      if ((!extractedText || extractedText.trim().length === 0) && fileName.endsWith('.pdf')) {
        const OCR_API_KEY = Deno.env.get("OCR_SPACE_API_KEY");
        if (OCR_API_KEY) {
          try {
            const form = new FormData();
            form.append("apikey", OCR_API_KEY);
            form.append("language", "eng");
            form.append("OCREngine", "2");
            form.append("scale", "true");
            form.append("isTable", "true");
            form.append("isOverlayRequired", "false");
            const fileForOcr = new File([new Uint8Array(arrayBuffer)], resume.file_name, { type: "application/pdf" });
            form.append("file", fileForOcr, resume.file_name);

            const ocrResp = await fetch("https://api.ocr.space/parse/image", { method: "POST", body: form });
            if (ocrResp.ok) {
              const ocrJson = await ocrResp.json();
              const errored = ocrJson.IsErroredOnProcessing || ocrJson.isErroredOnProcessing;
              if (!errored && ocrJson.ParsedResults && ocrJson.ParsedResults.length > 0) {
                const combined = ocrJson.ParsedResults.map((r: any) => r.ParsedText || "").join("\n");
                extractedText = (combined || "").slice(0, 20000).trim();
                console.log(`OCR extracted ${extractedText.length} characters`);
              } else {
                console.error("OCR provider error:", ocrJson.ErrorMessage || ocrJson.ErrorDetails || ocrJson);
              }
            } else {
              console.error("OCR HTTP error:", ocrResp.status, await ocrResp.text());
            }
          } catch (ocrErr) {
            console.error("OCR fallback error:", ocrErr);
          }
        } else {
          console.warn("OCR_SPACE_API_KEY not configured; skipping OCR fallback");
        }
      }
    }

    // Update the resume record with extracted text
    const { error: updateError } = await supabase
      .from("resumes")
      .update({ text_content: extractedText || null })
      .eq("id", resumeId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update resume" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Saved extracted text for resume ${resumeId}. length=${extractedText.length}`);

    if (!extractedText || extractedText.trim().length === 0) {
      const reason = fileName.endsWith('.pdf')
        ? 'Unable to extract text from PDF.'
        : fileName.endsWith('.docx')
          ? 'Unable to extract text from DOCX.'
          : 'Unsupported file content.';

      return new Response(
        JSON.stringify({ success: false, unsupported: true, reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        textLength: extractedText.length,
        hasText: true 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Text extraction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
