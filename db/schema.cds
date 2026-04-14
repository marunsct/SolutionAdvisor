namespace sd;

using {
    cuid,
    managed
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
    projectUsers            : Composition of many ProjectUsers
                                  on projectUsers.project = $self;
}

/**
 * ProjectUsers - User access management per project
 */
entity ProjectUsers : cuid, managed {
    project                 : Association to ProjectConfiguration not null;
    userId                  : String(255) not null;
    userEmail               : String(255);
    userName                : String(255);
    role                    : String(50) not null; // SolutionArchitect, Developer
    accessLevel             : String(50) default 'Read'; // Read, Write, Admin
    tenant                  : String(36) not null;
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

    // Business Context (Step 2 of Wizard)
    businessArea            : Association to BusinessAreas; // Optional - S/4HANA module
    complexity              : String(20); // Simple, Medium, High, Very High - Optional

    // Analysis Details
    analysisDate            : Date not null;
    status                  : String(20) default 'In Progress'; // In Progress, Completed, Approved, Rejected

    // Decision Results
    // Note: May contain descriptive approach + level (e.g., "Event-Driven Integration - Level A")
    finalRecommendation     : String(200); // e.g., "Event-Driven Integration - Level A"
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
    draftName               : String(200); // Optional user-friendly name for saved draft

    // Multi-tenancy
    tenant                  : String(36) not null;
}

// ===============================
// Master Data Entities
// ===============================

/**
 * BusinessAreas - Master data for S/4HANA modules/business areas
 */
entity BusinessAreas : cuid, managed {
    code                    : String(10) not null; // SD, MM, HR, FA, CO, FI, PP, QM, PM, CS
    displayName             : String(100) not null; // Sales and Distribution, Material Management, etc.
    description             : String(500);
    category                : String(50); // Core Finance, Sales & Procurement, Production & Logistics, etc.
    icon                    : String(50); // SAP icon name
    isActive                : Boolean default true;
    displayOrder            : Integer;
}

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
 * CleanCoreGuidance - Comprehensive guidance content for each RICEFW type
 * Stores rich educational content from markdown files for display in Step 3
 */
@cds.autoexpose
entity CleanCoreGuidance : cuid, managed {
    key ricefwType          : String(1); // 'R', 'I', 'C', 'E', 'F', 'W'
        title               : String(255); // e.g., "Clean Core Levels A–D for SAP Report Design"
        introduction        : LargeString; // Introduction paragraph with "Why Clean Core?" section
        apiExplanation      : LargeString; // "What is an API in SAP?" section (for R, I types)
        // Storing structured content as stringified JSON is flexible
        decisionTree        : LargeString; // JSON array for the decision tree table
        determinationFactors : LargeString; // JSON array for the factors table
        performanceThresholds: LargeString; // JSON array for the thresholds table
        deploymentConstraints: LargeString; // Simple text or markdown (bullet list)
        realWorldScenarios  : LargeString; // JSON array for scenarios section
        officialGuidance    : LargeString; // JSON array for the guidance table
        strategyMatrix      : LargeString; // JSON array for the strategy matrix table
        // Additional content sections
        summaryTable        : LargeString; // Summary table at the end (markdown or JSON)
        designGuidance      : LargeString; // "Design Guidance" section (numbered list)
        beginnerFaq         : LargeString; // "Beginner FAQ" section (Q&A format)
}

/**
 * CleanCoreLevels - Defines the four clean core levels with detailed educational content
 */
entity CleanCoreLevels : cuid, managed {
    key level               : String(1); // 'A', 'B', 'C', 'D'
    key ricefwType          : String(1); // 'R', 'I', 'C', 'E', 'F', 'W'
        title               : String(100); // e.g., "Level A – "Cleanest" (Gold Standard)"
        levelName           : String(50); // Fully Clean Core, Enhanced Clean Core, etc.
        
        // Detailed level information from markdown files
        whatItMeans         : LargeString; // "What it means" section
        beginnerAnalogy     : LargeString; // "Beginner Analogy" section
        toolsUsed           : LargeString; // "Tools You Use" section (bullet list)
        exampleReport       : LargeString; // "Example Report" or "Example Interface" section
        whyReasoning        : LargeString; // "Why it's best/acceptable/risky/bad" section
        
        // Summary table columns
        description         : LargeString;
        technology          : LargeString;
        characteristics     : String(1000); // JSON array

    // Classification Criteria
    upgradeComplexity       : String(50); // None, Low, Medium, High, Very High
    maintenanceEffort       : String(50); // Low, Medium, High, Very High
    businessFlexibility     : String(20); // High, Medium, Low
    technicalRisk           : String(50); // Low, Medium, High, Critical
    cloudReadiness          : String(50); // Cloud Ready, Partially, Limited, Not Ready

    // Scoring Weights (v2.0)
    technicalDebtMultiplier : Decimal(3, 2); // 0.00-5.00
    cloudReadinessFactor    : Decimal(3, 2); // 0.00-1.00
    upgradeImpactMultiplier : Decimal(3, 2); // 0.00-5.00

    // Display
    isActive                : Boolean default true;
    displayOrder            : Integer;
    
    // Link to the parent guidance document
    guidance                : Association to CleanCoreGuidance on guidance.ricefwType = ricefwType;
}

