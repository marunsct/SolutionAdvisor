namespace sd;

using {
    Country,
    Currency,
    Language,
    User,
    cuid,
    managed,
    temporal
} from '@sap/cds/common';

// ===============================
// Core Entities
// ===============================

/**
 * ProjectConfiguration - Stores comprehensive project setup information
 */
entity ProjectConfiguration : cuid, managed {
    // Basic Information
    clientName              : String(200) not null;
    projectName             : String(200) not null;
    projectType             : String(50) not null; // New Implementation, System Conversion, etc.
    expectedDuration        : Integer; // in months
    timeline                : Date not null;
    status                  : String(20) default 'Active'; // Active, Completed, Archived

    // Technical Configuration
    s4HanaFlavor            : String(50) not null; // Cloud Public, Private Cloud, On-Premise
    availableBTPServices    : String(1000); // Comma-separated list
    thirdPartyServices      : String(1000); // External systems and services

    // Governance & Compliance
    governanceModel         : String(50); // Centralized, Federated, Hybrid
    complianceRequirements  : String(500); // SOX, GDPR, FDA, etc.
    businessCriticality     : String(20); // Mission Critical, High, Medium, Low

    // Team & Resources
    technicalTeamSize       : Integer;
    budgetRange             : String(50); // Small, Medium, Large, Enterprise

    // Multi-tenancy
    tenant                  : String(36) not null; // Tenant UUID

    // Associations
    analyses                : Composition of many CleanCoreAnalysis
                                  on analyses.projectConfig = $self;
}

/**
 * CleanCoreAnalysis - Individual RICEFW object analysis results
 */
entity CleanCoreAnalysis : cuid, managed {
    // Association to Project
    projectConfig           : Association to ProjectConfiguration not null;

    // RICEFW Identification
    ricefwId                : String(10) not null @assert.format: '^[RICEFYW]-[0-9]{4}-[A-Z]{3}$';
    objectType              : String(50) not null;
    objectName              : String(200) not null;
    objectDescription       : String(1000);

    // Analysis Details
    analysisDate            : Date not null;
    status                  : String(20) default 'In Progress'; // In Progress, Completed, Approved, Rejected

    // Decision Results
    finalRecommendation     : String(10); // Level A, B, C, D
    finalReasoning          : String(2000);
    decisionFlowData        : String(5000); // JSON of decision path

    // Estimation & Risk
    estimatedEffort         : Integer; // in person-days
    riskAssessment          : String(20); // Low, Medium, High, Critical
    businessImpact          : String(500);
    technicalComplexity     : String(20); // Simple, Moderate, Complex, Very Complex
    complianceStatus        : String(20); // Compliant, Requires Review, Non-Compliant

    // Scoring Metrics (v2.0)
    technicalDebtScore      : Decimal(5, 2); // 0.00-100.00
    cloudReadinessScore     : Decimal(5, 2); // 0.00-100.00
    upgradeImpactScore      : Decimal(5, 2); // 0.00-100.00
    compositeHealthScore    : Decimal(5, 2); // 0.00-100.00

    // Export & Documentation
    exportedFlowchart       : String(500); // File path or URL

    // Review & Approval
    reviewedBy              : String(200);
    reviewComments          : String(1000);
    approvalRequired        : Boolean default false;
    approvedBy              : String(200);
    approvedDate            : Date;

    // Multi-tenancy
    tenant                  : String(36) not null;

    // Associations
    decisionPaths           : Composition of many DecisionPath
                                  on decisionPaths.analysis = $self;
    constraintsDisplayed    : Association to many ConstraintLog
                                  on constraintsDisplayed.analysis = $self;
    examplesViewed          : Association to many ExampleLog
                                  on examplesViewed.analysis = $self;
}

/**
 * DecisionPath - Tracks step-by-step decision journey
 */
