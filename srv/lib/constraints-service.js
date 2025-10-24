const cds = require('@sap/cds');

/**
 * Constraints Service - Performance thresholds and limitations management
 * 
 * @class ConstraintsService
 * @description
 * Retrieves and evaluates performance thresholds, technical limitations,
 * and compliance constraints relevant to a Clean Core analysis context.
 * Checks user selections against defined thresholds and issues warnings
 * when limits are exceeded.
 * 
 * Constraint categories:
 * - Performance (e.g., max records per hour, API call limits)
 * - Deployment (e.g., Cloud Public restrictions on custom ABAP)
 * - Compliance (e.g., GDPR data residency, FDA validation requirements)
 * 
 * Data source: PerformanceThreshold entity with fields:
 * - category, method, threshold value, level, deployment types
 * - guidance when threshold exceeded
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */
class ConstraintsService {
    /**
     * Create a Constraints Service instance
     * @param {Object} srv - CAP service instance (unused but kept for consistency)
     */
    constructor(srv) {
        this.srv = srv;
    }

    /**
     * Get relevant constraints based on analysis context
     * 
     * @async
     * @param {string} objectType - RICEFW object type (R/I/C/E/F/W)
     * @param {string} deploymentType - S/4HANA flavor (Cloud Public/Private/On-Premise)
     * @param {string} [volumeLevel] - Data volume indicator (Low/Medium/High)
     * @param {string} [currentAnswer] - User's current answer selection
     * 
     * @returns {Promise<Array<Object>>} Array of relevant constraints
     * @returns {string} id - Constraint UUID
     * @returns {string} category - Constraint category (Performance/Deployment/Compliance)
     * @returns {string} method - Implementation method being constrained
     * @returns {string} threshold - Formatted threshold description
     * @returns {string} level - Applicable Clean Core level (A/B/C/D)
     * @returns {string} guidance - Guidance when threshold exceeded
     * @returns {boolean} isViolated - Whether current selection violates constraint
     * @returns {string} violationSeverity - Severity level (None/Warning/Error)
     * @returns {string} warningMessage - Human-readable violation warning
     * 
     * @description
     * Queries PerformanceThreshold entity for active constraints matching the
     * object type and deployment. Checks each constraint against current context
     * and flags violations with severity and guidance.
     */
    async getRelevantConstraints(objectType, deploymentType, volumeLevel, currentAnswer) {
        const { PerformanceThreshold } = cds.entities('sd');
        
        // Build query to find relevant thresholds
        const constraints = await SELECT.from(PerformanceThreshold)
            .where({
                isActive: true,
                and: {
                    applicableObjectTypes: { like: `%${this.getObjectCode(objectType)}%` }
                }
            });
        
        // Filter by deployment type if provided
        let filtered = constraints;
        if (deploymentType) {
            filtered = constraints.filter(c => 
                !c.deploymentTypes || 
                c.deploymentTypes.includes(deploymentType)
            );
        }
        
        // Format results with violation warnings
        return filtered.map(constraint => {
            const violation = this.checkViolation(constraint, volumeLevel, currentAnswer);
            return {
                id: constraint.ID,
                category: constraint.category,
                method: constraint.method,
                threshold: this.formatThreshold(constraint),
                level: constraint.cleanCoreLevel,
                guidance: constraint.whenExceeded,
                isViolated: violation.isViolated,
                violationSeverity: violation.severity,
                warningMessage: violation.message
            };
        });
    }

    /**
     * Check if current selection violates a constraint
     */
    checkViolation(constraint, volumeLevel, currentAnswer) {
        const result = {
            isViolated: false,
            severity: 'None',
            message: null
        };

        // Check volume limit violation
        if (constraint.volumeLimit && volumeLevel) {
            const volumeValue = this.parseVolumeLevel(volumeLevel);
            if (volumeValue > constraint.volumeLimit) {
                result.isViolated = true;
                result.severity = 'Error';
                result.message = `Volume exceeds recommended limit of ${constraint.volumeLimit.toLocaleString()} records. ${constraint.whenExceeded}`;
            }
        }

        // Check response time concerns based on method selection
        if (constraint.responseTimeTarget && currentAnswer) {
            if (this.isHighLatencyMethod(currentAnswer, constraint.method)) {
                result.isViolated = true;
                result.severity = 'Warning';
                result.message = `Selected method may not meet ${constraint.responseTimeTarget}ms response time target. Consider ${constraint.method} instead.`;
            }
        }

        // Check deployment compatibility
        if (constraint.deploymentTypes && currentAnswer) {
            if (this.isIncompatibleWithDeployment(currentAnswer, constraint.deploymentTypes)) {
                result.isViolated = true;
                result.severity = 'Error';
                result.message = `This approach is not compatible with your deployment type. ${constraint.whenExceeded}`;
            }
        }

        return result;
    }

