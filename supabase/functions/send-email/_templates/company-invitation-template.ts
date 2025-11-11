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
  .footer { color: #6b7280; font-size: 12px; padding: 0 48px 24px 48px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
`;

export function getCompanyInvitationHTML(
  organizationName: string,
  inviterName: string,
  role: string,
  inviteLink: string,
  expiresAt: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="content">
      <h1>You're Invited to Join ${organizationName}! 🚀</h1>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on our platform.</p>
      
      <div class="info-box">
        <p class="info-label">Organization:</p>
        <p class="info-value">${organizationName}</p>
        <p class="info-label">Your Role:</p>
        <p class="info-value">${role.replace('_', ' ').toUpperCase()}</p>
        <p class="info-label">Invited By:</p>
        <p class="info-value">${inviterName}</p>
      </div>
      
      <p>Click the button below to accept this invitation and get started:</p>
      
      <div style="text-align: center;">
        <a href="${inviteLink}" class="button">Accept Invitation</a>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0;">⚠️ This invitation will expire on <strong>${expiresAt}</strong>. Please accept it before then.</p>
      </div>
      
      <p>If you don't have an account yet, you'll be prompted to create one during the acceptance process.</p>
    </div>
    <div class="footer">
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <p>© 2025 CareerSync. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}
