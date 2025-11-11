import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${maxRetries} to fetch from Firecrawl`);
      const response = await fetch(url, options);
      
      // If we get a 503 or 408, retry after a delay
      if ((response.status === 503 || response.status === 408) && i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff, max 5s
        console.log(`Got ${response.status}, retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`Request failed, retrying after ${delay}ms...`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url = 'https://lu.ma/discover' } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check cache first - look for entries less than 1 hour old
    console.log('Checking cache for URL:', url);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: cachedData, error: cacheError } = await supabase
      .from('event_cache')
      .select('*')
      .eq('url', url)
      .gte('created_at', oneHourAgo)
      .single();
    
    if (!cacheError && cachedData) {
      console.log('Cache hit! Returning cached data from:', cachedData.created_at);
      return new Response(JSON.stringify({
        success: true,
        data: {
          markdown: cachedData.markdown_content,
          html: '', // We don't cache HTML separately
        },
        metadata: {
          ...cachedData.metadata,
          cached: true,
          cached_at: cachedData.created_at,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Cache miss or expired. Scraping Luma events from:', url);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const response = await fetchWithRetry('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firecrawl API error:', response.status, errorText);
      
      // Return more user-friendly error messages
      if (response.status === 503) {
        throw new Error('The event scraping service is temporarily unavailable. Please try again in a moment.');
      } else if (response.status === 408) {
        throw new Error('The event service is currently busy. Please try again in a few moments.');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      } else {
        throw new Error(`Unable to fetch events: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('Successfully scraped Luma events');

    // Store in cache
    if (data.success && data.data?.markdown) {
      console.log('Storing scraped data in cache');
      const { error: insertError } = await supabase
        .from('event_cache')
        .upsert({
          url: url,
          markdown_content: data.data.markdown,
          metadata: data.metadata || {},
        }, {
          onConflict: 'url'
        });
      
      if (insertError) {
        console.error('Error caching data:', insertError);
        // Don't fail the request if caching fails
      } else {
        console.log('Successfully cached scraped data');
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error scraping Luma events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unable to fetch events. Please try again later.';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
