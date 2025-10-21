# SAP Clean Core Solution Advisor - Copilot Instructions

## Project Overview

This is a **SAP CAP (Cloud Application Programming Model)** application on **SAP BTP** that serves as a decision advisor for selecting clean core approaches in SAP S/4HANA implementations. The app transforms an Excel-based decision framework into a scalable, multi-tenant SaaS solution with guided wizards, scoring metrics, and visual decision flowcharts.

**Core Purpose:** Guide solution architects through RICEFW (Reports, Interfaces, Conversions, Enhancements, Forms, Workflows) object analysis to determine the optimal clean core level (A/B/C/D) while tracking technical debt, cloud readiness, and upgrade impact scores.

## Architecture & Technology Stack

### Backend (CAP Node.js)
- **Framework:** SAP CAP 7.x+ with Node.js 18+ LTS
- **Database:** SAP HANA Cloud with multi-tenant schema isolation
- **API:** OData V4 services defined in CDS
- **Authentication:** XSUAA (SAP Authorization and Trust Management)
- **Namespace:** `sd` (Solution Designer) - used across all CDS entities

### Frontend (SAP Fiori)
- **Base:** SAP Fiori Elements (List Report + Object Page patterns)
- **Custom Components:** SAP UI5 1.120+ for wizard, scoring dashboard, flowchart visualization
- **Charting:** D3.js or SAP VizFrame for decision flowcharts and scoring graphs
- **Design System:** SAP Fiori 3.0 with WCAG 2.1 AA compliance

### Platform Services (SAP BTP)
- **Deployment:** Cloud Foundry runtime
- **Multi-tenancy:** CAP MTX (Multi-Tenant Extensions) with HANA schema-based isolation
- **Services:** XSUAA, Destination Service, Application Logging, Job Scheduler, Credential Store

## Critical Project Structure

```
├── db/
│   ├── schema.cds           # Data model (namespace: sd)
│   └── src/                 # HANA-specific artifacts (calculations, procedures)
├── srv/
│   ├── service.cds          # OData service definitions (@path: '/service/SolutionAdvisorSvcs')
│   └── lib/                 # Business logic handlers
│       ├── decision-engine.js      # Wizard navigation & decision tree logic
│       ├── scoring-service.js      # Calculate tech debt, cloud readiness, upgrade impact
│       ├── constraints-service.js  # Performance thresholds & limitations display
│       └── examples-service.js     # Real-world scenario matching
├── app/
│   ├── services.cds         # UI annotations
│   ├── xs-app.json          # App router configuration
│   └── solutionadvisor/
│       └── webapp/
│           ├── manifest.json        # UI5 app descriptor (connects to mainService)
│           ├── controller/          # Custom controllers for wizard, scoring dashboard
│           ├── view/fragments/      # Reusable fragments (ConstraintsPanel, ExamplesPanel)
│           └── Component.js
├── mta.yaml                 # Multi-Target Application deployment descriptor
├── xs-security.json         # XSUAA security configuration (currently basic, needs role templates)
└── .github/
    ├── copilot-instructions.md      # This file
    ├── technical specification/     # Complete functional & technical specs
    └── supporting documents/        # Clean core decision frameworks for each RICEFW type
```

## Data Model Patterns (CDS)

### Entity Naming Conventions
- **Entities:** PascalCase (e.g., `ProjectConfiguration`, `CleanCoreAnalysis`)
- **Fields:** camelCase (e.g., `clientName`, `technicalDebtScore`)
- **Aspects:** Use `cuid` (UUID key) and `managed` (createdAt, modifiedAt) from `@sap/cds/common`
- **Namespace:** All entities use `namespace sd;`

### Multi-tenancy Pattern
```cds
// All tenant-specific entities must be annotated for automatic tenant isolation
@cds.autoexpose @assert.unique: { tenant: [tenant] }
entity CleanCoreAnalysis : cuid, managed {
  tenant                   : String(36) @readonly;  // Automatically injected by CAP MTX
  ricefwId                 : String(10) not null;   // Format: [RICEFYW]-[0-9]{4}-[A-Z]{3}
  objectType               : Association to ObjectTypes;
  // ...
}
```