entity DecisionPath : cuid, managed {
    // Association
    analysis                : Association to CleanCoreAnalysis not null;

    // Question & Answer
    questionId              : String(10) not null; // Q1, Q2, etc.
    questionText            : String(500) not null;
    selectedAnswer          : String(200) not null;
    answerIndex             : Integer; // Which option was selected (0-based)

    // User Interaction
    userComments            : String(1000); // Optional user notes
    hintsViewed             : Boolean default false;
    timeSpentSeconds        : Integer; // Time spent on this question

    // Sequence
    stepOrder               : Integer not null; // 1, 2, 3, ...

    // Metadata
    answeredAt              : DateTime;
    answeredBy              : String(200);
    tenant                  : String(36) not null;
}

/**
 * WizardSession - Store wizard session state for save/resume
 */
entity WizardSession : cuid, managed {
    // Associated Analysis
    analysis                : Association to CleanCoreAnalysis not null;

    // Session State
    currentStep             : Integer default 1;
    totalSteps              : Integer;
    currentQuestionId       : String(10);
    sessionStatus           : String(20) default 'Active'; // Active, Paused, Completed, Abandoned

    // Progress Tracking
    answeredPath            : String(5000); // JSON array of answered questions
    lastActivity            : DateTime;
    expiresAt               : DateTime; // Session expires after 24 hours of inactivity

    // User Context
    startedBy               : String(200);
    timeSpentTotal          : Integer; // Total time in seconds

    // Multi-tenancy
    tenant                  : String(36) not null;
}

// ===============================
// Master Data Entities
// ===============================

/**
 * QuestionFlow - Decision tree structure for each object type
 */
entity QuestionFlow : cuid, managed {
    // Question Identification
    questionId              : String(10) not null; // Q1, Q2, Q3, etc.
    objectType              : String(50) not null; // Reports, Interfaces, etc.

    // Question Content
    questionText            : String(500) not null;
    questionHint            : String(1000); // Short hint
    detailedHint            : String(2000); // Detailed explanation

    // Answer Configuration
    answerCount             : Integer not null; // How many answers available
    answerOptions           : String(2000); // JSON array of answer options

    // Navigation Rules
    navigationRules         : String(5000); // JSON defining next question or final answer

    // Performance Thresholds (v2.0)
    performanceContext      : String(1000); // JSON with relevant thresholds

    // Display
    displayOrder            : Integer;
    isActive                : Boolean default true;

    // Multi-tenancy (Shared master data)
    tenant                  : String(36); // NULL for global, or tenant-specific
}

/**
 * CleanCoreLevels - Defines the four clean core levels
 */
entity CleanCoreLevels : cuid {
    level                   : String(10) not null; // Level A, Level B, Level C, Level D
    levelName               : String(50) not null; // Fully Clean Core, Enhanced Clean Core, etc.
    description             : String(500);
    characteristics         : String(1000); // JSON array

    // Classification Criteria
    upgradeComplexity       : String(20); // None, Low, Medium, High, Very High
    maintenanceEffort       : String(20); // Low, Medium, High, Very High
    businessFlexibility     : String(20); // High, Medium, Low
    technicalRisk           : String(20); // Low, Medium, High, Critical
    cloudReadiness          : String(30); // Cloud Ready, Partially, Limited, Not Ready

    // Scoring Weights (v2.0)
    technicalDebtMultiplier : Decimal(3, 2); // 0.00-5.00
    cloudReadinessFactor    : Decimal(3, 2); // 0.00-1.00
    upgradeImpactMultiplier : Decimal(3, 2); // 0.00-5.00

    // Display
    isActive                : Boolean default true;
    displayOrder            : Integer;
}

/**
 * ObjectTypes - RICEFW object types with metadata
 */
entity ObjectTypes : cuid {
    objectType              : String(50) not null; // Reports, Interfaces, etc.
    objectCode              : String(1) not null; // R, I, C, E, F, W
    displayName             : String(100);
    description             : String(500);
    iconName                : String(50); // SAP icon name
    complexity              : String(20); // Low, Moderate, High
    avgAnalysisTime         : Integer; // in minutes
    questionCount           : Integer; // Number of questions in decision tree
    isActive                : Boolean default true;
}

/**
 * PerformanceThreshold - Performance thresholds and technical limitations
 */
