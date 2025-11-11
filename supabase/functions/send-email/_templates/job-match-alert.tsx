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

interface JobMatchAlertEmailProps {
  userName: string;
  matchCount: number;
  topMatches: Array<{
    title: string;
    company: string;
    location: string;
    matchScore: number;
  }>;
  dashboardUrl: string;
}

export const JobMatchAlertEmail = ({ 
  userName, 
  matchCount,
  topMatches,
  dashboardUrl 
}: JobMatchAlertEmailProps) => (
  <Html>
    <Head />
    <Preview>We found {matchCount} new job matches for you!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Job Matches! 🎯</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          Great news! Our AI has found <strong>{matchCount} new job opportunities</strong> that 
          match your profile and preferences.
        </Text>

        <Section style={matchesBox}>
          <Text style={matchesTitle}>🌟 Top Matches:</Text>
          
          {topMatches.map((match, index) => (
            <Section key={index} style={matchCard}>
              <Text style={matchTitle}>{match.title}</Text>
              <Text style={matchCompany}>{match.company}</Text>
              <Text style={matchLocation}>📍 {match.location}</Text>
              <Text style={matchScore}>
                Match Score: <span style={scoreHighlight}>{match.matchScore}%</span>
              </Text>
            </Section>
          ))}
        </Section>

        <Text style={text}>
          These positions align with your skills, experience, and career goals. 
          Don't wait – the best opportunities go fast!
        </Text>

        <Link href={dashboardUrl} style={button}>
          View All Matches
        </Link>

        <Section style={tipsBox}>
          <Text style={tipsTitle}>💡 Pro Tips:</Text>
          <Text style={tipItem}>• Apply within the first 48 hours for better visibility</Text>
          <Text style={tipItem}>• Customize your resume for each application</Text>
          <Text style={tipItem}>• Use our AI cover letter generator</Text>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Want fewer/more alerts? Update your <Link href={dashboardUrl} style={footerLink}>notification preferences</Link>
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

const matchesBox = {
  margin: '24px 48px',
}

const matchesTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const matchCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
}

const matchTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
}

const matchCompany = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 4px 0',
}

const matchLocation = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 8px 0',
}

const matchScore = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '8px 0 0 0',
}

const scoreHighlight = {
  backgroundColor: '#d1fae5',
  padding: '2px 8px',
  borderRadius: '4px',
}

const tipsBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  margin: '24px 48px',
  padding: '20px',
}

const tipsTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const tipItem = {
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

const footerLink = {
  color: '#2563eb',
  textDecoration: 'underline',
}
