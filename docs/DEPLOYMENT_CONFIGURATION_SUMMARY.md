# Deployment Configuration Summary

## Quick Reference: Environment Variables

### Required for All Deployments

```env
# Node.js Environment
NODE_ENV=development  # or 'production'

# SMTP Configuration (Email Notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="Solution Advisor <no-reply@example.com>"
```

---

## Optional Security Features (Defaults: Disabled)

### Encryption Feature Flag

```env
# Enable/Disable Field-Level Encryption
ENABLE_ENCRYPTION=false  # Set to 'true' to enable

# Required only if ENABLE_ENCRYPTION=true
ENCRYPTION_MASTER_KEY=<64-character-hex-string>
ENCRYPTION_KEY_VERSION=v1
```

### BTP Credential Store Feature Flag

```env
# Enable/Disable BTP Credential Store
ENABLE_CREDENTIAL_STORE=false  # Set to 'true' to enable (BTP only)

# No additional config needed when 'false' (uses environment variables)
# When 'true', requires BTP service binding (see BTP section below)
```

---

## Deployment Scenarios

### 1️⃣ Local Development (Simplest)

**Environment:** Local laptop, SQLite database, no encryption, no BTP

**File:** `.env`

```env
NODE_ENV=development

# Security features disabled
ENABLE_ENCRYPTION=false
ENABLE_CREDENTIAL_STORE=false

# SMTP (use test credentials or local SMTP server)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-dev-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Dev Solution Advisor <dev@localhost>"
```

**Start Command:**
```bash
npm run start-local
# App available at http://localhost:4004
```

**✅ Works without:**
- BTP Credential Store
- Encryption keys
- Production database

---

### 2️⃣ Testing/Staging (Cloud, No BTP)

**Environment:** AWS/Azure/GCP, managed database, environment variables for secrets

**Configuration:**

```env
NODE_ENV=production

# Security features
ENABLE_ENCRYPTION=false  # Or 'true' if testing encryption
ENABLE_CREDENTIAL_STORE=false  # No BTP

# If ENABLE_ENCRYPTION=true, add:
# ENCRYPTION_MASTER_KEY=<from-secrets-manager>

# SMTP (from platform secrets manager)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<from-aws-secrets-manager>
SMTP_FROM="Staging Advisor <staging@yourcompany.com>"

# Database (from platform)
DATABASE_URL=<from-platform-config>
```

**Platform-Specific Secret Management:**

**AWS (Secrets Manager):**
```javascript
// Load secrets from AWS Secrets Manager before app start
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

const secret = await secretsManager.getSecretValue({ 
    SecretId: 'solutionadvisor/production' 
}).promise();

const secrets = JSON.parse(secret.SecretString);
process.env.SMTP_PASS = secrets.smtpPassword;
process.env.ENCRYPTION_MASTER_KEY = secrets.encryptionKey;
```

**Azure (Key Vault):**
```javascript
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

const smtpPass = await client.getSecret('smtp-password');
process.env.SMTP_PASS = smtpPass.value;
```

**✅ Works with:**
- AWS, Azure, GCP deployments
- Platform-native secret managers
- No BTP dependency

---

### 3️⃣ Production on SAP BTP (Full Security)

**Environment:** SAP BTP Cloud Foundry, HANA Cloud, BTP Credential Store

**Configuration:**

**File:** `manifest.yml` (or set in BTP Cockpit)

```yaml
applications:
  - name: solutionadvisor-srv
    env:
      NODE_ENV: production
      ENABLE_ENCRYPTION: true
      ENABLE_CREDENTIAL_STORE: true
    services:
      - solutionadvisor-db
      - solutionadvisor-credstore
      - solutionadvisor-xsuaa
```

**Required BTP Services:**

```bash
# Create HANA Cloud database
cf create-service hana hdi-shared solutionadvisor-db

# Create Credential Store
cf create-service credstore standard solutionadvisor-credstore

# Create XSUAA (authentication)
cf create-service xsuaa application solutionadvisor-xsuaa -c xs-security.json

# Deploy application
cf push
```

