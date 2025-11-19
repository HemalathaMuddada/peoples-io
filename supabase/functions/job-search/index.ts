import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// No cache helper
function setNoCache(res) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// REGION → COUNTRY MAP
const countries = {
  india: "IN",
  usa: "US",
  uk: "GB",
  canada: "CA",
  australia: "AU",
  uae: "AE",
  singapore: "SG",
};

// --------------------------------------------------
// NORMALIZER (VERY IMPORTANT FOR DEDUPLICATION)
// --------------------------------------------------
function normalize(str) {
  if (!str) return "";

  return str
    .toLowerCase()
    // Normalize PwC names
    .replace(/\bpricewaterhousecoopers\b/g, "pwc")
    .replace(/\bpwc india\b/g, "pwc")
    .replace(/\bpwc\b/g, "pwc")
    // Remove JSearch prefixes like IN_, IN-, PAN INDIA
    .replace(/^in[_\-\s]+/g, "")
    .replace(/\bpan india\b/g, "")
    .replace(/\bindia\b/g, "")
    // Remove all non alphanumeric
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// --------------------------------------------------
// COMPANY FILTER
// --------------------------------------------------
function filterByCompany(jobs, company) {
  if (!company) return jobs;
  const kw = company.toLowerCase();
  return jobs.filter((j) => (j.company || "").toLowerCase().includes(kw));
}

// --------------------------------------------------
// MERGING + DEDUPLICATION (IMPORTANT PART)
// --------------------------------------------------
function mergeDistinct(results) {
  const map = {};

  results.forEach((job) => {
    const titleKey = normalize(job.title);
    const companyKey = normalize(job.company);

    const key = `${titleKey}|${companyKey}`;

    if (!map[key]) {
      map[key] = {
        ...job,
        source_from: new Set([job.source]),
      };
    } else {
      // Add new source to existing entry
      map[key].source_from.add(job.source);

      // Merge missing data
      map[key].description ||= job.description;
      map[key].location ||= job.location;
      map[key].apply_url ||= job.apply_url;
    }
  });

  // Convert Set -> Array
  return Object.values(map).map((j) => ({
    ...j,
    source_from: Array.from(j.source_from),
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const company = url.searchParams.get("company") || "";
  const region = (url.searchParams.get("region") || "india").toLowerCase();

  const countryCode = countries[region] || "IN";

  // ---------------------------
  // API FETCHERS
  // ---------------------------

  async function fetchJSearch() {
    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(
        `${company} ${q}`
      )}&country=${countryCode}&page=1`;

      const r = await fetch(url, {
        headers: {
          "x-rapidapi-key": Deno.env.get("RAPIDAPI_KEY"),
          "x-rapidapi-host": "jsearch.p.rapidapi.com",
        },
      });

      const d = await r.json();

      return (d.data || []).map((j) => ({
        title: j.job_title,
        company: j.employer_name,
        location: j.job_location,
        description: j.job_description,
        apply_url: j.job_apply_link,
        source: "jsearch",
      }));
    } catch {
      return [];
    }
  }

  async function fetchAdzuna() {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${Deno.env.get("ADZUNA_APP_ID")}&app_key=${Deno.env.get("ADZUNA_APP_KEY")}&what=${encodeURIComponent(
        q
      )}&what_and=${encodeURIComponent(company)}&results_per_page=30`;

      const r = await fetch(url);
      const d = await r.json();

      return (d.results || []).map((j) => ({
        title: j.title,
        company: j.company?.display_name,
        location: j.location?.display_name,
        description: j.description,
        apply_url: j.redirect_url,
        source: "adzuna",
      }));
    } catch {
      return [];
    }
  }

  async function fetchTheirStack() {
    try {
      const body = {
        page: 0,
        limit: 50,
        posted_at_max_age_days: 50,
        job_country_code_or: [countryCode],
        job_title_or: [q],
      };

      const r = await fetch("https://api.theirstack.com/v1/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("THEIRSTACK_API_KEY")}`,
        },
        body: JSON.stringify(body),
      });

      const d = await r.json();

      return (d.data || []).map((j) => ({
        title: j.job_title,
        company: j.company,
        location: j.location,
        description: j.description,
        apply_url: j.url,
        source: "theirstack",
      }));
    } catch {
      return [];
    }
  }

  async function fetchReed() {
    try {
      const url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(
        q
      )}&location=London&resultsToTake=100`;

      const r = await fetch(url, {
        headers: { Authorization: Deno.env.get("REED_API_AUTH") },
      });

      const d = await r.json();

      return (d.results || []).map((j) => ({
        title: j.jobTitle,
        company: j.employerName,
        location: j.locationName,
        description: j.jobDescription,
        apply_url: j.jobUrl,
        source: "reed",
      }));
    } catch {
      return [];
    }
  }

  // ---------------------------
  // RUN ALL APIS IN PARALLEL
  // ---------------------------
  const [jsearch, adzuna, theirstack, reed] = await Promise.all([
    fetchJSearch(),
    fetchAdzuna(),
    fetchTheirStack(),
    fetchReed(),
  ]);

  let all = [...jsearch, ...adzuna, ...theirstack, ...reed];

  if (company) all = filterByCompany(all, company);

  const finalResults = mergeDistinct(all);

  const res = new Response(JSON.stringify({ results: finalResults }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  return setNoCache(res);
});
