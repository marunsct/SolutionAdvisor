#!/usr/bin/env node

/**
 * E2E Test Runner
 * 
 * Automated test execution script for end-to-end tests
 * Supports multiple test suites, environments, and reporting
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./test-config');

// Parse command line arguments
const args = process.argv.slice(2);
const options = parseArguments(args);

// Main execution
(async function main() {
    console.log('\n🚀 SAP Clean Core Solution Advisor - E2E Test Runner\n');
    console.log('Configuration:');
    console.log(`  Environment: ${options.environment}`);
    console.log(`  Suite: ${options.suite}`);
    console.log(`  Browser: ${options.browser}`);
    console.log(`  Headless: ${options.headless}`);
    console.log(`  Base URL: ${options.baseUrl}\n`);
    
    try {
        // Prepare test environment
        await prepareEnvironment();
        
        // Execute tests
        const results = await executeTests(options);
        
        // Generate reports
        await generateReports(results);
        
        // Exit with appropriate code
        const exitCode = results.failed > 0 ? 1 : 0;
        console.log(`\n${results.failed === 0 ? '✅' : '❌'} Tests completed: ${results.passed} passed, ${results.failed} failed\n`);
        process.exit(exitCode);
        
    } catch (error) {
        console.error('\n❌ Error executing tests:', error.message);
        process.exit(1);
    }
})();

/**
 * Parse command line arguments
 */
function parseArguments(args) {
    const options = {
        environment: 'local',
        suite: 'all',
        browser: 'chrome',
        headless: true,
        baseUrl: null,
        retries: null
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--env':
            case '-e':
                options.environment = args[++i];
                break;
                
            case '--suite':
            case '-s':
                options.suite = args[++i];
                break;
                
            case '--browser':
            case '-b':
                options.browser = args[++i];
                break;
                
            case '--headless':
                options.headless = args[++i] !== 'false';
                break;
                
            case '--url':
            case '-u':
                options.baseUrl = args[++i];
                break;
                
            case '--retries':
            case '-r':
                options.retries = parseInt(args[++i]);
                break;
                
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
        }
    }
    
    // Apply environment configuration
    const envConfig = config.environments[options.environment] || {};
    options.baseUrl = options.baseUrl || envConfig.baseUrl || config.application.baseUrl;
    options.headless = options.headless !== undefined ? options.headless : envConfig.headless;
    options.retries = options.retries !== null ? options.retries : (envConfig.retries || config.execution.retries);
    
    return options;
}

/**
 * Print help message
 */
function printHelp() {
    console.log(`
SAP Clean Core Solution Advisor - E2E Test Runner

Usage: npm run test:e2e [options]

Options:
  -e, --env <environment>     Test environment (local, ci, staging, production) [default: local]
  -s, --suite <suite>         Test suite to run (all, critical, smoke, regression) [default: all]
  -b, --browser <browser>     Browser to use (chrome, firefox, safari) [default: chrome]
  --headless <true|false>     Run in headless mode [default: true]
  -u, --url <url>             Base URL of application under test
  -r, --retries <number>      Number of retries for failed tests
  -h, --help                  Show this help message

Examples:
  npm run test:e2e                           # Run all tests locally
  npm run test:e2e --suite critical          # Run critical tests only
  npm run test:e2e --env ci --headless true  # Run in CI mode
  npm run test:e2e --suite smoke --url http://localhost:4004

Test Suites:
  all        - All E2E tests (default)
  critical   - Critical path tests (must pass for deployment)
  smoke      - Quick smoke tests
  regression - Full regression test suite
    `);
}

/**
 * Prepare test environment
 */
async function prepareEnvironment() {
    console.log('📦 Preparing test environment...');
    
    // Create output directories
    const dirs = [
        config.reporting.outputDir,
        config.execution.screenshotPath,
        config.execution.videoPath
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`  ✓ Created directory: ${dir}`);
        }
    });
    
    // Check if application is running
    const isRunning = await checkApplicationHealth(options.baseUrl);
    if (!isRunning) {
        console.warn(`  ⚠️  Warning: Application may not be running at ${options.baseUrl}`);
        console.warn('  Please ensure the application is started before running tests.');
    } else {
        console.log(`  ✓ Application is running at ${options.baseUrl}`);
    }
    
    console.log('');
}

