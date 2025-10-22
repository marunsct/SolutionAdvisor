# Visual Architecture Guide

## Application Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ProjectsList View                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Projects Table                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  Client   │  Project  │  Type  │  Flavor  │  Status     │  │ │
│  │  │  Acme Co  │  ERP Impl │  New   │  Cloud   │  Active     │◄─┼─┼─ Click row
│  │  │  TechCorp │  S4 Conv  │  Conv  │  On-Prem │  Active     │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │  [Edit Project] [New Project] [View All Analyses]              │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AnalysesList View (Filtered by Project)                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ℹ Showing analyses for project: ERP Implementation             │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  Analyses Table                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  RICEFW   │  Name    │  Type  │  Level │  Status        │  │ │
│  │  │  I-0042   │  SAP API │  Integ │  B     │  Completed     │  │ │
│  │  │  R-0015   │  Sales   │  Rept  │  A     │  Completed     │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │  [New Analysis] [Back to Projects]                             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Wizard View                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Step 1: Project Selection                                      │ │
│  │  ✓ Project automatically selected from previous screen          │ │
│  │  [ERP Implementation - Acme Co] (disabled)                      │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  Step 2: Object Information                                     │ │
│  │  RICEFW ID: [I-0042-IMP] 💡 [View History]                     │ │
│  │  Object Type: [Interface ▼]                                     │ │
│  │  Object Name: [Customer Data Sync]                              │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  Step 3: Ready to Start                                         │ │
│  │  ┌────────────────────────────────────────────────────────────┐│ │
│  │  │ Performance Thresholds & Constraints                        ││ │
│  │  │ • Volume: 10,000 records/operation                          ││ │
│  │  │ • Size: 35MB per request                                    ││ │
│  │  │ • No custom ABAP (Cloud Public)                             ││ │
│  │  └────────────────────────────────────────────────────────────┘│ │
│  │  ┌────────────────────────────────────────────────────────────┐│ │
│  │  │ Real-World Examples                                         ││ │
│  │  │ 🏭 Manufacturing - EDI Integration (Level B)                ││ │
│  │  │ 🏪 Retail - POS Data Sync (Level A)                         ││ │
│  │  └────────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────────┘ │
│  [View History] [Save Draft] [Cancel] [Start Analysis]             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Analysis Details View                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Customer Data Sync                     I-0042-IMP    [Level B] │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  Scoring Dashboard                                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │Tech Debt │  │  Cloud   │  │ Upgrade  │  │Composite │      │ │
│  │  │   25%    │  │   85%    │  │   20%    │  │   80%    │      │ │
│  │  │   🟢     │  │   🟢     │  │   🟢     │  │   🟢     │      │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  [Results] [Object] [Risk] [Decision Flowchart]                │ │
│  │  ┌────────────────────────────────────────────────────────────┐│ │
│  │  │                  Decision Flowchart                         ││ │
│  │  │  ┌───────┐     ┌───────┐     ┌───────┐     ┌─────────┐   ││ │
│  │  │  │  Q1   │ ──► │  Q2   │ ──► │  Q3   │ ──► │ Level B │   ││ │
│  │  │  │Volume │     │ API   │     │ Cloud │     │  🔵     │   ││ │
│  │  │  └───────┘     └───────┘     └───────┘     └─────────┘   ││ │
│  │  └────────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────────┘ │
│  [View Flowchart] [Export PNG] [Export PDF]                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (UI5)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Views                    Controllers                  Fragments     │
│  ┌──────────────┐        ┌──────────────┐           ┌────────────┐ │
│  │ ProjectsList │◄──────►│ ProjectsList │           │Constraints │ │
│  │              │        │              │           │   Panel    │ │
│  └──────────────┘        └──────────────┘           └────────────┘ │
│                                                                      │
│  ┌──────────────┐        ┌──────────────┐           ┌────────────┐ │
│  │ AnalysesList │◄──────►│ AnalysesList │           │ Examples   │ │
│  │              │        │              │           │   Panel    │ │
│  └──────────────┘        └──────────────┘           └────────────┘ │
│                                                                      │
│  ┌──────────────┐        ┌──────────────┐           ┌────────────┐ │
│  │    Wizard    │◄──────►│    Wizard    │◄─────────►│ Flowchart  │ │
│  │              │        │              │           │    View    │ │
│  └──────────────┘        └──────────────┘           └────────────┘ │
│                                │                                     │
│  ┌──────────────┐        ┌────▼─────────┐           ┌────────────┐ │
│  │   Analysis   │◄──────►│   Analysis   │           │DetailedHint│ │
│  │   Details    │        │   Details    │           │   Popover  │ │
│  └──────────────┘        └──────────────┘           └────────────┘ │
│                                │                                     │
│                          ┌─────▼────────┐            ┌────────────┐ │
│         Utilities        │  Flowchart   │            │ SaveDraft  │ │
│                          │  Generator   │            │   Dialog   │ │
│                          └──────────────┘            └────────────┘ │
│                                                                      │
│                                                      ┌────────────┐  │
│                                                      │  RICEFW    │  │
│                                                      │  History   │  │
│                                                      └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ OData V4
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (CAP Node.js)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Service Layer                Service Handlers                      │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │ OData Service    │◄────────┤ service.js       │                 │
│  │ /service/        │         │                  │                 │
│  │ SolutionAdvisor  │         │ • startWizard    │                 │
│  │ Svcs             │         │ • submitAnswer   │                 │
│  └──────────────────┘         │ • getConstraints │                 │
│                                │ • getExamples    │                 │
│                                │ • exportFlowchart│                 │
│                                └──────────────────┘                 │
│                                                                      │
│  Business Logic                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ decision-engine  │  │ scoring-service  │  │ constraints     │  │
│  │ • getFirstQ      │  │ • calculateScore │  │ • getRelevant   │  │
│  │ • getNextQ       │  │ • techDebt       │  │ • filterByType  │  │
│  └──────────────────┘  │ • cloudReadiness │  └─────────────────┘  │
│                         │ • upgradeImpact  │                        │
│  ┌──────────────────┐  └──────────────────┘  ┌─────────────────┐  │
│  │ examples-service │                         │ (Future: API     │  │
│  │ • getContextual  │                         │  Hub Service)    │  │
│  │ • filterByCriteria│                        └─────────────────┘  │
│  └──────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Data Layer (HANA Cloud)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Core Entities                Master Data                           │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │ Projects         │         │ CleanCoreLevels  │                 │
│  │ • ID             │         │ • Level A/B/C/D  │                 │
│  │ • clientName     │         │ • Multipliers    │                 │
│  │ • s4HanaFlavor   │         └──────────────────┘                 │
│  │ • compliance     │                                               │
│  └──────────────────┘         ┌──────────────────┐                 │
│                                │ ObjectTypes      │                 │
│  ┌──────────────────┐         │ • R/I/C/E/F/W    │                 │
│  │ Analyses         │         │ • Display names  │                 │
│  │ • ID             │         └──────────────────┘                 │
│  │ • projectConfig  │                                               │
│  │ • ricefwId       │         ┌──────────────────┐                 │
│  │ • objectType     │         │ Performance      │                 │
│  │ • finalRecom     │         │ Thresholds       │                 │
│  │ • scores         │         │ • Volume limits  │                 │
│  └──────────────────┘         │ • Size limits    │                 │
│                                └──────────────────┘                 │
│  ┌──────────────────┐                                               │
│  │ DecisionPaths    │         ┌──────────────────┐                 │
│  │ • questionId     │         │ RealWorld        │                 │
│  │ • selectedAnswer │         │ Examples         │                 │
│  │ • stepOrder      │         │ • Scenarios      │                 │
│  └──────────────────┘         │ • Solutions      │                 │
│                                └──────────────────┘                 │
│  ┌──────────────────┐                                               │
│  │ WizardSessions   │         ┌──────────────────┐                 │
│  │ • currentStep    │         │ QuestionFlows    │                 │
│  │ • answeredPath   │         │ • Questions      │                 │
│  │ • sessionStatus  │         │ • Navigation     │                 │
│  └──────────────────┘         └──────────────────┘                 │
│                                                                      │
│  Tenant Isolation: Each entity has tenant column for multi-tenancy  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Creating an Analysis