entity PerformanceThreshold : cuid {
    category                : String(50) not null; // Integration, Reporting, Workflow, etc.
    method                  : String(100) not null; // OData API, Enhanced IDOC, etc.

    // Volume Thresholds
    volumeLimit             : Integer; // Records per operation
    sizeThreshold           : String(20); // e.g., "35MB", "5GB"
    frequencyLimit          : String(50); // Real-time, Hourly, Daily

    // Performance Metrics
    responseTimeTarget      : Integer; // milliseconds
    concurrencyLimit        : Integer; // concurrent operations

    // Clean Core Classification
    cleanCoreLevel          : String(10); // Level A, B, C, D

    // Guidance
    whenExceeded            : String(500); // What to do when threshold exceeded
    alternativeSolution     : String(500);

    // Context
    applicableObjectTypes   : String(200); // Comma-separated: R,I,C
    deploymentTypes         : String(200); // Cloud Public, On-Premise, etc.

    isActive                : Boolean default true;
}

/**
 * RealWorldExample - Real-world implementation examples
 */
entity RealWorldExample : cuid, managed {
    // Classification
    objectType              : String(50) not null;
    cleanCoreLevel          : String(10);
    scenario                : String(100); // E-commerce Integration, etc.
    industry                : String(50); // Retail, Manufacturing, etc.

    // Example Details
    title                   : String(200);
    challengeDescription    : String(1000);
    solutionDescription     : String(2000);
    technologiesUsed        : String(500); // JSON array
    implementation          : String(2000); // Implementation details

    // Metrics & Results
    volumeHandled           : String(100);
    performanceAchieved     : String(200);
    implementationTime      : String(50);
    lessonsLearned          : String(1000);

    // Context Matching
    keywords                : String(500); // Space-separated for matching

    isActive                : Boolean default true;
    approvedBy              : String(200);
    approvedDate            : Date;
}

// ===============================
// Logging Entities
// ===============================

/**
 * ConstraintLog - Track which constraints were displayed during analysis
 */
entity ConstraintLog : cuid {
    analysis                : Association to CleanCoreAnalysis;
    constraintType          : String(50); // Performance, Regulatory, Technical
    constraintDescription   : String(500);
    displayedAt             : DateTime;
    tenant                  : String(36) not null;
}

/**
 * ExampleLog - Track which real-world examples were viewed
 */
entity ExampleLog : cuid {
    analysis                : Association to CleanCoreAnalysis;
    example                 : Association to RealWorldExample;
    viewedAt                : DateTime;
    relevanceRating         : Integer; // 1-5 stars, optional user feedback
    tenant                  : String(36) not null;
// Project Configuration entity
entity ProjectConfiguration : cuid, managed {
  clientName               : String(200) not null;
  projectName              : String(200) not null;
  projectType              : String(50) not null;
  expectedDuration         : Integer;
  timeline                 : Date not null;
  status                   : String(20) default 'Active';
  
  s4HanaFlavor             : String(50) not null;
  availableBTPServices     : String(1000);
  thirdPartyServices       : String(1000);
  
  governanceModel          : String(50);
  complianceRequirements   : String(500);
  businessCriticality      : String(20);
  
  technicalTeamSize        : Integer;
  budgetRange              : String(50);
  
  tenant                   : String(36) not null;
  
  analyses                 : Composition of many CleanCoreAnalysis on analyses.projectConfig = $self;
}

// Clean Core Analysis entity
entity CleanCoreAnalysis : cuid, managed {
  projectConfig            : Association to ProjectConfiguration not null;
  
  ricefwId                 : String(10) not null;
  objectType               : String(50) not null;
  objectName               : String(200) not null;
  objectDescription        : String(1000);
  
  analysisDate             : Date not null;
  status                   : String(20) default 'In Progress';
  
  finalRecommendation      : String(10);
  finalReasoning           : String(2000);
  decisionFlowData         : String(5000);
  
  estimatedEffort          : Integer;
  riskAssessment           : String(20);
  businessImpact           : String(500);
  technicalComplexity      : String(20);
  complianceStatus         : String(20);
  
  technicalDebtScore       : Decimal(5,2);
  cloudReadinessScore      : Decimal(5,2);
  upgradeImpactScore       : Decimal(5,2);
}
