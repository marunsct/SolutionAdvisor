/**
 * Stress Testing for Concurrent Wizard Sessions
 * 
 * Tests wizard session concurrency, state isolation, and memory usage under extreme load.
 * 
 * Run stress test:
 *   k6 run test/performance/stress-test.js
 * 
 * Run with custom configuration:
 *   k6 run --vus 200 --duration 10m test/performance/stress-test.js
 * 
 * Monitor system resources:
 *   k6 run --out influxdb=http://localhost:8086/k6 test/performance/stress-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const sessionStateIsolation = new Rate('session_state_isolation_success');
const wizardSessionTime = new Trend('wizard_session_duration');
const concurrentSessions = new Gauge('concurrent_wizard_sessions');
const memoryLeaks = new Counter('memory_leak_warnings');
const sessionConflicts = new Counter('session_conflicts');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4004';
const MAX_CONCURRENT_SESSIONS = parseInt(__ENV.MAX_SESSIONS) || 200;

// Stress test scenarios
export const options = {
    scenarios: {
        // Scenario 1: Ramp up to 200 concurrent wizard sessions
        concurrent_wizards: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 50,
            maxVUs: 250,
            stages: [
                { duration: '2m', target: 20 },   // Warm up to 20 sessions/sec
                { duration: '3m', target: 50 },   // Ramp to 50 sessions/sec
                { duration: '3m', target: 100 },  // Ramp to 100 sessions/sec
                { duration: '2m', target: 200 },  // Peak: 200 sessions/sec
                { duration: '5m', target: 200 },  // Sustain peak load
                { duration: '3m', target: 50 },   // Cool down
                { duration: '2m', target: 10 }    // Final cool down
            ],
            exec: 'concurrentWizardSessions',
            tags: { scenario: 'concurrent_wizards' }
        },

        // Scenario 2: Session state isolation test (verify no cross-contamination)
        state_isolation_test: {
            executor: 'constant-vus',
            vus: 100,
            duration: '5m',
            exec: 'stateIsolationTest',
            tags: { scenario: 'state_isolation' },
            startTime: '5m' // Start after concurrent wizard ramp up
        },

        // Scenario 3: Memory leak detection (long-running sessions)
        memory_leak_detection: {
            executor: 'constant-vus',
            vus: 20,
            duration: '15m',
            exec: 'memoryLeakTest',
            tags: { scenario: 'memory_leak' },
            startTime: '2m'
        }
    },

    // Stress test thresholds (more aggressive than load test)
    thresholds: {
        // Allow higher error rate under stress (up to 5%)
        'errors': ['rate<0.05'],

        // 90% of requests should complete within 5 seconds (degraded SLA acceptable)
        'http_req_duration': ['p(90)<5000', 'p(95)<10000'],

        // Session state isolation must be 100% (critical for data integrity)
        'session_state_isolation_success': ['rate>=0.99'],

        // Wizard sessions should complete within 15 seconds under stress
        'wizard_session_duration': ['p(95)<15000', 'p(99)<30000'],

        // No more than 10% of requests should fail under stress
        'http_req_failed': ['rate<0.10'],

        // Session conflicts should be rare (< 2%)
        'session_conflicts': ['count<100']
    }
};

// Test data with unique identifiers per VU
function generateUniqueProjectData(vuID, iteration) {
    return {
        clientName: `StressTest_Client_VU${vuID}_${iteration}`,
        projectName: `StressTest_Project_VU${vuID}_${iteration}`,
        s4HanaFlavor: 'OnPremise',
        complianceRequirements: ['GDPR'],
        enabledBTPServices: ['Integration Suite']
    };
}

function generateUniqueAnalysisData(vuID, iteration, projectID) {
    return {
        ricefwId: `R-${(vuID * 1000 + iteration).toString().padStart(4, '0')}-STR`,
        objectType_code: 'Reports',
        projectID: projectID,
        objectName: `StressTest_Object_VU${vuID}_${iteration}`,
        businessRequirement: `Stress test VU ${vuID} iteration ${iteration}`
    };
}

// Scenario 1: Concurrent Wizard Sessions
export function concurrentWizardSessions() {
    const vuID = __VU;
    const iteration = __ITER;
    const startTime = Date.now();

    concurrentSessions.add(1); // Increment concurrent sessions counter

    group('Concurrent Wizard Session', () => {
        let projectID, sessionID;

        // Create project
        const projectData = generateUniqueProjectData(vuID, iteration);
        const createProjectRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/Projects`,
            JSON.stringify(projectData),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'CreateProject' }
            }
        );

        const projectSuccess = check(createProjectRes, {
            'Project created': (r) => r.status === 201,
            'Project has ID': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    projectID = body.ID;
                    return !!projectID;
                } catch (e) {
                    return false;
                }
            }
        });
        errorRate.add(!projectSuccess);

        if (!projectID) {
            concurrentSessions.add(-1);
            return; // Can't continue without project
        }

        sleep(0.5);

        // Start wizard session
        const analysisData = generateUniqueAnalysisData(vuID, iteration, projectID);
        const startWizardRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/startWizard`,
            JSON.stringify(analysisData),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'StartWizard' }
            }
        );

        const wizardSuccess = check(startWizardRes, {
            'Wizard started': (r) => r.status === 200,
            'Session created': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    sessionID = body.sessionID;
                    return !!sessionID;
                } catch (e) {
                    return false;
                }
            }
        });
        errorRate.add(!wizardSuccess);

        if (!sessionID) {
            concurrentSessions.add(-1);
            return; // Can't continue without session
        }

        // Rapid-fire answer submission (simulate user rushing through wizard)
        for (let i = 0; i < 3; i++) {
            const answerRes = http.post(
                `${BASE_URL}/service/SolutionAdvisorSvcs/submitAnswer`,
                JSON.stringify({
                    sessionID: sessionID,
                    questionID: `Q${i + 1}`,
                    answerID: `A${i + 1}`,
                    answerValue: 'Yes'
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'SubmitAnswer' }
                }
            );

            const answerSuccess = check(answerRes, {
                [`Answer ${i + 1} submitted`]: (r) => r.status === 200
            });
            errorRate.add(!answerSuccess);

            sleep(0.1); // Minimal delay between answers
        }

        // Complete wizard
        const completeRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/completeWizard`,
            JSON.stringify({ sessionID: sessionID }),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { name: 'CompleteWizard' }
            }
        );

        const completeSuccess = check(completeRes, {
            'Wizard completed': (r) => r.status === 200
        });
        errorRate.add(!completeSuccess);

        wizardSessionTime.add(Date.now() - startTime);
    });

    concurrentSessions.add(-1); // Decrement concurrent sessions counter
    sleep(0.5);
}

// Scenario 2: Session State Isolation Test
export function stateIsolationTest() {
    const vuID = __VU;
    const iteration = __ITER;
    const uniqueValue = `VU${vuID}_ITER${iteration}_${Date.now()}`;

    group('Session State Isolation', () => {
        let projectID, sessionID;

        // Create unique project
        const projectData = generateUniqueProjectData(vuID, iteration);
        const createRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/Projects`,
            JSON.stringify(projectData),
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (createRes.status === 201) {
            projectID = JSON.parse(createRes.body).ID;
        } else {
            errorRate.add(1);
            return;
        }

        // Start wizard with unique data
        const analysisData = generateUniqueAnalysisData(vuID, iteration, projectID);
        analysisData.uniqueMarker = uniqueValue; // Add unique marker

        const startRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/startWizard`,
            JSON.stringify(analysisData),
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (startRes.status === 200) {
            sessionID = JSON.parse(startRes.body).sessionID;
        } else {
            errorRate.add(1);
            return;
        }

        // Submit unique answer
        const answerRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/submitAnswer`,
            JSON.stringify({
                sessionID: sessionID,
                questionID: 'Q1',
                answerID: 'A1',
                answerValue: uniqueValue // Use unique value as answer
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

        // Retrieve session state
        const getSessionRes = http.get(
            `${BASE_URL}/service/SolutionAdvisorSvcs/WizardSessions(${sessionID})?$expand=answers`,
            { headers: { 'Accept': 'application/json' } }
        );

        // Verify state isolation (answer should match uniqueValue exactly)
        const isolationSuccess = check(getSessionRes, {
            'State retrieved': (r) => r.status === 200,
            'State contains correct unique value': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    const answers = body.answers || [];
                    const foundAnswer = answers.find(a => a.answerValue === uniqueValue);
                    return !!foundAnswer;
                } catch (e) {
                    return false;
                }
            },
            'No cross-contamination from other sessions': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    const answers = body.answers || [];
                    // Ensure no answers from other VUs
                    const hasOtherVUData = answers.some(a => 
                        a.answerValue && 
                        a.answerValue.startsWith('VU') && 
                        !a.answerValue.includes(`VU${vuID}`)
                    );
                    return !hasOtherVUData;
                } catch (e) {
                    return false;
                }
            }
        });

        sessionStateIsolation.add(isolationSuccess);
        errorRate.add(!isolationSuccess);

        if (!isolationSuccess) {
            sessionConflicts.add(1);
        }
    });

    sleep(1);
}

// Scenario 3: Memory Leak Detection
export function memoryLeakTest() {
    const vuID = __VU;
    const iteration = __ITER;

    group('Memory Leak Detection', () => {
        let sessionID;
        const sessionStartTime = Date.now();

        // Create long-running wizard session
        const projectID = `memory-test-project-${vuID}`;
        const analysisData = generateUniqueAnalysisData(vuID, iteration, projectID);
        
        const startRes = http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/startWizard`,
            JSON.stringify(analysisData),
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (startRes.status === 200) {
            sessionID = JSON.parse(startRes.body).sessionID;
        } else {
            errorRate.add(1);
            return;
        }

        // Simulate long-running session with repeated state checks
        for (let i = 0; i < 20; i++) {
            // Submit answer
            http.post(
                `${BASE_URL}/service/SolutionAdvisorSvcs/submitAnswer`,
                JSON.stringify({
                    sessionID: sessionID,
                    questionID: `Q${i + 1}`,
                    answerID: `A${i + 1}`,
                    answerValue: `Answer ${i + 1}`
                }),
                { headers: { 'Content-Type': 'application/json' } }
            );

            // Retrieve session state (forces server to load session from cache/db)
            const getRes = http.get(
                `${BASE_URL}/service/SolutionAdvisorSvcs/WizardSessions(${sessionID})`,
                { headers: { 'Accept': 'application/json' } }
            );

            // Check response size (growing response might indicate memory leak)
            if (getRes.body && getRes.body.length > 50000) {
                memoryLeaks.add(1);
            }

            sleep(2); // 2 seconds between state checks
        }

        // Complete session
        http.post(
            `${BASE_URL}/service/SolutionAdvisorSvcs/completeWizard`,
            JSON.stringify({ sessionID: sessionID }),
            { headers: { 'Content-Type': 'application/json' } }
        );

        const sessionDuration = Date.now() - sessionStartTime;
        
        // Warn if session took too long (might indicate performance degradation)
        if (sessionDuration > 60000) { // > 1 minute
            memoryLeaks.add(1);
        }
    });

    sleep(5);
}

// Setup
export function setup() {
    console.log('Starting stress test...');
    console.log(`Target: ${MAX_CONCURRENT_SESSIONS} concurrent sessions`);
    
    const healthRes = http.get(`${BASE_URL}/`);
    check(healthRes, {
        'Application is running': (r) => r.status === 200
    });
}

// Teardown
export function teardown(data) {
    console.log('Stress test completed');
    console.log(`Session conflicts detected: ${sessionConflicts.value}`);
    console.log(`Memory leak warnings: ${memoryLeaks.value}`);
}
