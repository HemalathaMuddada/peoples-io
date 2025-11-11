import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { 
  getWelcomeEmailHTML, 
  getApplicationSubmittedHTML,
  getInterviewScheduledHTML,
  getJobMatchAlertHTML,
  getMentorshipRequestHTML,
  getMentorshipResponseHTML,
  getSessionScheduledHTML,
  getSessionReminderHTML,
  getFeedbackRequestHTML,
  getResumeAnalysisHTML,
  getAchievementHTML,
  getLearningStreakHTML,
  getGoalProgressHTML,
  getWeeklyDigestHTML,
  getInterviewReminderHTML,
  getApplicationDeadlineHTML,
  getABTestResultsHTML,
  getAgencyJobPostedHTML,
  getRelationshipApprovedHTML,
  getRelationshipDeclinedHTML,
  getBadgeAwardedHTML
} from './_templates/email-templates.ts';
import { getCompanyInvitationHTML } from './_templates/company-invitation-template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    // Handle direct template-based emails (e.g., interview invitations)
    if (body.template === 'interview-scheduled' && body.data) {
      const emailHtml = getInterviewScheduledHTML(
        body.data.userName,
        body.data.jobTitle,
        body.data.company,
        body.data.interviewDate,
        body.data.interviewTime,
        body.data.interviewType,
        body.data.location,
        body.data.interviewUrl
      );

      const { error: emailError } = await resend.emails.send({
        from: 'CareerSync <onboarding@resend.dev>',
        to: [body.to],
        subject: body.subject,
        html: emailHtml,
      });

      if (emailError) throw emailError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle notification-based emails
    const { notificationId } = body;

    if (!notificationId) {
      throw new Error('notificationId is required');
    }

    // Fetch notification details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .eq('id', notificationId)
      .eq('channel', 'email')
      .is('read_at', null)
      .single();

    // Special handling for company_invitation (user may not exist yet)
    if (notifError && notifError.code === 'PGRST116') {
      const { data: invitationNotif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .eq('type', 'company_invitation')
        .single();
      
      if (invitationNotif) {
        const payload = invitationNotif.payload_json || {};
        const invitationEmail = payload.email;
        
        if (!invitationEmail) {
          throw new Error('No email found in company_invitation payload');
        }
        
        const emailSubject = `You're invited to join ${payload.organizationName}`;
        const emailHtml = getCompanyInvitationHTML(
          payload.organizationName,
          payload.inviterName,
          payload.role,
          payload.inviteLink,
          payload.expiresAt
        );
        
        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'CareerSync <notifications@careersync.com>',
          to: [invitationEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailError) {
          console.error('Resend error:', emailError);
          throw emailError;
        }

        console.log('Invitation email sent successfully:', emailData);

        return new Response(
          JSON.stringify({ success: true, emailId: emailData?.id }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (notifError || !notification) {
      console.error('Notification not found or already sent:', notifError);
      return new Response(
        JSON.stringify({ error: 'Notification not found or already sent' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = notification.profiles.email;
    const userName = notification.profiles.full_name || 'there';
    const payload = notification.payload_json || {};
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/v1', '') || 'https://app.careersync.com';

    let emailHtml: string;
    let emailSubject: string;

    // Generate email based on notification type
    switch (notification.type) {
      case 'welcome':
        emailSubject = 'Welcome to CareerSync! 🚀';
        emailHtml = getWelcomeEmailHTML(userName, `${baseUrl}/dashboard`);
        break;

      case 'application_submitted':
        emailSubject = `Application submitted: ${payload.jobTitle} at ${payload.company}`;
        emailHtml = getApplicationSubmittedHTML(
          userName,
          payload.jobTitle,
          payload.company,
          `${baseUrl}/applications`
        );
        break;

      case 'interview_scheduled':
        emailSubject = `Interview scheduled: ${payload.jobTitle} at ${payload.company}`;
        emailHtml = getInterviewScheduledHTML(
          userName,
          payload.jobTitle,
          payload.company,
          payload.interviewDate,
          payload.interviewTime,
          payload.interviewType,
          payload.location,
          `${baseUrl}/applications`
        );
        break;

      case 'job_match_alert':
        emailSubject = `${payload.matchCount} new job matches found!`;
        emailHtml = getJobMatchAlertHTML(
          userName,
          payload.matchCount,
          payload.topMatches || [],
          `${baseUrl}/jobs`
        );
        break;

      case 'mentorship_request_received':
        emailSubject = 'New mentorship request received';
        emailHtml = getMentorshipRequestHTML(
          userName,
          payload.menteeName,
          payload.message,
          `${baseUrl}/coaching-requests`
        );
        break;

      case 'mentorship_request_response':
        emailSubject = `Mentorship request ${payload.status}`;
        emailHtml = getMentorshipResponseHTML(
          userName,
          payload.mentorName,
          payload.status,
          payload.responseMessage,
          `${baseUrl}/coaching-requests`
        );
        break;

      case 'session_scheduled':
        emailSubject = 'Mentorship session scheduled';
        emailHtml = getSessionScheduledHTML(
          userName,
          payload.otherPartyName,
          payload.scheduledDate,
          payload.scheduledTime,
          payload.meetingLink,
          `${baseUrl}/coach`
        );
        break;

      case 'session_reminder':
        emailSubject = 'Reminder: Upcoming mentorship session';
        emailHtml = getSessionReminderHTML(
          userName,
          payload.otherPartyName,
          payload.scheduledDate,
          payload.scheduledTime,
          payload.meetingLink,
          `${baseUrl}/coach`
        );
        break;

      case 'feedback_request':
        emailSubject = 'Session feedback requested';
        emailHtml = getFeedbackRequestHTML(
          userName,
          payload.otherPartyName,
          payload.sessionDate,
          `${baseUrl}/coach`
        );
        break;

      case 'resume_analysis_complete':
        emailSubject = 'Your resume analysis is ready!';
        emailHtml = getResumeAnalysisHTML(
          userName,
          payload.resumeScore,
          payload.strengths || [],
          payload.improvements || [],
          `${baseUrl}/resumes`
        );
        break;

      case 'achievement_unlocked':
        emailSubject = `Achievement unlocked: ${payload.achievementName}!`;
        emailHtml = getAchievementHTML(
          userName,
          payload.achievementName,
          payload.achievementType,
          payload.achievementDescription,
          `${baseUrl}/dashboard`
        );
        break;

      case 'learning_streak_milestone':
        emailSubject = `${payload.streakDays} day learning streak! 🔥`;
        emailHtml = getLearningStreakHTML(
          userName,
          payload.streakDays,
          payload.longestStreak,
          `${baseUrl}/career-development`
        );
        break;

      case 'goal_progress_update':
        emailSubject = `Progress update: ${payload.goalTitle}`;
        emailHtml = getGoalProgressHTML(
          userName,
          payload.goalTitle,
          payload.progressPercentage,
          payload.milestoneName,
          `${baseUrl}/career-development`
        );
        break;

      case 'weekly_digest':
        emailSubject = 'Your weekly career summary';
        emailHtml = getWeeklyDigestHTML(
          userName,
          payload.weekStats,
          `${baseUrl}/dashboard`
        );
        break;

      case 'interview_reminder_24h':
        emailSubject = `Interview tomorrow: ${payload.jobTitle} at ${payload.company}`;
        emailHtml = getInterviewReminderHTML(
          userName,
          payload.jobTitle,
          payload.company,
          payload.interviewDate,
          payload.interviewTime,
          payload.interviewType,
          payload.location,
          payload.meetingLink,
          `${baseUrl}/applications`
        );
        break;

      case 'application_followup_reminder':
        emailSubject = 'Time to follow up on your applications';
        emailHtml = getApplicationDeadlineHTML(
          userName,
          payload.applications || [],
          `${baseUrl}/applications`
        );
        break;

      case 'ab_test_results':
        emailSubject = `A/B Test results: ${payload.testName}`;
        emailHtml = getABTestResultsHTML(
          userName,
          payload.testName,
          payload.winningVersion,
          payload.results,
          `${baseUrl}/resume-ab-testing`
        );
        break;

      case 'company_invitation':
        emailSubject = `You're invited to join ${payload.organizationName}`;
        emailHtml = getCompanyInvitationHTML(
          payload.organizationName,
          payload.inviterName,
          payload.role,
          payload.inviteLink,
          payload.expiresAt
        );
        break;

      case 'agency_job_posted':
        emailSubject = `Job posted on your behalf: ${payload.jobTitle}`;
        emailHtml = getAgencyJobPostedHTML(
          userName,
          payload.jobTitle,
          payload.agencyName,
          payload.company,
          payload.location,
          payload.postedDate,
          `${baseUrl}/admin/jobs`
        );
        break;

      case 'relationship_approved':
        emailSubject = `Partnership approved with ${payload.employerName}! 🎉`;
        emailHtml = getRelationshipApprovedHTML(
          userName,
          payload.employerName,
          payload.startDate,
          payload.reviewedDate,
          `${baseUrl}/agency-clients`
        );
        break;

      case 'relationship_declined':
        emailSubject = `Partnership request update: ${payload.employerName}`;
        emailHtml = getRelationshipDeclinedHTML(
          userName,
          payload.employerName,
          payload.reviewedDate,
          payload.notes,
          `${baseUrl}/agency-clients`
        );
        break;

      case 'badge_awarded':
        emailSubject = `🎉 New Badge Earned: ${payload.badgeName}!`;
        emailHtml = getBadgeAwardedHTML(
          userName,
          payload.badgeName,
          payload.badgeType,
          payload.description,
          payload.awardedDate,
          `${baseUrl}/recruiter-leaderboard`
        );
        break;

      default:
        throw new Error(`Unsupported notification type: ${notification.type}`);
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'CareerSync <notifications@careersync.com>',
      to: [userEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      throw emailError;
    }

    // Mark notification as read
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
