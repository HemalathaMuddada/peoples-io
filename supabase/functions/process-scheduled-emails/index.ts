import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledEmail {
  id: string;
  subject: string;
  body: string;
  recipients: Array<{
    id: string;
    email: string;
    name: string;
    personalized_subject: string;
    personalized_body: string;
  }>;
  created_by: string;
  template_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('Processing scheduled emails...');

    // Get all pending scheduled emails that are due
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process 10 at a time to avoid timeouts

    if (fetchError) {
      console.error('Error fetching scheduled emails:', fetchError);
      throw fetchError;
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.log('No scheduled emails to process');
      return new Response(
        JSON.stringify({ message: 'No emails to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${scheduledEmails.length} scheduled emails to process`);

    const results = [];

    for (const scheduledEmail of scheduledEmails as ScheduledEmail[]) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', scheduledEmail.id);

        let sentCount = 0;
        let failedCount = 0;

        // Send to each recipient
        for (const recipient of scheduledEmail.recipients) {
          try {
            // Log to database
            const { error: dbError } = await supabase
              .from('candidate_communications')
              .insert({
                recipient_email: recipient.email,
                subject: recipient.personalized_subject,
                body: recipient.personalized_body,
                sent_by: scheduledEmail.created_by,
                template_id: scheduledEmail.template_id,
              });

            if (dbError) {
              console.error(`DB error for ${recipient.email}:`, dbError);
              failedCount++;
              continue;
            }

            // Send via SendGrid
            const { error: emailError } = await supabase.functions.invoke(
              'send-communication-email',
              {
                body: {
                  to: recipient.email,
                  subject: recipient.personalized_subject,
                  body: recipient.personalized_body,
                },
              }
            );

            if (emailError) {
              console.error(`Email error for ${recipient.email}:`, emailError);
              failedCount++;
            } else {
              sentCount++;
            }
          } catch (error) {
            console.error(`Failed to send to ${recipient.email}:`, error);
            failedCount++;
          }

          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Update status
        await supabase
          .from('scheduled_emails')
          .update({
            status: sentCount === scheduledEmail.recipients.length ? 'completed' : 'failed',
            sent_count: sentCount,
            failed_count: failedCount,
            completed_at: new Date().toISOString(),
            error_message:
              failedCount > 0
                ? `${failedCount} emails failed to send`
                : null,
          })
          .eq('id', scheduledEmail.id);

        results.push({
          id: scheduledEmail.id,
          sent: sentCount,
          failed: failedCount,
        });

        console.log(`Processed scheduled email ${scheduledEmail.id}: ${sentCount} sent, ${failedCount} failed`);
      } catch (error) {
        console.error(`Error processing scheduled email ${scheduledEmail.id}:`, error);

        // Mark as failed
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', scheduledEmail.id);

        results.push({
          id: scheduledEmail.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Scheduled emails processed',
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-scheduled-emails function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
