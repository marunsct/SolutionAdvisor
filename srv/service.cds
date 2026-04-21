using {sd as my} from '../db/schema';

@path    : '/service/SolutionAdvisorSvcs'
@requires: 'authenticated-user'
service solutionAdvisorService {

    // ===============================
    // Core Entities
    // ===============================

    // Projects entity - NOT draft-enabled to avoid composition conflict with draft-enabled Analyses
    @restrict: [
        {
            grant: '*',
            to   : ['Admin', 'TenantAdmin']
        },
        {
            grant: ['READ', 'UPDATE'],
            to   : 'ProjectAdmin'
        },
        {
            grant: ['READ', 'CREATE', 'UPDATE'],
            to   : 'SolutionArchitect'
        },
        {
            grant: 'READ',
            to   : ['Developer', 'Viewer']
        }
    ]
    entity Projects              as projection on my.ProjectConfiguration;

    // Analyses entity - draft-enabled for user workflow
    // ABAC enforcement for ownership is implemented in service.js handlers
    @cds.redirection.target
    @odata.draft.enabled
    @odata.draft.bypass  // Allow direct modifications of active instances (e.g., saving completed analysis)
    @restrict: [
        {
            grant: '*',
            to   : ['Admin', 'TenantAdmin']
        },
        {
            grant: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
            to   : 'SolutionArchitect'
            // ABAC: Users can only edit/delete their own analyses (enforced in service.js)
        },
        {
            grant: ['READ', 'CREATE'],
            to   : 'Developer'
            // ABAC: Users can only edit/delete their own analyses (enforced in service.js)
        },
        {
            grant: 'READ',
            to   : 'Viewer'
        }
    ]
    entity Analyses              as projection on my.CleanCoreAnalysis;

    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity DecisionPaths         as projection on my.DecisionPath;

    @restrict: [{
        grant: '*',
        to   : 'authenticated-user'
    }]
    entity WizardSessions        as projection on my.WizardSession;

    // ===============================
    // Master Data Entities
    // ===============================

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity QuestionFlows         as projection on my.QuestionFlow;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity CleanCoreLevels       as projection on my.CleanCoreLevels;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity ObjectTypes           as projection on my.ObjectTypes;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity BusinessAreas         as projection on my.BusinessAreas;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity PerformanceThresholds as projection on my.PerformanceThreshold;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity RealWorldExamples     as projection on my.RealWorldExample;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity CleanCoreGuidance     as projection on my.CleanCoreGuidance;

    // ===============================
    // Logging Entities
    // ===============================

    @restrict: [{
        grant: [
            'READ',
            'CREATE'
        ],
        to   : 'authenticated-user'
    }]
    entity ConstraintLogs        as projection on my.ConstraintLog;

    @restrict: [{
        grant: [
            'READ',
            'CREATE'
        ],
        to   : 'authenticated-user'
    }]
    entity ExampleLogs           as projection on my.ExampleLog;

    // ===============================
    // Analytical Views (Read-Only)
    // ===============================

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : ['Admin', 'TenantAdmin', 'SolutionArchitect', 'Viewer', 'ServiceProviderAdmin']
    }]
    entity AnalysisAggregates    as projection on my.CV_ANALYSIS_AGGREGATES;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : ['Admin', 'TenantAdmin', 'SolutionArchitect', 'Viewer', 'ServiceProviderAdmin']
    }]
    entity RicefwDistribution    as projection on my.CV_RICEFW_DISTRIBUTION;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : ['Admin', 'TenantAdmin', 'SolutionArchitect', 'Viewer', 'ServiceProviderAdmin']
    }]
    entity TrendAnalysis         as projection on my.CV_TREND_ANALYSIS;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : ['Admin', 'TenantAdmin', 'SolutionArchitect', 'Viewer', 'ServiceProviderAdmin']
    }]
    entity ProjectDashboard      as projection on my.CV_PROJECT_DASHBOARD;

    // ===============================
    // Notification Entities (FLP Shell Integration)
    // ===============================

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity Notifications         as projection on my.UserNotifications;

    // Project Users for access management
    @restrict: [
        {
            grant: '*',
            to   : 'TenantAdmin'
        },
        {
            grant: [
                'READ',
                'CREATE',
                'DELETE'
            ],
            to   : 'SolutionArchitect'
        }
    ]
    entity ProjectUsers          as projection on my.ProjectUsers;

    // ===============================
    // Custom Actions & Functions
    // ===============================

    /**
     * Start a new wizard session for an analysis
     */
    action   startWizard(projectID: String, ricefwId: String, objectType: String, objectName: String, businessArea_ID: String, complexity: String)    returns {
        sessionID     : String;
        analysisID    : String;
        firstQuestion : {
            questionId    : String;
            questionText  : String;
            answerOptions : String;
            hint          : String;
        };
    };

    /**
     * Submit an answer and get the next question
     */
    action   submitAnswer(sessionID: String, questionId: String, selectedAnswer: String, answerIndex: Integer, userComments: String, timeSpent: Integer) returns {
        nextQuestion   : {
            questionId    : String;
            questionText  : String;
            answerOptions : String;
            hint          : String;
        };
        isComplete     : Boolean;
        recommendation : String;
        reasoning      : String;
        scores         : {
            technicalDebt   : Decimal(5, 2);
            cloudReadiness  : Decimal(5, 2);
            upgradeImpact   : Decimal(5, 2);
            compositeHealth : Decimal(5, 2);
        };
    };

    /**
     * Get relevant performance thresholds for current context
     */
    function getRelevantConstraints(objectType: String, deploymentType: String, volumeLevel: String)                                                     returns array of {
        category  : String;
        method    : String;
        threshold : String;
        level     : String;
        guidance  : String;
    };

    /**
     * Get contextual real-world examples
     */
    function getContextualExamples(objectType: String, scenario: String, keywords: String)                                                               returns array of {
        title     : String;
        scenario  : String;
        challenge : String;
        solution  : String;
        level     : String;
    };

    /**
     * Calculate scores for an analysis
     */
    function calculateScores(analysisID: String)                                                                                                         returns {
        technicalDebt   : Decimal(5, 2);
        cloudReadiness  : Decimal(5, 2);
        upgradeImpact   : Decimal(5, 2);
        compositeHealth : Decimal(5, 2);
    };

    /**
     * Recalculate and update scores for an existing analysis
     */
    action   recalculateScores(analysisID: String)                                                                                                       returns {
        success             : Boolean;
        message             : String;
        technicalDebt       : Decimal(5, 2);
        cloudReadiness      : Decimal(5, 2);
        upgradeImpact       : Decimal(5, 2);
        compositeHealth     : Decimal(5, 2);
        riskAssessment      : String;
        complianceStatus    : String;
        technicalComplexity : String;
        estimatedEffort     : String;
        businessImpact      : String;
    };

    /**
     * Batch recalculate scores for multiple analyses (optimized for performance)
     * Uses parallel processing and batch operations to update large datasets efficiently
     */
    action   batchRecalculateScores(analysisIDs: array of String)                                                                                       returns {
        success         : Boolean;
        message         : String;
        totalProcessed  : Integer;
        successCount    : Integer;
        failedCount     : Integer;
        durationMs      : Integer;
        results         : array of {
            analysisID      : String;
            ricefwId        : String;
            success         : Boolean;
            technicalDebt   : Decimal(5, 2);
            cloudReadiness  : Decimal(5, 2);
            upgradeImpact   : Decimal(5, 2);
            compositeHealth : Decimal(5, 2);
            error           : String;
        };
    };

    /**
     * Resume a paused wizard session
     */
    action   resumeWizard(sessionID: String)                                                                                                             returns {
        currentQuestion : {
            questionId    : String;
            questionText  : String;
            answerOptions : String;
            hint          : String;
        };
        progress        : {
            currentStep  : Integer;
            totalSteps   : Integer;
            answeredPath : String;
        };
    };

    /**
     * Export decision flowchart
     */
    action   exportFlowchart(analysisID: String, format: String)                                                                                         returns {
        downloadUrl : String;
        filename    : String;
    };

    /**
     * Assign user to project
     */
    action   assignUserToProject(projectId: String,
                                 userId: String,
                                 userEmail: String,
                                 userName: String,
                                 role: String)                                                                                                           returns {
        ID      : String;
        message : String;
    };

    /**
     * Remove user from project
     */
    action   removeUserFromProject(projectUserId: String)                                                                                                returns {
        success : Boolean;
        message : String;
    };

    /**
     * Get accessible projects for current user
     */
    function getAccessibleProjects()                                                                                                                     returns array of {
        ID           : String;
        projectName  : String;
        clientName   : String;
        status       : String;
        s4HanaFlavor : String;
    };

    /**
     * Get analytics dashboard data with optional filters
     */
    function getAnalyticsData(dateFrom: Date,
                              dateTo: Date,
                              ricefwTypes: String, // JSON array string
                              cleanCoreLevels: String, // JSON array string
                              projectId: String)                                                                                                         returns {
        technicalDebtScore     : Integer;
        cloudReadinessScore    : Integer;
        upgradeImpactScore     : Integer;
        compositeHealthScore   : Integer;
        totalAnalyses          : Integer;
        levelDistribution      : array of {
            level      : String;
            count      : Integer;
            percentage : Integer;
        };
        ricefwTypeDistribution : array of {
            objectType : String;
            count      : Integer;
            percentage : Integer;
        };
        trendData              : array of {
            month          : String;
            technicalDebt  : Integer;
            cloudReadiness : Integer;
            upgradeImpact  : Integer;
            analysisCount  : Integer;
        };
        riskMatrixData         : array of {
            id       : String;
            ricefwId : String;
            level    : String;
            x        : Integer;
            y        : Integer;
            size     : Integer;
        };
        topObjects             : array of {
            id              : String;
            ricefwId        : String;
            objectType      : String;
            complexityScore : Integer;
            level           : String;
        };
    };

    /**
     * Get cross-tenant analytics for provider administrators
     * Aggregates analytics across subscribed tenants by querying each tenant context
     */
    @restrict: [{
        grant: 'READ',
        to   : ['Admin', 'ServiceProviderAdmin']
    }]
    function getCrossTenantAnalyticsData(dateFrom: Date,
                                         dateTo: Date,
                                         ricefwTypes: String,
                                         cleanCoreLevels: String,
                                         projectId: String,
                                         tenantIds: String)                                                                                                 returns {
        totalTenants          : Integer;
        activeTenants         : Integer;
        totalAnalyses         : Integer;
        technicalDebtScore    : Integer;
        cloudReadinessScore   : Integer;
        upgradeImpactScore    : Integer;
        compositeHealthScore  : Integer;
        tenantAnalytics       : array of {
            tenant                : String;
            totalAnalyses         : Integer;
            projectCount          : Integer;
            technicalDebtScore    : Integer;
            cloudReadinessScore   : Integer;
            upgradeImpactScore    : Integer;
            compositeHealthScore  : Integer;
        };
    };

    /**
     * Get year-over-year comparison data for analytics dashboard
     */
    function getYearOverYearComparison() returns {
        yearlyData : array of {
            year           : String;
            totalAnalyses  : Integer;
            technicalDebt  : Decimal(5, 2);
            cloudReadiness : Decimal(5, 2);
            upgradeImpact  : Decimal(5, 2);
        };
    };

    /**
     * Compare analytics between projects
     */
    function compareProjects(projectIds : array of String) returns {
        projects       : array of {
            projectName : String;
            projectId   : String;
        };
        comparisonData : array of {
            metric : String;
            value0 : Decimal(5, 2);
            value1 : Decimal(5, 2);
            value2 : Decimal(5, 2);
            value3 : Decimal(5, 2);
            value4 : Decimal(5, 2);
        };
    };

    /**
     * Get monthly trend data with date range
     */
    function getMonthlyTrends(dateFrom : Date, dateTo : Date) returns {
        monthlyData : array of {
            month          : String;
            technicalDebt  : Decimal(5, 2);
            cloudReadiness : Decimal(5, 2);
            upgradeImpact  : Decimal(5, 2);
            analysisCount  : Integer;
        };
    };

    // ===============================
    // Notification Actions (FLP Shell Integration)
    // ===============================

    /**
     * Mark notification as read
     */
    action markNotificationAsRead(notificationId : String) returns {
        success : Boolean;
        message : String;
    };

    /**
     * Get count of unread notifications
     */
    function getUnreadNotificationCount() returns {
        count : Integer;
    };

    // ===============================
    // Rate Limiting Management (Admin Only)
    // ===============================

    /**
     * Get rate limit status for current user
     * @restrict Admin, TenantAdmin only
     */
    @restrict: [{
        grant: 'READ',
        to   : ['Admin', 'TenantAdmin', 'ServiceProviderAdmin']
    }]
    function getRateLimitStatus(userId : String, tenantId : String) returns {
        user   : {
            remaining : Integer;
            limit     : Integer;
            resetAt   : DateTime;
        };
        tenant : {
            remaining : Integer;
            limit     : Integer;
            resetAt   : DateTime;
        };
    };

    /**
     * Reset rate limits for a user (Admin only)
     * @restrict Admin only
     */
    @restrict: [{
        grant: '*',
        to   : 'Admin'
    }]
    action resetUserRateLimit(userId : String) returns {
        success : Boolean;
        message : String;
    };

    /**
     * Reset rate limits for a tenant (Admin only)
     * @restrict Admin only
     */
    @restrict: [{
        grant: '*',
        to   : 'Admin'
    }]
    action resetTenantRateLimit(tenantId : String) returns {
        success : Boolean;
        message : String;
    };

    /**
     * Get full guidance content for a RICEFW type
     * Returns comprehensive educational content including levels and examples
     */
    function getFullGuidance(ricefwType : String) returns {
        guidance : {
            ricefwType          : String;
            title               : String;
            introduction        : LargeString;
            apiExplanation      : LargeString;
            decisionTree        : LargeString;
            determinationFactors : LargeString;
            performanceThresholds : LargeString;
            deploymentConstraints : LargeString;
            realWorldScenarios  : LargeString;
            officialGuidance    : LargeString;
            strategyMatrix      : LargeString;
            summaryTable        : LargeString;
            designGuidance      : LargeString;
            beginnerFaq         : LargeString;
        };
        levels   : array of {
            level             : String;
            ricefwType        : String;
            title             : String;
            levelName         : String;
            whatItMeans       : LargeString;
            beginnerAnalogy   : LargeString;
            toolsUsed         : LargeString;
            exampleReport     : LargeString;
            whyReasoning      : LargeString;
            description       : LargeString;
            technology        : LargeString;
            upgradeComplexity : String;
            maintenanceEffort : String;
            cloudReadiness    : String;
            technicalRisk     : String;
        };
        examples : array of {
            exampleId       : String;
            title           : String;
            scenario        : LargeString;
            design          : LargeString;
            whyLevel        : LargeString;
            outcome         : LargeString;
            associatedLevel : String;
            industry        : String;
            businessBenefit : LargeString;
        };
    };
}

