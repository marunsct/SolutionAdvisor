# Clean Core Solution Advisor - Quick Reference Card
## One-Page Reference for Every Role

```text
[ START ] -> [ Select RICEFW Type ] -> [ Answer Questions ] -> [ Get Level (A-D) ]
                                                                    |
                                                                    v
                                                           [ Export to PDF/FS ]
```

---

## 🔵 FOR FUNCTIONAL CONSULTANTS & ANALYSTS

### Run Your Analysis in 5 Steps

**Step 1: Create Project**
- Click "New Project"
- Enter project name, select S/4HANA flavor (Public Cloud, Private Cloud, On-Premise)
- Save

**Step 2: Create Analysis**
- Click "New Analysis"
- Select RICEFW type (Report, Interface, Conversion, Enhancement, Form, Workflow)
- Select object (e.g., "Sales Report")
- Save

**Step 3: Answer Wizard Questions**
- Follow wizard (4-6 questions typically)
- Click "?" for detailed explanations
- Select answer from dropdown

**Step 4: Review Recommendation**
- Level A/B/C/D recommendation shown
- View 4 scores:
  - Tech Debt (0-100, lower=better)
  - Cloud Readiness (0-100%, higher=better)
  - Upgrade Impact (0-100, lower=better)
  - Health Score (0-100, higher=better)

**Step 5: Export & Share**
- Click "Export as PDF"
- Share with technical lead or project manager

### Score Interpretation

| Score | Tech Debt | Cloud Ready | Upgrade Impact | Health | Action |
|-------|-----------|-------------|----------------|--------|--------|
| 0-25 | ✅ None | ❌ Not ready | ✅ Very safe | ❌ Poor | Escalate |
| 26-50 | ⚠️ Low | ⚠️ Partial | ⚠️ Moderate | ⚠️ Fair | Review |
| 51-75 | 🔴 Medium | ⚠️ Mostly | 🔴 Risky | ⚠️ Fair | Caution |
| 76-100 | 🔴 High | 🔴 No | 🔴 Very risky | 🔴 Poor | Escalate |

### Level Quick Guide

| Level | Tech Debt | Cloud Ready | Cost | Risk | Use When |
|-------|-----------|-------------|------|------|----------|
| **A** | Low | 100% | Low | Very Low | Use released SAP features |
| **B** | Medium | High | Medium | Low | Use extensibility framework |
| **C** | High | Partial | High | Medium | Custom code with governance |
| **D** | Critical | Low | Very High | High | Avoid if possible; escalate |

### When to Escalate

❌ **Stop & Escalate If:**
- Recommendation is Level D
- Tech Debt > 70
- Cloud readiness < 50% but cloud is strategic
- Upgrade Impact > 75

✅ **Otherwise:** Proceed with ADD/RDD

---

## 🟣 FOR SOLUTION ARCHITECTS & TECHNICAL LEADS

### Governance Decision Matrix

**Level A/B Recommendations:**
- ✅ Auto-approved
- No workflow needed
- Proceed directly to design

**Level C Recommendations:**
- ⚠️ Requires review
- Document justification
- Technical lead sign-off
- Timeline: 2-3 business days

**Level D Recommendations:**
- 🛑 MUST escalate to CTO/Board
- Business case required
- Alternative approaches documented
- Timeline: 5+ business days

### Score Thresholds for Decision Gates

```
Approve for Design | Technical Debt < 60
                   | Cloud Readiness > 50% (or cloud not strategic)
                   | Upgrade Impact < 75

Require Review     | Technical Debt 60-75
                   | Cloud Readiness 30-50%
                   | Upgrade Impact 50-75

Escalate/Redesign  | Technical Debt > 75
                   | Cloud Readiness < 30%
                   | Upgrade Impact > 75
                   | Level D recommendation
```

### Integration into Design Workflow

