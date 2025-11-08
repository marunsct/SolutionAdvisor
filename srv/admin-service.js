/**
 * Admin Service Implementation
 * 
 * Provides custom logic and audit logging for admin master data maintenance
 * Delegates to admin-service-handlers for audit trail
 */

const cds = require('@sap/cds');
const LOG = cds.log('admin-service');
const adminHandlers = require('./lib/admin-service-handlers');

module.exports = cds.service.impl(async function () {
    LOG.info('Initializing Admin Service...');

    // Register audit logging handlers
    await adminHandlers(this);

    // Add any custom actions or validations here in the future
    // For example:
    // this.on('validateQuestionFlowLogic', async (req) => { ... });
    // this.on('bulkImportQuestionFlow', async (req) => { ... });

    LOG.info('Admin Service initialized successfully');
});