### Key Entities (Defined in Technical Spec)
1. **ProjectConfiguration** - Project onboarding (S/4HANA flavor, compliance, BTP services)
2. **CleanCoreAnalysis** - Main wizard results with decision path and scoring metrics (technical debt, cloud readiness, upgrade impact)
3. **WizardSession** - Save/resume capability for incomplete analyses
4. **QuestionFlow** - Dynamic decision tree (JSON-based navigation logic)
5. **DecisionPath** - Step-by-step wizard journey tracking
6. **PerformanceThreshold** - Master data for constraints display
7. **RealWorldExample** - Knowledge base for contextual examples
8. **CleanCoreLevels** - Master data (Level A/B/C/D with scoring multipliers)
9. **ObjectTypes** - RICEFW master data (R/I/C/E/F/W)

### RICEFW ID Pattern
- Format: `[RICEFYW]-[0-9]{4}-[A-Z]{3}` (e.g., `I-0042-IMP`)
- One RICEFW ID can have multiple analyses (track solution evolution over time)
- Use validation annotation: `@assert.format: '^[RICEFYW]-[0-9]{4}-[A-Z]{3}$'`

## Business Logic Patterns

### Decision Engine (srv/lib/decision-engine.js)
```javascript
// Question flow navigation uses JSON-based conditional logic from QuestionFlow entity
class DecisionEngine {
  async getNextQuestion(sessionId, answerId) {
    const session = await this.getSession(sessionId);
    const currentQuestion = session.currentQuestion;
    const navigationLogic = JSON.parse(currentQuestion.navigationLogic);
    
    // navigationLogic structure: { "AnswerKey": { nextQuestion: "Q5", finalAnswer: null } }
    const nextStep = navigationLogic[answerId];
    
    if (nextStep.finalAnswer) {
      return this.generateFinalRecommendation(session);
    }
    
    return this.loadQuestion(nextStep.nextQuestion);
  }
}
```

### Scoring Engine (srv/lib/scoring-service.js)
```javascript
// Calculate three metrics: Technical Debt (0-100), Cloud Readiness (0-100%), Upgrade Impact (0-100)
class ScoringService {
  async calculateScores(analysis) {
    const cleanCoreLevel = analysis.recommendedLevel; // Level A/B/C/D
    const levelWeights = await this.getLevelWeights(cleanCoreLevel);
    
    // Technical Debt = baseScore * complexityFactor * levelMultiplier
    const technicalDebtScore = this.calculateTechnicalDebt(
      analysis.decisionPath, 
      levelWeights.technicalDebtMultiplier
    );
    
    // Cloud Readiness = levelFactor * deploymentCompatibility
    const cloudReadinessScore = this.calculateCloudReadiness(
      cleanCoreLevel,
      analysis.projectConfig.s4HanaFlavor
    );
    
    // Upgrade Impact = customizationDepth * levelMultiplier
    const upgradeImpactScore = this.calculateUpgradeImpact(
      analysis.decisionPath,
      levelWeights.upgradeImpactMultiplier
    );
    
    return { technicalDebtScore, cloudReadinessScore, upgradeImpactScore };
  }
}
```

### Constraints Display (srv/lib/constraints-service.js)
```javascript
// Auto-display relevant performance thresholds, technical limitations, regulatory constraints
async getRelevantConstraints(analysisContext) {
  const { objectType, projectConfig, selectedAnswers } = analysisContext;
  
  // Query PerformanceThreshold entity filtered by object type
  const performanceConstraints = await SELECT.from('PerformanceThreshold')
    .where({ applicableObjectTypes: { like: `%${objectType}%` }, isActive: true });
  
  // Add deployment-specific constraints (Cloud Public = no custom ABAP)
  const deploymentConstraints = this.getDeploymentConstraints(projectConfig.s4HanaFlavor);
  
  // Add compliance constraints (FDA, GDPR, SOX)
  const complianceConstraints = this.getComplianceConstraints(projectConfig.complianceRequirements);
  
  return { performanceConstraints, deploymentConstraints, complianceConstraints };
}
```

