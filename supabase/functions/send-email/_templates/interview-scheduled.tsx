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

interface InterviewScheduledEmailProps {
  userName: string;
  jobTitle: string;
  company: string;
  interviewDate: string;
  interviewTime: string;
  interviewType: string;
  location?: string;
  interviewUrl: string;
}

export const InterviewScheduledEmail = ({ 
  userName,
  jobTitle,
  company,
  interviewDate,
  interviewTime,
  interviewType,
  location,
  interviewUrl
}: InterviewScheduledEmailProps) => (
  <Html>
    <Head />
    <Preview>Your interview with {company} is scheduled for {interviewDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Interview Scheduled 📅</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          Congratulations! Your interview has been scheduled with {company}.
        </Text>

        <Section style={infoBox}>
          <Text style={infoLabel}>Position:</Text>
          <Text style={infoValue}>{jobTitle}</Text>
          
          <Text style={infoLabel}>Company:</Text>
          <Text style={infoValue}>{company}</Text>
          
          <Text style={infoLabel}>Date & Time:</Text>
          <Text style={infoValue}>{interviewDate} at {interviewTime}</Text>
          
          <Text style={infoLabel}>Interview Type:</Text>
          <Text style={infoValue}>{interviewType}</Text>
          
          {location && (
            <>
              <Text style={infoLabel}>Location:</Text>
              <Text style={infoValue}>{location}</Text>
            </>
          )}
        </Section>

        <Section style={prepBox}>
          <Text style={prepTitle}>🎯 Interview Preparation Tips:</Text>
          <Text style={prepItem}>✓ Research the company and role thoroughly</Text>
          <Text style={prepItem}>✓ Prepare answers to common interview questions</Text>
          <Text style={prepItem}>✓ Review your resume and relevant experiences</Text>
          <Text style={prepItem}>✓ Prepare questions to ask the interviewer</Text>
          <Text style={prepItem}>✓ Test your tech setup (for virtual interviews)</Text>
          <Text style={prepItem}>✓ Plan your outfit and arrive 10 minutes early</Text>
        </Section>

        <Link href={interviewUrl} style={button}>
          View Interview Details
        </Link>

        <Text style={reminderText}>
          📧 You'll receive a reminder 24 hours before your interview.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          You've got this! Best of luck 🌟
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

const infoBox = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  borderRadius: '8px',
  margin: '24px 48px',
  padding: '20px',
}

const infoLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '12px 0 4px 0',
}

const infoValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const prepBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  margin: '24px 48px',
  padding: '20px',
}

const prepTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const prepItem = {
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

const reminderText = {
  color: '#6b7280',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  textAlign: 'center' as const,
  padding: '0 48px',
  margin: '16px 0',
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
