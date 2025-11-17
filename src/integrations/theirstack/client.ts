import { z } from "zod";

const theirStackJobSchema = z.object({
  id: z.number(),
  job_title: z.string(),
  url: z.string(),
  date_posted: z.string(),
  company: z.string(),
  location: z.string(),
  remote: z.boolean(),
  salary_string: z.string().nullable(),
  min_annual_salary: z.number().nullable(),
  min_annual_salary_usd: z.number().nullable(),
  max_annual_salary: z.number().nullable(),
  max_annual_salary_usd: z.number().nullable(),
  avg_annual_salary_usd: z.number().nullable(),
  salary_currency: z.string().nullable(),
  description: z.string(),
});

export type TheirStackJob = z.infer<typeof theirStackJobSchema>;

const theirStackResponseSchema = z.object({
  jobs: z.array(theirStackJobSchema),
});

export const searchJobs = async (query: string): Promise<TheirStackJob[]> => {
  const response = await fetch("https://api.theirstack.com/v1/jobs/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": import.meta.env.VITE_THEIRSTACK_API_KEY,
    },
    body: JSON.stringify({
      query: {
        bool: {
          must: [
            {
              query_string: {
                query,
              },
            },
          ],
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch jobs from TheirStack API");
  }

  const data = await response.json();
  const parsedData = theirStackResponseSchema.parse(data);
  return parsedData.jobs;
};