## UI Development Patterns

### Fiori Elements Extensions
- **List Report:** Use for Analysis List page with search, filter, export
- **Object Page:** Use for Analysis Details with custom sections for scoring dashboard
- **Custom Fragments:** Create reusable fragments in `webapp/view/fragments/`
  - `WizardControl.fragment.xml` - Multi-step wizard with progress bar
  - `ScoringDashboard.fragment.xml` - Visual metrics display (progress bars, color coding)
  - `ConstraintsPanel.fragment.xml` - Performance thresholds & limitations
  - `ExamplesPanel.fragment.xml` - Real-world scenario cards
  - `FlowchartView.fragment.xml` - Decision path visualization (D3.js/SVG)

### Controller Patterns
```javascript
// Custom controller for wizard (app/solutionadvisor/webapp/controller/Wizard.controller.js)
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";
  
  return Controller.extend("sd.solutionadvisor.controller.Wizard", {
    onInit: function() {
      // Initialize wizard session from backend
      this._initWizardSession();
      this._loadConstraints(); // Auto-display constraints per question
      this._loadExamples();    // Load contextual examples
    },
    
    onAnswerSelect: function(oEvent) {
      const selectedAnswer = oEvent.getParameter("selectedItem").getKey();
      // Call decision engine to get next question
      this._getNextQuestion(selectedAnswer);
      // Refresh constraints display based on new context
      this._refreshConstraints();
    },
    
    onShowDetailedHint: function() {
      // Open popover with detailed hint from QuestionFlow.detailedHint
    },
    
    onShowExamples: function() {
      // Open dialog with filtered RealWorldExample entities
    }
  });
});
```

### Wizard Progress Display
```xml
<!-- Use sap.m.Wizard with dynamic steps based on question flow -->
<Wizard id="cleanCoreWizard" complete="onWizardComplete">
  <WizardStep validated="true" title="Project Selection" />
  <WizardStep validated="false" title="Object Information" />
  <!-- Dynamic steps generated based on ObjectType question count -->
</Wizard>
```

## Development Workflows

### Local Development Setup
```powershell
# Install dependencies (runs npm install in workspace root)
npm install

# Start local development server (SQLite database, mock auth)
npm run start-local
# OR use VS Code task: Terminal > Run Task > "cds watch"

# Access app: http://localhost:4004
# Test OData service: http://localhost:4004/service/SolutionAdvisorSvcs
```

### Database Development (HANA Cloud)
- Use `db/src/` for HANA-specific artifacts (calculation views, SQLScript procedures)
- CDS deployment automatically generates HANA artifacts: `cds deploy --to hana`
- Multi-tenant: Each tenant gets isolated schema `<TENANT_ID>_DATA`

### Building for Production
```powershell
# Generate MTA archive for Cloud Foundry deployment
mbt build

# Deploy to BTP (requires CF CLI)
cf deploy mta_archives/SolutionAdvisor_1.0.0.mtar
```

### Testing Strategy
- **Unit Tests:** Jest for service handlers (decision-engine, scoring-service)
- **Integration Tests:** CDS test utilities for OData service endpoints
- **UI Tests:** OPA5 (One Page Acceptance) for Fiori Elements + custom controls
- **E2E Tests:** UIVeri5 for complete wizard flows

## Security & Authorization

### Role-Based Access Control (Update xs-security.json)
```json
{
  "scopes": [
    { "name": "$XSAPPNAME.TenantAdmin", "description": "Tenant Administrator" },
    { "name": "$XSAPPNAME.SolutionArchitect", "description": "Solution Architect" },
    { "name": "$XSAPPNAME.Developer", "description": "Developer/Consultant" }
  ],
  "role-templates": [
    {
      "name": "TenantAdministrator",
      "scope-references": ["$XSAPPNAME.TenantAdmin"],
      "description": "Full project & user management"
    },
    {
      "name": "SolutionArchitect",
      "scope-references": ["$XSAPPNAME.SolutionArchitect"],
      "description": "Create/edit analyses, export reports"
    },
    {
      "name": "DeveloperConsultant",
      "scope-references": ["$XSAPPNAME.Developer"],
      "description": "Execute wizard, view results"
    }
  ]
}
```

