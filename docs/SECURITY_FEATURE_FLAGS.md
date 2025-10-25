# Security Features Configuration Guide

## Overview

The SAP Clean Core Solution Advisor includes optional security features that can be enabled/disabled via environment variables. This allows the application to run in different environments without requiring BTP Credential Store or encryption infrastructure.

## Feature Flags

### 1. Field-Level Encryption

**Environment Variable:** `ENABLE_ENCRYPTION`

**Values:**
- `true` - Enable AES-256-GCM encryption for sensitive data
- `false` (default) - Disable encryption (data stored as plaintext)

**When to Enable:**
- Production environments handling PII (emails, phone numbers)
- Compliance requirements (GDPR, HIPAA, etc.)
- Multi-tenant SaaS deployments

**When to Disable:**
- Local development
- Testing environments
- Demo/POC deployments
- When encryption keys are not available

**Configuration:**

```env
# Enable encryption
ENABLE_ENCRYPTION=true
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ENCRYPTION_KEY_VERSION=v1
```

**Behavior When Disabled:**
- All `encrypt()` calls return plaintext (pass-through)
- All `decrypt()` calls return data as-is (pass-through)
- No encryption keys required
- Application functions normally without encryption overhead

---

### 2. BTP Credential Store

**Environment Variable:** `ENABLE_CREDENTIAL_STORE`

**Values:**
- `true` - Use SAP BTP Credential Store for credential management
- `false` (default) - Use environment variables for credentials

**When to Enable:**
- Production deployment on SAP BTP
- When centralized credential management is required
- For automatic credential rotation
- Compliance requirements for credential storage

**When to Disable:**
- Local development
- Non-BTP deployments (AWS, Azure, on-premise)
- Testing environments
- When BTP Credential Store service is not available

**Configuration:**

```env
# Disable Credential Store (use environment variables)
ENABLE_CREDENTIAL_STORE=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM="Solution Advisor <no-reply@example.com>"
```

