# SAP Clean Core Solution Advisor - Phase 4 Implementation TODO List

**Phase 4: Testing & Production Hardening**  
**Duration:** 2 weeks  
**Target Completion:** Secure, scalable, maintainable application with comprehensive test coverage and production readiness  
**Dependencies:** All previous phases completed

---

## 1. Implement Unit Tests (50+ tests, 4 days)

### 1.1 Set Up Jest Testing Framework (4 hours)
**File:** `package.json`  
**Task:** Configure Jest for Node.js backend testing.

**Required Changes:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@sap/cds": "^7.0.0",
    "supertest": "^6.3.3"
  },
  "jest": {
    "testEnvironment": "node",
    "collectCoverageFrom": [
      "srv/**/*.js",
      "!srv/**/node_modules/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

**File:** `jest.config.js`  
**Task:** Create Jest configuration for CDS integration.

**Required Content:**
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/srv/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'srv/**/*.js',
    '!srv/**/node_modules/**',
    '!srv/server.js'
  ]
};
```

**File:** `test/setup.js`  
**Task:** Initialize CDS for testing.

**Required Content:**
```javascript
const cds = require('@sap/cds');

beforeAll(async () => {
  await cds.connect.to('db'); // Connect to test database
});

afterAll(async () => {
  await cds.disconnect();
});
```

**Acceptance Criteria:**
- Jest configured for CDS applications
- Test database connection established
- Coverage thresholds set at 80%

### 1.2 Test Decision Engine Service (8 hours)
**File:** `srv/lib/test/decision-engine.test.js`  
**Task:** Create comprehensive unit tests for decision engine logic.

**Required Content:**
```javascript
const DecisionEngine = require('../decision-engine');

describe('DecisionEngine', () => {
  let decisionEngine;

  beforeEach(() => {
    decisionEngine = new DecisionEngine();
  });

  describe('getNextQuestion', () => {
    test('should return next question for valid answer', async () => {
      // Mock session and question data
      const mockSession = { ID: 'session-1', currentQuestionId: 'Q-001' };
      const mockQuestion = {
        ID: 'Q-001',
        navigationLogic: JSON.stringify({
          'Yes': { nextQuestion: 'Q-002' },
          'No': { finalAnswer: 'A' }
        })
      };

      // Mock CDS SELECT
      cds.run = jest.fn()
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([mockQuestion])
        .mockResolvedValueOnce([{
          ID: 'Q-002',
          questionText: 'Next question?',
          possibleAnswers: JSON.stringify(['Option 1', 'Option 2'])
        }]);

      const result = await decisionEngine.getNextQuestion('session-1', 'Yes');

      expect(result.questionId).toBe('Q-002');
      expect(result.questionText).toBe('Next question?');
      expect(result.answers).toEqual(['Option 1', 'Option 2']);
    });

    test('should return final recommendation for terminal node', async () => {
      // Similar setup but with finalAnswer
      const result = await decisionEngine.getNextQuestion('session-1', 'No');
      expect(result.finalRecommendation).toBeDefined();
      expect(result.level).toMatch(/^[A-D]$/);
    });

    test('should throw error for invalid answer', async () => {
      await expect(decisionEngine.getNextQuestion('session-1', 'Invalid'))
        .rejects.toThrow('Invalid answer ID');
    });

    test('should handle malformed JSON navigation logic', async () => {
      // Mock question with invalid JSON
      cds.run.mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([{
          ...mockQuestion,
          navigationLogic: 'invalid json'
        }]);

      await expect(decisionEngine.getNextQuestion('session-1', 'Yes'))
        .rejects.toThrow('Navigation logic parsing failed');
    });
  });

  describe('shouldSkipQuestion', () => {
    test('should skip question based on project config', async () => {
      const projectConfig = { s4hanaFlavor: 'Cloud' };
      const question = {
        conditionalLogic: JSON.stringify({
          s4hanaFlavor: 'Cloud'
        })
      };

      const result = await decisionEngine.shouldSkipQuestion('Q-001', projectConfig);
      expect(result).toBe(true);
    });

    test('should not skip question when conditions not met', async () => {
      const projectConfig = { s4hanaFlavor: 'OnPremise' };
      const question = {
        conditionalLogic: JSON.stringify({
          s4hanaFlavor: 'Cloud'
        })
      };

      const result = await decisionEngine.shouldSkipQuestion('Q-001', projectConfig);
      expect(result).toBe(false);
    });
  });
});
```

**Acceptance Criteria:**
- 15+ unit tests for decision engine
- Tests cover happy path, error cases, edge cases
- Mocked CDS interactions
- JSON parsing validation

### 1.3 Test Scoring Service (8 hours)
**File:** `srv/lib/test/scoring-service.test.js`  
**Task:** Test all scoring formula implementations.

**Required Content:**
```javascript
const ScoringService = require('../scoring-service');

