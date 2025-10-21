# Solution Designer Reference - SAP Clean Core Framework

**Document Type:** Complete Reference Guide  
**Version:** 1.0  
**Date:** October 21, 2025  
**Source:** Solution-Designer.xlsx

---

## Table of Contents

1. Overview of Solution Designer
2. Object Types and Questions
3. Clean Core Levels Definitions
4. Decision Tree Configuration
5. Data Model for Designer
6. Scoring and Metrics Integration
7. Usage Examples
8. Integration Paths

---

## 1. Overview of Solution Designer

**Purpose:** Excel-based Solution Designer to generate clean core decisions for RICEFW objects. The designer includes question flows, clean core level mapping, hints, and scoring templates.

**Components:**
- **Object Types:** Reports, Interfaces, Conversions, Enhancements, Forms, Workflows
- **Question Flows:** Sequential decision questions for each object type
- **Clean Core Levels:** A, B, C, D definitions and criteria
- **Hints:** Brief and detailed explanations per question
- **Scoring Templates:** Technical Debt, Cloud Readiness, Upgrade Impact calculators

---

## 2. Object Types and Questions

| Object Type | Sheet Name                 | Question Count |
|-------------|----------------------------|----------------|
| Reports     | Report Questions           | 12             |
| Interfaces  | Interface Questions        | 14             |
| Conversions | ConversionSelector         | 22             |
| Enhancements| EnhancementSelector        | 15             |
| Forms       | Forms Questions            | 10             |
| Workflows   | Workflow Questions         | 13             |

---

## 3. Clean Core Levels Definitions

Sheet: CleanCoreLevels

| Level  | Name                         | Description                                      | Multiplier (Debt) | Factor (Readiness) | Multiplier (Upgrade) |
|--------|------------------------------|--------------------------------------------------|-------------------|--------------------|----------------------|
| Level A| Fully Clean Core             | Standard/API/Event-based solutions               | 0.00              | 1.00               | 0.00                 |
| Level B| Enhanced Clean Core          | Side-by-side extensions, enhanced patterns       | 1.00              | 0.50               | 1.00                 |
| Level C| Compliant Modifications      | Custom ABAP, governance required                 | 3.00              | 0.20               | 3.00                 |
| Level D| Not Recommended              | Core modifications, high risk                    | 5.00              | 0.00               | 5.00                 |

---

## 4. Decision Tree Configuration

**Structure:** Each question sheet defines:
- `Q.ID` (e.g., Q1, Q2)
- `Question` text
- `Possible answers` count and labels
- `Next question` mapping per answer
- `Final answer` mapping when terminal
- `Hint` and `Detailed Hint`

**Flow Definition:**
```csv
Q.ID,Question,Answers,Answer1,Next1,Final1,Answer2,Next2,Final2,...,Hint,DetailedHint
```

**Navigation:** Logic processed sequentially as defined, branching via `Next` columns until a `Final` decision is reached.

---

## 5. Data Model for Designer

**Entities (Excel Tabs as Tables):**
- `ProjectConfigurations`
- `QuestionFlow` (per object type)
- `CleanCoreLevels`
- `DecisionPath` (historical logging)
- `ScoringTemplates`

**Fields:**
- **ProjectConfigurations:** Tenant, clientName, projectName, complianceRequirements
- **QuestionFlow:** objectType, questionId, questionText, answerOptions JSON, navigationRules JSON, hints
- **CleanCoreLevels:** level, multipliers, descriptions, active flag
- **ScoringTemplates:** formula definitions, weight tables, sample calculations

---

## 6. Scoring and Metrics Integration

Sheet: ScoringTemplates

| Metric                 | Formula                                                          | Inputs                                          |
|------------------------|------------------------------------------------------------------|-------------------------------------------------|
| Technical Debt Score   | Σ(Complexity×Multiplier×Count) / Max ×100                        | complexityFactor, levelMultiplier, objectCount |
| Cloud Readiness Score  | (Σ levelMultiplier for readiness) / totalObjects ×100           | readinessFactor, totalObjects                  |
| Upgrade Impact Score   | Σ(roleFactor×testingMultiplier) / Max ×100                      | riskFactor, testingMultiplier                  |

**Example Calculation:** Provided in separate template sheet with sample data.

---

## 7. Usage Examples

1. **New Report Analysis:** Use `Report Questions` flow to generate clean core level and scoring metrics.
2. **Interface Modernization:** Use `Interface Questions` to determine event/API approach with performance thresholds.
3. **Conversion Path:** Use `ConversionSelector` for greenfield/brownfield decisions—includes data volume and tool selection.

---

## 8. Integration Paths

**Integrate with CAP App:**
- Export Excel tables to CSV
- Import into HANA Cloud via CAP data models
- Use CAP services for question flow, scoring engine, and UI consumption

**Future Enhancements:**
- Direct Excel to OData service generation
- Automated hint enrichment from SAP API
- Integration with SCFD Registry for scoping questions

---

**End of Document**
