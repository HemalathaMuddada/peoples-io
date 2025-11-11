import * as React from 'react';

interface CompanyInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}

export const CompanyInvitationEmail: React.FC<CompanyInvitationEmailProps> = ({
  organizationName,
  inviterName,
  role,
  inviteLink,
  expiresAt,
}) => (
  <html>
    <head>
      <style>
        {`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 10px;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
          }
          .content {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
          }
          .invite-box {
            background-color: #f9fafb;
            border-left: 4px solid #6366f1;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .invite-detail {
            margin: 10px 0;
          }
          .invite-detail strong {
            color: #1a1a1a;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #6366f1;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
        `}
      </style>
    </head>
    <body>
      <div className="container">
        <div className="header">
          <div className="logo">🚀</div>
          <h1 className="title">You're Invited to Join {organizationName}</h1>
        </div>

        <div className="content">
          <p>Hello,</p>
          <p>
            <strong>{inviterName}</strong> has invited you to join <strong>{organizationName}</strong> on our platform.
          </p>

          <div className="invite-box">
            <div className="invite-detail">
              <strong>Organization:</strong> {organizationName}
            </div>
            <div className="invite-detail">
              <strong>Your Role:</strong> {role.replace('_', ' ').toUpperCase()}
            </div>
            <div className="invite-detail">
              <strong>Invited By:</strong> {inviterName}
            </div>
          </div>

          <p>Click the button below to accept this invitation and get started:</p>

          <div style={{ textAlign: 'center' }}>
            <a href={inviteLink} className="button">
              Accept Invitation
            </a>
          </div>

          <div className="warning">
            ⚠️ This invitation will expire on <strong>{expiresAt}</strong>. Please accept it before then.
          </div>

          <p>
            If you don't have an account yet, you'll be prompted to create one during the acceptance process.
          </p>
        </div>

        <div className="footer">
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          <p>© 2024 Career Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
);
