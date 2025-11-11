import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    console.log('Starting weekly analytics report generation...');

    // Get all users who have opted in for weekly digest emails
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('notification_type', 'weekly_digest')
      .eq('email_enabled', true);

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      throw prefError;
    }

    if (!preferences || preferences.length === 0) {
      console.log('No users opted in for weekly digest');
      return new Response(
        JSON.stringify({ message: 'No users to send reports to', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${preferences.length} users to send reports to`);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    let sentCount = 0;
    let errorCount = 0;

    // Process each user
    for (const pref of preferences) {
      try {
        const userId = pref.user_id;
        
        // Get user email
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !user?.email) {
          console.error(`Error getting user ${userId}:`, userError);
          errorCount++;
          continue;
        }

        console.log(`Generating report for user ${userId} (${user.email})`);

        // Get analytics data
        const { data: analytics, error: analyticsError } = await supabase
          .rpc('get_notification_analytics', {
            p_start_date: oneWeekAgo,
            p_end_date: now,
            p_user_id: userId,
          });

        if (analyticsError) {
          console.error(`Error getting analytics for ${userId}:`, analyticsError);
          errorCount++;
          continue;
        }

        // Get engagement trends
        const { data: trends, error: trendsError } = await supabase
          .rpc('get_notification_engagement_trends', {
            p_start_date: oneWeekAgo,
            p_end_date: now,
            p_granularity: 'day',
          });

        if (trendsError) {
          console.error(`Error getting trends for ${userId}:`, trendsError);
        }

        // Get user engagement patterns
        const { data: patterns, error: patternsError } = await supabase
          .rpc('get_user_engagement_patterns', {
            p_user_id: userId,
          });

        if (patternsError) {
          console.error(`Error getting patterns for ${userId}:`, patternsError);
        }

        const pattern = patterns && patterns.length > 0 ? patterns[0] : null;

        // Calculate totals
        const totalSent = analytics?.reduce((sum: number, a: any) => sum + (a.total_sent || 0), 0) || 0;
        const totalOpened = analytics?.reduce((sum: number, a: any) => sum + (a.total_opened || 0), 0) || 0;
        const totalClicked = analytics?.reduce((sum: number, a: any) => sum + (a.total_clicked || 0), 0) || 0;
        const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
        const avgClickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

        // Generate recommendations
        const recommendations = generateRecommendations(analytics, pattern);

        // Generate HTML email
        const html = generateEmailHTML({
          userName: user.user_metadata?.full_name || user.email.split('@')[0],
          weekStart: new Date(oneWeekAgo).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          weekEnd: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          totalSent,
          totalOpened,
          totalClicked,
          avgOpenRate,
          avgClickRate,
          analytics: analytics || [],
          trends: trends || [],
          pattern,
          recommendations,
        });

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: 'Career Platform <notifications@resend.dev>',
          to: [user.email],
          subject: `Your Weekly Notification Report - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          html,
        });

        if (emailError) {
          console.error(`Error sending email to ${user.email}:`, emailError);
          errorCount++;
        } else {
          console.log(`Successfully sent report to ${user.email}`);
          sentCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing user ${pref.user_id}:`, error);
        errorCount++;
      }
    }

    console.log(`Weekly reports sent: ${sentCount}, errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        message: 'Weekly analytics reports processed',
        sent: sentCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-weekly-analytics-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateRecommendations(analytics: any[], pattern: any): string[] {
  const recommendations: string[] = [];

  if (!analytics || analytics.length === 0) {
    recommendations.push('Enable notifications to start tracking your engagement patterns.');
    return recommendations;
  }

  // Check overall open rate
  const avgOpenRate = analytics.reduce((sum, a) => sum + (parseFloat(a.open_rate) || 0), 0) / analytics.length;
  
  if (avgOpenRate < 30) {
    recommendations.push('Your average open rate is below 30%. Consider enabling smart scheduling to optimize delivery times based on when you\'re most active.');
  } else if (avgOpenRate > 60) {
    recommendations.push('Great engagement! Your open rate is above 60%. Keep up the good habits.');
  }

  // Check if user has engagement patterns
  if (pattern && pattern.best_hour !== null) {
    const hour = pattern.best_hour;
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    recommendations.push(`You\'re most engaged in the ${period} (around ${formatHour(hour)}). Smart scheduling can automatically deliver notifications during your peak times.`);
  }

  // Check for low engagement types
  const lowEngagementTypes = analytics.filter(a => parseFloat(a.open_rate) < 20);
  if (lowEngagementTypes.length > 0) {
    const types = lowEngagementTypes.map(a => a.notification_type).join(', ');
    recommendations.push(`Consider adjusting preferences for: ${types}. These have lower engagement rates.`);
  }

  // Check preferred channel
  if (pattern && pattern.preferred_channel) {
    recommendations.push(`${capitalizeFirst(pattern.preferred_channel)} notifications work best for you. Consider prioritizing this channel for important updates.`);
  }

  // Engagement streak
  if (pattern && pattern.total_engagements > 20) {
    recommendations.push(`You've engaged with ${pattern.total_engagements} notifications recently - you're actively managing your career development!`);
  }

  return recommendations;
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${ampm}`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateEmailHTML(data: {
  userName: string;
  weekStart: string;
  weekEnd: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  avgOpenRate: string;
  avgClickRate: string;
  analytics: any[];
  trends: any[];
  pattern: any;
  recommendations: string[];
}): string {
  const { userName, weekStart, weekEnd, totalSent, totalOpened, totalClicked, 
          avgOpenRate, avgClickRate, analytics, trends, pattern, recommendations } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Notification Report</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333;
    }
    .stats-grid {
      display: table;
      width: 100%;
      margin: 30px 0;
    }
    .stat-row {
      display: table-row;
    }
    .stat-cell {
      display: table-cell;
      padding: 20px;
      text-align: center;
      border: 1px solid #e5e5e5;
      background-color: #fafafa;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin: 0 0 5px 0;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin: 0;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .chart-placeholder {
      background: linear-gradient(to right, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
      height: 200px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
      margin: 15px 0;
    }
    .type-row {
      padding: 15px;
      border-bottom: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .type-name {
      font-weight: 500;
      color: #333;
      text-transform: capitalize;
    }
    .type-stats {
      font-size: 14px;
      color: #666;
    }
    .rate-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      margin-left: 10px;
    }
    .rate-good {
      background-color: #d4edda;
      color: #155724;
    }
    .rate-medium {
      background-color: #fff3cd;
      color: #856404;
    }
    .rate-low {
      background-color: #f8d7da;
      color: #721c24;
    }
    .recommendations {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .recommendation-item {
      padding: 10px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    .recommendation-item:last-child {
      border-bottom: none;
    }
    .recommendation-icon {
      color: #667eea;
      margin-right: 10px;
      font-weight: bold;
    }
    .pattern-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .pattern-item {
      padding: 10px 0;
    }
    .pattern-label {
      opacity: 0.8;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pattern-value {
      font-size: 20px;
      font-weight: 600;
      margin-top: 5px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 15px 30px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e5e5e5;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly Notification Report</h1>
      <p>${weekStart} - ${weekEnd}</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${userName},</p>
      <p>Here's your weekly summary of notification engagement and personalized recommendations to optimize your experience.</p>
      
      <div class="stats-grid">
        <div class="stat-row">
          <div class="stat-cell">
            <p class="stat-value">${totalSent}</p>
            <p class="stat-label">Notifications Sent</p>
          </div>
          <div class="stat-cell">
            <p class="stat-value">${totalOpened}</p>
            <p class="stat-label">Opened</p>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-cell">
            <p class="stat-value">${avgOpenRate}%</p>
            <p class="stat-label">Open Rate</p>
          </div>
          <div class="stat-cell">
            <p class="stat-value">${avgClickRate}%</p>
            <p class="stat-label">Click Rate</p>
          </div>
        </div>
      </div>

      ${pattern ? `
      <div class="section">
        <h2 class="section-title">📈 Your Engagement Patterns</h2>
        <div class="pattern-box">
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div class="pattern-item" style="display: table-cell; width: 33%;">
                <div class="pattern-label">Best Time</div>
                <div class="pattern-value">${pattern.best_hour !== null ? formatHour(pattern.best_hour) : 'N/A'}</div>
              </div>
              <div class="pattern-item" style="display: table-cell; width: 33%;">
                <div class="pattern-label">Best Day</div>
                <div class="pattern-value">${pattern.best_day || 'N/A'}</div>
              </div>
              <div class="pattern-item" style="display: table-cell; width: 33%;">
                <div class="pattern-label">Preferred</div>
                <div class="pattern-value">${capitalizeFirst(pattern.preferred_channel || 'N/A')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      ${analytics && analytics.length > 0 ? `
      <div class="section">
        <h2 class="section-title">📋 Performance by Type</h2>
        ${analytics.map(a => {
          const openRate = parseFloat(a.open_rate) || 0;
          const rateClass = openRate >= 50 ? 'rate-good' : openRate >= 30 ? 'rate-medium' : 'rate-low';
          return `
          <div class="type-row">
            <div>
              <div class="type-name">${a.notification_type.replace(/_/g, ' ')}</div>
              <div class="type-stats">${a.total_sent || 0} sent · ${a.total_opened || 0} opened</div>
            </div>
            <span class="rate-badge ${rateClass}">${openRate.toFixed(0)}% open</span>
          </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      ${recommendations && recommendations.length > 0 ? `
      <div class="section">
        <h2 class="section-title">💡 Personalized Recommendations</h2>
        <div class="recommendations">
          ${recommendations.map(rec => `
          <div class="recommendation-item">
            <span class="recommendation-icon">→</span>${rec}
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 40px 0;">
        <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.app')}/notification-scheduling" class="cta-button">
          View Full Analytics Dashboard
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p>You're receiving this email because you opted in for weekly notification reports.</p>
      <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.app')}/notification-preferences">Manage your notification preferences</a></p>
      <p style="margin-top: 20px; color: #999;">© ${new Date().getFullYear()} Career Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}