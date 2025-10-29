# Alert Notification Testing Guide

## Quick Start Testing

### 1. Test Analysis Completion Notification

**Steps:**
1. Navigate to Fiori Launchpad: `http://localhost:4004/app/launchpadPage.html`
2. Click "Start New Analysis" tile
3. Complete the wizard with these inputs:
   - Select a project
   - Enter RICEFW ID (e.g., `I-0001-TST`)
   - Answer all wizard questions
4. Submit final answer

**Expected Results:**
- FLP bell icon shows badge with count "1"
- Click bell → see notification "Clean Core Analysis Complete"
- Click notification → navigate to analysis details
- Alert Notification Service receives event (check BTP cockpit)

### 2. Test High Technical Debt Alert

**Steps:**
1. Complete wizard analysis targeting Level C or D recommendation
2. Ensure wizard flow leads to high complexity answers
3. Submit final answer

**Expected Results:**
- If technical debt score >= 80:
  - Bell icon badge increases by 1
  - Second notification appears: "High Technical Debt Alert"
  - Alert severity: Warning (yellow/orange)

### 3. Test Low Cloud Readiness Alert

**Steps:**
1. Complete wizard for on-premise heavy customization scenario
2. Select answers indicating custom ABAP, non-standard processes
3. Submit final answer

**Expected Results:**
- If cloud readiness score < 50%:
  - Bell icon badge increases by 1
  - Notification: "Low Cloud Readiness Alert"
  - Alert severity: Warning

### 4. Test Session Save Notification

