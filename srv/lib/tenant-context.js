const cds = require('@sap/cds');
const LOG = cds.log('tenant-context');

/**
 * TenantContext Service - Centralized tenant identity resolution and enforcement
 * 
 * @class TenantContext
 * @description
 * Provides strict, fail-fast tenant context resolution for all authenticated operations.
 * Eliminates silent fallback patterns and enforces explicit tenant presence in protected flows.
 * 
 * This utility ensures:
 * 1. Tenant context is always resolved consistently across backend services
 * 2. Missing tenant context in protected operations fails fast (no silent defaults)
 * 3. All tenant-scoped queries and updates include deterministic tenant filtering
 * 4. Audit trail captures tenant context for every operation
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */

class TenantContext {
  /**
   * Extract tenant from request context with fail-fast behavior
   * 
   * @param {Object} req - CAP request object
   * @param {boolean} [strict=true] - If true, throws when tenant not found; if false, returns 'default'
   * @returns {string} Tenant ID (UUID or 'default' only in dev mode)
   * @throws {Error} When strict=true and tenant context is missing
   * 
   * @description
   * Primary extraction method. Reads from:
   * 1. req.user.tenant (from XSUAA JWT attribute)
   * 2. req.context.tenant (from CAP context)
   * 3. req.tenant (pre-injected by middleware)
   * 
   * In production (process.env.NODE_ENV === 'production'), strict mode is always enforced.
   * In development, missing tenant falls back to 'default' only with explicit opt-in.
   */
  static getTenant(req, strict = true) {
    // Try multiple sources for tenant context
    const tenant = req.user?.tenant 
      || req.context?.tenant 
      || req.tenant 
      || (cds.context?.tenant);

    // Production: always require explicit tenant
    if (process.env.NODE_ENV === 'production' && !tenant) {
      LOG.error('SECURITY: Tenant context missing in production request', {
        userId: req.user?.id,
        path: req._path
      });
      throw new Error('Tenant context required for authenticated operations');
    }

    // Development mode: enforce strict by default, allow fallback only if explicit opt-in
    if (strict && !tenant) {
      LOG.warn('SECURITY: Tenant context missing in authenticated request', {
        userId: req.user?.id,
        path: req._path,
        strict: true
      });
      throw new Error(`Tenant context missing for user ${req.user?.id}. Enable dev mode with strict=false only for testing.`);
    }

    // Development mode: fallback to 'default' if not strict
    const result = tenant || 'default';

    // Log development-mode fallbacks for audit
    if (!tenant && !strict) {
      LOG.info('DEV_MODE: Using default tenant (should be local-dev only)', {
        userId: req.user?.id,
        path: req._path
      });
    }

    return result;
  }

  /**
   * Inject tenant context into request before processing
   * 
   * @param {Object} req - CAP request object
   * @param {boolean} [allowDevDefault=false] - Allow 'default' in dev mode (test/local only)
   * 
   * @description
   * Middleware hook to normalize tenant context before handlers execute.
   * Should be registered early in request lifecycle via this.before('*').
   */
  static injectTenant(req, allowDevDefault = false) {
    const strict = !allowDevDefault;
    try {
      req.tenant = this.getTenant(req, strict);
      if (req.data) {
        req.data.tenant = req.tenant;
      }
    } catch (err) {
      // Rethrow for request handler to catch and return 403
      throw err;
    }
  }

  /**
   * Build WHERE clause with automatic tenant filtering
   * 
   * @param {Object} [baseWhere={}] - Existing WHERE clause filters
   * @param {string} tenant - Tenant ID
   * @returns {Object} Enhanced WHERE clause with tenant filter
   * 
   * @description
   * Extends WHERE clause to include tenant constraint.
   * Used in all SELECT queries to enforce automatic isolation.
   * 
   * Example:
   *   const where = TenantContext.addTenantFilter({status: 'active'}, req.tenant);
   *   SELECT.from(Analyses).where(where);
   *   // Generates: WHERE tenant = 'tenant-uuid' AND status = 'active'
   */
  static addTenantFilter(baseWhere = {}, tenant) {
    if (!tenant) {
      throw new Error('addTenantFilter: tenant parameter required');
    }
    return {
      ...baseWhere,
      tenant: tenant
    };
  }

