# Performance Testing Guide

## Overview

This guide explains how to run and interpret performance tests for the SAP Clean Core Solution Advisor application. The test suite includes:

1. **Load Testing** - Simulates normal user load (50-100 concurrent users)
2. **Stress Testing** - Tests system limits (up to 200 concurrent wizard sessions)
3. **Database Benchmarks** - Validates query performance (target: < 200ms)

## Prerequisites

### For Load & Stress Tests (k6)

Install k6 performance testing tool:

**macOS**:
```bash
brew install k6
```

**Windows**:
```powershell
choco install k6
```

**Linux**:
```bash
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

Verify installation:
```bash
k6 version
```

### For Database Benchmarks

Requires Node.js 18+ (already installed for CAP development).

## Running Tests

### Quick Start (All Tests)

```bash
npm run test:performance
```

This runs all performance tests in sequence:
1. Database benchmarks
2. Load tests
3. Stress tests

**Total runtime: ~25 minutes**

### Individual Test Suites

#### 1. Database Benchmarks (2 minutes)

```bash
npm run test:db-benchmark
```

**What it tests:**
- Analysis list queries with filters
- QuestionFlow navigation
- Scoring calculations (aggregations)
- Analytics queries
- Full-text search performance

**Success criteria:**
- All queries complete in < 200ms
- Index usage verified

**Sample output:**
```
================================================================================
DATABASE PERFORMANCE BENCHMARKS
================================================================================
Target: < 200ms for 10,000 records

✅ PASS | 45.23ms    (target: 200ms)    | Analysis List (Basic) (100 records)
✅ PASS | 87.56ms    (target: 200ms)    | Analysis List (with Filters) (100 records)
✅ PASS | 123.45ms   (target: 200ms)    | Analysis Details (with $expand) (50 records)
✅ PASS | 34.12ms    (target: 200ms)    | Question Flow Navigation (48 records)
✅ PASS | 156.78ms   (target: 200ms)    | Scoring Calculation (Aggregation) (4 records)
✅ PASS | 189.23ms   (target: 200ms)    | Project Statistics (50 records)
✅ PASS | 98.45ms    (target: 200ms)    | RICEFW Type Breakdown (24 records)
✅ PASS | 67.89ms    (target: 200ms)    | Clean Core Level Distribution (4 records)
✅ PASS | 101.23ms   (target: 200ms)    | Decision Path Queries (100 records)
✅ PASS | 143.56ms   (target: 200ms)    | Full-Text Search (100 records)

================================================================================
BENCHMARK SUMMARY
================================================================================
Total Benchmarks:  10
Passed:            10 (100%)
Failed:            0
Average Duration:  104.75ms
Fastest Query:     34.12ms
Slowest Query:     189.23ms

✅ All benchmarks passed!
```

#### 2. Load Testing (5 minutes)

```bash
npm run test:load
```

**What it tests:**
- 50 concurrent users navigating wizard
- 100 concurrent users running analytics queries
- Bulk analysis creation (ramping to 100 creations/sec)

**Success criteria:**
- Error rate < 1%
- 95th percentile response time < 2 seconds
- Wizard completion < 5 seconds (95th percentile)
- Analytics queries < 1 second (95th percentile)

**Sample output:**
```
running (5m00.0s), 000/050 VUs, 12543 complete and 0 interrupted iterations
wizard_users       ✓ [======================================] 50 VUs  5m0s
analytics_users    ✓ [======================================] 100 VUs 3m0s
bulk_creation      ✓ [======================================] 100/sec 5m0s

     ✓ Create project status 201
     ✓ Start wizard status 200
     ✓ Submit answer status 200
     ✓ Complete wizard has results
     
     checks.........................: 99.87% ✓ 125430  ✗ 163
     errors.........................: 0.13%  ✓ 163
     http_req_duration..............: avg=421ms  p(95)=1234ms p(99)=2145ms
     wizard_completion_time.........: avg=3456ms p(95)=4321ms p(99)=6789ms
     analytics_query_time...........: avg=234ms  p(95)=567ms  p(99)=891ms
     analysis_creation_time.........: avg=987ms  p(95)=1456ms p(99)=2341ms

