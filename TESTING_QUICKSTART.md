# Quick Start Guide: Testing & Audit Logging

## 🚀 Quick Test Execution

### 1. Install Dependencies (First Time Only)
```bash
npm install
```

### 2. Run Unit Tests (Fastest)
```bash
npm run test:unit
```
**Expected output:** 32 test cases in ~5 seconds

### 3. Run Integration Tests (Requires CAP Server)
```bash
npm run test:integration
```
**Expected output:** 25+ test cases in ~15 seconds

### 4. Run All Tests with Coverage
```bash
npm run test:coverage
```
**Expected output:** Coverage report in `coverage/` directory

### 5. Watch Mode (Development)
```bash
npm run test:watch
```
**Behavior:** Re-runs tests on file changes

---

## 🎯 E2E Tests (UIVeri5)

### Prerequisites
- Application must be running: `npm run start-local`
- Chrome browser required

### Run E2E Tests
```bash
npm run test:e2e:local
```

### View Results
- Screenshots: `test/e2e/screenshots/`
- Reports: `test/e2e/reports/E2E-Test-Report.xml`

---

## 🧪 OPA5 UI Tests

### Run OPA5 Tests
1. Start application: `npm run start-local`
2. Open in browser:
   ```
   http://localhost:4004/solutionadvisor/webapp/test/integration/opaTests.qunit.html
   ```

### View Results
- Tests execute in browser
- QUnit interface shows pass/fail status
- Console shows detailed logs

---

## 📊 Coverage Reports

### Generate Coverage Report
```bash
npm run test:coverage
```

### View Coverage Report
```bash
# Open HTML report
open coverage/lcov-report/index.html

# Or on Linux
xdg-open coverage/lcov-report/index.html
```

### Coverage Thresholds
- **Lines:** 80% ✅
- **Functions:** 80% ✅
- **Branches:** 70% ✅
- **Statements:** 80% ✅

---

## 🔍 Audit Logging Usage

### 1. Initialize Audit Service
```javascript
const AuditService = require('./srv/lib/audit-service');
const auditService = new AuditService();
await auditService.init();
```

### 2. Log Authentication Events
```javascript
// Successful login
await auditService.logAuthEvent(req, 'LOGIN', {
    method: 'XSUAA',
    scopes: ['SolutionArchitect']
});

// Failed login
await auditService.logAuthEvent(req, 'LOGIN_FAILED', {
    reason: 'Invalid credentials',
    attemptCount: 3
});

// Logout
await auditService.logAuthEvent(req, 'LOGOUT', {});
```

### 3. Log Data Changes
```javascript
// Create
await auditService.logDataChange(
    req, 
    'CREATE', 
    'CleanCoreAnalysis', 
    analysisId, 
    null,  // no before value
    analysisData
);

// Update
await auditService.logDataChange(
    req,
    'UPDATE',
    'CleanCoreAnalysis',
    analysisId,
    beforeData,
    afterData
);

// Delete
await auditService.logDataChange(
    req,
    'DELETE',
    'CleanCoreAnalysis',
    analysisId,
    beforeData,
    null  // no after value
);
```

### 4. Log Exports
```javascript
// PDF export
await auditService.logExport(
    req,
    'PDF',
    'CleanCoreAnalysis',
    ['analysis-id-1', 'analysis-id-2']
);

// Excel export
await auditService.logExport(
    req,
    'EXCEL',
    'AnalyticsData',
    ['project-id-1']
);
```

### 5. Log Constraint Violations
```javascript
const violations = [
    {
        thresholdName: 'OData API Volume',
        userValue: 10000,
        limit: 5000,
        severity: 'Error'
    }
];

await auditService.logConstraintViolation(
    req,
    analysisId,
    violations
);
```

### 6. Log Configuration Changes
```javascript
await auditService.logConfigChange(
    req,
    'ProjectConfiguration',
    projectId,
    { complianceRequirements: 'SOX' },  // before
    { complianceRequirements: 'SOX, GDPR' }  // after
);
```

### 7. Log Security Events
```javascript
await auditService.logSecurityEvent(
    req,
    'UNAUTHORIZED_ACCESS',
    {
        entityType: 'CleanCoreAnalysis',
        entityId: analysisId,
        requiredRole: 'SolutionArchitect',
        userRole: 'Developer'
    }
);
```

### 8. Query Audit Logs
```javascript
// Get recent audit logs for a user
const userLogs = await auditService.queryAuditLogs({
    userId: 'user@example.com',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    limit: 100
});

// Get all constraint violations
const violations = await auditService.queryAuditLogs({
    eventType: 'CONSTRAINT_VIOLATION',
    limit: 50
});

// Get all exports
const exports = await auditService.queryAuditLogs({
    eventType: 'EXPORT',
    tenantId: 'tenant-uuid',
    limit: 100
});
```

