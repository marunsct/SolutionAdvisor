const NodeCache = require('node-cache');
const cds = require('@sap/cds');
const LOG = cds.log('cache-service');

/**
 * Cache Service - In-memory caching for frequently accessed data
 * 
 * @class CacheService
 * @description
 * Provides a centralized caching layer to improve application performance.
 * Uses node-cache for in-memory storage with configurable TTL (time-to-live).
 * Supports tenant-aware caching for multi-tenant scenarios.
 * 
 * Cached data categories:
 * - Master data (CleanCoreLevels, ObjectTypes, PerformanceThresholds)
 * - Real-world examples (filtered by object type)
 * - Question flows (by object type)
 * - User roles and permissions
 * - Analytics aggregations (with shorter TTL)
 * 
 * Cache invalidation triggers:
 * - Manual invalidation via admin API
 * - Automatic expiry based on TTL
 * - CDS event-based invalidation on CREATE/UPDATE/DELETE
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */
class CacheService {
    constructor() {
        // Initialize cache with default settings
        // stdTTL: Standard time-to-live in seconds (default: 10 minutes)
        // checkperiod: Automatic check for expired entries in seconds (default: 2 minutes)
        // useClones: Clone objects before returning (prevents cache corruption)
        this.cache = new NodeCache({
            stdTTL: 600,        // 10 minutes default TTL
            checkperiod: 120,   // Check every 2 minutes
            useClones: true     // Always clone objects
        });
        
        // Separate cache for master data (longer TTL - 1 hour)
        this.masterDataCache = new NodeCache({
            stdTTL: 3600,       // 1 hour
            checkperiod: 600,   // Check every 10 minutes
            useClones: true
        });
        
        // Short-lived cache for analytics (5 minutes)
        this.analyticsCache = new NodeCache({
            stdTTL: 300,        // 5 minutes
            checkperiod: 60,    // Check every minute
            useClones: true
        });
        
        // Track cache statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        
        LOG.info('CacheService initialized with multi-tier caching');
    }
    
    /**
     * Generate cache key with tenant awareness
     * 
     * @param {string} entity - Entity name
     * @param {string} id - Record ID or filter key
     * @param {string} tenant - Tenant ID (defaults to current tenant)
     * @returns {string} Cache key
     */
    _getCacheKey(entity, id, tenant = null) {
        const tenantId = tenant || cds.context?.tenant;
        if (!tenantId) {
            LOG.warn(`Cache key generated without tenant context for ${entity}:${id}, using 'system'`);
            return `system:${entity}:${id}`;
        }
        return `${tenantId}:${entity}:${id}`;
    }
    
    /**
     * Get value from cache
     * 
     * @param {string} entity - Entity name
     * @param {string} id - Record ID or filter key
     * @param {string} cacheType - Cache tier ('default'|'master'|'analytics')
     * @returns {*} Cached value or undefined
     */
    get(entity, id, cacheType = 'default') {
        const key = this._getCacheKey(entity, id);
        const targetCache = this._getCache(cacheType);
        
        const value = targetCache.get(key);
        
        if (value !== undefined) {
            this.stats.hits++;
            LOG.debug(`Cache HIT for ${key}`);
        } else {
            this.stats.misses++;
            LOG.debug(`Cache MISS for ${key}`);
        }
        
        return value;
    }
    
    /**
     * Set value in cache
     * 
     * @param {string} entity - Entity name
     * @param {string} id - Record ID or filter key
     * @param {*} value - Value to cache
     * @param {number} ttl - Optional custom TTL in seconds
     * @param {string} cacheType - Cache tier ('default'|'master'|'analytics')
     * @returns {boolean} Success
     */
    set(entity, id, value, ttl = null, cacheType = 'default') {
        const key = this._getCacheKey(entity, id);
        const targetCache = this._getCache(cacheType);
        
        const success = ttl 
            ? targetCache.set(key, value, ttl) 
            : targetCache.set(key, value);
        
        if (success) {
            this.stats.sets++;
            LOG.debug(`Cache SET for ${key}`);
        }
        
        return success;
    }
    
    /**
     * Delete value from cache
     * 
     * @param {string} entity - Entity name
     * @param {string} id - Record ID or filter key
     * @param {string} cacheType - Cache tier ('default'|'master'|'analytics')
     * @returns {number} Number of deleted entries
     */
    delete(entity, id, cacheType = 'default') {
        const key = this._getCacheKey(entity, id);
        const targetCache = this._getCache(cacheType);
        
        const deleted = targetCache.del(key);
        
        if (deleted > 0) {
            this.stats.deletes++;
            LOG.debug(`Cache DELETE for ${key}`);
        }
        
        return deleted;
    }
    
    /**
     * Invalidate all cache entries for an entity
     * 
     * @param {string} entity - Entity name to invalidate
     * @param {string} cacheType - Cache tier ('default'|'master'|'analytics'|'all')
     */
    invalidateEntity(entity, cacheType = 'all') {
        const tenantId = cds.context?.tenant || 'default';
        const pattern = `${tenantId}:${entity}:`;
        
        const caches = cacheType === 'all' 
            ? [this.cache, this.masterDataCache, this.analyticsCache]
            : [this._getCache(cacheType)];
        
        caches.forEach(cache => {
            const keys = cache.keys().filter(k => k.startsWith(pattern));
            if (keys.length > 0) {
                cache.del(keys);
                LOG.info(`Invalidated ${keys.length} cache entries for entity ${entity}`);
            }
        });
    }
    
    /**
     * Clear all caches (use with caution)
     */
    flushAll() {
        this.cache.flushAll();
        this.masterDataCache.flushAll();
        this.analyticsCache.flushAll();
        LOG.warn('All caches flushed');
    }
    
    /**
     * Get cache statistics
     * 
     * @returns {Object} Statistics including hits, misses, hit rate
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 
            ? ((this.stats.hits / totalRequests) * 100).toFixed(2) 
            : 0;
        
        return {
            ...this.stats,
            totalRequests,
            hitRate: `${hitRate}%`,
            cacheKeys: {
                default: this.cache.keys().length,
                master: this.masterDataCache.keys().length,
                analytics: this.analyticsCache.keys().length
            }
        };
    }
    
    /**
     * Get appropriate cache instance based on type
     */
    _getCache(type) {
        switch (type) {
            case 'master':
                return this.masterDataCache;
            case 'analytics':
                return this.analyticsCache;
            default:
                return this.cache;
        }
    }
    
    /**
     * Cached wrapper for master data queries
     * 
     * @param {string} entity - Entity name
     * @param {Function} queryFn - Function that returns a promise with data
     * @returns {Promise<*>} Cached or fresh data
     */
    async getMasterData(entity, queryFn) {
        const cacheKey = 'all';
        let data = this.get(entity, cacheKey, 'master');
        
        if (data === undefined) {
            data = await queryFn();
            this.set(entity, cacheKey, data, null, 'master');
        }
        
        return data;
    }
    
    /**
     * Cached wrapper for analytics queries
     * 
     * @param {string} key - Unique key for analytics query
     * @param {Function} queryFn - Function that returns a promise with data
     * @param {number} ttl - Custom TTL (default: 5 minutes)
     * @returns {Promise<*>} Cached or fresh data
     */
    async getAnalytics(key, queryFn, ttl = 300) {
        let data = this.get('analytics', key, 'analytics');
        
        if (data === undefined) {
            data = await queryFn();
            this.set('analytics', key, data, ttl, 'analytics');
        }
        
        return data;
    }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
