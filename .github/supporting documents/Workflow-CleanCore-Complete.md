# SAP S/4HANA Workflow & Business Process Automation - Clean Core Comprehensive Guide

**Document Type:** Complete Reference Guide  
**Version:** 1.0  
**Date:** October 21, 2025  
**Source:** Workflow-Clean-Core-Comprehensive.xlsx

---

## Table of Contents

1. Decision Tree - Workflow Selector
2. Clean Core Levels for Workflows
3. Workflow Determination Factors
4. Performance Thresholds
5. Deployment Constraints
6. Real-World Scenarios
7. SAP Official Guidance
8. Workflow Strategy Matrix

---

## 1. Decision Tree - Workflow Selector

Sheet: Workflow Questions

| Q.ID | Question                                 | Answers | Navigation / Recommendation                              | Hint                                        | Detailed Hint                                                                                     |
|------|------------------------------------------|---------|---------------------------------------------------------|---------------------------------------------|--------------------------------------------------------------------------------------------------|
| Q1   | Clean Core Compliance Required?          | 2       | Yes → Q2; No → flag for remediation & Q2                | Assess compliance requirements               | Decision affects level selection and governance.                                                 |
| Q2   | S/4HANA Deployment Type?                | 3       | Cloud Public → Level A; Private → Q3; On-Prem → Q3      | Select deployment flavor                     | Cloud Public restricts to flexible workflow only. Private/On-Prem supports CAP and custom ABAP.   |
| Q3   | Complexity: Single vs Multi-step?        | 2       | Single → Q4; Multi → Q5                                 | Classify workflow complexity                 | Single-step approvals vs multi-step process chains.                                             |
| Q4   | Standard Flexible Workflow Available?    | 2       | Yes → **Level A**; No → **Level B**                      | Check standard workflow scenarios            | Use Fiori Manage Workflows app for standard scenarios.                                           |
| Q5   | Cross-System / Integration Required?     | 2       | Yes → **Level B**; No → Q6                               | Assess integration needs                     | BTP Process Automation for cross-system flows; custom bridging if needed.                         |
| Q6   | Volume & Performance Requirements?       | 3       | ≤10K active → **Level A**; 10K-50K → **Level B**; >50K → Level C | Evaluate concurrency requirements            | High volume (>50K) requires custom optimization and caching.                                      |
| Q7   | Custom ABAP Workflow Acceptable?        | 2       | Yes → **Level C**; No → **Level D**                      | Last resort check                            | Custom ABAP workflows have high maintenance and upgrade risk.                                     |

---

## 2. Clean Core Levels for Workflows

| Level  | Description                                 | Technology Examples                                               | Upgrade Complexity | Maintenance Effort | Cloud Readiness | Technical Risk |
|--------|---------------------------------------------|-------------------------------------------------------------------|--------------------|--------------------|-----------------|----------------|
| Level A| Fully Clean Core: Flexible Workflow (UI5)   | SAP BTP Process Automation, Flexible Workflow Scenarios           | None               | Low                | Full            | Low            |
| Level B| Enhanced Clean Core: Custom UI5/BTP Logic   | Enhanced Flexible Workflow, CAP/BTP extensions with BRFplus       | Low                | Medium             | Partial         | Medium         |
| Level C| Compliant Modifications: ABAP Workflows      | Custom ABAP Workflow, Cached Decision Logic, Performance Tuning    | Medium             | High               | Limited         | High           |
| Level D| Not Recommended: Core Workflow Modifications| Modified Standard Workflows, Kernel-Level Workflow Enhancements   | High               | Very High          | None            | Critical       |

---

## 3. Workflow Determination Factors

| Factor                       | Level A Criteria                               | Level B Criteria                          | Level C Criteria                             | Level D Criteria                         |
|------------------------------|------------------------------------------------|-------------------------------------------|---------------------------------------------|------------------------------------------|
| Workflow Type                | Standard Flexible Workflow                     | Enhanced with BRFplus                     | Custom ABAP Workflows                       | Modified SAP standard workflows         |
| Deployment Flavor            | Cloud Public, Private, On-Premise               | All except Cloud Public (with extensions)| On-Premise required for ABAP                | Critical legacy integration only        |
| Concurrency                  | ≤10K active workflows                          | 10K-50K                                   | >50K                                        | Unbounded                              |
| Integration Scope            | Intra-system                                   | Cross-system via BTP                      | Custom protocol adapters                  | Direct DB triggers                      |
| SLAs                         | ≤5 sec response                                | 1-5 sec                                   | <1 sec critical                             | No SLA                                 |
| Maintenance Overhead         | Key user configuration only                    | Moderate custom logic                     | High custom ABAP                            | Very high core modifications            |

