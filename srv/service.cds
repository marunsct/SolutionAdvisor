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
            to   : 'TenantAdmin'
        },
        {
            grant: [
                'READ',
                'CREATE',
                'UPDATE'
            ],
            to   : 'SolutionArchitect'
        },
        {
            grant: 'READ',
            to   : 'Developer'
        }
    ]
    entity Projects          as projection on my.ProjectConfiguration;

    // Analyses entity - draft-enabled for user workflow
    @odata.draft.enabled
    @restrict: [
        {
            grant: '*',
            to   : 'TenantAdmin'
        },
        {
            grant: [
                'READ',
                'CREATE',
                'UPDATE'
            ],
            to   : 'SolutionArchitect'
        },
        {
            grant: [
                'READ',
                'CREATE'
            ],
            to   : 'Developer'
        }
    ]
    entity Analyses          as projection on my.CleanCoreAnalysis;

    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity DecisionPaths     as projection on my.DecisionPath;

    @restrict: [{
        grant: '*',
        to   : 'authenticated-user'
    }]
    entity WizardSessions    as projection on my.WizardSession;

    // ===============================
    // Master Data Entities
    // ===============================

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity QuestionFlows     as projection on my.QuestionFlow;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity CleanCoreLevels   as projection on my.CleanCoreLevels;

    @readonly
    @restrict: [{
        grant: 'READ',
        to   : 'authenticated-user'
    }]
    entity ObjectTypes       as projection on my.ObjectTypes;

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
    entity RealWorldExamples as projection on my.RealWorldExample;

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
    entity ConstraintLogs    as projection on my.ConstraintLog;

    @restrict: [{
        grant: [
            'READ',
            'CREATE'
        ],
        to   : 'authenticated-user'
    }]
    entity ExampleLogs       as projection on my.ExampleLog;

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
    entity ProjectUsers      as projection on my.ProjectUsers;

    // ===============================
    // Custom Actions & Functions
    // ===============================

    /**
     * Start a new wizard session for an analysis
     */
    action   startWizard(projectID : String, ricefwId : String, objectType : String, objectName : String) returns {
        sessionID   : String;
        analysisID  : String;
        firstQuestion : {
            questionId   : String;
            questionText : String;
            answerOptions : String;
            hint         : String;
        };
    };

    /**
     * Submit an answer and get the next question
     */
    action   submitAnswer(sessionID : String, questionId : String, selectedAnswer : String, answerIndex : Integer, userComments : String, timeSpent : Integer) returns {
        nextQuestion : {
            questionId   : String;
            questionText : String;
            answerOptions : String;
            hint         : String;
        };
        isComplete   : Boolean;
        recommendation : String;
        reasoning    : String;
        scores       : {
            technicalDebt   : Decimal(5, 2);
            cloudReadiness  : Decimal(5, 2);
            upgradeImpact   : Decimal(5, 2);
            compositeHealth : Decimal(5, 2);
        };
    };

    /**
     * Get relevant performance thresholds for current context
     */
    function getRelevantConstraints(objectType : String, deploymentType : String, volumeLevel : String) returns array of {
        category    : String;
        method      : String;
        threshold   : String;
        level       : String;
        guidance    : String;
    };

    /**
     * Get contextual real-world examples
     */
    function getContextualExamples(objectType : String, scenario : String, keywords : String) returns array of {
        title       : String;
        scenario    : String;
        challenge   : String;
        solution    : String;
        level       : String;
    };

    /**
     * Calculate scores for an analysis
     */
    function calculateScores(analysisID : String)                                                                                                             returns {
        technicalDebt   : Decimal(5, 2);
        cloudReadiness  : Decimal(5, 2);
        upgradeImpact   : Decimal(5, 2);
        compositeHealth : Decimal(5, 2);
    };

    /**
     * Resume a paused wizard session
     */
    action   resumeWizard(sessionID : String)                                                                                                                 returns {
        currentQuestion : {
            questionId   : String;
            questionText : String;
            answerOptions : String;
            hint         : String;
        };
        progress        : {
            currentStep : Integer;
            totalSteps  : Integer;
            answeredPath : String;
        };
    };

    /**
     * Export decision flowchart
     */
    action   exportFlowchart(analysisID : String, format : String)                                                                                            returns {
        downloadUrl : String;
        filename    : String;
    };

    /**
     * Assign user to project
     */
    action   assignUserToProject(
        projectId   : String,
        userId      : String,
        userEmail   : String,
        userName    : String,
        role        : String
    ) returns {
        ID          : String;
        message     : String;
    };

    /**
     * Remove user from project
     */
    action   removeUserFromProject(
        projectUserId : String
    ) returns {
        success     : Boolean;
        message     : String;
    };

    /**
     * Get accessible projects for current user
     */
    function getAccessibleProjects() returns array of {
        ID              : String;
        projectName     : String;
        clientName      : String;
        status          : String;
        s4HanaFlavor    : String;
    };
}