**Store Credentials in BTP Credential Store:**

1. Navigate to BTP Cockpit → Credential Store instance
2. Add namespace: `encryption`
   - Key: `master-key`
   - Value: `<64-character-hex-string>`
   - Type: `password`
3. Add namespace: `smtp`
   - Key: `password`
   - Value: `<your-smtp-password>`
   - Key: `user`
   - Value: `<your-smtp-username>`
   - Key: `host`
   - Value: `smtp.yourcompany.com`
   - Key: `port`
   - Value: `587`
   - Key: `from`
   - Value: `Solution Advisor <no-reply@yourcompany.com>`

**✅ Works with:**
- Full BTP integration
- Automatic credential rotation
- Centralized secret management

---

### 4️⃣ Production on Non-BTP Cloud (Encryption Enabled)

**Environment:** AWS/Azure/GCP, encryption enabled, no BTP Credential Store

**Configuration:**

```env
NODE_ENV=production

# Security features
ENABLE_ENCRYPTION=true
ENABLE_CREDENTIAL_STORE=false  # No BTP

# Encryption (from secrets manager)
ENCRYPTION_MASTER_KEY=<from-secrets-manager>
ENCRYPTION_KEY_VERSION=v1

# SMTP (from secrets manager)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=<from-secrets-manager>
SMTP_PASS=<from-secrets-manager>
SMTP_FROM="Solution Advisor <no-reply@yourcompany.com>"
```

**✅ Works with:**
- Encryption enabled for sensitive data
- Platform-native secret managers
- No BTP dependency

---

## Feature Flag Decision Matrix

| Deployment | ENABLE_ENCRYPTION | ENABLE_CREDENTIAL_STORE | Secret Management |
|-----------|-------------------|-------------------------|-------------------|
| **Local Dev** | `false` | `false` | .env file |
| **Testing/Staging** | `false` | `false` | Platform env vars |
| **Production (BTP)** | `true` | `true` | BTP Credential Store |
| **Production (AWS)** | `true` | `false` | AWS Secrets Manager |
| **Production (Azure)** | `true` | `false` | Azure Key Vault |
| **Production (GCP)** | `true` | `false` | GCP Secret Manager |

---

## How to Generate Encryption Key

### Option 1: Node.js (Recommended)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output example:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Option 2: OpenSSL

```bash
openssl rand -hex 32
```

### Option 3: PowerShell (Windows)

```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

**⚠️ Important:**
- Key MUST be exactly 64 hexadecimal characters (32 bytes)
- Store securely in production (never commit to git)
- Rotate every 90 days in production

---

## Troubleshooting

### App fails to start: "Encryption key not found"

**Cause:** `ENABLE_ENCRYPTION=true` but no key provided

**Fix:**
```bash
# Option 1: Disable encryption
export ENABLE_ENCRYPTION=false

# Option 2: Generate and set key
export ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### App fails to start: "Credential Store not found"

**Cause:** `ENABLE_CREDENTIAL_STORE=true` but service not bound

**Fix:**
```bash
# Option 1: Disable Credential Store
export ENABLE_CREDENTIAL_STORE=false

# Option 2: Create and bind service (BTP only)
cf create-service credstore standard solutionadvisor-credstore
cf bind-service solutionadvisor-srv solutionadvisor-credstore
cf restage solutionadvisor-srv
```

### SMTP emails not sending

**Cause:** SMTP credentials not set

**Fix:**
```bash
# Ensure all SMTP environment variables are set
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-app-password
export SMTP_FROM="Solution Advisor <no-reply@example.com>"
```

---

## Complete Documentation

For comprehensive configuration guide, see:
- **[Security Feature Flags Guide](./SECURITY_FEATURE_FLAGS.md)** - Complete guide to all feature flags
- **[Security Implementation Summary](./SECURITY_PERFORMANCE_IMPLEMENTATION.md)** - Technical implementation details

---

**Last Updated:** October 25, 2025  
**Version:** 1.0.0