/**
 * ObjectTypes - RICEFW object types with metadata
 */
entity ObjectTypes : cuid, managed {
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
entity PerformanceThreshold : cuid, managed {
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
@cds.autoexpose
entity RealWorldExample : cuid, managed {
    key exampleId           : String(10);
        title               : String(255);
        scenario            : LargeString; // The scenario description
        design              : LargeString; // The design/solution approach
        whyLevel            : LargeString; // Why it's classified at this level
        problemStatement    : LargeString; // Additional problem statement (from scenarios)
        solutionDescription : LargeString; // Additional solution details
        outcome             : LargeString; // Outcome/benefit of the solution
        
        // Classification
        associatedLevel     : String(1); // A, B, C, D
        industry            : String(100);
        businessBenefit     : LargeString;
        ricefwType          : String(1); // R, I, C, E, F, W
        objectType          : String(50);
        
        // Legacy fields for backward compatibility
        challengeDescription : String(1000);
        technologiesUsed    : String(500); // JSON array
        implementation      : String(2000); // Implementation details
        volumeHandled       : String(100);
        performanceAchieved : String(200);
        implementationTime  : String(50);
        lessonsLearned      : String(1000);
        keywords            : String(500); // Space-separated for matching
        
        isActive            : Boolean default true;
        approvedBy          : String(200);
        approvedDate        : Date;
}

// ===============================
// Logging Entities
// ===============================

/**
 * ConstraintLog - Track which constraints were displayed during analysis
 */
entity ConstraintLog : cuid, managed {
    analysis                : Association to CleanCoreAnalysis;
    constraintType          : String(50); // Performance, Regulatory, Technical
    constraintDescription   : String(500);
    displayedAt             : DateTime;
    tenant                  : String(36) not null;
}

/**
 * ExampleLog - Track which real-world examples were viewed
 */
entity ExampleLog : cuid, managed {
    analysis                : Association to CleanCoreAnalysis;
    example                 : Association to RealWorldExample;
    viewedAt                : DateTime;
    relevanceRating         : Integer; // 1-5 stars, optional user feedback
    tenant                  : String(36) not null;
}

/**
 * AuditLog - Comprehensive immutable audit trail for compliance and security
 * Enterprise-grade logging for GDPR, SOX, FDA, HIPAA compliance
 * 
 * Features:
 * - Immutable records (@readonly fields prevent modification)
 * - Granular change tracking (field-level before/after values)
 * - Multi-dimensional event classification
 * - Regulatory compliance flags and retention policies
 * - Performance metrics and distributed tracing support
 * 
 * Retention: 7 years default (configurable per compliance framework)
 */
entity AuditLog : cuid, managed {
    // Event Classification
    eventType               : String(50) not null @readonly; 
    // Types: AUTH, DATA_CHANGE, EXPORT, CONSTRAINT_VIOLATION, CONFIG_CHANGE, SECURITY,
    //        RATE_LIMIT, ROLE_MANAGEMENT, WIZARD_OPERATION, ANALYSIS_OPERATION
    
    eventCategory           : String(30) not null @readonly default 'DATA_CHANGE';
    // Categories: DATA_CHANGE, SECURITY_EVENT, BUSINESS_OPERATION, 
    //             CONFIGURATION_CHANGE, SYSTEM_EVENT, USER_MANAGEMENT
    
    entityType              : String(100) not null @readonly; // CleanCoreAnalysis, ProjectConfiguration, User, etc.
    entityId                : String(255) not null @readonly;
    entityKey               : String(255); // Business key (ricefwId, clientName, etc.)
    
    // User Context
    userId                  : String(255) not null @readonly;
    userName                : String(255) @readonly;
    userEmail               : String(255) @readonly;
    userRole                : String(100) @readonly; // Role at time of action
    
    // Action Details
    action                  : String(50) not null @readonly; // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT_PDF, etc.
    operation               : String(20) @readonly; // CREATE, UPDATE, DELETE, READ (for consistency)
    timestamp               : DateTime not null @readonly default $now;
    
    // Granular Change Tracking (for DATA_CHANGE events)
    fieldName               : String(100); // Specific field changed
    oldValue                : LargeString; // JSON-serialized old value
    newValue                : LargeString; // JSON-serialized new value
    changeReason            : LargeString; // Business justification
    
    // Request Context
    ipAddress               : String(50) @readonly;
    ipCountry               : String(2); // ISO country code from GeoIP lookup
    userAgent               : String(500) @readonly;
    sessionId               : String(100) @readonly;
    httpMethod              : String(10); // GET, POST, PUT, DELETE, PATCH
    requestPath             : String(500); // OData path or API endpoint
    httpStatusCode          : Integer; // HTTP response code
    
    // Multi-tenancy
    tenantId                : String(36) @readonly;
    
    // Event Details (JSON)
    details                 : String(5000); // JSON string containing before/after values, violations, etc.
    additionalInfo          : LargeString; // Extended context data
    
    // Severity
    severity                : String(20) @readonly default 'INFO'; // DEBUG, INFO, WARNING, ERROR, CRITICAL
    
    // Compliance & Regulatory
    isPersonalData          : Boolean default false @readonly; // GDPR compliance flag
    isFinancialData         : Boolean default false @readonly; // SOX compliance flag
    isRegulatedData         : Boolean default false @readonly; // FDA/GxP/HIPAA flag
    isCriticalOperation     : Boolean default false @readonly; // Requires approval/review
    dataRetentionYears      : Integer default 7; // Legal retention period
    complianceFramework     : String(100); // GDPR, SOX, FDA, HIPAA, ISO 27001
    regulatoryArticle       : String(200); // Specific regulation (e.g., "GDPR Art. 17", "SOX Section 302")
    
    // Workflow & Traceability
    workflowId              : String(36); // Business process instance ID
    correlationId           : String(100) @readonly; // Distributed tracing correlation ID
    parentEventId           : String(36); // Link to parent audit event (cascading operations)
    
    // Performance Metrics
    durationMs              : Integer; // Operation duration in milliseconds
    affectedRecords         : Integer default 1; // Number of records affected (batch operations)
    dbQueryCount            : Integer; // Database query count (performance monitoring)
    
    // Review & Alerting
    requiresReview          : Boolean default false; // Manual review required flag
    reviewedBy              : String(255); // Compliance officer ID
    reviewedAt              : DateTime; // Review timestamp
    reviewNotes             : LargeString; // Compliance review findings
    alertTriggered          : Boolean default false; // Alert sent to compliance team
}

// ===============================
// Notification Entities for Fiori Launchpad Shell
// ===============================

/**
 * UserNotifications - Store notifications for Fiori Launchpad shell
 * Consumed by FLP Notification service
 */
entity UserNotifications : cuid, managed {
    // User & Tenant
    userId                  : String(255) not null; // User ID from authentication
    tenant                  : String(36) not null; // Tenant UUID
    
    // Notification Content
    notificationType        : String(50) not null; // ANALYSIS_COMPLETED, WIZARD_SESSION_SAVED, HIGH_TECHNICAL_DEBT, etc.
    title                   : String(255) not null;
    description             : LargeString;
    
    // Classification
    severity                : String(20) not null default 'info'; // info, warning, error
    priority                : String(20) default 'Medium'; // Low, Medium, High, Critical
    
    // State
    isRead                  : Boolean default false;
    readAt                  : DateTime;
    
    // Linking & Actions
    relatedEntityId         : String(36); // ID of related CleanCoreAnalysis, WizardSession, etc.
    relatedEntityType       : String(50); // CleanCoreAnalysis, WizardSession, RealWorldExample
    actionUrl               : String(500); // Deep link URL for FLP navigation
    actionText              : String(100) default 'View Details';
    
    // Metadata
    expiresAt               : DateTime; // Auto-delete after this date
    groupKey                : String(100); // For grouping related notifications
}

// ===============================
// Analytical Views (HANA Calculation Views)
// ===============================

/**
 * CV_ANALYSIS_AGGREGATES - Aggregated metrics for clean core analyses
 * Optimized for dashboard KPIs and multi-dimensional reporting
 */
@cds.persistence.skip: false
define view CV_ANALYSIS_AGGREGATES as
    select from CleanCoreAnalysis {
        // Dimensions
        key tenant,
        key projectConfig.ID                             as project_ID,
        key objectType                                   as objectType_typeCode,
        key finalRecommendation                          as recommendedLevel,
        key status,
        key riskAssessment                               as riskLevel,

        // Measures - Aggregated Scores
        avg(technicalDebtScore)                      as avgTechnicalDebt      : Integer,
        avg(cloudReadinessScore)                     as avgCloudReadiness     : Integer,
        avg(upgradeImpactScore)                      as avgUpgradeImpact      : Integer,
        avg(compositeHealthScore)                    as avgCompositeHealth    : Integer,

        // Measures - Counts
        count(*)                                     as totalAnalyses         : Integer,
        min(compositeHealthScore)                    as minCompositeHealth    : Integer,
        max(compositeHealthScore)                    as maxCompositeHealth    : Integer,

        // Health Distribution
        sum(case when compositeHealthScore >= 80 then 1 else 0 end) 
                                                     as countExcellent        : Integer,
        sum(case when compositeHealthScore >= 60 and compositeHealthScore < 80 then 1 else 0 end)
                                                     as countGood             : Integer,
        sum(case when compositeHealthScore >= 40 and compositeHealthScore < 60 then 1 else 0 end)
                                                     as countModerate         : Integer,
        sum(case when compositeHealthScore < 40 then 1 else 0 end)
                                                     as countPoor             : Integer,

        // Risk Distribution
        sum(case when riskAssessment = 'High' then 1 else 0 end)
                                                     as countHighRisk         : Integer,
        sum(case when riskAssessment = 'Critical' then 1 else 0 end)
                                                     as countCriticalRisk     : Integer
    }
    group by
        tenant,
        projectConfig.ID,
        objectType,
        finalRecommendation,
        status,
        riskAssessment;

/**
 * CV_RICEFW_DISTRIBUTION - Distribution analysis across RICEFW object types
 * Includes level breakdowns and score comparisons by type
 */
@cds.persistence.skip: false
define view CV_RICEFW_DISTRIBUTION as
    select from CleanCoreAnalysis {
        // Dimensions
        key tenant,
        key objectType                                   as objectType_typeCode,
        key finalRecommendation                          as recommendedLevel,
        key status,
        key projectConfig.ID                             as project_ID,

        // Measures - Counts
        count(*)                                     as countByType           : Integer,

        // Measures - Score Averages by Type
        avg(technicalDebtScore)                      as avgTechnicalDebt      : Integer,
        avg(cloudReadinessScore)                     as avgCloudReadiness     : Integer,
        avg(upgradeImpactScore)                      as avgUpgradeImpact      : Integer,
        avg(compositeHealthScore)                    as avgCompositeHealth    : Integer,

        // Measures - Min/Max
        min(compositeHealthScore)                    as minHealthScore        : Integer,
        max(compositeHealthScore)                    as maxHealthScore        : Integer,

        // Level Distribution within Type (extract from finalRecommendation)
        sum(case when finalRecommendation like '%Level A%' then 1 else 0 end)
                                                     as countLevelA           : Integer,
        sum(case when finalRecommendation like '%Level B%' then 1 else 0 end)
                                                     as countLevelB           : Integer,
        sum(case when finalRecommendation like '%Level C%' then 1 else 0 end)
                                                     as countLevelC           : Integer,
        sum(case when finalRecommendation like '%Level D%' then 1 else 0 end)
                                                     as countLevelD           : Integer
    }
    group by
        tenant,
        objectType,
        finalRecommendation,
        status,
        projectConfig.ID;

/**
 * CV_TREND_ANALYSIS - Time-series trending of analyses over time
 * Supports trend analysis, moving averages, and temporal grouping
 */
@cds.persistence.skip: false
define view CV_TREND_ANALYSIS as
    select from CleanCoreAnalysis {
        // Dimensions
        key tenant,
        key projectConfig.ID                             as project_ID,
        
        // Date Hierarchy (calculated in service layer for better compatibility)
        key cast(year(analysisDate) as Integer)          as year                  : Integer,
        key cast(month(analysisDate) as Integer)         as month                 : Integer,
        
        key objectType                                   as objectType_typeCode,
        key finalRecommendation                          as recommendedLevel,
        key status,
        key riskAssessment                               as riskLevel,

        // Measures - Counts
        count(*)                                     as analysisCount         : Integer,

        // Measures - Score Averages per Period
        avg(technicalDebtScore)                      as avgTechnicalDebt      : Integer,
        avg(cloudReadinessScore)                     as avgCloudReadiness     : Integer,
        avg(upgradeImpactScore)                      as avgUpgradeImpact      : Integer,
        avg(compositeHealthScore)                    as avgCompositeHealth    : Integer,

        // Measures - Sums for Moving Average Calculation
        sum(technicalDebtScore)                      as sumTechnicalDebt      : Integer,
        sum(cloudReadinessScore)                     as sumCloudReadiness     : Integer,
        sum(upgradeImpactScore)                      as sumUpgradeImpact      : Integer,
        sum(compositeHealthScore)                    as sumCompositeHealth    : Integer,

        // Measures - Min/Max per Period
        min(compositeHealthScore)                    as minCompositeHealth    : Integer,
        max(compositeHealthScore)                    as maxCompositeHealth    : Integer,

        // Trend Indicators
        sum(case when compositeHealthScore >= 70 then 1 else 0 end)
                                                     as countImproving        : Integer,
        sum(case when compositeHealthScore < 40 then 1 else 0 end)
                                                     as countDeclining        : Integer,
        sum(case when riskAssessment in ('High', 'Critical') then 1 else 0 end)
                                                     as countHighRisk         : Integer
    }
    group by
        tenant,
        projectConfig.ID,
        year(analysisDate),
        month(analysisDate),
        objectType,
        finalRecommendation,
        status,
        riskAssessment;

/**
 * CV_PROJECT_DASHBOARD - Comprehensive project-level KPIs
 * Combines projects, analyses, and wizard sessions for executive dashboards
 */
@cds.persistence.skip: false
define view CV_PROJECT_DASHBOARD as
    select from ProjectConfiguration as projects
    left join CleanCoreAnalysis as analyses
        on analyses.projectConfig.ID = projects.ID
    left join WizardSession as sessions
        on sessions.analysis.ID = analyses.ID
    {
        // Project Dimensions (Primary Key)
        key projects.tenant,
        key projects.ID                                  as project_ID,
        projects.projectName,
        projects.clientName,
        projects.s4HanaFlavor,
        projects.businessCriticality,
        projects.status                              as projectStatus,
        projects.createdAt                           as projectCreatedAt,

        // KPI Measures - Counts
        count(distinct analyses.ID)                  as totalAnalyses         : Integer,
        count(distinct sessions.ID)                  as totalSessions         : Integer,

        // KPI Measures - Score Averages
        avg(analyses.technicalDebtScore)             as projectAvgTechnicalDebt    : Integer,
        avg(analyses.cloudReadinessScore)            as projectAvgCloudReadiness   : Integer,
        avg(analyses.upgradeImpactScore)             as projectAvgUpgradeImpact    : Integer,
        avg(analyses.compositeHealthScore)           as projectAvgHealth           : Integer,

        // KPI Measures - Min/Max
        min(analyses.compositeHealthScore)           as minHealthScore        : Integer,
        max(analyses.compositeHealthScore)           as maxHealthScore        : Integer,

        // Level Distribution (extract from finalRecommendation)
        sum(case when analyses.finalRecommendation like '%Level A%' then 1 else 0 end)
                                                     as countLevelA           : Integer,
        sum(case when analyses.finalRecommendation like '%Level B%' then 1 else 0 end)
                                                     as countLevelB           : Integer,
        sum(case when analyses.finalRecommendation like '%Level C%' then 1 else 0 end)
                                                     as countLevelC           : Integer,
        sum(case when analyses.finalRecommendation like '%Level D%' then 1 else 0 end)
                                                     as countLevelD           : Integer,

        // Status Distribution
        sum(case when analyses.status = 'Approved' then 1 else 0 end)
                                                     as countApproved         : Integer,
        sum(case when analyses.status = 'In Review' then 1 else 0 end)
                                                     as countInReview         : Integer,
        sum(case when analyses.status = 'Draft' then 1 else 0 end)
                                                     as countDraft            : Integer,

        // Risk Distribution
        sum(case when analyses.riskAssessment = 'Critical' then 1 else 0 end)
                                                     as countCriticalRisk     : Integer,
        sum(case when analyses.riskAssessment = 'High' then 1 else 0 end)
                                                     as countHighRisk         : Integer,

        // Session Metrics
        sum(case when sessions.sessionStatus = 'Completed' then 1 else 0 end)
                                                     as countCompletedSessions : Integer,
        sum(case when sessions.sessionStatus = 'Active' then 1 else 0 end)
                                                     as countActiveSessions   : Integer
    }
    group by
        projects.tenant,
        projects.ID,
        projects.projectName,
        projects.clientName,
        projects.s4HanaFlavor,
        projects.businessCriticality,
        projects.status,
        projects.createdAt;

