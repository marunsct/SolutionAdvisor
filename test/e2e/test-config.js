/**
 * E2E Test Configuration
 * 
 * Configuration for automated end-to-end test execution
 * using OPA5 (One Page Acceptance) framework
 */

module.exports = {
    // Test suite configuration
    suites: {
        // All tests
        all: [
            "test/e2e/wizard-flow.spec.js",
            "app/solutionadvisor/webapp/test/integration/WizardJourney.js",
            "app/solutionadvisor/webapp/test/integration/NavigationJourney.js",
            "app/solutionadvisor/webapp/test/integration/AnalyticsJourney.js"
        ],
        
        // Critical path tests (must pass for deployment)
        critical: [
            "test/e2e/wizard-flow.spec.js",
            "app/solutionadvisor/webapp/test/integration/WizardJourney.js"
        ],
        
        // Smoke tests (quick validation)
        smoke: [
            "app/solutionadvisor/webapp/test/integration/NavigationJourney.js"
        ],
        
        // Regression tests (full suite)
        regression: [
            "test/e2e/wizard-flow.spec.js",
            "app/solutionadvisor/webapp/test/integration/WizardJourney.js",
            "app/solutionadvisor/webapp/test/integration/NavigationJourney.js",
            "app/solutionadvisor/webapp/test/integration/AnalyticsJourney.js"
        ]
    },
    
    // Test execution settings
    execution: {
        // Browser configuration
        browser: process.env.E2E_BROWSER || "chrome",
        headless: process.env.E2E_HEADLESS !== "false", // Default: headless
        
        // Timeouts
        defaultTimeout: 30000, // 30 seconds
        pageLoadTimeout: 60000, // 60 seconds
        
        // Retries
        retries: process.env.E2E_RETRIES ? parseInt(process.env.E2E_RETRIES) : 2,
        
        // Screenshots
        screenshotOnFailure: true,
        screenshotPath: "./test-results/screenshots",
        
        // Video recording
        recordVideo: process.env.E2E_RECORD_VIDEO === "true",
        videoPath: "./test-results/videos"
    },
    
    // Application under test
    application: {
        baseUrl: process.env.APP_BASE_URL || "http://localhost:4004",
        appPath: "/solutionadvisor/webapp",
        
        // Test users
        users: {
            admin: {
                username: process.env.TEST_ADMIN_USER || "admin@test.com",
                password: process.env.TEST_ADMIN_PASS || "Admin123!"
            },
            architect: {
                username: process.env.TEST_ARCHITECT_USER || "architect@test.com",
                password: process.env.TEST_ARCHITECT_PASS || "Architect123!"
            },
            developer: {
                username: process.env.TEST_DEV_USER || "developer@test.com",
                password: process.env.TEST_DEV_PASS || "Developer123!"
            }
        }
    },
    
    // Reporting configuration
    reporting: {
        // Report formats
        formats: ["html", "json", "junit"],
        
        // Output directory
        outputDir: "./test-results",
        
        // Report filenames
        htmlReport: "e2e-test-report.html",
        jsonReport: "e2e-test-results.json",
        junitReport: "e2e-test-results.xml",
        
        // Include screenshots in report
        includeScreenshots: true,
        
        // Include video recordings in report
        includeVideos: false
    },
    
    // Test data
    testData: {
        // Sample project for testing
        project: {
            clientName: "E2E Test Client",
            s4HanaFlavor: "Cloud Public Edition",
            deploymentModel: "Two-Tier",
            complianceRequirements: ["SOX", "GDPR"]
        },
        
        // Sample RICEFW object for testing
        ricefwObject: {
            ricefwId: "R-9999-TST",
            objectType: "Reports",
            objectName: "E2E Test Report",
            objectDescription: "Automated test report object"
        },
        
        // Expected wizard answers (for automation)
        wizardAnswers: {
            "Q1": "Option A",
            "Q2": "Option B",
            "Q3": "Option C"
        }
    },
    
    // OPA5 specific configuration
    opa5: {
        // Auto-wait for UI5 controls
        autoWait: true,
        
        // Timeout for assertions
        timeout: 15,
        
        // Test library (QUnit)
        testLibrary: "qunit",
        
        // Coverage reporting
        coverage: {
            enabled: process.env.E2E_COVERAGE === "true",
            outputDir: "./test-results/coverage"
        }
    },
    
    // Environment-specific overrides
    environments: {
        local: {
            baseUrl: "http://localhost:4004",
            headless: false,
            retries: 0
        },
        
        ci: {
            baseUrl: process.env.CI_APP_URL || "http://localhost:4004",
            headless: true,
            retries: 3,
            recordVideo: true
        },
        
        staging: {
            baseUrl: process.env.STAGING_URL,
            headless: true,
            retries: 2
        },
        
        production: {
            baseUrl: process.env.PRODUCTION_URL,
            headless: true,
            retries: 1,
            // Production tests are read-only
            readOnly: true
        }
    },
    
    // Get active environment configuration
    getEnvironmentConfig: function() {
        const env = process.env.TEST_ENV || "local";
        return {
            ...this.execution,
            ...this.application,
            ...(this.environments[env] || {})
        };
    }
};