✓ All thresholds passed
```

#### 3. Stress Testing (20 minutes)

```bash
npm run test:stress
```

**What it tests:**
- Ramp up to 200 concurrent wizard sessions
- Session state isolation (no data leakage between users)
- Memory leak detection (long-running sessions)

**Success criteria:**
- Error rate < 5% (higher tolerance under stress)
- Session state isolation >= 99%
- No critical memory leaks
- 90th percentile response time < 5 seconds

**Sample output:**
```
running (20m00.0s), 000/250 VUs, 15234 complete and 0 interrupted iterations
concurrent_wizards     ✓ [======================================] ramping 20m0s
state_isolation_test   ✓ [======================================] 100 VUs  5m0s
memory_leak_detection  ✓ [======================================] 20 VUs   15m0s

     ✓ Wizard started
     ✓ Session created
     ✓ State contains correct unique value
     ✓ No cross-contamination from other sessions
     
     checks.........................: 98.76% ✓ 234567  ✗ 2987
     errors.........................: 1.24%  ✓ 2987
     session_state_isolation_success: 99.95% ✓ 9995    ✗ 5
     wizard_session_duration........: avg=8934ms p(95)=13456ms p(99)=21234ms
     concurrent_wizard_sessions.....: max=198
     session_conflicts..............: 12 total
     memory_leak_warnings...........: 3 total

✓ All thresholds passed
```

## Customizing Tests

### Environment Variables

Control test behavior via environment variables:

#### Load Tests

```bash
# Change base URL (for testing different environments)
export BASE_URL=https://staging.cleancore.local
npm run test:load

# Adjust thinking time between requests (default: 1 second)
export THINK_TIME=2
npm run test:load

# Combine multiple options
BASE_URL=http://localhost:4004 THINK_TIME=0.5 npm run test:load
```

#### Stress Tests

```bash
# Adjust maximum concurrent sessions (default: 200)
export MAX_SESSIONS=300
npm run test:stress

# Test different environment
BASE_URL=https://staging.cleancore.local MAX_SESSIONS=150 npm run test:stress
```

#### Database Benchmarks

Edit `test/performance/db-benchmark.js` to customize:

```javascript
class DatabaseBenchmark {
    constructor() {
        this.targetTime = 200; // Change target response time (ms)
        this.recordCount = 10000; // Change target record count
    }
}
```

### Modifying Test Scenarios

#### Add New Load Test Scenario

Edit `test/performance/load-test.js`:

```javascript
export const options = {
    scenarios: {
        // ... existing scenarios ...
        
        // Add new scenario
        custom_scenario: {
            executor: 'constant-vus',
            vus: 25,
            duration: '2m',
            exec: 'customFlow',
            tags: { scenario: 'custom' }
        }
    }
};

// Implement scenario function
export function customFlow() {
    // Your custom test logic here
}
```

#### Add New Database Benchmark

Edit `test/performance/db-benchmark.js`:

```javascript
async runAll() {
    // ... existing benchmarks ...
    
    await this.benchmarkCustomQuery(db, Analyses);
}