**Steps:**
1. Start new wizard analysis
2. Answer 2-3 questions (don't complete)
3. Navigate away or refresh page
4. Check notifications

**Expected Results:**
- Notification: "Wizard Session Saved"
- Severity: Info (blue)
- Action: "Resume Session" button
- Clicking action → resumes wizard at saved progress

### 5. Test Mark as Read Functionality

**Steps:**
1. Ensure you have unread notifications
2. Click notification in FLP shell
3. Observe badge count

**Expected Results:**
- Badge count decreases by 1
- Notification marked with read indicator
- `isRead` field updated to `true` in database

### 6. Test Unread Count

**Steps:**
1. Generate multiple notifications
2. Mark some as read
3. Check bell icon badge

**Expected Results:**
- Badge displays count of unread notifications only
- Count updates in real-time (30s polling interval)

## Manual Database Verification

### Check Notifications Table

```sql
-- View all notifications for a user
SELECT 
    "ID",
    "userId",
    "notificationType",
    "title",
    "severity",
    "priority",
    "isRead",
    "createdAt",
    "expiresAt"
FROM "sd_UserNotifications"
WHERE "userId" = 'your-user-email@example.com'
ORDER BY "createdAt" DESC;

-- Count unread notifications
SELECT 
    "notificationType",
    COUNT(*) as unread_count
FROM "sd_UserNotifications"
WHERE "userId" = 'your-user-email@example.com'
  AND "isRead" = FALSE
  AND "expiresAt" > CURRENT_TIMESTAMP
GROUP BY "notificationType";

-- View expired notifications (should be auto-cleaned)
SELECT COUNT(*) as expired_count
FROM "sd_UserNotifications"
WHERE "expiresAt" < CURRENT_TIMESTAMP;
```

### Check Alert Notification Service Events

**Via BTP Cockpit:**
1. Navigate to SAP BTP Cockpit
2. Go to your subaccount
3. Open "Instances and Subscriptions"
4. Click "SolutionAdvisor-alerts" instance
5. View "Events" tab

**Via REST API:**
```bash
# Get OAuth token (replace with actual credentials from cf env)
TOKEN=$(curl -s -X POST "https://<auth-url>/oauth/token" \
  -u "<client_id>:<client_secret>" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

# Query events (if supported by your plan)
curl -H "Authorization: Bearer $TOKEN" \
  "https://<alert-service-url>/cf/consumer/v1/events"
```

## OData Service Testing

### Test Notification Retrieval

```bash
# Get all notifications for current user (replace with actual URL)
curl "http://localhost:4004/service/SolutionAdvisorSvcs/Notifications" \
  -H "Accept: application/json"

# Get unread notifications only
curl "http://localhost:4004/service/SolutionAdvisorSvcs/Notifications?\$filter=isRead eq false" \
  -H "Accept: application/json"

# Get notification count
curl "http://localhost:4004/service/SolutionAdvisorSvcs/Notifications/\$count" \
  -H "Accept: application/json"
```

### Test Mark as Read Action

```bash
# Mark notification as read (replace <notification-id>)
curl -X POST "http://localhost:4004/service/SolutionAdvisorSvcs/Notifications/markNotificationAsRead" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "<notification-id>"
  }'
```

### Test Unread Count Function

```bash
# Get unread notification count
curl "http://localhost:4004/service/SolutionAdvisorSvcs/Notifications/getUnreadNotificationCount()" \
  -H "Accept: application/json"
```

## Browser Console Testing

### Check FLP Notification Service

Open browser console (F12) and execute:

```javascript
// Get FLP notification service
sap.ushell.Container.getService("Notifications").then(function(oNotificationService) {
    console.log("Notification Service loaded:", oNotificationService);
    
    // Get notifications
    oNotificationService.getNotifications().then(function(aNotifications) {
        console.log("Notifications:", aNotifications);
    });
    
    // Get unread count
    oNotificationService.getUnseenNotificationsCount().then(function(iCount) {
        console.log("Unread count:", iCount);
    });
});
```

### Monitor Polling Activity

```javascript
// Monitor network requests
var originalFetch = window.fetch;
window.fetch = function() {
    if (arguments[0] && arguments[0].includes('Notifications')) {
        console.log('[Notification Poll]', new Date().toLocaleTimeString(), arguments[0]);
    }
    return originalFetch.apply(this, arguments);
};
```

## Troubleshooting Commands

### Check Service Binding (Cloud Foundry)

```bash
# View environment variables
cf env SolutionAdvisor-srv | grep -A 20 SolutionAdvisor-alerts

# Check service instance
cf service SolutionAdvisor-alerts

# View app logs
cf logs SolutionAdvisor-srv --recent | grep -i notification
```

### Database Diagnostics

```sql
-- Check for duplicate notifications
SELECT 
    "userId",
    "notificationType",
    "relatedEntityId",
    COUNT(*) as duplicate_count
FROM "sd_UserNotifications"
GROUP BY "userId", "notificationType", "relatedEntityId"
HAVING COUNT(*) > 1;

-- View notification timeline
SELECT 
    DATE("createdAt") as notification_date,
    "notificationType",
    COUNT(*) as daily_count
FROM "sd_UserNotifications"
GROUP BY DATE("createdAt"), "notificationType"
ORDER BY notification_date DESC;

-- Check tenant isolation
SELECT 
    "tenant",
    COUNT(*) as notification_count
FROM "sd_UserNotifications"
GROUP BY "tenant";
```

### Reset Test Data

```sql
-- Delete all test notifications (use with caution!)
DELETE FROM "sd_UserNotifications"
WHERE "userId" LIKE '%test%' OR "userId" LIKE '%example%';

-- Delete all notifications (use in development only!)
-- DELETE FROM "sd_UserNotifications";
```

## Performance Testing

### Generate Bulk Notifications

```sql
-- Insert 100 test notifications
DO BEGIN
    DECLARE i INT;
    FOR i IN 1..100 DO
        INSERT INTO "sd_UserNotifications" (
            "ID",
            "userId",
            "tenant",
            "notificationType",
            "title",
            "description",
            "severity",
            "priority",
            "createdAt",
            "expiresAt"
        ) VALUES (
            SYSUUID,
            'test-user@example.com',
            'default',
            'TEST_NOTIFICATION',
            'Test Notification ' || :i,
            'Performance test notification',
            'info',
            'Medium',
            CURRENT_TIMESTAMP,
            ADD_DAYS(CURRENT_TIMESTAMP, 7)
        );
    END FOR;
END;
```

### Measure Polling Performance

```javascript
// Browser console - measure response time
var startTime = performance.now();
fetch('/service/SolutionAdvisorSvcs/Notifications?$top=50')
    .then(response => response.json())
    .then(data => {
        var endTime = performance.now();
        console.log('Notification fetch time:', (endTime - startTime).toFixed(2), 'ms');
        console.log('Notification count:', data.value.length);
    });
```

## Expected Notification Scenarios

### Scenario 1: Perfect Analysis (Level A)
- ✅ Analysis Complete notification
- ❌ No threshold alerts
- Scores: Tech Debt < 20, Cloud Readiness > 90%

### Scenario 2: Moderate Risk (Level B)
- ✅ Analysis Complete notification
- ❌ No threshold alerts
- Scores: Tech Debt 20-50, Cloud Readiness 70-90%

### Scenario 3: High Risk (Level C)
- ✅ Analysis Complete notification
- ✅ High Technical Debt alert (if score >= 80)
- ✅ Low Cloud Readiness alert (if score < 50%)
- Scores: Tech Debt 50-80, Cloud Readiness 40-70%

### Scenario 4: Critical Risk (Level D)
- ✅ Analysis Complete notification
- ✅ High Technical Debt alert
- ✅ Low Cloud Readiness alert
- Scores: Tech Debt > 80, Cloud Readiness < 40%

## Integration Testing

### End-to-End Test Flow

1. **User Login** → FLP loads
2. **Start Wizard** → Session created
3. **Answer Questions** → Session saved (notification sent)
4. **Complete Wizard** → Analysis completed (notification sent)
5. **Scores Calculated** → Threshold checks (conditional notifications)
6. **View Notifications** → FLP bell icon updates
7. **Click Notification** → Navigate to analysis
8. **Mark as Read** → Badge count decreases

### Automated Test Script (Node.js)

```javascript
// test-notifications.js
const axios = require('axios');

const baseURL = 'http://localhost:4004/service/SolutionAdvisorSvcs';

async function testNotificationFlow() {
    try {
        // 1. Get notifications
        const notificationsResponse = await axios.get(`${baseURL}/Notifications`);
        console.log('✓ Notifications retrieved:', notificationsResponse.data.value.length);
        
        // 2. Get unread count
        const countResponse = await axios.get(`${baseURL}/Notifications/getUnreadNotificationCount()`);
        console.log('✓ Unread count:', countResponse.data.count);
        
        // 3. Mark first notification as read
        if (notificationsResponse.data.value.length > 0) {
            const notificationId = notificationsResponse.data.value[0].ID;
            const markReadResponse = await axios.post(
                `${baseURL}/Notifications/markNotificationAsRead`,
                { notificationId }
            );
            console.log('✓ Notification marked as read:', markReadResponse.data.success);
        }
        
        console.log('\n✅ All notification tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testNotificationFlow();
```

## Monitoring & Metrics

### Key Metrics to Track

1. **Notification Delivery Rate**
   - Target: 100% of events result in notifications
   - Query: Count Alert Service POST requests vs. database inserts

2. **Polling Performance**
   - Target: < 500ms response time for 50 notifications
   - Monitor: Network tab response times

3. **Notification Read Rate**
   - Target: > 80% of notifications marked as read within 24 hours
   - Query: Compare created vs. read timestamps

4. **Expiration Cleanup**
   - Target: All expired notifications deleted within 1 hour
   - Query: Count notifications with `expiresAt < now()`

### Alert Notification Service Metrics (BTP Cockpit)

- Event delivery success rate
- Event processing latency
- Failed event attempts
- Consumer subscription status

---

**Test Completion Checklist:**

- [ ] Analysis completion notification received
- [ ] High technical debt alert triggered
- [ ] Low cloud readiness alert triggered
- [ ] Session saved notification received
- [ ] Mark as read functionality works
- [ ] Unread count updates correctly
- [ ] Deep links navigate to correct pages
- [ ] Expired notifications auto-cleanup
- [ ] Tenant isolation verified (no cross-user notifications)
- [ ] Alert Notification Service receives events (check BTP cockpit)

**Status:** Ready for testing after deployment
