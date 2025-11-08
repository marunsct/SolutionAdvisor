/**
 * Admin Service Event Handlers
 * 
 * Implements audit logging for all admin master data entities
 * Logs CREATE, UPDATE, DELETE operations to AuditLog table
 */

const cds = require('@sap/cds');
const LOG = cds.log('admin-service');
const AuditService = require('./audit-service');

module.exports = async (srv) => {
    const auditService = new AuditService();
    await auditService.init();

    // List of admin entities to track
    const adminEntities = [
        'QuestionFlow',
        'PerformanceThreshold',
        'RealWorldExample',
        'CleanCoreLevels',
        'ObjectTypes'
    ];

    // Register CREATE handlers for audit logging
    adminEntities.forEach(entityName => {
        srv.after('CREATE', entityName, async (data, req) => {
            try {
                // Handle both single record and array responses
                const records = Array.isArray(data) ? data : [data];
                
                for (const record of records) {
                    await auditService.logDataChange(
                        req,
                        'CREATE',
                        entityName,
                        record.ID || record.id || 'UNKNOWN',
                        null,
                        record
                    );
                }
                
                LOG.info(`Audit log: Created ${records.length} ${entityName} record(s)`);
            } catch (error) {
                LOG.error(`Failed to log CREATE for ${entityName}:`, error);
                // Don't fail the operation if audit logging fails
            }
        });
    });

    // Register UPDATE handlers for audit logging
    adminEntities.forEach(entityName => {
        srv.before('UPDATE', entityName, async (req) => {
            try {
                // Store the before state for comparison in after handler
                const entityId = req.data.ID || req.data.id;
                if (entityId) {
                    const beforeData = await SELECT.one.from(entityName).where({ ID: entityId });
                    req._beforeData = beforeData;
                }
            } catch (error) {
                LOG.error(`Failed to capture before state for ${entityName}:`, error);
            }
        });

        srv.after('UPDATE', entityName, async (data, req) => {
            try {
                const beforeData = req._beforeData || null;
                const records = Array.isArray(data) ? data : [data];
                
                for (const record of records) {
                    await auditService.logDataChange(
                        req,
                        'UPDATE',
                        entityName,
                        record.ID || record.id || 'UNKNOWN',
                        beforeData,
                        record
                    );
                }
                
                LOG.info(`Audit log: Updated ${records.length} ${entityName} record(s)`);
            } catch (error) {
                LOG.error(`Failed to log UPDATE for ${entityName}:`, error);
            }
        });
    });

    // Register DELETE handlers for audit logging
    adminEntities.forEach(entityName => {
        srv.before('DELETE', entityName, async (req) => {
            try {
                // Capture the record before deletion
                const entityId = req.data.ID || req.data.id;
                if (entityId) {
                    const beforeData = await SELECT.one.from(entityName).where({ ID: entityId });
                    req._beforeData = beforeData;
                }
            } catch (error) {
                LOG.error(`Failed to capture before state for DELETE ${entityName}:`, error);
            }
        });

        srv.after('DELETE', entityName, async (data, req) => {
            try {
                const beforeData = req._beforeData || data;
                const entityId = (beforeData && (beforeData.ID || beforeData.id)) || 'UNKNOWN';
                
                await auditService.logDataChange(
                    req,
                    'DELETE',
                    entityName,
                    entityId,
                    beforeData,
                    null
                );
                
                LOG.info(`Audit log: Deleted ${entityName} record ${entityId}`);
            } catch (error) {
                LOG.error(`Failed to log DELETE for ${entityName}:`, error);
            }
        });
    });

    LOG.info('Admin service audit logging handlers registered successfully');
};
