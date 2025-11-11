import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing scheduled notifications...');

    // Get all pending notifications that are due
    const { data: dueNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('Error fetching scheduled notifications:', fetchError);
      throw fetchError;
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      console.log('No due notifications to process');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No due notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueNotifications.length} due notifications`);

    let successCount = 0;
    let failCount = 0;

    // Process each notification
    for (const scheduled of dueNotifications) {
      try {
        console.log(`Processing notification ${scheduled.id} for user ${scheduled.user_id}`);

        // Create the actual notification based on channel
        if (scheduled.channel === 'in_app' || scheduled.channel === 'push') {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: scheduled.user_id,
              type: scheduled.notification_type,
              title: scheduled.title,
              message: scheduled.message,
              data: scheduled.data,
              read: false,
            });

          if (notifError) throw notifError;
        }

        if (scheduled.channel === 'email') {
          // TODO: Integrate with email sending service
          console.log('Email sending not yet implemented for scheduled notifications');
        }

        // Mark as sent
        const { error: updateError } = await supabase
          .from('scheduled_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', scheduled.id);

        if (updateError) throw updateError;

        successCount++;
        console.log(`Successfully processed notification ${scheduled.id}`);
      } catch (error) {
        console.error(`Failed to process notification ${scheduled.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', scheduled.id);

        failCount++;
      }
    }

    console.log(`Processed ${successCount} notifications successfully, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        processed: successCount + failCount,
        successful: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-scheduled-notifications:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});