describe('ScoringService', () => {
  let scoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('calculateTechnicalDebt', () => {
    test('should calculate TDS correctly', async () => {
      const mockDecisionPath = [
        { recommendedLevel: 'A', complexityFactor: 1.0 },
        { recommendedLevel: 'B', complexityFactor: 1.5 },
        { recommendedLevel: 'C', complexityFactor: 2.0 }
      ];

      cds.run.mockResolvedValue(mockDecisionPath);

      const result = await scoringService.calculateTechnicalDebt('analysis-1');

      // Expected: ((0*1.0) + (1*1.5) + (3*2.0)) / 3 * 100 = (0 + 1.5 + 6) / 3 * 100 = 2.5 * 100 = 250
      // But should be clamped to 0-100 range
      expect(result).toBe(100); // Assuming clamping logic
    });

    test('should handle empty decision path', async () => {
      cds.run.mockResolvedValue([]);
      const result = await scoringService.calculateTechnicalDebt('analysis-1');
      expect(result).toBe(0);
    });
  });

  describe('calculateCloudReadiness', () => {
    test('should calculate CRS with level weights', async () => {
      const mockDecisionPath = [
        { recommendedLevel: 'A' }, { recommendedLevel: 'A' },
        { recommendedLevel: 'B' }, { recommendedLevel: 'C' }
      ];

      cds.run.mockResolvedValue(mockDecisionPath);

      const result = await scoringService.calculateCloudReadiness('analysis-1');

      // Expected: (2 + 0.5*1) / 4 * 100 = 2.5 / 4 * 100 = 62.5
      expect(result).toBe(62.5);
    });
  });

  describe('calculateUpgradeImpact', () => {
    test('should calculate UIS based on code lines', async () => {
      const mockDecisionPath = [
        { recommendedLevel: 'A', customCodeLines: 100, totalCodeLines: 1000 },
        { recommendedLevel: 'D', customCodeLines: 500, totalCodeLines: 1000 }
      ];

      cds.run.mockResolvedValue(mockDecisionPath);

      const result = await scoringService.calculateUpgradeImpact('analysis-1');

      // Expected: ((0*100) + (5*500)) / (1000 + 1000) * 100 = 2500 / 2000 * 100 = 125
      // Should be clamped to 100
      expect(result).toBe(100);
    });
  });

  describe('calculateCompositeHealth', () => {
    test('should calculate CHS using weighted formula', async () => {
      const scores = {
        technicalDebtScore: 25,
        cloudReadinessScore: 75,
        upgradeImpactScore: 40
      };

      const result = scoringService.calculateCompositeHealth(scores);

      // Expected: (100-25)*0.4 + 75*0.3 + (100-40)*0.3 = 75*0.4 + 75*0.3 + 60*0.3 = 30 + 22.5 + 18 = 70.5
      expect(result).toBe(70.5);
    });
  });
});
```

**Acceptance Criteria:**
- 12+ unit tests for scoring formulas
- Tests validate mathematical correctness
- Edge cases (empty data, extreme values)
- Score clamping to 0-100 range

### 1.4 Test Constraints and Examples Services (6 hours)
**File:** `srv/lib/test/constraints-service.test.js` and `examples-service.test.js`  
**Task:** Test backend services for data retrieval and filtering.

**Sample for ConstraintsService:**
```javascript
describe('ConstraintsService', () => {
  describe('getRelevantConstraints', () => {
    test('should filter constraints by object type', async () => {
      const mockConstraints = [
        { objectType: 'R', constraintType: 'Performance' },
        { objectType: 'I', constraintType: 'Integration' }
      ];

      cds.run.mockResolvedValue(mockConstraints);

      const result = await constraintsService.getRelevantConstraints('R', 'Cloud', 'High');

      expect(result).toHaveLength(1);
      expect(result[0].objectType).toBe('R');
    });

    test('should include deployment-specific constraints', async () => {
      // Test Cloud vs OnPremise filtering
    });
  });
});
```

**Acceptance Criteria:**
- 8+ tests for constraints service
- 8+ tests for examples service
- Query filtering validation
- Empty result handling

### 1.5 Test Analytics Service (4 hours)
**File:** `srv/lib/test/analytics-service.test.js`  
**Task:** Test dashboard data aggregation.

**Required Content:**
```javascript
describe('AnalyticsService', () => {
  describe('getAnalyticsData', () => {
    test('should aggregate KPI data across analyses', async () => {
      const mockAnalyses = [
        { technicalDebtScore: 20, cloudReadinessScore: 80, upgradeImpactScore: 30 },
        { technicalDebtScore: 30, cloudReadinessScore: 70, upgradeImpactScore: 50 }
      ];

      cds.run.mockResolvedValue(mockAnalyses);

      const result = await analyticsService.getAnalyticsData();

      expect(result.technicalDebtScore).toBe(25); // Average
      expect(result.cloudReadinessScore).toBe(75);
      expect(result.upgradeImpactScore).toBe(40);
    });
  });
});
```

**Acceptance Criteria:**
- 6+ tests for analytics aggregation
- Correct averaging and data preparation
- Chart data formatting validation

---

## 2. Implement Integration Tests (20+ tests, 3 days)

### 2.1 Set Up Integration Test Framework (4 hours)
**File:** `test/integration/setup.js`  
**Task:** Configure Supertest for API testing.

**Required Content:**
```javascript
const cds = require('@sap/cds');
const supertest = require('supertest');

