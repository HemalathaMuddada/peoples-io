import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tech news sources with reliability scoring (0-100 scale)
// Higher score = more authoritative/reliable source
const NEWS_SOURCES = [
  { url: 'https://www.bloomberg.com/topics/layoffs', reliability: 95, name: 'Bloomberg' },
  { url: 'https://www.reuters.com/business/future-of-work/', reliability: 95, name: 'Reuters' },
  { url: 'https://www.bloomberg.com/technology', reliability: 95, name: 'Bloomberg Technology' },
  { url: 'https://www.reuters.com/technology/', reliability: 95, name: 'Reuters Technology' },
  { url: 'https://techcrunch.com/tag/layoffs/', reliability: 80, name: 'TechCrunch' },
  { url: 'https://www.theverge.com/tech/archives/2024', reliability: 75, name: 'The Verge' },
  { url: 'https://www.linkedin.com/news/topic/tech-layoffs', reliability: 70, name: 'LinkedIn News' },
];

async function scrapeNewsSource(url: string, sourceName: string, firecrawlApiKey: string) {
  console.log(`Scraping news from ${sourceName}: ${url}`);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    console.error(`Failed to scrape ${sourceName}:`, response.status);
    return null;
  }

  const data = await response.json();
  return data.data?.markdown || null;
}

