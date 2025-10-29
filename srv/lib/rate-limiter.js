const cds = require('@sap/cds');
const LOG = cds.log('rate-limiter');

/**
 * API Rate Limiting Middleware
 * 
 * Implements token bucket algorithm for API rate limiting with multi-level controls:
 * - Per-user rate limits (100 req/min)
 * - Per-tenant rate limits (1000 req/min)
 * - Expensive operation limits (10 req/min for scoring/analytics)
 * 
 * @module srv/lib/rate-limiter
 * @author SAP Clean Core Team
 * @version 1.0.0
 */

class RateLimiter {
    constructor() {
        // In-memory storage for rate limit tracking
        // In production, use Redis for distributed rate limiting
        this.userBuckets = new Map(); // userId -> { tokens: number, lastRefill: timestamp }
        this.tenantBuckets = new Map(); // tenantId -> { tokens: number, lastRefill: timestamp }
        
        // Rate limit configurations
        this.config = {
            user: {
                capacity: 100,        // Max tokens
                refillRate: 100,      // Tokens per minute
                refillInterval: 60000 // 1 minute in ms
            },
            tenant: {
                capacity: 1000,
                refillRate: 1000,
                refillInterval: 60000
            },
            expensive: {
                capacity: 10,
                refillRate: 10,
                refillInterval: 60000,
                paths: [
                    '/recalculateScores',
                    '/getAnalytics',
                    '/exportAnalysis',
                    '/generateReport'
                ]
            }
        };

        // Whitelist admin users from rate limits
        this.adminRoles = ['Admin', 'ServiceProviderAdmin'];
        
        // Start cleanup interval (remove stale buckets every 5 minutes)
        this.startCleanup();
    }

    /**
     * Get or create token bucket for a key
     * @private
     */
    _getBucket(bucketMap, key, config) {
        if (!bucketMap.has(key)) {
            bucketMap.set(key, {
                tokens: config.capacity,
                lastRefill: Date.now()
            });
        }
        
        const bucket = bucketMap.get(key);
        
        // Refill tokens based on elapsed time
        const now = Date.now();
        const elapsed = now - bucket.lastRefill;
        const refillCount = Math.floor(elapsed / config.refillInterval) * config.refillRate;
        
        if (refillCount > 0) {
            bucket.tokens = Math.min(config.capacity, bucket.tokens + refillCount);
            bucket.lastRefill = now;
        }
        
        return bucket;
    }

    /**
     * Check if request is allowed under rate limits
     * @param {Object} req - Express/CAP request object
     * @returns {Object} { allowed: boolean, retryAfter: number|null }
     */
    checkLimit(req) {
        // Admin users bypass rate limits
        if (this.adminRoles.some(role => req.user?.is(role))) {
            return { allowed: true, retryAfter: null };
        }

        const userId = req.user?.id || 'anonymous';
        const tenantId = req.user?.tenant || 'default';
        const path = req.path || req._.odataReq?.getPath() || '';

        // Determine cost (expensive operations cost more tokens)
        const isExpensive = this.config.expensive.paths.some(p => path.includes(p));
        const cost = isExpensive ? 10 : 1;

        // Check user-level limit
        const userBucket = this._getBucket(this.userBuckets, userId, this.config.user);
        if (userBucket.tokens < cost) {
            const retryAfter = Math.ceil(this.config.user.refillInterval / 1000);
            LOG.warn('Rate limit exceeded for user', { userId, path, tokens: userBucket.tokens });
            return { allowed: false, retryAfter, reason: 'User rate limit exceeded' };
        }

        // Check tenant-level limit
        const tenantBucket = this._getBucket(this.tenantBuckets, tenantId, this.config.tenant);
        if (tenantBucket.tokens < cost) {
            const retryAfter = Math.ceil(this.config.tenant.refillInterval / 1000);
            LOG.warn('Rate limit exceeded for tenant', { tenantId, path, tokens: tenantBucket.tokens });
            return { allowed: false, retryAfter, reason: 'Tenant rate limit exceeded' };
        }

        // Consume tokens
        userBucket.tokens -= cost;
        tenantBucket.tokens -= cost;

        return { allowed: true, retryAfter: null };
    }

    /**
     * Express/CAP middleware function
     */
    middleware() {
        return (req, res, next) => {
            const result = this.checkLimit(req);

            if (!result.allowed) {
                // Set Retry-After header
                if (res && res.set) {
                    res.set('Retry-After', result.retryAfter);
                }

                // Return 429 Too Many Requests
                const error = new Error(result.reason || 'Rate limit exceeded');
                error.code = 429;
                error.status = 429;
                
                if (req.reject) {
                    // CAP-style rejection
                    return req.reject(429, result.reason || 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
                } else if (res && res.status) {
                    // Express-style response
                    return res.status(429).json({
                        error: {
                            code: 'RATE_LIMIT_EXCEEDED',
                            message: result.reason || 'Rate limit exceeded',
                            '@Common.numericSeverity': 4,
                            retryAfter: result.retryAfter
                        }
                    });
                } else {
                    throw error;
                }
            }

            // Request allowed, continue
            if (next) {
                next();
            }
        };
    }

    /**
     * Cleanup stale buckets to prevent memory leaks
     * @private
     */
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            const staleThreshold = 10 * 60 * 1000; // 10 minutes

            // Clean user buckets
            for (const [key, bucket] of this.userBuckets.entries()) {
                if (now - bucket.lastRefill > staleThreshold) {
                    this.userBuckets.delete(key);
                }
            }

            // Clean tenant buckets
            for (const [key, bucket] of this.tenantBuckets.entries()) {
                if (now - bucket.lastRefill > staleThreshold) {
                    this.tenantBuckets.delete(key);
                }
            }

            LOG.info('Rate limiter cleanup completed', {
                userBuckets: this.userBuckets.size,
                tenantBuckets: this.tenantBuckets.size
            });
        }, 5 * 60 * 1000); // Run every 5 minutes
    }

    /**
     * Get current rate limit status for a user/tenant
     * @param {string} userId - User identifier
     * @param {string} tenantId - Tenant identifier
     * @returns {Object} Status information
     */
    getStatus(userId, tenantId) {
        const userBucket = this._getBucket(this.userBuckets, userId, this.config.user);
        const tenantBucket = this._getBucket(this.tenantBuckets, tenantId, this.config.tenant);

        return {
            user: {
                remaining: Math.floor(userBucket.tokens),
                limit: this.config.user.capacity,
                resetAt: new Date(userBucket.lastRefill + this.config.user.refillInterval)
            },
            tenant: {
                remaining: Math.floor(tenantBucket.tokens),
                limit: this.config.tenant.capacity,
                resetAt: new Date(tenantBucket.lastRefill + this.config.tenant.refillInterval)
            }
        };
    }

    /**
     * Reset rate limits for a specific user (admin function)
     * @param {string} userId - User identifier
     */
    resetUser(userId) {
        this.userBuckets.delete(userId);
        LOG.info('Rate limit reset for user', { userId });
    }

    /**
     * Reset rate limits for a specific tenant (admin function)
     * @param {string} tenantId - Tenant identifier
     */
    resetTenant(tenantId) {
        this.tenantBuckets.delete(tenantId);
        LOG.info('Rate limit reset for tenant', { tenantId });
    }
}

// Export singleton instance
const rateLimiter = new RateLimiter();

module.exports = {
    RateLimiter,
    rateLimiter,
    middleware: rateLimiter.middleware.bind(rateLimiter)
};
