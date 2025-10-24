/**
 * Audit Logging Service
 * 
 * Provides comprehensive audit trail for compliance and security tracking
 * Logs: authentication, data changes, exports, constraint violations, config changes
 */

const cds = require('@sap/cds');
const LOG = cds.log('audit');

class AuditService {
    constructor() {
        this.auditLog = null;
    }

    /**
     * Initialize audit logging with database connection
     */
    async init() {
        const db = await cds.connect.to('db');
        this.auditLog = db.entities('sd').AuditLog;
    }

    /**
     * Log user authentication events
     * @param {Object} req - Express request object
     * @param {string} eventType - 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
     * @param {Object} details - Additional event details
     */
    async logAuthEvent(req, eventType, details = {}) {
        try {
            const entry = {
                eventType: eventType,
                entityType: 'User',
                entityId: req.user?.id || 'ANONYMOUS',
                userId: req.user?.id || 'ANONYMOUS',
                userName: req.user?.name || 'Unknown',
                userEmail: req.user?.email || null,
                action: eventType,
                timestamp: new Date(),
                ipAddress: this._getClientIP(req),
                userAgent: req.headers['user-agent'] || null,
                sessionId: req.session?.id || null,
                tenantId: req.tenant || null,
                details: JSON.stringify(details),
                severity: eventType === 'LOGIN_FAILED' ? 'WARNING' : 'INFO'
            };

            await this._writeAuditLog(entry);
            LOG.info(`Auth event logged: ${eventType} for user ${entry.userId}`);
        } catch (error) {
            LOG.error('Failed to log authentication event:', error);
        }
    }

    /**
     * Log CRUD operations on entities
     * @param {Object} req - CDS request object
     * @param {string} action - 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
     * @param {string} entityType - Entity name
     * @param {string} entityId - Entity ID
     * @param {Object} before - Data before change (for UPDATE/DELETE)
     * @param {Object} after - Data after change (for CREATE/UPDATE)
     */
    async logDataChange(req, action, entityType, entityId, before = null, after = null) {
        try {
            const entry = {
                eventType: 'DATA_CHANGE',
                entityType: entityType,
                entityId: entityId,
                userId: req.user?.id || 'SYSTEM',
                userName: req.user?.name || 'System',
                userEmail: req.user?.email || null,
                action: action,
                timestamp: new Date(),
                ipAddress: this._getClientIP(req),
                tenantId: req.tenant || null,
                details: JSON.stringify({
                    before: this._sanitizeData(before),
                    after: this._sanitizeData(after),
                    changedFields: this._getChangedFields(before, after)
                }),
                severity: 'INFO'
            };

            await this._writeAuditLog(entry);
            LOG.info(`Data change logged: ${action} ${entityType}(${entityId})`);
        } catch (error) {
            LOG.error('Failed to log data change:', error);
        }
    }

    /**
     * Log export operations (PDF, Excel)
     * @param {Object} req - Request object
     * @param {string} exportType - 'PDF' | 'EXCEL'
     * @param {string} entityType - Entity being exported
     * @param {Array} entityIds - IDs of exported entities
     */
    async logExport(req, exportType, entityType, entityIds = []) {
        try {
            const entry = {
                eventType: 'EXPORT',
                entityType: entityType,
                entityId: entityIds.join(','),
                userId: req.user?.id || 'ANONYMOUS',
                userName: req.user?.name || 'Unknown',
                userEmail: req.user?.email || null,
                action: `EXPORT_${exportType}`,
                timestamp: new Date(),
                ipAddress: this._getClientIP(req),
                tenantId: req.tenant || null,
                details: JSON.stringify({
                    exportType: exportType,
                    recordCount: entityIds.length,
                    entityIds: entityIds
                }),
                severity: 'INFO'
            };

            await this._writeAuditLog(entry);
            LOG.info(`Export logged: ${exportType} ${entityType} (${entityIds.length} records)`);
        } catch (error) {
            LOG.error('Failed to log export:', error);
        }
    }

    /**
     * Log constraint violations during wizard
     * @param {Object} req - Request object
     * @param {string} analysisId - Analysis ID
     * @param {Array} violations - Constraint violations
     */
    async logConstraintViolation(req, analysisId, violations = []) {
        try {
            const entry = {
                eventType: 'CONSTRAINT_VIOLATION',
                entityType: 'CleanCoreAnalysis',
                entityId: analysisId,
                userId: req.user?.id || 'ANONYMOUS',
                userName: req.user?.name || 'Unknown',
                userEmail: req.user?.email || null,
                action: 'VIOLATION_DETECTED',
                timestamp: new Date(),
                ipAddress: this._getClientIP(req),
                tenantId: req.tenant || null,
                details: JSON.stringify({
                    violationCount: violations.length,
                    violations: violations.map(v => ({
                        thresholdName: v.thresholdName,
                        userValue: v.userValue,
                        limit: v.limit,
                        severity: v.severity
                    }))
                }),
                severity: 'WARNING'
            };

            await this._writeAuditLog(entry);
            LOG.warn(`Constraint violations logged for analysis ${analysisId}: ${violations.length} violations`);
        } catch (error) {
            LOG.error('Failed to log constraint violation:', error);
        }
    }

