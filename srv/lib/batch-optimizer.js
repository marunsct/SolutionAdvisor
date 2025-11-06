const cds = require('@sap/cds');
const LOG = cds.log('batch-optimizer');

/**
 * Batch Operations Optimizer
 * 
 * Provides utilities for efficient batch processing of database operations
 * to reduce round-trips and improve performance for bulk updates.
 * 
 * @module srv/lib/batch-optimizer
 * @author SAP Clean Core Team
 * @version 1.0.0
 */

class BatchOptimizer {
    constructor() {
        // Batch configuration
        this.config = {
            maxBatchSize: 100,      // Maximum records per batch
            maxParallelBatches: 5,  // Maximum parallel batch executions
            batchTimeout: 30000     // 30 seconds timeout per batch
        };
    }

    /**
     * Batch update multiple records efficiently using CDS batch operations
     * 
     * @param {Object} entity - CDS entity (e.g., Analyses, DecisionPaths)
     * @param {Array} updates - Array of update objects: [{ where: {...}, set: {...} }]
     * @param {Object} options - Optional batch configuration
     * @returns {Promise<Object>} { success: boolean, updated: number, failed: number, errors: [] }
     */
    async batchUpdate(entity, updates, options = {}) {
        const startTime = Date.now();
        const batchSize = options.batchSize || this.config.maxBatchSize;
        const results = {
            success: true,
            updated: 0,
            failed: 0,
            errors: []
        };

        try {
            // Split updates into chunks
            const batches = this._chunk(updates, batchSize);
            LOG.info(`Processing ${updates.length} updates in ${batches.length} batches (size: ${batchSize})`);

            // Process batches with parallel execution limit
            for (let i = 0; i < batches.length; i += this.config.maxParallelBatches) {
                const batchGroup = batches.slice(i, i + this.config.maxParallelBatches);
                
                const batchPromises = batchGroup.map(async (batch, batchIndex) => {
                    return await this._executeBatch(entity, batch, i + batchIndex);
                });

                const batchResults = await Promise.allSettled(batchPromises);

                // Aggregate results
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        results.updated += result.value.updated;
                    } else {
                        results.failed += batchGroup[index].length;
                        results.errors.push({
                            batchIndex: i + index,
                            error: result.reason.message
                        });
                    }
                });
            }

            const duration = Date.now() - startTime;
            LOG.info(`Batch update completed: ${results.updated} updated, ${results.failed} failed in ${duration}ms`);

            results.success = results.failed === 0;
            return results;

        } catch (error) {
            LOG.error('Batch update failed:', error);
            results.success = false;
            results.errors.push({ error: error.message });
            return results;
        }
    }

    /**
     * Execute a single batch of updates
     * @private
     */
    async _executeBatch(entity, batch, batchIndex) {
        const updates = batch.map(update => {
            // Use cds.update for internal operations (bypasses draft automatically)
            return cds.update(entity)
                .set(update.set)
                .where(update.where);
        });

        try {
            // Execute all updates in parallel within the batch
            await Promise.all(updates);
            
            return { updated: batch.length };
        } catch (error) {
            LOG.error(`Batch ${batchIndex} failed:`, error);
            throw error;
        }
    }

    /**
     * Batch insert multiple records efficiently
     * 
     * @param {Object} entity - CDS entity
     * @param {Array} records - Array of record objects to insert
     * @param {Object} options - Optional batch configuration
     * @returns {Promise<Object>} { success: boolean, inserted: number, failed: number, errors: [] }
     */
    async batchInsert(entity, records, options = {}) {
        const startTime = Date.now();
        const batchSize = options.batchSize || this.config.maxBatchSize;
        const results = {
            success: true,
            inserted: 0,
            failed: 0,
            errors: []
        };

        try {
            // Split records into chunks
            const batches = this._chunk(records, batchSize);
            LOG.info(`Inserting ${records.length} records in ${batches.length} batches (size: ${batchSize})`);

            // Process batches
            for (let i = 0; i < batches.length; i += this.config.maxParallelBatches) {
                const batchGroup = batches.slice(i, i + this.config.maxParallelBatches);
                
                const batchPromises = batchGroup.map(async (batch, batchIndex) => {
                    try {
                        await INSERT.into(entity).entries(batch);
                        return { inserted: batch.length };
                    } catch (error) {
                        LOG.error(`Insert batch ${i + batchIndex} failed:`, error);
                        throw error;
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);

                // Aggregate results
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        results.inserted += result.value.inserted;
                    } else {
                        results.failed += batchGroup[index].length;
                        results.errors.push({
                            batchIndex: i + index,
                            error: result.reason.message
                        });
                    }
                });
            }

            const duration = Date.now() - startTime;
            LOG.info(`Batch insert completed: ${results.inserted} inserted, ${results.failed} failed in ${duration}ms`);

            results.success = results.failed === 0;
            return results;

        } catch (error) {
            LOG.error('Batch insert failed:', error);
            results.success = false;
            results.errors.push({ error: error.message });
            return results;
        }
    }

    /**
     * Batch delete records efficiently
     * 
     * @param {Object} entity - CDS entity
     * @param {Array} whereConditions - Array of where conditions for deletion
     * @param {Object} options - Optional batch configuration
     * @returns {Promise<Object>} { success: boolean, deleted: number, failed: number, errors: [] }
     */
    async batchDelete(entity, whereConditions, options = {}) {
        const startTime = Date.now();
        const batchSize = options.batchSize || this.config.maxBatchSize;
        const results = {
            success: true,
            deleted: 0,
            failed: 0,
            errors: []
        };

        try {
            const batches = this._chunk(whereConditions, batchSize);
            LOG.info(`Deleting ${whereConditions.length} records in ${batches.length} batches`);

            for (let i = 0; i < batches.length; i += this.config.maxParallelBatches) {
                const batchGroup = batches.slice(i, i + this.config.maxParallelBatches);
                
                const batchPromises = batchGroup.map(async (batch, batchIndex) => {
                    try {
                        let deleteCount = 0;
                        for (const where of batch) {
                            const result = await DELETE.from(entity).where(where);
                            deleteCount += result || 0;
                        }
                        return { deleted: deleteCount };
                    } catch (error) {
                        LOG.error(`Delete batch ${i + batchIndex} failed:`, error);
                        throw error;
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);

                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        results.deleted += result.value.deleted;
                    } else {
                        results.failed += batchGroup[index].length;
                        results.errors.push({
                            batchIndex: i + index,
                            error: result.reason.message
                        });
                    }
                });
            }

            const duration = Date.now() - startTime;
            LOG.info(`Batch delete completed: ${results.deleted} deleted, ${results.failed} failed in ${duration}ms`);

            results.success = results.failed === 0;
            return results;

        } catch (error) {
            LOG.error('Batch delete failed:', error);
            results.success = false;
            results.errors.push({ error: error.message });
            return results;
        }
    }

    /**
     * Split array into chunks
     * @private
     */
    _chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Batch read with parallel execution for better performance
     * 
     * @param {Object} entity - CDS entity
     * @param {Array} ids - Array of record IDs to fetch
     * @param {Object} options - Optional configuration { columns, expand }
     * @returns {Promise<Array>} Array of fetched records
     */
    async batchRead(entity, ids, options = {}) {
        const startTime = Date.now();
        const batchSize = options.batchSize || this.config.maxBatchSize;
        const allRecords = [];

        try {
            const batches = this._chunk(ids, batchSize);
            LOG.info(`Reading ${ids.length} records in ${batches.length} batches`);

            for (let i = 0; i < batches.length; i += this.config.maxParallelBatches) {
                const batchGroup = batches.slice(i, i + this.config.maxParallelBatches);
                
                const batchPromises = batchGroup.map(async (batch) => {
                    let query = SELECT.from(entity).where({ ID: { in: batch } });
                    
                    if (options.columns) {
                        query = query.columns(options.columns);
                    }
                    
                    if (options.expand) {
                        // Note: Expand syntax depends on CDS version
                        // query = query.columns(col => col('*'), options.expand);
                    }
                    
                    return await query;
                });

                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(records => allRecords.push(...records));
            }

            const duration = Date.now() - startTime;
            LOG.info(`Batch read completed: ${allRecords.length} records in ${duration}ms`);

            return allRecords;

        } catch (error) {
            LOG.error('Batch read failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
const batchOptimizer = new BatchOptimizer();

module.exports = {
    BatchOptimizer,
    batchOptimizer
};
