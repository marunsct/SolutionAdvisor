/**
 * Query Optimization Service
 * 
 * @description
 * Provides automatic query optimization for OData requests:
 * - Adds $select for minimal field selection
 * - Limits $expand depth to prevent N+1 queries
 * - Implements pagination for large result sets
 * - Query result caching for master data
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */

const cds = require('@sap/cds');
const cacheService = require('./cache-service');
const LOG = cds.log('query-optimizer');

/**
 * Default field selections for entities (reduce payload size)
 */
const DEFAULT_SELECTIONS = {
    'CleanCoreAnalysis': [
        'ID', 'ricefwId', 'objectType_typeCode', 'objectDescription',
        'recommendedLevel_levelCode', 'technicalDebtScore', 'cloudReadinessScore',
        'upgradeImpactScore', 'compositeHealthScore', 'status', 'analysisDate',
        'createdAt', 'createdBy', 'modifiedAt'
    ],
    'ProjectConfiguration': [
        'ID', 'projectName', 'clientName', 's4HanaFlavor', 'status',
        'businessCriticality', 'createdAt', 'createdBy'
    ],
    'DecisionPath': [
        'ID', 'stepOrder', 'questionId', 'questionText', 'answerText',
        'answeredAt', 'analysis_ID'
    ],
    'WizardSession': [
        'ID', 'sessionStatus', 'currentStep', 'startedAt', 'expiresAt',
        'analysis_ID', 'isCompleted'
    ]
};

/**
 * Maximum $expand depth to prevent deep nesting
 */
const MAX_EXPAND_DEPTH = 2;

/**
 * Default page size for list queries
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum page size to prevent memory issues
 */
const MAX_PAGE_SIZE = 1000;

class QueryOptimizer {
    /**
     * Optimize READ queries by adding smart defaults
     * 
     * @param {object} query - CDS query object
     * @param {string} entity - Entity name
     * @returns {object} Optimized query
     */
    optimizeRead(query, entity) {
        const optimized = { ...query };
        
        // Add default $select if not specified
        if (!query.SELECT?.columns && DEFAULT_SELECTIONS[entity]) {
            optimized.SELECT = optimized.SELECT || {};
            optimized.SELECT.columns = DEFAULT_SELECTIONS[entity];
            LOG.debug(`Applied default $select for ${entity}`);
        }
        
        // Limit $expand depth
        if (query.SELECT?.columns) {
            optimized.SELECT.columns = this._limitExpandDepth(
                query.SELECT.columns,
                0,
                MAX_EXPAND_DEPTH
            );
        }
        
        // Add pagination if not present and result set is large
        if (!query.SELECT?.limit && !query.SELECT?.one) {
            optimized.SELECT = optimized.SELECT || {};
            optimized.SELECT.limit = { rows: { val: DEFAULT_PAGE_SIZE } };
            LOG.debug(`Applied default pagination (${DEFAULT_PAGE_SIZE}) for ${entity}`);
        }
        
        // Cap maximum page size
        if (query.SELECT?.limit?.rows?.val > MAX_PAGE_SIZE) {
            optimized.SELECT.limit.rows.val = MAX_PAGE_SIZE;
            LOG.warn(`Page size capped at ${MAX_PAGE_SIZE} for ${entity}`);
        }
        
        return optimized;
    }
    
    /**
     * Recursively limit $expand depth
     * 
     * @param {array} columns - Column definitions
     * @param {number} currentDepth - Current depth level
     * @param {number} maxDepth - Maximum allowed depth
     * @returns {array} Optimized columns
     */
    _limitExpandDepth(columns, currentDepth, maxDepth) {
        if (currentDepth >= maxDepth) {
            LOG.warn(`$expand depth limit (${maxDepth}) reached, pruning deeper expansions`);
            return columns.filter(col => typeof col === 'string' || !col.expand);
        }
        
        return columns.map(col => {
            if (typeof col === 'object' && col.expand) {
                return {
                    ...col,
                    expand: this._limitExpandDepth(col.expand, currentDepth + 1, maxDepth)
                };
            }
            return col;
        });
    }
    
