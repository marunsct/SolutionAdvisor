# SAP S/4HANA Integration & Interfaces - Clean Core Comprehensive Guide

**Document Type:** Complete Reference Guide
**Version:** 1.0
**Date:** October 21, 2025
**Source:** Interface-Clean-Core-Comprehensive.xlsx

---

## Table of Contents

1. Decision Tree - Interface Selector
2. Clean Core Levels for Interfaces
3. Interface Determination Factors
4. Performance Thresholds
5. Deployment Constraints
6. Real-World Scenarios
7. SAP Official Guidance
8. Interface Strategy Matrix

---

## 1. Decision Tree - Interface Selector

Sheet: Interface Questions

| Q.ID | Question                                   | Answers | Navigation & Recommendation                               | Hint                                            | Detailed Hint                                                                                      |
|------|--------------------------------------------|---------|-----------------------------------------------------------|-------------------------------------------------|---------------------------------------------------------------------------------------------------|
| Q1   | Interface Direction to S/4HANA?            | 2       | Outbound → Q2; Inbound → Q2                               | Determine data flow direction                   | Outbound: S/4HANA sends data; Inbound: S/4HANA receives data.                                    |
| Q2   | Real-time or Batch?                        | 2       | Real-time → Q3; Batch → Q15                                | Assess latency requirements                      | Real-time (<5s) requires APIs/events; Batch allows IDOCs/files.                                   |
| Q3   | Event-Driven Available?                    | 2       | Yes → **Level A**; No → Q4                                  | Use events if possible                           | Enterprise Event Enablement preferred for low-latency integration.                                 |
| Q4   | Released API Exists?                       | 2       | Yes → **Level A**; No → Q5                                  | Check standard API library                       | Use OData/REST APIs from SAP API Business Hub when available.                                     |
| Q5   | Side-by-Side on BTP feasible?              | 2       | Yes → **Level B**; No → Q6                                  | Consider BTP microservices                       | CAP/Node.js service plus API Management offers upgrade-safe extensions.                          |
| Q6   | Standard IDOC meets needs?                 | 2       | Yes → **Level B**; No → Q7                                  | Evaluate IDOC volume & complexity                | Standard IDOC via CPI for moderate volumes; enhanced IDOC for extended fields.                    |
| Q7   | Legacy Protocols or Custom Logic required? | 2       | Yes → **Level C**; No → **Level D**                         | Custom ABAP or protocol adapter                  | Custom adapter for proprietary protocols or direct BAPI/RFC calling as last resort.               |
| Q15  | Batch volume under Level A thresholds?     | 2       | Yes → **Level A**; No → **Level C**                         | Batch volume check                                | ≤300K records or ≤35MB per run supports API-based patterns; else file-based or IDOC required.     |

---

## 2. Clean Core Levels for Interfaces

| Level  | Description                                | Technology Examples                                       | Upgrade Complexity | Maintenance Effort | Cloud Readiness | Technical Risk |
|--------|--------------------------------------------|-----------------------------------------------------------|--------------------|--------------------|-----------------|----------------|
| Level A| Fully Clean Core - Event/API based         | OData/REST APIs, Event Mesh, RAP Services                 | None               | Low                | Full            | Low            |
| Level B| Enhanced Clean Core - Middleware           | Enhanced IDOC via CPI, RFC, BTP side-by-side              | Low                | Medium             | Partial         | Medium         |
| Level C| Compliant Modifications - Custom ABAP      | Custom RFC-ABAP, File-based, Custom Protocol Adapters     | Medium             | High               | Limited         | High           |
| Level D| Not Recommended - Core modifications       | Direct DB Access, System Exits, Deprecated Protocol Usage | High               | Very High          | None            | Critical       |

---

## 3. Interface Determination Factors

| Factor                    | Level A Criteria                             | Level B Criteria                          | Level C Criteria                              | Level D Criteria                          |
|---------------------------|----------------------------------------------|-------------------------------------------|----------------------------------------------|-------------------------------------------|
| Integration Pattern       | Event-Driven, Standard OData/REST APIs       | IDOC via CPI, RFC/BAPI                    | Custom ABAP programs, file-based             | Direct table access, core modifications   |
| Protocols Supported       | HTTP(S), AMQP, MQTT                          | SOAP IDOC transports                      | FTP/SFTP, custom sockets                     | Deprecated/Unsupported protocols          |
| Volume Threshold          | ≤5K records/call, ≤35MB payload              | 10K-100K IDOC batch                       | >100K batch or >100MB files                  | Unlimited core modifications              |
| Latency Requirements      | <5 seconds                                  | 1-5 seconds                               | Variable, often >5 seconds                   | Unbounded                              |
| Security & Compliance     | Standard OAuth2, TLS, API Management         | Basic security via CPI, X.509            | Custom security, on-premise protocols         | No enforced security, critical risk      |
| Upgrade Suitability       | Fully supported APIs, no custom code        | Minimal custom extensions                 | Heavy custom code, governance required       | Blocks upgrades                            |

