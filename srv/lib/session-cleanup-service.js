const cds = require('@sap/cds');
const LOG = cds.log('session-cleanup-service');

/**
 * Session Cleanup Service - Background cleanup of expired wizard sessions
 * 
 * @class SessionCleanupService
 * @description
 * Implements background cleanup of expired WizardSession records.
 * Sessions expire after 24 hours per specification (WizardSession.expiresAt field).
 * 
 * Cleanup responsibilities:
 * 1. Find expired sessions (expiresAt < now)
 * 2. Mark as 'Expired' (status field)
 * 3. Create audit records for each cleanup
 * 4. Log operations for operational visibility
 * 
 * Execution model:
 * - Can be called manually via admin action
 * - Designed to be invoked by SAP BTP Job Scheduler (every 1hr)
 * - Also triggered on-demand when wizard checks session validity
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */

class SessionCleanupService {
  /**
   * Execute cleanup for expired sessions across all tenants
   * 
   * @async
   * @param {Object} [options={}] - Lifecycle options
   * @param {string} [options.dryRun=false] - If true, simulate cleanup without modifying data
   * @param {string} [options.tenantFilter] - If supplied, filter to specific tenant only
   * @returns {Promise<Object>} Cleanup summary {cleaned: number, expired: number, errors: number}
   * 
   * @description
   * Primary entry point for session cleanup. Queries all WizardSession records with 
   * expiresAt in the past, marks them as Expired, and creates audit records.
   */
  async cleanupExpiredSessions(options = {}) {
    const {
      dryRun = false,
      tenantFilter = null
    } = options;

    const startTime = new Date();
    let cleanedCount = 0;
    let errorCount = 0;
    const summary = { cleaned: 0, expired: 0, errors: 0, startTime, endTime: null };

    try {
      LOG.info(`Starting session cleanup (dryRun=${dryRun})`, { tenantFilter });

      // Query expired sessions
      const whereClause = {
        expiresAt: { '<': new Date().toISOString() },
        sessionStatus: { '!=': 'Expired' } // Avoid re-processing already expired
      };

      // Optional tenant filter (for tenant-specific cleanup)
      if (tenantFilter) {
        whereClause.tenant = tenantFilter;
      }

      const { WizardSessions } = cds.entities('sd');
      const expiredSessions = await SELECT.from(WizardSessions)
        .where(whereClause)
        .columns(c => [
          c`*`,
          c.analysis(a => [a`*`])
        ]);

      summary.expired = expiredSessions.length;
      LOG.info(`Found ${expiredSessions.length} expired sessions for cleanup`);

      // Process each expired session
      for (const session of expiredSessions) {
        try {
          if (!dryRun) {
            // Mark session as Expired
            await UPDATE(WizardSessions).set({
              sessionStatus: 'Expired',
              lastActivity: new Date().toISOString()
            }).where({ ID: session.ID });

            // Create audit record
            const { AuditLog } = cds.entities('sd');
            await INSERT.into(AuditLog).entries({
              eventType: 'WIZARD_OPERATION',
              eventCategory: 'SYSTEM_EVENT',
              entityType: 'WizardSession',
              entityId: session.ID,
              userId: 'SYSTEM_CLEANUP',
              action: 'CLEANUP_EXPIRED',
              details: JSON.stringify({
                sessionStatus: `${session.sessionStatus} -> Expired`,
                expiresAt: session.expiresAt
              }),
              tenantId: session.tenant,
              timestamp: new Date().toISOString(),
              severity: 'INFO'
            });

            cleanedCount++;
            LOG.debug(`Cleaned expired session ${session.ID} for analysis ${session.analysis_ID}`);
          } else {
            // Dry run: just log what would be cleaned
            LOG.debug(`[DRY_RUN] Would clean session ${session.ID} for analysis ${session.analysis_ID}`);
            cleanedCount++;
          }
        } catch (sessionErr) {
          errorCount++;
          LOG.error(`Failed to cleanup session ${session.ID}`, {
            error: sessionErr.message,
            sessionId: session.ID,
            tenant: session.tenant
          });
        }
      }

      summary.cleaned = cleanedCount;
      summary.errors = errorCount;
      summary.endTime = new Date();
      summary.durationMs = summary.endTime - startTime;

      LOG.info(`Session cleanup complete: cleaned=${cleanedCount} errors=${errorCount} duration=${summary.durationMs}ms`);
      
      return summary;
    } catch (error) {
      LOG.error('Session cleanup failed fatally', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if session is still valid (not expired)
   * 
   * @async
   * @param {string} sessionId - Session ID to check
   * @param {string} tenant - Tenant context
   * @returns {Promise<boolean>} true if session is valid and not expired
   * 
   * @description
   * Quick validation for wizard handlers. Returns false if session is expired or missing.
   * Does not mark as Expired; only checks current status.
   */
  async isSessionValid(sessionId, tenant) {
    const { WizardSessions } = cds.entities('sd');

    const session = await SELECT.one.from(WizardSessions)
      .where({ ID: sessionId, tenant: tenant, sessionStatus: { '!=': 'Expired' } });

    if (!session) {
      return false;
    }

    // Check expiry time
    if (new Date(session.expiresAt) < new Date()) {
      LOG.warn(`Session ${sessionId} is expired`, { tenant });
      return false;
    }

    return true;
  }

  /**
   * Extend session expiry (called on user activity)
   * 
   * @async
   * @param {string} sessionId - Session ID to extend
   * @param {string} tenant - Tenant context
   * @param {number} [extensionMinutes=1440] - Minutes to extend (default 24 hours)
   * @returns {Promise<Object>} Updated session object
   * 
   * @description
   * Called by wizard handlers on each user interaction to keep session alive
   * as long as user remains active. Prevents unexpected session expiry.
   */
  async extendSessionExpiry(sessionId, tenant, extensionMinutes = 1440) {
    const { WizardSessions } = cds.entities('sd');

    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + extensionMinutes);

    const updated = await UPDATE(WizardSessions).set({
      expiresAt: newExpiresAt.toISOString(),
      lastActivity: new Date().toISOString()
    }).where({ ID: sessionId, tenant: tenant });

    LOG.debug(`Extended session ${sessionId} expiry to ${newExpiresAt.toISOString()}`);

    return updated;
  }

  /**
   * Get session cleanup stats for monitoring/alerting
   * 
   * @async
   * @returns {Promise<Object>} Stats object {totalSessions, activeSessions, expiredSessions, expiringSoonCount}
   * 
   * @description
   * Provides operational metrics for monitoring dashboards.
   * Helps detect abnormal cleanup patterns or accumulation of expired sessions.
   */
  async getCleanupStats() {
    const { WizardSessions } = cds.entities('sd');
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now

    const total = await SELECT.from(WizardSessions).columns(c => cds.fn('count')(c`*`).as('count'));
    const active = await SELECT.from(WizardSessions)
      .where({ sessionStatus: { '!=': 'Expired' }, expiresAt: { '>=': now.toISOString() } })
      .columns(c => cds.fn('count')(c`*`).as('count'));
    const expired = await SELECT.from(WizardSessions)
      .where({ sessionStatus: 'Expired' })
      .columns(c => cds.fn('count')(c`*`).as('count'));
    const expiringSoon = await SELECT.from(WizardSessions)
      .where({
        sessionStatus: { '!=': 'Expired' },
        expiresAt: { '>=': now.toISOString(), '<=': soonThreshold.toISOString() }
      })
      .columns(c => cds.fn('count')(c`*`).as('count'));

    return {
      totalSessions: total[0]?.count || 0,
      activeSessions: active[0]?.count || 0,
      expiredSessions: expired[0]?.count || 0,
      expiringSoonCount: expiringSoon[0]?.count || 0,
      timestamp: now.toISOString()
    };
  }
}

module.exports = new SessionCleanupService();
