# SAP Clean Core Solution Advisor - Application Flows & UI Guide

**Version:** 1.0  
**Date:** October 27, 2025  
**Purpose:** Comprehensive guide to UI flow, functional flow, and wizard interface design

---

## Table of Contents

1. [UI Flow Overview](#1-ui-flow-overview)
2. [Functional Flow](#2-functional-flow)
3. [Clean Core Wizard UI Samples](#3-clean-core-wizard-ui-samples)
4. [Screen-by-Screen Navigation](#4-screen-by-screen-navigation)
5. [User Personas and Workflows](#5-user-personas-and-workflows)

---

## 1. UI Flow Overview

### 1.1 Application Entry Points

The application provides multiple entry points based on user role and intent:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SAP Fiori Launchpad                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Wizard     │  │   Analyses   │  │  Analytics   │           │
│  │   Tile       │  │   Tile       │  │   Tile       │           │
│  │              │  │              │  │              │           │
│  │  Start New   │  │  View All    │  │  Dashboard   │           │
│  │  Analysis    │  │  Analyses    │  │  & Reports   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    Wizard Flow      Analyses List      Analytics Dashboard
```

### 1.2 Primary Navigation Structure

```
Application Shell (SAP Fiori Launchpad)
│
├── Home / Launchpad Page
│   └── Tiles (4-6 dynamic tiles with KPIs)
│
├── Wizard Module
│   ├── Step 1: Project Selection
│   ├── Step 2: Object Information
│   ├── Step 3: Dynamic Questions (Decision Tree)
│   ├── Step 4: Final Recommendation
│   └── Step 5: Save Analysis
│
├── Analyses Module
│   ├── Analyses List (List Report)
│   └── Analysis Details (Object Page)
│       ├── Header: RICEFW ID, Level, Scores
│       ├── Section 1: Recommendation Summary
│       ├── Section 2: Decision Path (Flowchart)
│       ├── Section 3: Scoring Dashboard
│       └── Section 4: Export Options
│
├── Analytics Module
│   ├── KPI Tiles Row
│   ├── Charts Section
│   │   ├── Level Distribution (Donut Chart)
│   │   ├── Trend Analysis (Line Chart)
│   │   └── Risk Matrix (Scatter Plot)
│   └── Export Options
│
└── Administration Module (Admin Role Only)
    ├── User Management
    ├── Master Data Configuration
    └── System Settings
```

### 1.3 Navigation Patterns

#### Pattern 1: Wizard-First Flow (New Analysis)
```
Launchpad → Wizard Tile → Project Selection → Object Info → 
Questions → Recommendation → Save → View Analysis Details
```

#### Pattern 2: Analysis Review Flow
```
Launchpad → Analyses Tile → Select Analysis → 
View Details → Flowchart/Scores → Export → Back to List
```

#### Pattern 3: Analytics Monitoring Flow
```
Launchpad → Analytics Tile → View KPIs → 
Drill into Charts → Filter by Time/Level → Export Reports
```

#### Pattern 4: Draft Resume Flow
```
Launchpad → Wizard Tile → Resume Draft → 
Continue from Last Question → Complete → Save
```

---

## 2. Functional Flow

### 2.1 End-to-End Process Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 1: INITIALIZATION                                              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    User Logs into Launchpad
                              │
                              ▼
                    Clicks "Start New Analysis" Tile
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 2: PROJECT SETUP                                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Select/Create Project         │
              │ - Client Name                 │
              │ - S/4HANA Flavor (Cloud/OP)   │
              │ - Compliance Requirements     │
              │ - BTP Services Used           │
              └───────────────┬───────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 3: OBJECT IDENTIFICATION                                       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Enter Object Details          │
              │ - RICEFW ID (R-0001-ABC)      │
              │ - Object Type (R/I/C/E/F/W)   │
              │ - Object Name/Description     │
              │ - Business Area               │
              └───────────────┬───────────────┘
                              │
                              ▼
                    Backend: startWizard Action
                              │
                              ├─► Create WizardSession
                              ├─► Load First QuestionFlow
                              ├─► Filter by Object Type
                              └─► Return Question + Context
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 4: DECISION TREE NAVIGATION                                    │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Display Question              │
              │ - Question Text               │
              │ - Possible Answers (Radio)    │
              │ - Detailed Hint (Popover)     │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Load Supporting Context       │
              │ (Parallel Backend Calls)      │
              ├───────────────────────────────┤
              │ ► getRelevantConstraints      │
              │   - Performance Thresholds    │
              │   - Deployment Limitations    │
              │   - Compliance Rules          │
              │                               │
              │ ► getRelevantExamples         │
              │   - Real-World Scenarios      │
              │   - Industry Examples         │
              │   - Best Practice Patterns    │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ User Selects Answer           │
              └───────────────┬───────────────┘
                              │
                              ▼
                    Backend: submitAnswer Action
                              │
                              ├─► Parse navigationLogic JSON
                              ├─► Determine Next Step
                              ├─► Update DecisionPath
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Is Final Answer?    │
                    └─────────┬───────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                   Yes                  No
                    │                    │
                    ▼                    │
          Generate Recommendation        │
                    │                    │
                    │                    ▼
                    │          Display Next Question
                    │                    │
                    │                    └──► Loop Back to Phase 4
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 5: FINAL RECOMMENDATION                                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Display Recommendation        │
              │ - Clean Core Level (A/B/C/D)  │
              │ - Reasoning/Justification     │
              │ - Decision Path Summary       │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Calculate Scores              │
              │ (Backend: Scoring Service)    │
              ├───────────────────────────────┤
              │ ► Technical Debt Score (TDS)  │
              │ ► Cloud Readiness Score (CRS) │
              │ ► Upgrade Impact Score (UIS)  │
              │ ► Composite Health Score (CHS)│
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Display Scoring Dashboard     │
              │ - Progress Bars (Color-coded) │
              │ - Radar Chart (Optional)      │
              │ - Score Explanations          │
              └───────────────┬───────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 6: SAVE & REVIEW                                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ User Saves Analysis           │
              │ - Create CleanCoreAnalysis    │
              │ - Store DecisionPath          │
              │ - Save Scores                 │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Navigate to Analysis Details  │
              │ (Object Page)                 │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ View Complete Analysis        │
              │ - Recommendation Summary      │
              │ - Decision Flowchart (D3.js)  │
              │ - Scoring Breakdown           │
              │ - Export Options (PDF/Excel)  │
              └───────────────────────────────┘
```

### 2.2 Backend Service Interaction Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (UI5)                              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ OData V4 Requests
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                   CAP SERVICE LAYER (srv/)                         │
├────────────────────────────────────────────────────────────────────┤
│  service.cds (OData V4 Service Definition)                        │
│  service.js (Request Handlers & Custom Actions)                   │
└────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    ▼                    ▼
        ┌───────────────────┐   ┌──────────────────┐
        │  Decision Engine  │   │ Scoring Service  │
        │  (Navigation)     │   │ (Calculations)   │
        └─────────┬─────────┘   └────────┬─────────┘
                  │                      │
                  │                      │
        ┌─────────┴──────────┐          │
        │                    │          │
        ▼                    ▼          ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Constraints  │   │  Examples    │   │  Analytics   │
│  Service     │   │  Service     │   │  Service     │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER (db/)                            │
├────────────────────────────────────────────────────────────────────┤
│  schema.cds (Data Model - namespace: sd)                          │
│                                                                    │
│  Entities:                                                         │
│  - ProjectConfiguration                                            │
│  - CleanCoreAnalysis                                               │
│  - WizardSession                                                   │
│  - QuestionFlow (Decision Tree Data)                               │
│  - DecisionPath (User Journey)                                     │
│  - PerformanceThreshold (Constraints)                              │
│  - RealWorldExample (Examples)                                     │
│  - CleanCoreLevels (Master Data)                                   │
│  - ObjectTypes (RICEFW Master)                                     │
└────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                   SAP HANA CLOUD DATABASE                          │
│               (Multi-Tenant Schema Isolation)                      │
└────────────────────────────────────────────────────────────────────┘
```

### 2.3 Decision Tree Logic Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ QuestionFlow Entity (Per Object Type)                          │
├─────────────────────────────────────────────────────────────────┤
│ Example: Report (R) Questions                                   │
│                                                                 │
│ Q1: "Is this an operational or analytical report?"             │
│     navigationLogic: {                                          │
│       "Operational": { nextQuestion: "R-Q2" },                  │
│       "Analytical": { nextQuestion: "R-Q5" }                    │
│     }                                                           │
│                                                                 │
│ Q2: "What is the data volume?"                                  │
│     navigationLogic: {                                          │
│       "Low (<1M rows)": { nextQuestion: "R-Q3" },               │
│       "High (>1M rows)": { nextQuestion: "R-Q4" }               │
│     }                                                           │
│                                                                 │
│ Q3: "Is real-time data required?"                               │
│     navigationLogic: {                                          │
│       "Yes": { finalAnswer: "Level B" },                        │
│       "No": { finalAnswer: "Level A" }                          │
│     }                                                           │
│                                                                 │
│ Q4: "Can data be aggregated/summarized?"                        │
│     navigationLogic: {                                          │
│       "Yes": { finalAnswer: "Level B" },                        │
│       "No": { finalAnswer: "Level C" }                          │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘

Decision Engine Processing:
1. User selects "Operational" → Navigate to Q2
2. User selects "High" → Navigate to Q4
3. User selects "Yes" → Return "Level B" recommendation
```

### 2.4 Scoring Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ INPUT: Completed Analysis (DecisionPath + Answers)             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Calculate Technical Debt Score (TDS)                   │
├─────────────────────────────────────────────────────────────────┤
│ Formula:                                                        │
│ TDS = Σ(Level_Complexity × Answer_Weight) / Total_Answers × 100│
│                                                                 │
│ Level Complexity:                                               │
│ - Level A = 0 (Clean core compliant)                           │
│ - Level B = 1 (Minimal technical debt)                         │
│ - Level C = 3 (Moderate technical debt)                        │
│ - Level D = 5 (High technical debt)                            │
│                                                                 │
│ Example:                                                        │
│ Path: [A, B, B, C] → (0 + 1 + 1 + 3) / 4 × 100 = 125 → 100     │
│ (Clamped to 0-100 range)                                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Calculate Cloud Readiness Score (CRS)                  │
├─────────────────────────────────────────────────────────────────┤
│ Formula:                                                        │
│ CRS = Σ(Level_Cloud_Factor) / Total_Answers × 100              │
│                                                                 │
│ Level Cloud Factor:                                             │
│ - Level A = 2 (Fully cloud-ready)                              │
│ - Level B = 1 (Cloud-compatible with adjustments)              │
│ - Level C = 0.5 (Limited cloud support)                        │
│ - Level D = 0 (Not cloud-ready)                                │
│                                                                 │
│ Example:                                                        │
│ Path: [A, A, B, C] → (2 + 2 + 1 + 0.5) / 4 × 100 = 137.5 → 100 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Calculate Upgrade Impact Score (UIS)                   │
├─────────────────────────────────────────────────────────────────┤
│ Formula:                                                        │
│ UIS = Σ(Level_Upgrade_Risk × Custom_Code_Lines) /              │
│       Total_Code_Lines × 100                                    │
│                                                                 │
│ Level Upgrade Risk:                                             │
│ - Level A = 0 (No upgrade impact)                              │
│ - Level B = 1 (Minor upgrade effort)                           │
│ - Level C = 3 (Moderate upgrade effort)                        │
│ - Level D = 5 (Major upgrade effort)                           │
│                                                                 │
│ Example:                                                        │
│ Custom Code: 200 lines, Total: 1000 lines                      │
│ Level B → (1 × 200) / 1000 × 100 = 20                           │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Calculate Composite Health Score (CHS)                 │
├─────────────────────────────────────────────────────────────────┤
│ Formula:                                                        │
│ CHS = (100 - TDS) × 0.4 + CRS × 0.3 + (100 - UIS) × 0.3        │
│                                                                 │
│ Weighting:                                                      │
│ - Technical Debt (inverted): 40%                                │
│ - Cloud Readiness: 30%                                          │
│ - Upgrade Impact (inverted): 30%                                │
│                                                                 │
│ Example:                                                        │
│ TDS=25, CRS=75, UIS=20                                          │
│ CHS = (100-25)×0.4 + 75×0.3 + (100-20)×0.3                      │
│     = 75×0.4 + 75×0.3 + 80×0.3                                  │
│     = 30 + 22.5 + 24 = 76.5                                     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ OUTPUT: All Scores Displayed in Dashboard                      │
│ - TDS: 25 (Green - Low debt)                                   │
│ - CRS: 75 (Yellow - Good readiness)                            │
│ - UIS: 20 (Green - Low impact)                                 │
│ - CHS: 76.5 (Yellow - Healthy overall)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Clean Core Wizard UI Samples

### 3.1 Step 1: Project Selection Screen

```
╔═══════════════════════════════════════════════════════════════════╗
║  SAP Clean Core Solution Advisor                    [User Menu ▼] ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ Clean Core Analysis Wizard                                  │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  Progress: ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1/5   ║
║            Step 1: Project Selection                              ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Select Project *                                           │ ║
║  │  ┌───────────────────────────────────────────────────┐     │ ║
║  │  │ [Select...                                      ▼]│     │ ║
║  │  └───────────────────────────────────────────────────┘     │ ║
║  │  ○ Use existing project                                    │ ║
║  │  ● Create new project                                      │ ║
║  │                                                             │ ║
║  │  ┌───────────────────────────────────────────────────────┐ │ ║
║  │  │ Client Name *                                         │ │ ║
║  │  │ ┌───────────────────────────────────────────────────┐ │ │ ║
║  │  │ │ Acme Corporation                                  │ │ │ ║
║  │  │ └───────────────────────────────────────────────────┘ │ │ ║
║  │  │                                                       │ │ ║
║  │  │ S/4HANA Deployment Flavor *                           │ │ ║
║  │  │ ┌───────────────────────────────────────────────────┐ │ │ ║
║  │  │ │ ● Cloud - Public Edition                          │ │ │ ║
║  │  │ │ ○ Cloud - Private Edition                         │ │ │ ║
║  │  │ │ ○ On-Premise                                      │ │ ║
║  │  │ └───────────────────────────────────────────────────┘ │ │ ║
║  │  │                                                       │ │ ║
║  │  │ Compliance Requirements                               │ │ ║
║  │  │ ┌───────────────────────────────────────────────────┐ │ │ ║
║  │  │ │ ☑ GDPR                                            │ │ │ ║
║  │  │ │ ☐ SOX                                             │ │ │ ║
║  │  │ │ ☐ FDA 21 CFR Part 11                              │ │ │ ║
║  │  │ │ ☐ HIPAA                                           │ │ │ ║
║  │  │ └───────────────────────────────────────────────────┘ │ │ ║
║  │  │                                                       │ │ ║
║  │  │ BTP Services in Use (Optional)                        │ │ ║
║  │  │ ┌───────────────────────────────────────────────────┐ │ │ ║
║  │  │ │ ☑ Workflow Management                             │ │ │ ║
║  │  │ │ ☑ Integration Suite                               │ │ │ ║
║  │  │ │ ☐ Document Management Service                     │ │ │ ║
║  │  │ └───────────────────────────────────────────────────┘ │ │ ║
║  │  └───────────────────────────────────────────────────────┘ │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ ℹ Note: Project configuration impacts the decision tree     │ ║
║  │   and available clean core options.                         │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║                                          [Cancel]  [Next Step →] ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 3.2 Step 2: Object Information Screen

```
╔═══════════════════════════════════════════════════════════════════╗
║  SAP Clean Core Solution Advisor                    [User Menu ▼] ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Progress: ●━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2/5   ║
║            Step 2: Object Information                             ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  RICEFW Object Type *                                       │ ║
║  │  ┌───────────────────────────────────────────────────┐     │ ║
║  │  │ ● Reports        ○ Interfaces    ○ Conversions    │     │ ║
║  │  │ ○ Enhancements   ○ Forms         ○ Workflows      │     │ ║
║  │  └───────────────────────────────────────────────────┘     │ ║
║  │                                                             │ ║
║  │  RICEFW ID *                                                │ ║
║  │  ┌───────────────────────────────────────────────────┐     │ ║
║  │  │ R-0042-FIN          [ℹ Format: R-####-XXX]        │     │ ║
║  │  └───────────────────────────────────────────────────┘     │ ║
║  │                                                             │ ║
║  │  Object Name *                                              │ ║
║  │  ┌───────────────────────────────────────────────────┐     │ ║
║  │  │ Monthly Revenue Analysis Report                   │     │ ║
║  │  └───────────────────────────────────────────────────┘     │ ║
║  │                                                             │ ║
║  │  Object Description                                         │ ║
║  │  ┌───────────────────────────────────────────────────┐     │ ║
║  │  │ Operational report that provides monthly          │     │ ║
║  │  │ revenue breakdown by product line and region.     │     │ ║
║  │  │ Includes YoY comparison and trend analysis.       │     │ ║
║  │  └───────────────────────────────────────────────────┘     │ ║
║  │                                                             │ ║
║  │  Business Area *                                            │ ║
║  │  ┌───────────────────────────────────────────────────┐     │ ║
║  │  │ [Finance & Controlling                          ▼]│     │ ║
║  │  └───────────────────────────────────────────────────┘     │ ║
║  │                                                             │ ║
║  │  Priority                                                   │ ║
║  │  ○ Critical  ● High  ○ Medium  ○ Low                        │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ ⚠ Existing Analyses for this RICEFW ID: 2                   │ ║
║  │   Last Analysis: Level B (Oct 15, 2025)                     │ ║
║  │   [View History]                                            │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║                                 [← Back]  [Cancel]  [Next Step →] ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 3.3 Step 3: Dynamic Questions with Constraints & Examples

```
╔═══════════════════════════════════════════════════════════════════╗
║  SAP Clean Core Solution Advisor                    [User Menu ▼] ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Progress: ●━●━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3/5   ║
║            Step 3: Decision Analysis (Question 2 of 5)            ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Question 2: What is the expected data volume?              │ ║
║  │                                                             │ ║
║  │  Select one answer:                                         │ ║
║  │                                                             │ ║
║  │  ○ Low (< 1 million rows)                                   │ ║
║  │     Standard reporting, suitable for embedded analytics     │ ║
║  │                                                             │ ║
║  │  ● Medium (1-10 million rows)                               │ ║
║  │     May require optimization, consider data summarization   │ ║
║  │                                                             │ ║
║  │  ○ High (> 10 million rows)                                 │ ║
║  │     Requires advanced techniques (BW, data tiering)         │ ║
║  │                                                             │ ║
║  │  [Show Detailed Hint 💡]                                    │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ ⚠ Constraints & Limitations                                 │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ • Cloud Public: Max 5M rows for real-time ALV reports       │ ║
║  │ • Performance: >2M rows requires CDS aggregation            │ ║
║  │ • Memory: Large datasets may hit 2GB session limit          │ ║
║  │ [Show All Constraints (5)]                                  │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ 📚 Real-World Examples                                       │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ Example 1: Sales Order Report (Manufacturing)               │ ║
║  │ • Volume: 8M rows/month                                     │ ║
║  │ • Solution: CDS view with data summarization → Level B      │ ║
║  │                                                             │ ║
║  │ Example 2: Invoice Aging Report (Retail)                    │ ║
║  │ • Volume: 500K rows/month                                   │ ║
║  │ • Solution: Standard Fiori app with filtering → Level A     │ ║
║  │                                                             │ ║
║  │ [Show All Examples (12)]                                    │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ 💾 Save as Draft: [Draft Name_____________]  [Save Draft]   │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║                                 [← Back]  [Cancel]  [Next Step →] ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 3.4 Step 4: Final Recommendation Screen

```
╔═══════════════════════════════════════════════════════════════════╗
║  SAP Clean Core Solution Advisor                    [User Menu ▼] ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Progress: ●━●━●━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4/5   ║
║            Step 4: Final Recommendation                           ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                 🎯 Recommended Clean Core Level              │ ║
║  │                                                             │ ║
║  │                          Level B                            │ ║
║  │              ┌─────────────────────────┐                    │ ║
║  │              │                         │                    │ ║
║  │              │    Clean Core with      │                    │ ║
║  │              │  Minimal Extensions     │                    │ ║
║  │              │                         │                    │ ║
║  │              └─────────────────────────┘                    │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ 📊 Scoring Dashboard                                         │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │                                                             │ ║
║  │ Technical Debt Score (TDS)                             32   │ ║
║  │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░ 🟢 Low                      │ ║
║  │                                                             │ ║
║  │ Cloud Readiness Score (CRS)                            78   │ ║
║  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 🟡 Good                     │ ║
║  │                                                             │ ║
║  │ Upgrade Impact Score (UIS)                             25   │ ║
║  │ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░ 🟢 Low                      │ ║
║  │                                                             │ ║
║  │ Composite Health Score (CHS)                           74   │ ║
║  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░ 🟡 Healthy                  │ ║
║  │                                                             │ ║
║  │ [View Detailed Breakdown]  [Show Radar Chart]              │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ 📝 Recommendation Summary                                    │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ Your analysis indicates that a Level B approach is optimal: │ ║
║  │                                                             │ ║
║  │ ✓ Use CDS views with data aggregation                       │ ║
║  │ ✓ Deploy as Fiori app with custom filtering                │ ║
║  │ ✓ Minimal ABAP coding required (< 200 lines)               │ ║
║  │ ⚠ Monitor performance with 5M+ row datasets                 │ ║
║  │ ⚠ Consider data archiving strategy for historical data     │ ║
║  │                                                             │ ║
║  │ Estimated Effort: 4-6 weeks                                 │ ║
║  │ Upgrade Impact: Minimal (standard SAP objects)              │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║                                 [← Back]  [Cancel]  [Save & View] ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 3.5 Step 5: Analysis Details (Object Page)

```
╔═══════════════════════════════════════════════════════════════════╗
║  SAP Clean Core Solution Advisor                    [User Menu ▼] ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ [← Back to List]    Analysis Details: R-0042-FIN            │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ╔═══════════════════════════════════════════════════════════╗  ║
║  ║ Monthly Revenue Analysis Report                           ║  ║
║  ║ RICEFW ID: R-0042-FIN                                     ║  ║
║  ╠═══════════════════════════════════════════════════════════╣  ║
║  ║ Recommended Level: B          Status: ⬤ Active            ║  ║
║  ║ Created: Oct 27, 2025         By: john.doe@acme.com       ║  ║
║  ╚═══════════════════════════════════════════════════════════╝  ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ [General] [Decision Path] [Scoring] [Export]                │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │                                                             │ ║
║  │ Section: Decision Path Flowchart                            │ ║
║  │                                                             │ ║
║  │  ┌─────────────────────────────────────────────────────┐   │ ║
║  │  │                                                     │   │ ║
║  │  │         ┌──────────────────────────┐                │   │ ║
║  │  │         │   Start: Reports         │                │   │ ║
║  │  │         └───────────┬──────────────┘                │   │ ║
║  │  │                     │                               │   │ ║
║  │  │                     ▼                               │   │ ║
║  │  │         ┌──────────────────────────┐                │   │ ║
║  │  │         │ Q1: Operational Report?  │                │   │ ║
║  │  │         └───────────┬──────────────┘                │   │ ║
║  │  │                     │ Yes                           │   │ ║
║  │  │                     ▼                               │   │ ║
║  │  │         ┌──────────────────────────┐                │   │ ║
║  │  │         │ Q2: Data Volume?         │                │   │ ║
║  │  │         └───────────┬──────────────┘                │   │ ║
║  │  │                     │ Medium (1-10M)                │   │ ║
║  │  │                     ▼                               │   │ ║
║  │  │         ┌──────────────────────────┐                │   │ ║
║  │  │         │ Q3: Real-time Required?  │                │   │ ║
║  │  │         └───────────┬──────────────┘                │   │ ║
║  │  │                     │ No                            │   │ ║
║  │  │                     ▼                               │   │ ║
║  │  │         ┌──────────────────────────┐                │   │ ║
║  │  │         │   Final: Level B         │                │   │ ║
║  │  │         └──────────────────────────┘                │   │ ║
║  │  │                                                     │   │ ║
║  │  │  [🔍 Zoom In] [🔎 Zoom Out] [📥 Export PNG/SVG]     │   │ ║
║  │  └─────────────────────────────────────────────────────┘   │ ║
║  │                                                             │ ║
║  │ Section: Scoring Breakdown                                  │ ║
║  │                                                             │ ║
║  │  ┌───────────────────┬───────────────────┬─────────────┐   │ ║
║  │  │ Metric            │ Score             │ Trend       │   │ ║
║  │  ├───────────────────┼───────────────────┼─────────────┤   │ ║
║  │  │ Technical Debt    │ 32 🟢 Low         │ ↓ -5 pts    │   │ ║
║  │  │ Cloud Readiness   │ 78 🟡 Good        │ ↑ +3 pts    │   │ ║
║  │  │ Upgrade Impact    │ 25 🟢 Low         │ → Stable    │   │ ║
║  │  │ Composite Health  │ 74 🟡 Healthy     │ ↑ +2 pts    │   │ ║
║  │  └───────────────────┴───────────────────┴─────────────┘   │ ║
║  │                                                             │ ║
║  │ Section: Export Options                                     │ ║
║  │                                                             │ ║
║  │  [📄 Export PDF Report]  [📊 Export Excel]                  │ ║
║  │  [🖼️ Export Flowchart (PNG)]  [📧 Email Report]            │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║                                    [Edit] [Delete] [Clone] [Share] ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 4. Screen-by-Screen Navigation

### 4.1 Launchpad (Home Screen)

**Route:** `/`

**Components:**
- SAP Fiori Launchpad Shell
- 4-6 Dynamic Tiles with live KPI data
- User menu with settings and logout

**Tiles:**
1. **Wizard Tile** - "Start New Analysis" (Action tile)
2. **Analyses Tile** - "View All Analyses" with count badge
3. **Analytics Tile** - "Dashboard" with CHS average
4. **Projects Tile** - "Manage Projects" (Admin only)

**Navigation Actions:**
- Click Wizard Tile → `/wizard/start`
- Click Analyses Tile → `/analyses`
- Click Analytics Tile → `/analytics`
- Click Project Tile → `/projects`

### 4.2 Wizard Module

#### Screen 4.2.1: Project Selection
**Route:** `/wizard/start`

**Fields:**
- Project dropdown (existing) or new project form
- Client name (text input)
- S/4HANA flavor (radio buttons)
- Compliance checkboxes
- BTP services checkboxes

**Actions:**
- Next → Validate form, navigate to `/wizard/object-info`
- Cancel → Return to launchpad

#### Screen 4.2.2: Object Information
**Route:** `/wizard/object-info`

**Fields:**
- Object type selector (6 radio buttons: R/I/C/E/F/W)
- RICEFW ID (text input with validation)
- Object name (text input)
- Object description (textarea)
- Business area (dropdown)
- Priority (radio buttons)

**Actions:**
- Back → `/wizard/start`
- Next → Call `startWizard` action, navigate to `/wizard/questions`
- Cancel → Confirm dialog, return to launchpad

#### Screen 4.2.3: Dynamic Questions
**Route:** `/wizard/questions?session={sessionId}`

**Components:**
- Question text (dynamic from backend)
- Answer radio buttons (dynamic from backend)
- Detailed hint popover
- Constraints panel (auto-loaded)
- Examples panel (auto-loaded)
- Save Draft button

**Actions:**
- Answer selection → Call `submitAnswer` action
  - If more questions → Reload with next question
  - If final answer → Navigate to `/wizard/recommendation`
- Back → Previous question (if available)
- Save Draft → Save session, return to launchpad
- Cancel → Confirm dialog, delete session, return to launchpad

#### Screen 4.2.4: Final Recommendation
**Route:** `/wizard/recommendation?session={sessionId}`

**Components:**
- Level badge (A/B/C/D with color coding)
- Scoring dashboard (4 progress bars)
- Recommendation summary (bullet points)
- Estimated effort
- Upgrade impact summary

**Actions:**
- Back → Return to last question
- Save & View → Create CleanCoreAnalysis, navigate to `/analyses/{id}`
- Cancel → Confirm dialog, delete session

### 4.3 Analyses Module

#### Screen 4.3.1: Analyses List (List Report)
**Route:** `/analyses`

**Components:**
- Search bar (by RICEFW ID, name)
- Filter panel (by level, object type, date range)
- Table with columns:
  - RICEFW ID
  - Object Name
  - Object Type
  - Recommended Level
  - Composite Health Score
  - Created Date
  - Created By
- Action buttons (Create, Export, Delete)

**Actions:**
- Click row → Navigate to `/analyses/{id}`
- Create → Navigate to `/wizard/start`
- Export → Download Excel with filtered data
- Delete → Confirm dialog, delete analysis

#### Screen 4.3.2: Analysis Details (Object Page)
**Route:** `/analyses/{id}`

**Sections:**
1. **General Tab**
   - Object details
   - Project information
   - Timestamps

2. **Decision Path Tab**
   - D3.js flowchart visualization
   - Zoom/pan controls
   - Export flowchart (PNG/SVG)

3. **Scoring Tab**
   - Detailed score breakdown table
   - Radar chart (optional)
   - Score trend comparison (if multiple analyses)

4. **Export Tab**
   - PDF report generation
   - Excel export
   - Email report

**Actions:**
- Edit → Navigate to `/wizard/edit/{id}` (resume session)
- Delete → Confirm dialog, delete analysis
- Clone → Create new wizard session with same project
- Share → Email dialog

### 4.4 Analytics Module

#### Screen 4.4.1: Analytics Dashboard
**Route:** `/analytics`

**Components:**
1. **KPI Tiles Row**
   - Total Analyses
   - Average TDS
   - Average CRS
   - Average CHS

2. **Level Distribution Chart** (Donut)
   - Count of analyses by level (A/B/C/D)
   - Clickable segments to filter

3. **Trend Analysis Chart** (Line)
   - Monthly analysis count
   - Average CHS over time

4. **Risk Matrix Chart** (Scatter)
   - X-axis: Cloud Readiness Score
   - Y-axis: Technical Debt Score
   - Bubble size: Upgrade Impact Score
   - Color: Clean Core Level

5. **Filters Panel**
   - Date range picker
   - Object type multi-select
   - Project selector

**Actions:**
- Export Dashboard → PDF/Excel
- Drill into chart → Filter analyses list
- Reset filters → Clear all filters

### 4.5 Administration Module (Admin Only)

#### Screen 4.5.1: User Management
**Route:** `/admin/users`

**Components:**
- User list table
- Role assignment
- Invite new user

#### Screen 4.5.2: Master Data Configuration
**Route:** `/admin/master-data`

**Components:**
- QuestionFlow editor
- PerformanceThreshold editor
- RealWorldExample editor
- CleanCoreLevels editor

---

## 5. User Personas and Workflows

### 5.1 Persona 1: Solution Architect (Primary User)

**Name:** Sarah Chen  
**Role:** SAP Solution Architect  
**Goal:** Evaluate clean core approach for 20 RICEFW objects

**Typical Workflow:**

1. **Morning Routine**
   - Login to launchpad
   - Review analytics dashboard
   - Check new analyses from team

2. **New Analysis Workflow**
   - Click "Start New Analysis" tile
   - Select existing project "S/4HANA Migration - Phase 2"
   - Enter RICEFW ID: `I-0015-SCM`
   - Object Type: Interfaces
   - Description: "EDI 856 ASN inbound interface"
   - Navigate through 7 questions:
     - Q1: Interface type? → EDI
     - Q2: Volume? → 5000 messages/day
     - Q3: Real-time? → Yes
     - Q4: Transformation complexity? → High
     - Q5: Partner count? → 50+ partners
     - Q6: Error handling? → Custom retry logic
     - Q7: Monitoring? → Custom dashboard
   - Review constraints (EDI adapter limitations)
   - Review examples (similar EDI integrations)
   - Final recommendation: **Level C** (Custom integration required)
   - Save analysis
   - Export PDF report for client presentation

3. **Analysis Review Workflow**
   - Open analyses list
   - Filter by "Interfaces" object type
   - Sort by Composite Health Score (ascending)
   - Identify high-risk analyses (CHS < 50)
   - Open analysis `I-0010-FIN`
   - Review decision flowchart
   - Compare with new analysis `I-0015-SCM`
   - Clone analysis for similar interface
   - Email report to development team

4. **Weekly Reporting**
   - Navigate to analytics dashboard
   - Export trend analysis chart
   - Include in weekly status report to steering committee

### 5.2 Persona 2: Developer/Consultant (Secondary User)

**Name:** Raj Patel  
**Role:** SAP ABAP Developer  
**Goal:** Implement clean core recommendations

**Typical Workflow:**

1. **Task Assignment**
   - Login to launchpad
   - Review assigned analyses (filtered by "Created By: sarah.chen")
   - Open analysis `R-0042-FIN`
   - Read recommendation summary
   - Note Level B approach requirements

2. **Implementation Research**
   - Review decision path to understand architect's reasoning
   - Check constraints panel for technical limitations
   - Review real-world examples for implementation patterns
   - Export flowchart for technical documentation

3. **Feedback Loop**
   - During implementation, discover additional constraints
   - Contact architect to re-run analysis with new information
   - Architect updates analysis → New recommendation: Level C
   - View updated scoring dashboard
   - Adjust implementation approach

### 5.3 Persona 3: Tenant Administrator (Power User)

**Name:** Maria Rodriguez  
**Role:** SAP Basis Administrator  
**Goal:** Manage tenant configuration and users

**Typical Workflow:**

1. **Tenant Setup**
   - Login to admin module
   - Configure company-specific constraints
   - Add custom performance thresholds for cloud deployment
   - Import real-world examples from previous projects

2. **User Management**
   - Invite new team members
   - Assign roles:
     - 3 Solution Architects → Full access
     - 10 Developers → Read-only access
   - Review audit logs for compliance

3. **Master Data Maintenance**
   - Update QuestionFlow for Enhancements (new SAP BTP options)
   - Add new compliance requirement (ISO 27001)
   - Archive old analyses (>2 years)

---

## Navigation Cheat Sheet

| From Screen | To Screen | Action | Route Change |
|------------|-----------|--------|--------------|
| Launchpad | Wizard Start | Click Wizard Tile | `/` → `/wizard/start` |
| Wizard Step 1 | Wizard Step 2 | Click Next | `/wizard/start` → `/wizard/object-info` |
| Wizard Step 2 | Wizard Step 3 | Click Next (calls startWizard) | `/wizard/object-info` → `/wizard/questions?session={id}` |
| Wizard Step 3 | Wizard Step 3 | Submit Answer (more questions) | Same route, data refresh |
| Wizard Step 3 | Wizard Step 4 | Submit Answer (final) | `/wizard/questions` → `/wizard/recommendation` |
| Wizard Step 4 | Analysis Details | Save & View | `/wizard/recommendation` → `/analyses/{id}` |
| Analyses List | Analysis Details | Click Row | `/analyses` → `/analyses/{id}` |
| Analysis Details | Analyses List | Back Button | `/analyses/{id}` → `/analyses` |
| Launchpad | Analytics | Click Analytics Tile | `/` → `/analytics` |
| Analytics | Analyses List | Drill into Chart | `/analytics` → `/analyses?filter={criteria}` |
| Any Screen | Launchpad | Shell Home Button | `*` → `/` |

---

## Key UI/UX Principles

1. **Progressive Disclosure:** Show constraints and examples only when relevant
2. **Contextual Help:** Detailed hints available on-demand (popover)
3. **Visual Feedback:** Color-coded scores (green/yellow/red)
4. **Save State:** Draft save at any wizard step
5. **Responsive Design:** Mobile-friendly layouts (Phase 3)
6. **Accessibility:** WCAG 2.1 AA compliance (keyboard navigation, screen reader support)
7. **Consistency:** SAP Fiori 3.0 design patterns throughout
8. **Performance:** Lazy loading for charts, paginated tables

---

**End of Document**