    /**
     * Log configuration changes (project config, thresholds, etc.)
     * @param {Object} req - Request object
     * @param {string} configType - Type of configuration
     * @param {string} configId - Configuration ID
     * @param {Object} before - Config before change
     * @param {Object} after - Config after change
     */
    async logConfigChange(req, configType, configId, before, after) {
        try {
            const entry = {
                eventType: 'CONFIG_CHANGE',
                entityType: configType,
                entityId: configId,
                userId: req.user?.id || 'SYSTEM',
                userName: req.user?.name || 'System',
                userEmail: req.user?.email || null,
                action: 'UPDATE_CONFIG',
                timestamp: new Date(),
                ipAddress: this._getClientIP(req),
                tenantId: req.tenant || null,
                details: JSON.stringify({
                    before: this._sanitizeData(before),
                    after: this._sanitizeData(after),
                    changedFields: this._getChangedFields(before, after)
                }),
                severity: 'INFO'
            };

            await this._writeAuditLog(entry);
            LOG.info(`Config change logged: ${configType}(${configId})`);
        } catch (error) {
            LOG.error('Failed to log config change:', error);
        }
    }

    /**
     * Log security events (unauthorized access, permission denied, etc.)
     * @param {Object} req - Request object
     * @param {string} securityEvent - Event type
     * @param {Object} details - Event details
     */
    async logSecurityEvent(req, securityEvent, details = {}) {
        try {
            const entry = {
                eventType: 'SECURITY',
                entityType: details.entityType || 'Unknown',
                entityId: details.entityId || 'N/A',
                userId: req.user?.id || 'ANONYMOUS',
                userName: req.user?.name || 'Unknown',
                userEmail: req.user?.email || null,
                action: securityEvent,
                timestamp: new Date(),
                ipAddress: this._getClientIP(req),
                tenantId: req.tenant || null,
                details: JSON.stringify(details),
                severity: 'WARNING'
            };

            await this._writeAuditLog(entry);
            LOG.warn(`Security event logged: ${securityEvent}`);
        } catch (error) {
            LOG.error('Failed to log security event:', error);
        }
    }

    /**
     * Query audit logs with filters
     * @param {Object} filters - Query filters
     * @returns {Array} Audit log entries
     */
    async queryAuditLogs(filters = {}) {
        try {
            const { SELECT } = cds.ql;
            let query = SELECT.from('sd.AuditLog');

            if (filters.userId) {
                query = query.where({ userId: filters.userId });
            }
            if (filters.entityType) {
                query = query.where({ entityType: filters.entityType });
            }
            if (filters.eventType) {
                query = query.where({ eventType: filters.eventType });
            }
            if (filters.startDate) {
                query = query.where(`timestamp >= ${filters.startDate}`);
            }
            if (filters.endDate) {
                query = query.where(`timestamp <= ${filters.endDate}`);
            }
            if (filters.tenantId) {
                query = query.where({ tenantId: filters.tenantId });
            }

            query = query.orderBy('timestamp desc').limit(filters.limit || 100);

            const results = await query;
            LOG.info(`Audit logs queried: ${results.length} entries`);
            return results;
        } catch (error) {
            LOG.error('Failed to query audit logs:', error);
            return [];
        }
    }

    // ==================== Private Helper Methods ====================

    /**
     * Write audit log entry to database
     * @private
     */
    async _writeAuditLog(entry) {
        try {
            const { INSERT } = cds.ql;
            await INSERT.into('sd.AuditLog').entries(entry);
        } catch (error) {
            LOG.error('Failed to write audit log to database:', error);
            // Fallback to console logging if DB write fails
            console.error('[AUDIT]', JSON.stringify(entry));
        }
    }

    /**
     * Get client IP address from request
     * @private
     */
    _getClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               'Unknown';
    }

    /**
     * Sanitize sensitive data before logging
     * @private
     */
    _sanitizeData(data) {
        if (!data) return null;

        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

        Object.keys(sanitized).forEach(key => {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                sanitized[key] = '***REDACTED***';
            }
        });

        return sanitized;
    }

    /**
     * Get list of changed fields between before/after objects
     * @private
     */
    _getChangedFields(before, after) {
        if (!before || !after) return [];

        const changed = [];
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

        allKeys.forEach(key => {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                changed.push({
                    field: key,
                    oldValue: before[key],
                    newValue: after[key]
                });
            }
        });

        return changed;
    }
}

module.exports = AuditService;
