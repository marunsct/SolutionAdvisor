# E2E Test Automation

Automated end-to-end test execution for SAP Clean Core Solution Advisor.

## Quick Start

```bash
# Run all E2E tests locally
npm run test:e2e

# Run critical path tests only
npm run test:e2e:critical

# Run smoke tests
npm run test:e2e:smoke

# Run in CI mode (headless)
npm run test:e2e:ci
```

## Test Suites

| Suite | Description | Tests Included |
|-------|-------------|----------------|
| **all** | Complete test suite | All E2E and integration tests |
| **critical** | Critical path tests | Wizard flow, analysis creation |
| **smoke** | Quick validation | Navigation, basic functionality |
| **regression** | Full regression | All tests for release validation |

## Test Environments

| Environment | Base URL | Headless | Retries |
|------------|----------|----------|---------|
| **local** | http://localhost:4004 | No | 0 |
| **ci** | CI_APP_URL env var | Yes | 3 |
| **staging** | STAGING_URL env var | Yes | 2 |
| **production** | PRODUCTION_URL env var | Yes | 1 |

## Command Line Options

```bash
node test/e2e/run-tests.js [options]

Options:
  -e, --env <environment>     Test environment (local, ci, staging, production)
  -s, --suite <suite>         Test suite (all, critical, smoke, regression)
  -b, --browser <browser>     Browser (chrome, firefox, safari)
  --headless <true|false>     Run in headless mode
  -u, --url <url>             Base URL override
  -r, --retries <number>      Number of retries for failed tests
  -h, --help                  Show help
```

## Examples

```bash
# Run critical tests locally with visible browser
npm run test:e2e:critical -- --headless false

# Run all tests against staging
npm run test:e2e -- --env staging

# Run smoke tests with custom URL
npm run test:e2e:smoke -- --url http://myapp.example.com

# Run in CI with 3 retries
npm run test:e2e:ci -- --retries 3
```

## Test Reports

After test execution, reports are generated in `./test-results/`:

- **e2e-test-report.html** - HTML report with visual summary
- **e2e-test-results.json** - JSON report for programmatic access
- **e2e-test-results.xml** - JUnit XML for CI integration
- **screenshots/** - Screenshots of failures
- **videos/** - Video recordings (if enabled)

## Configuration

Edit `test/e2e/test-config.js` to customize:

- Test suites and file paths
- Execution settings (timeouts, retries)
- Application URLs
- Test users and credentials
- Reporting options
- Environment-specific overrides

## Environment Variables

```bash
# Application URL
export APP_BASE_URL=http://localhost:4004

# Browser settings
export E2E_BROWSER=chrome
export E2E_HEADLESS=true
export E2E_RETRIES=2

# Test environment
export TEST_ENV=local

# Test users
export TEST_ADMIN_USER=admin@test.com
export TEST_ADMIN_PASS=Admin123!

# Recording options
export E2E_RECORD_VIDEO=false
export E2E_COVERAGE=false
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start application
        run: npm run start &
        
      - name: Wait for application
        run: npx wait-on http://localhost:4004
      
      - name: Run E2E tests
        run: npm run test:e2e:ci
      
      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: e2e-test-reports
          path: test-results/
```

### Jenkins Example

```groovy
pipeline {
    agent any
    
    stages {
        stage('E2E Tests') {
            steps {
                sh 'npm install'
                sh 'npm run start &'
                sh 'npm run test:e2e:ci'
            }
        }
    }
    
    post {
        always {
            junit 'test-results/e2e-test-results.xml'
            publishHTML([
                reportDir: 'test-results',
                reportFiles: 'e2e-test-report.html',
                reportName: 'E2E Test Report'
            ])
        }
    }
}
```

## Troubleshooting

### Tests fail with "Application not running"

Ensure the application is started before running tests:

```bash
# Terminal 1: Start application
npm run start-local

# Terminal 2: Run tests
npm run test:e2e
```

### Browser not found

Install Chrome or specify different browser:

```bash
# Install Chrome (Ubuntu/Debian)
sudo apt-get install google-chrome-stable

# Or use Firefox
npm run test:e2e -- --browser firefox
```

### Timeout errors

Increase timeouts in `test/e2e/test-config.js`:

```javascript
execution: {
    defaultTimeout: 60000,  // Increase from 30s to 60s
    pageLoadTimeout: 120000 // Increase from 60s to 120s
}
```

### Tests pass locally but fail in CI

Check environment differences:
- Network latency
- Browser versions
- Screen resolution
- Authentication tokens

Enable video recording to debug CI failures:

```bash
export E2E_RECORD_VIDEO=true
npm run test:e2e:ci
```

## Best Practices

1. **Run critical tests before deployment**
   ```bash
   npm run test:e2e:critical
   ```

2. **Use smoke tests for quick validation**
   ```bash
   npm run test:e2e:smoke
   ```

3. **Run full regression suite before releases**
   ```bash
   npm run test:e2e:regression
   ```

4. **Review test reports after failures**
   - Check HTML report for visual summary
   - Review screenshots for UI issues
   - Watch videos for interaction problems

5. **Keep tests independent**
   - Each test should setup its own data
   - Tests should not depend on execution order
   - Clean up test data after execution

## Support

For issues or questions:
- Check logs in `test-results/`
- Review test configuration in `test/e2e/test-config.js`
- Run tests with `--headless false` to see browser interaction
- Enable video recording for visual debugging

---

**Last Updated:** October 25, 2025  
**Version:** 1.0.0
