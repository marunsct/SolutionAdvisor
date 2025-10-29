namespace sd;

using { sd } from './schema';

/**
 * Database Indexes for Performance Optimization
 * 
 * Indexes are created on frequently queried columns to improve:
 * - List view filtering and sorting
 * - Join operations
 * - Search queries
 * - Analytics aggregations
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */

// ===============================
// ProjectConfiguration Indexes
// ===============================

/**
 * Index for project list filtering by status and tenant
 * Used in: Project List page, Dashboard analytics
 */
annotate sd.ProjectConfiguration with @(cds.persistence.indexes: {
    idx_status_tenant: { 
        unique: false, 
        elements: ['status', 'tenant'] 
    },
    idx_flavor_tenant: { 
        unique: false, 
        elements: ['s4HanaFlavor', 'tenant'] 
    },
    idx_criticality_tenant: { 
        unique: false, 
        elements: ['businessCriticality', 'tenant'] 
    },
    idx_created_tenant: { 
        unique: false, 
        elements: ['createdAt', 'tenant'] 
    }
});

// ===============================
// CleanCoreAnalysis Indexes
// ===============================

/**
 * Indexes for analysis queries
 */
annotate sd.CleanCoreAnalysis with @(cds.persistence.indexes: {
    idx_ricefwid_tenant: { 
        unique: false, 
        elements: ['ricefwId', 'tenant'] 
    },
    idx_objecttype_tenant: { 
        unique: false, 
        elements: ['objectType', 'tenant'] 
    },
    idx_status_tenant: { 
        unique: false, 
        elements: ['status', 'tenant'] 
    },
    idx_project_status_tenant: { 
        unique: false, 
        elements: ['projectConfig_ID', 'status', 'tenant'] 
    },
    idx_analysisdate_tenant: { 
        unique: false, 
        elements: ['analysisDate', 'tenant'] 
    },
    idx_risk_tenant: { 
        unique: false, 
        elements: ['riskAssessment', 'tenant'] 
    },
    idx_compliance_tenant: { 
        unique: false, 
        elements: ['complianceStatus', 'tenant'] 
    },
    idx_createdby_tenant: { 
        unique: false, 
        elements: ['createdBy', 'tenant'] 
    },
    idx_level_tenant: { 
        unique: false, 
        elements: ['recommendedLevel_levelCode', 'tenant'] 
    }
});

// ===============================
// DecisionPath Indexes
// ===============================

/**
 * Indexes for decision path tracking
 */
annotate sd.DecisionPath with @(cds.persistence.indexes: {
    idx_analysis_step: { 
        unique: false, 
        elements: ['analysis_ID', 'stepOrder'] 
    },
    idx_question_tenant: { 
        unique: false, 
        elements: ['questionId', 'tenant'] 
    },
    idx_answered_tenant: { 
        unique: false, 
        elements: ['answeredAt', 'tenant'] 
    }
});

// ===============================
// WizardSession Indexes
// ===============================

/**
 * Indexes for wizard session management
 */
annotate sd.WizardSession with @(cds.persistence.indexes: {
    idx_status_tenant: { 
        unique: false, 
        elements: ['sessionStatus', 'tenant'] 
    },
    idx_expires_status: { 
        unique: false, 
        elements: ['expiresAt', 'sessionStatus'] 
    },
    idx_analysis_tenant: { 
        unique: false, 
        elements: ['analysis_ID', 'tenant'] 
    },
    idx_started_tenant: { 
        unique: false, 
        elements: ['startedBy', 'tenant'] 
    }
});

// ===============================
// QuestionFlow Indexes
// ===============================

/**
 * Indexes for question flow queries
 */
annotate sd.QuestionFlow with @(cds.persistence.indexes: {
    idx_question_objecttype: { 
        unique: true, 
        elements: ['questionId', 'objectType'] 
    },
    idx_objecttype_sequence: { 
        unique: false, 
        elements: ['objectType', 'sequenceOrder'] 
    },
    idx_active: { 
        unique: false, 
        elements: ['isActive'] 
    }
});

