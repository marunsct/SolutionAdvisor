# Security Administration Quick Reference

## Role Assignment Guide

### Role Collections Overview

| Role Collection | Recommended For | Key Capabilities |
|----------------|-----------------|------------------|
| **SolutionAdvisor_Administrator** | IT Admins, App Owners | Full system access, cross-tenant management |
| **SolutionAdvisor_TenantAdmin** | Business Owners, Implementation Leads | Tenant-wide management, user assignments |
| **SolutionAdvisor_ProjectAdmin** | Project Managers | Project-specific management (requires projectId attribute) |
| **SolutionAdvisor_SolutionArchitect** | Senior SAP Consultants | Create/edit analyses, export reports |
| **SolutionAdvisor_Developer** | Junior Consultants, Developers | Execute wizard, view results |
| **SolutionAdvisor_Viewer** | Stakeholders, Auditors | Read-only access to analyses |
| **SolutionAdvisor_ServiceProviderAdmin** | SaaS Ops Teams | Cross-tenant analytics, master data |

---

## Assigning Users in BTP Cockpit

### 1. Basic Role Assignment (No Attributes)

**Applies to:** Administrator, TenantAdmin, SolutionArchitect, Developer, Viewer, ServiceProviderAdmin

**Steps:**
1. Open **BTP Cockpit** → Navigate to your subaccount
2. Go to **Security** → **Role Collections**
3. Search for `SolutionAdvisor_` to find all collections
4. Click on the desired role collection (e.g., `SolutionAdvisor_SolutionArchitect`)
5. Click **Edit** button
6. Under **Users** section, click **Add**
7. Enter user details:
   - **ID:** User's email address (e.g., `john.doe@company.com`)
   - **Identity Provider:** `Default identity provider` (or your custom IAS)
8. Click **Save**
9. User will have access on next login

---

### 2. Attribute-Based Role Assignment (ProjectAdmin)

**Applies to:** ProjectAdmin role (requires projectId attribute)

**Steps:**
1. Follow steps 1-6 from Basic Assignment above
2. After entering user email, **BEFORE clicking Save**:
3. Click **Add Attribute** button
4. Fill in attribute details:
   - **Attribute Name:** `projectId`
   - **Attribute Value:** Project UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
   - For multiple projects, use **comma-separated values**: `P001,P002,P003`
5. Click **Save**

**Finding Project IDs:**
- Query database: `SELECT ID, clientName FROM sd_ProjectConfiguration`
- Or use OData service: `https://<app-url>/service/SolutionAdvisorSvcs/Projects`

**Example:**
- User: `maria.santos@company.com`
- Role: `SolutionAdvisor_ProjectAdmin`
- Attribute: `projectId` = `550e8400-e29b-41d4-a716-446655440000,660e8400-e29b-41d4-a716-446655440001`
- Result: Maria can manage only these 2 projects

---

## Rate Limit Management

### Checking Rate Limit Status

**Via OData API:**
```http
POST /service/SolutionAdvisorSvcs/getRateLimitStatus
Content-Type: application/json

{
  "userId": "user@example.com",
  "tenantId": "default"
}
```

**Response:**
```json
{
  "user": {
    "remaining": 85,
    "limit": 100,
    "resetAt": "2024-12-20T15:30:00Z"
  },
  "tenant": {
    "remaining": 750,
    "limit": 1000,
    "resetAt": "2024-12-20T15:30:00Z"
  }
}
```

### Resetting Rate Limits (Admin Only)

**Reset Specific User:**
```http
POST /service/SolutionAdvisorSvcs/resetUserRateLimit
Content-Type: application/json

{
  "userId": "user@example.com"
}
```

**Reset Entire Tenant:**
```http
POST /service/SolutionAdvisorSvcs/resetTenantRateLimit
Content-Type: application/json

{
  "tenantId": "default"
}
```

