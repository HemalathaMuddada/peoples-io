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

interface ApplicationSubmittedEmailProps {
  userName: string;
  jobTitle: string;
  company: string;
  applicationUrl: string;
}

export const ApplicationSubmittedEmail = ({ 
  userName, 
  jobTitle, 
  company,
  applicationUrl 
}: ApplicationSubmittedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your application to {company} has been submitted successfully</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Application Submitted ✅</Heading>
        
        <Text style={text}>Hi {userName},</Text>
        
        <Text style={text}>
          Great news! Your application has been successfully submitted.
        </Text>

        <Section style={infoBox}>
          <Text style={infoLabel}>Position:</Text>
          <Text style={infoValue}>{jobTitle}</Text>
          
          <Text style={infoLabel}>Company:</Text>
          <Text style={infoValue}>{company}</Text>
        </Section>

        <Text style={text}>
          We'll keep you updated on the status of your application. In the meantime:
        </Text>

        <Section style={tipsBox}>
          <Text style={tipsTitle}>💡 Next Steps:</Text>
          <Text style={tipItem}>• Research the company culture and recent news</Text>
          <Text style={tipItem}>• Prepare for potential interview questions</Text>
          <Text style={tipItem}>• Set a reminder to follow up in 7-10 days</Text>
        </Section>

        <Link href={applicationUrl} style={button}>
          View Application Details
        </Link>

        <Hr style={hr} />

        <Text style={footer}>
          Good luck! We're rooting for you 🚀
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
  backgroundColor: '#f0fdf4',
  borderLeft: '4px solid #10b981',
  borderRadius: '8px',
  margin: '24px 48px',
  padding: '20px',
}

const infoLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '8px 0 4px 0',
}

const infoValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const tipsBox = {
  backgroundColor: '#eff6ff',
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