    /**
     * Get cached master data or execute query
     * 
     * @param {string} entity - Entity name
     * @param {Function} queryFn - Function that executes the query
     * @returns {Promise<*>} Query results
     */
    async getCachedMasterData(entity, queryFn) {
        const masterDataEntities = [
            'CleanCoreLevels',
            'ObjectTypes',
            'PerformanceThreshold',
            'QuestionFlow',
            'RealWorldExample'
        ];
        
        if (masterDataEntities.includes(entity)) {
            return cacheService.getMasterData(entity, queryFn);
        }
        
        // Not master data, execute directly
        return queryFn();
    }
    
    /**
     * Optimize aggregation queries for analytics
     * 
     * @param {object} query - CDS query object
     * @param {string} cacheKey - Unique cache key for this aggregation
     * @param {Function} queryFn - Function that executes the query
     * @returns {Promise<*>} Query results
     */
    async getCachedAnalytics(query, cacheKey, queryFn) {
        // Check if query can be cached (no user-specific filters)
        const isCacheable = !this._hasUserSpecificFilters(query);
        
        if (isCacheable) {
            return cacheService.getAnalytics(cacheKey, queryFn);
        }
        
        // Not cacheable, execute directly
        return queryFn();
    }
    
    /**
     * Check if query contains user-specific filters
     * 
     * @param {object} query - CDS query object
     * @returns {boolean} True if user-specific
     */
    _hasUserSpecificFilters(query) {
        const userSpecificFields = ['createdBy', 'modifiedBy', 'owner', 'assignedTo'];
        
        if (!query.SELECT?.where) {
            return false;
        }
        
        // Simplified check - in production, would need deep traversal
        const whereString = JSON.stringify(query.SELECT.where);
        return userSpecificFields.some(field => whereString.includes(field));
    }
    
    /**
     * Add query hints for HANA optimization
     * 
     * @param {object} query - CDS query object
     * @returns {object} Query with hints
     */
    addHanaHints(query) {
        // Add hints for HANA column store optimization
        const optimized = { ...query };
        
        // Use parallel execution for large aggregations
        if (query.SELECT?.groupBy || query.SELECT?.having) {
            optimized.SELECT = optimized.SELECT || {};
            optimized.SELECT.hints = optimized.SELECT.hints || {};
            optimized.SELECT.hints.PARALLEL_EXEC = 4; // 4 parallel threads
        }
        
        // Prefer column engine for analytical queries
        if (this._isAnalyticalQuery(query)) {
            optimized.SELECT = optimized.SELECT || {};
            optimized.SELECT.hints = optimized.SELECT.hints || {};
            optimized.SELECT.hints.USE_OLAP_PLAN = true;
        }
        
        return optimized;
    }
    
    /**
     * Check if query is analytical (aggregations, grouping)
     * 
     * @param {object} query - CDS query object
     * @returns {boolean} True if analytical
     */
    _isAnalyticalQuery(query) {
        if (!query.SELECT) {
            return false;
        }
        
        return !!(
            query.SELECT.groupBy ||
            query.SELECT.having ||
            query.SELECT.orderBy?.some(o => o.func) || // Aggregate functions in ORDER BY
            query.SELECT.columns?.some(c => c.func) // Aggregate functions in SELECT
        );
    }
    
    /**
     * Get query statistics for monitoring
     * 
     * @returns {object} Statistics
     */
    getStats() {
        return {
            cacheStats: cacheService.getStats(),
            optimizationRules: {
                defaultSelections: Object.keys(DEFAULT_SELECTIONS).length,
                maxExpandDepth: MAX_EXPAND_DEPTH,
                defaultPageSize: DEFAULT_PAGE_SIZE,
                maxPageSize: MAX_PAGE_SIZE
            }
        };
    }
}

// Export singleton instance
const queryOptimizer = new QueryOptimizer();

module.exports = queryOptimizer;