// ===============================
// PerformanceThreshold Indexes
// ===============================

/**
 * Indexes for constraints service queries
 */
annotate sd.PerformanceThreshold with @(cds.persistence.indexes: {
    idx_category_active: { 
        unique: false, 
        elements: ['category', 'isActive'] 
    },
    idx_level_active: { 
        unique: false, 
        elements: ['cleanCoreLevel', 'isActive'] 
    },
    idx_active: { 
        unique: false, 
        elements: ['isActive'] 
    }
});

// ===============================
// RealWorldExample Indexes
// ===============================

/**
 * Indexes for examples service queries
 */
annotate sd.RealWorldExample with @(cds.persistence.indexes: {
    idx_objecttype_active: { 
        unique: false, 
        elements: ['objectType', 'isActive'] 
    },
    idx_industry_active: { 
        unique: false, 
        elements: ['industry', 'isActive'] 
    },
    idx_level_active: { 
        unique: false, 
        elements: ['cleanCoreLevel', 'isActive'] 
    },
    idx_objecttype_industry_active: { 
        unique: false, 
        elements: ['objectType', 'industry', 'isActive'] 
    }
});

// ===============================
// CleanCoreLevels Indexes
// ===============================

/**
 * Index for level lookup (master data)
 */
annotate sd.CleanCoreLevels with @(cds.persistence.indexes: {
    idx_level_unique: { 
        unique: true, 
        elements: ['level'] 
    },
    idx_active: { 
        unique: false, 
        elements: ['isActive'] 
    }
});

// ===============================
// ObjectTypes Indexes
// ===============================

/**
 * Index for object type lookup (master data)
 */
annotate sd.ObjectTypes with @(cds.persistence.indexes: {
    idx_code_unique: { 
        unique: true, 
        elements: ['code'] 
    },
    idx_active: { 
        unique: false, 
        elements: ['isActive'] 
    }
});

// ===============================
// ConstraintLog Indexes
// ===============================

/**
 * Indexes for constraint violation analytics
 */
annotate sd.ConstraintLog with @(cds.persistence.indexes: {
    idx_analysis: { 
        unique: false, 
        elements: ['analysis_ID'] 
    },
    idx_threshold_violated: { 
        unique: false, 
        elements: ['threshold_ID', 'wasViolated'] 
    },
    idx_displayed_tenant: { 
        unique: false, 
        elements: ['displayedAt', 'tenant'] 
    }
});

// ===============================
// ExampleLog Indexes
// ===============================

/**
 * Indexes for example analytics (popularity tracking)
 */
annotate sd.ExampleLog with @(cds.persistence.indexes: {
    idx_example: { 
        unique: false, 
        elements: ['example_ID'] 
    },
    idx_analysis: { 
        unique: false, 
        elements: ['analysis_ID'] 
    },
    idx_viewed_tenant: { 
        unique: false, 
        elements: ['viewedAt', 'tenant'] 
    }
});

// ===============================
// ProjectUsers Indexes
// ===============================

/**
 * Indexes for user access management
 */
annotate sd.ProjectUsers with @(cds.persistence.indexes: {
    idx_project_user: { 
        unique: false, 
        elements: ['project_ID', 'userId'] 
    },
    idx_user_tenant: { 
        unique: false, 
        elements: ['userId', 'tenant'] 
    },
    idx_role_tenant: { 
        unique: false, 
        elements: ['role', 'tenant'] 
    }
});

// ===============================
// AuditLog Indexes
// ===============================

/**
 * Indexes for audit trail queries
 */
annotate sd.AuditLog with @(cds.persistence.indexes: {
    idx_entity: { 
        unique: false, 
        elements: ['entityType', 'entityId'] 
    },
    idx_action_tenant: { 
        unique: false, 
        elements: ['actionType', 'tenant'] 
    },
    idx_user_timestamp: { 
        unique: false, 
        elements: ['userId', 'actionTimestamp'] 
    },
    idx_timestamp_tenant: { 
        unique: false, 
        elements: ['actionTimestamp', 'tenant'] 
    }
});