```
User Action                Backend Processing              Database
═══════════════════════════════════════════════════════════════════════

1. Click Project Row
   │
   └──► Navigate to                                    
        AnalysesList                                    
        with projectId                                  
                         
2. Click "New Analysis"
   │
   └──► Navigate to                                    
        Wizard with                                     
        projectId param                                 
                         
3. Wizard onInit
   │                    
   └──► Load Project ────────► Read Project ──────► SELECT from
        Details                                       Projects
        │                                             WHERE ID=projectId
        └──► Auto-select                              
             project                                   
                         
4. Select Object Type
   │                    
   ├──► Load Constraints ────► Query Thresholds ──► SELECT from
   │                                                  PerformanceThreshold
   │                                                  WHERE objectType LIKE...
   │                    
   └──► Load Examples ───────► Query Examples ────► SELECT from
                                                     RealWorldExample
                                                     WHERE objectType=...
                         
5. Click "Start Analysis"
   │                    
   └──► Call startWizard ────► Create Analysis ───► INSERT into
        Action                 │                     Analyses
                               ├──► Create Session ► INSERT into
                               │                     WizardSessions
                               └──► Get First Q ───► SELECT from
                                                     QuestionFlows
                         
6. Answer Questions
   │                    
   └──► Call submitAnswer ───► Save Decision ────► INSERT into
        Action                 Path                 DecisionPaths
                               │                    
                               ├──► Get Next Q ───► SELECT from
                               │    or Final        QuestionFlows
                               │                    
                               └──► Calculate ────► UPDATE
                                    Scores          Analyses SET
                                                    scores...
                         
7. View Analysis Details
   │                    
   └──► Navigate to                                
        AnalysisDetails                             
        │                    
        └──► Load Analysis ───────► Read Analysis ► SELECT from
             with DecisionPaths                      Analyses
                                                     EXPAND
                                                     decisionPaths
                         
8. Generate Flowchart
   │                    
   └──► Client-side SVG                            
        generation using                            
        DecisionPaths data                          
```

