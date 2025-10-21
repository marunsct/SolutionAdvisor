# SAP S/4HANA Reporting - Clean Core Comprehensive Guide

**Document Type:** Complete Reference Guide  
**Version:** 1.0  
**Date:** October 21, 2025  
**Source:** Report Clean Core Comprehensive.xlsx

---

## Table of Contents

1. Decision Tree - Reporting Selector
2. Clean Core Levels for Reporting
3. Reporting Determination Factors
4. Performance Thresholds
5. Deployment Constraints
6. Real-World Scenarios
7. SAP Official Guidance
8. Reporting Strategy Matrix

---

## 1. Decision Tree - Reporting Selector

Sheet: Report Questions

| Q.ID | Question                             | Answers | Navigation / Recommendation                              | Hint                                                     | Detailed Hint                                                                                                                        |
|------|--------------------------------------|---------|---------------------------------------------------------|----------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| Q1   | Reporting Enhancement Required?      | 2       | Yes → Q2; No → **Level A** (Use Standard Reports)       | Assess need for new reports                             | Check SAP Fiori Apps Library for existing content; new KPIs/layouts require enhancements.                                            |
| Q2   | Report Type?                        | 3       | Operational → Q4; Managerial → Q3; Analytical → Q5       | Classify by purpose                                      | Operational: day-to-day, Managerial: trend analysis, Analytical: dashboards/ML.                                                      |
| Q3   | Standard Fiori App Exists?           | 2       | Yes → **Level A**; No → **Level B** (Custom CDS/UI5)     | Check Fiori library                                      | Use SAP Fiori Apps Library to find standard apps; extend via CDS/UI5 if partial.                                                    |
| Q4   | Data Volume & Complexity?            | 3       | Low (<100K) → **Level A**; Medium (100K-1M) → Q6; High → Q7| Evaluate volume                                          | Low volume: embedded analytics; Medium: enhanced CDS; High: custom BI or SAC integration.                                           |
| Q5   | Predictive/ML Required?              | 2       | No → **Level A/B**; Yes → **Level B** (SAC/ML Services) | Assess advanced analytics                                 | Use SAP Analytics Cloud with ML services for predictive needs; integrate via live data or import models.                            |
| Q6   | Embedded Analytics Sufficient?       | 2       | Yes → **Level A**; No → **Level B**                       | Evaluate embedded capabilities                            | Embedded analytics via CDS and KPI tiles; extended analytics require SAC or custom solutions.                                          |
| Q7   | Multi-System Data Integration?       | 2       | Yes → **Level B**; No → **Level C**                      | Assess cross-system needs                                 | SAP Analytics Cloud for multi-system; BTP Data Intelligence for complex integration; custom ETL if required.                         |

---

## 2. Clean Core Levels for Reporting

| Level  | Description                                         | Technology Examples                                | Upgrade Complexity | Maintenance Effort | Cloud Readiness | Technical Risk |
|--------|-----------------------------------------------------|----------------------------------------------------|--------------------|--------------------|-----------------|----------------|
| Level A| Fully Clean Core: Standard SAP reporting features   | Embedded Analytics, CDS Views, KPI Tiles           | None               | Low                | Full            | Low            |
| Level B| Enhanced Clean Core: Side-by-side extensions        | SAC Live Connection, Custom CDS, UI5               | Low                | Medium             | Partial         | Medium         |
| Level C| Compliant Modifications: Custom ABAP/3rd-party BI   | Custom ABAP Reports, Third-Party BI integrations   | Medium             | High               | Limited         | High           |
| Level D| Not Recommended: Modified Standard Reports         | Modified SAP Reports, SAPscript, Legacy formats    | High               | Very High          | None            | Critical       |

---

## 3. Reporting Determination Factors

| Factor                         | Level A Criteria                            | Level B Criteria                        | Level C Criteria                          | Level D Criteria              |
|--------------------------------|---------------------------------------------|-----------------------------------------|-------------------------------------------|------------------------------|
| Data Volume                    | <100K records                               | 100K-1M records                         | >1M records                               | Unlimited datasets          |
| Response Time                  | ≤5 seconds                                  | 1-5 seconds                             | <1 second (optimized)                     | No SLA met                  |
| Data Sources                   | Single S/4HANA system                       | Multiple SAP systems                    | Mixed SAP/Non-SAP, legacy                 | Direct DB/unsupported APIs  |
| Standard Content Availability  | Fiori App or CDS view available             | Partial standard, needs extension       | No standard content, custom build         | Modified standard reports   |
| Advanced Analytics             | Basic aggregations only                     | Predictive/ML via SAC                   | Custom algorithms, third-party tools      | Unsupported complex logic   |
| Governance & Compliance        | Standard audit logs, security               | Enhanced logging, role-based access     | Custom compliance frameworks              | Bypass governance           |