---

## 4. Performance Thresholds

| Method                   | Direction | Volume Limit        | Payload Size      | Frequency   | Clean Core Level | When Exceeded                              |
|--------------------------|-----------|---------------------|-------------------|-------------|------------------|---------------------------------------------|
| OData API (single call)  | In/Out    | 5,000 records/call  | ≤35MB             | Real-time   | A                | Use paging or switch to batch processing    |
| Event-Driven (Event Mesh)| Out       | No record limit     | ≤1MB/event        | Event-driven| A                | Scale event mesh, sharding                  |
| Enhanced IDOC via CPI    | In/Out    | 10K-100K records    | ≤10MB             | Batch       | B                | Split IDOC, use file transfer               |
| File Transfer (SFTP)     | In/Out    | Batches             | 50MB/file         | Batch       | C                | Chunk files, streaming                      |
| Custom RFC/BAPI          | In/Out    | 1K records/call     | ≤1MB              | Real-time   | B                | Use batching, introduce middleware          |

---

## 5. Deployment Constraints

### Cloud Public Edition
- Standard APIs and event-driven only (no custom ABAP)
- Quarterly update cycle enforced
- Limited batch processing (CPI recommended)

### Cloud Private Edition
- LTMC & custom RFCs allowed with governance
- Side-by-side BTP integrations supported
- Hybrid patterns with edge processing

### On-Premise Edition
- Full custom ABAP, direct RFC/BAPI, IDOC modifications
- Governance required for modifications
- Traditional middleware and file-based supported

---

## 6. Real-World Scenarios

1. **E-commerce Order Integration (Level A)**
   - 10K orders/day, <2s response
   - Solution: Event Mesh + OData
   - Outcome: Sub-second updates, horizontal scale

2. **Supplier EDI (Level B)**
   - 100K POs/month via ANSI X12 EDI
   - Solution: IDOC via CPI with mapping
   - Outcome: 25K records/batch, partner compliance

3. **Legacy PLC Data (Level C)**
   - Proprietary protocols   
   - Solution: Edge adapter + batch sync  
   - Outcome: Safety data, predictive insights

4. **Mainframe Banking (Level D)**
   - Direct DB access due to legacy
   - Recommendation: Refactor to APIs, governance required

---

## 7. SAP Official Guidance

| Level  | Guidance Source                                  | Tooling & Best Practices                                                                    |
|--------|--------------------------------------------------|---------------------------------------------------------------------------------------------|
| Level A| SAP API Hub, S/4HANA Extensibility Guide         | Use released OData/REST APIs, Enterprise Event Enablement, RAP Services                     |
| Level B| SAP CPI Documentation, Integration Suite Guide   | Enhanced IDOC templates, CPI pre-built connectors, Recommendation: BTP side-by-side patterns |
| Level C| ABAP Development Guidelines, Clean Core Blog     | Custom RFC/ABAP with governance, ATC checks for custom code, performance tuning             |
| Level D| SAP Clean Core Remediation Framework             | Avoid direct DB access, apply remediation plans, migrate to modern APIs                     |

---

## 8. Interface Strategy Matrix

| Scenario                       | Clean Core Level | Approach                                  | Tools                                    | Effort | Key Considerations                          |
|--------------------------------|------------------|------------------------------------------|------------------------------------------|--------|----------------------------------------------|
| Bi-directional e-commerce API  | A                | Event-Driven + OData                     | Event Mesh, OData Services               | Low    | Real-time SLA, sharding, error handling      |
| EDI Supplier Integration       | B                | CPI + Enhanced IDOC                      | SAP CPI, IDOC Mappings                   | Medium | Partner mapping, batch window                |
| Plant PLC Data Sync            | C                | Custom Adapter + Batch Sync              | Node.js edge service, SFTP               | High   | Network latency, security, monitoring        |
| Legacy Banking Mainframe       | D                | Direct Table Access (avoid)              | JDBC adapters, custom ABAP               | Very High | Migration roadmap, governance, modernization|
| Hybrid Cloud Integration       | B                | BTP Integration Suite                    | Integration Suite, Connectivity Service  | Medium | Hybrid security, API management              |

---

**End of Document**