async benchmarkCustomQuery(db, Analyses) {
    const name = 'Custom Query Description';
    const query = SELECT.from(Analyses)
        .where({ /* your conditions */ })
        .limit(100);

    const startTime = performance.now();
    const results = await db.run(query);
    const duration = performance.now() - startTime;

    this.recordResult(name, duration, results.length, query);
}
```

## Performance Optimization Tips

### If Database Benchmarks Fail

1. **Check Index Usage**:
   ```sql
   -- HANA
   EXPLAIN PLAN FOR SELECT ...;
   
   -- SQLite (development)
   EXPLAIN QUERY PLAN SELECT ...;
   ```

2. **Verify Indexes Exist** (see `db/indexes.cds`):
   - Analyses: `recommendedLevel`, `technicalDebtScore`, `objectType_code`
   - QuestionFlows: `objectType_code`, `isActive`, `sequenceNumber`
   - DecisionPaths: `finalDecision`, `createdAt`

3. **Optimize Queries**:
   - Reduce `$expand` depth
   - Add `$select` to fetch only needed fields
   - Use pagination (`$skip`, `$top`)

4. **HANA-Specific**:
   - Consider calculation views for complex aggregations
   - Use table partitioning for large tables (> 1M records)

### If Load Tests Fail

1. **Increase Server Resources**:
   - Scale up: More CPU/RAM for app server
   - Scale out: Add more app instances

2. **Enable Caching**:
   - Verify cache-service.js is enabled
   - Check cache hit rates in logs

3. **Database Connection Pooling**:
   - Increase pool size in `package.json` cds.requires.db
   - Monitor connection usage

4. **Optimize Business Logic**:
   - Profile slow service handlers
   - Reduce database round trips
   - Use batch operations

### If Stress Tests Fail

1. **Session State Isolation Failures**:
   - Check for global variables in service handlers
   - Verify tenant context enforcement
   - Review session storage (Redis vs. in-memory)

2. **Memory Leaks**:
   - Monitor heap usage: `node --inspect srv/server.js`
   - Use Chrome DevTools for heap snapshots
   - Check for event listener leaks

3. **High Error Rates**:
   - Review application logs for errors
   - Check database connection limits
   - Verify XSUAA token expiration handling

## Continuous Integration

### GitHub Actions (Planned)

Add to `.github/workflows/performance.yml`:

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install k6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Install dependencies
        run: npm install
      
      - name: Start application
        run: npm run start-local &
        env:
          NODE_ENV: test
      
      - name: Wait for app to be ready
        run: npx wait-on http://localhost:4004 -t 60000
      
      - name: Run database benchmarks
        run: npm run test:db-benchmark
      
      - name: Run load tests
        run: npm run test:load
        env:
          BASE_URL: http://localhost:4004
      
      - name: Run stress tests
        run: npm run test:stress
        env:
          BASE_URL: http://localhost:4004
          MAX_SESSIONS: 100 # Lower for CI
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-test-results
          path: |
            load-test-results.json
            stress-test-results.json
```

## Interpreting Results

### Performance Metrics Glossary

- **VUs (Virtual Users)**: Concurrent users simulated by k6
- **Iterations**: Number of times a scenario function completes
- **http_req_duration**: Time from request start to response received
- **p(95)**: 95th percentile - 95% of requests complete faster than this
- **p(99)**: 99th percentile - 99% of requests complete faster than this
- **checks**: Test assertions (should be > 95% passing)
- **errors**: Percentage of failed requests (should be < 1% for load, < 5% for stress)

### Success Criteria Summary

| Test Type | Metric | Target |
|-----------|--------|--------|
| Database Benchmarks | Query duration | < 200ms |
| Load Test | Error rate | < 1% |
| Load Test | 95th percentile | < 2s |
| Load Test | Wizard completion | < 5s |
| Stress Test | Error rate | < 5% |
| Stress Test | Session isolation | >= 99% |
| Stress Test | 90th percentile | < 5s |

### When to Escalate

**Critical (Stop Deployment)**:
- Database benchmark failures > 50%
- Load test error rate > 5%
- Session state isolation < 95%
- Memory leaks detected in stress test

**Warning (Investigate Before Deployment)**:
- Database benchmark failures 20-50%
- Load test error rate 1-5%
- Stress test p(95) > 10s
- Session conflicts > 100

**Informational (Monitor)**:
- Some benchmarks slightly over target
- Stress test error rate 2-5%
- Load test p(99) > 5s

## Troubleshooting

### k6 Installation Issues

**macOS: Command not found**
```bash
brew tap grafana/k6
brew install k6
```

**Windows: Chocolatey not installed**
Install Chocolatey first:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Test Execution Issues

**Error: Cannot connect to BASE_URL**
- Ensure application is running: `npm run start-local`
- Check BASE_URL is correct: `echo $BASE_URL`
- Verify firewall allows connections

**Error: Database not found**
- Run `cds deploy` to initialize database
- Check `solutionadvisor.db` exists in project root

**Error: XSUAA authentication failed**
- Use hybrid profile for local testing: `cds watch --profile hybrid`
- Or disable auth: Set `cds.requires.auth.kind` to `dummy` in `package.json`

## Next Steps

- **Baseline Performance**: Run tests on fresh deployment to establish baseline
- **Regression Testing**: Run tests before each release to detect performance regressions
- **Capacity Planning**: Use stress test results to determine infrastructure needs
- **Monitoring**: Set up Application Performance Monitoring (APM) in production

---

**Questions?** Contact the Performance Engineering team or check logs in `test/performance/results/`.