let app;

beforeAll(async () => {
  app = await cds.server();
  await cds.deploy('db/data'); // Deploy test data
});

afterAll(async () => {
  await cds.disconnect();
});

global.request = supertest(app);
global.cds = cds;
```

**File:** `test/integration/test-data.sql`  
**Task:** Create test data for integration tests.

**Required Content:**
```sql
-- Insert test project, analyses, etc.
INSERT INTO sd_ProjectConfiguration (ID, clientName, s4hanaFlavor) VALUES ('test-project', 'Test Client', 'Cloud');
INSERT INTO sd_CleanCoreAnalysis (ID, project_ID, ricefwId, objectType, recommendedLevel) VALUES ('test-analysis', 'test-project', 'R-0001-TEST', 'R', 'A');
-- More test data...
```

**Acceptance Criteria:**
- Supertest configured for CDS server
- Test database with known data
- Cleanup between tests

### 2.2 Test OData Service Endpoints (8 hours)
**File:** `test/integration/odata-api.test.js`  
**Task:** Test CRUD operations and custom actions.

**Required Content:**
```javascript
describe('OData API Integration Tests', () => {
  describe('Wizard Actions', () => {
    test('POST /startWizard should create session and return first question', async () => {
      const response = await request
        .post('/service/SolutionAdvisorSvcs/startWizard')
        .send({
          projectId: 'test-project',
          objectType: 'R',
          ricefwId: 'R-0001-TEST'
        })
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('question');
      expect(response.body.question.questionId).toMatch(/^R-/);
    });

    test('POST /submitAnswer should progress wizard', async () => {
      // First start wizard
      const startResponse = await request
        .post('/service/SolutionAdvisorSvcs/startWizard')
        .send({ projectId: 'test-project', objectType: 'R', ricefwId: 'R-0001-TEST' });

      const sessionId = startResponse.body.sessionId;

      // Submit answer
      const submitResponse = await request
        .post('/service/SolutionAdvisorSvcs/submitAnswer')
        .send({ sessionId, answerId: 'Yes' })
        .expect(200);

      expect(submitResponse.body).toHaveProperty('question');
      // Verify session updated in database
    });

    test('GET /getRelevantConstraints should return filtered constraints', async () => {
      const response = await request
        .get('/service/SolutionAdvisorSvcs/getRelevantConstraints')
        .query({ objectType: 'R', deploymentType: 'Cloud', volumeLevel: 'High' })
        .expect(200);

      expect(Array.isArray(response.body.value)).toBe(true);
      response.body.value.forEach(constraint => {
        expect(constraint.objectType).toBe('R');
      });
    });
  });

  describe('Analysis CRUD', () => {
    test('GET /CleanCoreAnalysis should return analyses', async () => {
      const response = await request
        .get('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
        .expect(200);

      expect(response.body.value).toBeDefined();
      expect(response.body.value.length).toBeGreaterThan(0);
    });

    test('POST /CleanCoreAnalysis should create analysis', async () => {
      const newAnalysis = {
        project_ID: 'test-project',
        ricefwId: 'I-0002-TEST',
        objectType: 'I',
        recommendedLevel: 'B'
      };

      const response = await request
        .post('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
        .send(newAnalysis)
        .expect(201);

      expect(response.body.ID).toBeDefined();
      // Verify in database
    });
  });
});
```

**Acceptance Criteria:**
- 15+ integration tests for OData endpoints
- Tests cover all custom actions
- Database state verification
- Error response validation

### 2.3 Test Authorization and Security (4 hours)
**File:** `test/integration/security.test.js`  
**Task:** Test role-based access control.

**Required Content:**
```javascript
describe('Security Integration Tests', () => {
  test('should enforce tenant isolation', async () => {
    // Test that tenant A cannot access tenant B data
    const tenantARequest = request
      .get('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .set('x-tenant-id', 'tenant-a');

    const tenantBRequest = request
      .get('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .set('x-tenant-id', 'tenant-b');

    const [responseA, responseB] = await Promise.all([
      tenantARequest.expect(200),
      tenantBRequest.expect(200)
    ]);

    // Verify different data returned
    expect(responseA.body.value).not.toEqual(responseB.body.value);
  });

  test('should enforce role-based restrictions', async () => {
    // Test Architect can create but Developer cannot delete
  });
});
```

**Acceptance Criteria:**
- 5+ security integration tests
- Tenant isolation validation
- RBAC enforcement testing

### 2.4 Test Data Consistency (4 hours)
**File:** `test/integration/data-consistency.test.js`  
**Task:** Test referential integrity and business rules.

**Required Content:**
```javascript
describe('Data Consistency Tests', () => {
  test('should maintain referential integrity', async () => {
    // Test foreign key constraints
    await expect(request
      .post('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .send({ project_ID: 'nonexistent-project' })
    ).rejects.toThrow(); // Should fail due to FK constraint
  });

  test('should validate RICEFW ID format', async () => {
    // Test regex validation
    await expect(request
      .post('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .send({ ricefwId: 'INVALID-FORMAT' })
    ).rejects.toThrow();
  });
});
```

**Acceptance Criteria:**
- 5+ data consistency tests
- Foreign key validation
- Business rule enforcement

---

## 3. Implement UI Tests (15+ tests, 2 days)

### 3.1 Set Up OPA5 Testing Framework (4 hours)
**File:** `webapp/test/integration/Opa5Test.qunit.js`  
**Task:** Configure OPA5 for UI testing.

**Required Content:**
```javascript
sap.ui.define([
  "sap/ui/test/Opa5",
  "sd/solutionadvisor/test/integration/pages/Common",
  "sd/solutionadvisor/test/integration/pages/Wizard",
  "sd/solutionadvisor/test/integration/pages/AnalysesList"
], function(Opa5, Common, Wizard, AnalysesList) {
  "use strict";

  Opa5.extendConfig({
    arrangements: new Common(),
    viewNamespace: "sd.solutionadvisor.view.",
    autoWait: true
  });

  // Test journeys
  Opa5.createPageObjects({
    onTheWizardPage: Wizard,
    onTheAnalysesListPage: AnalysesList
  });
});
```

**File:** `webapp/test/integration/pages/Common.js`  
**Task:** Common page object for shared functionality.

**Required Content:**
```javascript
sap.ui.define([
  "sap/ui/test/Opa5"
], function(Opa5) {
  "use strict";

  return Opa5.extend("sd.solutionadvisor.test.integration.pages.Common", {
    iStartMyApp: function() {
      return this.iStartMyUIComponent({
        componentConfig: {
          name: "sd.solutionadvisor",
          manifestFirst: true
        }
      });
    },

    iNavigateTo: function(sRoute) {
      return this.waitFor({
        success: function() {
          this.getRouter().navTo(sRoute);
        }
      });
    }
  });
});
```

**Acceptance Criteria:**
- OPA5 configured for Fiori Elements
- Page objects created
- Test runner integrated

### 3.2 Test Wizard User Journey (6 hours)
**File:** `webapp/test/integration/WizardJourney.qunit.js`  
**Task:** Test complete wizard flow.

**Required Content:**
```javascript
sap.ui.define([
  "sap/ui/test/opaQunit",
  "./Opa5Test.qunit"
], function(opaTest) {
  "use strict";

  opaTest("Should complete wizard journey", function(Given, When, Then) {
    // Start app and navigate to wizard
    Given.iStartMyApp();

    When.onTheWizardPage.iEnterProjectDetails("Test Project", "Cloud");
    Then.onTheWizardPage.iShouldSeeProjectDetailsEntered();

    When.onTheWizardPage.iEnterObjectDetails("R-0001-TEST", "Test Report", "Operational reporting");
    Then.onTheWizardPage.iShouldSeeObjectDetailsEntered();

    // Answer questions dynamically
    When.onTheWizardPage.iAnswerQuestion("Yes");
    Then.onTheWizardPage.iShouldSeeNextQuestion();

    // Continue through decision tree
    When.onTheWizardPage.iAnswerQuestion("High");
    When.onTheWizardPage.iAnswerQuestion("Standard");

    // Verify final recommendation
    Then.onTheWizardPage.iShouldSeeFinalRecommendation("Level A");

    // Test constraints display
    Then.onTheWizardPage.iShouldSeeConstraintsPanel();
    Then.onTheWizardPage.iShouldSeeConstraintsLoaded();

    // Test examples display
    Then.onTheWizardPage.iShouldSeeExamplesPanel();
    Then.onTheWizardPage.iShouldSeeExamplesLoaded();
  });
});
```

**File:** `webapp/test/integration/pages/Wizard.js`  
**Task:** Wizard page object with actions and assertions.

**Required Content:**
```javascript
sap.ui.define([
  "sap/ui/test/Opa5",
  "sap/ui/test/actions/Press",
  "sap/ui/test/actions/EnterText"
], function(Opa5, Press, EnterText) {
  "use strict";

  return Opa5.extend("sd.solutionadvisor.test.integration.pages.Wizard", {
    iEnterProjectDetails: function(projectName, flavor) {
      return this.waitFor({
        id: "projectSelect",
        actions: new EnterText({ text: projectName }),
        success: function() {
          this.waitFor({
            id: "flavorSelect",
            actions: new EnterText({ text: flavor })
          });
        }
      });
    },

    iShouldSeeProjectDetailsEntered: function() {
      return this.waitFor({
        id: "projectSelect",
        success: function(oSelect) {
          Opa5.assert.ok(oSelect.getValue(), "Project details entered");
        }
      });
    },

    iAnswerQuestion: function(answer) {
      return this.waitFor({
        controlType: "sap.m.RadioButton",
        properties: { text: answer },
        actions: new Press()
      });
    },

    iShouldSeeNextQuestion: function() {
      return this.waitFor({
        id: "questionText",
        success: function(oText) {
          Opa5.assert.ok(oText.getText(), "Next question displayed");
        }
      });
    },

    iShouldSeeFinalRecommendation: function(expectedLevel) {
      return this.waitFor({
        id: "finalRecommendation",
        success: function(oText) {
          Opa5.assert.strictEqual(oText.getText(), expectedLevel, "Correct final recommendation");
        }
      });
    },

    iShouldSeeConstraintsPanel: function() {
      return this.waitFor({
        id: "constraintsPanel",
        success: function() {
          Opa5.assert.ok(true, "Constraints panel visible");
        }
      });
    },

    iShouldSeeConstraintsLoaded: function() {
      return this.waitFor({
        id: "constraintsList",
        success: function(oList) {
          Opa5.assert.ok(oList.getItems().length > 0, "Constraints loaded");
        }
      });
    }
  });
});
```

**Acceptance Criteria:**
- 8+ UI tests for wizard journey
- Tests cover complete user flow
- Assertions for dynamic content loading

### 3.3 Test Analysis Management (4 hours)
**File:** `webapp/test/integration/AnalysisManagement.qunit.js`  
**Task:** Test CRUD operations in analysis list/details.

**Required Content:**
```javascript
opaTest("Should manage analyses", function(Given, When, Then) {
  Given.iStartMyApp();

  // Navigate to analyses list
  When.onTheAnalysesListPage.iNavigateToAnalyses();

  // Create new analysis
  When.onTheAnalysesListPage.iCreateNewAnalysis();
  Then.onTheAnalysesListPage.iShouldSeeAnalysisInList();

  // Open analysis details
  When.onTheAnalysesListPage.iOpenAnalysisDetails();
  Then.onTheAnalysisDetailsPage.iShouldSeeAnalysisData();

  // Test flowchart display
  Then.onTheAnalysisDetailsPage.iShouldSeeFlowchart();
  Then.onTheAnalysisDetailsPage.iShouldSeeFlowchartRendered();
});
```

**Acceptance Criteria:**
- 5+ UI tests for analysis management
- CRUD operation validation
- Flowchart rendering verification

---

## 4. Implement E2E Tests (10 tests, 2 days)

### 4.1 Set Up UIVeri5 Framework (4 hours)
**File:** `webapp/test/e2e/conf.js`  
**Task:** Configure UIVeri5 for end-to-end testing.

**Required Content:**
```javascript
exports.config = {
  profile: 'integration',
  baseUrl: 'http://localhost:4004',
  specs: ['webapp/test/e2e/specs/**/*.spec.js'],

  capabilities: [{
    browserName: 'chrome',
    chromeOptions: {
      args: ['--headless', '--disable-gpu']
    }
  }],

  framework: 'jasmine',
  jasmineNodeOpts: {
    defaultTimeoutInterval: 90000
  }
};
```

**File:** `webapp/test/e2e/pages/WizardPage.js`  
**Task:** Page object for wizard E2E tests.

**Required Content:**
```javascript
class WizardPage {
  get projectSelect() { return $('#projectSelect'); }
  get objectTypeSelect() { return $('#objectTypeSelect'); }
  get ricefwIdInput() { return $('#ricefwIdInput'); }
  get nextButton() { return $('#nextButton'); }

  async startWizard(project, objectType, ricefwId) {
    await this.projectSelect.setValue(project);
    await this.objectTypeSelect.selectByVisibleText(objectType);
    await this.ricefwIdInput.setValue(ricefwId);
    await this.nextButton.click();
  }

  async answerQuestion(answer) {
    const radioButton = $(`//sap.m.RadioButton[text()="${answer}"]`);
    await radioButton.click();
    await this.nextButton.click();
  }

  async getCurrentQuestion() {
    return await $('#questionText').getText();
  }

  async getFinalRecommendation() {
    return await $('#finalRecommendation').getText();
  }
}

module.exports = WizardPage;
```

**Acceptance Criteria:**
- UIVeri5 configured for Chrome headless
- Page objects created
- Test data setup

### 4.2 Test Complete User Journeys (12 hours)
**File:** `webapp/test/e2e/specs/complete-journey.spec.js`  
**Task:** Test end-to-end user scenarios.

**Required Content:**
```javascript
const WizardPage = require('../pages/WizardPage');
const AnalysesPage = require('../pages/AnalysesPage');

describe('Complete User Journey', () => {
  const wizardPage = new WizardPage();
  const analysesPage = new AnalysesPage();

  beforeEach(async () => {
    await browser.url('/');
    // Login if needed
  });

  it('should complete full analysis workflow', async () => {
    // Navigate to wizard
    await analysesPage.navigateToWizard();

    // Complete wizard
    await wizardPage.startWizard('Test Project', 'Reports', 'R-0001-TEST');

    // Answer all questions (mocking decision tree)
    await wizardPage.answerQuestion('Yes');
    await wizardPage.answerQuestion('High');
    await wizardPage.answerQuestion('Standard');

    // Verify final recommendation
    const recommendation = await wizardPage.getFinalRecommendation();
    expect(recommendation).toBe('Level A');

    // Save analysis
    await wizardPage.saveAnalysis();

    // Verify in analyses list
    await analysesPage.navigateToAnalyses();
    const analysisExists = await analysesPage.analysisExists('R-0001-TEST');
    expect(analysisExists).toBe(true);

    // Open analysis details
    await analysesPage.openAnalysis('R-0001-TEST');

    // Verify scoring display
    const tdScore = await analysesPage.getTechnicalDebtScore();
    expect(tdScore).toBeGreaterThan(0);

    // Test flowchart export
    await analysesPage.exportFlowchart('PNG');
    // Verify file downloaded
  });

  it('should handle draft save and resume', async () => {
    // Start wizard
    await wizardPage.startWizard('Test Project', 'Interfaces', 'I-0001-TEST');

    // Answer some questions
    await wizardPage.answerQuestion('Yes');

    // Save draft
    await wizardPage.saveDraft('My Draft');

    // Navigate away and back
    await analysesPage.navigateToAnalyses();
    await analysesPage.resumeDraft('My Draft');

    // Verify state restored
    const currentQuestion = await wizardPage.getCurrentQuestion();
    expect(currentQuestion).toBeDefined();
  });

  it('should display constraints and examples', async () => {
    await wizardPage.startWizard('Test Project', 'Reports', 'R-0001-TEST');

    // Check constraints panel
    const constraintsVisible = await wizardPage.constraintsPanelVisible();
    expect(constraintsVisible).toBe(true);

    const constraintsCount = await wizardPage.getConstraintsCount();
    expect(constraintsCount).toBeGreaterThan(0);

    // Check examples panel
    const examplesVisible = await wizardPage.examplesPanelVisible();
    expect(examplesVisible).toBe(true);

    const examplesCount = await wizardPage.getExamplesCount();
    expect(examplesCount).toBeGreaterThan(0);
  });
});
```

**Acceptance Criteria:**
- 10+ E2E tests covering complete journeys
- Tests include draft save/resume
- Constraints and examples display validation
- File export verification

---

## 5. Implement Audit Logging (1 day)

### 5.1 Create Audit Service (4 hours)
**File:** `srv/lib/audit-service.js`  
**Task:** Implement comprehensive audit logging.

**Required Content:**
```javascript
const cds = require('@sap/cds');

class AuditService {
  async logUserAction(userId, action, resource, details) {
    await INSERT.into('sd_AuditLog').entries({
      userId,
      action,
      resource,
      details: JSON.stringify(details),
      timestamp: new Date(),
      ipAddress: this._getClientIP(),
      userAgent: this._getUserAgent()
    });
  }

  async logDataAccess(userId, operation, entity, recordId) {
    await this.logUserAction(userId, 'DATA_ACCESS', `${entity}:${recordId}`, {
      operation,
      entity,
      recordId
    });
  }

  async logDataModification(userId, operation, entity, recordId, oldValues, newValues) {
    await this.logUserAction(userId, 'DATA_MODIFICATION', `${entity}:${recordId}`, {
      operation,
      entity,
      recordId,
      changes: this._calculateChanges(oldValues, newValues)
    });
  }

  async logAuthentication(userId, success, details) {
    await this.logUserAction(userId, 'AUTHENTICATION', 'USER_LOGIN', {
      success,
      ...details
    });
  }

  _calculateChanges(oldValues, newValues) {
    const changes = {};
    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          from: oldValues[key],
          to: newValues[key]
        };
      }
    }
    return changes;
  }
}

module.exports = AuditService;
```

**Acceptance Criteria:**
- Audit service logs all required events
- Structured JSON details
- IP and user agent capture

### 5.2 Integrate Audit Logging in Services (4 hours)
**File:** `srv/service.js`  
**Task:** Add audit logging to all operations.

**Required Changes:**
```javascript
const AuditService = require('./lib/audit-service');
const auditService = new AuditService();

module.exports = async (srv) => {
  // Before/After hooks for audit logging
  srv.before('CREATE', 'CleanCoreAnalysis', async (req) => {
    req.data.createdBy = req.user.id;
  });

  srv.after('CREATE', 'CleanCoreAnalysis', async (req, result) => {
    await auditService.logDataModification(
      req.user.id,
      'CREATE',
      'CleanCoreAnalysis',
      result.ID,
      {},
      result
    );
  });

  srv.before('UPDATE', 'CleanCoreAnalysis', async (req) => {
    // Store old values for comparison
    const oldRecord = await SELECT.one.from('sd_CleanCoreAnalysis').where({ ID: req.data.ID });
    req._oldValues = oldRecord;
  });

  srv.after('UPDATE', 'CleanCoreAnalysis', async (req, result) => {
    await auditService.logDataModification(
      req.user.id,
      'UPDATE',
      'CleanCoreAnalysis',
      result.ID,
      req._oldValues,
      result
    );
  });

  // Similar for DELETE operations
  srv.after('DELETE', 'CleanCoreAnalysis', async (req) => {
    await auditService.logDataModification(
      req.user.id,
      'DELETE',
      'CleanCoreAnalysis',
      req.data.ID,
      req._oldValues || {},
      {}
    );
  });

  // Custom action logging
  srv.before('startWizard', async (req) => {
    await auditService.logUserAction(
      req.user.id,
      'START_WIZARD',
      `Project:${req.data.projectId}`,
      req.data
    );
  });

  srv.after('submitAnswer', async (req, result) => {
    await auditService.logUserAction(
      req.user.id,
      'SUBMIT_ANSWER',
      `Session:${req.data.sessionId}`,
      { answerId: req.data.answerId }
    );
  });
};
```

**Acceptance Criteria:**
- All CRUD operations audited
- Custom actions logged
- Before/after hooks capture changes

### 5.3 Create Audit Log Entity (2 hours)
**File:** `db/schema.cds`  
**Task:** Add audit log entity.

**Required Changes:**
```cds
entity AuditLog : cuid, managed {
  userId      : String(36);
  action      : String(50); // AUTHENTICATION, DATA_ACCESS, DATA_MODIFICATION, USER_ACTION
  resource    : String(200); // Entity:ID or descriptive string
  details     : LargeString; // JSON string with additional info
  ipAddress   : String(45);
  userAgent   : String(500);
  timestamp   : Timestamp @cds.on.insert: $now;
}
```

**Acceptance Criteria:**
- Audit log entity defined
- Proper field types for audit data

---

## 6. Validate Multi-Tenancy (1 day)

### 6.1 Test Tenant Isolation (4 hours)
**File:** `test/integration/multi-tenancy.test.js`  
**Task:** Verify tenant data isolation.

**Required Content:**
```javascript
describe('Multi-Tenancy Tests', () => {
  test('should isolate tenant data in all entities', async () => {
    // Create data for tenant A
    await request
      .post('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .set('x-tenant-id', 'tenant-a')
      .send({ project_ID: 'project-a', ricefwId: 'R-0001-A' })
      .expect(201);

    // Create data for tenant B
    await request
      .post('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .set('x-tenant-id', 'tenant-b')
      .send({ project_ID: 'project-b', ricefwId: 'R-0001-B' })
      .expect(201);

    // Verify tenant A cannot see tenant B data
    const responseA = await request
      .get('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .set('x-tenant-id', 'tenant-a')
      .expect(200);

    const responseB = await request
      .get('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
      .set('x-tenant-id', 'tenant-b')
      .expect(200);

    expect(responseA.body.value).toHaveLength(1);
    expect(responseB.body.value).toHaveLength(1);
    expect(responseA.body.value[0].ricefwId).toBe('R-0001-A');
    expect(responseB.body.value[0].ricefwId).toBe('R-0001-B');
  });

  test('should enforce tenant-specific master data', async () => {
    // Test QuestionFlow tenant override
    // Test tenant-specific constraints/examples
  });
});
```

**Acceptance Criteria:**
- 5+ multi-tenancy tests
- Data isolation validation
- Cross-tenant access prevention

### 6.2 Test Tenant Provisioning (4 hours)
**File:** `srv/lib/tenant-provisioning.js`  
**Task:** Implement tenant onboarding logic.

**Required Content:**
```javascript
const cds = require('@sap/cds');

class TenantProvisioning {
  async onSubscribe(tenantId) {
    // Copy master data to tenant schema
    await this._copyMasterData(tenantId, 'QuestionFlow');
    await this._copyMasterData(tenantId, 'PerformanceThreshold');
    await this._copyMasterData(tenantId, 'RealWorldExample');
    await this._copyMasterData(tenantId, 'CleanCoreLevels');
    await this._copyMasterData(tenantId, 'ObjectTypes');

    // Initialize tenant-specific data
    await this._initializeTenantData(tenantId);
  }

  async _copyMasterData(tenantId, entityName) {
    const masterData = await SELECT.from(`sd_${entityName}`);
    // Insert into tenant schema (handled by CAP MTX)
    await INSERT.into(`sd_${entityName}`).entries(masterData);
  }

  async _initializeTenantData(tenantId) {
    // Create default project or welcome data
    await INSERT.into('sd_ProjectConfiguration').entries({
      ID: `welcome-${tenantId}`,
      clientName: 'Welcome Project',
      s4hanaFlavor: 'Cloud',
      tenant: tenantId
    });
  }
}

module.exports = TenantProvisioning;
```

**Acceptance Criteria:**
- Tenant provisioning service implemented
- Master data copied on subscribe
- Tenant-specific initialization

---

## 7. Security Refinement (1 day)

### 7.1 Implement Field-Level Authorization (4 hours)
**File:** `srv/service.js`  
**Task:** Add attribute-based access control.

**Required Changes:**
```cds
// In schema.cds
entity CleanCoreAnalysis : cuid, managed {
  // ...
  @restrict: [
    { grant: '*', to: 'Admin' },
    { grant: ['READ', 'CREATE', 'UPDATE'], to: 'Architect', where: 'createdBy = $user' },
    { grant: 'READ', to: 'Developer' }
  ]
  sensitiveField : String(100) @readonly; // Only certain roles can see
}

// In service.js
srv.before('READ', 'CleanCoreAnalysis', async (req) => {
  if (req.user.roles.includes('Developer')) {
    // Remove sensitive fields for developers
    req.query.columns = req.query.columns.filter(col =>
      !['sensitiveField'].includes(col)
    );
  }
});
```

**Acceptance Criteria:**
- Field-level restrictions implemented
- Role-based field visibility

### 7.2 Enhance RBAC Configuration (4 hours)
**File:** `xs-security.json`  
**Task:** Add field-level and attribute-based permissions.

**Required Changes:**
```json
{
  "scopes": [
    { "name": "$XSAPPNAME.TenantAdmin", "description": "Tenant Administrator" },
    { "name": "$XSAPPNAME.SolutionArchitect", "description": "Solution Architect" },
    { "name": "$XSAPPNAME.Developer", "description": "Developer/Consultant" },
    { "name": "$XSAPPNAME.FieldAccess", "description": "Access to sensitive fields" }
  ],
  "role-templates": [
    {
      "name": "TenantAdministrator",
      "scope-references": ["$XSAPPNAME.TenantAdmin", "$XSAPPNAME.FieldAccess"],
      "description": "Full project & user management"
    },
    {
      "name": "SolutionArchitect",
      "scope-references": ["$XSAPPNAME.SolutionArchitect", "$XSAPPNAME.FieldAccess"],
      "description": "Create/edit analyses, export reports"
    },
    {
      "name": "DeveloperConsultant",
      "scope-references": ["$XSAPPNAME.SolutionArchitect"],
      "description": "Execute wizard, view results (no sensitive data)"
    }
  ],
  "attribute-references": [
    {
      "name": "Country",
      "description": "User country for data filtering"
    }
  ]
}
```

**Acceptance Criteria:**
- Enhanced role templates
- Attribute references for ABAC
- Field-level access scopes

---

## Phase 4 Success Criteria

- ✅ **Unit Tests:** 50+ tests with 80%+ coverage (Jest)
- ✅ **Integration Tests:** 20+ tests for OData APIs and security (Supertest)
- ✅ **UI Tests:** 15+ tests for user journeys (OPA5)
- ✅ **E2E Tests:** 10+ tests for complete workflows (UIVeri5)
- ✅ **Audit Logging:** All operations logged with details
- ✅ **Multi-Tenancy:** Tenant isolation validated and provisioning implemented
- ✅ **Security:** Field-level auth and enhanced RBAC
- ✅ **Performance:** All tests pass, no memory leaks

## Testing Instructions

1. **Unit Tests:** `npm run test:coverage` - Verify 80%+ coverage
2. **Integration Tests:** `npm run test:integration` - All APIs functional
3. **UI Tests:** Run OPA5 tests in browser
4. **E2E Tests:** `npm run test:e2e` - Complete user journeys
5. **Security Tests:** Manual testing of tenant isolation and RBAC
6. **Performance Tests:** Load testing with multiple concurrent users

## Dependencies

- All previous phases completed
- Test databases set up
- CI/CD pipeline configured for test execution

## Estimated Effort Breakdown

- Unit Tests: 40 hours
- Integration Tests: 24 hours
- UI Tests: 16 hours
- E2E Tests: 16 hours
- Audit Logging: 8 hours
- Multi-Tenancy: 8 hours
- Security Refinement: 8 hours

**Total: ~120 hours (15 days)**

---

**Document Version:** 1.0  
**Created:** October 22, 2025  
**Ready for Coding Agent Delegation**