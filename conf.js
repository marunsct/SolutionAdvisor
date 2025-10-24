/**
 * UIVeri5 Configuration
 * End-to-End Test Configuration for Solution Advisor App
 */

exports.config = {
    profile: {
        name: 'integration'
    },
    
    baseUrl: process.env.BASE_URL || 'http://localhost:4004',
    
    specs: [
        './test/e2e/**/*.spec.js'
    ],
    
    browsers: [{
        browserName: 'chrome',
        capabilities: {
            chromeOptions: {
                args: [
                    '--headless',
                    '--disable-gpu',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1920,1080'
                ]
            }
        }
    }],
    
    params: {
        appUrl: '/solutionadvisor/webapp/index.html',
        testUser: 'test-user@example.com',
        testProject: 'E2E-TEST-PROJECT'
    },
    
    auth: {
        'SolutionAdvisor-Form': {
            user: process.env.TEST_USER || 'test-user',
            pass: process.env.TEST_PASS || 'test-pass'
        }
    },
    
    timeouts: {
        getPageTimeout: 30000,
        allScriptsTimeout: 60000,
        defaultTimeoutInterval: 120000
    },
    
    reporters: [
        {
            name: './reporter/screenshotReporter',
            screenshotOnExpectFailure: true,
            screenshotOnExpectSuccess: false,
            takeScreenshot: true,
            screenshotsDir: 'test/e2e/screenshots'
        },
        {
            name: './reporter/junitReporter',
            reportName: 'E2E-Test-Report',
            reportsDir: 'test/e2e/reports'
        }
    ],
    
    connectionConfigs: {
        direct: {
            binaries: {
                chromedriver: {
                    version: 'latest'
                }
            }
        }
    }
};