---

## 4. Performance Thresholds

| Metric                   | Level A Threshold           | Level B Threshold           | Forces Level C         | Example Scenario                                  |
|--------------------------|-----------------------------|-----------------------------|------------------------|--------------------------------------------------|
| Records per Query        | ≤100K                       | 100K-1M                     | >1M                    | Retail: daily sales >5M records                  |
| Query Execution Time     | ≤5 seconds                  | 1-5 seconds                 | <1 second requirement  | Trading: sub-second analytics for market data    |
| Concurrent Users         | ≤100                        | 100-500                     | >500                   | Global: 1000+ concurrent report users            |
| Data Refresh Frequency   | Hourly                      | Real-time                   | Sub-second             | Financial: real-time risk monitoring             |
| Payload Size             | ≤5MB                        | 5MB-50MB                    | >50MB                  | Media: large document processing                 |

---

## 5. Deployment Constraints

- **Cloud Public Edition:** Standard embedded analytics only; no custom ABAP.  
- **Cloud Private Edition:** Allows side-by-side CAP/UI5 extensions and SAC integration.  
- **On-Premise:** Full custom ABAP, SAPscript, BEx queries, and third-party tools allowed.

---

## 6. Real-World Scenarios

1. **Standard Financial Reporting (Level A)**
   - <100K transactions/month, 20 users, P&L reports  
   - Solution: Standard Fiori analytical app, CDS views  
   - Outcome: Zero custom code, automatic updates with S/4HANA releases

2. **High-Volume Sales Analytics (Level B)**
   - 50M daily transactions, 500 users  
   - Solution: Enhanced CDS views + SAP Analytics Cloud  
   - Outcome: Sub-5s response, scalable design, clean core maintained

3. **Predictive Demand Forecasting (Level B)**
   - Requires ML predictions for 1M SKUs  
   - Solution: SAC predictive scenarios + custom data models  
   - Outcome: 10% forecast accuracy improvement, business user model management

4. **Cross-System Executive Dashboard (Level C)**
   - Data from SAP ECC, CRM, third-party  
   - Solution: Custom ETL + third-party BI  
   - Outcome: Unified dashboards, governance framework required

---

## 7. SAP Official Guidance

| Level  | Reference                                              | Best Practices                                                         |
|--------|--------------------------------------------------------|------------------------------------------------------------------------|
| Level A| Embedded Analytics Guide, CDS View Manual             | Use standard CDS views and KPI tiles; leverage Embedded Analytics      |
| Level B| SAP Analytics Cloud Documentation                      | Use SAC for advanced analytics; prefer live data connections           |
| Level C| SAP BW/4HANA Integration Guide, Third-Party BI Guide  | Custom ETL processes, certified connectors, strong governance         |
| Level D| Clean Core Remediation Framework                       | Avoid modifying standard reports; migrate to modern analytics tools    |

---

## 8. Reporting Strategy Matrix

| Scenario                                 | Level  | Approach                         | Tools                             | Effort  | Key Considerations                               |
|------------------------------------------|--------|----------------------------------|-----------------------------------|---------|---------------------------------------------------|
| Standard Operational Report              | A      | Embedded Analytics               | CDS, Fiori Apps                   | Low     | Leverage standard SAP content, minimal config     |
| Multi-Source Executive Dashboard         | B/C    | SAC + Custom ETL                 | SAC, Data Services, CAP UI5       | Medium  | Data integration complexity, governance required  |
| Real-Time Monitoring Dashboard           | A/B    | Event-Driven + CDS live update   | Event Mesh, CDS, Fiori            | Medium  | Real-time SLA, event subscription management      |
| Predictive Maintenance Analytics         | B      | SAC Predictive Scenarios         | SAC ML, SAC Analytics Designer    | High    | Model training, data quality, user training       |
| Legacy BEx to Fiori Migration            | B      | UI5 custom migration frameworks  | UI5, ABAP, Gateway                | Medium  | Security roles, performance optimization          |

---

**End of Document**