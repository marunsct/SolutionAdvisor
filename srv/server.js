const cds = require('@sap/cds');
const LOG = cds.log('security');
/**
 * Custom Server Bootstrap
 *
 * Extends CAP server with security middleware and custom configurations
 * before starting the application.
 *
 * This file is automatically loaded by CAP if present in the srv/ directory.
 */

const SecurityMiddleware = require('./lib/security-middleware');

// Use CAP's bootstrap hook to reliably access the Express app
cds.on('bootstrap', (app) => {
    // Guard: ensure app is defined (should always be in bootstrap)
    if (!app || typeof app.use !== 'function') {
        LOG.warn('SecurityMiddleware: Express app not available during bootstrap');
        return;
    }
    SecurityMiddleware.configure(app);
});

// Export the standard CAP server
module.exports = cds.server;
