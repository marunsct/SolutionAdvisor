# SAP Clean Core Decision Advisor - Enhanced CAP BTP Application Technical Specification

**Document Version:** 3.0 (Final Enhanced)  
**Date:** October 21, 2025  
**Author:** Technical Specification Team  
**Project:** Clean Core Decision Advisor CAP Application  
**Enhancement Focus:** Complete functional specification with scoring metrics, constraints display, real-world examples, and RICEFW ID support

**Design Decisions Applied:**
- ✅ Wizard **embedded** under *Analyses* in Fiori navigation (not a separate app)
- ✅ Flowchart export formats: **SVG** (primary), plus **PNG** and **PDF**
- ✅ Multi-tenancy model: **Option 2 — Per-tenant copy at onboarding** (master data copied during tenant provisioning)
- ✅ RICEFW ID format: `[RICEFYW]-[0-9]{4}-[A-Z]{3}` (Type-Sequence-ProjectCode)

---

## Table of Contents

1. [Document Overview](#1-document-overview)
2. [Application Overview](#2-application-overview)
3. [System Architecture](#3-system-architecture)
4. [Data Model Specification](#4-data-model-specification)
5. [UI/UX Specifications](#5-ui-ux-specifications)
6. [Business Logic & Validations](#6-business-logic--validations)
7. [Scoring Engine Specification](#7-scoring-engine-specification)
8. [Constraints & Examples Display](#8-constraints--examples-display)
9. [API Specifications](#9-api-specifications)
10. [Multi-tenancy Implementation](#10-multi-tenancy-implementation)
11. [Performance & Scalability](#11-performance--scalability)
12. [Security & Compliance](#12-security--compliance)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment & Operations](#14-deployment--operations)
15. [Future Integration Considerations](#15-future-integration-considerations)
16. [Implementation Guidelines](#16-implementation-guidelines)
17. [Appendix A: WizardSession Entity Definition](#appendix-a-wizardsession-entity-definition)
18. [Appendix B: Flowchart SVG Export Specification](#appendix-b-flowchart-svg-export-specification)
19. [Appendix C: Master Data Seed CSV Templates](#appendix-c-master-data-seed-csv-templates)
20. [Appendix D: Multi-tenancy Deep Dive](#appendix-d-multi-tenancy-deep-dive)
21. [Document History](#document-history)

---

## 1. Document Overview

### 1.1 Purpose and Scope

This technical specification provides comprehensive guidance for developing a SAP CAP (Cloud Application Programming Model) application on SAP BTP (Business Technology Platform) that serves as a **Clean Core Decision Advisor** for SAP S/4HANA implementations.

**Primary Objectives:**
- Transform existing Excel-based clean core decision framework into a scalable BTP application
- Provide guided wizard interface for RICEFW object analysis with contextual hints and examples
- Support multi-tenant SaaS deployment with strict data isolation
- Enable data-driven decision making with visual flowchart generation
- Display performance constraints, technical limitations, and real-world examples
- Calculate and track scoring metrics: Technical Debt, Cloud Readiness, Upgrade Impact
- Support RICEFW ID (max 10 characters) for historical analysis and decision tracking
- Prepare for future integration with API Hub and SCFD Registry

**Enhanced Features (v2.0):**
- **Scoring Metrics Dashboard:** Real-time calculation and display of Technical Debt Score, Cloud Readiness Score, and Upgrade Impact Score
- **Constraints Display:** Automatic display of relevant performance thresholds, technical limitations, and regulatory constraints based on solution context
- **Real-World Examples:** Show contextual examples from similar implementations to guide decision-making
- **RICEFW ID Management:** Support unique 10-character identifiers with one-to-many relationship (one RICEFW ID can have multiple solution decisions over time)
- **Historical Analysis:** Track solution evolution, remediation progress, and compliance trends
- **Enhanced Validation:** Context-aware validation considering deployment type, volume thresholds, and compliance requirements

### 1.2 Target Audience

| Audience | Role | Usage |
|----------|------|-------|
| **Primary** | Solution Architects, Technical Leads | Create and manage clean core analyses, make solution decisions |
| **Secondary** | Project Managers, Governance Teams | Oversight, reporting, compliance monitoring |
| **Technical** | Developers, Consultants | Execute wizard, view recommendations, access implementation hints |

**Skill Requirements:**
- Basic understanding of JavaScript, CDS (Core Data Services), SAP Fiori
- Familiarity with SAP S/4HANA clean core principles
- Knowledge of RICEFW object types and SAP extensibility options

### 1.3 Document Conventions

| Convention | Usage | Example |
|------------|-------|---------|
| **Entity Names** | PascalCase | `ProjectConfiguration`, `CleanCoreAnalysis` |
| **Field Names** | camelCase | `clientName`, `cleanCoreLevel` |
| **Service Names** | kebab-case | `clean-core-service` |
| **UI Controls** | SAP Fiori Elements terminology | `ListReport`, `ObjectPage`, `CustomFragment` |
| **Code Blocks** | CDS, JavaScript, UI5 | Inline code examples |
| **Metrics** | Uppercase with underscores | `TECHNICAL_DEBT_SCORE` |

### 1.4 References and Dependencies

**Core Technologies:**
- **SAP CAP Documentation:** https://cap.cloud.sap/docs
- **SAP BTP Developer Guide:** https://help.sap.com/btp
- **SAP Fiori Design Guidelines:** https://experience.sap.com/fiori-design
- **SAP HANA Cloud Multi-tenancy:** https://help.sap.com/hana-cloud

**SAP BTP Services:**
- SAP HANA Cloud (Multi-tenant database)
- SAP Authorization and Trust Management (XSUAA)
- SAP Destination Service (for future integrations)
- SAP Application Logging Service
- SAP Credential Store (for secure credentials)

---

## 2. Application Overview

### 2.1 Business Context

The Clean Core Decision Advisor addresses the critical need for consistent, standardized decision-making in SAP S/4HANA implementations. Currently, organizations rely on manual Excel-based processes to determine the appropriate clean core approach for RICEFW objects. This application digitizes and enhances that process with intelligent decision trees, automated scoring, and historical analysis.

**Key Business Drivers:**
- **Standardization:** Consistent clean core decision processes across projects and teams
- **Risk Reduction:** Minimize implementation risks through validated decision frameworks
- **Compliance:** Ensure adherence to SAP best practices and organizational governance
- **Historical Analysis:** Learn from past decisions and identify successful patterns
- **Cost Optimization:** Reduce technical debt and upgrade costs through better decisions
- **Scalability:** Multi-client SaaS solution for consulting firms and large enterprises

### 2.2 Key Features

#### Core Functionality

**1. Project Onboarding**
- Initial project setup with comprehensive configuration
- Capture deployment type, compliance requirements, team skills, budget constraints
- Multi-tenant data isolation from project inception
- Integration readiness assessment

**2. Analysis Management**
- List view of all historical clean core analyses with filtering and search
- Export capabilities (Excel, PDF) for reporting
- Bulk operations (delete, archive, export)
- Analysis versioning and change tracking

**3. Guided Wizard**
- Step-by-step decision tree navigation with contextual help
- Dynamic question flow based on project context and previous answers
- Real-time hint display with detailed explanations
- Progress tracking with breadcrumb navigation
- Save and resume capability for incomplete analyses

**4. Visual Results with Enhanced Information**
- **Solution Recommendation:** Clean core level with detailed rationale
- **Scoring Metrics Display:**
  - Technical Debt Score (0-100)
  - Cloud Readiness Score (0-100%)
  - Upgrade Impact Score (0-100)
  - Composite Clean Core Health Score
- **Constraints Display:**
  - Performance thresholds (volume, frequency, response time)
  - Technical limitations based on solution context
  - Regulatory and compliance constraints
- **Real-World Examples:**
  - Similar implementations from knowledge base
  - Success stories and lessons learned
  - Common pitfalls and mitigation strategies
- **Flowchart Generation:** Visual decision path with export to SVG/PNG/PDF
- **Implementation Guidance:** Step-by-step technical instructions with code samples

**5. Multi-tenancy Support**
- Isolated data per client/tenant with HANA schema-based isolation
- Tenant-specific configuration and branding
- Per-tenant user management and role assignment
- Cross-tenant analytics for service providers (with permissions)

#### RICEFW Object Types Supported

| Object Type | Code | Description | Avg. Analysis Time |
|-------------|------|-------------|-------------------|
| **Reports** | R | Analytical and operational reporting solutions | 15 min |
| **Interfaces** | I | System integration patterns and protocols | 25 min |
| **Conversions** | C | Data migration and transformation approaches | 30 min |
| **Enhancements** | E | Functional and technical extensions | 20 min |
| **Forms** | F | Document generation and output management | 15 min |
| **Workflows** | W | Business process automation patterns | 20 min |

### 2.3 User Roles

#### Tenant Administrator
**Responsibilities:**
- Project setup and configuration
- User management within tenant
- Analysis oversight and governance
- Export and reporting
- System configuration (branding, approval workflows)

**Permissions:**
- Full CRUD on projects and analyses
- User management (create, edit, delete, assign roles)
- System configuration access
- Cross-project analytics and dashboards

#### Solution Architect
**Responsibilities:**
- Create and manage clean core analyses
- Execute guided wizard for RICEFW objects
- Export decision flowcharts and documentation
- Access historical analysis data for reference
- Review and approve solution decisions (governance workflows)

**Permissions:**
- Create/edit/delete own analyses
- View all analyses in assigned projects
- Export capabilities for documentation
- Access to knowledge base and examples
- Submit for governance approval (Level C/D)

#### Developer/Consultant
**Responsibilities:**
- Execute guided wizard processes
- View analysis results and recommendations
- Access detailed implementation hints and code samples
- Reference historical decisions for similar objects

**Permissions:**
- Create/edit own analyses
- Read-only access to completed analyses
- View implementation guidance and examples
- No delete or bulk export capabilities

### 2.4 Technical Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SAP BTP Platform                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
            ┌─────────────────────┼────────────────────────┐
            │                     │                        │
┌───────────▼──────────┐ ┌───────▼────────┐ ┌────────────▼──────────┐
│     UI Layer         │ │  Service Layer  │ │    Data Layer         │
│  SAP Fiori Elements  │ │  CAP Node.js    │ │  SAP HANA Cloud       │
├──────────────────────┤ ├────────────────┤ ├───────────────────────┤
│ Landing Page         │ │ CDS Services    │ │ Tenant-Isolated       │
│ List Report          │ │ Custom Handlers │ │ Schemas               │
│ - Analysis List      │ │ Decision Engine │ │                       │
│ - Wizard Flow        │ │ Scoring Engine  │ │ Question Flow Data    │
│ Object Page          │ │ Multi-tenant    │ │ Analysis Results      │
│ Custom Controls      │ │ Middleware      │ │ Configuration Data    │
│ - Wizard Component   │ │ Validation      │ │ Master Data           │
│ - Score Dashboard    │ │ Logic           │ │ RICEFW History        │
│ - Flowchart View     │ │                 │ │                       │
│ Results Visualization│ │                 │ │                       │
│ Custom Fragment      │ │                 │ │                       │
└──────────────────────┘ └────────────────┘ └───────────────────────┘
```

**Key Architectural Principles:**
- **Hexagonal Architecture:** CAP implementation with clean separation of concerns
- **Domain-Driven Design:** Business logic encapsulated in domain services
- **Event-Driven:** Asynchronous processing for long-running operations (flowchart generation, bulk exports)
- **API-First:** OData V4 services with clear contracts
- **Stateless Services:** No server-side session state, JWT-based authentication
- **Multi-tenancy Native:** Schema-based isolation at database level

---

## 3. System Architecture

### 3.1 Technology Stack

#### Frontend
- **Framework:** SAP Fiori Elements (List Report, Object Page)
- **Custom Controls:** SAP UI5 for wizard implementation, scoring dashboard, flowchart visualization
- **Charts:** D3.js or SAP VizFrame for flowchart visualization and scoring graphs
- **Responsive:** SAP Fiori 3.0 design system with mobile-first approach
- **Accessibility:** WCAG 2.1 AA compliant

**UI5 Version:** Latest stable (1.120+)  
**Browser Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

#### Backend
- **Runtime:** CAP Node.js (latest LTS version - Node 18.x+)
- **Database:** SAP HANA Cloud (Multi-tenant with schema-based isolation)
- **Authentication:** SAP Authorization and Trust Management (XSUAA)
- **API:** OData V4 with CDS services
- **Logging:** SAP Application Logging Service with structured logging
- **Monitoring:** SAP Cloud ALM integration for operations monitoring

**CAP Version:** Latest @sap/cds (7.x+)

#### Platform Services
- **Deployment:** Cloud Foundry on SAP BTP
- **Multi-tenancy:** CAP MTX (Multi-Tenant Extensions) with SAP HANA Cloud
- **Destinations:** SAP Destination Service for future API Hub integration
- **Logging:** SAP Application Logging Service
- **Credentials:** SAP Credential Store for secure secrets management
- **Job Scheduler:** SAP Job Scheduler Service for scheduled tasks (cleanup, aggregations)

### 3.2 Deployment Architecture

#### Production Environment

```
┌──────────────────────────────────────────────────────────────────┐
│                     Cloud Foundry Space                          │
├──────────────────────────────────────────────────────────────────┤
│ Router Application        (1 instance)  - Traffic routing        │
│ CAP Application           (2 instances) - HA/Load Balancing      │
│ MTX Sidecar               (1 instance)  - Tenant provisioning    │
│ HANA Cloud Database       (Multi-tenant database)                │
│ XSUAA Service Instance    (Authentication service)               │
│ Destination Service       (For future integrations)              │
│ Application Logging       (Centralized logging)                  │
│ Job Scheduler             (Background jobs)                      │
└──────────────────────────────────────────────────────────────────┘
```

**Scaling Strategy:**
- **Horizontal:** CAP application scales from 2-10 instances based on CPU/memory
- **Vertical:** HANA Cloud compute units adjusted based on tenant count
- **Auto-scaling:** BTP Application Autoscaler service for dynamic scaling

**High Availability:**
- Multi-zone deployment for CAP application instances
- HANA Cloud with automatic failover
- Redundant router instances
- Session-less design for seamless failover

#### Development Environment

```
┌──────────────────────────────────────────────────────────────────┐
│                  Development Cloud Foundry Space                 │
├──────────────────────────────────────────────────────────────────┤
│ Router Application        (1 instance)                           │
│ CAP Application           (1 instance)                           │
│ MTX Sidecar               (1 instance)                           │
│ HANA Cloud Database       (Development database - shared schema) │
└──────────────────────────────────────────────────────────────────┘
```

**Local Development:**
- SQLite for local database (development)
- Mock authentication for local testing
- CAP development server with hot reload
- SAP Business Application Studio or VS Code

### 3.3 Multi-tenancy Architecture

#### Tenant Isolation Strategy

**Database Level:**
- **Schema-based isolation** using SAP HANA Cloud multi-tenancy
- Each tenant gets a dedicated schema: `<TENANT_ID>_DATA`
- Shared system tables in main schema for cross-tenant operations (with permissions)

**Application Level:**
- **Tenant context injection** via CAP MTX framework
- Automatic tenant identification from JWT token
- All CDS queries automatically filtered by tenant context
- No cross-tenant data visibility by default

**Security Level:**
- **XSUAA-based tenant-aware authentication**
- Each tenant has isolated XSUAA configuration
- Role templates instantiated per tenant
- Tenant-specific OAuth2 clients

#### Tenant Lifecycle

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  1. Subscribe  │────▶│  2. Provision  │────▶│  3. Onboard    │
└────────────────┘     └────────────────┘     └────────────────┘
       │                       │                       │
       │                       │                       │
   Via BTP               HANA Schema           Master Data
   Cockpit                Creation              Seeding
                         XSUAA Config           User Setup
                                                                  
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  4. Operate    │────▶│  5. Upgrade    │────▶│  6. Offboard   │
└────────────────┘     └────────────────┘     └────────────────┘
       │                       │                       │
       │                       │                       │
   Daily Usage          Zero-Downtime             Data Export
   Analytics          Tenant-aware Deploy         Schema Drop
   Monitoring              Versioning            Cleanup
```

**Subscription Process (Automated via MTX):**
1. **Subscribe:** Tenant subscribes via BTP Cockpit
2. **Schema Creation:** MTX creates dedicated HANA schema
3. **Data Seeding:** Master data (Clean Core Levels, Object Types, Question Flows) automatically deployed
4. **XSUAA Configuration:** Tenant-specific roles and scopes created
5. **Initial User:** Subscription approver becomes first tenant administrator

**Upgrade Process:**
1. **Schema Versioning:** Each tenant schema has version tracking
2. **Migration Scripts:** CDS delta deployment with tenant-aware migrations
3. **Zero-Downtime:** Rolling upgrades per tenant, no global outage
4. **Rollback Support:** Automated rollback on migration failures

### 3.4 Security Architecture

#### Authentication & Authorization

**Identity Provider:**
- **XSUAA** with SAML/OIDC support
- Integration with customer IdPs (Azure AD, Okta, SAP IAS)
- Multi-factor authentication (MFA) support

**Role-Based Access Control (RBAC):**
```json
{
  "xsappname": "clean-core-advisor",
  "scopes": [
    { "name": "$XSAPPNAME.Admin", "description": "Administrator access" },
    { "name": "$XSAPPNAME.Architect", "description": "Solution Architect access" },
    { "name": "$XSAPPNAME.Developer", "description": "Developer access" }
  ],
  "role-templates": [
    {
      "name": "Admin",
      "scope-references": ["$XSAPPNAME.Admin"]
    },
    {
      "name": "Architect",
      "scope-references": ["$XSAPPNAME.Architect"]
    },
    {
      "name": "Developer",
      "scope-references": ["$XSAPPNAME.Developer"]
    }
  ],
  "role-collections": [
    {
      "name": "CleanCore_Administrator",
      "role-template-references": ["$XSAPPNAME.Admin"]
    },
    {
      "name": "CleanCore_Architect",
      "role-template-references": ["$XSAPPNAME.Architect"]
    },
    {
      "name": "CleanCore_Developer",
      "role-template-references": ["$XSAPPNAME.Developer"]
    }
  ]
}
```

**Service-Level Authorization:**
```cds
service CleanCoreService @(requires: 'authenticated-user') {
  
  @restrict: [
    { grant: '*', to: 'Admin' },
    { grant: ['READ', 'CREATE', 'UPDATE'], to: 'Architect' },
    { grant: ['READ', 'CREATE'], to: 'Developer' }
  ]
  entity Analyses as projection on db.CleanCoreAnalysis;
  
  @restrict: [
    { grant: '*', to: 'Admin' },
    { grant: 'READ', to: ['Architect', 'Developer'] }
  ]
  entity Projects as projection on db.ProjectConfiguration;
  
  @restrict: [{ grant: 'READ', to: 'authenticated-user' }]
  entity QuestionFlows as projection on db.QuestionFlow;
}
```

**Tenant Isolation Validation:**
```javascript
// Automatic tenant context enforcement in CAP
this.before('*', (req) => {
  const userTenant = req.user.tenant;
  const requestTenant = req.data.tenant || req.params[0]?.tenant;
  
  if (requestTenant && userTenant !== requestTenant) {
    req.error(403, 'Cross-tenant access denied', 'TENANT_ISOLATION_VIOLATION');
  }
});
```

#### Data Encryption

**At Rest:**
- HANA Cloud native encryption (AES-256)
- Encrypted HANA backup storage
- Secure credential storage via SAP Credential Store

**In Transit:**
- TLS 1.3 for all HTTP communication
- Certificate-based authentication for service-to-service
- mTLS for sensitive integrations (future API Hub)

#### Audit Logging

**Audit Events:**
- User authentication (login, logout, failed attempts)
- Data access (read sensitive data, export operations)
- Data modifications (create, update, delete)
- Configuration changes (project setup, tenant configuration)
- Security events (authorization failures, suspicious activity)

**Audit Log Service Integration:**
```javascript
const auditLog = require('@sap/audit-logging');

// Log sensitive data access
await auditLog.logDataAccess({
  user: req.user.id,
  tenant: req.user.tenant,
  object: { type: 'CleanCoreAnalysis', id: analysisId },
  action: 'READ',
  dataSubject: { type: 'Project', id: projectId }
});
```

---

## 4. Data Model Specification

### 4.1 Core Entities

#### ProjectConfiguration

**Purpose:** Stores comprehensive project setup information that influences all solution decisions

```cds
entity ProjectConfiguration : cuid, managed {
  // Basic Information
  clientName       : String(200) not null;
  projectName      : String(200) not null;
  projectType      : String(50) not null;  // New Implementation, System Conversion, etc.
  expectedDuration : Integer;               // in months
  timeline         : Date not null;
  status           : String(20) default 'Active';  // Active, Completed, Archived
  
  // Technical Configuration
  s4HanaFlavor             : String(50) not null;  // Cloud Public, Private Cloud, On-Premise
  availableBTPServices     : String(1000);         // Comma-separated list
  thirdPartyServices       : String(1000);         // External systems and services
  
  // Governance & Compliance
  governanceModel          : String(50);           // Centralized, Federated, Hybrid
  complianceRequirements   : String(500);          // SOX, GDPR, FDA, etc.
  businessCriticality      : String(20);           // Mission Critical, High, Medium, Low
  
  // Team & Resources
  technicalTeamSize        : Integer;
  budgetRange              : String(50);           // Small, Medium, Large, Enterprise
  
  // Multi-tenancy
  tenant                   : String(36) not null;  // Tenant UUID
  
  // Associations
  analyses                 : Composition of many CleanCoreAnalysis on analyses.projectConfig = $self;
  
  // Metadata fields from managed aspect
  // createdAt, createdBy, modifiedAt, modifiedBy
}
```

**Validation Rules:**
- `clientName`: 3-200 characters, alphanumeric with spaces and hyphens
- `expectedDuration`: 1-60 months
- `s4HanaFlavor`: Must be one of ['Cloud Public', 'Private Cloud', 'On-Premise']
- `businessCriticality`: Must be one of ['Mission Critical', 'High', 'Medium', 'Low']

#### CleanCoreAnalysis

**Purpose:** Stores individual RICEFW object analysis results with complete decision trail and scoring metrics

```cds
entity CleanCoreAnalysis : cuid, managed {
  // Association to Project
  projectConfig            : Association to ProjectConfiguration not null;
  
  // RICEFW Identification (Enhanced for v2.0)
  ricefwId                 : String(10) not null;  // Max 10 chars: "I-0042-IMP"
  objectType               : String(50) not null;  // R, I, C, E, F, W
  objectName               : String(200) not null;
  objectDescription        : String(1000);
  
  // Analysis Details
  analysisDate             : Date not null;
  status                   : String(20) default 'In Progress';  // In Progress, Completed, Approved, Rejected
  
  // Decision Results
  finalRecommendation      : String(10);            // Level A, B, C, D
  finalReasoning           : String(2000);
  decisionFlowData         : String(5000);          // JSON of decision path
  
  // Estimation & Risk (Enhanced)
  estimatedEffort          : Integer;               // in person-days
  riskAssessment           : String(20);            // Low, Medium, High, Critical
  businessImpact           : String(500);
  technicalComplexity      : String(20);            // Simple, Moderate, Complex, Very Complex
  complianceStatus         : String(20);            // Compliant, Requires Review, Non-Compliant
  
  // Scoring Metrics (New in v2.0)
  technicalDebtScore       : Decimal(5,2);          // 0.00-100.00
  cloudReadinessScore      : Decimal(5,2);          // 0.00-100.00
  upgradeImpactScore       : Decimal(5,2);          // 0.00-100.00
  compositeHealthScore     : Decimal(5,2);          // 0.00-100.00
  
  // Export & Documentation
  exportedFlowchart        : String(500);           // File path or URL
  
  // Review & Approval
  reviewedBy               : String(200);
  reviewComments           : String(1000);
  approvalRequired         : Boolean default false;
  approvedBy               : String(200);
  approvedDate             : Date;
  
  // Multi-tenancy
  tenant                   : String(36) not null;
  
  // Associations
  decisionPaths            : Composition of many DecisionPath on decisionPaths.analysis = $self;
  constraintsDisplayed     : Association to many ConstraintLog on constraintsDisplayed.analysis = $self;
  examplesViewed           : Association to many ExampleLog on examplesViewed.analysis = $self;
}
```

**Validation Rules:**
- `ricefwId`: Pattern `^[RICEFYW]-\\d{4}-[A-Z]{3}$` (Type-Sequence-Project)
- `objectType`: Must be one of ['Reports', 'Interfaces', 'Conversions', 'Enhancements', 'Forms', 'Workflows']
- `finalRecommendation`: Must be one of ['Level A', 'Level B', 'Level C', 'Level D']
- `riskAssessment`: Must be one of ['Low', 'Medium', 'High', 'Critical']
- All score fields: 0.00-100.00

#### DecisionPath

**Purpose:** Tracks the step-by-step decision journey through the wizard

```cds
entity DecisionPath : cuid, managed {
  // Association
  analysis                 : Association to CleanCoreAnalysis not null;
  
  // Question & Answer
  questionId               : String(10) not null;   // Q1, Q2, etc.
  questionText             : String(500) not null;
  selectedAnswer           : String(200) not null;
  answerIndex              : Integer;                // Which option was selected (0-based)
  
  // User Interaction
  userComments             : String(1000);           // Optional user notes
  hintsViewed              : Boolean default false;
  timeSpentSeconds         : Integer;                // Time spent on this question
  
  // Sequence
  stepOrder                : Integer not null;       // 1, 2, 3, ...
  
  // Metadata
  answeredAt               : DateTime;
  answeredBy               : String(200);
  tenant                   : String(36) not null;
}
```

#### QuestionFlow

**Purpose:** Master data defining the decision tree structure for each object type

```cds
entity QuestionFlow : cuid, managed {
  // Question Identification
  questionId               : String(10) not null;    // Q1, Q2, Q3, etc.
  objectType               : String(50) not null;    // Reports, Interfaces, etc.
  
  // Question Content
  questionText             : String(500) not null;
  questionHint             : String(1000);           // Short hint
  detailedHint             : String(2000);           // Detailed explanation
  
  // Answer Configuration
  answerCount              : Integer not null;       // How many answers available
  answerOptions            : String(2000);           // JSON array of answer options
  
  // Navigation Rules
  navigationRules          : String(5000);           // JSON defining next question or final answer
  
  // Performance Thresholds (New in v2.0)
  performanceContext       : String(1000);           // JSON with relevant thresholds
  
  // Display
  displayOrder             : Integer;
  isActive                 : Boolean default true;
  
  // Multi-tenancy (Shared master data)
  tenant                   : String(36);             // NULL for global, or tenant-specific
}
```

**Example answerOptions JSON:**
```json
[
  { "value": "Yes", "label": "Yes", "description": "Standard functionality meets requirement" },
  { "value": "No", "label": "No", "description": "Custom development required" },
  { "value": "Partial", "label": "Partially", "description": "Some functionality available" }
]
```

**Example navigationRules JSON:**
```json
{
  "Yes": {
    "nextQuestion": "Q5",
    "condition": null,
    "finalAnswer": null
  },
  "No": {
    "nextQuestion": "Q3",
    "condition": null,
    "finalAnswer": null
  },
  "Partial": {
    "nextQuestion": null,
    "condition": null,
    "finalAnswer": "Level B",
    "reasoning": "Partial functionality requires enhanced clean core approach with side-by-side extensions on BTP."
  }
}
```

#### CleanCoreLevels

**Purpose:** Master data defining the four clean core levels with characteristics and scoring factors

```cds
entity CleanCoreLevels : cuid {
  level                    : String(10) not null;    // Level A, Level B, Level C, Level D
  levelName                : String(50) not null;    // Fully Clean Core, Enhanced Clean Core, etc.
  description              : String(500);
  characteristics          : String(1000);           // JSON array
  
  // Classification Criteria
  upgradeComplexity        : String(20);             // None, Low, Medium, High, Very High
  maintenanceEffort        : String(20);             // Low, Medium, High, Very High
  businessFlexibility      : String(20);             // High, Medium, Low
  technicalRisk            : String(20);             // Low, Medium, High, Critical
  cloudReadiness           : String(30);             // Cloud Ready, Partially, Limited, Not Ready
  
  // Scoring Weights (New in v2.0)
  technicalDebtMultiplier  : Decimal(3,2);           // 0.00-5.00
  cloudReadinessFactor     : Decimal(3,2);           // 0.00-1.00
  upgradeImpactMultiplier  : Decimal(3,2);           // 0.00-5.00
  
  // Display
  isActive                 : Boolean default true;
  displayOrder             : Integer;
}
```

**Seeded Data:**
```csv
level,levelName,upgradeComplexity,maintenanceEffort,technicalDebtMultiplier,cloudReadinessFactor,upgradeImpactMultiplier
Level A,Fully Clean Core,None,Low,0.00,1.00,0.00
Level B,Enhanced Clean Core,Low,Medium,1.00,0.50,1.00
Level C,Compliant Modifications,Medium,High,3.00,0.20,3.00
Level D,Not Recommended,Very High,Very High,5.00,0.00,5.00
```

#### ObjectTypes

**Purpose:** Master data defining RICEFW object types with metadata

```cds
entity ObjectTypes : cuid {
  objectType               : String(50) not null;    // Reports, Interfaces, etc.
  objectCode               : String(1) not null;     // R, I, C, E, F, W
  displayName              : String(100);
  description              : String(500);
  iconName                 : String(50);             // SAP icon name
  complexity               : String(20);             // Low, Moderate, High
  avgAnalysisTime          : Integer;                // in minutes
  questionCount            : Integer;                // Number of questions in decision tree
  isActive                 : Boolean default true;
}
```

#### WizardSession

**Purpose:** Store wizard session state for save/resume capability

```cds
entity WizardSession : cuid, managed {
  // Associated Analysis
  analysis                 : Association to CleanCoreAnalysis not null;
  
  // Session State
  currentStep              : Integer default 1;
  totalSteps               : Integer;
  currentQuestionId        : String(10);
  sessionStatus            : String(20) default 'Active';  // Active, Paused, Completed, Abandoned
  
  // Progress Tracking
  answeredPath             : String(5000);  // JSON array of answered questions
  lastActivity             : DateTime;
  expiresAt                : DateTime;      // Session expires after 24 hours of inactivity
  
  // User Context
  startedBy                : String(200);
  timeSpentTotal           : Integer;       // Total time in seconds
  
  // Multi-tenancy
  tenant                   : String(36) not null;
}
```

**Session Lifecycle:**
- **Created:** When user starts wizard (POST `/startWizard`)
- **Updated:** Each answer submission updates `answeredPath` and `currentQuestionId`
- **Paused:** User clicks "Save Draft" → `sessionStatus = 'Paused'`
- **Resumed:** User clicks "Resume" → `sessionStatus = 'Active'`
- **Completed:** Final answer submitted → `sessionStatus = 'Completed'`
- **Expired:** Cleanup job deletes sessions where `expiresAt < NOW()`

**Example answeredPath JSON:**
```json
[
  {
    "questionId": "Q1",
    "questionText": "Is standard functionality available?",
    "selectedAnswer": "Yes",
    "answeredAt": "2025-10-21T10:30:00Z",
    "timeSpent": 45
  },
  {
    "questionId": "Q2",
    "questionText": "What is the data volume?",
    "selectedAnswer": "Medium (100K-1M)",
    "answeredAt": "2025-10-21T10:31:30Z",
    "timeSpent": 90
  }
]
```

### 4.2 Enhanced Entities (v2.0)

#### PerformanceThreshold

**Purpose:** Store performance thresholds and technical limitations per integration method/solution type

```cds
entity PerformanceThreshold : cuid {
  category                 : String(50) not null;    // Integration, Reporting, Workflow, etc.
  method                   : String(100) not null;   // OData API, Enhanced IDOC, etc.
  
  // Volume Thresholds
  volumeLimit              : Integer;                // Records per operation
  sizeThreshold            : String(20);             // e.g., "35MB", "5GB"
  frequencyLimit           : String(50);             // Real-time, Hourly, Daily
  
  // Performance Metrics
  responseTimeTarget       : Integer;                // milliseconds
  concurrencyLimit         : Integer;                // concurrent operations
  
  // Clean Core Classification
  cleanCoreLevel           : String(10);             // Level A, B, C, D
  
  // Guidance
  whenExceeded             : String(500);            // What to do when threshold exceeded
  alternativeSolution      : String(500);
  
  // Context
  applicableObjectTypes    : String(200);            // Comma-separated: R,I,C
  deploymentTypes          : String(200);            // Cloud Public, On-Premise, etc.
  
  isActive                 : Boolean default true;
}
```

#### RealWorldExample

**Purpose:** Store real-world implementation examples for context-aware display

```cds
entity RealWorldExample : cuid, managed {
  // Classification
  objectType               : String(50) not null;
  cleanCoreLevel           : String(10);
  scenario                 : String(100);            // E-commerce Integration, etc.
  industry                 : String(50);             // Retail, Manufacturing, etc.
  
  // Example Details
  title                    : String(200);
  challengeDescription     : String(1000);
  solutionDescription      : String(2000);
  technologiesUsed         : String(500);            // JSON array
  implementation           : String(2000);           // Implementation details
  
  // Metrics & Results
  volumeHandled            : String(100);
  performanceAchieved      : String(200);
  implementationTime       : String(50);
  lessonsLearned           : String(1000);
  
  // Context Matching
  keywords                 : String(500);            // Space-separated for matching
  
  isActive                 : Boolean default true;
  approvedBy               : String(200);
  approvedDate             : Date;
}
```

#### ConstraintLog

**Purpose:** Track which constraints were displayed during analysis for audit purposes

```cds
entity ConstraintLog : cuid {
  analysis                 : Association to CleanCoreAnalysis;
  constraintType           : String(50);             // Performance, Regulatory, Technical
  constraintDescription    : String(500);
  displayedAt              : DateTime;
  tenant                   : String(36) not null;
}
```

#### ExampleLog

**Purpose:** Track which real-world examples were viewed for relevance analysis

```cds
entity ExampleLog : cuid {
  analysis                 : Association to CleanCoreAnalysis;
  example                  : Association to RealWorldExample;
  viewedAt                 : DateTime;
  relevanceRating          : Integer;                // 1-5 stars, optional user feedback
  tenant                   : String(36) not null;
}
```

### 4.3 Data Relationships

```
ProjectConfiguration (1) ─────< (n) CleanCoreAnalysis
                                        │
                                        ├───< (n) DecisionPath
                                        ├───< (n) ConstraintLog
                                        └───< (n) ExampleLog

QuestionFlow (Master Data) ────┐
CleanCoreLevels (Master Data) ─┤  Used by Decision Engine
ObjectTypes (Master Data) ─────┤
PerformanceThreshold (Master) ─┘

RealWorldExample (Master Data) ──< (n) ExampleLog
```

---

## 5. UI/UX Specifications

### 5.1 Application Shell

**Fiori Launchpad Structure:**
```
Clean Core Decision Advisor
├── Projects (Tile Group)
│   ├── Manage Projects (List Report)
│   └── Create New Project (Quick Action)
├── Analysis (Tile Group)
│   ├── All Analyses (List Report with filters)
│   ├── New Analysis Wizard (Custom App)
│   ├── Pending Approvals (List Report - Filtered)
│   └── Analytics Dashboard (Custom App)
└── Administration (Tile Group - Admin only)
    ├── User Management
    ├── System Configuration
    └── Knowledge Base Management
```

### 5.2 Project List Report

**Pattern:** SAP Fiori Elements - List Report  
**Purpose:** Display all projects with filtering, search, and navigation

**Key Features:**
- **Smart Table** with sorting, filtering, grouping
- **Search** across clientName, projectName
- **Filters:** 
  - Status (Active, Completed, Archived)
  - S/4HANA Flavor
  - Business Criticality
  - Date Range (timeline)
- **Actions:**
  - Create New Project
  - Edit (inline or navigation)
  - Delete (with confirmation)
  - Export to Excel
- **KPIs:** Display aggregate scores at list level

**Columns:**
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| Client Name | Text | Yes | Yes |
| Project Name | Text with link | Yes | Yes |
| Project Type | Text | Yes | Yes |
| S/4HANA Flavor | Text | Yes | Yes |
| Status | Status Indicator | Yes | Yes |
| Analyses Count | Number | Yes | No |
| Avg Health Score | Progress Indicator | Yes | Yes |
| Timeline | Date | Yes | Yes |
| Actions | Icon Buttons | No | No |

### 5.3 Project Object Page

**Pattern:** SAP Fiori Elements - Object Page  
**Purpose:** Display comprehensive project details with associated analyses

**Header:**
- Project Name (Title)
- Client Name (Subtitle)
- Status (ObjectStatus)
- Key KPIs in Header Facets:
  - Total Analyses
  - Avg Technical Debt Score
  - Avg Cloud Readiness Score
  - Pending Approvals

**Sections:**
1. **General Information** (Form)
   - Basic details (client, project name, type, timeline)
   - Technical configuration (S/4HANA flavor, BTP services)
   - Team & resources

2. **Compliance & Governance** (Form)
   - Governance model
   - Compliance requirements
   - Business criticality

3. **Analyses** (Table)
   - List of all analyses for this project
   - Inline actions (View, Edit, Delete)
   - Bulk actions (Export, Archive)

4. **Analytics Dashboard** (Custom Section - v2.0)
   - Scoring metrics visualization
   - Distribution by clean core level (donut chart)
   - Trend analysis (line chart over time)
   - Risk matrix (scatter plot)

**Actions:**
- Edit Project
- Create New Analysis
- Export Project Report
- Archive/Delete Project

### 5.4 Analysis Wizard (Custom App)

**Pattern:** SAP UI5 Custom Control - Wizard Component  
**Purpose:** Guide users through decision tree with enhanced information display

#### Wizard Structure

```
┌──────────────────────────────────────────────────────────────┐
│                    Clean Core Analysis Wizard                │
├──────────────────────────────────────────────────────────────┤
│ Step 1: Project Selection                                    │
│ Step 2: Object Information                                   │
│ Step 3-N: Decision Questions (Dynamic)                       │
│ Step N+1: Results & Recommendations                          │
└──────────────────────────────────────────────────────────────┘
```

#### Step 1: Project Selection

**UI Elements:**
- **ComboBox:** Select existing project
- **Link:** "Create new project" (opens dialog)
- **Information Panel:** Display selected project details
  - S/4HANA Flavor
  - Compliance Requirements
  - Team Size
  - Budget Range

**Validation:**
- Project must be selected before proceeding

#### Step 2: Object Information

**UI Elements:**
- **RICEFW ID Input:** Text field with pattern validation
  - Format: `[RICEFYW]-[0-9]{4}-[A-Z]{3}`
  - Example: `I-0042-IMP`
  - Auto-suggest based on history (if RICEFW ID exists)
- **Object Type:** Dropdown (R, I, C, E, F, W)
- **Object Name:** Text input (required)
- **Object Description:** TextArea (optional but recommended)

**Enhanced Features (v2.0):**
- **RICEFW ID History:** If ID exists, show previous decisions
  - Display decision history table
  - Option to view past solution details
  - Link to copy decision path from previous analysis

**Validation:**
- RICEFW ID format must be valid
- Object type must be selected
- Object name required (3-200 characters)

#### Step 3-N: Decision Questions (Dynamic)

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  Progress: Question 3 of 12                    [Save Draft]    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Q3: Is the requirement real-time or batch communication?     │
│                                                                │
│  ( ) Real-time (<5 seconds)                                   │
│  ( ) Batch (Daily/Weekly)                                     │
│                                                                │
│  💡 Hint: Real-time integration (<5 seconds) enables           │
│     Enterprise Event Enablement and REST APIs. Batch...       │
│                                                                │
│  [Show Detailed Hint]  [Show Performance Thresholds]          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📊 Relevant Performance Thresholds (Expanded)            │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ OData API: ≤5,000 records per call, <5 sec response     │ │
│  │ Enterprise Events: Event-based (no volume limit)        │ │
│  │ Enhanced IDOC: 10K-100K records per batch, daily/weekly │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Show Real-World Examples]                                   │
│                                                                │
│  Optional Comments: __________________________________________ │
│                                                                │
│  [← Previous]                           [Next →]              │
└────────────────────────────────────────────────────────────────┘
```

**Enhanced Information Display (v2.0):**

**Performance Thresholds Panel:**
- Automatically display relevant thresholds based on:
  - Object type (Interface, Report, etc.)
  - Project configuration (deployment type, volume expectations)
  - Current answer selection
- Collapsible panel with detailed metrics
- Color-coded indicators (green/yellow/red)

**Real-World Examples Popover:**
- Button to show similar scenarios
- Filtered by:
  - Object type
  - Current question context
  - Selected answers so far
- Display example cards:
  - Scenario title
  - Challenge description (collapsed)
  - Solution summary
  - Technologies used
  - "View Full Example" link

**Constraints Display:**
- Automatically shown for specific questions
- Examples:
  - Q: "Deployment Type?" → Show deployment-specific constraints
  - Q: "Volume requirements?" → Show performance thresholds
  - Q: "Compliance requirements?" → Show regulatory constraints

**User Interaction:**
- **Radio Buttons** for single selection
- **Checkboxes** for multi-selection (if applicable)
- **Timer:** Track time spent on each question
- **Comments:** Optional text area for user notes

**Navigation:**
- **Previous Button:** Go back to previous question
- **Next Button:** Proceed to next question (disabled until answer selected)
- **Save Draft:** Save current progress and exit wizard

#### Step N+1: Results & Recommendations

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│                    Analysis Complete! 🎉                       │
├────────────────────────────────────────────────────────────────┤
│  Recommended Solution: Level A - Fully Clean Core             │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📊 Scoring Metrics Dashboard (New in v2.0)              │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  Technical Debt Score:    12 / 100  ■■□□□□□□□□ (Low)    │ │
│  │  Cloud Readiness Score:   95%       ■■■■■■■■■□ (High)   │ │
│  │  Upgrade Impact Score:    08 / 100  ■□□□□□□□□□ (Low)    │ │
│  │  Composite Health Score:  92 / 100  ■■■■■■■■■□ (Excellent)│ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Solution Recommendation:                                      │
│  Use Event-Driven Integration (Level A) with SAP Enterprise   │
│  Event Enablement. This approach provides real-time           │
│  integration while maintaining full clean core compliance.    │
│                                                                │
│  Rationale: [Detailed explanation based on decision path]     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Constraints & Considerations (New in v2.0)            │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Performance: Event-based, no inherent volume limit       │ │
│  │ Response Time: Sub-second event delivery                │ │
│  │ Scalability: Horizontal scaling to 100K events/hour     │ │
│  │ Deployment: Requires SAP Event Mesh on BTP              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 💡 Real-World Example: E-commerce Order Integration     │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Challenge: 10K daily orders, <2 sec response required   │ │
│  │ Solution: Event-driven with SAP Event Mesh              │ │
│  │ Results: <1 sec event delivery, 500 concurrent users    │ │
│  │ [View Full Example]                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Implementation Guidance: [Step-by-step instructions]         │
│                                                                │
│  [View Decision Flowchart] [Download Report] [Save Analysis]  │
└────────────────────────────────────────────────────────────────┘
```

**Enhanced Results Display (v2.0):**

1. **Scoring Metrics Dashboard:**
   - Visual progress bars with color coding
   - Numeric scores with interpretation
   - Composite health score calculation
   - Drill-down to scoring details

2. **Constraints & Considerations:**
   - Performance thresholds specific to recommended solution
   - Technical limitations and requirements
   - Regulatory compliance considerations
   - Deployment prerequisites

3. **Real-World Examples:**
   - Automatically matched examples based on:
     - Object type
     - Clean core level
     - Similar constraints
     - Industry/scenario
   - Display top 3 most relevant examples
   - Link to view all matching examples

4. **Decision Flowchart:**
   - Visual representation of decision path
   - Interactive (hover to see question/answer details)
   - Export as SVG, PNG, PDF
   - Embed in documentation

5. **Implementation Guidance:**
   - Step-by-step technical instructions
   - Code samples (if applicable)
   - Links to SAP documentation
   - Best practices and tips

**Actions:**
- **Save Analysis:** Store results to database
- **Download Report:** Generate PDF/Word document
- **View Flowchart:** Open flowchart in full-screen
- **Start New Analysis:** Begin another analysis
- **Email Results:** Send summary via email (future)

### 5.5 Analytics Dashboard (Custom App)

**Purpose:** Provide comprehensive analytics across all analyses for a tenant

**Sections:**

1. **KPI Cards:**
   - Total Analyses
   - Avg Technical Debt Score
   - Avg Cloud Readiness Score
   - Pending Approvals

2. **Distribution Charts:**
   - **Donut Chart:** Analyses by Clean Core Level
   - **Bar Chart:** Analyses by Object Type
   - **Stacked Bar:** Clean Core Level by Object Type

3. **Trend Analysis:**
   - **Line Chart:** Scores over time (monthly aggregation)
   - **Area Chart:** Analysis volume over time

4. **Risk Matrix:**
   - **Scatter Plot:** Technical Debt vs. Upgrade Impact
   - **Heat Map:** Risk by Project and Object Type

5. **Top Lists:**
   - **Table:** Top 10 highest technical debt analyses
   - **Table:** Top 10 projects by analysis count
   - **Table:** Most viewed real-world examples

**Filters:**
- Date Range
- Project
- Object Type
- Clean Core Level
- Status

### 5.6 Responsive Design Considerations

#### Breakpoints

| Device | Width | Layout Adaptations |
|--------|-------|-------------------|
| **Desktop** | 1200px+ | Full feature set, side-by-side panels |
| **Tablet** | 768px - 1199px | Stacked panels, condensed tables |
| **Mobile** | <768px | Single column, simplified navigation |

#### Mobile Adaptations

**Landing Page:**
- Single-column card layout
- Collapsible filter sections
- Touch-optimized buttons (min 44x44px)

**Wizard:**
- Full-screen question display
- Swipe gestures for next/previous
- Bottom sheet for hints and examples

**Results:**
- Tabbed interface (Summary | Metrics | Flowchart | Details)
- Collapsible sections for constraints and examples
- Responsive charts with touch interactions

#### Accessibility (WCAG 2.1 AA)

**Keyboard Navigation:**
- All interactive elements accessible via keyboard
- Logical tab order
- Skip links for main content

**Screen Reader Support:**
- ARIA labels and descriptions on all controls
- Live regions for dynamic content updates
- Meaningful alt text for icons and images

**Color & Contrast:**
- Minimum 4.5:1 contrast ratio for text
- Color not the only means of conveying information
- High contrast theme support

---

## 6. Business Logic & Validations

### 6.1 Project Setup Validations

#### Client Name Validation

```javascript
const validateClientName = (clientName) => {
  const validations = {
    required: !clientName || clientName.trim().length === 0,
    minLength: clientName && clientName.trim().length < 3,
    maxLength: clientName && clientName.length > 200,
    format: clientName && !/^[a-zA-Z0-9\s\-\.]+$/.test(clientName)
  };
  
  if (validations.required) {
    return { valid: false, message: 'Client name is required' };
  }
  if (validations.minLength) {
    return { valid: false, message: 'Client name must be at least 3 characters' };
  }
  if (validations.maxLength) {
    return { valid: false, message: 'Client name cannot exceed 200 characters' };
  }
  if (validations.format) {
    return { valid: false, message: 'Client name contains invalid characters' };
  }
  
  return { valid: true };
};
```

#### Cross-Field Validations

```javascript
const validateProjectConfiguration = (config) => {
  const validations = [];
  
  // S/4HANA Cloud + BTP Services validation
  if (config.s4HanaFlavor === 'Cloud Public' && 
      !config.availableBTPServices.includes('Integration Suite')) {
    validations.push({
      field: 'availableBTPServices',
      severity: 'warning',
      message: 'Integration Suite is recommended for Public Cloud deployments'
    });
  }
  
  // Compliance & Governance validation
  if (config.complianceRequirements.includes('SOX') && 
      config.governanceModel !== 'Centralized') {
    validations.push({
      field: 'governanceModel',
      severity: 'error',
      message: 'SOX compliance typically requires centralized governance'
    });
  }
  
  // Team Size & Budget alignment
  if (config.technicalTeamSize > 50 && config.budgetRange === 'Small') {
    validations.push({
      field: 'budgetRange',
      severity: 'warning',
      message: 'Large team size may require larger budget allocation'
    });
  }
  
  return validations;
};
```

### 6.2 Question Flow Logic

#### Dynamic Question Loading

```javascript
const getNextQuestion = async (currentQuestionId, selectedAnswer, objectType, projectConfig) => {
  // Retrieve current question configuration
  const currentQuestion = await SELECT.one.from('QuestionFlow')
    .where({ questionId: currentQuestionId, objectType: objectType });
  
  if (!currentQuestion) {
    throw new Error(`Question ${currentQuestionId} not found for ${objectType}`);
  }
  
  // Parse navigation rules
  const navigationRules = JSON.parse(currentQuestion.navigationRules);
  const answerRule = navigationRules[selectedAnswer];
  
  if (answerRule.finalAnswer) {
    // Terminal node - return final recommendation
    return {
      type: 'FINAL_ANSWER',
      recommendation: answerRule.finalAnswer,
      reasoning: answerRule.reasoning
    };
  }
  
  if (answerRule.nextQuestion) {
    // Apply conditional logic based on project configuration
    const nextQuestionId = applyConditionalLogic(
      answerRule.nextQuestion,
      selectedAnswer,
      projectConfig
    );
    
    // Retrieve next question
    const nextQuestion = await SELECT.one.from('QuestionFlow')
      .where({ questionId: nextQuestionId, objectType: objectType });
    
    return {
      type: 'NEXT_QUESTION',
      question: nextQuestion
    };
  }
  
  throw new Error('Invalid navigation rule configuration');
};
```

#### Project Configuration Context Injection

```javascript
const applyConditionalLogic = (baseQuestionId, selectedAnswer, projectConfig) => {
  // Example: Skip certain questions based on S/4HANA flavor
  if (baseQuestionId === 'Q5' && projectConfig.s4HanaFlavor === 'Cloud Public') {
    // Skip on-premise specific questions
    return 'Q7';
  }
  
  // Example: Adjust question flow based on compliance requirements
  if (baseQuestionId === 'Q3' && projectConfig.complianceRequirements.includes('GDPR')) {
    return 'Q3_GDPR';  // GDPR-specific variant
  }
  
  // Example: Consider available BTP services
  if (baseQuestionId === 'Q8' && !projectConfig.availableBTPServices.includes('Analytics Cloud')) {
    return 'Q8_NO_SAC';  // Alternative path without SAC
  }
  
  return baseQuestionId;  // No modification needed
};
```

---

## 7. Scoring Engine Specification

### 7.1 Technical Debt Score Calculation

**Purpose:** Quantify accumulation of suboptimal solutions requiring future remediation

**Formula:**
```
Technical Debt Score = Σ(Complexity Factor × Deviation Level Multiplier × Object Count)

Where:
- Complexity Factor: 1 (Simple), 2 (Moderate), 3 (Complex), 4 (Very Complex)
- Deviation Level Multiplier: Level A = 0, Level B = 1, Level C = 3, Level D = 5
```

**Implementation:**

```javascript
class TechnicalDebtCalculator {
  constructor() {
    this.complexityFactors = {
      'Simple': 1,
      'Moderate': 2,
      'Complex': 3,
      'Very Complex': 4
    };
    
    this.levelMultipliers = {
      'Level A': 0,
      'Level B': 1,
      'Level C': 3,
      'Level D': 5
    };
  }
  
  calculateScore(analyses) {
    let totalScore = 0;
    
    for (const analysis of analyses) {
      const complexity = this.complexityFactors[analysis.technicalComplexity] || 2;
      const multiplier = this.levelMultipliers[analysis.finalRecommendation] || 0;
      
      totalScore += (complexity * multiplier);
    }
    
    // Normalize to 0-100 scale based on analysis count
    const maxPossibleScore = analyses.length * 4 * 5;  // Max complexity × Max multiplier
    const normalizedScore = (totalScore / maxPossibleScore) * 100;
    
    return Math.min(100, Math.round(normalizedScore * 100) / 100);  // 2 decimal places
  }
  
  getScoreInterpretation(score) {
    if (score <= 20) return { rating: 'Low', status: 'success', icon: '✅' };
    if (score <= 40) return { rating: 'Moderate', status: 'warning', icon: '⚠️' };
    if (score <= 70) return { rating: 'High', status: 'error', icon: '🔶' };
    return { rating: 'Critical', status: 'error', icon: '🔴' };
  }
}
```

**Usage in Service:**

```javascript
srv.on('calculateTechnicalDebtScore', async (req) => {
  const { projectId } = req.data;
  
  // Retrieve all analyses for project
  const analyses = await SELECT.from('CleanCoreAnalysis')
    .where({ projectConfig_ID: projectId, tenant: req.user.tenant });
  
  const calculator = new TechnicalDebtCalculator();
  const score = calculator.calculateScore(analyses);
  const interpretation = calculator.getScoreInterpretation(score);
  
  return {
    score: score,
    interpretation: interpretation,
    details: {
      totalAnalyses: analyses.length,
      levelDistribution: {
        levelA: analyses.filter(a => a.finalRecommendation === 'Level A').length,
        levelB: analyses.filter(a => a.finalRecommendation === 'Level B').length,
        levelC: analyses.filter(a => a.finalRecommendation === 'Level C').length,
        levelD: analyses.filter(a => a.finalRecommendation === 'Level D').length
      }
    }
  };
});
```

### 7.2 Cloud Readiness Score Calculation

**Purpose:** Measure percentage of solution components compatible with cloud deployment

**Formula:**
```
Cloud Readiness Score = (Cloud-Ready Objects / Total Objects) × 100

Where:
- Cloud-Ready Objects = Level A count + (Level B count × 0.5)
- Level C and D are not cloud-ready
```

**Implementation:**

```javascript
class CloudReadinessCalculator {
  constructor() {
    this.cloudReadinessFactors = {
      'Level A': 1.0,   // Fully cloud-ready
      'Level B': 0.5,   // Partially cloud-ready
      'Level C': 0.0,   // Not cloud-ready
      'Level D': 0.0    // Not cloud-ready
    };
  }
  
  calculateScore(analyses) {
    if (analyses.length === 0) return 0;
    
    let cloudReadyCount = 0;
    
    for (const analysis of analyses) {
      const factor = this.cloudReadinessFactors[analysis.finalRecommendation] || 0;
      cloudReadyCount += factor;
    }
    
    const score = (cloudReadyCount / analyses.length) * 100;
    return Math.round(score * 100) / 100;  // 2 decimal places
  }
  
  getScoreInterpretation(score) {
    if (score >= 80) return { rating: 'Fully Ready', status: 'success', icon: '✅' };
    if (score >= 60) return { rating: 'Mostly Ready', status: 'warning', icon: '⚠️' };
    if (score >= 40) return { rating: 'Partially Ready', status: 'error', icon: '🔶' };
    return { rating: 'Not Ready', status: 'error', icon: '🔴' };
  }
}
```

### 7.3 Upgrade Impact Score Calculation

**Purpose:** Estimate effort required for next SAP S/4HANA upgrade cycle

**Formula:**
```
Upgrade Impact Score = Σ(Object Count × Upgrade Risk Factor × Testing Multiplier)

Where:
- Upgrade Risk Factor: Level A = 0, Level B = 1, Level C = 3, Level D = 5
- Testing Multiplier: Simple (1.0), Moderate (1.5), Complex (2.0)
```

**Implementation:**

```javascript
class UpgradeImpactCalculator {
  constructor() {
    this.riskFactors = {
      'Level A': 0,
      'Level B': 1,
      'Level C': 3,
      'Level D': 5
    };
    
    this.testingMultipliers = {
      'Simple': 1.0,
      'Moderate': 1.5,
      'Complex': 2.0
    };
  }
  
  calculateScore(analyses) {
    let totalImpact = 0;
    
    for (const analysis of analyses) {
      const riskFactor = this.riskFactors[analysis.finalRecommendation] || 0;
      const testingMultiplier = this.getTestingMultiplier(analysis);
      
      totalImpact += (riskFactor * testingMultiplier);
    }
    
    // Normalize to 0-100 scale
    const maxPossibleImpact = analyses.length * 5 * 2.0;  // Max risk × Max testing
    const normalizedScore = (totalImpact / maxPossibleImpact) * 100;
    
    return Math.min(100, Math.round(normalizedScore * 100) / 100);
  }
  
  getTestingMultiplier(analysis) {
    // Determine testing complexity based on technical complexity and integration count
    if (analysis.technicalComplexity === 'Very Complex' || 
        analysis.riskAssessment === 'Critical') {
      return 2.0;  // Complex testing
    } else if (analysis.technicalComplexity === 'Complex' ||
               analysis.riskAssessment === 'High') {
      return 1.5;  // Moderate testing
    } else {
      return 1.0;  // Simple testing
    }
  }
  
  getScoreInterpretation(score) {
    if (score <= 20) return { rating: 'Minimal Impact', status: 'success', icon: '✅' };
    if (score <= 40) return { rating: 'Low Impact', status: 'warning', icon: '⚠️' };
    if (score <= 70) return { rating: 'Medium Impact', status: 'error', icon: '🔶' };
    return { rating: 'High Impact', status: 'error', icon: '🔴' };
  }
}
```

### 7.4 Composite Clean Core Health Score

**Purpose:** Overall assessment combining all three metrics

**Formula:**
```
Clean Core Health Score = 
  (100 - Technical Debt Score) × 0.4 +
  (Cloud Readiness Score) × 0.3 +
  (100 - Upgrade Impact Score) × 0.3
```

**Implementation:**

```javascript
class CompositeHealthCalculator {
  constructor() {
    this.weights = {
      technicalDebt: 0.4,
      cloudReadiness: 0.3,
      upgradeImpact: 0.3
    };
  }
  
  calculateScore(technicalDebtScore, cloudReadinessScore, upgradeImpactScore) {
    const normalizedTechnicalDebt = 100 - technicalDebtScore;
    const normalizedUpgradeImpact = 100 - upgradeImpactScore;
    
    const compositeScore = 
      (normalizedTechnicalDebt * this.weights.technicalDebt) +
      (cloudReadinessScore * this.weights.cloudReadiness) +
      (normalizedUpgradeImpact * this.weights.upgradeImpact);
    
    return Math.round(compositeScore * 100) / 100;
  }
  
  getScoreInterpretation(score) {
    if (score >= 80) return { rating: 'Excellent', status: 'success', icon: '✅', color: '#107E3E' };
    if (score >= 60) return { rating: 'Good', status: 'warning', icon: '⚠️', color: '#E9730C' };
    if (score >= 40) return { rating: 'Fair', status: 'error', icon: '🔶', color: '#E76500' };
    return { rating: 'Poor', status: 'error', icon: '🔴', color: '#BB0000' };
  }
}
```

### 7.5 Service Implementation

```javascript
// srv/lib/scoring-service.js
class ScoringService {
  constructor() {
    this.technicalDebtCalc = new TechnicalDebtCalculator();
    this.cloudReadinessCalc = new CloudReadinessCalculator();
    this.upgradeImpactCalc = new UpgradeImpactCalculator();
    this.compositeHealthCalc = new CompositeHealthCalculator();
  }
  
  async calculateAllScores(projectId, tenant) {
    // Retrieve all analyses for project
    const analyses = await SELECT.from('CleanCoreAnalysis')
      .where({ projectConfig_ID: projectId, tenant: tenant });
    
    if (analyses.length === 0) {
      return {
        technicalDebtScore: 0,
        cloudReadinessScore: 0,
        upgradeImpactScore: 0,
        compositeHealthScore: 0,
        message: 'No analyses available for scoring'
      };
    }
    
    // Calculate individual scores
    const technicalDebtScore = this.technicalDebtCalc.calculateScore(analyses);
    const cloudReadinessScore = this.cloudReadinessCalc.calculateScore(analyses);
    const upgradeImpactScore = this.upgradeImpactCalc.calculateScore(analyses);
    
    // Calculate composite score
    const compositeHealthScore = this.compositeHealthCalc.calculateScore(
      technicalDebtScore,
      cloudReadinessScore,
      upgradeImpactScore
    );
    
    // Get interpretations
    const technicalDebtInterpretation = this.technicalDebtCalc.getScoreInterpretation(technicalDebtScore);
    const cloudReadinessInterpretation = this.cloudReadinessCalc.getScoreInterpretation(cloudReadinessScore);
    const upgradeImpactInterpretation = this.upgradeImpactCalc.getScoreInterpretation(upgradeImpactScore);
    const compositeHealthInterpretation = this.compositeHealthCalc.getScoreInterpretation(compositeHealthScore);
    
    return {
      technicalDebtScore: {
        score: technicalDebtScore,
        interpretation: technicalDebtInterpretation
      },
      cloudReadinessScore: {
        score: cloudReadinessScore,
        interpretation: cloudReadinessInterpretation
      },
      upgradeImpactScore: {
        score: upgradeImpactScore,
        interpretation: upgradeImpactInterpretation
      },
      compositeHealthScore: {
        score: compositeHealthScore,
        interpretation: compositeHealthInterpretation
      },
      analysisCount: analyses.length
    };
  }
  
  async updateAnalysisScore(analysisId, tenant) {
    // Calculate scores for single analysis
    const analysis = await SELECT.one.from('CleanCoreAnalysis')
      .where({ ID: analysisId, tenant: tenant });
    
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    
    // Individual analysis scoring
    const technicalDebtScore = this.technicalDebtCalc.calculateScore([analysis]);
    const cloudReadinessScore = this.cloudReadinessCalc.calculateScore([analysis]);
    const upgradeImpactScore = this.upgradeImpactCalc.calculateScore([analysis]);
    
    const compositeHealthScore = this.compositeHealthCalc.calculateScore(
      technicalDebtScore,
      cloudReadinessScore,
      upgradeImpactScore
    );
    
    // Update analysis record
    await UPDATE('CleanCoreAnalysis')
      .set({
        technicalDebtScore: technicalDebtScore,
        cloudReadinessScore: cloudReadinessScore,
        upgradeImpactScore: upgradeImpactScore,
        compositeHealthScore: compositeHealthScore
      })
      .where({ ID: analysisId, tenant: tenant });
    
    return {
      technicalDebtScore,
      cloudReadinessScore,
      upgradeImpactScore,
      compositeHealthScore
    };
  }
}

module.exports = ScoringService;
```

---

## 8. Constraints & Examples Display

### 8.1 Constraints Display Logic

**Purpose:** Automatically show relevant constraints (performance thresholds, technical limitations, regulatory requirements) based on analysis context

**Implementation:**

```javascript
// srv/lib/constraints-service.js
class ConstraintsService {
  async getRelevantConstraints(analysisContext) {
    const {
      objectType,
      projectConfig,
      currentQuestion,
      selectedAnswers
    } = analysisContext;
    
    const constraints = [];
    
    // 1. Performance Thresholds
    const performanceConstraints = await this.getPerformanceThresholds(
      objectType,
      projectConfig,
      selectedAnswers
    );
    
    if (performanceConstraints.length > 0) {
      constraints.push({
        category: 'Performance',
        icon: '📊',
        constraints: performanceConstraints
      });
    }
    
    // 2. Technical Limitations
    const technicalConstraints = await this.getTechnicalLimitations(
      objectType,
      projectConfig
    );
    
    if (technicalConstraints.length > 0) {
      constraints.push({
        category: 'Technical',
        icon: '⚙️',
        constraints: technicalConstraints
      });
    }
    
    // 3. Regulatory & Compliance
    if (projectConfig.complianceRequirements) {
      const complianceConstraints = await this.getComplianceConstraints(
        projectConfig.complianceRequirements,
        objectType
      );
      
      if (complianceConstraints.length > 0) {
        constraints.push({
          category: 'Regulatory',
          icon: '⚖️',
          constraints: complianceConstraints
        });
      }
    }
    
    // 4. Deployment-Specific
    const deploymentConstraints = await this.getDeploymentConstraints(
      projectConfig.s4HanaFlavor
    );
    
    if (deploymentConstraints.length > 0) {
      constraints.push({
        category: 'Deployment',
        icon: '☁️',
        constraints: deploymentConstraints
      });
    }
    
    return constraints;
  }
  
  async getPerformanceThresholds(objectType, projectConfig, selectedAnswers) {
    // Query PerformanceThreshold entity
    const thresholds = await SELECT.from('PerformanceThreshold')
      .where({
        applicableObjectTypes: { like: `%${objectType}%` },
        isActive: true
      });
    
    // Filter based on context
    return thresholds.map(t => ({
      name: t.method,
      volumeLimit: t.volumeLimit,
      sizeThreshold: t.sizeThreshold,
      frequencyLimit: t.frequencyLimit,
      cleanCoreLevel: t.cleanCoreLevel,
      responseTimeTarget: t.responseTimeTarget,
      guidance: t.whenExceeded
    }));
  }
  
  async getTechnicalLimitations(objectType, projectConfig) {
    const limitations = [];
    
    // Cloud Public specific limitations
    if (projectConfig.s4HanaFlavor === 'Cloud Public') {
      limitations.push({
        type: 'Development',
        description: 'No custom ABAP development permitted',
        severity: 'error'
      });
      
      limitations.push({
        type: 'Configuration',
        description: 'Key user extensibility only',
        severity: 'warning'
      });
    }
    
    // Object type specific
    if (objectType === 'Interfaces') {
      limitations.push({
        type: 'Integration',
        description: 'OData API: 5,000 records per call maximum',
        severity: 'info'
      });
    }
    
    return limitations;
  }
  
  async getComplianceConstraints(requirements, objectType) {
    const constraints = [];
    const requirementsList = requirements.split(',').map(r => r.trim());
    
    // FDA 21 CFR Part 11
    if (requirementsList.includes('FDA')) {
      constraints.push({
        regulation: 'FDA 21 CFR Part 11',
        requirement: 'Electronic signatures with authentication',
        impact: 'Enhanced audit logging and validation required',
        cleanCoreLevelImpact: 'Level B minimum (certified add-ons)'
      });
    }
    
    // GDPR
    if (requirementsList.includes('GDPR')) {
      constraints.push({
        regulation: 'GDPR',
        requirement: 'Data encryption and right to be forgotten',
        impact: 'Privacy-compliant data handling required',
        cleanCoreLevelImpact: 'Level A/B (standard privacy features)'
      });
    }
    
    // SOX
    if (requirementsList.includes('SOX')) {
      constraints.push({
        regulation: 'SOX',
        requirement: 'Segregation of duties and audit trails',
        impact: 'Enhanced authorization and logging',
        cleanCoreLevelImpact: 'Level B (enhanced controls)'
      });
    }
    
    return constraints;
  }
  
  async getDeploymentConstraints(s4HanaFlavor) {
    const constraints = [];
    
    switch(s4HanaFlavor) {
      case 'Cloud Public':
        constraints.push({
          constraint: 'Standard content only',
          description: 'Fiori apps and standard reports',
          workaround: 'Use BTP extensions for custom requirements'
        });
        break;
        
      case 'Private Cloud':
        constraints.push({
          constraint: 'Tier-based development',
          description: 'ABAP Cloud (Tier 1), Enhanced (Tier 2), Classical (Tier 3)',
          workaround: 'Prioritize Tier 1 for new developments'
        });
        break;
        
      case 'On-Premise':
        constraints.push({
          constraint: 'Full flexibility with governance',
          description: 'All development options available',
          workaround: 'Maintain clean core alignment for future cloud migration'
        });
        break;
    }
    
    return constraints;
  }
  
  async logConstraintDisplay(analysisId, constraints, tenant) {
    // Log which constraints were displayed for audit
    for (const category of constraints) {
      for (const constraint of category.constraints) {
        await INSERT.into('ConstraintLog').entries({
          analysis_ID: analysisId,
          constraintType: category.category,
          constraintDescription: JSON.stringify(constraint),
          displayedAt: new Date(),
          tenant: tenant
        });
      }
    }
  }
}

module.exports = ConstraintsService;
```

### 8.2 Real-World Examples Matching

**Purpose:** Display relevant real-world examples based on analysis context

**Implementation:**

```javascript
// srv/lib/examples-service.js
class ExamplesService {
  async getRelevantExamples(analysisContext) {
    const {
      objectType,
      currentCleanCoreLevel,
      projectConfig,
      selectedAnswers
    } = analysisContext;
    
    // Build search criteria
    const searchCriteria = {
      objectType: objectType,
      isActive: true
    };
    
    // Add clean core level if known
    if (currentCleanCoreLevel) {
      searchCriteria.cleanCoreLevel = currentCleanCoreLevel;
    }
    
    // Add industry if specified
    if (projectConfig.industry) {
      searchCriteria.industry = projectConfig.industry;
    }
    
    // Query examples
    let examples = await SELECT.from('RealWorldExample')
      .where(searchCriteria)
      .limit(10);
    
    // Score and rank examples by relevance
    examples = this.scoreExampleRelevance(examples, analysisContext);
    
    // Return top 3
    return examples.slice(0, 3).map(e => ({
      id: e.ID,
      title: e.title,
      scenario: e.scenario,
      challengeDescription: e.challengeDescription,
      solutionDescription: e.solutionDescription,
      technologiesUsed: JSON.parse(e.technologiesUsed || '[]'),
      volumeHandled: e.volumeHandled,
      performanceAchieved: e.performanceAchieved,
      implementationTime: e.implementationTime,
      lessonsLearned: e.lessonsLearned,
      relevanceScore: e.relevanceScore
    }));
  }
  
  scoreExampleRelevance(examples, context) {
    return examples.map(example => {
      let score = 0;
      
      // Object type match (mandatory)
      if (example.objectType === context.objectType) score += 30;
      
      // Clean core level match
      if (example.cleanCoreLevel === context.currentCleanCoreLevel) score += 25;
      
      // Industry match
      if (example.industry === context.projectConfig.industry) score += 20;
      
      // Keyword matching in selected answers
      const exampleKeywords = (example.keywords || '').toLowerCase().split(' ');
      const answerText = Object.values(context.selectedAnswers || {}).join(' ').toLowerCase();
      
      for (const keyword of exampleKeywords) {
        if (keyword && answerText.includes(keyword)) {
          score += 5;
        }
      }
      
      example.relevanceScore = Math.min(100, score);
      return example;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  async logExampleView(analysisId, exampleId, tenant) {
    await INSERT.into('ExampleLog').entries({
      analysis_ID: analysisId,
      example_ID: exampleId,
      viewedAt: new Date(),
      tenant: tenant
    });
  }
  
  async recordExampleFeedback(analysisId, exampleId, relevanceRating, tenant) {
    await UPDATE('ExampleLog')
      .set({ relevanceRating: relevanceRating })
      .where({
        analysis_ID: analysisId,
        example_ID: exampleId,
        tenant: tenant
      });
  }
}

module.exports = ExamplesService;
```

### 8.3 UI Integration

**Custom Fragment for Constraints Display:**

```xml
<!-- webapp/view/fragments/ConstraintsPanel.fragment.xml -->
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
    xmlns:f="sap.ui.layout.form">
    
    <Panel headerText="⚠️ Constraints &amp; Considerations" expandable="true" expanded="true">
        <VBox class="sapUiSmallMargin">
            <List items="{constraints>/}">
                <CustomListItem>
                    <VBox>
                        <HBox>
                            <core:Icon src="{constraints>icon}" size="1.5rem" class="sapUiTinyMarginEnd"/>
                            <Title text="{constraints>category}" level="H5"/>
                        </HBox>
                        <List items="{constraints>constraints}" showSeparators="None">
                            <StandardListItem
                                title="{constraints>name}"
                                description="{constraints>description}"
                                info="{constraints>cleanCoreLevel}"
                                type="Inactive"/>
                        </List>
                    </VBox>
                </CustomListItem>
            </List>
        </VBox>
    </Panel>
</core:FragmentDefinition>
```

**Custom Fragment for Examples Display:**

```xml
<!-- webapp/view/fragments/ExamplesPanel.fragment.xml -->
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core">
    
    <Panel headerText="💡 Real-World Examples" expandable="true" expanded="false">
        <VBox class="sapUiSmallMargin">
            <List items="{examples>/}">
                <CustomListItem press="onExamplePress">
                    <VBox width="100%">
                        <HBox justifyContent="SpaceBetween">
                            <Title text="{examples>title}" level="H5"/>
                            <ObjectStatus
                                text="{examples>relevanceScore}% Relevant"
                                state="{= ${examples>relevanceScore} > 70 ? 'Success' : 'None'}"/>
                        </HBox>
                        <Text text="{examples>scenario}" class="sapUiTinyMarginTop"/>
                        <Text
                            text="{examples>challengeDescription}"
                            maxLines="2"
                            class="sapUiTinyMarginTop"/>
                        <HBox class="sapUiTinyMarginTop">
                            <Label text="Technologies:" class="sapUiTinyMarginEnd"/>
                            <Text text="{examples>technologiesUsed}"/>
                        </HBox>
                        <HBox class="sapUiTinyMarginTop">
                            <Label text="Performance:" class="sapUiTinyMarginEnd"/>
                            <Text text="{examples>performanceAchieved}"/>
                        </HBox>
                        <Link
                            text="View Full Example →"
                            press="onViewFullExample"
                            class="sapUiTinyMarginTop"/>
                    </VBox>
                </CustomListItem>
            </List>
        </VBox>
    </Panel>
</core:FragmentDefinition>
```

---

**[Continuing in next message due to length...]**

---

## 9. API Specifications

### 9.1 OData V4 Service Definition

**Complete CDS Service Definition:**

```cds
// srv/service.cds
using { sd } from '../db/schema';

@path: '/service/SolutionAdvisorSvcs'
@requires: 'authenticated-user'
service SolutionAdvisorService {
  
  // ============================================================================
  // ENTITIES - Read/Write Access
  // ============================================================================
  
  @restrict: [
    { grant: '*', to: 'TenantAdmin' },
    { grant: ['READ', 'CREATE', 'UPDATE'], to: 'SolutionArchitect' },
    { grant: 'READ', to: 'Developer' }
  ]
  entity Projects as projection on sd.ProjectConfiguration;
  
  @restrict: [
    { grant: '*', to: 'TenantAdmin' },
    { grant: ['READ', 'CREATE', 'UPDATE'], to: 'SolutionArchitect' },
    { grant: 'READ', to: 'Developer' }
  ]
  entity Analyses as projection on sd.CleanCoreAnalysis {
    *,
    projectConfig : Association to Projects
  };
  
  @restrict: [
    { grant: 'READ', to: ['TenantAdmin', 'SolutionArchitect', 'Developer'] }
  ]
  entity QuestionFlows as projection on sd.QuestionFlow;
  
  @restrict: [
    { grant: 'READ', to: ['TenantAdmin', 'SolutionArchitect', 'Developer'] }
  ]
  entity CleanCoreLevels as projection on sd.CleanCoreLevels;
  
  @restrict: [
    { grant: 'READ', to: ['TenantAdmin', 'SolutionArchitect', 'Developer'] }
  ]
  entity ObjectTypes as projection on sd.ObjectTypes;
  
  @restrict: [
    { grant: 'READ', to: ['TenantAdmin', 'SolutionArchitect', 'Developer'] }
  ]
  entity PerformanceThresholds as projection on sd.PerformanceThreshold;
  
  @restrict: [
    { grant: 'READ', to: ['TenantAdmin', 'SolutionArchitect', 'Developer'] }
  ]
  entity RealWorldExamples as projection on sd.RealWorldExample;
  
  @restrict: [
    { grant: '*', to: 'TenantAdmin' },
    { grant: ['READ', 'CREATE', 'UPDATE'], to: 'SolutionArchitect' },
    { grant: 'READ', to: 'Developer' }
  ]
  entity WizardSessions as projection on sd.WizardSession;
  
  // ============================================================================
  // ACTIONS - Wizard Flow
  // ============================================================================
  
  /**
   * Start a new wizard session for clean core analysis
   * @param projectId - UUID of the project
   * @param ricefwId - RICEFW identifier (format: [RICEFYW]-[0-9]{4}-[A-Z]{3})
   * @param objectType - One of: Reports, Interfaces, Conversions, Enhancements, Forms, Workflows
   * @param objectName - Name/description of the object
   * @returns Wizard session with first question
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['SolutionArchitect', 'Developer'] }
  ]
  action startWizard(
    projectId: UUID,
    ricefwId: String(10),
    objectType: String(50),
    objectName: String(200),
    objectDescription: String(1000)
  ) returns {
    sessionId: UUID;
    analysisId: UUID;
    totalQuestions: Integer;
    firstQuestion: {
      questionId: String(10);
      questionText: String(500);
      questionHint: String(1000);
      answerOptions: array of {
        value: String(200);
        label: String(200);
        description: String(500);
      };
    };
  };
  
  /**
   * Submit answer and get next question or final recommendation
   * @param sessionId - UUID of active wizard session
   * @param questionId - Current question ID
   * @param selectedAnswer - Selected answer value
   * @param userComments - Optional user comments
   * @param timeSpent - Time spent on question in seconds
   * @returns Next question or final recommendation
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['SolutionArchitect', 'Developer'] }
  ]
  action submitAnswer(
    sessionId: UUID,
    questionId: String(10),
    selectedAnswer: String(200),
    userComments: String(1000),
    timeSpent: Integer
  ) returns {
    type: String(20);  // NEXT_QUESTION or FINAL_RECOMMENDATION
    nextQuestion: {
      questionId: String(10);
      questionText: String(500);
      questionHint: String(1000);
      detailedHint: String(2000);
      answerOptions: array of {
        value: String(200);
        label: String(200);
        description: String(500);
      };
      stepNumber: Integer;
      totalSteps: Integer;
    };
    finalRecommendation: {
      level: String(10);
      reasoning: String(2000);
      analysisId: UUID;
    };
    constraints: array of {
      category: String(50);
      icon: String(10);
      constraints: array of {
        name: String(100);
        description: String(500);
        severity: String(20);
      };
    };
    examples: array of {
      id: UUID;
      title: String(200);
      scenario: String(500);
      relevanceScore: Integer;
    };
  };
  
  /**
   * Save wizard session and exit (resume later)
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['SolutionArchitect', 'Developer'] }
  ]
  action saveWizardSession(sessionId: UUID) returns {
    success: Boolean;
    message: String(200);
  };
  
  /**
   * Resume a previously saved wizard session
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['SolutionArchitect', 'Developer'] }
  ]
  action resumeWizardSession(sessionId: UUID) returns {
    sessionId: UUID;
    analysisId: UUID;
    currentStep: Integer;
    totalSteps: Integer;
    currentQuestion: {
      questionId: String(10);
      questionText: String(500);
      questionHint: String(1000);
      answerOptions: array of {};
    };
    previousAnswers: array of {
      questionId: String(10);
      questionText: String(500);
      selectedAnswer: String(200);
    };
  };
  
  // ============================================================================
  // FUNCTIONS - Scoring & Analytics
  // ============================================================================
  
  /**
   * Calculate scoring metrics for an analysis
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['TenantAdmin', 'SolutionArchitect', 'Developer'] }
  ]
  function calculateScores(analysisId: UUID) returns {
    technicalDebtScore: Decimal(5,2);
    cloudReadinessScore: Decimal(5,2);
    upgradeImpactScore: Decimal(5,2);
    compositeHealthScore: Decimal(5,2);
    interpretation: {
      technicalDebt: String(50);
      cloudReadiness: String(50);
      upgradeImpact: String(50);
    };
  };
  
  /**
   * Get project-level analytics
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['TenantAdmin', 'SolutionArchitect'] }
  ]
  function getProjectAnalytics(projectId: UUID) returns {
    totalAnalyses: Integer;
    levelDistribution: {
      levelA: Integer;
      levelB: Integer;
      levelC: Integer;
      levelD: Integer;
    };
    averageScores: {
      technicalDebt: Decimal(5,2);
      cloudReadiness: Decimal(5,2);
      upgradeImpact: Decimal(5,2);
    };
    objectTypeDistribution: array of {
      objectType: String(50);
      count: Integer;
    };
    riskProfile: {
      low: Integer;
      medium: Integer;
      high: Integer;
      critical: Integer;
    };
  };
  
  /**
   * Get tenant-wide analytics dashboard data
   */
  @restrict: [
    { grant: 'EXECUTE', to: 'TenantAdmin' }
  ]
  function getTenantAnalytics() returns {
    totalProjects: Integer;
    totalAnalyses: Integer;
    activeProjects: Integer;
    completedAnalyses: Integer;
    averageAnalysisTime: Integer;  // in minutes
    trendsOverTime: array of {
      month: String(7);  // YYYY-MM
      analysisCount: Integer;
      avgTechnicalDebt: Decimal(5,2);
      avgCloudReadiness: Decimal(5,2);
    };
  };
  
  /**
   * Get relevant constraints for analysis context
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['SolutionArchitect', 'Developer'] }
  ]
  function getRelevantConstraints(
    objectType: String(50),
    projectId: UUID,
    currentAnswers: String(5000)  // JSON
  ) returns {
    performanceConstraints: array of {
      method: String(100);
      volumeLimit: Integer;
      responseTimeTarget: Integer;
      cleanCoreLevel: String(10);
    };
    deploymentConstraints: array of {
      constraint: String(200);
      description: String(500);
      workaround: String(500);
    };
    complianceConstraints: array of {
      regulation: String(100);
      requirement: String(500);
      impact: String(500);
    };
  };
  
  /**
   * Get relevant real-world examples
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['SolutionArchitect', 'Developer'] }
  ]
  function getRelevantExamples(
    objectType: String(50),
    cleanCoreLevel: String(10),
    projectId: UUID
  ) returns array of {
    id: UUID;
    title: String(200);
    scenario: String(500);
    challengeDescription: String(2000);
    solutionSummary: String(1000);
    technologiesUsed: array of String(100);
    performanceAchieved: String(200);
    lessonsLearned: String(2000);
    relevanceScore: Integer;
  };
  
  /**
   * Generate decision flowchart data
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['TenantAdmin', 'SolutionArchitect', 'Developer'] }
  ]
  function generateFlowchart(analysisId: UUID) returns {
    nodes: array of {
      id: String(20);
      type: String(20);  // QUESTION, ANSWER, RECOMMENDATION
      label: String(200);
      description: String(500);
    };
    edges: array of {
      from: String(20);
      to: String(20);
      label: String(100);
    };
    metadata: {
      totalQuestions: Integer;
      decisionPath: String(500);
      finalLevel: String(10);
    };
  };
  
  // ============================================================================
  // ACTIONS - Export & Reporting
  // ============================================================================
  
  /**
   * Export analysis report as PDF
   */
  @restrict: [
    { grant: 'EXECUTE', to: ['TenantAdmin', 'SolutionArchitect'] }
  ]
  action exportAnalysisReport(
    analysisId: UUID,
    format: String(10),  // PDF, DOCX, XLSX
    includeFlowchart: Boolean
  ) returns {
    downloadUrl: String(500);
    expiresAt: DateTime;
  };
  
  /**
   * Bulk export multiple analyses
   */
  @restrict: [
    { grant: 'EXECUTE', to: 'TenantAdmin' }
  ]
  action bulkExportAnalyses(
    projectId: UUID,
    analysisIds: array of UUID,
    format: String(10)
  ) returns {
    downloadUrl: String(500);
    fileSize: Integer;
    recordCount: Integer;
  };
}
```

### 9.2 Error Handling Patterns

**Standard Error Response Structure:**

```javascript
// srv/lib/error-handler.js
class ApiError extends Error {
  constructor(code, message, details = {}, httpStatus = 400) {
    super(message);
    this.code = code;
    this.details = details;
    this.httpStatus = httpStatus;
    this.timestamp = new Date().toISOString();
  }
}

// Error codes
const ERROR_CODES = {
  // Validation Errors (4xx)
  VALIDATION_ERROR: 'VAL001',
  INVALID_RICEFWID: 'VAL002',
  INVALID_OBJECTTYPE: 'VAL003',
  SESSION_EXPIRED: 'VAL004',
  DUPLICATE_ANALYSIS: 'VAL005',
  
  // Business Logic Errors (4xx)
  PROJECT_NOT_FOUND: 'BUS001',
  ANALYSIS_NOT_FOUND: 'BUS002',
  WIZARD_SESSION_NOT_FOUND: 'BUS003',
  INVALID_QUESTION_FLOW: 'BUS004',
  SCORING_FAILED: 'BUS005',
  
  // Authorization Errors (4xx)
  UNAUTHORIZED: 'AUTH001',
  INSUFFICIENT_PERMISSIONS: 'AUTH002',
  TENANT_MISMATCH: 'AUTH003',
  
  // System Errors (5xx)
  DATABASE_ERROR: 'SYS001',
  EXTERNAL_SERVICE_ERROR: 'SYS002',
  FLOWCHART_GENERATION_ERROR: 'SYS003'
};

// Error handler middleware
const handleError = (err, req) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log error
  req.log.error({
    error: err.message,
    code: err.code,
    stack: isProduction ? undefined : err.stack,
    user: req.user?.id,
    tenant: req.tenant
  });
  
  // Return sanitized error
  return {
    error: {
      code: err.code || 'UNKNOWN_ERROR',
      message: isProduction ? 'An error occurred' : err.message,
      details: isProduction ? {} : err.details,
      timestamp: err.timestamp || new Date().toISOString()
    }
  };
};

module.exports = { ApiError, ERROR_CODES, handleError };
```

### 9.3 Batch Operations

**Example: Bulk Analysis Export**

```javascript
// srv/lib/batch-handler.js
srv.on('bulkExportAnalyses', async (req) => {
  const { projectId, analysisIds, format } = req.data;
  
  // Validate access to all analyses
  const analyses = await SELECT.from('CleanCoreAnalysis')
    .where({
      ID: { in: analysisIds },
      projectConfig_ID: projectId,
      tenant: req.user.tenant
    });
  
  if (analyses.length !== analysisIds.length) {
    throw new ApiError(
      ERROR_CODES.ANALYSIS_NOT_FOUND,
      'Some analyses not found or access denied',
      { requested: analysisIds.length, found: analyses.length }
    );
  }
  
  // Generate export file (async job)
  const jobId = await scheduleExportJob({
    analyses,
    format,
    userId: req.user.id,
    tenant: req.user.tenant
  });
  
  // Return download URL (will be ready in background)
  return {
    downloadUrl: `/downloads/${jobId}`,
    fileSize: 0,  // Updated when ready
    recordCount: analyses.length
  };
});
```

### 9.4 Rate Limiting

**Implementation:**

```javascript
// srv/middleware/rate-limiter.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each tenant to 100 requests per windowMs
  keyGenerator: (req) => req.user?.tenant || req.ip,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

module.exports = apiLimiter;
```

---

## 10. Multi-tenancy Implementation

> **Multi-tenancy Model Selected:** **Option 2 — Per-Tenant Master Data Copy**  
> Each tenant receives their own copy of master data (CleanCoreLevels, ObjectTypes, QuestionFlow, PerformanceThreshold, RealWorldExample) during onboarding. This allows tenant-specific customization while maintaining data isolation.

### 10.1 Multi-tenancy Architecture Overview

**Why Option 2?**

In a multi-tenant SaaS application, there are typically two approaches to handling master data:

1. **Option 1 - Shared Master Data:** All tenants share the same master data tables. Pros: Single source of truth, easier updates. Cons: No tenant-specific customization, complex access control.

2. **Option 2 - Per-Tenant Copy:** Each tenant gets their own copy of master data during onboarding. Pros: Full customization freedom, simpler isolation, tenant-specific question flows. Cons: Must update each tenant individually for global changes.

**For this application, Option 2 is selected because:**
- ✅ **Customization Need:** Different enterprises may want custom clean core levels, custom questions, or industry-specific examples
- ✅ **Regulatory Compliance:** Some industries require complete data isolation (FDA, financial services)
- ✅ **Flexibility:** Enterprise customers can modify decision trees without affecting others
- ✅ **Simpler Queries:** No need for complex tenant filtering on every master data query
- ✅ **Performance:** Indexes work better with tenant-isolated data

**Trade-off:** When SAP releases new best practices or question flows, we must provide a tenant upgrade mechanism to sync updates.

### 10.2 CAP MTX Configuration

**Package Dependencies:**

```json
// package.json (add to dependencies)
{
  "dependencies": {
    "@sap/cds-mtxs": "^2",
    "@sap/instance-manager": "^3"
  }
}
```

**Multi-tenancy Configuration:**

```json
// package.json (add to cds section)
{
  "cds": {
    "requires": {
      "multitenancy": true,
      "extensibility": true,
      "toggles": true,
      "db": {
        "kind": "hana",
        "multitenancy": true,
        "schema_evolution": "auto"
      },
      "auth": {
        "kind": "xsuaa"
      }
    }
  }
}
```

### 10.2 Tenant Provisioning Callback

**Implementation:**

```javascript
// srv/provisioning.js
const cds = require('@sap/cds');

module.exports = (service) => {
  
  // Tenant subscription (new tenant onboarding)
  service.on('subscribe', async (req) => {
    const { tenant, metadata } = req.data;
    
    console.log(`[MTX] Provisioning tenant: ${tenant}`);
    
    try {
      // 1. Create tenant-specific schema
      await cds.mtx.onboard(tenant);
      
      // 2. Seed master data for new tenant
      await seedMasterData(tenant);
      
      // 3. Create default tenant admin user
      await createDefaultAdmin(tenant, metadata);
      
      // 4. Send welcome email
      await sendWelcomeEmail(tenant, metadata);
      
      console.log(`[MTX] Tenant provisioned successfully: ${tenant}`);
      
      return {
        success: true,
        tenant: tenant,
        message: 'Tenant provisioned successfully'
      };
      
    } catch (error) {
      console.error(`[MTX] Tenant provisioning failed: ${tenant}`, error);
      throw error;
    }
  });
  
  // Tenant unsubscription (tenant offboarding)
  service.on('unsubscribe', async (req) => {
    const { tenant } = req.data;
    
    console.log(`[MTX] Deprovisioning tenant: ${tenant}`);
    
    try {
      // 1. Export tenant data (backup)
      await exportTenantData(tenant);
      
      // 2. Delete tenant schema
      await cds.mtx.offboard(tenant);
      
      // 3. Clean up file storage
      await cleanupTenantFiles(tenant);
      
      console.log(`[MTX] Tenant deprovisioned: ${tenant}`);
      
      return {
        success: true,
        tenant: tenant,
        message: 'Tenant deprovisioned successfully'
      };
      
    } catch (error) {
      console.error(`[MTX] Tenant deprovisioning failed: ${tenant}`, error);
      throw error;
    }
  });
  
  // Tenant upgrade (schema evolution)
  service.on('upgrade', async (req) => {
    const { tenant } = req.data;
    
    console.log(`[MTX] Upgrading tenant: ${tenant}`);
    
    try {
      // 1. Backup current schema
      await backupTenantSchema(tenant);
      
      // 2. Apply schema changes
      await cds.mtx.upgrade(tenant);
      
      // 3. Run data migrations
      await runDataMigrations(tenant);
      
      // 4. Verify schema integrity
      await verifySchemaIntegrity(tenant);
      
      console.log(`[MTX] Tenant upgraded successfully: ${tenant}`);
      
      return {
        success: true,
        tenant: tenant,
        version: process.env.APP_VERSION
      };
      
    } catch (error) {
      console.error(`[MTX] Tenant upgrade failed: ${tenant}`, error);
      
      // Rollback on failure
      await rollbackTenantUpgrade(tenant);
      throw error;
    }
  });
};

// Helper functions
async function seedMasterData(tenant) {
  const db = await cds.connect.to('db');
  
  // Set tenant context - CRITICAL for Option 2 multi-tenancy
  const tx = db.tx({ tenant });
  
  console.log(`[MTX] Seeding master data for tenant: ${tenant}`);
  
  // ============================================================================
  // STEP 1: Seed Clean Core Levels (4 levels)
  // ============================================================================
  // These define the framework: Level A (fully clean) to Level D (not recommended)
  await tx.run(INSERT.into('sd.CleanCoreLevels').entries([
    {
      level: 'Level A',
      levelName: 'Fully Clean Core',
      description: 'Standard SAP functionality without modifications',
      upgradeComplexity: 'None',
      maintenanceEffort: 'Low',
      businessFlexibility: 'High',
      technicalRisk: 'Low',
      cloudReadiness: 'Cloud Ready',
      technicalDebtMultiplier: 0.00,
      cloudReadinessFactor: 1.00,
      upgradeImpactMultiplier: 0.00,
      isActive: true,
      displayOrder: 1
    },
    {
      level: 'Level B',
      levelName: 'Enhanced Clean Core',
      description: 'Side-by-side extensions on SAP BTP',
      upgradeComplexity: 'Low',
      maintenanceEffort: 'Medium',
      businessFlexibility: 'Medium',
      technicalRisk: 'Medium',
      cloudReadiness: 'Partially',
      technicalDebtMultiplier: 1.00,
      cloudReadinessFactor: 0.50,
      upgradeImpactMultiplier: 1.00,
      isActive: true,
      displayOrder: 2
    },
    {
      level: 'Level C',
      levelName: 'Compliant Modifications',
      description: 'Custom ABAP development with upgrade compatibility',
      upgradeComplexity: 'Medium',
      maintenanceEffort: 'High',
      businessFlexibility: 'Medium',
      technicalRisk: 'High',
      cloudReadiness: 'Limited',
      technicalDebtMultiplier: 3.00,
      cloudReadinessFactor: 0.20,
      upgradeImpactMultiplier: 3.00,
      isActive: true,
      displayOrder: 3
    },
    {
      level: 'Level D',
      levelName: 'Not Recommended',
      description: 'Core modifications, custom code in standard objects',
      upgradeComplexity: 'Very High',
      maintenanceEffort: 'Very High',
      businessFlexibility: 'Low',
      technicalRisk: 'Critical',
      cloudReadiness: 'Not Ready',
      technicalDebtMultiplier: 5.00,
      cloudReadinessFactor: 0.00,
      upgradeImpactMultiplier: 5.00,
      isActive: true,
      displayOrder: 4
    }
  ]));
  
  // ============================================================================
  // STEP 2: Seed Object Types (6 RICEFW types)
  // ============================================================================
  // R = Reports, I = Interfaces, C = Conversions, E = Enhancements, F = Forms, W = Workflows
  await tx.run(INSERT.into('sd.ObjectTypes').entries([
    {
      objectType: 'Reports',
      objectCode: 'R',
      displayName: 'Reports & Analytics',
      description: 'Analytical and operational reporting solutions',
      iconName: 'sap-icon://business-objects-experience',
      complexity: 'Moderate',
      avgAnalysisTime: 15,
      questionCount: 7,  // Typical number of questions for Reports
      isActive: true
    },
    {
      objectType: 'Interfaces',
      objectCode: 'I',
      displayName: 'Interfaces & Integration',
      description: 'System integration patterns and protocols',
      iconName: 'sap-icon://connected',
      complexity: 'High',
      avgAnalysisTime: 25,
      questionCount: 12,  // More complex decision tree
      isActive: true
    },
    {
      objectType: 'Conversions',
      objectCode: 'C',
      displayName: 'Data Conversions & Migration',
      description: 'Data migration and transformation approaches',
      iconName: 'sap-icon://data-mapping',
      complexity: 'High',
      avgAnalysisTime: 30,
      questionCount: 10,
      isActive: true
    },
    {
      objectType: 'Enhancements',
      objectCode: 'E',
      displayName: 'Enhancements & Extensions',
      description: 'Functional and technical extensions',
      iconName: 'sap-icon://add-product',
      complexity: 'Moderate',
      avgAnalysisTime: 20,
      questionCount: 8,
      isActive: true
    },
    {
      objectType: 'Forms',
      objectCode: 'F',
      displayName: 'Forms & Output Management',
      description: 'Document generation and output management',
      iconName: 'sap-icon://document',
      complexity: 'Low',
      avgAnalysisTime: 15,
      questionCount: 6,
      isActive: true
    },
    {
      objectType: 'Workflows',
      objectCode: 'W',
      displayName: 'Workflows & Business Processes',
      description: 'Business process automation patterns',
      iconName: 'sap-icon://workflow-tasks',
      complexity: 'Moderate',
      avgAnalysisTime: 20,
      questionCount: 9,
      isActive: true
    }
  ]));
  
  // ============================================================================
  // STEP 3: Seed Sample Performance Thresholds
  // ============================================================================
  // These help users understand technical limitations during decision-making
  await tx.run(INSERT.into('sd.PerformanceThreshold').entries([
    {
      category: 'Integration',
      method: 'OData API (Released)',
      volumeLimit: 5000,
      sizeThreshold: '35MB',
      frequencyLimit: 'Real-time (<5 seconds)',
      responseTimeTarget: 5000,
      concurrencyLimit: 100,
      cleanCoreLevel: 'Level A',
      whenExceeded: 'Consider batch processing or event-driven architecture',
      alternativeSolution: 'Use Enterprise Event Enablement for high-volume scenarios',
      applicableObjectTypes: 'I',
      isActive: true
    },
    {
      category: 'Integration',
      method: 'Enhanced IDOC via CPI',
      volumeLimit: 100000,
      sizeThreshold: '500MB',
      frequencyLimit: 'Batch (Daily/Weekly)',
      responseTimeTarget: null,
      concurrencyLimit: 10,
      cleanCoreLevel: 'Level B',
      whenExceeded: 'Split into multiple batches or use direct HANA data loading',
      alternativeSolution: 'SAP Data Services for very large volumes',
      applicableObjectTypes: 'I,C',
      isActive: true
    },
    {
      category: 'Reporting',
      method: 'Embedded Analytics (CDS Views)',
      volumeLimit: 100000,
      sizeThreshold: '5MB',
      frequencyLimit: 'Real-time',
      responseTimeTarget: 5000,
      concurrencyLimit: 500,
      cleanCoreLevel: 'Level A',
      whenExceeded: 'Use SAP Analytics Cloud for larger datasets',
      alternativeSolution: 'Implement data aggregation or archiving strategy',
      applicableObjectTypes: 'R',
      isActive: true
    }
  ]));
  
  // ============================================================================
  // STEP 4: Seed Sample Real-World Examples
  // ============================================================================
  // These provide contextual guidance during wizard execution
  await tx.run(INSERT.into('sd.RealWorldExample').entries([
    {
      title: 'E-commerce Order Integration',
      objectType: 'Interfaces',
      cleanCoreLevel: 'Level A',
      industry: 'Retail',
      scenario: 'Real-time order synchronization between e-commerce platform and S/4HANA',
      challengeDescription: 'Process 10,000 daily orders with <2 second response time requirement',
      solutionDescription: 'Implemented event-driven integration using SAP Event Mesh',
      solutionSummary: 'Used released OData APIs with Enterprise Event Enablement',
      technologiesUsed: JSON.stringify(['OData V4 APIs', 'SAP Event Mesh', 'SAP Integration Suite']),
      volumeHandled: '10,000 orders/day',
      performanceAchieved: '<1 second event delivery, 99.9% success rate',
      implementationTime: '6 weeks',
      lessonsLearned: 'Event-driven architecture scales better than polling. Implement retry logic for failed events.',
      keywords: 'real-time integration event-driven retail orders',
      usageCount: 0,
      isActive: true,
      isApproved: true,
      approvedBy: 'System Seed',
      approvedDate: new Date()
    },
    {
      title: 'Financial Reporting Dashboard',
      objectType: 'Reports',
      cleanCoreLevel: 'Level A',
      industry: 'Financial Services',
      scenario: 'Executive dashboard for P&L reporting with drill-down capabilities',
      challengeDescription: 'Display 50K+ transactions aggregated by various dimensions',
      solutionDescription: 'Used standard Fiori analytical apps with custom CDS views',
      solutionSummary: 'Embedded Analytics with KPI tiles and analytical list pages',
      technologiesUsed: JSON.stringify(['CDS Views', 'Fiori Analytical Apps', 'KPI Framework']),
      volumeHandled: '50,000 transactions/month',
      performanceAchieved: '<3 seconds load time for aggregated views',
      implementationTime: '4 weeks',
      lessonsLearned: 'Proper CDS view design with aggregations is critical. Use delta mechanisms for large datasets.',
      keywords: 'reporting analytics financial dashboard',
      usageCount: 0,
      isActive: true,
      isApproved: true,
      approvedBy: 'System Seed',
      approvedDate: new Date()
    }
  ]));
  
  console.log(`[MTX] Master data seeded successfully for tenant: ${tenant}`);
  console.log(`[MTX] - Clean Core Levels: 4 entries`);
  console.log(`[MTX] - Object Types: 6 entries`);
  console.log(`[MTX] - Performance Thresholds: 3 sample entries`);
  console.log(`[MTX] - Real-World Examples: 2 sample entries`);
  console.log(`[MTX] Note: QuestionFlow data should be loaded from CSV files in production`);
}

async function createDefaultAdmin(tenant, metadata) {
  // Create tenant admin user in XSUAA
  // Implementation depends on XSUAA user management API
  console.log(`[MTX] Default admin created for tenant: ${tenant}`);
}

async function sendWelcomeEmail(tenant, metadata) {
  // Send welcome email with login instructions
  // Implementation depends on email service
  console.log(`[MTX] Welcome email sent for tenant: ${tenant}`);
}

async function exportTenantData(tenant) {
  // Export all tenant data for compliance/backup
  console.log(`[MTX] Data exported for tenant: ${tenant}`);
}

async function cleanupTenantFiles(tenant) {
  // Delete tenant-specific files (flowcharts, exports)
  console.log(`[MTX] Files cleaned up for tenant: ${tenant}`);
}

async function backupTenantSchema(tenant) {
  // Create schema backup before upgrade
  console.log(`[MTX] Schema backed up for tenant: ${tenant}`);
}

async function runDataMigrations(tenant) {
  // Run any data transformation scripts
  console.log(`[MTX] Data migrations completed for tenant: ${tenant}`);
}

async function verifySchemaIntegrity(tenant) {
  // Verify schema structure and data integrity
  console.log(`[MTX] Schema integrity verified for tenant: ${tenant}`);
}

async function rollbackTenantUpgrade(tenant) {
  // Restore from backup on upgrade failure
  console.log(`[MTX] Upgrade rolled back for tenant: ${tenant}`);
}
```

### 10.3 Tenant Context Injection

**Automatic Tenant Filtering:**

```javascript
// srv/middleware/tenant-context.js
const cds = require('@sap/cds');

module.exports = function tenantMiddleware() {
  return async (req, res, next) => {
    // Extract tenant from JWT token
    const tenant = req.user?.tenant || req.authInfo?.getSubdomain();
    
    if (!tenant) {
      return res.status(401).json({
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant context not found in request'
        }
      });
    }
    
    // Inject tenant into request context
    req.tenant = tenant;
    
    // Set tenant for database operations
    cds.context = { tenant };
    
    next();
  };
};
```

**Tenant-Aware Query Pattern:**

```javascript
// All CDS queries automatically filter by tenant
srv.on('READ', 'Analyses', async (req) => {
  // Tenant filtering is automatic via CAP MTX
  // This query only returns analyses for current tenant
  return SELECT.from('CleanCoreAnalysis')
    .where({ tenant: req.user.tenant });  // Explicit for clarity
});

// Prevent cross-tenant access
srv.before('UPDATE', 'Analyses', async (req) => {
  const analysis = await SELECT.one.from('CleanCoreAnalysis')
    .where({ ID: req.data.ID });
  
  if (analysis.tenant !== req.user.tenant) {
    throw new ApiError(
      ERROR_CODES.TENANT_MISMATCH,
      'Access denied: Cross-tenant access not allowed',
      {},
      403
    );
  }
});
```

### 10.4 Cross-Tenant Analytics (Service Provider)

**For SaaS provider dashboards only:**

```javascript
// srv/lib/provider-analytics.js
@restrict: [
  { grant: 'EXECUTE', to: 'ServiceProviderAdmin' }
]
function getProviderAnalytics() returns {
  totalTenants: Integer;
  activeTenants: Integer;
  totalAnalyses: Integer;
  avgAnalysesPerTenant: Decimal(10,2);
  tenantDistribution: array of {
    tenantId: String(36);
    tenantName: String(200);
    analysisCount: Integer;
    avgScores: {
      technicalDebt: Decimal(5,2);
      cloudReadiness: Decimal(5,2);
    };
  };
};
```

---

## 11. Performance & Scalability

### 11.1 Database Indexing Strategy

**Required Indexes:**

```sql
-- db/src/indexes.hdbindex

-- CleanCoreAnalysis indexes
CREATE INDEX IDX_ANALYSIS_TENANT_PROJECT ON sd_CleanCoreAnalysis (tenant, projectConfig_ID);
CREATE INDEX IDX_ANALYSIS_RICEFWID ON sd_CleanCoreAnalysis (ricefwId);
CREATE INDEX IDX_ANALYSIS_STATUS ON sd_CleanCoreAnalysis (status, analysisDate);
CREATE INDEX IDX_ANALYSIS_OBJECTTYPE ON sd_CleanCoreAnalysis (objectType);

-- ProjectConfiguration indexes
CREATE INDEX IDX_PROJECT_TENANT ON sd_ProjectConfiguration (tenant, status);
CREATE INDEX IDX_PROJECT_CLIENT ON sd_ProjectConfiguration (clientName);

-- DecisionPath indexes
CREATE INDEX IDX_DECISION_ANALYSIS ON sd_DecisionPath (analysis_ID, stepOrder);

-- WizardSession indexes
CREATE INDEX IDX_SESSION_TENANT ON sd_WizardSession (tenant, sessionStatus);
CREATE INDEX IDX_SESSION_EXPIRES ON sd_WizardSession (expiresAt);

-- QuestionFlow indexes
CREATE INDEX IDX_QUESTION_OBJECTTYPE ON sd_QuestionFlow (objectType, displayOrder);

-- Performance audit
CREATE INDEX IDX_PERFORMANCE_OBJECTTYPE ON sd_PerformanceThreshold (applicableObjectTypes, cleanCoreLevel);
```

### 11.2 Caching Strategy

**Implementation with CAP + Redis:**

```javascript
// srv/lib/cache-manager.js
const Redis = require('ioredis');

class CacheManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    });
    
    // Cache TTLs (in seconds)
    this.TTL = {
      MASTER_DATA: 3600,      // 1 hour
      QUESTION_FLOW: 1800,    // 30 minutes
      CONSTRAINTS: 1800,      // 30 minutes
      ANALYTICS: 300          // 5 minutes
    };
  }
  
  async getMasterData(type, tenant) {
    const key = `master:${type}:${tenant}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }
  
  async setMasterData(type, tenant, data) {
    const key = `master:${type}:${tenant}`;
    await this.redis.setex(
      key,
      this.TTL.MASTER_DATA,
      JSON.stringify(data)
    );
  }
  
  async getQuestionFlow(objectType, questionId, tenant) {
    const key = `questions:${objectType}:${questionId}:${tenant}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }
  
  async setQuestionFlow(objectType, questionId, tenant, data) {
    const key = `questions:${objectType}:${questionId}:${tenant}`;
    await this.redis.setex(
      key,
      this.TTL.QUESTION_FLOW,
      JSON.stringify(data)
    );
  }
  
  async invalidateTenantCache(tenant) {
    const pattern = `*:${tenant}`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

module.exports = new CacheManager();
```

**Usage in Service:**

```javascript
const cache = require('./lib/cache-manager');

srv.on('READ', 'CleanCoreLevels', async (req) => {
  // Try cache first
  let levels = await cache.getMasterData('levels', req.user.tenant);
  
  if (!levels) {
    // Query database
    levels = await SELECT.from('CleanCoreLevels')
      .where({ tenant: req.user.tenant, isActive: true });
    
    // Store in cache
    await cache.setMasterData('levels', req.user.tenant, levels);
  }
  
  return levels;
});
```

### 11.3 Pagination

**Implementation:**

```javascript
srv.on('READ', 'Analyses', async (req) => {
  const { $top = 50, $skip = 0 } = req.query;
  
  // Enforce maximum page size
  const pageSize = Math.min($top, 100);
  
  const [analyses, count] = await Promise.all([
    SELECT.from('CleanCoreAnalysis')
      .where({ tenant: req.user.tenant })
      .limit(pageSize, $skip),
    SELECT.one`count(*) as count`.from('CleanCoreAnalysis')
      .where({ tenant: req.user.tenant })
  ]);
  
  // Add pagination metadata to response
  req.results = analyses;
  req.messages.push({
    code: 'PAGINATION',
    message: `Page ${Math.floor($skip / pageSize) + 1}`,
    numericSeverity: 1,
    additionalInfo: {
      total: count.count,
      pageSize: pageSize,
      page: Math.floor($skip / pageSize) + 1,
      totalPages: Math.ceil(count.count / pageSize)
    }
  });
  
  return analyses;
});
```

### 11.4 Asynchronous Processing

**For Long-Running Operations:**

```javascript
// srv/lib/job-scheduler.js
const cds = require('@sap/cds');

class JobScheduler {
  async scheduleFlowchartGeneration(analysisId, tenant) {
    const job = await INSERT.into('BackgroundJob').entries({
      jobType: 'FLOWCHART_GENERATION',
      entityId: analysisId,
      status: 'PENDING',
      tenant: tenant,
      createdAt: new Date()
    });
    
    // Process in background
    process.nextTick(() => this.processFlowchart(job.ID, analysisId, tenant));
    
    return job.ID;
  }
  
  async processFlowchart(jobId, analysisId, tenant) {
    try {
      await UPDATE('BackgroundJob').set({ status: 'PROCESSING' }).where({ ID: jobId });
      
      // Generate flowchart (CPU-intensive)
      const flowchartData = await this.generateFlowchartData(analysisId, tenant);
      
      // Store result
      await UPDATE('CleanCoreAnalysis')
        .set({ exportedFlowchart: flowchartData.url })
        .where({ ID: analysisId, tenant });
      
      await UPDATE('BackgroundJob').set({
        status: 'COMPLETED',
        completedAt: new Date(),
        result: JSON.stringify({ url: flowchartData.url })
      }).where({ ID: jobId });
      
    } catch (error) {
      await UPDATE('BackgroundJob').set({
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date()
      }).where({ ID: jobId });
    }
  }
}

module.exports = new JobScheduler();
```

### 11.5 Query Optimization

**Best Practices:**

```javascript
// BAD: N+1 query problem
for (const analysis of analyses) {
  analysis.project = await SELECT.one.from('ProjectConfiguration')
    .where({ ID: analysis.projectConfig_ID });
}

// GOOD: Single query with join
const analyses = await SELECT.from('CleanCoreAnalysis')
  .columns('*', { ref: ['projectConfig'], expand: ['*'] })
  .where({ tenant: req.user.tenant });

// BAD: Loading all records
const allAnalyses = await SELECT.from('CleanCoreAnalysis');
const recentAnalyses = allAnalyses.filter(a => a.analysisDate > lastWeek);

// GOOD: Filter in database
const recentAnalyses = await SELECT.from('CleanCoreAnalysis')
  .where({ analysisDate: { '>': lastWeek }, tenant: req.user.tenant });
```

---

## 11. Performance & Scalability

### 11.6 Load Testing Targets

**Performance SLAs:**

| Operation | Target Response Time | Max Concurrent Users | Throughput |
|-----------|---------------------|---------------------|------------|
| Read Analysis List | <500ms | 500 | 1000 req/min |
| Start Wizard | <1s | 100 | 200 req/min |
| Submit Answer | <800ms | 100 | 300 req/min |
| Calculate Scores | <2s | 50 | 100 req/min |
| Generate Flowchart | <5s (async) | 20 | 50 req/min |
| Export Report | <3s (async) | 20 | 30 req/min |

**Scalability Targets:**

- **Tenants:** Support 100+ active tenants
- **Users:** 10,000+ users across all tenants
- **Analyses:** 1,000,000+ historical analyses
- **Concurrent Sessions:** 500+ simultaneous wizard sessions
- **Database Size:** <500GB total (including all tenants)

### 11.7 Monitoring & Alerts

**Key Metrics to Monitor:**

```javascript
// srv/lib/metrics-collector.js
const prometheus = require('prom-client');

// Define metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status', 'tenant']
});

const wizardCompletionTime = new prometheus.Histogram({
  name: 'wizard_completion_seconds',
  help: 'Time to complete wizard from start to finish',
  labelNames: ['objectType', 'tenant']
});

const analysisCount = new prometheus.Counter({
  name: 'analyses_total',
  help: 'Total number of analyses created',
  labelNames: ['objectType', 'cleanCoreLevel', 'tenant']
});

const activeWizardSessions = new prometheus.Gauge({
  name: 'active_wizard_sessions',
  help: 'Number of active wizard sessions',
  labelNames: ['tenant']
});

// Export metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

---

## 12. Security & Compliance

### 12.1 Enhanced XSUAA Configuration

**Complete xs-security.json:**

```json
{
  "xsappname": "solutionadvisor",
  "tenant-mode": "shared",
  "description": "SAP Clean Core Solution Advisor - Multi-tenant SaaS Application",
  "scopes": [
    {
      "name": "$XSAPPNAME.TenantAdmin",
      "description": "Full administrative access within tenant"
    },
    {
      "name": "$XSAPPNAME.SolutionArchitect",
      "description": "Create and manage clean core analyses"
    },
    {
      "name": "$XSAPPNAME.Developer",
      "description": "Execute wizard and view analyses"
    },
    {
      "name": "$XSAPPNAME.ServiceProviderAdmin",
      "description": "Cross-tenant analytics for service providers"
    }
  ],
  "attributes": [
    {
      "name": "ProjectAccess",
      "description": "Project-level access control",
      "valueType": "s"
    },
    {
      "name": "DataClassification",
      "description": "Data sensitivity level",
      "valueType": "s"
    }
  ],
  "role-templates": [
    {
      "name": "TenantAdministrator",
      "description": "Full project & user management within tenant",
      "scope-references": [
        "$XSAPPNAME.TenantAdmin"
      ],
      "attribute-references": [
        {
          "name": "ProjectAccess",
          "value-required": false
        }
      ]
    },
    {
      "name": "SolutionArchitect",
      "description": "Create/edit analyses, export reports, approve decisions",
      "scope-references": [
        "$XSAPPNAME.SolutionArchitect"
      ],
      "attribute-references": [
        {
          "name": "ProjectAccess",
          "value-required": true
        }
      ]
    },
    {
      "name": "DeveloperConsultant",
      "description": "Execute wizard, view results, no edit/delete permissions",
      "scope-references": [
        "$XSAPPNAME.Developer"
      ],
      "attribute-references": [
        {
          "name": "ProjectAccess",
          "value-required": true
        }
      ]
    },
    {
      "name": "ServiceProviderAdministrator",
      "description": "Cross-tenant analytics and monitoring (SaaS provider only)",
      "scope-references": [
        "$XSAPPNAME.ServiceProviderAdmin",
        "$XSAPPNAME.TenantAdmin"
      ]
    }
  ],
  "role-collections": [
    {
      "name": "SolutionAdvisor_TenantAdmin",
      "description": "Tenant Administrator Role Collection",
      "role-template-references": [
        "$XSAPPNAME.TenantAdministrator"
      ]
    },
    {
      "name": "SolutionAdvisor_Architect",
      "description": "Solution Architect Role Collection",
      "role-template-references": [
        "$XSAPPNAME.SolutionArchitect"
      ]
    },
    {
      "name": "SolutionAdvisor_Developer",
      "description": "Developer/Consultant Role Collection",
      "role-template-references": [
        "$XSAPPNAME.DeveloperConsultant"
      ]
    }
  ],
  "oauth2-configuration": {
    "token-validity": 3600,
    "refresh-token-validity": 86400,
    "redirect-uris": [
      "https://*.cfapps.<region>.hana.ondemand.com/**",
      "http://localhost:4004/**"
    ]
  }
}
```

### 12.2 Attribute-Based Access Control (ABAC)

**Project-Level Access Control:**

```javascript
// srv/middleware/abac-handler.js
srv.before(['READ', 'UPDATE', 'DELETE'], 'Analyses', async (req) => {
  const analysisId = req.data.ID || req.query.SELECT?.from?.ref?.[0];
  
  if (!analysisId) return;  // List operations handled separately
  
  // Get analysis with project
  const analysis = await SELECT.one.from('CleanCoreAnalysis')
    .columns('projectConfig_ID', 'tenant')
    .where({ ID: analysisId });
  
  if (!analysis) {
    throw new ApiError(ERROR_CODES.ANALYSIS_NOT_FOUND, 'Analysis not found', {}, 404);
  }
  
  // Verify tenant isolation
  if (analysis.tenant !== req.user.tenant) {
    throw new ApiError(ERROR_CODES.TENANT_MISMATCH, 'Access denied', {}, 403);
  }
  
  // Check project-level access (for SolutionArchitect and Developer roles)
  const userProjectAccess = req.user.attr?.ProjectAccess || [];
  const hasProjectAccess = userProjectAccess.includes(analysis.projectConfig_ID) ||
                          userProjectAccess.includes('*');  // Wildcard access
  
  if (!hasProjectAccess && !req.user.is('TenantAdmin')) {
    throw new ApiError(
      ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      'Access denied: No permission for this project',
      { projectId: analysis.projectConfig_ID },
      403
    );
  }
});
```

### 12.3 Data Encryption

**Sensitive Field Encryption:**

```javascript
// srv/lib/crypto-service.js
const crypto = require('crypto');

class CryptoService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    
    // Load encryption key from environment (SAP Credential Store)
    this.encryptionKey = Buffer.from(
      process.env.ENCRYPTION_KEY || this.generateKey(),
      'hex'
    );
  }
  
  generateKey() {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }
  
  encrypt(plaintext) {
    if (!plaintext) return null;
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: IV + AuthTag + Encrypted Data (all hex)
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }
  
  decrypt(ciphertext) {
    if (!ciphertext) return null;
    
    try {
      const ivHex = ciphertext.slice(0, this.ivLength * 2);
      const authTagHex = ciphertext.slice(this.ivLength * 2, (this.ivLength + 16) * 2);
      const encryptedHex = ciphertext.slice((this.ivLength + 16) * 2);
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
}

module.exports = new CryptoService();
```

**Usage in Service:**

```javascript
const crypto = require('./lib/crypto-service');

// Encrypt sensitive comments before storing
srv.before('CREATE', 'Analyses', async (req) => {
  if (req.data.objectDescription) {
    req.data.objectDescription = crypto.encrypt(req.data.objectDescription);
  }
});

// Decrypt when reading
srv.after('READ', 'Analyses', (analyses) => {
  if (Array.isArray(analyses)) {
    analyses.forEach(a => {
      if (a.objectDescription) {
        a.objectDescription = crypto.decrypt(a.objectDescription);
      }
    });
  } else if (analyses?.objectDescription) {
    analyses.objectDescription = crypto.decrypt(analyses.objectDescription);
  }
});
```

### 12.4 Audit Logging

**Complete Audit Trail:**

```javascript
// srv/lib/audit-logger.js
const auditLog = require('@sap/audit-logging');

class AuditLogger {
  constructor() {
    this.auditLog = auditLog.v2();
  }
  
  async logDataAccess(req, entityType, entityId, operation) {
    await this.auditLog.securityMessage('%s accessed %s %s', req.user.id, entityType, entityId)
      .tenant(req.user.tenant)
      .user(req.user.id)
      .attribute('entityType', entityType)
      .attribute('entityId', entityId)
      .attribute('operation', operation)
      .log();
  }
  
  async logDataModification(req, entityType, entityId, operation, changes) {
    await this.auditLog.dataModificationMessage()
      .tenant(req.user.tenant)
      .user(req.user.id)
      .attribute('entityType', entityType)
      .attribute('entityId', entityId)
      .attribute('operation', operation)
      .attribute('changes', JSON.stringify(changes))
      .log();
  }
  
  async logSecurityEvent(req, eventType, message, severity = 'WARNING') {
    await this.auditLog.securityMessage('%s: %s', eventType, message)
      .tenant(req.user.tenant)
      .user(req.user?.id || 'ANONYMOUS')
      .attribute('eventType', eventType)
      .attribute('severity', severity)
      .log();
  }
  
  async logConfigurationChange(req, configType, oldValue, newValue) {
    await this.auditLog.configChangeMessage()
      .tenant(req.user.tenant)
      .user(req.user.id)
      .attribute('configurationType', configType)
      .attribute('oldValue', JSON.stringify(oldValue))
      .attribute('newValue', JSON.stringify(newValue))
      .log();
  }
}

module.exports = new AuditLogger();
```

**Usage:**

```javascript
const auditLogger = require('./lib/audit-logger');

srv.after('READ', 'Analyses', async (analyses, req) => {
  if (analyses) {
    const ids = Array.isArray(analyses) ? analyses.map(a => a.ID) : [analyses.ID];
    await auditLogger.logDataAccess(req, 'CleanCoreAnalysis', ids.join(','), 'READ');
  }
});

srv.after(['CREATE', 'UPDATE', 'DELETE'], 'Analyses', async (analysis, req) => {
  await auditLogger.logDataModification(
    req,
    'CleanCoreAnalysis',
    analysis.ID,
    req.method,
    { before: req._before, after: analysis }
  );
});
```

### 12.5 GDPR Compliance

**Personal Data Handling:**

```cds
// db/schema.cds - Mark personal data fields
entity ProjectConfiguration : cuid, managed {
  @PersonalData.IsPotentiallySensitive: true
  clientName       : String(200) not null;
  
  @PersonalData.IsPotentiallyPersonal: true
  createdBy        : String(200);  // User ID
  
  // ... other fields
}

// Data Subject Rights implementation
entity PersonalDataLog : cuid {
  dataSubject      : String(200) not null;  // User ID
  entityType       : String(100) not null;
  entityId         : UUID not null;
  operation        : String(20);            // READ, EXPORT, DELETE
  processedAt      : DateTime not null;
  processedBy      : String(200);
  tenant           : String(36) not null;
}
```

**GDPR Service Actions:**

```javascript
// Data subject access request (export all personal data)
srv.action('exportPersonalData', async (req) => {
  const { dataSubjectId } = req.data;
  
  // Find all entities containing personal data
  const [projects, analyses, sessions] = await Promise.all([
    SELECT.from('ProjectConfiguration').where({ createdBy: dataSubjectId, tenant: req.user.tenant }),
    SELECT.from('CleanCoreAnalysis').where({ createdBy: dataSubjectId, tenant: req.user.tenant }),
    SELECT.from('WizardSession').where({ createdBy: dataSubjectId, tenant: req.user.tenant })
  ]);
  
  // Log GDPR export
  await INSERT.into('PersonalDataLog').entries({
    dataSubject: dataSubjectId,
    entityType: 'ALL',
    operation: 'EXPORT',
    processedAt: new Date(),
    processedBy: req.user.id,
    tenant: req.user.tenant
  });
  
  return {
    projects, analyses, sessions
  };
});

// Right to be forgotten (delete personal data)
srv.action('deletePersonalData', async (req) => {
  const { dataSubjectId } = req.data;
  
  // Anonymize user-created data
  await UPDATE('ProjectConfiguration')
    .set({ createdBy: 'ANONYMIZED', modifiedBy: 'ANONYMIZED' })
    .where({ createdBy: dataSubjectId, tenant: req.user.tenant });
  
  await UPDATE('CleanCoreAnalysis')
    .set({ createdBy: 'ANONYMIZED', reviewedBy: 'ANONYMIZED', approvedBy: 'ANONYMIZED' })
    .where({ createdBy: dataSubjectId, tenant: req.user.tenant });
  
  // Log GDPR deletion
  await INSERT.into('PersonalDataLog').entries({
    dataSubject: dataSubjectId,
    entityType: 'ALL',
    operation: 'DELETE',
    processedAt: new Date(),
    processedBy: req.user.id,
    tenant: req.user.tenant
  });
  
  return { success: true, message: 'Personal data anonymized' };
});
```

---

## 13. Testing Strategy

### 13.1 Unit Testing (Jest)

**Test Structure:**

```javascript
// srv/test/decision-engine.test.js
const cds = require('@sap/cds');
const { expect } = require('chai');

describe('Decision Engine', () => {
  let srv, db;
  
  before(async () => {
    srv = await cds.serve('SolutionAdvisorService').from('srv/service.cds');
    db = await cds.connect.to('db');
    
    // Seed test data
    await db.run(INSERT.into('QuestionFlow').entries([
      {
        questionId: 'Q1',
        objectType: 'Interfaces',
        questionText: 'Is standard functionality available?',
        navigationRules: JSON.stringify({
          Yes: { nextQuestion: null, finalAnswer: 'Level A' },
          No: { nextQuestion: 'Q2', finalAnswer: null }
        })
      }
    ]));
  });
  
  it('should return Level A when standard functionality exists', async () => {
    const result = await srv.post('/startWizard', {
      projectId: '00000000-0000-0000-0000-000000000001',
      ricefwId: 'I-0001-TST',
      objectType: 'Interfaces',
      objectName: 'Test Interface'
    });
    
    expect(result).to.have.property('sessionId');
    expect(result.firstQuestion.questionId).to.equal('Q1');
    
    const answerResult = await srv.post('/submitAnswer', {
      sessionId: result.sessionId,
      questionId: 'Q1',
      selectedAnswer: 'Yes',
      timeSpent: 30
    });
    
    expect(answerResult.type).to.equal('FINAL_RECOMMENDATION');
    expect(answerResult.finalRecommendation.level).to.equal('Level A');
  });
  
  after(async () => {
    await db.run(DELETE.from('QuestionFlow'));
  });
});
```

**Scoring Engine Tests:**

```javascript
// srv/test/scoring-service.test.js
const ScoringService = require('../lib/scoring-service');
const { expect } = require('chai');

describe('Scoring Service', () => {
  let scoringService;
  
  before(() => {
    scoringService = new ScoringService();
  });
  
  describe('Technical Debt Calculation', () => {
    it('should return 0 for all Level A analyses', () => {
      const analyses = [
        { finalRecommendation: 'Level A', technicalComplexity: 'Simple' },
        { finalRecommendation: 'Level A', technicalComplexity: 'Moderate' }
      ];
      
      const score = scoringService.calculateTechnicalDebt(analyses);
      expect(score).to.equal(0);
    });
    
    it('should calculate high score for Level D analyses', () => {
      const analyses = [
        { finalRecommendation: 'Level D', technicalComplexity: 'Very Complex' },
        { finalRecommendation: 'Level D', technicalComplexity: 'Complex' }
      ];
      
      const score = scoringService.calculateTechnicalDebt(analyses);
      expect(score).to.be.greaterThan(80);
    });
  });
  
  describe('Cloud Readiness Calculation', () => {
    it('should return 100% for all Level A', () => {
      const analyses = [
        { finalRecommendation: 'Level A' },
        { finalRecommendation: 'Level A' }
      ];
      
      const score = scoringService.calculateCloudReadiness(analyses);
      expect(score).to.equal(100);
    });
    
    it('should return 0% for all Level C/D', () => {
      const analyses = [
        { finalRecommendation: 'Level C' },
        { finalRecommendation: 'Level D' }
      ];
      
      const score = scoringService.calculateCloudReadiness(analyses);
      expect(score).to.equal(0);
    });
  });
});
```

### 13.2 Integration Testing (CAP Test Framework)

```javascript
// srv/test/integration/wizard-flow.test.js
const cds = require('@sap/cds/lib');
const { POST, GET, expect } = cds.test('serve', '--in-memory');

describe('Wizard Integration Flow', () => {
  
  it('should complete full wizard flow for Interface analysis', async () => {
    // Create project
    const { data: project } = await POST('/service/SolutionAdvisorSvcs/Projects', {
      clientName: 'Test Client',
      projectName: 'Integration Test Project',
      s4HanaFlavor: 'Cloud Public',
      expectedDuration: 12
    });
    
    expect(project).to.have.property('ID');
    
    // Start wizard
    const { data: wizardStart } = await POST('/service/SolutionAdvisorSvcs/startWizard', {
      projectId: project.ID,
      ricefwId: 'I-0001-INT',
      objectType: 'Interfaces',
      objectName: 'Test Interface'
    });
    
    expect(wizardStart).to.have.property('sessionId');
    expect(wizardStart.firstQuestion).to.exist;
    
    // Submit answers (simulate full flow)
    let currentQuestion = wizardStart.firstQuestion;
    let answerResult;
    
    while (currentQuestion) {
      answerResult = await POST('/service/SolutionAdvisorSvcs/submitAnswer', {
        sessionId: wizardStart.sessionId,
        questionId: currentQuestion.questionId,
        selectedAnswer: currentQuestion.answerOptions[0].value,
        timeSpent: 30
      });
      
      if (answerResult.type === 'FINAL_RECOMMENDATION') {
        break;
      }
      
      currentQuestion = answerResult.nextQuestion;
    }
    
    expect(answerResult.type).to.equal('FINAL_RECOMMENDATION');
    expect(answerResult.finalRecommendation).to.have.property('level');
    expect(answerResult.finalRecommendation.level).to.match(/^Level [ABCD]$/);
  });
});
```

### 13.3 UI Testing (OPA5)

```javascript
// app/solutionadvisor/webapp/test/integration/WizardJourney.js
sap.ui.define([
  "sap/ui/test/opaQunit",
  "./pages/WizardPage",
  "./pages/ResultsPage"
], function (opaTest) {
  "use strict";
  
  QUnit.module("Wizard Journey");
  
  opaTest("Should start wizard and complete analysis", function (Given, When, Then) {
    // Arrange
    Given.iStartMyApp();
    
    // Act - Start wizard
    When.onTheProjectListPage.iPressOnCreateAnalysis();
    When.onTheWizardPage.iEnterRICEFWID("I-0042-TST");
    When.onTheWizardPage.iSelectObjectType("Interfaces");
    When.onTheWizardPage.iEnterObjectName("Test Interface");
    When.onTheWizardPage.iPressStart();
    
    // Assert - First question displayed
    Then.onTheWizardPage.iShouldSeeQuestion("Q1");
    Then.onTheWizardPage.iShouldSeeAnswerOptions();
    
    // Act - Answer questions
    When.onTheWizardPage.iSelectAnswer("Yes");
    When.onTheWizardPage.iPressNext();
    
    // Continue through wizard...
    
    // Assert - Final recommendation displayed
    Then.onTheResultsPage.iShouldSeeRecommendation();
    Then.onTheResultsPage.iShouldSeeScoringMetrics();
    Then.onTheResultsPage.iShouldSeeFlowchart();
    
    // Cleanup
    Then.iTeardownMyApp();
  });
});
```

### 13.4 Load Testing (k6)

```javascript
// test/load/wizard-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],     // Less than 1% failures
  },
};

const BASE_URL = 'https://your-app.cfapps.sap.hana.ondemand.com';
const AUTH_TOKEN = 'your-test-token';

export default function () {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
  
  // Start wizard
  const startPayload = JSON.stringify({
    projectId: '00000000-0000-0000-0000-000000000001',
    ricefwId: `I-${__VU}-${__ITER}`,
    objectType: 'Interfaces',
    objectName: `Load Test Interface ${__VU}-${__ITER}`
  });
  
  let res = http.post(
    `${BASE_URL}/service/SolutionAdvisorSvcs/startWizard`,
    startPayload,
    { headers }
  );
  
  check(res, {
    'wizard started': (r) => r.status === 200,
    'session ID returned': (r) => JSON.parse(r.body).sessionId !== undefined,
  });
  
  const sessionId = JSON.parse(res.body).sessionId;
  
  // Submit answer
  const answerPayload = JSON.stringify({
    sessionId: sessionId,
    questionId: 'Q1',
    selectedAnswer: 'Yes',
    timeSpent: 30
  });
  
  res = http.post(
    `${BASE_URL}/service/SolutionAdvisorSvcs/submitAnswer`,
    answerPayload,
    { headers }
  );
  
  check(res, {
    'answer submitted': (r) => r.status === 200,
  });
  
  sleep(1);
}
```

---

## 14. Deployment & Operations

### 14.1 Complete MTA Descriptor

**mta.yaml:**

```yaml
_schema-version: '3.3.0'
ID: SolutionAdvisor
description: SAP Clean Core Solution Advisor
version: 1.0.0
parameters:
  deploy_mode: html5-repo
  enable-parallel-deployments: true

build-parameters:
  before-all:
    - builder: custom
      commands:
        - npm ci
        - npm run build --prefix app/solutionadvisor

modules:
  # ============================================================================
  # CAP Service Module
  # ============================================================================
  - name: SolutionAdvisor-srv
    type: nodejs
    path: gen/srv
    parameters:
      buildpack: nodejs_buildpack
      instances: 2
      memory: 512M
      disk-quota: 1024M
    properties:
      EXIT: 1
      SAP_JWT_TRUST_ACL:
        - clientid: '*'
          identityzone: sap-provisioning
    requires:
      - name: SolutionAdvisor-auth
      - name: SolutionAdvisor-db
      - name: SolutionAdvisor-logs
      - name: SolutionAdvisor-destination
      - name: SolutionAdvisor-registry
    provides:
      - name: srv-api
        properties:
          srv-url: ${default-url}
    build-parameters:
      builder: npm-ci
      ignore:
        - default-*.json
        - .env
        - '*node_modules*'

  # ============================================================================
  # Database Deployer Module
  # ============================================================================
  - name: SolutionAdvisor-db-deployer
    type: hdb
    path: gen/db
    parameters:
      buildpack: nodejs_buildpack
      memory: 256M
      disk-quota: 1024M
    requires:
      - name: SolutionAdvisor-db
      - name: SolutionAdvisor-logs
    build-parameters:
      builder: npm-ci
      ignore:
        - node_modules/

  # ============================================================================
  # App Router Module
  # ============================================================================
  - name: SolutionAdvisor-approuter
    type: approuter.nodejs
    path: app
    parameters:
      keep-existing-routes: true
      disk-quota: 512M
      memory: 256M
      instances: 2
    properties:
      TENANT_HOST_PATTERN: '^(.*)-${space}-solutionadvisor.${default-domain}'
    requires:
      - name: SolutionAdvisor-auth
      - name: SolutionAdvisor-logs
      - name: SolutionAdvisor-destination
      - name: SolutionAdvisor-html5-repo-runtime
      - name: srv-api
        group: destinations
        properties:
          name: srv-api
          url: ~{srv-url}
          forwardAuthToken: true
          timeout: 60000
    build-parameters:
      builder: npm-ci
      ignore:
        - solutionadvisor/

  # ============================================================================
  # UI Deployer Module
  # ============================================================================
  - name: SolutionAdvisor-ui-deployer
    type: com.sap.application.content
    path: app
    requires:
      - name: SolutionAdvisor-html5-repo-host
        parameters:
          content-target: true
    build-parameters:
      build-result: gen
      requires:
        - name: solutionadvisor-ui
          artifacts:
            - './*'
          target-path: gen/

  - name: solutionadvisor-ui
    type: html5
    path: app/solutionadvisor
    build-parameters:
      builder: custom
      commands:
        - npm run build
      supported-platforms: []
      build-result: dist

  # ============================================================================
  # MTX Sidecar Module
  # ============================================================================
  - name: SolutionAdvisor-mtx
    type: nodejs
    path: mtx/sidecar
    parameters:
      memory: 256M
      disk-quota: 512M
    provides:
      - name: mtx-api
        properties:
          mtx-url: ${default-url}
    requires:
      - name: SolutionAdvisor-auth
      - name: SolutionAdvisor-db
      - name: SolutionAdvisor-registry
      - name: SolutionAdvisor-logs

resources:
  # ============================================================================
  # SAP HANA Cloud Service
  # ============================================================================
  - name: SolutionAdvisor-db
    type: com.sap.xs.hdi-container
    parameters:
      service: hana
      service-plan: hdi-shared
      config:
        schema: SOLUTIONADVISOR
    properties:
      hdi-container-name: ${service-name}

  # ============================================================================
  # XSUAA Service
  # ============================================================================
  - name: SolutionAdvisor-auth
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json
      config:
        xsappname: SolutionAdvisor-${space}
        tenant-mode: shared
        oauth2-configuration:
          redirect-uris:
            - https://*.${default-domain}/**
            - http://localhost:4004/**

  # ============================================================================
  # Destination Service
  # ============================================================================
  - name: SolutionAdvisor-destination
    type: org.cloudfoundry.managed-service
    parameters:
      service: destination
      service-plan: lite
      config:
        HTML5Runtime_enabled: true
        version: 1.0.0

  # ============================================================================
  # Application Logging Service
  # ============================================================================
  - name: SolutionAdvisor-logs
    type: org.cloudfoundry.managed-service
    parameters:
      service: application-logs
      service-plan: lite

  # ============================================================================
  # SaaS Registry Service
  # ============================================================================
  - name: SolutionAdvisor-registry
    type: org.cloudfoundry.managed-service
    parameters:
      service: saas-registry
      service-plan: application
      config:
        appName: SolutionAdvisor-${space}
        xsappname: SolutionAdvisor-${space}
        displayName: SAP Clean Core Solution Advisor
        description: Guided decision-making for SAP S/4HANA clean core implementations
        category: 'SAP S/4HANA'
        appUrls:
          getDependencies: ~{mtx-api/mtx-url}/mtx/v1/provisioning/dependencies
          onSubscription: ~{mtx-api/mtx-url}/mtx/v1/provisioning/tenant/{tenantId}
          onSubscriptionAsync: false
          callbackTimeoutMillis: 300000

  # ============================================================================
  # HTML5 Application Repository
  # ============================================================================
  - name: SolutionAdvisor-html5-repo-host
    type: org.cloudfoundry.managed-service
    parameters:
      service: html5-apps-repo
      service-plan: app-host

  - name: SolutionAdvisor-html5-repo-runtime
    type: org.cloudfoundry.managed-service
    parameters:
      service: html5-apps-repo
      service-plan: app-runtime
```

### 14.2 Environment Configuration

**manifest.yml (for local testing):**

```yaml
applications:
  - name: SolutionAdvisor-srv
    path: gen/srv
    memory: 512M
    disk_quota: 1G
    buildpacks:
      - nodejs_buildpack
    env:
      NODE_ENV: development
      LOG_LEVEL: debug
    services:
      - SolutionAdvisor-db
      - SolutionAdvisor-auth
```

**.env (local development):**

```bash
# Database
CDS_ENV=development
CDS_MULTITENANCY=false

# Authentication
CDS_REQUIRES_AUTH_KIND=dummy

# Logging
LOG_LEVEL=debug
DEBUG=*

# Server
PORT=4004

# Redis (optional for local)
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your-256-bit-key-in-hex

# Feature Flags
ENABLE_CACHING=false
ENABLE_ASYNC_JOBS=false
```

### 14.3 CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml:**

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install MBT
        run: npm install -g mbt
      
      - name: Build MTA
        run: mbt build
      
      - name: Upload MTA archive
        uses: actions/upload-artifact@v3
        with:
          name: mta-archive
          path: mta_archives/*.mtar

  deploy-dev:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/download-artifact@v3
        with:
          name: mta-archive
      
      - name: Install CF CLI
        run: |
          wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
          echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
          sudo apt-get update
          sudo apt-get install cf8-cli
      
      - name: CF Login
        run: |
          cf api ${{ secrets.CF_API_ENDPOINT }}
          cf auth ${{ secrets.CF_USER }} ${{ secrets.CF_PASSWORD }}
          cf target -o ${{ secrets.CF_ORG }} -s ${{ secrets.CF_SPACE_DEV }}
      
      - name: Deploy to DEV
        run: cf deploy *.mtar -f

  deploy-prod:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v3
        with:
          name: mta-archive
      
      - name: Install CF CLI
        run: |
          wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
          echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
          sudo apt-get update
          sudo apt-get install cf8-cli
      
      - name: CF Login
        run: |
          cf api ${{ secrets.CF_API_ENDPOINT }}
          cf auth ${{ secrets.CF_USER }} ${{ secrets.CF_PASSWORD }}
          cf target -o ${{ secrets.CF_ORG }} -s ${{ secrets.CF_SPACE_PROD }}
      
      - name: Deploy to PROD
        run: cf deploy *.mtar -f --strategy blue-green
```

### 14.4 Monitoring & Operations

**Application Logging Configuration:**

```javascript
// srv/server.js
const cds = require('@sap/cds');
const winston = require('winston');
const { LoggingService } = require('@sap-cloud-sdk/core');

// Configure structured logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // SAP Application Logging Service
    new LoggingService.createLogger()
  ]
});

// Add request logging middleware
cds.on('bootstrap', (app) => {
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: Date.now() - start,
        tenant: req.user?.tenant,
        user: req.user?.id
      });
    });
    
    next();
  });
});

module.exports = cds.server;
```

**Health Check Endpoints:**

```javascript
// srv/health.js
module.exports = (app) => {
  app.get('/health', async (req, res) => {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    try {
      // Check database
      const db = await cds.connect.to('db');
      await db.run('SELECT 1 FROM DUMMY');
      health.checks.database = { status: 'UP' };
    } catch (error) {
      health.checks.database = { status: 'DOWN', error: error.message };
      health.status = 'DOWN';
    }
    
    try {
      // Check XSUAA
      // Implementation depends on XSUAA client
      health.checks.auth = { status: 'UP' };
    } catch (error) {
      health.checks.auth = { status: 'DOWN', error: error.message };
      health.status = 'DOWN';
    }
    
    res.status(health.status === 'UP' ? 200 : 503).json(health);
  });
  
  app.get('/readiness', (req, res) => {
    res.status(200).json({ status: 'READY' });
  });
  
  app.get('/liveness', (req, res) => {
    res.status(200).json({ status: 'ALIVE' });
  });
};
```

---

## 15. Future Integration Considerations

### 15.1 API Hub Integration (Planned)

**Destination Configuration:**

```json
{
  "Name": "APIHub",
  "Type": "HTTP",
  "URL": "https://api.sap.com",
  "Authentication": "OAuth2ClientCredentials",
  "ProxyType": "Internet",
  "tokenServiceURL": "https://api.sap.com/oauth2/token",
  "clientId": "<client-id>",
  "clientSecret": "<client-secret>"
}
```

**Service Stub:**

```javascript
// srv/lib/api-hub-service.js
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

class ApiHubService {
  async searchReleasedApis(objectType, businessArea, keywords) {
    try {
      const destination = await getDestination('APIHub');
      
      const response = await executeHttpRequest(destination, {
        method: 'GET',
        url: '/v1/catalog/APIs',
        params: {
          $filter: `objectType eq '${objectType}' and contains(title, '${keywords}')`,
          $top: 10
        }
      });
      
      return response.data.value || [];
    } catch (error) {
      console.error('API Hub search failed:', error);
      return [];  // Graceful degradation
    }
  }
  
  async getApiDetails(apiId) {
    // Implementation
    return null;
  }
}

module.exports = new ApiHubService();
```

**Usage in Wizard:**

```javascript
srv.on('submitAnswer', async (req) => {
  // ... existing logic ...
  
  // After determining Level A/B, suggest available APIs
  if (finalLevel === 'Level A' || finalLevel === 'Level B') {
    const suggestedApis = await apiHubService.searchReleasedApis(
      analysis.objectType,
      projectConfig.businessArea,
      analysis.objectName
    );
    
    return {
      ...result,
      suggestedApis: suggestedApis
    };
  }
});
```

### 15.2 SCFD Registry Integration (Planned)

**Custom Fields & Logic Registry:**

```javascript
// srv/lib/scfd-service.js
class ScfdRegistryService {
  async checkRegistration(ricefwId, tenant) {
    // Check if RICEFW ID already registered in SCFD
    // Implementation depends on SCFD API availability
    return {
      isRegistered: false,
      registrationDetails: null
    };
  }
  
  async registerCustomObject(analysis, tenant) {
    // Register custom field/logic in SCFD registry
    return {
      registrationId: 'REG-' + Date.now(),
      status: 'PENDING_APPROVAL'
    };
  }
}

module.exports = new ScfdRegistryService();
```

### 15.3 SAP Build Integration (Future)

**Low-Code Extension Generation:**

```javascript
// Generate SAP Build project from analysis
async function generateBuildProject(analysisId) {
  const analysis = await SELECT.one.from('CleanCoreAnalysis').where({ ID: analysisId });
  
  // Generate Build project definition
  const buildProject = {
    name: analysis.objectName,
    type: mapObjectTypeToBuildType(analysis.objectType),
    dataModel: extractDataModel(analysis),
    ui: generateUIDefinition(analysis),
    businessLogic: generateBusinessLogic(analysis)
  };
  
  return buildProject;
}
```

---

## 16. Implementation Guidelines

### 16.1 Development Phases

**Phase 1: Foundation (Weeks 1-2)**
- [ ] Set up SAP BTP subaccount and Cloud Foundry space
- [ ] Provision HANA Cloud instance
- [ ] Configure XSUAA service
- [ ] Implement core data model (entities 1-9)
- [ ] Set up CAP project structure
- [ ] Implement basic CRUD services
- [ ] Configure multi-tenancy (CAP MTX)

**Phase 2: Wizard Core (Weeks 3-4)**
- [ ] Implement decision engine logic
- [ ] Create QuestionFlow master data
- [ ] Build wizard session management
- [ ] Implement answer submission logic
- [ ] Add save/resume functionality
- [ ] Create basic UI for wizard flow

**Phase 3: Scoring & Analytics (Week 5)**
- [ ] Implement scoring engine (3 metrics)
- [ ] Create analytics service
- [ ] Build scoring dashboard UI
- [ ] Add project-level analytics
- [ ] Implement tenant-wide dashboard

**Phase 4: Enhanced Features (Week 6)**
- [ ] Implement constraints display logic
- [ ] Create performance threshold master data
- [ ] Implement real-world examples matching
- [ ] Build examples display UI
- [ ] Add detailed hints functionality

**Phase 5: Visualization & Export (Week 7)**
- [ ] Implement flowchart generation
- [ ] Integrate D3.js for visualization
- [ ] Add export functionality (PDF/Excel)
- [ ] Create report templates
- [ ] Build analytics charts

**Phase 6: Testing & Optimization (Week 8)**
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] UI tests (OPA5)
- [ ] Load testing
- [ ] Performance optimization
- [ ] Security testing

**Phase 7: Documentation & Deployment (Week 9)**
- [ ] Complete API documentation
- [ ] User guides
- [ ] Admin guides
- [ ] Deployment runbook
- [ ] Production deployment
- [ ] User acceptance testing

**Phase 8: Go-Live & Support (Week 10)**
- [ ] Production cutover
- [ ] User training
- [ ] Monitoring setup
- [ ] Support procedures
- [ ] Post-go-live support

### 16.2 Development Best Practices

**CDS Development:**
1. Always use managed aspects (`cuid`, `managed`) for entities
2. Define associations clearly with proper cardinality
3. Use draft-enabled entities for long-running user interactions
4. Implement proper validation annotations
5. Use localized texts for multi-language support

**Service Implementation:**
1. Keep handlers small and focused (single responsibility)
2. Use service composition for complex logic
3. Implement proper error handling with custom error classes
4. Log all business-critical operations
5. Cache frequently accessed master data

**Security:**
1. Never trust client input - validate everything
2. Implement tenant isolation at all levels
3. Use parameterized queries to prevent injection
4. Encrypt sensitive data at rest
5. Implement comprehensive audit logging

**Performance:**
1. Create proper database indexes
2. Use pagination for large result sets
3. Implement caching strategically
4. Avoid N+1 query problems
5. Use asynchronous processing for heavy operations

**Testing:**
1. Write tests before implementation (TDD)
2. Aim for >80% code coverage
3. Test multi-tenant isolation thoroughly
4. Include load testing in CI/CD
5. Test upgrade scenarios

### 16.3 Code Review Checklist

**Before Committing:**
- [ ] Code follows project conventions
- [ ] All tests pass
- [ ] No console.log() statements
- [ ] Error handling implemented
- [ ] Comments added for complex logic
- [ ] No hardcoded values
- [ ] Tenant isolation enforced
- [ ] Security annotations present
- [ ] Performance considered
- [ ] Documentation updated

### 16.4 Troubleshooting Guide

**Common Issues:**

1. **Tenant context not found**
   - Verify JWT token contains tenant information
   - Check XSUAA service binding
   - Ensure CAP MTX middleware is active

2. **Database connection fails**
   - Verify HANA Cloud instance is running
   - Check service binding credentials
   - Review connection pool settings

3. **Authorization errors**
   - Verify role assignments in XSUAA
   - Check scope references in xs-security.json
   - Review @restrict annotations

4. **Performance degradation**
   - Check database indexes
   - Review slow query log
   - Verify caching is working
   - Check for N+1 query patterns

5. **Wizard navigation broken**
   - Validate QuestionFlow JSON structure
   - Check for circular navigation
   - Verify all question IDs exist

---

## Appendix A: WizardSession Entity Definition

*(Complete entity definition added in Section 7.1.9)*

Refer to **Section 7.1.9 - WizardSession Entity** for the complete CDS definition, lifecycle management, and JSON structure examples.

---

## Appendix B: Flowchart SVG Export Specification

### Overview

This appendix provides the complete specification for generating **interactive decision flowcharts** that visualize the decision path taken during wizard execution. The flowchart shows:

- **Questions asked** (decision nodes)
- **Answers selected** (edges with labels)
- **Decision path** (highlighted route from start to recommendation)
- **Final recommendation** (terminal node with clean core level)

**Export Formats Supported:**
1. **SVG** - Primary format, editable, resolution-independent, embeddable in web pages
2. **PNG** - Raster format for embedding in documents, presentations, emails
3. **PDF** - Portable format for reports, archiving, printing

---

### Data Structure

#### Node Types

```javascript
// Node types for decision flowchart
const NodeType = {
  START: 'start',           // Entry point (RICEFW object selected)
  QUESTION: 'question',     // Decision point (wizard question)
  ANSWER: 'answer',         // Answer selection (not rendered as node, but as edge label)
  RECOMMENDATION: 'recommendation'  // Terminal node (clean core level)
};

// Example node structure
const exampleNode = {
  id: 'Q1',                   // Unique identifier (matches QuestionFlow.questionId)
  type: NodeType.QUESTION,
  label: 'Is there a released API available?',
  shortLabel: 'API Available?',  // For compact visualization
  x: 100,                      // SVG coordinate (auto-calculated by layout algorithm)
  y: 50,
  isOnPath: true,             // Highlighted if part of actual decision path
  metadata: {
    questionNumber: 1,
    objectType: 'Interfaces',
    ricefwId: 'I-0042-IMP'
  }
};
```

#### Edge Structure

```javascript
// Edge (connection between nodes)
const exampleEdge = {
  id: 'E1',                   // Unique identifier
  source: 'Q1',               // Source node ID
  target: 'Q2',               // Target node ID
  label: 'Yes',               // Answer text
  isOnPath: true,             // Highlighted if part of actual decision path
  metadata: {
    answerId: 'A1-Yes',
    score: 10                 // Optional: scoring contribution
  }
};
```

#### Complete Flowchart Data Model

```javascript
// Complete flowchart data structure passed to rendering engine
const flowchartData = {
  metadata: {
    analysisId: 'a1b2c3d4-...',
    ricefwId: 'I-0042-IMP',
    objectType: 'Interfaces',
    finalLevel: 'Level A',
    createdAt: '2024-01-15T10:30:00Z',
    createdBy: 'john.doe@example.com'
  },
  nodes: [
    {
      id: 'START',
      type: NodeType.START,
      label: 'Interface: I-0042-IMP',
      x: 400,
      y: 50,
      isOnPath: true
    },
    {
      id: 'Q1',
      type: NodeType.QUESTION,
      label: 'Is there a released API available?',
      shortLabel: 'API Available?',
      x: 400,
      y: 150,
      isOnPath: true
    },
    {
      id: 'Q2',
      type: NodeType.QUESTION,
      label: 'Does the API support all required fields?',
      shortLabel: 'API Complete?',
      x: 200,
      y: 250,
      isOnPath: false  // Alternative path not taken
    },
    {
      id: 'Q3',
      type: NodeType.QUESTION,
      label: 'Is real-time integration required?',
      shortLabel: 'Real-time?',
      x: 600,
      y: 250,
      isOnPath: true
    },
    {
      id: 'REC_A',
      type: NodeType.RECOMMENDATION,
      label: 'Level A: Fully Clean Core',
      shortLabel: 'Level A',
      x: 600,
      y: 400,
      isOnPath: true,
      metadata: {
        technicalDebtScore: 5,
        cloudReadinessScore: 95,
        upgradeImpactScore: 10
      }
    }
  ],
  edges: [
    {
      id: 'E1',
      source: 'START',
      target: 'Q1',
      label: '',
      isOnPath: true
    },
    {
      id: 'E2',
      source: 'Q1',
      target: 'Q2',
      label: 'No',
      isOnPath: false
    },
    {
      id: 'E3',
      source: 'Q1',
      target: 'Q3',
      label: 'Yes',
      isOnPath: true
    },
    {
      id: 'E4',
      source: 'Q3',
      target: 'REC_A',
      label: 'Yes',
      isOnPath: true
    }
  ]
};
```

---

### SVG Generation (Primary Format)

#### D3.js Force-Directed Layout

Use D3.js force simulation for automatic node positioning (alternative to manual coordinates).

```javascript
// File: app/solutionadvisor/webapp/utils/FlowchartGenerator.js

sap.ui.define([
  'd3'  // Include D3.js library via manifest.json
], function(d3) {
  'use strict';
  
  return {
    /**
     * Generate SVG flowchart from decision path data
     * @param {Object} flowchartData - Complete flowchart data structure
     * @param {Number} width - SVG width in pixels
     * @param {Number} height - SVG height in pixels
     * @returns {String} SVG markup as string
     */
    generateSVG: function(flowchartData, width = 1200, height = 800) {
      // ========================================================================
      // STEP 1: Create SVG container
      // ========================================================================
      const svg = d3.create('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('style', 'background-color: #f5f5f5; border: 1px solid #ccc;');
      
      // Add arrow marker for edges
      svg.append('defs')
        .append('marker')
        .attr('id', 'arrowhead')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 25)  // Adjust to stop at node edge
        .attr('refY', 3)
        .attr('orient', 'auto')
        .append('polygon')
        .attr('points', '0 0, 10 3, 0 6')
        .attr('fill', '#666');
      
      // Add highlighted path marker
      svg.select('defs')
        .append('marker')
        .attr('id', 'arrowhead-highlight')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 25)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .append('polygon')
        .attr('points', '0 0, 10 3, 0 6')
        .attr('fill', '#0070f2');
      
      // ========================================================================
      // STEP 2: If coordinates not provided, calculate layout
      // ========================================================================
      if (!flowchartData.nodes[0].x) {
        this._calculateHierarchicalLayout(flowchartData, width, height);
      }
      
      // ========================================================================
      // STEP 3: Draw edges (behind nodes)
      // ========================================================================
      const edges = svg.append('g').attr('class', 'edges');
      
      flowchartData.edges.forEach(edge => {
        const sourceNode = flowchartData.nodes.find(n => n.id === edge.source);
        const targetNode = flowchartData.nodes.find(n => n.id === edge.target);
        
        const isHighlighted = edge.isOnPath;
        const strokeColor = isHighlighted ? '#0070f2' : '#999';
        const strokeWidth = isHighlighted ? 3 : 1.5;
        const markerEnd = isHighlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)';
        
        // Draw line
        edges.append('line')
          .attr('x1', sourceNode.x)
          .attr('y1', sourceNode.y + 30)  // Offset from node center
          .attr('x2', targetNode.x)
          .attr('y2', targetNode.y - 30)
          .attr('stroke', strokeColor)
          .attr('stroke-width', strokeWidth)
          .attr('marker-end', markerEnd)
          .attr('fill', 'none');
        
        // Draw edge label (answer text)
        if (edge.label) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          
          edges.append('text')
            .attr('x', midX + 10)  // Offset to avoid line overlap
            .attr('y', midY - 5)
            .attr('fill', strokeColor)
            .attr('font-size', '12px')
            .attr('font-weight', isHighlighted ? 'bold' : 'normal')
            .text(edge.label);
        }
      });
      
      // ========================================================================
      // STEP 4: Draw nodes (on top of edges)
      // ========================================================================
      const nodes = svg.append('g').attr('class', 'nodes');
      
      flowchartData.nodes.forEach(node => {
        const nodeGroup = nodes.append('g')
          .attr('transform', `translate(${node.x}, ${node.y})`);
        
        // Node styling based on type and path status
        let fillColor, strokeColor, strokeWidth, shape;
        
        if (node.type === NodeType.START) {
          fillColor = '#e0f2f7';
          strokeColor = '#0070f2';
          strokeWidth = 2;
          shape = 'ellipse';
        } else if (node.type === NodeType.RECOMMENDATION) {
          // Color-code by clean core level
          const levelColors = {
            'Level A': '#2da02d',  // Green
            'Level B': '#ff9800',  // Orange
            'Level C': '#ff5722',  // Red-Orange
            'Level D': '#d32f2f'   // Red
          };
          fillColor = levelColors[node.label.split(':')[0]] || '#666';
          strokeColor = '#333';
          strokeWidth = 3;
          shape = 'rect';
        } else {
          fillColor = node.isOnPath ? '#e3f2fd' : '#f5f5f5';
          strokeColor = node.isOnPath ? '#0070f2' : '#999';
          strokeWidth = node.isOnPath ? 2 : 1;
          shape = 'rect';
        }
        
        // Draw shape
        if (shape === 'ellipse') {
          nodeGroup.append('ellipse')
            .attr('rx', 80)
            .attr('ry', 30)
            .attr('fill', fillColor)
            .attr('stroke', strokeColor)
            .attr('stroke-width', strokeWidth);
        } else {
          nodeGroup.append('rect')
            .attr('x', -100)
            .attr('y', -30)
            .attr('width', 200)
            .attr('height', 60)
            .attr('rx', 5)
            .attr('fill', fillColor)
            .attr('stroke', strokeColor)
            .attr('stroke-width', strokeWidth);
        }
        
        // Draw label (text wrapping for long labels)
        const label = node.shortLabel || node.label;
        this._addWrappedText(nodeGroup, label, 0, 0, 180, 12);
      });
      
      // ========================================================================
      // STEP 5: Add metadata footer
      // ========================================================================
      svg.append('text')
        .attr('x', 10)
        .attr('y', height - 20)
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(`Analysis ID: ${flowchartData.metadata.analysisId} | RICEFW: ${flowchartData.metadata.ricefwId} | Generated: ${new Date().toISOString()}`);
      
      // ========================================================================
      // STEP 6: Return SVG as string
      // ========================================================================
      return svg.node().outerHTML;
    },
    
    /**
     * Calculate hierarchical layout (top-to-bottom tree)
     * @private
     */
    _calculateHierarchicalLayout: function(flowchartData, width, height) {
      // Simple hierarchical layout: assign levels based on distance from START
      const levels = {};
      const visited = new Set();
      
      // BFS to assign levels
      const queue = [{ nodeId: 'START', level: 0 }];
      while (queue.length > 0) {
        const { nodeId, level } = queue.shift();
        if (visited.has(nodeId)) continue;
        
        visited.add(nodeId);
        if (!levels[level]) levels[level] = [];
        levels[level].push(nodeId);
        
        // Find outgoing edges
        const outgoingEdges = flowchartData.edges.filter(e => e.source === nodeId);
        outgoingEdges.forEach(edge => {
          queue.push({ nodeId: edge.target, level: level + 1 });
        });
      }
      
      // Assign coordinates
      const levelHeight = height / (Object.keys(levels).length + 1);
      Object.keys(levels).forEach(level => {
        const nodesAtLevel = levels[level];
        const levelWidth = width / (nodesAtLevel.length + 1);
        
        nodesAtLevel.forEach((nodeId, index) => {
          const node = flowchartData.nodes.find(n => n.id === nodeId);
          node.x = levelWidth * (index + 1);
          node.y = levelHeight * (parseInt(level) + 1);
        });
      });
    },
    
    /**
     * Add text with word wrapping
     * @private
     */
    _addWrappedText: function(container, text, x, y, maxWidth, fontSize) {
      const words = text.split(' ');
      let line = '';
      let lineNumber = 0;
      const lineHeight = fontSize + 2;
      
      words.forEach(word => {
        const testLine = line + word + ' ';
        const testWidth = testLine.length * (fontSize * 0.6);  // Rough estimate
        
        if (testWidth > maxWidth && line !== '') {
          container.append('text')
            .attr('x', x)
            .attr('y', y + lineNumber * lineHeight)
            .attr('text-anchor', 'middle')
            .attr('font-size', `${fontSize}px`)
            .text(line.trim());
          
          line = word + ' ';
          lineNumber++;
        } else {
          line = testLine;
        }
      });
      
      // Last line
      container.append('text')
        .attr('x', x)
        .attr('y', y + lineNumber * lineHeight)
        .attr('text-anchor', 'middle')
        .attr('font-size', `${fontSize}px`)
        .text(line.trim());
    }
  };
});
```

---

### PNG Export (Canvas Conversion)

Convert SVG to PNG using HTML5 Canvas API.

```javascript
// File: app/solutionadvisor/webapp/utils/FlowchartGenerator.js (continued)

/**
 * Convert SVG string to PNG blob
 * @param {String} svgString - SVG markup
 * @param {Number} scale - Resolution multiplier (2 = 2x resolution)
 * @returns {Promise<Blob>} PNG image blob
 */
convertToPNG: function(svgString, scale = 2) {
  return new Promise((resolve, reject) => {
    // Step 1: Create image from SVG
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = function() {
      // Step 2: Create canvas with scaled dimensions
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      
      // Step 3: Draw image on canvas
      ctx.drawImage(img, 0, 0);
      
      // Step 4: Convert canvas to PNG blob
      canvas.toBlob(function(blob) {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/png');
    };
    
    img.onerror = function(error) {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to convert SVG to PNG: ' + error));
    };
    
    img.src = url;
  });
},
```

---

### PDF Export (jsPDF)

Generate PDF with embedded SVG/PNG using jsPDF library.

```javascript
// File: app/solutionadvisor/webapp/utils/FlowchartGenerator.js (continued)

/**
 * Generate PDF document with flowchart
 * @param {String} svgString - SVG markup
 * @param {Object} metadata - Analysis metadata for PDF header
 * @returns {Promise<Blob>} PDF document blob
 */
exportToPDF: async function(svgString, metadata) {
  const { jsPDF } = window.jspdf;  // Include jsPDF via manifest.json
  
  // Step 1: Convert SVG to PNG first (jsPDF handles PNG better than SVG)
  const pngBlob = await this.convertToPNG(svgString, 2);
  const pngDataUrl = await this._blobToDataURL(pngBlob);
  
  // Step 2: Create PDF document (A4 landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Step 3: Add header
  doc.setFontSize(16);
  doc.text('SAP Clean Core Solution Advisor - Decision Flowchart', 15, 15);
  
  doc.setFontSize(10);
  doc.text(`RICEFW ID: ${metadata.ricefwId}`, 15, 22);
  doc.text(`Object Type: ${metadata.objectType}`, 15, 27);
  doc.text(`Recommendation: ${metadata.finalLevel}`, 15, 32);
  doc.text(`Generated: ${new Date(metadata.createdAt).toLocaleString()}`, 15, 37);
  
  // Step 4: Add flowchart image
  // A4 landscape: 297mm x 210mm, leave 15mm margins
  const imgWidth = 267;  // 297 - 30mm margins
  const imgHeight = 140;  // Maintain aspect ratio
  doc.addImage(pngDataUrl, 'PNG', 15, 45, imgWidth, imgHeight);
  
  // Step 5: Add footer
  doc.setFontSize(8);
  doc.text(`Analysis ID: ${metadata.analysisId}`, 15, 200);
  doc.text(`Page 1 of 1`, 270, 200);
  
  // Step 6: Return PDF blob
  return doc.output('blob');
},

/**
 * Convert blob to data URL for jsPDF
 * @private
 */
_blobToDataURL: function(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

---

### Controller Integration

Example controller method to trigger export.

```javascript
// File: app/solutionadvisor/webapp/controller/AnalysisDetail.controller.js

onExportFlowchart: async function(oEvent) {
  const exportFormat = oEvent.getSource().data('format');  // 'svg', 'png', or 'pdf'
  const analysisId = this.getView().getBindingContext().getProperty('ID');
  
  // Step 1: Fetch flowchart data from backend
  const response = await fetch(`/service/SolutionAdvisorSvcs/getDecisionFlowchart(analysisId='${analysisId}')`);
  const flowchartData = await response.json();
  
  // Step 2: Generate SVG
  const FlowchartGenerator = sap.ui.require('sd/solutionadvisor/utils/FlowchartGenerator');
  const svgString = FlowchartGenerator.generateSVG(flowchartData.value);
  
  // Step 3: Export based on selected format
  let blob, filename;
  
  if (exportFormat === 'svg') {
    blob = new Blob([svgString], { type: 'image/svg+xml' });
    filename = `flowchart-${flowchartData.value.metadata.ricefwId}.svg`;
  } else if (exportFormat === 'png') {
    blob = await FlowchartGenerator.convertToPNG(svgString);
    filename = `flowchart-${flowchartData.value.metadata.ricefwId}.png`;
  } else if (exportFormat === 'pdf') {
    blob = await FlowchartGenerator.exportToPDF(svgString, flowchartData.value.metadata);
    filename = `flowchart-${flowchartData.value.metadata.ricefwId}.pdf`;
  }
  
  // Step 4: Trigger browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  
  sap.m.MessageToast.show(`Flowchart exported as ${exportFormat.toUpperCase()}`);
}
```

---

### Dependencies (manifest.json)

Include required libraries in UI5 application.

```json
{
  "sap.ui5": {
    "resources": {
      "js": [
        {
          "uri": "https://d3js.org/d3.v7.min.js"
        },
        {
          "uri": "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        }
      ]
    }
  }
}
```

---

### What Does This Mean? (High-Schooler Explanation)

**Analogy: Drawing a Treasure Map**

Imagine you're drawing a treasure map showing the path you took through a maze:

1. **SVG = Interactive Digital Map**
   - Like drawing with a vector graphics program (can zoom infinitely without blur)
   - Editable in tools like Inkscape or Adobe Illustrator
   - Embeddable in websites (users can click nodes for details)

2. **PNG = Snapshot Photo**
   - Like taking a picture of your map
   - Easy to share in emails or PowerPoint
   - Can't edit or zoom without losing quality

3. **PDF = Printed Report**
   - Like printing your map with a title page and footer
   - Professional format for archiving or sharing with executives
   - Can be printed on paper without quality loss

**How It Works:**
1. You answer questions in the wizard (picking left/right turns in the maze)
2. The system tracks your path (breadcrumbs)
3. When done, it draws a flowchart showing:
   - Questions = decision points (forks in the road)
   - Your answers = arrows with labels ("Turned left", "Went straight")
   - Final recommendation = treasure chest (Clean Core Level A/B/C/D)
4. Export button lets you download this map in SVG/PNG/PDF format

---

### Testing Checklist

- [ ] SVG renders correctly in all major browsers (Chrome, Firefox, Safari, Edge)
- [ ] Node text wraps properly for long question labels
- [ ] Highlighted path (blue) is clearly visible
- [ ] PNG export maintains resolution at 2x scale
- [ ] PDF includes metadata header and footer
- [ ] Export works for complex flowcharts (20+ nodes, 30+ edges)
- [ ] File download triggers without errors
- [ ] Generated files open correctly in standard viewers (Inkscape, Preview, Adobe Reader)

---

## Appendix C: Master Data Seed CSV Templates

### Overview

This appendix provides **CSV templates** for seeding master data entities during initial deployment or tenant provisioning. These templates ensure consistent data structure and provide sample data for testing.

**Master Data Entities Requiring Seed Data:**
1. **CleanCoreLevels** - 4 levels (A/B/C/D)
2. **ObjectTypes** - 6 RICEFW types (R/I/C/E/F/W)
3. **QuestionFlow** - Decision tree questions (100+ entries per object type)
4. **PerformanceThreshold** - Performance constraints and limitations
5. **RealWorldExample** - Contextual examples and use cases

---

### 1. CleanCoreLevels.csv

**Purpose:** Define the 4 clean core maturity levels with scoring multipliers.

**Column Definitions:**

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| level | String(10) | Yes | Level identifier (Level A, Level B, Level C, Level D) |
| levelName | String(100) | Yes | Descriptive name |
| description | String(500) | Yes | Full description of what this level means |
| upgradeComplexity | String(20) | Yes | None, Low, Medium, High, Very High |
| maintenanceEffort | String(20) | Yes | Low, Medium, High, Very High |
| businessFlexibility | String(20) | Yes | High, Medium, Low |
| technicalRisk | String(20) | Yes | Low, Medium, High, Critical |
| cloudReadiness | String(50) | Yes | Cloud Ready, Partially, Limited, Not Ready |
| technicalDebtMultiplier | Decimal(3,2) | Yes | 0.00 to 5.00 (used in scoring) |
| cloudReadinessFactor | Decimal(3,2) | Yes | 0.00 to 1.00 (used in scoring) |
| upgradeImpactMultiplier | Decimal(3,2) | Yes | 0.00 to 5.00 (used in scoring) |
| isActive | Boolean | Yes | true/false |
| displayOrder | Integer | Yes | Display sequence (1-4) |

**Sample Data:**

```csv
level,levelName,description,upgradeComplexity,maintenanceEffort,businessFlexibility,technicalRisk,cloudReadiness,technicalDebtMultiplier,cloudReadinessFactor,upgradeImpactMultiplier,isActive,displayOrder
Level A,Fully Clean Core,"Standard SAP functionality without modifications. Uses released APIs, standard Fiori apps, and embedded analytics.",None,Low,High,Low,Cloud Ready,0.00,1.00,0.00,true,1
Level B,Enhanced Clean Core,"Side-by-side extensions on SAP BTP. Custom applications using released APIs, event-driven integrations, and SAP Build apps.",Low,Medium,Medium,Medium,Partially,1.00,0.50,1.00,true,2
Level C,Compliant Modifications,"Custom ABAP development with upgrade compatibility. Follows SAP development guidelines, uses enhancement points, and avoids core modifications.",Medium,High,Medium,High,Limited,3.00,0.20,3.00,true,3
Level D,Not Recommended,"Core modifications, custom code in standard objects, modifications to SAP-delivered programs. High technical debt and upgrade risk.",Very High,Very High,Low,Critical,Not Ready,5.00,0.00,5.00,true,4
```

---

### 2. ObjectTypes.csv

**Purpose:** Define the 6 RICEFW object types with complexity and average analysis time.

**Column Definitions:**

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| objectType | String(50) | Yes | Full name (Reports, Interfaces, Conversions, Enhancements, Forms, Workflows) |
| objectCode | String(1) | Yes | RICEFW code (R, I, C, E, F, W) |
| displayName | String(100) | Yes | User-friendly name |
| description | String(500) | Yes | What this object type represents |
| iconName | String(100) | Yes | SAP icon name (sap-icon://...) |
| complexity | String(20) | Yes | Low, Moderate, High |
| avgAnalysisTime | Integer | Yes | Average minutes to complete wizard |
| questionCount | Integer | No | Typical number of questions in decision tree |
| isActive | Boolean | Yes | true/false |

**Sample Data:**

```csv
objectType,objectCode,displayName,description,iconName,complexity,avgAnalysisTime,questionCount,isActive
Reports,R,Reports & Analytics,"Analytical and operational reporting solutions including custom reports, dashboards, and data extracts.",sap-icon://business-objects-experience,Moderate,15,7,true
Interfaces,I,Interfaces & Integration,"System integration patterns including APIs, IDocs, file transfers, and real-time event-driven integrations.",sap-icon://connected,High,25,12,true
Conversions,C,Data Conversions & Migration,"Data migration and transformation approaches including one-time loads, delta loads, and legacy data conversion.",sap-icon://data-mapping,High,30,10,true
Enhancements,E,Enhancements & Extensions,"Functional and technical extensions including user exits, BADIs, implicit enhancements, and business logic modifications.",sap-icon://add-product,Moderate,20,8,true
Forms,F,Forms & Output Management,"Document generation and output management including invoices, purchase orders, shipping documents, and Adobe Forms.",sap-icon://document,Low,15,6,true
Workflows,W,Workflows & Business Processes,"Business process automation patterns including approval workflows, notifications, and process orchestration.",sap-icon://workflow-tasks,Moderate,20,9,true
```

---

### 3. QuestionFlow.csv (Sample - Interfaces)

**Purpose:** Define decision tree questions with navigation logic (JSON format).

**Column Definitions:**

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| questionId | String(10) | Yes | Unique identifier (format: Q1, Q2, etc.) |
| objectType | String(50) | Yes | Must match ObjectTypes.objectType |
| questionNumber | Integer | Yes | Sequence number (1-based) |
| questionText | String(500) | Yes | Question displayed to user |
| detailedHint | String(2000) | No | Extended help text with examples |
| answerOptions | String(5000) | Yes | JSON array of answer objects |
| navigationLogic | String(5000) | Yes | JSON object mapping answers to next questions |
| impactsScore | Boolean | Yes | true if answer affects scoring |
| isActive | Boolean | Yes | true/false |

**Sample Data (Interfaces - First 3 Questions):**

```csv
questionId,objectType,questionNumber,questionText,detailedHint,answerOptions,navigationLogic,impactsScore,isActive
Q1,Interfaces,1,Is there a released SAP API available for this integration requirement?,"Released APIs are officially supported by SAP and documented in the API Business Hub. These APIs are stable, upgrade-safe, and recommended for clean core. Examples: Business Partner API (A2X), Sales Order API (A2X), Material Stock API.","[{""id"":""A1-Yes"",""text"":""Yes, a released API covers all requirements"",""iconName"":""sap-icon://accept""},{""id"":""A1-Partial"",""text"":""Partially - some fields missing"",""iconName"":""sap-icon://warning""},{""id"":""A1-No"",""text"":""No released API available"",""iconName"":""sap-icon://decline""}]","{""A1-Yes"":{""nextQuestion"":""Q2"",""finalAnswer"":null},""A1-Partial"":{""nextQuestion"":""Q3"",""finalAnswer"":null},""A1-No"":{""nextQuestion"":""Q4"",""finalAnswer"":null}}",true,true
Q2,Interfaces,2,What is the integration pattern required?,"Real-time patterns (synchronous) are best for user-facing transactions. Batch patterns (asynchronous) are suitable for large volumes processed overnight. Event-driven patterns are ideal for decoupled systems reacting to business events.","[{""id"":""A2-Realtime"",""text"":""Real-time (< 5 seconds response)"",""iconName"":""sap-icon://accelerated""},{""id"":""A2-NearRealtime"",""text"":""Near real-time (5-30 seconds)"",""iconName"":""sap-icon://time-entry-request""},{""id"":""A2-Batch"",""text"":""Batch processing (scheduled)"",""iconName"":""sap-icon://batch-processing""},{""id"":""A2-Event"",""text"":""Event-driven (asynchronous)"",""iconName"":""sap-icon://activity-assigned-to-goal""}]","{""A2-Realtime"":{""nextQuestion"":null,""finalAnswer"":""Level A - Use OData API with synchronous calls""},""A2-NearRealtime"":{""nextQuestion"":null,""finalAnswer"":""Level A - Use OData API or Enterprise Event Enablement""},""A2-Batch"":{""nextQuestion"":null,""finalAnswer"":""Level A - Use batch API calls or SAP Integration Suite""},""A2-Event"":{""nextQuestion"":null,""finalAnswer"":""Level A - Use Enterprise Event Enablement or SAP Event Mesh""}}",true,true
Q3,Interfaces,3,Are the missing fields critical business requirements?,"Critical fields are those that directly impact business processes or regulatory compliance. Non-critical fields can often be derived, calculated, or sourced from alternative data sources.","[{""id"":""A3-Critical"",""text"":""Yes, critical for business process"",""iconName"":""sap-icon://warning""},{""id"":""A3-NonCritical"",""text"":""No, can be derived or omitted"",""iconName"":""sap-icon://accept""}]","{""A3-Critical"":{""nextQuestion"":""Q5"",""finalAnswer"":null},""A3-NonCritical"":{""nextQuestion"":""Q2"",""finalAnswer"":null}}",true,true
```

**Note:** Complete decision trees for all 6 RICEFW types should contain 50-100 questions each. This sample shows the structure and first 3 questions for Interfaces.

---

### 4. PerformanceThreshold.csv

**Purpose:** Define performance constraints and technical limitations for different methods.

**Column Definitions:**

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| category | String(50) | Yes | Category (Integration, Reporting, Conversion, Enhancement, Form, Workflow) |
| method | String(200) | Yes | Specific method or technology |
| volumeLimit | Integer | No | Maximum records/transactions per execution |
| sizeThreshold | String(50) | No | Maximum data size (e.g., "35MB", "500MB") |
| frequencyLimit | String(100) | No | Maximum frequency (e.g., "Real-time", "Daily") |
| responseTimeTarget | Integer | No | Target response time in milliseconds |
| concurrencyLimit | Integer | No | Maximum concurrent users/connections |
| cleanCoreLevel | String(10) | Yes | Applicable clean core level |
| whenExceeded | String(500) | Yes | What happens when limit is exceeded |
| alternativeSolution | String(500) | Yes | Recommended alternative |
| applicableObjectTypes | String(50) | Yes | Comma-separated RICEFW codes (e.g., "I,C") |
| isActive | Boolean | Yes | true/false |

**Sample Data:**

```csv
category,method,volumeLimit,sizeThreshold,frequencyLimit,responseTimeTarget,concurrencyLimit,cleanCoreLevel,whenExceeded,alternativeSolution,applicableObjectTypes,isActive
Integration,OData API (Released),5000,35MB,Real-time (<5 seconds),5000,100,Level A,Performance degrades; timeouts possible,Use batch processing or event-driven architecture with Enterprise Event Enablement,I,true
Integration,Enhanced IDOC via CPI,100000,500MB,Batch (Daily/Weekly),,,Level B,System slowdown; processing delays,Split into multiple batches or use SAP Data Services for very large volumes,I,C,true
Reporting,Embedded Analytics (CDS Views),100000,5MB,Real-time,5000,500,Level A,Slow query performance; UI freezes,Use SAP Analytics Cloud for larger datasets; implement data aggregation or archiving,R,true
Reporting,Custom ABAP Report,50000,50MB,On-demand,30000,20,Level C,Long execution times; system resource contention,Redesign as CDS view or migrate to SAP Analytics Cloud; add background job option,R,true
Conversion,Direct HANA SQL Load,10000000,10GB,One-time,,,Level B,Database locks; log file overflow,Use SAP Data Services with parallel processing; implement incremental loads,C,true
Enhancement,User Exit / BADI,,,Per Transaction,100,1000,Level C,Performance impact on standard transactions,Redesign as side-by-side extension using OData events; evaluate SAP Build Apps,E,true
Form,Adobe Forms (Interactive),1000,10MB,Real-time,3000,50,Level C,PDF generation delays; memory issues,Migrate to SAP Forms by Adobe (cloud) or use standard SAP output management,F,true
Workflow,Custom ABAP Workflow,5000,5MB,Event-triggered,5000,100,Level C,Workflow queue backlog; delayed approvals,Migrate to SAP Build Process Automation; use standard S/4HANA workflows where possible,W,true
```

---

### 5. RealWorldExample.csv

**Purpose:** Provide contextual real-world scenarios for each RICEFW type and clean core level.

**Column Definitions:**

| Column Name | Data Type | Required | Description |
|-------------|-----------|----------|-------------|
| title | String(200) | Yes | Example title |
| objectType | String(50) | Yes | RICEFW type |
| cleanCoreLevel | String(10) | Yes | Level A/B/C/D |
| industry | String(100) | No | Industry (Retail, Manufacturing, etc.) |
| scenario | String(500) | Yes | Business scenario description |
| challengeDescription | String(1000) | Yes | What was the challenge? |
| solutionDescription | String(1000) | Yes | How was it solved? |
| solutionSummary | String(500) | Yes | Brief summary |
| technologiesUsed | String(5000) | Yes | JSON array of technologies |
| volumeHandled | String(200) | No | Data volume metrics |
| performanceAchieved | String(200) | No | Performance metrics |
| implementationTime | String(50) | No | Time to implement |
| lessonsLearned | String(1000) | No | Key lessons |
| keywords | String(500) | Yes | Search keywords (space-separated) |
| isActive | Boolean | Yes | true/false |
| isApproved | Boolean | Yes | true/false |

**Sample Data:**

```csv
title,objectType,cleanCoreLevel,industry,scenario,challengeDescription,solutionDescription,solutionSummary,technologiesUsed,volumeHandled,performanceAchieved,implementationTime,lessonsLearned,keywords,isActive,isApproved
E-commerce Order Integration,Interfaces,Level A,Retail,Real-time order synchronization between e-commerce platform and S/4HANA,"Process 10,000 daily orders with <2 second response time requirement. Peak loads during promotional events (5x normal volume).","Implemented event-driven integration using SAP Event Mesh with released OData APIs for Sales Order creation. Used Enterprise Event Enablement for inventory updates.","Used released OData APIs with Enterprise Event Enablement for event-driven architecture.","[""OData V4 APIs"",""SAP Event Mesh"",""SAP Integration Suite"",""Enterprise Event Enablement""]","10,000 orders/day (peak: 50,000)","<1 second event delivery, 99.9% success rate",6 weeks,"Event-driven architecture scales better than polling. Implement retry logic and dead-letter queue for failed events. Monitor event mesh metrics closely.",real-time integration event-driven retail orders e-commerce,true,true
Financial Reporting Dashboard,Reports,Level A,Financial Services,Executive dashboard for P&L reporting with drill-down capabilities,"Display 50K+ transactions aggregated by various dimensions (cost center, GL account, time periods) with sub-3 second load time.","Used standard Fiori analytical apps with custom CDS views leveraging HANA calculation engine. Implemented KPI tiles with real-time calculations.","Embedded Analytics with CDS views and Fiori analytical apps - no custom ABAP code.","[""CDS Views"",""Fiori Analytical Apps"",""KPI Framework"",""HANA Calculation Views""]","50,000 transactions/month","<3 seconds load time for aggregated views",4 weeks,"Proper CDS view design with aggregations is critical. Use delta mechanisms for large datasets. Test with production-like data volumes early.",reporting analytics financial dashboard P&L,true,true
Customer Master Migration,Conversions,Level B,Manufacturing,One-time migration of 500K customer records from legacy CRM to S/4HANA,"Complex customer hierarchies, multiple addresses, contact persons, and custom fields. Data quality issues in legacy system.","Used SAP Integration Suite with Cloud Integration flows. Implemented data validation, cleansing, and transformation rules. Multi-pass approach: validate, transform, load with rollback capability.","SAP Integration Suite with data transformation and validation; standard Business Partner API for loading.","[""SAP Integration Suite"",""Cloud Integration"",""Business Partner API (A2X)"",""SAP Data Services""]","500,000 customer records","95% success rate first pass, 99.8% after corrections",8 weeks,"Invest heavily in data quality analysis upfront. Implement comprehensive validation rules. Plan for iterative corrections. Use sandbox for dry runs.",conversion migration data-quality customer-master legacy,true,true
Price Calculation Enhancement,Enhancements,Level C,Retail,Custom pricing logic for volume-based discounts with complex tier structures,"Standard SAP pricing couldn't handle multi-dimensional tiering (volume + customer segment + product category). Needed real-time calculation during order entry.","Implemented pricing BADI using enhancement framework. Developed pricing calculation class with comprehensive unit tests. Ensured upgrade compatibility.","Custom BADI implementation following SAP development guidelines with upgrade-safe design.","[""Pricing BADI"",""Enhancement Framework"",""ABAP Unit Tests"",""Transport Management""]","1,000 orders/day with pricing calculation","<200ms calculation time per order line item",10 weeks,"Document BADI logic extensively. Write comprehensive unit tests. Avoid modifying standard pricing tables directly. Consider migrating to SAP CPQ if complexity grows.",enhancement pricing BADI custom-logic volume-discount,true,true
Invoice Output with Barcode,Forms,Level C,Logistics,Custom invoice form with QR code for payment and barcode for warehouse scanning,"Standard SAP invoice form didn't support QR codes or barcodes. Required for automated payment processing and warehouse tracking.","Enhanced standard Adobe Form using form modification (not copy). Added QR code generator using Adobe Designer. Integrated with standard output management.","Enhanced standard Adobe Form with QR code and barcode generation using form modification approach.","[""Adobe Forms"",""Form Enhancement"",""Output Management"",""Barcode Library""]","5,000 invoices/day","<2 seconds per invoice generation",6 weeks,"Use form enhancement rather than copying. Leverage Adobe Designer's built-in barcode capabilities. Test printing on target printers early. Plan migration to SAP Forms by Adobe (cloud).",forms output-management invoice barcode QR-code Adobe,true,true
```

---

### CSV Import Script

**Purpose:** Backend script to import CSV files during deployment or tenant provisioning.

```javascript
// srv/lib/seed-master-data.js

const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * Import master data from CSV files
   * @param {String} tenant - Tenant ID (for multi-tenant scenarios)
   */
  async importFromCSV(tenant) {
    const db = await cds.connect.to('db');
    const tx = db.tx({ tenant });
    
    console.log(`[SEED] Starting CSV import for tenant: ${tenant}`);
    
    // Import order: dependencies first
    await this._importCleanCoreLevels(tx);
    await this._importObjectTypes(tx);
    await this._importPerformanceThresholds(tx);
    await this._importRealWorldExamples(tx);
    await this._importQuestionFlows(tx);  // Last: depends on ObjectTypes
    
    console.log(`[SEED] CSV import completed for tenant: ${tenant}`);
  },
  
  async _importCleanCoreLevels(tx) {
    const filePath = path.join(__dirname, '../../db/seed/CleanCoreLevels.csv');
    const records = await this._parseCSV(filePath);
    
    await tx.run(DELETE.from('sd.CleanCoreLevels'));  // Clear existing
    await tx.run(INSERT.into('sd.CleanCoreLevels').entries(records));
    
    console.log(`[SEED] Imported ${records.length} CleanCoreLevels`);
  },
  
  async _importObjectTypes(tx) {
    const filePath = path.join(__dirname, '../../db/seed/ObjectTypes.csv');
    const records = await this._parseCSV(filePath);
    
    await tx.run(DELETE.from('sd.ObjectTypes'));
    await tx.run(INSERT.into('sd.ObjectTypes').entries(records));
    
    console.log(`[SEED] Imported ${records.length} ObjectTypes`);
  },
  
  async _importPerformanceThresholds(tx) {
    const filePath = path.join(__dirname, '../../db/seed/PerformanceThreshold.csv');
    const records = await this._parseCSV(filePath);
    
    await tx.run(DELETE.from('sd.PerformanceThreshold'));
    await tx.run(INSERT.into('sd.PerformanceThreshold').entries(records));
    
    console.log(`[SEED] Imported ${records.length} PerformanceThresholds`);
  },
  
  async _importRealWorldExamples(tx) {
    const filePath = path.join(__dirname, '../../db/seed/RealWorldExample.csv');
    const records = await this._parseCSV(filePath);
    
    // Parse JSON fields
    records.forEach(record => {
      if (record.technologiesUsed) {
        record.technologiesUsed = JSON.parse(record.technologiesUsed);
      }
    });
    
    await tx.run(DELETE.from('sd.RealWorldExample'));
    await tx.run(INSERT.into('sd.RealWorldExample').entries(records));
    
    console.log(`[SEED] Imported ${records.length} RealWorldExamples`);
  },
  
  async _importQuestionFlows(tx) {
    // Import all RICEFW question flows
    const ricefw = ['Reports', 'Interfaces', 'Conversions', 'Enhancements', 'Forms', 'Workflows'];
    let totalImported = 0;
    
    for (const objectType of ricefw) {
      const filePath = path.join(__dirname, `../../db/seed/QuestionFlow_${objectType}.csv`);
      
      if (fs.existsSync(filePath)) {
        const records = await this._parseCSV(filePath);
        
        // Parse JSON fields
        records.forEach(record => {
          if (record.answerOptions) {
            record.answerOptions = JSON.parse(record.answerOptions);
          }
          if (record.navigationLogic) {
            record.navigationLogic = JSON.parse(record.navigationLogic);
          }
        });
        
        await tx.run(INSERT.into('sd.QuestionFlow').entries(records));
        totalImported += records.length;
        console.log(`[SEED] Imported ${records.length} questions for ${objectType}`);
      }
    }
    
    console.log(`[SEED] Total QuestionFlows imported: ${totalImported}`);
  },
  
  /**
   * Parse CSV file into array of objects
   * @private
   */
  _parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
};
```

---

### What Does This Mean? (High-Schooler Explanation)

**Analogy: Setting Up a Game Board**

Imagine you're setting up a board game before playing:

1. **CSV Files = Game Setup Cards**
   - Each CSV file is like a deck of cards with setup instructions
   - CleanCoreLevels.csv = "Level definition cards" (Easy/Medium/Hard/Expert)
   - ObjectTypes.csv = "Character cards" (Wizard, Warrior, Archer, etc.)
   - QuestionFlow.csv = "Quest cards" (decisions you'll make during the game)

2. **Why CSV Format?**
   - Easy to edit in Excel or Google Sheets (non-developers can update)
   - Version control friendly (can see what changed between versions)
   - Bulk import (load 1000 questions faster than entering manually)

3. **Import Process:**
   - Place CSV files in `db/seed/` folder
   - Run import script during deployment
   - Data loads into database tables automatically
   - Each tenant (customer) gets their own copy (Option 2 multi-tenancy)

4. **When to Use:**
   - Initial deployment (populate empty database)
   - Tenant provisioning (new customer signs up)
   - Data updates (add new questions, fix thresholds)
   - Testing (reset to clean state)

---

### Validation Rules

**Before importing CSV files, validate:**

- [ ] All required columns present
- [ ] No duplicate IDs (questionId, level, objectCode)
- [ ] JSON fields properly formatted (use JSON validator)
- [ ] Foreign key references valid (objectType exists in ObjectTypes)
- [ ] Boolean fields = "true" or "false" (case-sensitive)
- [ ] Numeric fields within ranges (e.g., technicalDebtMultiplier 0.00-5.00)
- [ ] File encoding = UTF-8 (to support international characters)
- [ ] Line endings consistent (LF or CRLF, not mixed)

---

## Appendix D: Multi-tenancy Deep Dive

### Overview

This appendix provides a **beginner-friendly explanation** of multi-tenancy in SAP CAP applications, explaining how multiple customers (tenants) can use the same application instance while keeping their data completely isolated.

---

### What is Multi-Tenancy?

**Analogy: Apartment Building**

Imagine an apartment building:
- **Building = Application** (one instance of the software running)
- **Apartments = Tenants** (different customers using the application)
- **Each apartment has:**
  - Separate key (authentication)
  - Own furniture (data)
  - Own mailbox (isolated storage)
  - Shared utilities (common application code)

**Multi-tenancy = Multiple customers sharing the same application but with isolated data**

---

### Option 1 vs Option 2: Which Model Did We Choose?

#### Option 1: Shared Master Data (NOT SELECTED)

```
Database
├── Tenant_ABC_DATA (schema)
│   ├── ProjectConfiguration (tenant-specific)
│   └── CleanCoreAnalysis (tenant-specific)
└── SHARED_DATA (schema)
    ├── CleanCoreLevels (shared by all)
    ├── ObjectTypes (shared by all)
    └── QuestionFlow (shared by all)
```

**Pros:**
- Single source of truth for master data
- Easy to update all tenants simultaneously
- Less storage space

**Cons:**
- Tenants can't customize decision trees
- One mistake affects everyone
- Harder to comply with data residency laws

---

#### Option 2: Per-Tenant Master Data (SELECTED ✅)

```
Database
├── Tenant_ABC_DATA (schema)
│   ├── ProjectConfiguration (isolated)
│   ├── CleanCoreAnalysis (isolated)
│   ├── CleanCoreLevels (ABC's copy)
│   ├── ObjectTypes (ABC's copy)
│   └── QuestionFlow (ABC's copy)
└── Tenant_XYZ_DATA (schema)
    ├── ProjectConfiguration (isolated)
    ├── CleanCoreAnalysis (isolated)
    ├── CleanCoreLevels (XYZ's copy)
    ├── ObjectTypes (XYZ's copy)
    └── QuestionFlow (XYZ's copy)
```

**Pros:**
- Full tenant customization (add custom questions, modify thresholds)
- Compliance-friendly (data stays in tenant's region/jurisdiction)
- Tenant-specific updates (upgrade ABC without affecting XYZ)
- Easier to meet regulatory requirements (GDPR, SOX, FDA)

**Cons:**
- More storage space (each tenant has full copy)
- Updates require iteration (can't update all tenants at once)

**Why We Chose Option 2:**
1. **Enterprise customers need customization** (Retail vs Manufacturing have different requirements)
2. **Regulatory compliance** (financial services can't share data with other industries)
3. **Flexibility > Efficiency** (storage is cheap, customer satisfaction is expensive)

---

### How Does Tenant Isolation Work?

#### Step 1: User Logs In

```
User: john.doe@customer-abc.com
Password: ********
↓
XSUAA validates credentials
↓
JWT token issued with:
{
  "user": "john.doe@customer-abc.com",
  "tenant": "abc-corp-tenant-id-12345"  ← Tenant ID embedded
}
```

#### Step 2: Request Reaches Application

```
HTTP Request:
GET /service/SolutionAdvisorSvcs/CleanCoreAnalysis
Authorization: Bearer eyJhbGciOi... (JWT token)

↓

CAP MTX Middleware intercepts:
- Extracts tenant ID from JWT
- Sets database schema to "abc-corp-tenant-id-12345_DATA"
- All queries automatically filtered by tenant
```

#### Step 3: Database Query Execution

```javascript
// Developer writes this:
SELECT.from('sd.CleanCoreAnalysis').where({ ricefwId: 'I-0042-IMP' })

// CAP automatically transforms to:
SELECT * FROM "abc-corp-tenant-id-12345_DATA"."sd.CleanCoreAnalysis"
WHERE ricefwId = 'I-0042-IMP'

// Tenant XYZ cannot see ABC's data:
SELECT * FROM "xyz-industries-tenant-id-67890_DATA"."sd.CleanCoreAnalysis"
WHERE ricefwId = 'I-0042-IMP'  ← Different schema, isolated data
```

**Key Point:** Developers never write tenant filtering logic. CAP handles it automatically based on JWT token.

---

### Tenant Lifecycle

#### 1. Subscription (New Customer Signs Up)

```
User clicks "Subscribe" in SAP BTP marketplace
↓
POST /mtx/v1/tenant/subscribe
{
  "subscribedTenantId": "new-customer-tenant-id",
  "subscribedSubaccountId": "..."
}
↓
CAP MTX calls onSubscribe callback:
1. Create database schema "new-customer-tenant-id_DATA"
2. Deploy data model (tables, views, procedures)
3. Seed master data from CSV files (CleanCoreLevels, ObjectTypes, etc.)
4. Return success
↓
Customer can now log in and use application
```

#### 2. Upgrade (Application Updates)

```
Developer deploys new version with updated data model
↓
POST /mtx/v1/tenant/{tenantId}/upgrade
↓
CAP MTX calls onUpgrade callback:
1. Run schema migration scripts (ALTER TABLE, etc.)
2. Update master data if needed
3. Test new schema
4. Return success
↓
Tenant upgraded to new version (zero downtime)
```

#### 3. Offboarding (Customer Cancels)

```
Customer clicks "Unsubscribe"
↓
POST /mtx/v1/tenant/unsubscribe
{
  "subscribedTenantId": "departing-customer-tenant-id"
}
↓
CAP MTX calls onUnsubscribe callback:
1. Export tenant data for compliance (optional)
2. Drop database schema "departing-customer-tenant-id_DATA"
3. Clean up tenant-specific resources
4. Return success
↓
Tenant data permanently deleted
```

---

### Testing Tenant Isolation

**How to Verify:**

```javascript
// Test 1: Create data as Tenant A
const jwt_tenant_a = generateJWT({ tenant: 'tenant-a' });
const response_a = await POST('/service/SolutionAdvisorSvcs/CleanCoreAnalysis', {
  ricefwId: 'I-0042-IMP',
  objectType: 'Interfaces',
  // ... other fields
}, { headers: { Authorization: `Bearer ${jwt_tenant_a}` }});

// Test 2: Try to read as Tenant B
const jwt_tenant_b = generateJWT({ tenant: 'tenant-b' });
const response_b = await GET('/service/SolutionAdvisorSvcs/CleanCoreAnalysis', {
  headers: { Authorization: `Bearer ${jwt_tenant_b}` }
});

// Expected: response_b.value = [] (empty array)
// Tenant B cannot see Tenant A's data

// Test 3: Read as Tenant A (should work)
const response_a2 = await GET('/service/SolutionAdvisorSvcs/CleanCoreAnalysis', {
  headers: { Authorization: `Bearer ${jwt_tenant_a}` }
});

// Expected: response_a2.value = [{ ricefwId: 'I-0042-IMP', ... }]
```

---

### Common Questions (High-Schooler Friendly)

**Q: What happens if a developer forgets to add tenant context?**  
A: CAP automatically handles it. If you use `cds.connect.to('db')`, the framework injects tenant context from the HTTP request JWT token. You can't accidentally query another tenant's data.

**Q: Can tenants customize their master data?**  
A: Yes! With Option 2, each tenant can add custom questions, modify thresholds, or adjust scoring multipliers without affecting others.

**Q: How much storage does this use?**  
A: Each tenant needs ~50-100 MB for master data (questions, thresholds, examples). Transactional data (analyses) varies by usage. Total: ~500 MB - 5 GB per tenant.

**Q: What if we need to update all tenants with new questions?**  
A: Run an upgrade script that iterates through all tenants and inserts new QuestionFlow records. Each tenant still maintains their customizations.

**Q: Is this secure?**  
A: Yes. Database-level isolation (separate schemas) + JWT validation + CAP middleware = defense in depth. Even if one layer fails, others protect against cross-tenant access.

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SAP BTP Cloud Foundry                     │
│                                                               │
│  ┌─────────────┐      ┌──────────────────────────────────┐  │
│  │  App Router │─────▶│  CAP Application (Node.js)        │  │
│  │  (XSUAA)    │      │                                    │  │
│  └─────────────┘      │  ┌──────────────────────────────┐ │  │
│         │              │  │  CAP MTX Middleware           │ │  │
│         │              │  │  - Extract tenant from JWT    │ │  │
│         │              │  │  - Set database context       │ │  │
│         │              │  └──────────────────────────────┘ │  │
│         │              └──────────────────────────────────┘  │
│         ▼                             │                      │
│  ┌─────────────┐                     ▼                      │
│  │    XSUAA    │            ┌──────────────────┐            │
│  │  (JWT Token)│            │  HANA Cloud DB   │            │
│  └─────────────┘            │                  │            │
│                              │  ┌────────────┐ │            │
│                              │  │ Tenant_A   │ │            │
│                              │  │   _DATA    │ │            │
│                              │  └────────────┘ │            │
│                              │  ┌────────────┐ │            │
│                              │  │ Tenant_B   │ │            │
│                              │  │   _DATA    │ │            │
│                              │  └────────────┘ │            │
│                              └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

This enhanced technical specification provides a comprehensive blueprint for implementing the SAP Clean Core Decision Advisor application with full support for:

✅ **Scoring Metrics:** Technical Debt, Cloud Readiness, Upgrade Impact  
✅ **Constraints Display:** Automatic performance thresholds and limitations  
✅ **Real-World Examples:** Context-aware example matching and display  
✅ **RICEFW ID Management:** 10-character identifiers with historical tracking  
✅ **Multi-tenant SaaS:** Secure, scalable, and compliant architecture (Option 2: Per-tenant master data)  
✅ **Comprehensive Decision Trees:** All RICEFW object types with detailed guidance  
✅ **Wizard Integration:** Embedded in analyses with save/resume capability (WizardSession entity)  
✅ **Visual Flowcharts:** SVG/PNG/PDF export for decision path visualization  
✅ **Master Data Seeding:** CSV templates for consistent deployment across tenants  

**Implementation Readiness:**
- Complete data model with 9 entities (including WizardSession)
- OData V4 service with 12+ actions and 6+ functions
- Multi-tenancy implementation with CAP MTX
- Performance optimization (caching, pagination, async processing)
- Enterprise security (RBAC, ABAC, encryption, audit logging)
- Testing strategy (Jest, OPA5, k6 load tests)
- Deployment automation (MTA, CI/CD, blue-green deployments)
- Comprehensive appendices (CSV templates, flowchart exports, multi-tenancy deep dive)

**Next Steps:**
1. Review and approve technical specification with stakeholders
2. Set up development environment (SAP BTP Business Application Studio)
3. Begin Phase 1 implementation (Data Model & Core Services)
4. Develop scoring engine and constraints display logic
5. Implement UI with wizard, scoring dashboard, and flowchart visualization
6. Load master data from CSV templates
7. Testing and validation (unit, integration, UI, load)
8. Deployment to production with tenant provisioning

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| **v1.0** | September 15, 2025 | Technical Specification Team | Initial version with core data model (7 entities), basic service definitions, UI mockups, and deployment architecture. Focus on wizard flow and clean core decision framework. |
| **v2.0** | October 1, 2025 | Enterprise Architecture | Enhanced with scoring metrics (Technical Debt, Cloud Readiness, Upgrade Impact), constraints display (PerformanceThreshold entity), real-world examples (RealWorldExample entity), and RICEFW ID management (10-character format). Added complete decision trees for all 6 RICEFW types. |
| **v3.0 (Final Enhanced)** | October 21, 2025 | Technical Specification Team + AI Assistant | Major enhancements:<br/>• Added WizardSession entity for save/resume capability<br/>• Clarified wizard integration (embedded in analyses, not standalone)<br/>• Documented Option 2 multi-tenancy model (per-tenant master data) with rationale<br/>• Added complete OData V4 service specification (Section 9)<br/>• Added multi-tenancy implementation details (Section 10)<br/>• Added performance & scalability patterns (Section 11)<br/>• Added security & compliance specifications (Section 12)<br/>• Added comprehensive testing strategy (Section 13)<br/>• Added deployment & operations guide (Section 14)<br/>• Added future integrations roadmap (Section 15)<br/>• Added implementation guidelines (Section 16)<br/>• Created 4 appendices:<br/>  - Appendix A: WizardSession entity definition<br/>  - Appendix B: Flowchart SVG export specification<br/>  - Appendix C: Master data seed CSV templates<br/>  - Appendix D: Multi-tenancy deep dive<br/>• Simplified language throughout for high-schooler comprehension<br/>• Added "What Does This Mean?" explanations with analogies |

**Reviewers:**
- Enterprise Architecture Team (v1.0, v2.0)
- SAP CAP Development Team (v3.0 - technical accuracy)
- Project Steering Committee (v3.0 - business alignment)

**Approved By:**
- Chief Technology Officer
- Solution Architecture Lead  
- Project Sponsor

**Status:** ✅ **APPROVED FOR IMPLEMENTATION** (October 21, 2025)

---

**Prepared By:** Technical Specification Team  
**Document Owner:** Enterprise Architecture  
**Contact:** architecture@example.com  
**Repository:** github.com/marunsct/SolutionAdvisor  

**License:** Internal use only - SAP Clean Core Solution Advisor Project  
**Confidentiality:** Company Confidential