### CDS Authorization Annotations
```cds
// Restrict entity access by role
@requires: 'authenticated-user'
service solutionAdvisorService {
  
  @restrict: [
    { grant: '*', to: 'TenantAdmin' },
    { grant: ['READ', 'CREATE', 'UPDATE'], to: 'SolutionArchitect' },
    { grant: 'READ', to: 'Developer' }
  ]
  entity CleanCoreAnalysis as projection on sd.CleanCoreAnalysis;
}
```

## Future Integration Readiness

### API Hub Integration (Planned)
- Use SAP Destination Service to connect to API Business Hub
- Query released APIs for specific object types during wizard (e.g., "Is there a released API for this requirement?")
- Cache API metadata to reduce external calls

### SCFD Registry Integration (Planned)
- Integrate with SAP Custom Fields & Logic Registry
- Auto-check if custom fields/logic already registered for RICEFW ID
- Display compliance status in analysis results

**Preparation Pattern:**
```javascript
// srv/lib/api-hub-service.js (stub for future implementation)
class ApiHubService {
  async searchReleasedApis(objectType, businessArea, keywords) {
    // TODO: Implement via Destination Service
    // For now, return empty array
    return [];
  }
}
```

## Common Pitfalls to Avoid

1. **Multi-tenancy Violations:** Never hardcode tenant context. Always rely on CAP MTX automatic tenant injection via `req.tenant`.

2. **OData Query Performance:** Use CDS `$select` and `$expand` judiciously. Limit associations to avoid N+1 query patterns. Use HANA calculation views for complex aggregations.

3. **Wizard State Management:** Always persist wizard progress to `WizardSession` entity to support save/resume. Don't rely on client-side storage.

4. **Decision Tree Navigation:** Validate JSON structure in `QuestionFlow.navigationLogic` on insert/update. Malformed JSON breaks wizard flow.

5. **Scoring Calculation:** Cache `CleanCoreLevels` scoring multipliers in memory. Don't query database for every score calculation.

6. **Constraints Display:** Query `PerformanceThreshold` once per wizard session, not per question. Cache in UI model.

7. **Security:** Never expose tenant isolation logic in UI. Backend must enforce tenant filtering via CAP middleware.

## Key Documentation References

- **Technical Specification:** `.github/technical specification/SAP-Clean-Core-CAP-App-Enhanced-Technical-Spec.md` (2247 lines - complete functional spec with data models, APIs, scoring formulas)
- **Clean Core Frameworks:** `.github/supporting documents/` (decision trees, thresholds, examples for each RICEFW type)
- **CAP Documentation:** https://cap.cloud.sap/docs
- **SAP Fiori Design Guidelines:** https://experience.sap.com/fiori-design
- **HANA Cloud Multi-tenancy:** https://help.sap.com/hana-cloud

## When Making Changes

1. **Adding New Question:** Update `QuestionFlow` entity with validated JSON navigation logic. Test all answer paths in decision engine.

2. **New Scoring Metric:** Update `CleanCoreAnalysis` entity (add new score fields), implement calculation in `scoring-service.js`, add visualization to `ScoringDashboard.fragment.xml`.

3. **New Constraint Type:** Extend `PerformanceThreshold` entity, update `constraints-service.js` logic, add UI display in `ConstraintsPanel.fragment.xml`.

4. **New RICEFW Type:** Add to `ObjectTypes` master data, create decision tree in supporting documents, seed `QuestionFlow` entities.

5. **UI Extension:** Always extend Fiori Elements via custom fragments/sections. Avoid replacing entire views. Follow SAP Fiori design patterns for consistency.

---

**Project Status:** Specification complete, ready for implementation. No code modifications yet. Follow CAP, UI5, and HANA Cloud best practices strictly.