**When to Reset:**
- User reports legitimate 429 errors during peak usage
- After scheduled maintenance windows
- When testing with high-volume automated scripts

---

## Rate Limit Thresholds

| Limit Type | Threshold | Refill Rate | Notes |
|-----------|-----------|-------------|-------|
| **Per User** | 100 req/min | 100/min | Standard operations (1 token each) |
| **Per Tenant** | 1000 req/min | 1000/min | Shared across all tenant users |
| **Expensive Ops** | 10 req/min | 10/min | Scoring, analytics, exports (10 tokens each) |

**Expensive Operations:**
- Calculate Scores (POST /recalculateScores)
- Get Analytics (POST /getAnalyticsData)
- Export Analysis (POST /exportAnalysis)
- Generate Reports (POST /generateReport)

**Admin Bypass:** Users with `Admin` or `ServiceProviderAdmin` roles are **exempt from all rate limits**.

---

## Troubleshooting Common Issues

### User Cannot Edit Their Own Analysis (403 Error)

**Symptom:** User created an analysis but gets "You can only edit or delete your own analyses" error

**Diagnosis:**
1. Check if analysis `createdBy` field matches user ID:
   ```sql
   SELECT ID, ricefwId, createdBy FROM sd_CleanCoreAnalysis WHERE ID = '<analysis-id>';
   ```
2. Verify user ID format:
   - XSUAA: Usually email (e.g., `user@company.com`)
   - Custom IAS: May be UUID or username

**Solution:**
- If `createdBy` is NULL or incorrect, manually update:
  ```sql
  UPDATE sd_CleanCoreAnalysis SET createdBy = 'user@company.com' WHERE ID = '<analysis-id>';
  ```
- Alternatively, grant temporary `TenantAdmin` role to user for override

---

### ProjectAdmin Cannot Access Assigned Project (403 Error)

**Symptom:** User with `SolutionAdvisor_ProjectAdmin` role gets "You can only modify projects you are assigned to"

**Diagnosis:**
1. Verify user has `projectId` attribute assigned in BTP Cockpit
2. Check project ID format:
   ```sql
   SELECT ID, clientName FROM sd_ProjectConfiguration WHERE ID = '<project-id>';
   ```
3. Ensure attribute value in BTP Cockpit **exactly matches** database ID (case-sensitive)

**Solution:**
- Update user's `projectId` attribute in BTP Cockpit:
  - Go to **Role Collections** → `SolutionAdvisor_ProjectAdmin` → Edit user
  - Verify `projectId` attribute value matches database ID
  - Use comma-separated list for multiple projects

---

### Rate Limit Too Restrictive (Frequent 429 Errors)

**Symptom:** Legitimate users frequently hitting rate limits during normal usage

**Diagnosis:**
1. Check rate limit status via API (see above)
2. Review application logs for spike in requests:
   ```bash
   cf logs solutionadvisor-srv --recent | grep "Rate limit"
   ```
3. Identify if specific operation is expensive (scoring, analytics)

**Solution (Temporary):**
- **Option 1:** Reset user rate limit (immediate relief)
- **Option 2:** Upgrade user to `Admin` role (bypasses limits)

**Solution (Permanent):**
- Increase limits in `srv/lib/rate-limiter.js`:
  ```javascript
  user: { capacity: 200, refillRate: 200 }  // Double the limit
  ```
- Redeploy application:
  ```bash
  cf push solutionadvisor-srv
  ```

---

### Role Collection Not Visible After XSUAA Update

**Symptom:** Updated `xs-security.json` but new role collections not in BTP Cockpit

**Diagnosis:**
1. Check XSUAA service status:
   ```bash
   cf service solutionadvisor-xsuaa
   ```
   - Status should be "update succeeded"
2. Verify service binding:
   ```bash
   cf env solutionadvisor-srv | grep VCAP_SERVICES
   ```
3. Check application restart:
   ```bash
   cf app solutionadvisor-srv
   ```

