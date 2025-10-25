/**
 * Custom Server Bootstrap
 * 
 * Extends CAP server with security middleware and custom configurations
 * before starting the application.
 * 
 * This file is automatically loaded by CAP if present in the srv/ directory.
 */

const cds = require('@sap/cds');
const SecurityMiddleware = require('./lib/security-middleware');

module.exports = async (o) => {
    // Get the Express app instance
    const app = o.app || cds.app;

    // Configure security middleware
    SecurityMiddleware.configure(app);

    // Return the modified app
    return o;
};