---

## 📁 File Locations

### Test Files
```
test/
├── setup.js                          # Global test setup
├── unit/
│   ├── decision-engine.test.js       # Decision engine tests
│   ├── scoring-service.test.js       # Scoring formula tests
│   └── constraints-service.test.js   # Constraint tests
├── integration/
│   └── service.test.js               # OData service tests
└── e2e/
    └── wizard-flow.spec.js           # E2E wizard tests

app/solutionadvisor/webapp/test/
├── integration/
│   ├── opaTests.qunit.html           # OPA5 test runner
│   ├── opaTests.qunit.js             # OPA5 config
│   ├── arrangements/
│   │   └── Startup.js                # App startup
│   ├── pages/
│   │   ├── AnalysisListPage.js       # Page object
│   │   ├── WizardPage.js             # Page object
│   │   └── AnalyticsPage.js          # Page object
│   ├── NavigationJourney.js          # Navigation tests
│   ├── WizardJourney.js              # Wizard tests
│   └── AnalyticsJourney.js           # Analytics tests
```

### Audit Logging Files
```
srv/lib/audit-service.js              # Audit service
db/schema.cds                         # AuditLog entity
```

### Configuration Files
```
jest.config.js                        # Jest configuration
conf.js                               # UIVeri5 configuration
```

---

## 🐛 Troubleshooting

### Issue: Jest tests fail with "Cannot find module"
**Solution:**
```bash
npm install
```

### Issue: Integration tests timeout
**Solution:**
- Ensure CAP server is running: `npm run start-local`
- Increase timeout in jest.config.js: `testTimeout: 30000`

### Issue: E2E tests fail to start browser
**Solution:**
```bash
# Install Chrome driver
npm install chromedriver --save-dev

# Or use system Chrome
export CHROME_BIN=/usr/bin/google-chrome
```

### Issue: OPA5 tests don't load
**Solution:**
- Ensure app is running: `npm run start-local`
- Check browser console for errors
- Verify path: `http://localhost:4004/solutionadvisor/webapp/test/integration/opaTests.qunit.html`

### Issue: Audit logs not appearing in database
**Solution:**
```javascript
// Check if auditService was initialized
await auditService.init();

// Check database connection
const db = await cds.connect.to('db');
console.log('Database connected:', db);

// Query AuditLog entity directly
const logs = await SELECT.from('sd.AuditLog');
console.log('Audit logs:', logs);
```

---

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm install
      
      - name: Run Unit Tests
        run: npm run test:unit
      
      - name: Run Integration Tests
        run: npm run test:integration
      
      - name: Generate Coverage Report
        run: npm run test:coverage
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 🎓 Best Practices

### Writing Unit Tests
1. ✅ Mock external dependencies (CDS, database)
2. ✅ Test both success and error cases
3. ✅ Use descriptive test names
4. ✅ Assert specific values, not just truthy/falsy
5. ✅ Keep tests isolated and independent

### Writing Integration Tests
1. ✅ Use supertest for HTTP assertions
2. ✅ Test complete request/response cycles
3. ✅ Validate OData query options ($filter, $expand)
4. ✅ Test authentication/authorization
5. ✅ Clean up test data after tests

### Writing E2E Tests
1. ✅ Test complete user workflows
2. ✅ Use Page Object pattern for maintainability
3. ✅ Add explicit waits for async operations
4. ✅ Take screenshots on failure
5. ✅ Test critical paths first

### Audit Logging Best Practices
1. ✅ Log all authentication events
2. ✅ Log all CRUD operations on sensitive data
3. ✅ Log all exports (PDF, Excel)
4. ✅ Log constraint violations
5. ✅ Log configuration changes
6. ✅ Sanitize sensitive data (passwords, tokens)
7. ✅ Include user context (ID, name, email)
8. ✅ Include request context (IP address, user agent)
9. ✅ Use appropriate severity levels (INFO, WARNING, ERROR)
10. ✅ Implement audit log retention policy

---

## 📚 Additional Resources

### Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [UIVeri5 Documentation](https://github.com/SAP/ui5-uiveri5)
- [OPA5 Documentation](https://ui5.sap.com/#/topic/2696ab50faad458f9b4027ec2f9b884d)

### Audit Logging
- [SOX Compliance](https://www.sec.gov/spotlight/sarbanes-oxley.htm)
- [GDPR Compliance](https://gdpr.eu/)
- [FDA 21 CFR Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)

### SAP CAP
- [CAP Testing Guide](https://cap.cloud.sap/docs/guides/testing)
- [CDS Language Reference](https://cap.cloud.sap/docs/cds/)

---

*Last updated: Current session. For issues or questions, refer to TODOS_23-28_IMPLEMENTATION_COMPLETE.md*