**Solution:**
1. Ensure XSUAA update completed:
   ```bash
   cf update-service solutionadvisor-xsuaa -c xs-security.json
   ```
2. Wait 2-3 minutes for propagation
3. Refresh BTP Cockpit browser (Ctrl+F5)
4. If still missing, restart app:
   ```bash
   cf restart solutionadvisor-srv
   ```

---

## Security Best Practices

### Role Assignment Principles

1. **Principle of Least Privilege**
   - Assign minimum role required for job function
   - Prefer `Developer` over `SolutionArchitect` if user only needs to execute wizards
   - Reserve `Admin` for IT operations staff only

2. **Separation of Duties**
   - Do NOT assign multiple high-privilege roles to same user (e.g., Admin + ServiceProviderAdmin)
   - Use `ProjectAdmin` for project-specific management instead of `TenantAdmin`

3. **Attribute-Based Segmentation**
   - Always use `projectId` attribute for `ProjectAdmin` assignments
   - Never assign ProjectAdmin without projectId constraint
   - Use comma-separated lists for users managing multiple projects

4. **Regular Audits**
   - Review role assignments quarterly
   - Remove roles for users who change job functions
   - Check for orphaned role collections (no users assigned)

---

### Rate Limiting Recommendations

1. **Monitor Usage Patterns**
   - Set up alerts for high rate limit violations (>10% of requests)
   - Review expensive operation usage monthly
   - Identify users/processes causing spikes

2. **Adjust Limits Based on Real Usage**
   - Baseline: 100 user / 1000 tenant sufficient for most deployments
   - High-volume tenants: Increase to 200 user / 2000 tenant
   - Batch processes: Create dedicated service account with Admin role (bypasses limits)

3. **Production vs. Development**
   - Development environments: Higher limits for testing (200/2000)
   - Production environments: Stricter limits for stability (100/1000)

4. **Distributed Deployments**
   - If using multiple app instances, migrate to Redis-based rate limiting
   - In-memory storage does NOT share state across instances

---

## Emergency Procedures

### Complete Access Lockout (All Users Unable to Login)

**Cause:** Misconfigured xs-security.json or XSUAA service

**Resolution:**
1. Rollback XSUAA configuration:
   ```bash
   git checkout HEAD~1 xs-security.json
   cf update-service solutionadvisor-xsuaa -c xs-security.json
   ```
2. Wait 5 minutes for propagation
3. Test access with known working user account
4. If still locked out, create emergency admin via CF CLI:
   ```bash
   cf create-service-key solutionadvisor-xsuaa emergency-key
   cf service-key solutionadvisor-xsuaa emergency-key
   ```
   Use service key credentials to bypass XSUAA

---

### Rate Limit Denial of Service (Entire Tenant Locked Out)

**Cause:** Malicious actor or runaway script exhausting tenant rate limit

**Resolution:**
1. Identify offending user via logs:
   ```bash
   cf logs solutionadvisor-srv --recent | grep "Rate limit exceeded"
   ```
2. Reset tenant rate limit immediately:
   ```http
   POST /service/SolutionAdvisorSvcs/resetTenantRateLimit
   { "tenantId": "affected-tenant-id" }
   ```
3. Block offending user (revoke role collection in BTP Cockpit)
4. Investigate root cause (compromised credentials, bug in client app)

---

## Contact Information

**Technical Support:**  
- SAP Support Portal: https://support.sap.com  
- Internal IT Helpdesk: [Your IT Dept Contact]

**Security Incidents:**  
- Email: security@yourcompany.com  
- Phone: +1-XXX-XXX-XXXX (24/7 hotline)

**Documentation:**  
- Full Guide: `docs/SECURITY_ENHANCEMENTS.md`  
- API Reference: `srv/service.cds`  
- Technical Spec: `.github/technical specification/SAP-Clean-Core-CAP-App-Enhanced-Technical-Spec.md`

---

**Last Updated:** December 2024  
**Version:** 1.0