1. **RTM Gate:** All RICEFWs analyzed; no Level D without approval
2. **ADD/RDD Gate:** Design aligns to recommendation; constraints addressed
3. **FS Gate:** FS includes scores + level approach
4. **Architecture Board (Quarterly):** Portfolio health review; 5+ Level D escalations; tech debt trending

### Scoring Formulas (Quick Reference)

```
Tech Debt Score = 50 × [Level Multiplier A:0, B:1, C:3, D:5] × [Complexity]
Cloud Readiness = 80 × [Level Multiplier A:1, B:0.8, C:0.5, D:0.2] × [Cloud Factor]
Upgrade Impact = 50 × [Level Multiplier A:0, B:1, C:3, D:5] × [Path Complexity]
Health Score = (100 - TechDebt) × 0.30 + CloudReady × 0.35 + (100 - Upgrade) × 0.35
```

---

## 🟢 FOR PROJECT MANAGERS & PMO

### Phase Gate Schedule

| Phase | Week | Activity | Gate Criteria |
|-------|------|----------|---------------|
| RTM | 1-5 | All RICEFWs analyzed | No Level D without exception |
| ADD/RDD | 6-10 | 100+ designs created | Design aligns to recommendation |
| FS | 11-14 | Functional specs written | FS references scores |
| Dev | 15-40 | Implementation | No surprises mid-development |
| Testing | 41-45 | QA validation | Implementation matches approach |

### Effort Estimation Formula

```
Average Effort per RICEFW =
  (% at A × 10 days) +
  (% at B × 18 days) +
  (% at C × 32 days) +
  (% at D × 64 days)

Divide by team size in FTE to get calendar duration
Add 15% contingency for Level C/D complexity
Add 2 weeks if > 3 Level D (approval cycle delays)
```

### Technical Debt Escalation Criteria

| Metric | Target | Yellow ⚠️ | Red 🔴 |
|--------|--------|-----------|---------|
| Tech Debt Avg | < 40 | 40-60 | > 60 |
| Level D Count | 0-2 | 3-5 | > 5 |
| Cloud Readiness | > 70% | 50-70% | < 50% |
| Upgrade Impact Avg | < 40 | 40-60 | > 60 |

### Portfolio Dashboard at a Glance

```
MONTHLY STATUS:
  ✅ 45 RICEFWs Level A (45%)
  ✅ 35 RICEFWs Level B (35%)
  ⚠️  15 RICEFWs Level C (15%)
  🔴 5 RICEFWs Level D (5%)
  
Status: ON TRACK / AT RISK / OFF TRACK?
  Tech Debt: 48/100 (target: < 50) ✅
  Cloud Ready: 68% (target: > 70%) ⚠️
  Upgrade Impact: Moderate ✅
```

### Steering Committee Report Template

- **RICEFWs Analyzed:** X of 100 (X% complete)
- **Level Distribution:** A:%, B:%, C:%, D:%
- **Tech Debt Trend:** +X points from last month (target: stable)
- **Risks:** [List any escalations needed]
- **Schedule Impact:** On track / [X days at risk]

---

## 🟠 FOR SYSTEM ADMINISTRATORS

### Admin Responsibilities Checklist

**Daily:**
- Monitor error logs (AuditLog table)
- Check database performance (query times < 100ms)

**Weekly:**
- Backup data: `cds export --from hana --to csv`
- Review user access (security audit)

**Monthly:**
- Validate QuestionFlow navigation rules (test 5+ question flows)
- Check scoring multipliers (verify still align to policy)
- Archive old analyses (keep < 1 year of data in hot storage)

**Quarterly:**
- Performance tuning (review slow queries)
- Capacity planning (prepare for growth)
- Update documentation

### Master Data Entities Quick Reference

```
QuestionFlow:        Questions + navigation rules (JSON)
CleanCoreLevels:     A/B/C/D definitions + scoring multipliers
ObjectTypes:         RICEFW type definitions (R/I/C/E/F/W)
PerformanceThreshold: Cloud constraints by flavor + object type
RealWorldExample:    Real customer scenarios (level + industry)
BusinessAreas:       SAP module mappings (FI, MM, SD, etc.)
```