**Behavior When Disabled:**
- All credentials read from environment variables
- `readCredential()` uses fallback environment variable parameter
- Write operations log warning (can't persist to env vars)
- Application functions normally using env var credentials

---

## Configuration Scenarios

### Scenario 1: Local Development (Default)

**Environment:** Local laptop, no BTP, no encryption

```env
# .env
ENABLE_ENCRYPTION=false
ENABLE_CREDENTIAL_STORE=false

# SMTP credentials (plain environment variables)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dev-user@example.com
SMTP_PASS=app-specific-password
SMTP_FROM="Dev Solution Advisor <noreply@localhost>"
```

**Result:**
- ✅ App starts without encryption keys
- ✅ App starts without BTP Credential Store
- ✅ Uses environment variables for all credentials
- ✅ No encryption overhead for development speed

---

### Scenario 2: Testing/Staging Environment

**Environment:** Cloud deployment, basic security, no encryption

```env
# .env
ENABLE_ENCRYPTION=false
ENABLE_CREDENTIAL_STORE=false

# SMTP credentials
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxx
SMTP_FROM="Staging Solution Advisor <staging@cleancore.test>"
```

**Result:**
- ✅ App runs without encryption (test data, no PII)
- ✅ Uses environment variables for credentials
- ✅ Easy credential management via platform secrets

---

### Scenario 3: Production on BTP (Full Security)

**Environment:** SAP BTP Cloud Foundry, full security enabled

```env
# .env (or manifest.yml)
ENABLE_ENCRYPTION=true
ENABLE_CREDENTIAL_STORE=true

# Encryption will use BTP Credential Store
# SMTP credentials will use BTP Credential Store
```

**BTP Setup:**

```bash
# Create Credential Store service
cf create-service credstore standard solutionadvisor-credstore

# Bind to application in mta.yaml
```

**mta.yaml:**
```yaml
resources:
  - name: solutionadvisor-credstore
    type: org.cloudfoundry.managed-service
    parameters:
      service: credstore
      service-plan: standard

modules:
  - name: solutionadvisor-srv
    requires:
      - name: solutionadvisor-credstore
    properties:
      ENABLE_ENCRYPTION: true
      ENABLE_CREDENTIAL_STORE: true
```

**Store Credentials via BTP Cockpit:**
- Navigate to Credential Store instance
- Add namespace: `encryption`
  - Key: `master-key`
  - Value: (64-char hex string)
- Add namespace: `smtp`
  - Key: `password`
  - Value: (SMTP password)
  - Key: `user`
  - Value: (SMTP username)

**Result:**
- ✅ Encryption enabled for sensitive data
- ✅ Credentials stored securely in BTP Credential Store
- ✅ Automatic credential rotation supported
- ✅ Full audit trail

---

### Scenario 4: Production on AWS/Azure (Encryption, No BTP)

**Environment:** AWS/Azure deployment, encryption enabled, no BTP Credential Store

```env
# Environment Variables (via AWS Secrets Manager or Azure Key Vault)
ENABLE_ENCRYPTION=true
ENABLE_CREDENTIAL_STORE=false

# Encryption key (stored in secrets manager)
ENCRYPTION_MASTER_KEY=abc123def456... (retrieve from secrets manager)
ENCRYPTION_KEY_VERSION=v1

# SMTP credentials (stored in secrets manager)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxx (retrieve from secrets manager)
SMTP_FROM="Solution Advisor <no-reply@yourcompany.com>"
```

**AWS Secrets Manager Integration Example:**

```javascript
// In srv/server.js or bootstrap script
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

async function loadSecrets() {
    const secret = await secretsManager.getSecretValue({ 
        SecretId: 'solutionadvisor/production' 
    }).promise();
    
    const secrets = JSON.parse(secret.SecretString);
    process.env.ENCRYPTION_MASTER_KEY = secrets.encryptionKey;
    process.env.SMTP_PASS = secrets.smtpPassword;
}

await loadSecrets();
// Then start app
```

**Result:**
- ✅ Encryption enabled using platform secrets manager
- ✅ Credentials managed by AWS/Azure native services
- ✅ No dependency on BTP Credential Store

---

## Migration Path

### From Development to Production

**Step 1: Development (No Security)**
```env
ENABLE_ENCRYPTION=false
ENABLE_CREDENTIAL_STORE=false
```

**Step 2: Staging (Add Encryption)**
```env
ENABLE_ENCRYPTION=true
ENABLE_CREDENTIAL_STORE=false
ENCRYPTION_MASTER_KEY=<generated-key>
```

**Step 3: Production on BTP (Full Security)**
```env
ENABLE_ENCRYPTION=true
ENABLE_CREDENTIAL_STORE=true
# Keys stored in BTP Credential Store
```

---

## Troubleshooting

### Issue: App fails to start with "Encryption key not found"

**Cause:** `ENABLE_ENCRYPTION=true` but no encryption key provided

**Solution:**
```bash
# Option 1: Disable encryption
export ENABLE_ENCRYPTION=false

# Option 2: Generate and set encryption key
export ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

---

### Issue: App fails to start with "Credential Store not found"

**Cause:** `ENABLE_CREDENTIAL_STORE=true` but BTP Credential Store service not bound

**Solution:**
```bash
# Option 1: Disable Credential Store
export ENABLE_CREDENTIAL_STORE=false

# Option 2: Create and bind Credential Store service
cf create-service credstore standard solutionadvisor-credstore
cf bind-service solutionadvisor-srv solutionadvisor-credstore
cf restage solutionadvisor-srv
```

---

### Issue: SMTP emails not sending

**Cause:** Credentials not available (neither in Credential Store nor environment variables)

**Solution:**
```bash
# Ensure SMTP credentials are set
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@example.com
export SMTP_PASS=your-app-password
export SMTP_FROM="Solution Advisor <no-reply@example.com>"
```

---

## Security Recommendations

### Development Environments
- ✅ **Disable** encryption (`ENABLE_ENCRYPTION=false`)
- ✅ **Disable** Credential Store (`ENABLE_CREDENTIAL_STORE=false`)
- ✅ Use local environment variables
- ✅ Use test SMTP credentials

### Testing/Staging Environments
- ⚠️ **Optional** encryption (depends on test data)
- ✅ **Disable** Credential Store (use platform secrets)
- ✅ Use platform-native secret management
- ✅ Use staging SMTP credentials

### Production Environments (BTP)
- ✅ **Enable** encryption (`ENABLE_ENCRYPTION=true`)
- ✅ **Enable** Credential Store (`ENABLE_CREDENTIAL_STORE=true`)
- ✅ Store all secrets in BTP Credential Store
- ✅ Rotate encryption keys every 90 days
- ✅ Enable audit logging

### Production Environments (Non-BTP)
- ✅ **Enable** encryption (`ENABLE_ENCRYPTION=true`)
- ✅ **Disable** Credential Store (use platform secrets)
- ✅ Use AWS Secrets Manager / Azure Key Vault
- ✅ Rotate encryption keys every 90 days
- ✅ Enable audit logging

---

## Feature Flag Reference

| Environment Variable | Default | Production Recommendation |
|---------------------|---------|---------------------------|
| `ENABLE_ENCRYPTION` | `false` | `true` (if handling PII) |
| `ENABLE_CREDENTIAL_STORE` | `false` | `true` (if on BTP) |
| `ENCRYPTION_MASTER_KEY` | (none) | Required if encryption enabled |
| `ENCRYPTION_KEY_VERSION` | (auto) | Recommended for rotation tracking |
| `SMTP_HOST` | (none) | Required |
| `SMTP_PORT` | (none) | Required |
| `SMTP_USER` | (none) | Required |
| `SMTP_PASS` | (none) | Required |
| `SMTP_FROM` | (none) | Required |

---

## Testing Feature Flags

### Test Encryption Disabled

```bash
export ENABLE_ENCRYPTION=false
npm run start-local

# Test: Data should be stored as plaintext
# Verify in database: SELECT * FROM sd_CleanCoreAnalysis
```

### Test Encryption Enabled

```bash
export ENABLE_ENCRYPTION=true
export ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npm run start-local

# Test: Data should be encrypted
# Verify in logs: "EncryptionService: Initialized successfully"
```

### Test Credential Store Disabled

```bash
export ENABLE_CREDENTIAL_STORE=false
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
npm run start-local

# Test: App should use environment variables
# Verify in logs: "CredentialStoreService: Using environment variables"
```

### Test Credential Store Enabled (requires BTP)

```bash
export ENABLE_CREDENTIAL_STORE=true
cf push  # Deploy to BTP with Credential Store bound

# Test: App should use BTP Credential Store
# Verify in logs: "CredentialStoreService: Connected to BTP Credential Store"
```

---

## Summary

**Feature flags allow flexible deployment across environments:**

- **Development:** Both features disabled → Fast, simple setup
- **Staging:** Encryption optional, Credential Store disabled → Platform secrets
- **Production (BTP):** Both features enabled → Maximum security
- **Production (Non-BTP):** Encryption enabled, Credential Store disabled → Platform-native secrets

**The application works correctly in all scenarios!** 🎉

---

**Last Updated:** October 25, 2025  
**Applies to:** Solution Advisor v1.0.0+