## State Management

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Wizard State Flow                            │
└─────────────────────────────────────────────────────────────────────┘

wizardModel                constraintsModel           examplesModel
┌──────────────┐          ┌──────────────┐           ┌──────────────┐
│ projectID    │          │ performance  │           │ examples[]   │
│ projectName  │          │ deployment   │           │ filters      │
│ ricefwId     │          │ compliance   │           │ selected     │
│ objectType   │◄────────►│              │◄─────────►│              │
│ objectName   │          └──────────────┘           └──────────────┘
│ description  │                 │                           │
│ autoSelected │                 │                           │
└──────────────┘                 │                           │
       │                         │                           │
       ▼                         ▼                           ▼
┌──────────────┐          ┌──────────────┐           ┌──────────────┐
│ hintModel    │          │ draftModel   │           │historyModel  │
│ questionText │          │ currentStep  │           │ ricefwId     │
│ detailedHint │          │ totalSteps   │           │ analyses[]   │
│ perfContext  │          │ timeSpent    │           │              │
└──────────────┘          └──────────────┘           └──────────────┘

All models are JSON models stored in view, reset on navigation
```

## Color Coding System

```
Clean Core Level Colors:
══════════════════════════

Level A - Fully Clean Core
┌─────────────────────────┐
│    🟢 GREEN (#4caf50)   │  Success state
│    Bg: #e8f5e9          │  Minimal technical debt
│    Best practice        │  Fully cloud-ready
└─────────────────────────┘

Level B - Enhanced Clean Core
┌─────────────────────────┐
│    🔵 BLUE (#2196f3)    │  Information state
│    Bg: #e3f2fd          │  Low technical debt
│    Recommended          │  Cloud-ready with notes
└─────────────────────────┘

Level C - Compliant Modifications
┌─────────────────────────┐
│   🟠 ORANGE (#ff9800)   │  Warning state
│    Bg: #fff3e0          │  Moderate debt
│    Acceptable           │  Limited cloud support
└─────────────────────────┘

Level D - Legacy Customizations
┌─────────────────────────┐
│    🔴 RED (#f44336)     │  Error state
│    Bg: #ffebee          │  High technical debt
│    Avoid if possible    │  Not cloud-ready
└─────────────────────────┘

Score Indicators:
═════════════════

Technical Debt (0-100, lower is better)
  0-29:  🟢 Success
 30-59:  🟡 Warning
 60-100: 🔴 Error

Cloud Readiness (0-100, higher is better)
 71-100: 🟢 Success
 41-70:  🟡 Warning
  0-40:  🔴 Error

Upgrade Impact (0-100, lower is better)
  0-29:  🟢 Success
 30-59:  🟡 Warning
 60-100: 🔴 Error
```

## Fragment Integration Pattern

```
Parent View                    Fragment                   Controller
════════════════               ════════════               ═══════════

Wizard.view.xml                                          Wizard.controller.js
│                                                        │
├─ VBox                                                  ├─ Models:
│  │                                                     │  • wizardModel
│  └─► <core:Fragment           ConstraintsPanel        │  • constraintsModel
│       fragmentName=           .fragment.xml            │  • examplesModel
│       "...ConstraintsPanel"   │                        │  • hintModel
│       type="XML"/>            ├─ Panel                 │  • draftModel
│                               ├─ List (perf)           │  • historyModel
│                               ├─ List (deploy)         │
│  └─► <core:Fragment           └─ List (compliance)     ├─ Methods:
│       fragmentName=                                    │  • _loadConstraints
│       "...ExamplesPanel"      ExamplesPanel            │  • _loadExamples
│       type="XML"/>            .fragment.xml            │  • onShowHint
│                               │                        │  • onSaveDraft
│                               ├─ Panel                 │  • onShowHistory
│                               ├─ Filters               │
│                               ├─ List (examples)       └─► Event Handlers:
│                               └─ Dialog (details)          • onFilterChange
│                                                            • onShowDetails
                                                             • onCopy
                                                             • onSearch
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SAP BTP Cloud Foundry                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ App Router (approuter)                                         │ │
│  │ • Route /service/* → Backend                                   │ │
│  │ • Route /sd.solutionadvisor/* → Frontend                       │ │
│  │ • Authentication enforcement                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│              ┌───────────────┴────────────────┐                     │
│              │                                 │                     │
│  ┌───────────▼──────────┐         ┌──────────▼─────────┐           │
│  │ Frontend (UI5 App)   │         │ Backend (CAP App)  │           │
│  │ • Static files       │         │ • Node.js runtime  │           │
│  │ • Served by approuter│         │ • OData services   │           │
│  └──────────────────────┘         │ • Business logic   │           │
│                                    └────────┬───────────┘           │
│                                             │                        │
│  ┌──────────────────────────────────────────▼───────────────────┐  │
│  │ Services                                                      │  │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │  │
│  │ │   XSUAA     │ │ HANA Cloud  │ │ Destination │            │  │
│  │ │ (Auth)      │ │ (Database)  │ │  Service    │            │  │
│  │ └─────────────┘ └─────────────┘ └─────────────┘            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Key URLs (Local Development)
- Application: http://localhost:4004/sd.solutionadvisor/index.html
- OData Service: http://localhost:4004/service/SolutionAdvisorSvcs
- Service Metadata: http://localhost:4004/service/SolutionAdvisorSvcs/$metadata

### Key Entities
- `/Projects` - Project configurations
- `/Analyses` - Analysis results
- `/DecisionPaths` - Decision history
- `/PerformanceThresholds` - Constraint definitions
- `/RealWorldExamples` - Implementation examples

### Key Actions
- `startWizard` - Initialize new analysis
- `submitAnswer` - Progress through wizard
- `getRelevantConstraints` - Get contextual constraints
- `getContextualExamples` - Get filtered examples
- `exportFlowchart` - Generate flowchart download

---

This visual guide complements the Implementation Summary and User Guide.