### CSV Upload Process (Quick Steps)

1. Prepare CSV (semicolon-delimited, UTF-8, valid UUIDs)
2. Validate format: `Test-CSVFile <filename>` (PowerShell)
3. Backup current data: `cds export --from hana --to csv`
4. Upload via Admin UI or CLI: `cds import <filename> --to hana`
5. Test by running sample wizard flow
6. Monitor logs for errors: `tail -f logs/application.log`

### Role Permissions Matrix (Simplified)

| Action | Admin | TenantAdmin | ProjectAdmin | Architect | Developer | Viewer |
|--------|-------|-------------|--------------|-----------|-----------|--------|
| Create Analysis | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit Any Analysis | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Level C | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve Level D | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Master Data | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Common Issues & Quick Fixes

**Issue: Questions not loading (wizard stuck)**
- ✅ Check: SELECT * FROM sd_QuestionFlow WHERE objectType = 'R'
- ✅ Fix: Verify displayOrder = 1,2,3... (no gaps)

**Issue: Scores seem wrong**
- ✅ Check: SELECT * FROM sd_CleanCoreLevels WHERE level = 'B'
- ✅ Fix: Verify multipliers match policy; clear cache if updated

**Issue: CSV import failed**
- ✅ Check: Is ID a valid UUID? (exactly 36 chars)
- ✅ Fix: Regenerate: `[guid]::NewGuid().ToString()`

**Issue: Performance slow**
- ✅ Check: SELECT EXECUTION_TIME_MAX FROM M_SQL_PLAN_CACHE
- ✅ Fix: Create index on (objectType, displayOrder)

---

## 🔄 Cross-Role Decision Example

### Scenario: "Large Report, 5M Records/Day, API Not Available"

**Functional Consultant:**
1. Runs wizard → gets Level C recommendation (score: 65 tech debt)
2. Prepares result for technical lead

**Solution Architect:**
1. Reviews scores and constraints
2. Discusses with functional consultant: Is Level A/B possible?
3. Decides: Level C acceptable; documents justification
4. Approves for ADD phase

**Project Manager:**
1. Notes: Tech debt +15 points from baseline
2. Adds to portfolio: Now 50% Level C (was 35%)
3. Escalates: "Why sudden shift toward Level C?"
4. Gets explanation: "Higher volume items being analyzed"
5. Adjusts forecast: +5% schedule buffer needed

**System Administrator:**
1. Monitoring: Sees 2 more Level C approvals this week
2. Logs: AuditLog records who approved, when, reasoning
3. Quarterly review: Notifies team of accumulating tech debt

---

## 📞 Quick Help

| Question | Answer |
|----------|--------|
| Where do I find my analyses? | Home → "My Analyses" |
| How do I export results? | Click analysis → "Export as PDF" |
| Who do I contact for access? | System Admin or help desk |
| How often should I re-run analyses? | Only if scope materially changes |
| Can I save mid-wizard? | Yes, session auto-saves every question |
| What if I disagree with recommendation? | Discuss with technical lead; document exception |

---

## 📏 System Specifications

- **Browser:** Chrome, Firefox, Edge (latest 2 versions)
- **Max Concurrent Users:** 100+
- **Question Load Time:** < 2 seconds
- **Wizard Time:** 5-15 minutes (varies by complexity)
- **Data Retention:** 2 years (+ 5 year audit log)

---

**Need More Info?** See full guides:
- 🔵 Functional Consultant: `01_FUNCTIONAL_CONSULTANT_GUIDE.md`
- 🟣 Solution Architect: `02_SOLUTION_ARCHITECT_GUIDE.md`
- 🟢 Project Manager: `03_PROJECT_MANAGER_GUIDE.md`
- 🟠 Administrator: `04_ADMIN_GUIDE.md`
- 📖 Index & Overview: `00_INDEX_AND_OVERVIEW.md`

**Last Updated:** December 2, 2025