async function extractLayoffData(content: string) {
  console.log('Analyzing content with AI to extract layoff information...');
  
  const response = await fetch('https://api.lovable.app/v1/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: `Analyze this tech news content and extract any company layoff, hiring freeze, mass hiring, or restructuring announcements. 

For each announcement found, return a JSON array with objects containing:
- company_name: string (company name)
- status_type: "layoff" | "hiring_freeze" | "mass_hiring" | "restructuring"
- severity: "low" | "medium" | "high" (based on impact)
- affected_departments: array of department names (if mentioned)
- employee_count_impact: number (number of employees affected, if mentioned)
- start_date: ISO date string (announcement or effective date)
- source_url: string (source article URL if extractable)
- description: string (brief summary of the situation)

Only return the JSON array, no additional text. If no relevant announcements are found, return an empty array [].

Content to analyze:
${content.slice(0, 15000)}`
        }
      ]
    }),
  });

  if (!response.ok) {
    console.error('AI analysis failed:', response.status);
    return [];
  }

  const result = await response.json();
  const aiResponse = result.choices[0]?.message?.content || '[]';
  
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = aiResponse.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    const extracted = JSON.parse(jsonStr.trim());
    console.log(`Extracted ${extracted.length} layoff announcements`);
    return Array.isArray(extracted) ? extracted : [];
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return [];
  }
}

async function checkSimilarity(newItem: any, existingItem: any): Promise<boolean> {
  console.log(`Checking similarity between new and existing announcement for ${newItem.company_name}`);
  
  const response = await fetch('https://api.lovable.app/v1/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: `Compare these two company announcements and determine if they refer to the same event.

Announcement 1:
- Company: ${newItem.company_name}
- Type: ${newItem.status_type}
- Description: ${newItem.description}
- Date: ${newItem.start_date}
- Employee Impact: ${newItem.employee_count_impact || 'unknown'}

Announcement 2:
- Company: ${existingItem.company_name}
- Type: ${existingItem.status_type}
- Description: ${existingItem.description}
- Date: ${existingItem.start_date}
- Employee Impact: ${existingItem.employee_count_impact || 'unknown'}

Return ONLY "true" if these announcements refer to the same event (even if details differ slightly), or "false" if they are different events.
Consider them the same if:
- Same company and same type of event
- Dates are within 30 days of each other
- Employee impact numbers are similar (within 20%)
- Descriptions describe the same general situation

Return only: true or false`
        }
      ]
    }),
  });

  if (!response.ok) {
    console.error('Similarity check failed:', response.status);
    return false;
  }

  const result = await response.json();
  const aiResponse = result.choices[0]?.message?.content || 'false';
  
  return aiResponse.trim().toLowerCase() === 'true';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Starting automated company news scraping...');
    
    const allLayoffData = [];
    
    // Scrape each news source
    for (const source of NEWS_SOURCES) {
      const content = await scrapeNewsSource(source.url, source.name, firecrawlApiKey);
      
      if (content) {
        const layoffData = await extractLayoffData(content);
        // Tag each entry with source reliability and name
        const taggedData = layoffData.map(item => ({
          ...item,
          source_name: source.name,
          source_reliability: source.reliability,
          source_url: item.source_url || source.url
        }));
        allLayoffData.push(...taggedData);
      }
      
      // Add a small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Total announcements found: ${allLayoffData.length}`);
    
    // Insert new data into the database with deduplication
    let insertedCount = 0;
    let skippedCount = 0;
    let mergedCount = 0;
    
    for (const item of allLayoffData) {
      // Check for similar entries (same company and type within last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { data: existingEntries } = await supabase
        .from('company_status_tracker')
        .select('*')
        .eq('company_name', item.company_name)
        .eq('status_type', item.status_type)
        .gte('start_date', sixtyDaysAgo.toISOString().split('T')[0])
        .limit(5);
      
      let foundSimilar = false;
      
      // Check each existing entry for similarity using AI
      if (existingEntries && existingEntries.length > 0) {
        for (const existing of existingEntries) {
          const isSimilar = await checkSimilarity(item, existing);
          
          if (isSimilar) {
            console.log(`Found similar entry for ${item.company_name}, merging sources...`);
            foundSimilar = true;
            
            // Merge the new source information into existing entry
            const existingMetadata = existing.metadata || {};
            const existingSources = existingMetadata.sources || [
              {
                name: existingMetadata.source_name || 'Unknown',
                url: existing.source_url,
                reliability: existingMetadata.source_reliability || 0
              }
            ];
            
            // Add new source if not already present
            const sourceExists = existingSources.some(
              (s: any) => s.url === item.source_url || s.name === item.source_name
            );
            
            if (!sourceExists) {
              existingSources.push({
                name: item.source_name,
                url: item.source_url,
                reliability: item.source_reliability,
                added_at: new Date().toISOString()
              });
              
              // Calculate new verification status based on multiple sources
              const highReliabilitySources = existingSources.filter((s: any) => s.reliability >= 90).length;
              const shouldVerify = highReliabilitySources >= 2 || existingSources.length >= 3;
              
              // Update the existing entry with merged data
              const { error: updateError } = await supabase
                .from('company_status_tracker')
                .update({
                  metadata: {
                    ...existingMetadata,
                    sources: existingSources,
                    source_count: existingSources.length,
                    highest_reliability: Math.max(...existingSources.map((s: any) => s.reliability)),
                    merged_at: new Date().toISOString()
                  },
                  verified: shouldVerify || existing.verified,
                  // Update description if new one is more detailed
                  description: item.description.length > existing.description.length 
                    ? item.description 
                    : existing.description,
                  // Update employee count if new one is available and old one isn't
                  employee_count_impact: item.employee_count_impact || existing.employee_count_impact
                })
                .eq('id', existing.id);
              
              if (updateError) {
                console.error(`Failed to merge data for ${item.company_name}:`, updateError);
              } else {
                console.log(`Successfully merged source for ${item.company_name}`);
                mergedCount++;
              }
            } else {
              console.log(`Source already exists for ${item.company_name}, skipping`);
              skippedCount++;
            }
            
            break; // Found a match, no need to check other entries
          }
        }
      }
      
      // If no similar entry found, insert as new
      if (!foundSimilar) {
        // Determine auto-verification based on source reliability
        const autoVerified = (item.source_reliability || 0) >= 90;
        
        // Insert new entry
        const { error } = await supabase
          .from('company_status_tracker')
          .insert({
            company_name: item.company_name,
            status_type: item.status_type,
            severity: item.severity || 'medium',
            affected_departments: item.affected_departments || [],
            employee_count_impact: item.employee_count_impact || null,
            start_date: item.start_date,
            source_url: item.source_url,
            description: item.description,
            verified: autoVerified,
            submitted_by: null, // System-generated
            metadata: {
              sources: [
                {
                  name: item.source_name,
                  url: item.source_url,
                  reliability: item.source_reliability,
                  added_at: new Date().toISOString()
                }
              ],
              source_count: 1,
              highest_reliability: item.source_reliability,
              auto_verified: autoVerified
            }
          });
        
        if (error) {
          console.error(`Failed to insert data for ${item.company_name}:`, error);
        } else {
          console.log(`Inserted new layoff data for ${item.company_name}`);
          insertedCount++;
        }
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Scraping complete: ${insertedCount} new, ${mergedCount} merged, ${skippedCount} skipped`,
      totalFound: allLayoffData.length,
      inserted: insertedCount,
      merged: mergedCount,
      skipped: skippedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error scraping company news:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape company news' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
