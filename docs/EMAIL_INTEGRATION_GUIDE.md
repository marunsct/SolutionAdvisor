# Email Integration Guide

## Overview

The SAP Clean Core Solution Advisor includes comprehensive email notification capabilities for critical events:

- **Analysis Completion**: Notifies users when their RICEFW analysis is complete
- **Threshold Exceeded**: Alerts when Technical Debt, Cloud Readiness, or Upgrade Impact scores exceed defined thresholds
- **Constraint Violations**: Warns about performance or compliance constraint violations
- **Session Expiry**: Reminds users about pending wizard sessions

## Architecture

### Components

1. **NotificationService** (`srv/lib/notification-service.js`)
   - Central orchestration service
   - Multi-channel support (email, in-app, push)
   - Template-based email generation
   - Automatic fallback to log-only mode if SMTP not configured

2. **Email Transport** (Nodemailer)
   - Production: External SMTP server (Gmail, SendGrid, Corporate)
   - Development: Log-only mode with detailed email preview
   - Template support with HTML and plain text

3. **Configuration** (`package.json` → `cds.requires.mail`)
   - Environment-based profiles (production, development)
   - SMTP settings via environment variables
   - Secure credential management

## Setup Instructions

### Step 1: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your SMTP credentials:

```env
# SMTP Server
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Authentication
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-specific-password

# Sender
SMTP_FROM="SAP Solution Advisor <no-reply@example.com>"
```

### Step 2: Provider-Specific Configuration

#### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Create App-Specific Password**:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail" on "Other (Custom name)"
   - Copy the 16-character password
3. **Configure .env**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop  # App-specific password
   SMTP_FROM="Solution Advisor <your-email@gmail.com>"
   ```

#### SendGrid Setup

1. **Create SendGrid Account** at https://sendgrid.com
2. **Generate API Key**:
   - Settings → API Keys → Create API Key
   - Select "Full Access" or "Mail Send" permissions
   - Copy the API key (starts with `SG.`)
3. **Configure .env**:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey  # Literal string "apikey"
   SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxx  # Your API key
   SMTP_FROM="Solution Advisor <verified-sender@yourdomain.com>"
   ```
   **Note**: Sender email must be verified in SendGrid dashboard

#### Office 365 / Outlook Setup

1. **Enable SMTP Authentication** in Office 365 admin center
2. **Configure .env**:
   ```env
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@yourcompany.com
   SMTP_PASS=your-password
   SMTP_FROM="Solution Advisor <your-email@yourcompany.com>"
   ```

#### Corporate SMTP Server

1. **Get SMTP details** from IT department:
   - Host (e.g., `mail.yourcompany.com`)
   - Port (25, 465 for SSL, 587 for TLS)
   - Authentication requirements
2. **Configure .env**:
   ```env
   SMTP_HOST=mail.yourcompany.com
   SMTP_PORT=587
   SMTP_SECURE=false  # true for port 465 (SSL)
   SMTP_USER=your-username
   SMTP_PASS=your-password
   SMTP_FROM="Solution Advisor <no-reply@yourcompany.com>"
   ```

### Step 3: Test Email Configuration

Run the notification service in development mode:

```bash
npm run start-local
```

Trigger a test notification:

```javascript
// Via CDS console or custom test script
const NotificationService = require('./srv/lib/notification-service');
const service = new NotificationService();

await service.notifyAnalysisComplete({
    analysisId: 'test-123',
    ricefwId: 'R-0001-TEST',
    recommendedLevel: 'Level B',
    projectName: 'Test Project',
    userEmail: 'your-test-email@example.com'
});
```

Check logs for email delivery confirmation or error messages.

## Email Templates

### Analysis Complete Email

**Subject**: Clean Core Analysis Complete for [RICEFW ID]

**Body**:
```
Dear User,

Your Clean Core analysis for RICEFW object [RICEFW ID] is now complete.

Project: [Project Name]
Recommended Level: [Level A/B/C/D]
Technical Debt Score: [0-100]
Cloud Readiness: [0-100%]
Upgrade Impact: [0-100]

View full results: [Link to Analysis Details]

Best regards,
SAP Clean Core Solution Advisor
```

### Threshold Exceeded Alert

**Subject**: ⚠️ Alert: Scoring Threshold Exceeded for [RICEFW ID]

**Body**:
```
Attention Required

Your analysis for [RICEFW ID] has exceeded critical thresholds:

Technical Debt: [85/100] (Threshold: 80)
Cloud Readiness: [45%] (Threshold: 50%)

Recommended Actions:
- Consider Level A alternatives (SaaS extensibility)
- Review performance constraints
- Consult real-world examples

View detailed recommendations: [Link]

Best regards,
SAP Clean Core Solution Advisor
```

### Constraint Violation Warning

**Subject**: 🚨 Constraint Violation Detected: [Constraint Name]

**Body**:
```
Warning: Constraint Violation

The following constraint was violated during your analysis:

Constraint: [Constraint Name]
Type: [Performance/Compliance/Deployment]
Impact: [High/Medium/Low]
Description: [Constraint description]

Affected RICEFW: [RICEFW ID]

Recommendation: [Mitigation steps]

View full constraint details: [Link]

Best regards,
SAP Clean Core Solution Advisor
```

### Session Expiry Reminder

**Subject**: ⏰ Reminder: Complete Your Pending Analysis

**Body**:
```
Pending Wizard Session

You have an incomplete Clean Core analysis that will expire in 24 hours:

RICEFW ID: [RICEFW ID]
Last Updated: [Timestamp]
Current Step: [Question 5 of 12]

Resume your analysis: [Link to Wizard]

Best regards,
SAP Clean Core Solution Advisor
```

