# Weekly Analytics Report Edge Function

This function sends automated weekly notification analytics reports to users who have opted in.

## Features

- **Performance Metrics**: Total sent, opened, clicked notifications with rates
- **Engagement Patterns**: Best hours, days, and preferred channels based on user behavior
- **Type Breakdown**: Performance analytics by notification type
- **Smart Recommendations**: Personalized suggestions to optimize notification settings
- **Beautiful HTML Email**: Professional, responsive email design

## Setup

### 1. Verify Resend API Key

Make sure the `RESEND_API_KEY` secret is configured in your Supabase project:
- Sign up at https://resend.com
- Verify your domain at https://resend.com/domains
- Create an API key at https://resend.com/api-keys
- Add the key to Supabase secrets

### 2. Enable Weekly Reports for Users

Users can opt in via the `/notification-reports` page or by enabling the "weekly_digest" notification type in their preferences.

### 3. Schedule the Function (Cron Job)

To run this function automatically every Monday at 9 AM, you need to set up a cron job using Supabase's pg_cron extension.

First, enable the required extensions if not already enabled:

```sql
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Then create the cron job:

```sql
-- Schedule the function to run every Monday at 9 AM UTC
SELECT cron.schedule(
  'send-weekly-analytics-reports',
  '0 9 * * 1', -- Every Monday at 9 AM
  $$
  SELECT net.http_post(
    url := 'YOUR_PROJECT_URL/functions/v1/send-weekly-analytics-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

Replace:
- `YOUR_PROJECT_URL` with your Supabase project URL (e.g., `https://abc123.supabase.co`)
- `YOUR_SERVICE_ROLE_KEY` with your service role key

### 4. Test the Function

You can manually trigger the function to test:

```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/send-weekly-analytics-report' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Or use the "Send Test Report" button in the `/notification-reports` page.

## How It Works

1. Fetches all users who have `weekly_digest` enabled with `email_enabled = true`
2. For each user:
   - Retrieves last 7 days of notification analytics
   - Calculates engagement metrics and trends
   - Gets personalized engagement patterns
   - Generates smart recommendations
   - Sends beautifully formatted HTML email
3. Returns summary of sent emails and any errors

## Email Content

The report includes:
- **Header**: Week date range and branding
- **Summary Stats**: Total sent, opened, clicked with rates
- **Engagement Patterns**: Best times, days, and channels
- **Performance Breakdown**: Analytics per notification type
- **Recommendations**: Personalized tips based on behavior
- **CTA Button**: Link to full analytics dashboard
- **Footer**: Preferences management link

## Monitoring

Check the function logs:
```bash
supabase functions logs send-weekly-analytics-report
```

View cron job status:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'send-weekly-analytics-reports'
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### No emails sent
- Verify users have opted in: `SELECT * FROM notification_preferences WHERE notification_type = 'weekly_digest' AND email_enabled = true`
- Check Resend API key is valid
- Review function logs for errors

### Cron not running
- Verify pg_cron extension is enabled
- Check cron schedule: `SELECT * FROM cron.job`
- Review cron execution logs: `SELECT * FROM cron.job_run_details`

### Rate Limiting
- Resend has rate limits based on your plan
- The function includes 100ms delays between emails
- For large user bases, consider batching or upgrading Resend plan