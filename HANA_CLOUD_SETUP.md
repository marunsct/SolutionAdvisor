# HANA Cloud Connection Setup Guide

## ✅ Configuration Complete!

The application has been configured to connect to SAP HANA Cloud for local development.

## 📝 Next Steps: Configure Your HANA Credentials

### 1. Update `default-env.json`

Open `default-env.json` in the root directory and replace the placeholder values with your actual HANA Cloud credentials:

```json
{
  "VCAP_SERVICES": {},
  "VCAP_APPLICATION": {},
  "HANA_HOST": "your-hana-instance.hanacloud.ondemand.com",
  "HANA_PORT": "443",
  "HANA_USER": "your-username",
  "HANA_PASSWORD": "your-password",
  "HANA_SCHEMA": "your-schema-name",
  "SMTP_HOST": "smtp.example.com",
  "SMTP_PORT": "587",
  "SMTP_USER": "",
  "SMTP_PASS": "",
  "SMTP_FROM": "noreply@example.com"
}
```

### 2. How to Get Your HANA Cloud Credentials

#### From SAP BTP Cockpit:

1. **Navigate to your SAP BTP subaccount**
2. **Go to:** Cloud Foundry → Spaces → [Your Space]
3. **Click on:** SAP HANA Cloud → [Your HANA instance]
4. **Get the connection details:**
   - **Host:** Copy the SQL Endpoint (e.g., `abc123.hana.trial-us10.hanacloud.ondemand.com`)
   - **Port:** Usually `443` (for encrypted connections)
   - **User:** Your database user (e.g., `DBADMIN` or a specific user you created)
   - **Password:** The password for that user
   - **Schema:** Your schema name (often same as username, or a custom schema)

#### Alternative - From SAP HANA Database Explorer:

1. Open SAP HANA Database Explorer
2. Right-click on your database connection
3. Select **Properties** to see connection details

### 3. Deploy Database Schema to HANA Cloud

Once you've configured your credentials, deploy the database schema:

```powershell
npx cds deploy --to hana
```

This will:
- ✅ Create all database tables, views, and calculation views
- ✅ Load initial master data from CSV files in `db/data/`
- ✅ Set up indexes and foreign keys

### 4. Start the Application

```powershell
npx cds watch
```

The application will now:
- ✅ Connect to your HANA Cloud instance
- ✅ Use the deployed schema
- ✅ Enable full CRUD operations
- ✅ Support all business logic and calculations

### 5. Verify Connection

After starting the server, you should see:

```
[cds] - connect to db > hana {
  host: 'your-hana-host.hanacloud.ondemand.com',
  port: 443,
  schema: 'YOUR_SCHEMA'
}
[cds] - serving solutionAdvisorService { path: '/service/SolutionAdvisorSvcs' }
[cds] - server listening on { url: 'http://localhost:4004' }
```

## 🔒 Security Notes

**⚠️ IMPORTANT: Protect Your Credentials!**

1. **DO NOT commit `default-env.json` to Git!**
   - Already added to `.gitignore`
   - Contains sensitive credentials

2. **For production:**
   - Use environment variables or SAP BTP service bindings
   - Never hardcode credentials in source code

## 🔧 Configuration Details (package.json)

The following configuration has been added to `package.json`:

```json
{
  "cds": {
    "requires": {
      "[development]": {
        "db": {
          "kind": "hana",
          "credentials": {
            "host": "${env:HANA_HOST}",
            "port": "${env:HANA_PORT}",
            "user": "${env:HANA_USER}",
            "password": "${env:HANA_PASSWORD}",
            "schema": "${env:HANA_SCHEMA}",
            "encrypt": true,
            "sslValidateCertificate": false
          }
        }
      }
    }
  }
}
```

**Key settings:**
- `encrypt: true` - Enables SSL/TLS encryption
- `sslValidateCertificate: false` - Allows self-signed certificates (common in development)

## 🚀 Common Commands

```powershell
# Deploy database schema
npx cds deploy --to hana

# Start development server
npx cds watch

# Compile CDS models
npx cds compile srv/service.cds

# Generate SQL for HANA
npx cds compile db/schema.cds --to sql

# Test database connection
npx cds deploy --to hana --dry-run
```

## ❓ Troubleshooting

### Connection Timeout
- Verify HANA instance is running (check BTP Cockpit)
- Check firewall/network settings
- Verify credentials are correct

### Schema Not Found
- Ensure schema exists: `CREATE SCHEMA YOUR_SCHEMA_NAME;`
- Check schema name spelling (case-sensitive!)

### Authentication Failed
- Verify username and password
- Check if user has access to the schema
- Try connecting via SAP HANA Database Explorer first

### SSL Certificate Error
- For development, `sslValidateCertificate: false` should handle this
- For production, obtain proper SSL certificates

## 📚 Additional Resources

- [SAP CAP HANA Documentation](https://cap.cloud.sap/docs/guides/databases-hana)
- [SAP HANA Cloud Getting Started](https://help.sap.com/docs/hana-cloud)
- [SAP BTP Environment Variables](https://help.sap.com/docs/btp/sap-business-technology-platform/using-environment-variables)

---

**Ready to connect!** Update `default-env.json` with your credentials and run `npx cds deploy --to hana`.
