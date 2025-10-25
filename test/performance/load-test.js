/**
 * Load Testing Scenarios
 * 
 * Tests application performance under various load conditions using k6.
 * 
 * Install k6:
 *   brew install k6              (macOS)
 *   choco install k6             (Windows)
 *   sudo apt install k6          (Linux)
 * 
 * Run tests:
 *   k6 run test/performance/load-test.js
 * 
 * Run with custom VUs:
 *   k6 run --vus 100 --duration 5m test/performance/load-test.js
 * 
 * Generate HTML report:
 *   k6 run --out json=load-test-results.json test/performance/load-test.js
 *   k6-reporter load-test-results.json
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const wizardCompletionTime = new Trend('wizard_completion_time');
const analyticsQueryTime = new Trend('analytics_query_time');
const analysisCreationTime = new Trend('analysis_creation_time');
const apiCalls = new Counter('api_calls');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4004';
const THINK_TIME = parseFloat(__ENV.THINK_TIME) || 1; // seconds between requests

// Load test scenarios
export const options = {
    scenarios: {
        // Scenario 1: Normal load - 50 concurrent users navigating wizard
        wizard_users: {
            executor: 'constant-vus',
            vus: 50,
            duration: '5m',
            exec: 'wizardFlow',
            tags: { scenario: 'wizard' }
        },

        // Scenario 2: Analytics queries - 100 concurrent users
        analytics_users: {
            executor: 'constant-vus',
            vus: 100,
            duration: '3m',
            exec: 'analyticsFlow',
            tags: { scenario: 'analytics' },
            startTime: '30s' // Start after wizard users
        },

        // Scenario 3: Bulk analysis creation - ramping load
        bulk_creation: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 50,
            maxVUs: 100,
            stages: [
                { duration: '1m', target: 10 },  // Warm up to 10 creations/sec
                { duration: '2m', target: 50 },  // Ramp up to 50 creations/sec
                { duration: '1m', target: 100 }, // Peak load: 100 creations/sec
                { duration: '1m', target: 10 }   // Cool down
            ],
            exec: 'bulkAnalysisCreation',
            tags: { scenario: 'bulk_creation' },
            startTime: '1m'
        }
    },

    // Performance thresholds (SLA)
    thresholds: {
        // Overall error rate must be below 1%
        'errors': ['rate<0.01'],

        // 95% of requests should complete within 2 seconds
        'http_req_duration': ['p(95)<2000'],

        // Wizard completion should be under 5 seconds (95th percentile)
        'wizard_completion_time': ['p(95)<5000', 'p(99)<8000'],

        // Analytics queries should be under 1 second (95th percentile)
        'analytics_query_time': ['p(95)<1000', 'p(99)<2000'],

        // Analysis creation should be under 3 seconds (95th percentile)
        'analysis_creation_time': ['p(95)<3000', 'p(99)<5000'],

        // No more than 5% of requests should fail
        'http_req_failed': ['rate<0.05']
    }
};

// Test data generators
function generateProjectData() {
    const timestamp = Date.now();
    return {
        clientName: `LoadTest_Client_${timestamp}`,
        projectName: `LoadTest_Project_${timestamp}`,
        s4HanaFlavor: ['OnPremise', 'CloudPrivate', 'CloudPublic'][Math.floor(Math.random() * 3)],
        complianceRequirements: ['GDPR'],
        enabledBTPServices: ['Integration Suite', 'Extension Suite']
    };
}

function generateAnalysisData(projectID) {
    const timestamp = Date.now();
    const objectTypes = ['Reports', 'Interfaces', 'Conversions', 'Enhancements', 'Forms', 'Workflows'];
    
    return {
        ricefwId: `R-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-TST`,
        objectType_code: objectTypes[Math.floor(Math.random() * objectTypes.length)],
        projectID: projectID,
        objectName: `LoadTest_Object_${timestamp}`,
        businessRequirement: 'Performance testing load generation'
    };
}

// Scenario 1: Wizard Flow (End-to-end wizard navigation)
export function wizardFlow() {
    const startTime = Date.now();

    group('Wizard Flow', () => {
        // Step 1: Create project
        let projectID;
        group('Create Project', () => {
            const projectData = generateProjectData();
            const createProjectRes = http.post(
                `${BASE_URL}/service/SolutionAdvisorSvcs/Projects`,
                JSON.stringify(projectData),
                {
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'CreateProject' }
                }
            );

            apiCalls.add(1);
            const success = check(createProjectRes, {
                'Create project status 201': (r) => r.status === 201,
                'Create project has ID': (r) => {
                    const body = JSON.parse(r.body);
                    projectID = body.ID;
                    return !!projectID;
                }
            });
            errorRate.add(!success);
        });

        sleep(THINK_TIME);

        // Step 2: Start wizard session
        let sessionID;
        group('Start Wizard', () => {
            const analysisData = generateAnalysisData(projectID);
            const startWizardRes = http.post(
                `${BASE_URL}/service/SolutionAdvisorSvcs/startWizard`,
                JSON.stringify(analysisData),
                {
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'StartWizard' }
                }
            );

            apiCalls.add(1);
            const success = check(startWizardRes, {
                'Start wizard status 200': (r) => r.status === 200,
                'Start wizard has session': (r) => {
                    const body = JSON.parse(r.body);
                    sessionID = body.sessionID;
                    return !!sessionID;
                }
            });
            errorRate.add(!success);
        });

        sleep(THINK_TIME);

        // Step 3: Answer wizard questions (simulate 5 questions)
        for (let i = 0; i < 5; i++) {
            group(`Answer Question ${i + 1}`, () => {
                const answerRes = http.post(
                    `${BASE_URL}/service/SolutionAdvisorSvcs/submitAnswer`,
                    JSON.stringify({
                        sessionID: sessionID,
                        questionID: `Q${i + 1}`,
                        answerID: `A${i + 1}`,
                        answerValue: ['Yes', 'No'][Math.floor(Math.random() * 2)]
                    }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        tags: { name: 'SubmitAnswer' }
                    }
                );

                apiCalls.add(1);
                const success = check(answerRes, {
                    'Submit answer status 200': (r) => r.status === 200
                });
                errorRate.add(!success);
            });

            sleep(THINK_TIME / 2); // Faster thinking between questions
        }

        // Step 4: Complete wizard
        group('Complete Wizard', () => {
            const completeRes = http.post(
                `${BASE_URL}/service/SolutionAdvisorSvcs/completeWizard`,
                JSON.stringify({ sessionID: sessionID }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'CompleteWizard' }
                }
            );

            apiCalls.add(1);
            const success = check(completeRes, {
                'Complete wizard status 200': (r) => r.status === 200,
                'Complete wizard has results': (r) => {
                    const body = JSON.parse(r.body);
                    return !!body.recommendedLevel;
                }
            });
            errorRate.add(!success);
        });

        // Record total wizard completion time
        wizardCompletionTime.add(Date.now() - startTime);
    });

    sleep(THINK_TIME);
}

// Scenario 2: Analytics Flow (Read-heavy queries)
export function analyticsFlow() {
    group('Analytics Flow', () => {
        // Query 1: Get project statistics
        group('Project Statistics', () => {
            const statsRes = http.get(
                `${BASE_URL}/service/SolutionAdvisorSvcs/getProjectStatistics`,
                { tags: { name: 'ProjectStats' } }
            );

            apiCalls.add(1);
            const startTime = Date.now();
            const success = check(statsRes, {
                'Project stats status 200': (r) => r.status === 200,
                'Project stats has data': (r) => {
                    const body = JSON.parse(r.body);
                    return Array.isArray(body.value);
                }
            });
            analyticsQueryTime.add(Date.now() - startTime);
            errorRate.add(!success);
        });

        sleep(THINK_TIME);

        // Query 2: Get scoring trends
        group('Scoring Trends', () => {
            const trendsRes = http.get(
                `${BASE_URL}/service/SolutionAdvisorSvcs/getScoringTrends`,
                { tags: { name: 'ScoringTrends' } }
            );

            apiCalls.add(1);
            const startTime = Date.now();
            const success = check(trendsRes, {
                'Scoring trends status 200': (r) => r.status === 200
            });
            analyticsQueryTime.add(Date.now() - startTime);
            errorRate.add(!success);
        });

        sleep(THINK_TIME);

        // Query 3: Get clean core distribution
        group('Clean Core Distribution', () => {
            const distRes = http.get(
                `${BASE_URL}/service/SolutionAdvisorSvcs/Analyses?$select=recommendedLevel&$top=100`,
                { tags: { name: 'CleanCoreDistribution' } }
            );

            apiCalls.add(1);
            const startTime = Date.now();
            const success = check(distRes, {
                'Distribution status 200': (r) => r.status === 200
            });
            analyticsQueryTime.add(Date.now() - startTime);
            errorRate.add(!success);
        });

        sleep(THINK_TIME);

        // Query 4: Get RICEFW type breakdown
        group('RICEFW Type Breakdown', () => {
            const ricefwRes = http.get(
                `${BASE_URL}/service/SolutionAdvisorSvcs/Analyses?$select=objectType_code&$top=100`,
                { tags: { name: 'RICEFWBreakdown' } }
            );

            apiCalls.add(1);
            const startTime = Date.now();
            const success = check(ricefwRes, {
                'RICEFW breakdown status 200': (r) => r.status === 200
            });
            analyticsQueryTime.add(Date.now() - startTime);
            errorRate.add(!success);
        });
    });

    sleep(THINK_TIME);
}

// Scenario 3: Bulk Analysis Creation (Write-heavy operations)
export function bulkAnalysisCreation() {
    const startTime = Date.now();

    group('Bulk Analysis Creation', () => {
        // Create a project (reuse existing or create new)
        const projectID = 'bulk-test-project-' + (__VU % 10); // 10 shared projects

        // Create analysis
        const analysisData = generateAnalysisData(projectID);
        const createRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/Analyses`,
            JSON.stringify(analysisData),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'BulkCreateAnalysis' }
            }
        );

        apiCalls.add(1);
        const success = check(createRes, {
            'Bulk create status 201': (r) => r.status === 201 || r.status === 200
        });
        analysisCreationTime.add(Date.now() - startTime);
        errorRate.add(!success);
    });

    sleep(THINK_TIME / 4); // Minimal think time for bulk operations
}

// Health check (run once at start)
export function setup() {
    const healthRes = http.get(`${BASE_URL}/`);
    check(healthRes, {
        'Application is running': (r) => r.status === 200
    });
}

// Cleanup (run once at end)
export function teardown(data) {
    console.log('Load test completed');
    console.log(`Total API calls: ${apiCalls.value}`);
}
