// HTML Email Templates
const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .content { padding: 40px 48px; }
  h1 { color: #1f2937; font-size: 28px; font-weight: bold; margin: 0 0 24px 0; }
  p { color: #374151; font-size: 16px; line-height: 24px; margin: 16px 0; }
  .button { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 24px 0; }
  .info-box { background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .info-label { color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 8px 0 4px 0; }
  .info-value { color: #1f2937; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; }
  .tips-box { background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .tip-item { color: #374151; font-size: 14px; line-height: 24px; margin: 8px 0; }
  .footer { color: #6b7280; font-size: 12px; padding: 0 48px 24px 48px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 32px 48px; }
`;

export function getWelcomeEmailHTML(userName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Welcome to CareerSync! 🚀</h1>
      <p>Hi ${userName},</p>
      <p>We're thrilled to have you join our platform! You're now part of a community dedicated to helping professionals like you find their dream careers.</p>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🎯 Next Steps to Get Started:</p>
        <p class="tip-item">✓ Complete your profile to unlock AI job matching</p>
        <p class="tip-item">✓ Upload your resume for personalized insights</p>
        <p class="tip-item">✓ Set your job preferences and target roles</p>
        <p class="tip-item">✓ Explore AI-powered career coaching</p>
      </div>
      
      <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
    </div>
    <div class="footer">
      <p>Questions? Reply to this email or visit our help center.</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getApplicationSubmittedHTML(
  userName: string,
  jobTitle: string,
  company: string,
  applicationUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Application Submitted ✅</h1>
      <p>Hi ${userName},</p>
      <p>Great news! Your application has been successfully submitted.</p>
      
      <div class="info-box">
        <p class="info-label">Position:</p>
        <p class="info-value">${jobTitle}</p>
        <p class="info-label">Company:</p>
        <p class="info-value">${company}</p>
      </div>
      
      <p>We'll keep you updated on the status of your application. In the meantime:</p>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Next Steps:</p>
        <p class="tip-item">• Research the company culture and recent news</p>
        <p class="tip-item">• Prepare for potential interview questions</p>
        <p class="tip-item">• Set a reminder to follow up in 7-10 days</p>
      </div>
      
      <a href="${applicationUrl}" class="button">View Application Details</a>
    </div>
    <div class="footer">
      <p>Good luck! We're rooting for you 🚀</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getInterviewScheduledHTML(
  userName: string,
  jobTitle: string,
  company: string,
  interviewDate: string,
  interviewTime: string,
  interviewType: string,
  location: string | undefined,
  interviewUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Interview Scheduled 📅</h1>
      <p>Hi ${userName},</p>
      <p>Congratulations! Your interview has been scheduled with ${company}.</p>
      
      <div class="warning-box">
        <p class="info-label">Position:</p>
        <p class="info-value">${jobTitle}</p>
        <p class="info-label">Company:</p>
        <p class="info-value">${company}</p>
        <p class="info-label">Date & Time:</p>
        <p class="info-value">${interviewDate} at ${interviewTime}</p>
        <p class="info-label">Interview Type:</p>
        <p class="info-value">${interviewType}</p>
        ${location ? `<p class="info-label">Location:</p><p class="info-value">${location}</p>` : ''}
      </div>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🎯 Interview Preparation Tips:</p>
        <p class="tip-item">✓ Research the company and role thoroughly</p>
        <p class="tip-item">✓ Prepare answers to common interview questions</p>
        <p class="tip-item">✓ Review your resume and relevant experiences</p>
        <p class="tip-item">✓ Prepare questions to ask the interviewer</p>
        <p class="tip-item">✓ Test your tech setup (for virtual interviews)</p>
        <p class="tip-item">✓ Plan your outfit and arrive 10 minutes early</p>
      </div>
      
      <a href="${interviewUrl}" class="button">View Interview Details</a>
      
      <p style="text-align: center; color: #6b7280; font-size: 14px; font-style: italic; margin-top: 24px;">
        📧 You'll receive a reminder 24 hours before your interview.
      </p>
    </div>
    <div class="footer">
      <p>You've got this! Best of luck 🌟</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getJobMatchAlertHTML(
  userName: string,
  matchCount: number,
  topMatches: Array<{ title: string; company: string; location: string; matchScore: number }>,
  dashboardUrl: string
): string {
  const matchesHTML = topMatches.map(match => `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <p style="color: #1f2937; font-size: 16px; font-weight: bold; margin: 0 0 4px 0;">${match.title}</p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 4px 0;">${match.company}</p>
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">📍 ${match.location}</p>
      <p style="color: #059669; font-size: 14px; font-weight: bold; margin: 8px 0 0 0;">
        Match Score: <span style="background-color: #d1fae5; padding: 2px 8px; border-radius: 4px;">${match.matchScore}%</span>
      </p>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>New Job Matches! 🎯</h1>
      <p>Hi ${userName},</p>
      <p>Great news! Our AI has found <strong>${matchCount} new job opportunities</strong> that match your profile and preferences.</p>
      
      <div style="margin: 24px 0;">
        <p style="font-weight: bold; font-size: 18px; margin: 0 0 16px 0;">🌟 Top Matches:</p>
        ${matchesHTML}
      </div>
      
      <p>These positions align with your skills, experience, and career goals. Don't wait – the best opportunities go fast!</p>
      
      <a href="${dashboardUrl}" class="button">View All Matches</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Pro Tips:</p>
        <p class="tip-item">• Apply within the first 48 hours for better visibility</p>
        <p class="tip-item">• Customize your resume for each application</p>
        <p class="tip-item">• Use our AI cover letter generator</p>
      </div>
    </div>
    <div class="footer">
      <p>Want fewer/more alerts? Update your <a href="${dashboardUrl}" style="color: #2563eb; text-decoration: underline;">notification preferences</a></p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getMentorshipRequestHTML(
  mentorName: string,
  menteeName: string,
  message: string,
  requestUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>New Mentorship Request 🤝</h1>
      <p>Hi ${mentorName},</p>
      <p>You have a new mentorship request from <strong>${menteeName}</strong>.</p>
      
      <div class="info-box">
        <p class="info-label">Message from ${menteeName}:</p>
        <p style="color: #374151; font-size: 15px; line-height: 22px; margin: 12px 0; font-style: italic;">
          "${message}"
        </p>
      </div>
      
      <p>This is a great opportunity to share your expertise and help someone grow in their career!</p>
      
      <a href="${requestUrl}" class="button">View Request & Respond</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Mentorship Tips:</p>
        <p class="tip-item">• Review their profile before responding</p>
        <p class="tip-item">• Set clear expectations for sessions</p>
        <p class="tip-item">• Suggest a time that works for both of you</p>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for giving back to the community! 🌟</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getMentorshipResponseHTML(
  menteeName: string,
  mentorName: string,
  status: string,
  responseMessage: string | undefined,
  requestUrl: string
): string {
  const isAccepted = status === 'accepted';
  const title = isAccepted ? 'Mentorship Request Accepted! 🎉' : 'Mentorship Request Update';
  const icon = isAccepted ? '✅' : 'ℹ️';
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>${title}</h1>
      <p>Hi ${menteeName},</p>
      <p><strong>${mentorName}</strong> has ${status} your mentorship request.</p>
      
      ${responseMessage ? `
      <div class="info-box">
        <p class="info-label">Message from ${mentorName}:</p>
        <p style="color: #374151; font-size: 15px; line-height: 22px; margin: 12px 0; font-style: italic;">
          "${responseMessage}"
        </p>
      </div>
      ` : ''}
      
      ${isAccepted ? `
      <p>Great news! You can now schedule your first session together.</p>
      
      <a href="${requestUrl}" class="button">Schedule First Session</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🎯 Make the Most of Your Mentorship:</p>
        <p class="tip-item">• Come prepared with specific questions and goals</p>
        <p class="tip-item">• Be open to feedback and suggestions</p>
        <p class="tip-item">• Follow up on action items between sessions</p>
        <p class="tip-item">• Show appreciation for your mentor's time</p>
      </div>
      ` : `
      <p>Don't be discouraged! There are many other mentors who might be a better fit for your needs.</p>
      <a href="${requestUrl}" class="button">Browse Other Mentors</a>
      `}
    </div>
    <div class="footer">
      <p>${isAccepted ? 'Exciting times ahead! 🚀' : 'Keep going - the right mentor is out there!'}</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getSessionScheduledHTML(
  userName: string,
  otherPartyName: string,
  scheduledDate: string,
  scheduledTime: string,
  meetingLink: string | undefined,
  sessionUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Mentorship Session Scheduled 📅</h1>
      <p>Hi ${userName},</p>
      <p>Your mentorship session with <strong>${otherPartyName}</strong> has been scheduled!</p>
      
      <div class="warning-box">
        <p class="info-label">Session Date:</p>
        <p class="info-value">${scheduledDate}</p>
        <p class="info-label">Session Time:</p>
        <p class="info-value">${scheduledTime}</p>
        ${meetingLink ? `
        <p class="info-label">Meeting Link:</p>
        <p class="info-value"><a href="${meetingLink}" style="color: #2563eb; text-decoration: underline;">${meetingLink}</a></p>
        ` : ''}
      </div>
      
      <p>Make sure to add this to your calendar and prepare any topics you'd like to discuss.</p>
      
      <a href="${sessionUrl}" class="button">View Session Details</a>
      
      <p style="text-align: center; color: #6b7280; font-size: 14px; font-style: italic; margin-top: 24px;">
        📧 You'll receive a reminder 1 hour before the session.
      </p>
    </div>
    <div class="footer">
      <p>Looking forward to a productive session! 💪</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getSessionReminderHTML(
  userName: string,
  otherPartyName: string,
  scheduledDate: string,
  scheduledTime: string,
  meetingLink: string | undefined,
  sessionUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Session Reminder ⏰</h1>
      <p>Hi ${userName},</p>
      <p><strong>Reminder:</strong> Your mentorship session with <strong>${otherPartyName}</strong> is coming up soon!</p>
      
      <div class="warning-box">
        <p class="info-label">Session Time:</p>
        <p class="info-value">${scheduledDate} at ${scheduledTime}</p>
        ${meetingLink ? `
        <p class="info-label">Join Meeting:</p>
        <p class="info-value"><a href="${meetingLink}" style="color: #2563eb; text-decoration: underline; font-size: 18px; font-weight: bold;">Click here to join</a></p>
        ` : ''}
      </div>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">✅ Quick Checklist:</p>
        <p class="tip-item">• Test your audio and video setup</p>
        <p class="tip-item">• Have your questions/topics ready</p>
        <p class="tip-item">• Find a quiet space for the call</p>
        <p class="tip-item">• Have a notepad ready for key takeaways</p>
      </div>
      
      ${meetingLink ? `
      <a href="${meetingLink}" class="button">Join Meeting Now</a>
      ` : `
      <a href="${sessionUrl}" class="button">View Session Details</a>
      `}
    </div>
    <div class="footer">
      <p>See you soon! 👋</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getFeedbackRequestHTML(
  userName: string,
  otherPartyName: string,
  sessionDate: string,
  feedbackUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>How Was Your Session? ⭐</h1>
      <p>Hi ${userName},</p>
      <p>Thank you for completing your mentorship session with <strong>${otherPartyName}</strong> on ${sessionDate}!</p>
      
      <p>We'd love to hear about your experience. Your feedback helps us improve the mentorship experience for everyone.</p>
      
      <div class="info-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">Your feedback will help with:</p>
        <p class="tip-item">✓ Improving match quality</p>
        <p class="tip-item">✓ Recognizing outstanding mentors</p>
        <p class="tip-item">✓ Enhancing the platform for everyone</p>
      </div>
      
      <a href="${feedbackUrl}" class="button">Share Your Feedback</a>
      
      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 24px;">
        This will only take 2 minutes ⏱️
      </p>
    </div>
    <div class="footer">
      <p>Thank you for being part of our community! 🙏</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getResumeAnalysisHTML(
  userName: string,
  resumeScore: number,
  strengths: string[],
  improvements: string[],
  resumeUrl: string
): string {
  const strengthsHTML = strengths.map(s => `<p class="tip-item">✓ ${s}</p>`).join('');
  const improvementsHTML = improvements.map(i => `<p class="tip-item">⚠️ ${i}</p>`).join('');
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Resume Analysis Complete! 📊</h1>
      <p>Hi ${userName},</p>
      <p>Great news! We've completed the AI analysis of your resume.</p>
      
      <div class="warning-box" style="text-align: center;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">Your Resume Score</p>
        <p style="color: #1f2937; font-size: 48px; font-weight: bold; margin: 12px 0;">
          ${resumeScore}<span style="font-size: 24px; color: #6b7280;">/100</span>
        </p>
      </div>
      
      ${strengths.length > 0 ? `
      <div class="info-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💪 Key Strengths:</p>
        ${strengthsHTML}
      </div>
      ` : ''}
      
      ${improvements.length > 0 ? `
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🎯 Areas for Improvement:</p>
        ${improvementsHTML}
      </div>
      ` : ''}
      
      <a href="${resumeUrl}" class="button">View Detailed Analysis</a>
      
      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 24px;">
        💡 Tip: Higher scores lead to better job matches!
      </p>
    </div>
    <div class="footer">
      <p>Keep refining to stand out from the competition! 🚀</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getAchievementHTML(
  userName: string,
  achievementName: string,
  achievementType: string,
  achievementDescription: string,
  dashboardUrl: string
): string {
  const iconMap: Record<string, string> = {
    'profile_created': '🎉',
    'quarter_complete': '⭐',
    'half_complete': '🌟',
    'three_quarter_complete': '✨',
    'fully_complete': '🏆',
    'first_application': '📝',
    'first_interview': '🎯',
    'learning_streak': '🔥',
  };
  const icon = iconMap[achievementType] || '🎖️';
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 72px; margin: 20px 0;">${icon}</div>
        <h1 style="margin: 0;">Achievement Unlocked!</h1>
      </div>
      
      <p>Hi ${userName},</p>
      <p>Congratulations! You've earned a new achievement:</p>
      
      <div class="warning-box" style="text-align: center;">
        <p style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 12px 0;">
          ${achievementName}
        </p>
        <p style="color: #6b7280; font-size: 16px; margin: 8px 0;">
          ${achievementDescription}
        </p>
      </div>
      
      <p style="text-align: center;">Keep up the momentum! Every step brings you closer to your career goals.</p>
      
      <a href="${dashboardUrl}" class="button">View All Achievements</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🎯 What's Next:</p>
        <p class="tip-item">• Complete your profile to 100%</p>
        <p class="tip-item">• Apply to at least 5 jobs this week</p>
        <p class="tip-item">• Upload an optimized resume</p>
        <p class="tip-item">• Connect with a mentor</p>
      </div>
    </div>
    <div class="footer">
      <p>You're doing amazing! Keep it up! 💪</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getLearningStreakHTML(
  userName: string,
  streakDays: number,
  longestStreak: number,
  dashboardUrl: string
): string {
  let milestone = '';
  let encouragement = '';
  
  if (streakDays === 7) {
    milestone = '1 Week Streak!';
    encouragement = 'You\'ve completed a full week of learning! That\'s dedication! 🎉';
  } else if (streakDays === 30) {
    milestone = '1 Month Streak!';
    encouragement = 'A full month of consistent learning! You\'re unstoppable! 🚀';
  } else if (streakDays === 90) {
    milestone = '3 Month Streak!';
    encouragement = 'Three months of dedication! You\'re in the top 5% of learners! 🌟';
  } else if (streakDays === 365) {
    milestone = '1 Year Streak!';
    encouragement = 'A FULL YEAR! You\'re a learning legend! 🏆👑';
  } else {
    milestone = `${streakDays} Day Streak!`;
    encouragement = 'Your consistency is paying off! Keep learning every day! 💪';
  }
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 72px; margin: 20px 0;">🔥</div>
        <h1 style="margin: 0;">Learning Streak Milestone!</h1>
      </div>
      
      <p>Hi ${userName},</p>
      <p>${encouragement}</p>
      
      <div class="warning-box" style="text-align: center;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">Current Streak</p>
        <p style="color: #f59e0b; font-size: 56px; font-weight: bold; margin: 12px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">
          ${streakDays} 🔥
        </p>
        <p style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 8px 0;">
          ${milestone}
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">
          Longest Streak: ${longestStreak} days
        </p>
      </div>
      
      <p style="text-align: center; font-weight: bold; color: #1f2937;">
        Don't break the chain! Keep learning today to maintain your streak.
      </p>
      
      <a href="${dashboardUrl}" class="button">Continue Learning</a>
      
      <div class="info-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Streak Benefits:</p>
        <p class="tip-item">✓ Higher profile visibility to recruiters</p>
        <p class="tip-item">✓ Priority job match recommendations</p>
        <p class="tip-item">✓ Exclusive learning content unlocked</p>
        <p class="tip-item">✓ Community recognition and badges</p>
      </div>
    </div>
    <div class="footer">
      <p>Consistency is the key to success! 🌟</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getGoalProgressHTML(
  userName: string,
  goalTitle: string,
  progressPercentage: number,
  milestoneName: string,
  goalUrl: string
): string {
  const progressBar = `
    <div style="background-color: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 16px 0;">
      <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: ${progressPercentage}%; transition: width 0.3s ease;"></div>
    </div>
  `;
  
  let encouragement = '';
  if (progressPercentage === 25) {
    encouragement = 'You\'re 25% there! Great start on your journey! 🌱';
  } else if (progressPercentage === 50) {
    encouragement = 'Halfway there! You\'re making excellent progress! 🎯';
  } else if (progressPercentage === 75) {
    encouragement = 'You\'re so close! Just 25% to go! 💪';
  } else if (progressPercentage === 100) {
    encouragement = '🎉 GOAL COMPLETE! Time to celebrate your achievement! 🏆';
  }
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Goal Progress Update! 🎯</h1>
      <p>Hi ${userName},</p>
      <p>${encouragement}</p>
      
      <div class="info-box">
        <p class="info-label">Your Goal:</p>
        <p class="info-value">${goalTitle}</p>
        <p class="info-label">Milestone Reached:</p>
        <p style="color: #10b981; font-size: 18px; font-weight: bold; margin: 8px 0;">
          ${milestoneName}
        </p>
        ${progressBar}
        <p style="text-align: center; color: #6b7280; font-size: 16px; font-weight: bold; margin: 8px 0;">
          ${progressPercentage}% Complete
        </p>
      </div>
      
      ${progressPercentage < 100 ? `
      <p>Keep pushing forward! Every action brings you closer to achieving this goal.</p>
      
      <a href="${goalUrl}" class="button">View Goal Details</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Stay on Track:</p>
        <p class="tip-item">• Break down remaining tasks into smaller steps</p>
        <p class="tip-item">• Set a daily reminder to work on this goal</p>
        <p class="tip-item">• Share your progress with your mentor</p>
        <p class="tip-item">• Celebrate small wins along the way</p>
      </div>
      ` : `
      <p style="text-align: center; font-size: 18px; font-weight: bold; color: #059669;">
        🏆 Congratulations on achieving your goal! 🏆
      </p>
      
      <a href="${goalUrl}" class="button">Set Your Next Goal</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🎉 What's Next:</p>
        <p class="tip-item">• Reflect on what you learned</p>
        <p class="tip-item">• Share your success story with the community</p>
        <p class="tip-item">• Set an even more ambitious goal</p>
        <p class="tip-item">• Help others working toward similar goals</p>
      </div>
      `}
    </div>
    <div class="footer">
      <p>${progressPercentage === 100 ? 'You did it! Amazing work! 🌟' : 'You\'re making great progress! 💪'}</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getWeeklyDigestHTML(
  userName: string,
  weekStats: {
    newJobMatches: number;
    applicationsSubmitted: number;
    upcomingInterviews: Array<{ company: string; date: string }>;
    learningMinutes: number;
    achievementsEarned: number;
    upcomingSessions: Array<{ mentorName: string; date: string }>;
  },
  dashboardUrl: string
): string {
  const interviewsHTML = weekStats.upcomingInterviews.map(i => `
    <p class="tip-item">📅 ${i.company} - ${i.date}</p>
  `).join('');
  
  const sessionsHTML = weekStats.upcomingSessions.map(s => `
    <p class="tip-item">👥 ${s.mentorName} - ${s.date}</p>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Your Weekly Summary 📊</h1>
      <p>Hi ${userName},</p>
      <p>Here's what happened in your career journey this week:</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">New Job Matches</p>
          <p style="color: #10b981; font-size: 36px; font-weight: bold; margin: 8px 0;">${weekStats.newJobMatches}</p>
        </div>
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">Applications</p>
          <p style="color: #3b82f6; font-size: 36px; font-weight: bold; margin: 8px 0;">${weekStats.applicationsSubmitted}</p>
        </div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">Learning Time</p>
          <p style="color: #f59e0b; font-size: 36px; font-weight: bold; margin: 8px 0;">${weekStats.learningMinutes}<span style="font-size: 14px;">min</span></p>
        </div>
        <div style="background-color: #fae8ff; border-left: 4px solid #a855f7; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">Achievements</p>
          <p style="color: #a855f7; font-size: 36px; font-weight: bold; margin: 8px 0;">${weekStats.achievementsEarned}</p>
        </div>
      </div>
      
      ${weekStats.upcomingInterviews.length > 0 ? `
      <div class="warning-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">📅 Upcoming Interviews:</p>
        ${interviewsHTML}
      </div>
      ` : ''}
      
      ${weekStats.upcomingSessions.length > 0 ? `
      <div class="info-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">👥 Upcoming Mentorship Sessions:</p>
        ${sessionsHTML}
      </div>
      ` : ''}
      
      <a href="${dashboardUrl}" class="button">View Full Dashboard</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🎯 This Week's Focus:</p>
        <p class="tip-item">• Apply to at least 5 jobs</p>
        <p class="tip-item">• Complete one learning module</p>
        <p class="tip-item">• Update your profile with new skills</p>
        <p class="tip-item">• Connect with one new professional</p>
      </div>
    </div>
    <div class="footer">
      <p>Keep up the momentum! 🚀</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getInterviewReminderHTML(
  userName: string,
  jobTitle: string,
  company: string,
  interviewDate: string,
  interviewTime: string,
  interviewType: string,
  location: string | undefined,
  meetingLink: string | undefined,
  interviewUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Interview Tomorrow! ⏰</h1>
      <p>Hi ${userName},</p>
      <p><strong>Reminder:</strong> Your interview with <strong>${company}</strong> is scheduled for tomorrow!</p>
      
      <div class="warning-box">
        <p class="info-label">Position:</p>
        <p class="info-value">${jobTitle}</p>
        <p class="info-label">Company:</p>
        <p class="info-value">${company}</p>
        <p class="info-label">When:</p>
        <p class="info-value">${interviewDate} at ${interviewTime}</p>
        <p class="info-label">Type:</p>
        <p class="info-value">${interviewType}</p>
        ${location ? `<p class="info-label">Location:</p><p class="info-value">${location}</p>` : ''}
        ${meetingLink ? `<p class="info-label">Meeting Link:</p><p class="info-value"><a href="${meetingLink}" style="color: #2563eb; text-decoration: underline;">${meetingLink}</a></p>` : ''}
      </div>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">✅ Final Preparation Checklist:</p>
        <p class="tip-item">✓ Review your resume and the job description</p>
        <p class="tip-item">✓ Research the company's recent news and culture</p>
        <p class="tip-item">✓ Prepare 3-5 questions to ask the interviewer</p>
        <p class="tip-item">✓ Practice your STAR method answers</p>
        <p class="tip-item">✓ Test your tech setup (camera, mic, internet)</p>
        <p class="tip-item">✓ Plan your outfit and background</p>
        <p class="tip-item">✓ Get a good night's sleep tonight</p>
      </div>
      
      <a href="${interviewUrl}" class="button">View Interview Details</a>
      
      <div class="info-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Last-Minute Tips:</p>
        <p class="tip-item">• Arrive 10 minutes early (or log in 5 min early for virtual)</p>
        <p class="tip-item">• Have a notepad ready to jot down key points</p>
        <p class="tip-item">• Remember to smile and make eye contact</p>
        <p class="tip-item">• Send a thank-you email within 24 hours</p>
      </div>
    </div>
    <div class="footer">
      <p>You've got this! Believe in yourself! 🌟💪</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getApplicationDeadlineHTML(
  userName: string,
  applications: Array<{ company: string; jobTitle: string; daysSinceApplied: number }>,
  dashboardUrl: string
): string {
  const appsHTML = applications.map(app => `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <p style="color: #1f2937; font-size: 15px; font-weight: bold; margin: 0 0 4px 0;">${app.jobTitle}</p>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">${app.company}</p>
      <p style="color: #f59e0b; font-size: 13px; font-weight: bold; margin: 8px 0 0 0;">Applied ${app.daysSinceApplied} days ago</p>
    </div>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Time to Follow Up! 📧</h1>
      <p>Hi ${userName},</p>
      <p>You applied to these positions over a week ago. Following up can significantly increase your chances of getting an interview!</p>
      
      <div style="margin: 24px 0;">
        ${appsHTML}
      </div>
      
      <p>Research shows that following up within 7-10 days of applying can increase response rates by up to 30%.</p>
      
      <a href="${dashboardUrl}" class="button">Generate Follow-Up Emails</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">📝 Follow-Up Best Practices:</p>
        <p class="tip-item">• Keep it brief and professional (3-4 sentences)</p>
        <p class="tip-item">• Reaffirm your interest in the role</p>
        <p class="tip-item">• Mention a specific skill or achievement</p>
        <p class="tip-item">• Ask about the hiring timeline</p>
        <p class="tip-item">• Send between 10am-2pm on Tuesday-Thursday</p>
      </div>
      
      <div class="info-box">
        <p style="font-weight: bold; margin: 0 0 8px 0;">💡 Quick Tip:</p>
        <p style="color: #374151; font-size: 14px; margin: 0;">
          Use our AI follow-up email generator to create personalized messages in seconds!
        </p>
      </div>
    </div>
    <div class="footer">
      <p>Persistence pays off! Keep pushing forward! 💪</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getABTestResultsHTML(
  userName: string,
  testName: string,
  winningVersion: string,
  results: {
    versionA: { opens: number; clicks: number; interviews: number };
    versionB: { opens: number; clicks: number; interviews: number };
  },
  dashboardUrl: string
): string {
  const winner = winningVersion === 'A' ? results.versionA : results.versionB;
  const loser = winningVersion === 'A' ? results.versionB : results.versionA;
  const improvement = Math.round(((winner.interviews - loser.interviews) / loser.interviews) * 100);
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>A/B Test Results Are In! 📊</h1>
      <p>Hi ${userName},</p>
      <p>Your resume A/B test "<strong>${testName}</strong>" has collected enough data. Here are the results:</p>
      
      <div class="info-box" style="text-align: center;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">Winning Version</p>
        <p style="color: #10b981; font-size: 48px; font-weight: bold; margin: 12px 0;">
          Version ${winningVersion} 🏆
        </p>
        <p style="color: #059669; font-size: 18px; font-weight: bold; margin: 0;">
          ${improvement > 0 ? `${improvement}% more interviews` : 'Best performer'}
        </p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
        <div style="background-color: ${winningVersion === 'A' ? '#f0fdf4' : '#f9fafb'}; border: ${winningVersion === 'A' ? '2px solid #10b981' : '1px solid #e5e7eb'}; border-radius: 8px; padding: 16px;">
          <p style="font-weight: bold; font-size: 16px; margin: 0 0 12px 0; text-align: center;">Version A ${winningVersion === 'A' ? '🏆' : ''}</p>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">Opens: <strong>${results.versionA.opens}</strong></p>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">Clicks: <strong>${results.versionA.clicks}</strong></p>
          <p style="color: #10b981; font-size: 15px; font-weight: bold; margin: 4px 0;">Interviews: <strong>${results.versionA.interviews}</strong></p>
        </div>
        <div style="background-color: ${winningVersion === 'B' ? '#f0fdf4' : '#f9fafb'}; border: ${winningVersion === 'B' ? '2px solid #10b981' : '1px solid #e5e7eb'}; border-radius: 8px; padding: 16px;">
          <p style="font-weight: bold; font-size: 16px; margin: 0 0 12px 0; text-align: center;">Version B ${winningVersion === 'B' ? '🏆' : ''}</p>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">Opens: <strong>${results.versionB.opens}</strong></p>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">Clicks: <strong>${results.versionB.clicks}</strong></p>
          <p style="color: #10b981; font-size: 15px; font-weight: bold; margin: 4px 0;">Interviews: <strong>${results.versionB.interviews}</strong></p>
        </div>
      </div>
      
      <p>We recommend using Version ${winningVersion} for all your future applications.</p>
      
      <a href="${dashboardUrl}" class="button">View Detailed Analysis</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Key Takeaways:</p>
        <p class="tip-item">• The winning version had better keyword optimization</p>
        <p class="tip-item">• Format and readability made a significant difference</p>
        <p class="tip-item">• Continue testing different approaches</p>
        <p class="tip-item">• Small changes can lead to big improvements</p>
      </div>
    </div>
    <div class="footer">
      <p>Data-driven decisions lead to better results! 📈</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getAgencyJobPostedHTML(
  userName: string,
  jobTitle: string,
  agencyName: string,
  company: string,
  location: string,
  postedDate: string,
  jobUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Job Posted on Your Behalf 📋</h1>
      <p>Hi ${userName},</p>
      <p><strong>${agencyName}</strong> has posted a new job on behalf of your organization.</p>
      
      <div class="info-box">
        <p class="info-label">Position:</p>
        <p class="info-value">${jobTitle}</p>
        <p class="info-label">Company:</p>
        <p class="info-value">${company}</p>
        <p class="info-label">Location:</p>
        <p class="info-value">${location}</p>
        <p class="info-label">Posted On:</p>
        <p class="info-value">${postedDate}</p>
        <p class="info-label">Posted By:</p>
        <p class="info-value">${agencyName}</p>
      </div>
      
      <p>You can review the job details, monitor applications, and manage the posting through your dashboard.</p>
      
      <a href="${jobUrl}" class="button">View Job Posting</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 What You Can Do:</p>
        <p class="tip-item">• Review and edit job details if needed</p>
        <p class="tip-item">• Monitor incoming applications</p>
        <p class="tip-item">• Provide feedback to your agency partner</p>
        <p class="tip-item">• Track hiring progress</p>
      </div>
    </div>
    <div class="footer">
      <p>Questions about this posting? Contact ${agencyName} directly.</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getRelationshipApprovedHTML(
  userName: string,
  employerName: string,
  startDate: string,
  reviewedDate: string,
  relationshipUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Partnership Approved! 🎉</h1>
      <p>Hi ${userName},</p>
      <p>Great news! <strong>${employerName}</strong> has approved your agency partnership request.</p>
      
      <div class="info-box">
        <p class="info-label">Employer:</p>
        <p class="info-value">${employerName}</p>
        <p class="info-label">Partnership Start Date:</p>
        <p class="info-value">${startDate}</p>
        <p class="info-label">Approved On:</p>
        <p class="info-value">${reviewedDate}</p>
      </div>
      
      <p>You can now start posting jobs on behalf of ${employerName} and manage their hiring needs.</p>
      
      <a href="${relationshipUrl}" class="button">View Partnership Details</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🚀 Next Steps:</p>
        <p class="tip-item">• Review partnership terms and agreement</p>
        <p class="tip-item">• Schedule a kickoff call with the employer</p>
        <p class="tip-item">• Understand their hiring needs and preferences</p>
        <p class="tip-item">• Start posting jobs on their behalf</p>
        <p class="tip-item">• Maintain regular communication</p>
      </div>
    </div>
    <div class="footer">
      <p>Congratulations on the new partnership! 🤝</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getRelationshipDeclinedHTML(
  userName: string,
  employerName: string,
  reviewedDate: string,
  notes: string | undefined,
  relationshipUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>Partnership Request Update</h1>
      <p>Hi ${userName},</p>
      <p>We wanted to inform you that <strong>${employerName}</strong> has declined your agency partnership request.</p>
      
      <div class="warning-box">
        <p class="info-label">Employer:</p>
        <p class="info-value">${employerName}</p>
        <p class="info-label">Decision Date:</p>
        <p class="info-value">${reviewedDate}</p>
        ${notes ? `
        <p class="info-label">Notes from Employer:</p>
        <p style="color: #374151; font-size: 15px; line-height: 22px; margin: 12px 0; font-style: italic;">
          "${notes}"
        </p>
        ` : ''}
      </div>
      
      <p>Don't be discouraged! There are many other employers looking for agency partnerships. Keep building relationships and exploring opportunities.</p>
      
      <a href="${relationshipUrl}" class="button">Explore Other Opportunities</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">💡 Moving Forward:</p>
        <p class="tip-item">• Review your partnership proposal</p>
        <p class="tip-item">• Consider feedback for future requests</p>
        <p class="tip-item">• Connect with other employers</p>
        <p class="tip-item">• Focus on building your agency reputation</p>
      </div>
    </div>
    <div class="footer">
      <p>Keep going - the right partnerships are out there! 💪</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getBadgeAwardedHTML(
  recruiterName: string,
  badgeName: string,
  badgeType: string,
  description: string,
  awardedDate: string,
  leaderboardUrl: string
): string {
  const badgeIcon = badgeType === 'milestone' ? '🏆' : 
                    badgeType === 'achievement' ? '⭐' :
                    badgeType === 'quality' ? '💎' :
                    badgeType === 'revenue' ? '💰' : '🎖️';
  
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>New Badge Earned! ${badgeIcon}</h1>
      <p>Hi ${recruiterName},</p>
      <p>Congratulations! You've earned a new badge for your outstanding performance!</p>
      
      <div class="info-box" style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-left: none;">
        <p style="font-size: 64px; margin: 0 0 16px 0;">${badgeIcon}</p>
        <p style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">${badgeName}</p>
        <p style="color: #e0e7ff; font-size: 16px; margin: 0;">${description}</p>
        <p style="color: #c7d2fe; font-size: 14px; margin: 16px 0 0 0;">Awarded on ${awardedDate}</p>
      </div>
      
      <p>This badge recognizes your dedication and excellence as a recruiter. Your hard work is making a real difference!</p>
      
      <a href="${leaderboardUrl}" class="button">View Your Badges</a>
      
      <div class="tips-box">
        <p style="font-weight: bold; margin: 0 0 12px 0;">🚀 Keep Up The Momentum:</p>
        <p class="tip-item">• Share your achievement with your team</p>
        <p class="tip-item">• Check the leaderboard to see where you rank</p>
        <p class="tip-item">• View other badges you can earn</p>
        <p class="tip-item">• Continue delivering exceptional results</p>
      </div>
    </div>
    <div class="footer">
      <p>You're doing amazing work! Keep it up! 🌟</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}
