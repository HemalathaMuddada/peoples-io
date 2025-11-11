import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export const WelcomeEmail = ({ userName, dashboardUrl }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to your career journey! Start building your profile today.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to CareerSync! 🚀</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          We're thrilled to have you join our platform! You're now part of a community 
          dedicated to helping professionals like you find their dream careers.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightText}>
            🎯 Next Steps to Get Started:
          </Text>
          <Text style={listItem}>✓ Complete your profile to unlock AI job matching</Text>
          <Text style={listItem}>✓ Upload your resume for personalized insights</Text>
          <Text style={listItem}>✓ Set your job preferences and target roles</Text>
          <Text style={listItem}>✓ Explore AI-powered career coaching</Text>
        </Section>

        <Link href={dashboardUrl} style={button}>
          Go to Dashboard
        </Link>

        <Hr style={hr} />

        <Text style={footer}>
          Questions? Reply to this email or visit our help center.
        </Text>

        <Text style={footer}>
          © 2025 CareerSync. All rights reserved.
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 48px',
}

const highlightBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  margin: '24px 48px',
  padding: '20px',
}

const highlightText = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const listItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '24px 48px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 48px',
}

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
  marginTop: '8px',
}
