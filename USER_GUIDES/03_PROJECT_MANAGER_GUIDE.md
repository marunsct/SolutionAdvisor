# Clean Core Solution Advisor - User Guide
## For Project Managers & Program Leads

**Version:** 1.0  
**Last Updated:** December 2025  
**Audience:** Project Managers, Program Directors, PMO Teams, Project Controllers

---

## Table of Contents
1. [Why This Tool Matters for Projects](#why-this-tool-matters-for-projects)
2. [Project Integration Timeline](#project-integration-timeline)
3. [Portfolio Health Dashboard](#portfolio-health-dashboard)
4. [Technical Debt Management](#technical-debt-management)
5. [Risk Tracking & Escalations](#risk-tracking--escalations)
6. [Effort & Schedule Impact](#effort--schedule-impact)
7. [Project Metrics & Reporting](#project-metrics--reporting)
8. [Governance Integration](#governance-integration)
9. [Common Project Challenges](#common-project-challenges)

---

## Why This Tool Matters for Projects

### The Problem We're Solving

Before this tool:
- ❌ Architects made different decisions for similar requirements
- ❌ Technical debt snuck into projects undetected
- ❌ Upgrade impacts discovered too late (during UAT or go-live)
- ❌ "Tech debt" was vague → no metrics for tracking
- ❌ Portfolio-level decisions weren't based on data

### How This Tool Helps

✅ **Consistent approach selection** → All 100+ requirements use same decision framework  
✅ **Quantified risk metrics** → See exactly which decisions add debt  
✅ **Early escalation** → Problem designs flagged before development starts  
✅ **Traceable decisions** → Full audit trail (who approved what and why)  
✅ **Portfolio visibility** → Dashboard shows overall technical health  

### Business Impact

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| **Rework rate** | 12% of detailed designs need rework | 4% | 40% fewer surprises |
| **Upgrade effort** | Discovered during upgrade → expensive fixes | Identified upfront; built into plan | 30% cost savings |
| **Schedule slippage** | Design issues cause 2-3 week delays | Issues caught at gate review | Stay on schedule |
| **Quality issues** | 15% post-go-live bugs from tech debt | 5% | Better user experience |

---

## Project Integration Timeline

### Phase 1: Project Kickoff (Week 1)

**Activity:** Understand tool and plan integration

**Actions:**
1. ✅ Project lead attends 30-min tool overview
2. ✅ Identify "master RICEFW list" (all ~100 requirements)
3. ✅ Plan: When will each RICEFW be analyzed? (during RTM completion)
4. ✅ Assign ownership: Whose responsibility to run wizard for each requirement?
5. ✅ Set schedule: "Add tool analysis to RTM gate review"

**Deliverable:** Project kickoff slide explaining decision framework + schedule

---

### Phase 2: RICEFW Creation (Weeks 2-4)

**Activity:** As each RICEFW is created → immediately run the tool

**Timeline:**
```
RTM Creation Phase:
  Week 2: 10 RICEFWs created
  └─ Each gets analyzed → 10 analyses in system
  
  Week 3: 20 more RICEFWs
  └─ Wizard run 20 times → 30 total analyses
  
  Week 4: Final RICEFWs + re-run any flagged items
  └─ Complete set of 100+ analyses
```

**Responsible Roles:**
- **RICEFW Creator:** Runs wizard, saves analysis draft
- **Technical Lead:** Reviews results, approves approach
- **ProjectAdmin:** Tracks which RICEFWs have been analyzed

**Deliverable:** RICEFW → Analysis mapping (dashboard view)

---

### Phase 3: RTM Gate Review (Week 5)

**Activity:** Use analysis results to validate RTM quality

**Gate Criteria:**
- ✅ All RICEFWs have analysis results
- ✅ No Level D without documented exception
- ✅ Technical Debt score < 60 average (across all)
- ✅ Constraint list reviewed and understood

**Escalation:**
- 🔴 > 5 Level D decisions → Stop RTM; reassess approach portfolio-wide
- 🔴 > 3 cloud readiness < 50% AND cloud is strategic → Re-architect
- ✅ Otherwise → RTM approved; proceed to ADD/RDD

**Output:** Gate review report with summary scorecard

---

### Phase 4: ADD/RDD Creation (Weeks 6-10)

**Activity:** Designs must reference wizard recommendations + scores

**Check:**
- ✅ ADD document calls out recommended level
- ✅ ADD design follows that level's approach
- ✅ If deviating, exception is documented + approved
- ✅ Constraints are addressed in design

**Project Lead Role:** Spot-check 20% of ADDs for compliance

**Output:** ADD/RDD pack with decision alignment

---

### Phase 5: Functional Spec (Weeks 11-14)

**Activity:** FS references decision analysis; no surprises expected

**Check:**
- ✅ FS includes scores + justification for chosen approach
- ✅ FS calls out all constraints
- ✅ No vague language ("we'll figure out implementation later")
- ✅ Example: "This report processes 5M+ records daily; Level B approach with OData API pagination"

**PMO Role:** Update project metrics dashboard with baseline scores

---

### Phase 6: Development (Weeks 15-40)

**Activity:** Build exactly what was decided; track deviations

**Monitoring:**
- If developer discovers issue mid-development → escalate immediately
- Avoid: "We didn't realize we needed Level C code until UAT"
- All Level C/D decisions must have approval trail

**Output:** Development proceeds without surprises

---

### Phase 7: Testing (Weeks 41-45)

**Activity:** Validate implementation matches decided approach

**Test Cases:**
- Functional: "Does the chosen approach work?" (e.g., API pagination)
- Performance: "Do we stay within constraints?" (e.g., < 5 min response time)
- Upgrade: For Level C/D: "Can we upgrade without major rework?"

**Output:** Test report confirms approach viability

---

## Portfolio Health Dashboard

### Dashboard View
When you log in as a Project Manager, you see the high-level health of your project's technical decisions:

```text
+---------------------------------------------------------------+
|  Project: S/4HANA Migration (Phase 2)              [Settings] |
+---------------------------------------------------------------+
|  DECISION STATUS:                                             |
|  Analyzed: 95/100 RICEFWs   Pending: 5                        |
+---------------------------------------------------------------+
|  CLEAN CORE COMPLIANCE:                                       |
|  Target: 80% Level A/B      Actual: 80%  (On Track)           |
|                                                               |
|  Level A (Standard):  45  [==========]                        |
|  Level B (Cloud Ext): 35  [=======...]                        |
|  Level C (Custom):    15  [===.......]                        |
|  Level D (Avoid):      5  [=.........] <- REQUIRES APPROVAL   |
+---------------------------------------------------------------+
|  PROJECT RISKS:                                               |
|  [!] 5 Level D items pending CTO approval (Schedule Risk)     |
|  [!] 3 items have Cloud Readiness < 50% (Strategy Risk)       |
+---------------------------------------------------------------+
```

### Key Metrics (View in Admin Panel → Analytics)

#### 1. Clean Core Level Distribution

```
Level Distribution (All RICEFWs):
  Level A (Cloud-Optimized):  45 RICEFWs  (45%)  ✅ Best
  Level B (Cloud-Ready):       35 RICEFWs  (35%)  ✅ Good
  Level C (Custom Code):       15 RICEFWs  (15%)  ⚠️  Caution
  Level D (High Debt):          5 RICEFWs  (5%)   🔴 Escalate
  Total:                       100 RICEFWs
```

**Interpretation:**
- ✅ Good: 80% at Level A/B (cloud-ready)
- ⚠️ Warning: 15% Level C (manageable if monitored)
- 🔴 Red: 5% Level D (should have exceptions documented)

**Action if different:**
- If > 70% Level C/D → Portfolio at risk; escalate to steering committee
- If > 10% Level D → Need architectural reset before development
- If < 30% Level A → Cloud strategy may be unrealistic

---

#### 2. Technical Debt Trend

```
Month-over-Month Average Technical Debt Score:

  Baseline (Nov): 38/100 (Low debt)
    └─ 25% RICEFWs at debt < 30
    └─ 55% RICEFWs at debt 30-60
    └─ 20% RICEFWs at debt > 60

  Month 1 (Dec):  42/100 (Still acceptable but trending up)
    └─ 20% RICEFWs at debt < 30 (fewer Level A)
    └─ 50% RICEFWs at debt 30-60
    └─ 30% RICEFWs at debt > 60 (more Level C/D)
    └─ Trend: ⬆️ Up 10% from baseline
    └─ Reason: More RICEFWs decided Level B vs A
    └─ Action: Review whether Level B choices were justified

  Month 2 (Jan):  48/100 (Getting concerning)
    └─ Trend: ⬆️ Up 26% from baseline
    └─ Status: 🔴 Escalate if continues
    └─ Action: Mandatory architecture review
```

**Portfolio Dashboard Usage:**
- **Weekly PMO Report:** "Tech debt average increased 1 point this week; review attached exceptions"
- **Monthly Steering:** "Clean core health stable; 2 Level D approvals, both documented"
- **Quarterly Review:** "Year-to-date technical debt increased 15%; plan remediation for Year 2"

---

#### 3. Cloud Readiness Scorecard

```
Cloud Readiness: 68% (Overall)
  Suitable for Cloud (readiness > 70%):     68 RICEFWs
  Conditional (readiness 50-70%):          20 RICEFWs
  Not Cloud Ready (readiness < 50%):       12 RICEFWs

Cloud Strategy Impact:
  ✅ 68% of RICEFWs can move to cloud without re-architecture
  ⚠️  20% need some re-design to become cloud-ready
  🔴 12% will require major re-work OR stay on-premise
```

**Usage for Cloud Strategy:**
- **If migrating to cloud next year:** "12 RICEFWs need re-architecture now; add to Year 2 backlog"
- **If staying on-premise:** "68% cloud-ready design creates vendor lock-in risk; revisit strategy"
- **If hybrid:** "Plan cloud for 68 RICEFWs; on-premise for 32"

---

#### 4. Upgrade Impact Register

```
Upgrade Impact Forecast (Next SAP Upgrade):

Potential Upgrade Effort:
  Level A RICEFWs:    0 hours impact (uses released features)
  Level B RICEFWs:    5 hours × 35 = 175 hours
  Level C RICEFWs:    20 hours × 15 = 300 hours
  Level D RICEFWs:    50+ hours × 5 = 250+ hours
  
  Total Estimated:    725+ hours for upgrade validation
  Team capacity:      2 resources × 6 weeks × 40 hours = 480 hours available
  
  Status:             🔴 Under-resourced by 245+ hours
  Recommendation:     Either reduce Level C/D count OR plan for 9 weeks
```

**PMO Planning:**
- Plan upgrade cycle with expected effort (not discovery during upgrade)
- Request resource buffer (225-250 hours) for upgrade validation
- Target: Reduce Level C/D before upgrade (proactive maintenance)

---

## Technical Debt Management

### What is Technical Debt (in this context)?

**Definition:** Code/design decisions that are simpler now but will cost more to maintain/upgrade later.

| Level | Type | Debt | Example |
|-------|------|------|---------|
| **A** | None | 0 | Use released SAP API → 0 debt |
| **B** | Extensibility | Low | Use SAP extension point → 5 debt |
| **C** | Custom Code | Medium | Custom ABAP module → 30 debt |
| **D** | Heavy Custom | High | Deep business logic → 70+ debt |

### Managing Debt on Projects

**Rule 1: Know Your Debt**
```
Every decision should have associated debt score.
Example Decision Doc:
  
  RICEFW: I-0042-IMP
  Approach: Level B (SAP Extensibility)
  Tech Debt Score: 45/100
  Reason: Uses framework but moderate custom logic
  Future Cost: When SAP releases new feature for this → need to migrate
```

**Rule 2: Track Total Debt**
```
Project-Level Tracking:
  Target Max Tech Debt: 50/100 average
  Current avg:         45/100 ✅
  At Risk (> 60):      3 RICEFWs
  Critical (> 80):     0 RICEFWs
```

**Rule 3: Plan Remediation**
```
Debt Remediation Backlog:

High Debt Items (Score > 70):
  (none currently)

Medium Debt Items (Score 50-70):
  1. I-0042-IMP (Debt: 65) → Migrate to Level A when API released (Year 2)
  2. R-0108-ART (Debt: 58) → Refactor to simpler query (Year 2)
  3. C-0205-SUB (Debt: 55) → Review for simplification (Year 2)

Action: Add to Year 2 backlog; estimate 4 weeks effort total
```

---

### Technical Debt Over Project Lifecycle

```
Timeline:

Kickoff → RTM → Design → Dev → Test → Go-Live → Ops
   ↓       ↓      ↓      ↓     ↓      ↓        ↓
   5      42      45      40    42     40      80+ (grows in operations!)
   
Why does it grow?
  - Patches applied without full design review
  - Production bugs require quick fixes (Level C/D code)
  - Tech debt not actively managed after go-live
  
Prevention:
  - Operational support follows same decision framework
  - Patches reviewed by architect (apply decision engine)
  - Annual tech debt audit (find and fix Level D items)
```

---

## Risk Tracking & Escalations

### Escalation Criteria

#### 🔴 Critical - Escalate Immediately

| Situation | Action |
|-----------|--------|
| RICEFW got Level D recommendation | Stop; escalate to CTO |
| Tech debt average > 70 | Steering committee review |
| Cloud readiness < 30% but cloud is strategy | Architectural reset needed |
| Upgrade impact > 80 for item | Plan immediate risk mitigation |

**Escalation Template:**
```
TO: CTO / Steering Committee
FROM: Project Manager
RE: [RICEFW ID] - Level D Decision Escalation

Decision: Level D (High Debt) recommended
Scores:
  - Technical Debt: 85/100
  - Upgrade Impact: 90/100
  - Cloud Readiness: 20%

Reason: [Describe why Level A/B/C not possible]

Business Impact:
  - Effort savings this year: X hours
  - Future cost (upgrade): Y hours
  - Cloud lock-in risk: Z years

Recommendation:
  - Accept Level D with exception approval + remediation plan
  - OR reject requirement and re-scope
  - OR invest in platform feature now (defer this RICEFW)

Requested Action: [Approve / Reject / Discuss]
```

---

#### ⚠️ Warning - Monitor & Plan

| Situation | Action |
|-----------|--------|
| 5+ Level C decisions | Add to tech debt registry; plan Year 2 remediation |
| Tech debt trend increasing 10+ points/month | Investigate cause; adjust decision criteria |
| Cloud readiness declining | Review if recent decisions favor on-premise |
| 4+ weeks added to estimate due to tech debt | Update project plan |

**Monitoring Template:**
```
Weekly Technical Health Report

Level Distribution:
  A: 45 RICEFWs ✅
  B: 35 RICEFWs ✅
  C: 15 RICEFWs ⚠️
  D: 5 RICEFWs 🔴

Week-over-Week Changes:
  A: ↓ 1 (45→44)  ← Lost 1 Level A decision
  B: ↑ 2 (33→35)  ← Good, gained 2 Level B
  C: → 15         ← Unchanged (good)
  D: → 5          ← No new escalations (good)

Issues:
  - 1 RICEFW re-analyzed (technical changes); moved from A to B
  - Action: Verify technical change, update ADD if needed

Upcoming:
  - Next 8 RICEFWs in queue for analysis (Week 4)
  - Projection: 3 Level A, 3 Level B, 2 Level C expected
```

---

## Effort & Schedule Impact

### How Decisions Affect Project Duration

#### Scenario: 100-RICEFW Project

**Level A Approach:**
```
Average effort per RICEFW:
  Design:      3 days (straightforward)
  Development: 5 days (follow standard patterns)
  Testing:     2 days (standard testing)
  Total:       10 days per RICEFW

45 × 10 = 450 days effort
÷ 5 people = 90 days calendar → 3 months (A RICEFWs only)
```

**Level C Approach:**
```
Average effort per RICEFW:
  Design:      10 days (complex, multiple options)
  Development: 15 days (custom code, debugging)
  Testing:     7 days (more edge cases)
  Total:       32 days per RICEFW

15 × 32 = 480 days effort
÷ 5 people = 96 days calendar → 3.2 months (C RICEFWs only)
  ↑ 15% longer than Level A!
```

**Level D Approach:**
```
Average effort per RICEFW:
  Design:      20 days (very complex, architecture review needed)
  Development: 30 days (heavy custom, debugging, iterations)
  Testing:     14 days (extensive testing, edge cases)
  Total:       64 days per RICEFW

5 × 64 = 320 days effort
÷ 5 people = 64 days calendar
  ↑ 50% longer than Level A!
```

**Blended Project (45A + 35B + 15C + 5D):**
```
(45 × 10) + (35 × 18) + (15 × 32) + (5 × 64) = 450 + 630 + 480 + 320 = 1,880 days
÷ 5 people = 376 days calendar effort
Parallel work, contingency: 6 months (26 weeks) realistic

If all Level A:    450 ÷ 5 = 90 days → 4.5 weeks
If all Level C:    1,500 ÷ 5 = 300 days → 15 weeks  
If all Level D:    320 ÷ 5 = 64 days → 3.2 weeks BUT requires CTO approval time!
```

### Schedule Risk Register

**Template for tracking:**
```
SCHEDULE RISK REGISTER

Risk: Level D decisions delay project due to approval cycles
  Probability: High
  Impact: 2-4 weeks per Level D RICEFW (waiting for exception approval)
  Mitigation:
    - Get Level D approvals batched (don't approve one at a time)
    - Schedule CTO review for Week 3 (batch review all Level D)
    - Owner: Project Manager

Risk: Complex Level C designs discovered during development (not design)
  Probability: Medium
  Impact: 1-2 week delay + quality issues
  Mitigation:
    - Require technical architect review of all Level C designs before dev starts
    - Add 15% buffer to Level C estimate
    - Owner: Technical Lead

Risk: Upgrade during project delays release
  Probability: Low but high impact
  Impact: 4+ weeks to validate all RICEFWs against new SAP version
  Mitigation:
    - Check SAP roadmap; avoid development during major upgrade windows
    - If unavoidable, add 4-week buffer to schedule
    - Owner: PMO
```

---

## Project Metrics & Reporting

### Executive Dashboard (for Steering Committee)

**Monthly Status Report:**

```
CLEAN CORE HEALTH DASHBOARD
Month: December 2025

Overall Status: 🟡 ON TRACK (slight technical debt concern)

Key Metrics:
┌──────────────────────────────────────────┐
│ Decisions Made:    95 of 100 RICEFWs    │
│ Completion:        95% ✅                │
│ Tech Debt Avg:     48/100 (target: <50) │ → ⚠️ Slightly high
│ Cloud Readiness:   68% (target: 70%)    │ → ⚠️ Slightly low
│ Upgrade Impact:    Moderate              │ → ✅ On track
│ Level Distribution:                       │
│   A (Best):        45 RICEFWs (45%)  ✅ │
│   B (Good):        35 RICEFWs (35%)  ✅ │
│   C (Caution):     15 RICEFWs (15%)  ⚠️ │
│   D (Escalate):    5 RICEFWs (5%)    🔴 │
└──────────────────────────────────────────┘

Risks:
  🔴 5 RICEFWs at Level D (all with exceptions documented)
  ⚠️  Tech debt trending up 2 points/month
  ⚠️  Cloud readiness 2 points below target

Mitigations:
  ✅ Level D exceptions all approved by CTO (no blockers)
  ✅ Plan to move 3 Level C items to B in Year 2
  ✅ No blocking issues for next phase

Schedule:
  ✅ RTM gate: ON TIME (Week 5)
  ✅ ADD/RDD start: ON TIME (Week 6)
  ✅ Go-live: ON TRACK (Week 26)
```

---

### Weekly PMO Report

```
SOLUTION ADVISOR WEEKLY UPDATE

RICEFWs Analyzed This Week: 8
  Level A: 4 ✅
  Level B: 3 ✅
  Level C: 1 ⚠️
  Level D: 0

Cumulative Total: 95 RICEFWs

Issues:
  1. RICEFW R-0087-SLS moved from B to C
     Reason: Higher volume discovered during design
     Impact: ADD schedule impact (1-2 days)
     Owner: Technical Lead to verify ADD feasibility
  
  2. No Level D approvals needed this week ✅

Next Week:
  Plan to analyze 5 remaining RICEFWs
  Complete RICEFW analysis by Week 4 (on schedule)
```

---

## Governance Integration

### Steering Committee Gate Reviews

**Quarterly Clean Core Health Review:**

```
AGENDA:
1. Portfolio metrics review (tech debt, cloud readiness, upgrade impact)
2. Level D exceptions review (why approved, what's the mitigation?)
3. Technical debt trending (is it increasing? why?)
4. Year 2 backlog impact (remediation plan)
5. Cloud strategy alignment (are we supporting/hindering migration?)
```

**Meeting Output:**
```
DECISION LOG:

✅ Approved: 5 Level D exceptions with documented business cases
   - All follow clean core rules
   - Mitigations in place
   - No blockers

⚠️  Noted: Tech debt increased from 42 → 48 average
   - Reason: More complex RICEFWs recently analyzed
   - Action: Review if business case changes warrant simpler approach
   - Owner: Program Director to assess

⚠️  Noted: Cloud readiness 68% vs. target 75%
   - Reason: 12 RICEFWs below 50% cloud readiness
   - Action: Evaluate if cloud strategy needs updating
   - Owner: CTO

✅ Approved: Year 2 tech debt remediation backlog (15 items)
   - Estimated effort: 4 weeks
   - Timeline: Q2 2026
   - Priority: Re-architecture Level C/D items to lower debt
```

---

## Common Project Challenges

### Challenge 1: "Everyone Got Approved for Level C/D; Nothing is Level A"

**Root Cause:**
- Decision engine questions not rigorous enough
- Or real complexity in requirements (Level A not possible)

**Diagnostic:**
```
If 70%+ are Level C/D:
  → Either requirements are complex (legitimate)
  → Or tool/questions need calibration (unlikely)
  
Check:
1. Review 10 random Level C decisions
2. Ask: "Could this be Level A/B?"
3. If yes for 7+ → Tool needs calibration; escalate to admin
4. If no → Requirements genuinely complex; adjust portfolio plan
```

**Fix:**
- **If tool issue:** Admin updates master data (questions, levels)
- **If requirement issue:** Cannot reduce scope; accept higher tech debt + plan mitigation

---

### Challenge 2: "Project Got Longer; Now We Need 6 Months Instead of 4"

**Root Cause:** Level C/D decisions weren't counted in original estimate.

**Prevention:**
```
Correct Estimate Process:
1. Get sample RICEFWs analyzed (first 10)
2. See what mix of A/B/C/D you get
3. Calculate blended effort:
   - (% at A × effort_A) + (% at B × effort_B) + ...
4. Apply to full project
5. Include contingency for Level D approval delays

Example:
  Sample showed: 40% A, 40% B, 20% C
  Effort = (0.4 × 10) + (0.4 × 18) + (0.2 × 32) = 16.8 days average per RICEFW
  100 RICEFWs × 16.8 = 1,680 days
  ÷ 5 people = 336 days → 6.7 months (corrected estimate)
```

---

### Challenge 3: "We Missed a Critical RICEFW; Now Forcing Level D"

**Scenario:**
```
Requirement: Multi-tenant SaaS integration
Discovered: Too late to re-architect as Level A/B
Result: Forced into Level D with high debt

Impact:
  - 2 weeks additional development
  - High upgrade risk (planned for Year 2 remediation)
  - CTO had to approve exception
```

**Prevention:**
- ✅ Early RICEFW analysis (don't wait until design complete)
- ✅ Architecture review before requirements locked
- ✅ Use real-world examples to flag complex patterns early

---

### Challenge 4: "Different Teams Made Different Decisions for Same Type of Requirement"

**Scenario:**
```
Team A (Reports):
  RICEFW R-0040 → 3 queries → Level A

Team B (Reports):
  RICEFW R-0087 → 4 queries → Level C

Question: Why different?

Root Cause:
  - Team B's report needed complex security filtering
  - Didn't use wizard; just designed
  - Missed that "no released API" → Level B/C decision
```

**Prevention:**
- ✅ Mandatory wizard use for every RICEFW (not optional)
- ✅ Project manager spot-checks 20% of decisions vs. ADD
- ✅ Escalate any deviation from recommendation

---

### Challenge 5: "Technical Debt Getting Out of Control"

**Scenario:**
```
Month 1: Avg debt = 40
Month 2: Avg debt = 45
Month 3: Avg debt = 55
Month 4: Avg debt = 62 ← 🔴 Red alert!

Why?
  - Started taking Level C without justification
  - Pressure to finish faster (skipping proper design)
  - Architect team reduced (less review capacity)
```

**Recovery Plan:**
```
Step 1: Root cause (done above → staffing issue)
Step 2: Corrective action
  - Hire additional architect resources
  - Mandate Level A/B-first approach (only Level C if justified)
  - Steering committee approval for each Level C
Step 3: Monitor
  - Weekly debt reporting
  - Target: Bring average back to < 50 by Month 6
Step 4: Adjust project plan
  - Earlier rework cycles now needed
  - May need 2 additional weeks for quality assurance
```

---

## Summary for Project Managers

**You now understand:**
- ✅ When to run the tool (immediately after RICEFW creation)
- ✅ How to integrate into gates and approvals
- ✅ How to track technical debt as project metric
- ✅ How to forecast schedule impact (A vs. C vs. D decisions)
- ✅ What to escalate (Level D, high debt trends)
- ✅ How to report portfolio health to steering committee

**Next Step:** Add tool integration to project charter; include in phase gates and estimate baseline.

---

**Questions or Issues?**  
Contact: PMO or Project Management Office