  /**
   * Verify operation target belongs to request tenant (ownership check)
   * 
   * @param {Object} entity - Entity object from database
   * @param {string} tenant - Request tenant
   * @param {string} [entityName='Entity'] - Entity name for error message
   * @throws {Error} When entity.tenant !== request tenant
   * 
   * @description
   * Cross-tenant operation guard. Called before update/delete to ensure
   * operator cannot modify resources from other tenants.
   * 
   * Example:
   *   const analysis = await SELECT.one.from(Analyses, id);
   *   TenantContext.verifyOwnership(analysis, req.tenant, 'Analyses');
   *   await UPDATE(Analyses, id).set({status: 'completed'});
   */
  static verifyOwnership(entity, tenant, entityName = 'Entity') {
    if (!entity) {
      throw new Error(`${entityName} not found`);
    }
    if (entity.tenant !== tenant) {
      LOG.error('SECURITY: Cross-tenant operation attempt', {
        attemptedTenant: tenant,
        resourceTenant: entity.tenant,
        entity: entityName
      });
      throw new Error(`${entityName} belongs to different tenant. Access denied.`);
    }
  }

  /**
   * Batch-check tenant ownership for multiple entities
   * 
   * @param {Array} entities - Array of entity objects
   * @param {string} tenant - Request tenant
   * @param {string} [entityName='Entity'] - Entity name for error message
   * @throws {Error} When any entity.tenant !== request tenant
   * 
   * @description
   * Efficient batch verification for operations affecting multiple records.
   * Fails fast on first mismatch.
   */
  static verifyOwnershipBatch(entities, tenant, entityName = 'Entity') {
    if (!Array.isArray(entities)) {
      entities = [entities];
    }
    for (const entity of entities) {
      if (entity && entity.tenant !== tenant) {
        LOG.error('SECURITY: Batch operation cross-tenant violation', {
          attemptedTenant: tenant,
          resourceTenant: entity.tenant,
          entity: entityName,
          entityCount: entities.length
        });
        throw new Error(`${entityName} batch operation includes records from different tenants. Access denied.`);
      }
    }
  }

  /**
   * Build tenant-aware cache key
   * 
   * @param {string} tenant - Tenant ID
   * @param {string} keyBase - Base cache key (e.g., 'questions-for-analysis')
   * @param {string} [id] - Optional entity ID
   * @returns {string} Tenant-scoped cache key
   * 
   * @description
   * Ensures cache entries for different tenants never collide.
   * 
   * Example:
   *   const key = TenantContext.cacheKey(req.tenant, 'questions', analysisId);
   *   // Result: 'tenant-uuid:questions:analysisId'
   */
  static cacheKey(tenant, keyBase, id = null) {
    if (!tenant || !keyBase) {
      throw new Error('cacheKey: tenant and keyBase required');
    }
    return id ? `${tenant}:${keyBase}:${id}` : `${tenant}:${keyBase}`;
  }

  /**
   * Create audit context object for operations
   * 
   * @param {Object} req - CAP request object
   * @returns {Object} Audit context {tenant, userId, timestamp, ipAddress}
   * 
   * @description
   * Captures tenant-scoped audit metadata for compliance logging.
   */
  static auditContext(req) {
    return {
      tenant: req.tenant,
      userId: req.user?.id,
      userName: req.user?.name,
      timestamp: new Date().toISOString(),
      ipAddress: req.get('x-forwarded-for') || req.ip,
      userAgentType: req.get('user-agent')?.includes('Mobile') ? 'mobile' : 'web'
    };
  }

  /**
   * Middleware registration helper
   * 
   * @param {Object} service - CAP service instance (this)
   * @param {boolean} [allowDevDefault=false] - Allow 'default' tenant in dev mode
   * 
   * @description
   * Registers tenant injection as early middleware.
   * Usage in service.cds implementation:
   * 
   *   module.exports = cds.service.impl(async function () {
   *     TenantContext.registerMiddleware(this, false); // Strict mode
   *     // ... rest of service implementation
   *   });
   */
  static registerMiddleware(service, allowDevDefault = false) {
    service.before('*', (req) => {
      try {
        TenantContext.injectTenant(req, allowDevDefault);
      } catch (err) {
        // Return 403 Forbidden for missing tenant context
        req.reject(403, 'Tenant context required for authenticated operations', 'TENANT_CONTEXT_MISSING');
      }
    });

    LOG.info('TenantContext middleware registered', { strict: !allowDevDefault });
  }
}

module.exports = TenantContext;