/**
 * Check if application is running
 */
async function checkApplicationHealth(baseUrl) {
    return new Promise((resolve) => {
        const http = require('http');
        const url = new URL(baseUrl);
        
        const req = http.get({
            hostname: url.hostname,
            port: url.port || 80,
            path: '/',
            timeout: 5000
        }, (res) => {
            resolve(res.statusCode === 200 || res.statusCode === 302);
        });
        
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

/**
 * Execute tests
 */
async function executeTests(options) {
    console.log('🧪 Executing tests...\n');
    
    const suite = config.suites[options.suite];
    if (!suite) {
        throw new Error(`Unknown test suite: ${options.suite}`);
    }
    
    const results = {
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        tests: []
    };
    
    const startTime = Date.now();
    
    // Execute each test file
    for (const testFile of suite) {
        console.log(`  Running: ${testFile}`);
        const testResult = await runTest(testFile, options);
        
        results.passed += testResult.passed;
        results.failed += testResult.failed;
        results.skipped += testResult.skipped;
        results.tests.push(testResult);
        
        console.log(`    ${testResult.passed} passed, ${testResult.failed} failed, ${testResult.skipped} skipped\n`);
    }
    
    results.duration = Date.now() - startTime;
    
    return results;
}

/**
 * Run single test file
 */
async function runTest(testFile, options) {
    return new Promise((resolve) => {
        const testPath = path.resolve(testFile);
        
        // Check if test file exists
        if (!fs.existsSync(testPath)) {
            console.warn(`    ⚠️  Test file not found: ${testPath}`);
            resolve({ passed: 0, failed: 0, skipped: 1, file: testFile });
            return;
        }
        
        // Determine test runner based on file type
        let command, args;
        
        if (testFile.includes('/test/integration/')) {
            // OPA5 tests - run with karma/qunit
            command = 'npx';
            args = [
                'karma',
                'start',
                'karma.conf.js',
                '--single-run',
                '--browsers', options.headless ? 'ChromeHeadless' : 'Chrome',
                '--files', testPath
            ];
        } else if (testFile.endsWith('.spec.js')) {
            // Jest E2E tests
            command = 'npx';
            args = [
                'jest',
                testPath,
                '--maxWorkers=1',
                '--forceExit',
                '--detectOpenHandles'
            ];
        } else {
            // Default to npm test
            command = 'npm';
            args = ['test', testPath];
        }
        
        // Set environment variables
        const env = {
            ...process.env,
            APP_BASE_URL: options.baseUrl,
            E2E_BROWSER: options.browser,
            E2E_HEADLESS: options.headless.toString(),
            E2E_RETRIES: options.retries.toString()
        };
        
        // Execute test
        const testProcess = spawn(command, args, {
            env,
            stdio: 'pipe'
        });
        
        let output = '';
        
        testProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        testProcess.stderr.on('data', (data) => {
            output += data.toString();
        });
        
        testProcess.on('close', (code) => {
            // Parse test results from output
            const result = parseTestOutput(output, testFile);
            result.exitCode = code;
            result.file = testFile;
            
            resolve(result);
        });
    });
}

/**
 * Parse test output to extract results
 */
function parseTestOutput(output, testFile) {
    const result = {
        passed: 0,
        failed: 0,
        skipped: 0
    };
    
    // Try to parse Jest output
    const jestMatch = output.match(/Tests:\s+(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+total/);
    if (jestMatch) {
        result.failed = parseInt(jestMatch[1]) || 0;
        result.passed = parseInt(jestMatch[2]) || 0;
        return result;
    }
    
    // Try to parse QUnit output
    const qunitMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed/);
    if (qunitMatch) {
        result.passed = parseInt(qunitMatch[1]) || 0;
        result.failed = parseInt(qunitMatch[2]) || 0;
        return result;
    }
    
    // Default: assume passed if no errors
    if (output.includes('PASS') || output.includes('✓')) {
        result.passed = 1;
    } else if (output.includes('FAIL') || output.includes('✗')) {
        result.failed = 1;
    }
    
    return result;
}

/**
 * Generate test reports
 */
async function generateReports(results) {
    console.log('\n📊 Generating test reports...');
    
    const reportDir = config.reporting.outputDir;
    
    // Generate JSON report
    const jsonReport = {
        summary: {
            total: results.passed + results.failed + results.skipped,
            passed: results.passed,
            failed: results.failed,
            skipped: results.skipped,
            duration: results.duration,
            timestamp: new Date().toISOString()
        },
        tests: results.tests,
        environment: options.environment,
        configuration: {
            suite: options.suite,
            browser: options.browser,
            baseUrl: options.baseUrl
        }
    };
    
    const jsonPath = path.join(reportDir, config.reporting.jsonReport);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`  ✓ JSON report: ${jsonPath}`);
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(jsonReport);
    const htmlPath = path.join(reportDir, config.reporting.htmlReport);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`  ✓ HTML report: ${htmlPath}`);
    
    // Generate JUnit XML report (for CI integration)
    const junitReport = generateJUnitReport(jsonReport);
    const junitPath = path.join(reportDir, config.reporting.junitReport);
    fs.writeFileSync(junitPath, junitReport);
    console.log(`  ✓ JUnit report: ${junitPath}`);
}

/**
 * Generate HTML report
 */
function generateHTMLReport(data) {
    const status = data.summary.failed === 0 ? 'PASSED' : 'FAILED';
    const statusColor = data.summary.failed === 0 ? '#4CAF50' : '#F44336';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>E2E Test Report - SAP Clean Core Solution Advisor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid ${statusColor}; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f9f9f9; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
        .metric-label { color: #666; font-size: 14px; text-transform: uppercase; }
        .passed { color: #4CAF50; }
        .failed { color: #F44336; }
        .skipped { color: #FF9800; }
        .status { text-align: center; padding: 20px; background: ${statusColor}; color: white; font-size: 24px; font-weight: bold; border-radius: 6px; margin: 20px 0; }
        .test-list { margin-top: 30px; }
        .test-item { background: #fafafa; margin: 10px 0; padding: 15px; border-radius: 4px; border-left: 4px solid #ddd; }
        .test-item.pass { border-left-color: #4CAF50; }
        .test-item.fail { border-left-color: #F44336; }
        .timestamp { color: #999; font-size: 14px; text-align: right; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 E2E Test Report</h1>
        <p><strong>SAP Clean Core Solution Advisor</strong></p>
        
        <div class="status">${status}</div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${data.summary.total}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${data.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${data.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value skipped">${data.summary.skipped}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(data.summary.duration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>
        
        <h2>Configuration</h2>
        <ul>
            <li><strong>Environment:</strong> ${data.environment}</li>
            <li><strong>Suite:</strong> ${data.configuration.suite}</li>
            <li><strong>Browser:</strong> ${data.configuration.browser}</li>
            <li><strong>Base URL:</strong> ${data.configuration.baseUrl}</li>
        </ul>
        
        <h2>Test Results</h2>
        <div class="test-list">
            ${data.tests.map(test => `
                <div class="test-item ${test.failed > 0 ? 'fail' : 'pass'}">
                    <strong>${test.file}</strong><br/>
                    ✓ ${test.passed} passed, ✗ ${test.failed} failed, ⊘ ${test.skipped} skipped
                </div>
            `).join('')}
        </div>
        
        <p class="timestamp">Generated: ${data.summary.timestamp}</p>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Generate JUnit XML report
 */
function generateJUnitReport(data) {
    const testsuites = `
<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${data.summary.total}" failures="${data.summary.failed}" skipped="${data.summary.skipped}" time="${(data.summary.duration / 1000).toFixed(3)}">
    <testsuite name="E2E Tests" tests="${data.summary.total}" failures="${data.summary.failed}" skipped="${data.summary.skipped}" timestamp="${data.summary.timestamp}">
        ${data.tests.map(test => `
        <testcase name="${test.file}" time="0">
            ${test.failed > 0 ? `<failure message="Test failed">${test.failed} assertions failed</failure>` : ''}
            ${test.skipped > 0 ? `<skipped/>` : ''}
        </testcase>
        `).join('')}
    </testsuite>
</testsuites>
    `.trim();
    
    return testsuites;
}
