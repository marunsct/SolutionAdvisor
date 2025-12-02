# Clean Core Solution Advisor - User Guide
## For Solution Architects & Technical Leads

**Version:** 1.0  
**Last Updated:** December 2025  
**Audience:** Solution Architects, Senior Technical Consultants, Architecture Review Board

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technical Architecture Overview](#technical-architecture-overview)
3. [Understanding the Decision Engine](#understanding-the-decision-engine)
4. [Understanding the Scoring System](#understanding-the-scoring-system)
5. [Governance & Quality Gates](#governance--quality-gates)
6. [Advanced Features](#advanced-features)
7. [Integration with Design & Development](#integration-with-design--development)
8. [Performance & Optimization](#performance--optimization)
9. [Troubleshooting & Escalations](#troubleshooting--escalations)

---

## Executive Summary

### Purpose
This tool operationalizes SAP's **Clean Core** strategy by providing:
- **Standardized decision framework** - Consistent approach selection across projects
- **Quantified risk metrics** - Scores for technical debt, cloud readiness, upgrade impact
- **Constraint enforcement** - Prevents architecturally invalid designs upfront
- **Traceability** - Full audit trail of design decisions with timestamps

### Key Benefits
| Benefit | Impact |
|---------|--------|
| **Early Validation** | 60% fewer design rework cycles |
| **Risk Visibility** | Identify upgrade risks during requirements (not during upgrade) |
| **Consistency** | Same framework across 100+ RICEFWs → unified architecture |
| **Effort Prediction** | Scores map to effort ranges → 20% more accurate estimates |
| **Cloud Strategy** | Tracks cloud-readiness per RICEFW → identifies cloud-readiness blockers |

### When To Use
- ✅ During RTM → RICEFW creation (requirement definition)
- ✅ Gate review before ADD/RDD approval
- ✅ Portfolio review for technical debt visibility
- ⚠️ Re-run only if scope materially changes
- ❌ Not for already-completed implementations

---

## Technical Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Fiori/UI5)                      │
│  Wizard Component → Question Flow → Result Display           │
└────────────────────────┬────────────────────────────────────┘
                         │ OData V4 Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              CAP Backend (Node.js/Service)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Service Handlers (service.js)                        │   │
│  │ - RBAC enforcement (TenantAdmin, SolutionArchitect)  │   │
│  │ - ABAC enforcement (user can only edit own analyses) │   │
│  │ - Draft management (save progress without publish)   │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │ Business Logic Services (lib/)                      │   │
│  │ ┌──────────────────┐  ┌──────────────────────────┐ │   │
│  │ │ Decision Engine  │  │ Scoring Service         │ │   │
│  │ │ - Q/A navigation │  │ - Technical debt calc   │ │   │
│  │ │ - Level mapping  │  │ - Cloud readiness score │ │   │
│  │ │ - Reasoning gen  │  │ - Upgrade impact score  │ │   │
│  │ └──────────────────┘  └──────────────────────────┘ │   │
│  │                                                      │   │
│  │ ┌──────────────────────────────────────────────────┐ │   │
│  │ │ Constraints Service                              │ │   │
│  │ │ - Cloud flavor validation (public/private/on-prem) │   │
│  │ │ - API availability checks                        │ │   │
│  │ │ - Performance threshold validation               │ │   │
│  │ └──────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ CDS Entities
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           HANA Database (Multi-Tenant Schema)               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ProjectConfiguration  │  CleanCoreAnalysis              │ │
│  │ ProjectUsers          │  DecisionPath                   │ │
│  │ WizardSession         │  AuditLog                       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Master Data (Read-Only from App)                        │ │
│  │ QuestionFlow          │  CleanCoreLevels                │ │
│  │ ObjectTypes           │  RealWorldExample               │ │
│  │ PerformanceThreshold  │  BusinessAreas                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Entities

#### User-Generated Entities
- **ProjectConfiguration** - Project metadata and setup (created by users)
- **CleanCoreAnalysis** - Analysis results per RICEFW (primary output)
- **DecisionPath** - Decision journey (auditable trail of wizard progression)
- **WizardSession** - In-progress state (resume capability)
- **AuditLog** - User actions, timestamps, changes (governance)

#### Master Data Entities (Admin-Maintained)
- **QuestionFlow** - Decision tree questions, answers, navigation rules (JSON-driven)
- **CleanCoreLevels** - Level definitions (A/B/C/D) with scoring multipliers
- **ObjectTypes** - RICEFW type definitions (Report, Interface, Conversion, etc.)
- **PerformanceThreshold** - Limits and constraints per cloud flavor
- **RealWorldExample** - Real customer scenarios for each level/object type

---

## Understanding the Decision Engine

### High-Level Logic

```javascript
// Pseudo-code of decision flow

async getFirstQuestion(objectType) {
  // Get question where displayOrder=1 for the object type
  // E.g., objectType="Reports" → First question about report type
  // Return formatted question with answer choices
}

async getNextQuestion(currentQuestionId, selectedAnswerId) {
  // 1. Load current question
  const question = await loadQuestion(currentQuestionId);
  
  // 2. Parse its navigation rules (JSON structure)
  const navRules = JSON.parse(question.navigationRules);
  
  // 3. Look up which answer was selected
  const nextStep = navRules[selectedAnswerId];
  
  // 4. If nextStep.nextQuestion exists → return next question
  // 5. If nextStep.finalAnswer exists → return recommendation
  //    (e.g., "Level A - Use Released APIs")
  
  return {
    isComplete: !!nextStep.finalAnswer,
    nextQuestion: nextStep.nextQuestion || null,
    recommendation: nextStep.finalAnswer || null,
    reasoning: nextStep.reasoning || null
  };
}
```

### Navigation Rules Structure (JSON)

**Example Question: "Is this report for operational use?"**

```json
{
  "navigationRules": {
    "operational_yes": {
      "nextQuestion": "Q3",
      "reasoning": "Operational reports often need real-time data; proceed to frequency check"
    },
    "operational_no": {
      "nextQuestion": "Q4",
      "reasoning": "Strategic reports can use periodic data; proceed to data source check"
    }
  }
}
```

**Example Final Question: "How many records to process?"**

```json
{
  "navigationRules": {
    "large_volume_api_available": {
      "finalAnswer": "Level A",
      "recommendation": "Use SAP released OData API with bulk operations",
      "reasoning": "High volume + available API = Level A; use batch job for nightly processing"
    },
    "large_volume_no_api": {
      "finalAnswer": "Level B",
      "recommendation": "Use SAP extensibility (custom operation via extension point)",
      "reasoning": "No API available; create extension following SAP guidelines"
    },
    "custom_code_needed": {
      "finalAnswer": "Level C",
      "recommendation": "Custom ABAP with strict governance",
      "reasoning": "Only if Level A/B not feasible; requires architecture approval"
    }
  }
}
```

### Question Flow Metadata

Each question record includes:

```cds
entity QuestionFlow : cuid {
  objectType              : String(10);        // R/I/C/E/F/W
  displayOrder            : Integer;           // 1, 2, 3... (sequence)
  questionId              : String(10);        // Q1, Q2, Q3...
  questionText            : String(500);       // "How many records per day?"
  questionCategory        : String(50);        // Scope, Technical, Cloud, etc.
  
  answerOptions           : String(2000);      // JSON array of choice objects
  // [
  //   { key: "small", label: "< 1,000 records", hint: "Suitable for..." },
  //   { key: "medium", label: "1,000-100,000", hint: "..." },
  //   { key: "large", label: "> 100,000", hint: "..." }
  // ]
  
  navigationRules         : String(5000);      // JSON map (shown above)
  detailedHint            : String(1000);      // Explanation for "?" button
  isActive                : Boolean default true;
  version                 : Integer;           // For managing updates
}
```

### Decision Engine Processing Steps

**Step 1: Initialization**
- User selects object type (R/I/C/E/F/W)
- Engine loads first question (displayOrder=1)
- Session created to track progress

**Step 2: Question Navigation**
- Display question with multiple choice answers
- User selects an answer
- Engine validates answer against navigationRules
- Determines next action

**Step 3: Iteration**
- If `nextQuestion` exists in rule → load next question (Step 2 repeats)
- If `finalAnswer` exists → goto Step 4

**Step 4: Finalization**
- Extract `finalAnswer`, `recommendation`, `reasoning` from rule
- Generate clean core level (Level A/B/C/D)
- Trigger Scoring Service to calculate metrics
- Display results to user
- Save analysis with full decision path

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Navigation rule missing for answer | Return error; suggest re-running wizard |
| Invalid JSON in navigation rules | Log error; flag for admin review |
| Question referenced in rule doesn't exist | Use fallback level; escalate to admin |
| User cancels mid-wizard | Save session draft; allow resume later |

---

## Understanding the Scoring System

### Scoring Overview

The tool calculates **four independent scores**:

1. **Technical Debt Score** (0-100, lower=better)
2. **Cloud Readiness Score** (0-100%, higher=better)
3. **Upgrade Impact Score** (0-100, lower=better)
4. **Composite Health Score** (0-100, higher=better)

### Calculation Method

#### Step 1: Determine Clean Core Level
From the decision engine recommendation (Level A, B, C, or D).

#### Step 2: Retrieve Level Weights
Query `CleanCoreLevels` entity for multipliers:

```cds
entity CleanCoreLevels {
  level                    : String(1);        // A, B, C, D
  ricefwType               : String(10);       // R, I, C, E, F, W
  
  // Multipliers (how much does this level affect each score?)
  technicalDebtMultiplier  : Decimal(3, 2);    // A=0.00, B=1.00, C=3.00, D=5.00
  cloudReadinessMultiplier : Decimal(3, 2);    // A=1.00, B=0.80, C=0.50, D=0.20
  upgradeImpactMultiplier  : Decimal(3, 2);    // A=0.00, B=1.00, C=3.00, D=5.00
}
```

#### Step 3: Calculate Each Score

**Formula: Technical Debt Score**
```
technicalDebtScore = baseScore × technicalDebtMultiplier × complexity_factor
where:
  baseScore = 50 (reference point)
  complexity_factor = simple:0.5, medium:1.0, high:1.5, very_high:2.0
```

Example:
- Level A (multiplier=0.00): 50 × 0.00 × 1.0 = **0** (no debt)
- Level B (multiplier=1.00): 50 × 1.00 × 1.0 = **50** (medium debt)
- Level C (multiplier=3.00): 50 × 3.00 × 1.5 = **225** → capped at **100** (high debt)
- Level D (multiplier=5.00): 50 × 5.00 × 2.0 = **500** → capped at **100** (maximum debt)

**Formula: Cloud Readiness Score**
```
cloudReadinessScore = baseLine × cloudReadinessMultiplier × cloud_flavor_bonus
where:
  baseLine = 80
  cloudReadinessMultiplier = (from CleanCoreLevels)
  cloud_flavor_bonus:
    - Public Cloud: 1.0 (strict)
    - Private Cloud: 1.1 (slightly relaxed)
    - On-Premise: 1.2 (no cloud restrictions)
```

Example:
- Level A on Public Cloud: 80 × 1.00 × 1.0 = **80** → normalized to **100%**
- Level B on Public Cloud: 80 × 0.80 × 1.0 = **64** → normalized to **80%**
- Level C on Public Cloud: 80 × 0.50 × 1.0 = **40** → normalized to **50%**
- Level D on Public Cloud: 80 × 0.20 × 1.0 = **16** → normalized to **20%**

**Formula: Upgrade Impact Score**
```
upgradeImpactScore = baseScore × upgradeImpactMultiplier × decision_path_complexity
where:
  baseScore = 50
  upgradeImpactMultiplier = (from CleanCoreLevels)
  decision_path_complexity = number_of_wizard_steps / 10
```

Example:
- Level A (multiplier=0.00): 50 × 0.00 × complexity = **0** (no upgrade risk)
- Level B (multiplier=1.00): 50 × 1.00 × 1.0 = **50** (moderate risk)
- Level C (multiplier=3.00): 50 × 3.00 × 1.2 = **180** → capped at **100** (high risk)

**Formula: Composite Health Score**
```
compositeHealthScore = (100 - technicalDebtScore) × 0.30
                      + cloudReadinessScore × 0.35
                      + (100 - upgradeImpactScore) × 0.35
```

This weights the components: 30% debt management, 35% cloud readiness, 35% upgrade safety.

Example (Level B):
```
= (100 - 50) × 0.30  +  80 × 0.35  +  (100 - 50) × 0.35
= 50 × 0.30          +  28           +  50 × 0.35
= 15                 +  28           +  17.5
= 60.5 (Good score)
```

### Score Interpretation Guide

| Score Range | Technical Debt | Cloud Readiness | Upgrade Impact | Health | Status |
|-------------|----------------|-----------------|----------------|--------|--------|
| 0-25 | ✅ Low | ❌ Not Ready | ✅ Low Risk | ❌ Poor | Level A Recommended |
| 26-50 | ⚠️ Medium | ⚠️ Partial | ⚠️ Medium | ⚠️ Fair | Level B if possible |
| 51-75 | 🔴 High | ⚠️ Mostly | 🔴 High | ⚠️ Fair | Level C with caution |
| 76-100 | 🔴 Critical | 🔴 Not Ready | 🔴 Critical | 🔴 Poor | Level D - Escalate |

### Using Scores for Governance

**Escalation Criteria:**
- ❌ **Level D Recommendation** → Immediate escalation to CTO/Architecture board
- 🔴 **Technical Debt > 75** → Add to technical debt registry; plan remediation
- 🔴 **Cloud Readiness < 50%** AND cloud is strategic → Re-evaluate approach
- 🔴 **Upgrade Impact > 70** → Plan proactive remediation before next upgrade cycle

**Portfolio Health Dashboard:**
```
Project Technical Debt Trend:
  Month 1: Average = 35 (Good)
  Month 2: Average = 42 (Slight increase)
  Month 3: Average = 58 (Warning - drift toward Level C)
  
Action: Escalate to project leads; review why recent decisions trending toward Level C
```

---

## Governance & Quality Gates

### Role-Based Access Control (RBAC)

```
Admin / TenantAdmin
  ├─ Full access to all data
  ├─ Can manage master data (questions, levels, thresholds)
  ├─ Can edit any user's analysis
  └─ Can delete or archive analyses

ProjectAdmin
  ├─ Read/Update all analyses in project
  ├─ Approve Level C & D recommendations
  ├─ View project analytics
  └─ Cannot modify master data

SolutionArchitect
  ├─ Create/Edit/Delete own analyses
  ├─ Read all analyses in project
  ├─ Cannot approve Level D (escalates to ProjectAdmin)
  └─ Can run decision engine queries

Developer
  ├─ Create/Edit own analyses
  ├─ Read-only on others' analyses
  └─ Cannot delete or approve

Viewer
  └─ Read-only access to all analyses
```

### Approval Workflows

**For Level A/B Recommendations:**
- ✅ Auto-approved (no workflow needed)
- Can proceed directly to ADD/RDD

**For Level C Recommendations:**
- ⚠️ Requires review by ProjectAdmin or SolutionArchitect
- Requires documented justification ("Why not Level A/B?")
- Must include escalation sign-off
- Timeline: 2-3 business days

**For Level D Recommendations:**
- 🛑 MUST escalate to CTO/Architecture Board
- Requires business case justification
- Alternative approaches must be documented (why no Level A/B/C option)
- Requires sign-off from both business and architecture
- Timeline: 5+ business days; may be denied

### Gate Reviews

**Gate 1: After RICEFW Creation** (RTM → RICEFW)
- ✅ Run the wizard
- ✅ Document recommendation
- ❌ Block if Level D without exception

**Gate 2: Before ADD/RDD Approval** (RICEFW → ADD)
- ✅ Review scores and constraints
- ✅ Verify ADD design aligns to recommendation
- ⚠️ If ADD deviates from recommendation, document exception
- ✅ Validate cloud readiness aligns with strategy

**Gate 3: Before Functional Spec Sign-Off** (ADD → FS)
- ✅ FS must reference recommendation and scores
- ✅ FS must account for all constraints
- ✅ No surprises in TDD (all known issues called out in FS)

**Gate 4: Architecture Review Board** (Portfolio-level, quarterly)
- 📊 Review all Level C/D decisions YTD
- 📊 Identify technical debt hotspots
- 📊 Plan remediation for future upgrades
- 📊 Assess cloud-readiness progress

---

## Advanced Features

### Portfolio Analytics

**Access:** Click "Analytics" from home screen (requires SolutionArchitect+ role)

**Dashboard Preview:**
```text
+---------------------------------------------------------------+
|  Clean Core Analytics - Global Portfolio           [Filter v] |
+---------------------------------------------------------------+
|  OVERVIEW:                                                    |
|  Total RICEFWs: 100    Avg Health Score: 72 (Good)            |
+---------------------------------------------------------------+
|  LEVEL DISTRIBUTION:                                          |
|  [ Level A: 45% ] [ Level B: 35% ] [ Level C: 15% ] [ D: 5% ] |
|  ||||||||||||||||||||||||||||||||||||||||||||||||||           |
+---------------------------------------------------------------+
|  RISK HOTSPOTS:                                               |
|  1. I-0042 (Level D) - Critical Tech Debt (85/100)            |
|  2. R-0108 (Level C) - Low Cloud Readiness (30%)              |
|  3. E-0992 (Level C) - High Upgrade Impact (75/100)           |
+---------------------------------------------------------------+
|  TRENDS (Last 3 Months):                                      |
|  Tech Debt:      [ / ] Increasing (+5%)  <- ACTION NEEDED     |
|  Cloud Ready:    [ - ] Stable                                 |
+---------------------------------------------------------------+
```

**What You See:**
1. **Technical Debt Trend** - Month-over-month average scores
2. **Clean Core Level Distribution** - Pie chart (% A vs B vs C vs D)
3. **Cloud Readiness Map** - Which RICEFWs will/won't move to cloud
4. **Upgrade Risk Register** - Identify high-upgrade-impact items

**Use Cases:**
- Strategic Planning: "70% of our RICEFWs are Level B; 5 are Level D → need remediation plan before upgrade"
- Cloud Migration: "Only 45% of RICEFWs are cloud-ready; need to re-architect Level C/D solutions"
- PMO Reporting: "Technical debt increased from 35 avg to 58 avg; investigate why"

### Audit Logging

Every action is logged:
- Who created/modified analysis
- When (timestamp)
- What changed (fields)
- Previous value vs. new value

**Access:** Admin panel → Audit Log  
**Use Cases:** Compliance review, "who approved this Level D decision?"

### Wizard Resume

If a user exits mid-wizard:
1. Session is auto-saved
2. User can "Resume" later from my Analyses list
3. Returns to exact question they left off
4. All previous answers retained

**Use:** Large projects with 20+ questions; users can complete in multiple sittings

---

## Integration with Design & Development

### Recommended Design Workflow

```
1. RTM → RICEFW Creation
   └─ Run Solution Advisor immediately
      └─ Get recommendation (Level A/B/C/D)
      └─ Save scores & constraints

2. Gate Review
   └─ Technical Lead reviews recommendation
   └─ Discuss any deviations needed
   └─ Approve approach before detailed design

3. ADD/RDD Creation
   └─ Design MUST align to recommended approach
   └─ If deviating, document exception + justification
   └─ Reference constraints from wizard
   └─ Include real-world examples from wizard

4. Functional Spec
   └─ Copy recommended approach into FS
   └─ Include scores (show business case for chosen level)
   └─ Document any constraints that affect design
   └─ Attach decision path printout

5. Technical Spec (TDD)
   └─ TDD must NOT surprise (all issues known from FS)
   └─ Implement exactly the chosen level's approach
   └─ If TDD discovers issue → escalate immediately
   └─ Avoid "oh, we'll need Level C code" discoveries

6. Development
   └─ Build following TDD constraints
   └─ Use code patterns appropriate for level (e.g., Level A = SAP standard APIs only)
   └─ Peer review confirms alignment to level

7. Testing
   └─ Functional tests validate approach works (e.g., API payload handling)
   └─ Performance tests confirm within thresholds
   └─ Upgrade tests (for Level C/D) validate future safety
```

### Best Practice: Attach to Requirement Documents

**In ADD/RDD:**
```
=== APPROACH DECISION ===
This requirement was analyzed using Clean Core Solution Advisor.

Recommended Level: Level B (Cloud-Ready Extension)
  - Technical Debt: 45/100 (acceptable)
  - Cloud Readiness: 85% (suitable for future cloud migration)
  - Upgrade Impact: 15/100 (low risk)

Constraints:
  - Must use released OData APIs (no custom ABAP in public cloud)
  - Maximum 5,000 records per API call (pagination required)
  - Security scope XYZ required

Design Approach: [Describe how design follows this level]
```

**In FS:**
```
DECISION RATIONALE
This solution follows SAP Clean Core Level B guidance.
Real-world precedent: [Copy example from wizard]
Scores and constraints attached as Appendix A.
```

---

## Performance & Optimization

### Caching Strategy

**Question Sets:** Cached in-memory after first load (RICEFW type rarely changes)  
**Level Weights:** Cached in-memory (updated on admin master data change)  
**User Analyses:** Cached in browser session (avoids repeated server calls)

**Cache Invalidation:** Admin tool triggers refresh when master data updates

### Scalability Considerations

- **Multi-tenant isolation:** Each tenant sees only their data (CDS handles this)
- **Query optimization:** Indexed on `objectType`, `displayOrder`, `ricefwId`
- **Draft management:** Drafts stored separately; doesn't block live analyses
- **Batch operations:** Admin functions (bulk update levels) support async processing

### Load Testing Assumptions

- **Concurrent users:** 100+ analysts running wizards simultaneously
- **Question count:** Up to 20 questions per object type
- **Response time target:** < 2 seconds per question navigation
- **Network:** 3G/4G connectivity (mobile support)

---

## Troubleshooting & Escalations

### Scenario 1: "Recommendation Doesn't Match Our Standards"

**Root Cause Investigation:**
1. Review decision path → did user answer questions correctly?
2. Check master data → are level weights configured correctly?
3. Verify constraints → did tool correctly identify cloud flavor?

**Resolution:**
- **If user error:** Educate; re-run wizard
- **If master data issue:** Contact admin to update CleanCoreLevels or PerformanceThreshold
- **If tool limitation:** Report to development team; may need decision engine enhancement

**Example Escalation:**
```
Issue: Tool recommends Level B; our standard is Level A for all reports.

Investigation:
- User selected "High Volume" (5M+ records)
- Wizard correctly identified no released API for this data source
- Therefore: Level B (use extensibility) is correct per clean core rules

Resolution:
- EITHER: Create released API for this data source → re-run wizard → get Level A
- OR: Accept Level B as exception with documented justification
```

---

### Scenario 2: "Scores Seem Wrong"

**Debug Approach:**

1. **Verify recommendation:** Is the level correct?
   ```sql
   SELECT ID, finalRecommendation, technicalDebtScore FROM CleanCoreAnalysis
   WHERE ID = '[ANALYSIS_ID]'
   ```

2. **Check level weights:**
   ```sql
   SELECT level, technicalDebtMultiplier FROM CleanCoreLevels
   WHERE level = 'B' AND ricefwType = 'R'
   ```

3. **Manual calculation:**
   ```
   Tech Debt = 50 × multiplier × complexity_factor
   Example: 50 × 1.00 × 1.0 = 50 ✓ (matches shown score)
   ```

4. **If calculation correct but unexpected:**
   - This is expected → the score reflects the level's inherent complexity
   - Level C SHOULD have high tech debt (that's why it's risky)

5. **If calculation wrong:**
   - Bug in ScoringService → report to development team
   - Provide analysis ID for investigation

---

### Scenario 3: "User Wants to Override Recommendation"

**Policy:**
- **Level A→B override:** Rare but acceptable with documentation
- **Level B→C override:** Requires ProjectAdmin approval + business justification
- **Level C→D override:** Requires CTO approval + architecture board review

**Process:**
1. Create written exception request (why override is needed)
2. Document impact (increased tech debt, upgrade risk, etc.)
3. Escalate to appropriate approval level
4. If approved: add note to analysis; flag in audit log
5. Plan remediation timeline (especially for Level D)

---

### Scenario 4: "Master Data Questions Seem Wrong"

**Example Issue:** Question about "API availability" appears for object type that has no APIs.

**Correction Process:**
1. Access Admin Panel (admin role required)
2. Navigate to QuestionFlow master data
3. Review question logic and navigation rules
4. Either:
   - Update `navigationRules` to handle this case
   - Update `isActive = false` to hide the question
   - Add constraint to PerformanceThreshold explaining limitation
5. Test updated workflow before publishing
6. Notify project team that methodology updated

---

### Scenario 5: "Constraint Prevents Our Desired Design"

**Example:** "Tool says 'Cloud doesn't allow custom ABAP' but we need custom validation"

**Analysis:**
1. Understand constraint source:
   - Is it a real SAP limitation (cloud truly doesn't support)?
   - Or is it policy (your organization's governance)?

2. If real limitation → explore alternatives:
   - Use released exit points
   - Use extensibility framework
   - Move to Level A with released feature
   - Use on-premise instead of cloud (if acceptable)

3. If policy constraint → discuss with architecture:
   - Can policy be relaxed for this case?
   - Can requirement be redesigned?
   - Document exception if approved

---

## Reference: Quick Decision Guide for Architects

| Situation | Action |
|-----------|--------|
| User got Level D | ❌ Escalate immediately; explore Level A/B/C first |
| Tech debt > 70 | ⚠️ Add to debt registry; plan future remediation |
| Cloud readiness < 50% | ⚠️ If cloud strategic, revisit design approach |
| Upgrade impact > 60 | ⚠️ Plan proactive updates before SAP upgrades |
| User questions recommendation | ✅ Review decision path; verify it aligns to your standards |
| Want to override | ✅ Document exception; get appropriate approvals |
| Need to update questions | ✅ Contact admin; follow master data change process |

---

## Summary for Solution Architects

**You now understand:**
- ✅ How the decision engine navigates questions using JSON rules
- ✅ How scoring system calculates metrics (formulas and logic)
- ✅ How to use scores for governance and gate reviews
- ✅ How to integrate tool into your design workflow
- ✅ How to handle exceptions and escalations
- ✅ Performance characteristics and limitations

**Next Step:** Integrate tool into your project governance framework (gates, approvals, escalation paths).

---

**Questions or Issues?**  
Contact: Technical Architecture Team or Product Owner
