using {sd as my} from '../db/schema';

/**
 * Admin Service for Master Data Maintenance
 * Provides full CRUD access to master data entities for administrators
 * Access restricted to Admin and TenantAdmin roles only
 */
@path    : '/service/AdminSvcs'
@requires: ['Admin', 'TenantAdmin']
service AdminService {

    // ===============================
    // Master Data Entities (Full CRUD)
    // ===============================

    /**
     * Question Flow Management
     * Defines the decision tree questions for each RICEFW object type
     */
    @restrict: [{
        grant: '*',
        to   : ['Admin', 'TenantAdmin']
    }]
    entity QuestionFlow          as projection on my.QuestionFlow;

    /**
     * Clean Core Levels Management
     * Defines Level A/B/C/D with scoring multipliers
     */
    @restrict: [{
        grant: '*',
        to   : ['Admin', 'TenantAdmin']
    }]
    entity CleanCoreLevels       as projection on my.CleanCoreLevels;

    /**
     * Object Types Management
     * RICEFW object type master data (R/I/C/E/F/W)
     */
    @restrict: [{
        grant: '*',
        to   : ['Admin', 'TenantAdmin']
    }]
    entity ObjectTypes           as projection on my.ObjectTypes;

    /**
     * Performance Thresholds Management
     * Performance limits, constraints, and technical limitations
     */
    @restrict: [{
        grant: '*',
        to   : ['Admin', 'TenantAdmin']
    }]
    entity PerformanceThreshold  as projection on my.PerformanceThreshold;

    /**
     * Real-World Examples Management
     * Knowledge base of implementation scenarios and solutions
     */
    @restrict: [{
        grant: '*',
        to   : ['Admin', 'TenantAdmin']
    }]
    entity RealWorldExample      as projection on my.RealWorldExample;

    /**
     * Audit Log - Read-only access to audit trail
     * Immutable compliance and security audit records
     */
    @readonly
    @restrict: [{
        grant: 'READ',
        to   : ['Admin', 'TenantAdmin']
    }]
    entity AuditLog              as projection on my.AuditLog;

    // ===============================
    // Administrative Actions
    // ===============================

    /**
     * Cleanup expired wizard sessions
     * Triggered manually by admin or via scheduled job
     */
    action   cleanupExpiredSessions(dryRun : Boolean) returns {
        success    : Boolean;
        cleaned    : Integer;
        expired    : Integer;
        errors     : Integer;
        durationMs : Integer;
        message    : String;
    };

    /**
     * Validate QuestionFlow navigation logic
     * Ensures JSON navigation logic is valid and all references exist
     */
    action   validateQuestionFlowLogic(questionFlowId : String) returns {
        isValid           : Boolean;
        errors            : array of String;
        warnings          : array of String;
        referencedQuestions : array of String;
    };

    /**
     * Bulk import QuestionFlow from JSON
     * For mass data migration and updates
     */
    action   bulkImportQuestionFlow(data : array of {
        // Align to sd.QuestionFlow schema
        ID               : String;             // optional for updates
        questionId       : String;
        objectType       : String;
        questionText     : String;
        questionHint     : String;
        detailedHint     : String;
        answerCount      : Integer;
        answerOptions    : String;            // JSON string
        navigationRules  : String;            // JSON string
        performanceContext : String;          // JSON string
        displayOrder     : Integer;
        isActive         : Boolean;
        tenant           : String;            // optional; usually set by MTX
    }) returns {
        success      : Boolean;
        importedCount : Integer;
        errorCount   : Integer;
        errors       : array of String;
    };

    /**
     * Rebuild QuestionFlow indexes
     * Optimizes database performance for question flow queries
     */
    action   rebuildQuestionFlowIndexes() returns {
        success : Boolean;
        message : String;
        duration : Integer;
    };

    /**
     * Export all master data for backup
     * Creates JSON export of all master data entities
     */
    function exportMasterData() returns {
        questionFlows        : array of {
            // sd.QuestionFlow complete
            ID                : String;
            questionId        : String;
            objectType        : String;
            questionText      : String;
            questionHint      : String;
            detailedHint      : String;
            answerCount       : Integer;
            answerOptions     : String;
            navigationRules   : String;
            performanceContext: String;
            displayOrder      : Integer;
            isActive          : Boolean;
            createdAt         : DateTime;
            createdBy         : String;
            modifiedAt        : DateTime;
            modifiedBy        : String;
            tenant            : String;
        };
        cleanCoreLevels      : array of {
            // sd.CleanCoreLevels complete
            ID                     : String;
            level                  : String;
            levelName              : String;
            description            : String;
            characteristics        : String;
            upgradeComplexity      : String;
            maintenanceEffort      : String;
            businessFlexibility    : String;
            technicalRisk          : String;
            cloudReadiness         : String;
            technicalDebtMultiplier: Decimal(3, 2);
            cloudReadinessFactor   : Decimal(3, 2);
            upgradeImpactMultiplier: Decimal(3, 2);
            isActive               : Boolean;
            displayOrder           : Integer;
            createdAt              : DateTime;
            createdBy              : String;
            modifiedAt             : DateTime;
            modifiedBy             : String;
        };
        objectTypes          : array of {
            // sd.ObjectTypes complete
            ID               : String;
            objectType       : String;
            objectCode       : String;
            displayName      : String;
            description      : String;
            iconName         : String;
            complexity       : String;
            avgAnalysisTime  : Integer;
            questionCount    : Integer;
            isActive         : Boolean;
            createdAt        : DateTime;
            createdBy        : String;
            modifiedAt       : DateTime;
            modifiedBy       : String;
        };
        performanceThresholds : array of {
            // sd.PerformanceThreshold complete
            ID                   : String;
            category             : String;
            method               : String;
            volumeLimit          : Integer;
            sizeThreshold        : String;
            frequencyLimit       : String;
            responseTimeTarget   : Integer;
            concurrencyLimit     : Integer;
            cleanCoreLevel       : String;
            whenExceeded         : String;
            alternativeSolution  : String;
            applicableObjectTypes: String;
            deploymentTypes      : String;
            isActive             : Boolean;
            createdAt            : DateTime;
            createdBy            : String;
            modifiedAt           : DateTime;
            modifiedBy           : String;
        };
        realWorldExamples    : array of {
            // sd.RealWorldExample complete
            ID                   : String;
            objectType           : String;
            cleanCoreLevel       : String;
            scenario             : String;
            industry             : String;
            title                : String;
            challengeDescription : String;
            solutionDescription  : String;
            technologiesUsed     : String;
            implementation       : String;
            volumeHandled        : String;
            performanceAchieved  : String;
            implementationTime   : String;
            lessonsLearned       : String;
            keywords             : String;
            isActive             : Boolean;
            approvedBy           : String;
            approvedDate         : Date;
            createdAt            : DateTime;
            createdBy            : String;
            modifiedAt           : DateTime;
            modifiedBy           : String;
        };
    };

    /**
     * Import master data from backup
     * Restores master data from JSON export
     */
    action   importMasterData(data : {
        questionFlows        : array of {
            ID                : String;
            questionId        : String;
            objectType        : String;
            questionText      : String;
            questionHint      : String;
            detailedHint      : String;
            answerCount       : Integer;
            answerOptions     : String;
            navigationRules   : String;
            performanceContext: String;
            displayOrder      : Integer;
            isActive          : Boolean;
            tenant            : String;
        };
        cleanCoreLevels      : array of {
            ID                     : String;
            level                  : String;
            levelName              : String;
            description            : String;
            characteristics        : String;
            upgradeComplexity      : String;
            maintenanceEffort      : String;
            businessFlexibility    : String;
            technicalRisk          : String;
            cloudReadiness         : String;
            technicalDebtMultiplier: Decimal(3, 2);
            cloudReadinessFactor   : Decimal(3, 2);
            upgradeImpactMultiplier: Decimal(3, 2);
            isActive               : Boolean;
            displayOrder           : Integer;
        };
        objectTypes          : array of {
            ID               : String;
            objectType       : String;
            objectCode       : String;
            displayName      : String;
            description      : String;
            iconName         : String;
            complexity       : String;
            avgAnalysisTime  : Integer;
            questionCount    : Integer;
            isActive         : Boolean;
        };
        performanceThresholds : array of {
            ID                   : String;
            category             : String;
            method               : String;
            volumeLimit          : Integer;
            sizeThreshold        : String;
            frequencyLimit       : String;
            responseTimeTarget   : Integer;
            concurrencyLimit     : Integer;
            cleanCoreLevel       : String;
            whenExceeded         : String;
            alternativeSolution  : String;
            applicableObjectTypes: String;
            deploymentTypes      : String;
            isActive             : Boolean;
        };
        realWorldExamples    : array of {
            ID                   : String;
            objectType           : String;
            cleanCoreLevel       : String;
            scenario             : String;
            industry             : String;
            title                : String;
            challengeDescription : String;
            solutionDescription  : String;
            technologiesUsed     : String;
            implementation       : String;
            volumeHandled        : String;
            performanceAchieved  : String;
            implementationTime   : String;
            lessonsLearned       : String;
            keywords             : String;
            isActive             : Boolean;
            approvedBy           : String;
            approvedDate         : Date;
        };
    }) returns {
        success : Boolean;
        message : String;
        counts  : {
            questionFlows         : Integer;
            cleanCoreLevels       : Integer;
            objectTypes           : Integer;
            performanceThresholds : Integer;
            realWorldExamples     : Integer;
        };
    };

    /**
     * Get statistics for all master data tables
     */
    function getMasterDataStatistics() returns {
        questionFlows        : {
            total      : Integer;
            active     : Integer;
            inactive   : Integer;
            byObjectType : array of {
                objectType : String;
                count      : Integer;
            };
        };
        cleanCoreLevels      : {
            total : Integer;
        };
        objectTypes          : {
            total : Integer;
        };
        performanceThresholds : {
            total           : Integer;
            byCategory      : array of {
                category : String;
                count    : Integer;
            };
        };
        realWorldExamples    : {
            total       : Integer;
            byObjectType : array of {
                objectType : String;
                count      : Integer;
            };
        };
    };


}