---

## 4. Performance Thresholds

| Metric                       | Level A Threshold         | Level B Threshold      | Forces Level C       | Example Scenario                                       |
|------------------------------|---------------------------|------------------------|----------------------|--------------------------------------------------------|
| Concurrent Active Workflows  | ≤10K                      | 10K-50K                | >50K                 | Manufacturing: 50K+ lines, real-time approvals         |
| Daily Steps Processed        | ≤100K                     | 100K-500K              | >500K                | E-commerce: High volume order processing              |
| Response Time                | ≤5 seconds                | 1-5 seconds            | <1 second            | Financial: Real-time trade approvals                   |
| Payload per Step             | ≤5MB                      | 5MB-50MB               | >50MB                | Document-heavy workflows (legal contract approvals)    |
| SLA Approval Window          | 24h                       | 1-4h                   | <1h                  | Healthcare: Emergency patient admission approvals      |

---

## 5. Deployment Constraints

- **Cloud Public:** Only standard flexible workflows allowed. No custom ABAP. Quarterly updates.
- **Cloud Private:** Supports CAP extensions, BTP Process Automation. Limited ABAP Cloud.
- **On-Premise:** Full ABAP workflows, custom enhancements, classical workflow engine available.

---

## 6. Real-World Scenarios

1. **Expense Approval (Level A)**
   - 5K expense reports/month, single-step approval  
   - Solution: Standard flexible workflow  
   - Outcome: Zero custom code, mobile approvals, email notifications

2. **CAPEX Multi-Level Approval (Level B)**
   - Dynamic routing, board calendars  
   - Solution: Enhanced flexible workflow + BRFplus  
   - Outcome: Automated routing, exception handling, cross-timezone support

3. **Production Order Approval (Level C)**
   - 10K+ daily orders, <5s decisions  
   - Solution: Custom ABAP workflow with caching  
   - Outcome: Achieved <5s, performance tuning required

4. **Legacy Workflow Migration (Level D)**
   - Direct modifications to standard workflows  
   - Recommendation: Refactor to flexible workflows or CAP extensions

---

## 7. SAP Official Guidance

| Level  | Documentation Reference                                | Best Practices                                          |
|--------|---------------------------------------------------------|---------------------------------------------------------|
| Level A| SAP BTP Process Automation Guide, Fiori Workflow Docs   | Use pre-delivered flexible workflows, minimal config    |
| Level B| BRFplus Rule Framework Guide, Integration Patterns      | Enhance with BRFplus, CAP side-by-side for custom logic |
| Level C| ABAP Workflow 7.5 Guide, Performance Tuning in ABAP      | Custom ABAP with governance, ATC checks, performance test |
| Level D| Clean Core Remediation Framework                        | Avoid direct workflow modifications; plan migration     |

---

## 8. Workflow Strategy Matrix

| Scenario                     | Level  | Approach                        | Tools                              | Effort | Key Considerations                         |
|------------------------------|--------|---------------------------------|------------------------------------|--------|--------------------------------------------|
| Simple Approval (Expense)    | A      | Flexible Workflow               | Fiori Manage Workflows             | Low    | Key user config, mobile support            |
| Complex CAPEX Routing        | B      | Flexible Workflow + BRFplus     | Fiori, BRFplus, CAP UI5            | Medium | Rule maintenance, exception handling       |
| High-Volume Production       | C      | Custom ABAP Workflow            | ABAP 7.5, Custom classes           | High   | Caching, performance tuning                |
| Legacy SAP Workflow          | D      | Direct Workflow Modifications   | ABAP Workflow engine, CMOD/SMOD    | Very High| Migration plan, modernization roadmap     |

---

**End of Document**