    /**
     * Parse volume level string to numeric value
     */
    parseVolumeLevel(volumeLevel) {
        const match = volumeLevel.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (volumeLevel.includes('million')) return num * 1000000;
            if (volumeLevel.includes('thousand') || volumeLevel.includes('K')) return num * 1000;
            return num;
        }
        return 0;
    }

    /**
     * Check if selected method has high latency concerns
     */
    isHighLatencyMethod(answer, recommendedMethod) {
        const highLatencyPatterns = ['batch', 'file transfer', 'mass upload', 'idoc'];
        const answerLower = answer.toLowerCase();
        return highLatencyPatterns.some(pattern => 
            answerLower.includes(pattern) && !recommendedMethod.toLowerCase().includes(pattern)
        );
    }

    /**
     * Check if selection is incompatible with deployment type
     */
    isIncompatibleWithDeployment(answer, allowedDeployments) {
        const cloudIncompatible = ['custom code', 'modification', 'user exit', 'badi'];
        const answerLower = answer.toLowerCase();
        
        if (allowedDeployments.includes('Cloud Public')) {
            return cloudIncompatible.some(pattern => answerLower.includes(pattern));
        }
        
        return false;
    }

    /**
     * Get deployment-specific constraints
     */
    getDeploymentConstraints(deploymentType) {
        const constraints = {
            'Cloud Public': [
                'No custom ABAP code modifications allowed',
                'Must use SAP-released APIs only',
                'Extensions must be deployed on BTP',
                'No direct database access'
            ],
            'Private Cloud': [
                'Limited custom ABAP with clean core principles',
                'Prefer SAP APIs over custom code',
                'BTP extensions recommended',
                'Database access via CDS views only'
            ],
            'On-Premise': [
                'Custom ABAP allowed with governance',
                'Must document all modifications',
                'Consider future cloud migration',
                'Follow clean core principles for upgrades'
            ]
        };
        
        return constraints[deploymentType] || [];
    }

    /**
     * Get compliance-specific constraints
     */
    getComplianceConstraints(complianceRequirements) {
        if (!complianceRequirements) return [];
        
        const constraints = [];
        
        if (complianceRequirements.includes('SOX')) {
            constraints.push({
                type: 'SOX',
                requirement: 'All changes must be traceable with audit logs',
                impact: 'Requires change tracking and approval workflows'
            });
        }
        
        if (complianceRequirements.includes('GDPR')) {
            constraints.push({
                type: 'GDPR',
                requirement: 'Personal data must be anonymized or encrypted',
                impact: 'Data retention policies must be implemented'
            });
        }
        
        if (complianceRequirements.includes('FDA')) {
            constraints.push({
                type: 'FDA',
                requirement: 'Electronic signatures and validation required',
                impact: 'Part 11 compliance for all processes'
            });
        }
        
        return constraints;
    }

    /**
     * Format threshold for display
     */
    formatThreshold(constraint) {
        const parts = [];
        
        if (constraint.volumeLimit) {
            parts.push(`≤${constraint.volumeLimit.toLocaleString()} records`);
        }
        
        if (constraint.sizeThreshold) {
            parts.push(`${constraint.sizeThreshold} max size`);
        }
        
        if (constraint.frequencyLimit) {
            parts.push(`${constraint.frequencyLimit}`);
        }
        
        if (constraint.responseTimeTarget) {
            parts.push(`<${constraint.responseTimeTarget}ms response`);
        }
        
        return parts.join(', ');
    }

    /**
     * Get object code from object type
     */
    getObjectCode(objectType) {
        const mapping = {
            'Reports': 'R',
            'Interfaces': 'I',
            'Conversions': 'C',
            'Enhancements': 'E',
            'Forms': 'F',
            'Workflows': 'W'
        };
        
        return mapping[objectType] || objectType.charAt(0);
    }
}

module.exports = ConstraintsService;