## Production Deployment (SAP BTP)

### Cloud Foundry Environment Variables

Add SMTP configuration to `manifest.yml` (via credential store or user-provided service):

```yaml
applications:
  - name: solutionadvisor-srv
    env:
      SMTP_HOST: smtp.sendgrid.net
      SMTP_PORT: 587
      SMTP_SECURE: false
      SMTP_FROM: "Solution Advisor <no-reply@yourcompany.com>"
```

Store sensitive credentials in SAP BTP Credential Store:

```bash
cf cups solutionadvisor-smtp -p '{"user":"apikey","password":"SG.xxxx"}'
```

Bind service in `mta.yaml`:

```yaml
modules:
  - name: solutionadvisor-srv
    requires:
      - name: solutionadvisor-smtp
```

Access in code:

```javascript
const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
const smtpCredentials = vcapServices['user-provided'].find(s => s.name === 'solutionadvisor-smtp');
```

### Alternative: SAP Destination Service

For enterprise SMTP integration, use SAP Destination Service:

1. **Create Destination** in BTP Cockpit:
   - Name: `SMTP_DESTINATION`
   - Type: `Mail`
   - URL: `smtp://smtp.yourcompany.com:587`
   - Authentication: `BasicAuthentication`
   - User: `smtp-user`
   - Password: `smtp-password`

2. **Update notification-service.js**:
   ```javascript
   const { retrieveJwt } = require('@sap-cloud-sdk/core');
   const { MailClient } = require('@sap-cloud-sdk/mail-client');
   
   async _sendViaDestinationService(emailContent, userData) {
       const destination = { destinationName: 'SMTP_DESTINATION' };
       const mailClient = new MailClient(destination);
       
       await mailClient.sendMail({
           from: this.mailConfig.from,
           to: userData.email,
           subject: emailContent.subject,
           html: emailContent.htmlBody
       });
   }
   ```

## Monitoring & Troubleshooting

### Check Email Logs

Development mode logs all email content:

```
[cds] - NotificationService: Email sent (log-only mode)
[cds] - To: user@example.com
[cds] - Subject: Clean Core Analysis Complete
[cds] - Priority: normal
[cds] - HTML Body: <html>...</html>
```

Production mode logs delivery status:

```
[cds] - NotificationService: Email sent successfully to: user@example.com
[cds] - Message ID: <abc123@smtp.sendgrid.net>
```

### Common Issues

#### Issue: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Cause**: Incorrect credentials or app-specific password not used (Gmail)

**Solution**:
- For Gmail: Generate app-specific password (not regular password)
- For others: Verify username/password are correct
- Check SMTP_USER matches email format requirements

#### Issue: "Greeting never received"

**Cause**: Firewall blocking SMTP port or incorrect host

**Solution**:
- Test connectivity: `telnet smtp.gmail.com 587`
- Verify SMTP_HOST is correct
- Check corporate firewall allows outbound port 587/465

#### Issue: "self signed certificate in certificate chain"

**Cause**: Corporate SMTP uses self-signed SSL certificate

**Solution**:
Add to mailConfig in package.json:
```json
"tls": {
  "rejectUnauthorized": false
}
```

#### Issue: "No recipients defined"

**Cause**: User email not set in ProjectConfiguration

**Solution**:
Ensure all project creators have valid email in user profile

### Enable Debug Logging

Set environment variable:

```bash
DEBUG=nodemailer* npm run start-local
```

View detailed SMTP transaction logs:

```
nodemailer: Sending mail using SMTP/smtp.gmail.com:587
nodemailer: SMTP EHLO localhost
nodemailer: SMTP 250-smtp.gmail.com at your service
nodemailer: SMTP STARTTLS
...
```

## Security Best Practices

1. **Never Commit .env**: Already in .gitignore, but double-check before git push
2. **Use App-Specific Passwords**: Never use primary account passwords
3. **Rotate Credentials**: Change SMTP passwords every 90 days
4. **Restrict Sender**: Use no-reply address to prevent reply abuse
5. **Rate Limiting**: NotificationService includes built-in throttling (max 10 emails/minute per user)
6. **Audit Trail**: All sent emails logged in NotificationLog entity

## Feature Flags

Disable email notifications if needed:

**.env**:
```env
ENABLE_EMAIL_NOTIFICATIONS=false
```

**package.json** (cds.requires.mail):
```json
"enabled": "${env:ENABLE_EMAIL_NOTIFICATIONS}"
```

Notification service will fall back to in-app notifications only.

## Testing Checklist

- [ ] Environment variables set in .env
- [ ] SMTP connection successful (telnet test)
- [ ] Test email received with correct formatting
- [ ] HTML rendering works in email client
- [ ] Links in email navigate to correct pages
- [ ] Sender name displays correctly
- [ ] Attachments work (future: PDF reports)
- [ ] Production credentials stored in BTP Credential Store
- [ ] Rate limiting prevents spam (send 20 notifications rapidly)
- [ ] Graceful fallback to log-only mode if SMTP fails

## Roadmap

### Planned Enhancements

- **Email Attachments**: Include PDF analysis reports
- **HTML Templates**: Use professional email template library (MJML)
- **Batch Digest**: Daily summary email instead of per-event
- **Unsubscribe Link**: Allow users to opt-out per notification type
- **Internationalization**: Multi-language email templates (EN/DE/ES)
- **Rich Formatting**: Include inline flowchart images, scoring charts

---

**Last Updated**: 2025-01-XX  
**Maintainer**: Solution Advisor Development Team  
**Support**: For issues, check logs first, then contact BTP admin
