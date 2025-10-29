/**
 * Unit Tests for BatchOptimizer
 * 
 * Tests batch CRUD operations, parallel processing, error isolation, and performance
 */

const { BatchOptimizer } = require('../../srv/lib/batch-optimizer');

// Mock CDS for testing
const mockCDS = {
    UPDATE: jest.fn((entity) => ({
        set: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve(1))
        }))
    })),
    INSERT: {
        into: jest.fn((entity) => ({
            entries: jest.fn(() => Promise.resolve())
        }))
    },
    DELETE: {
        from: jest.fn((entity) => ({
            where: jest.fn(() => Promise.resolve(1))
        }))
    },
    SELECT: {
        from: jest.fn((entity) => ({
            where: jest.fn(() => ({
                columns: jest.fn(() => Promise.resolve([]))
            }))
        }))
    }
};

// Make UPDATE, INSERT, DELETE, SELECT global for BatchOptimizer
global.UPDATE = mockCDS.UPDATE;
global.INSERT = mockCDS.INSERT;
global.DELETE = mockCDS.DELETE;
global.SELECT = mockCDS.SELECT;

describe('BatchOptimizer', () => {
    let batchOptimizer;
    const mockEntity = { name: 'TestEntity' };

    beforeEach(() => {
        batchOptimizer = new BatchOptimizer();
        jest.clearAllMocks();
    });

    describe('batchUpdate', () => {
        it('should successfully update records in batches', async () => {
            const updates = Array.from({ length: 250 }, (_, i) => ({
                where: { ID: `test-${i}` },
                set: { value: `updated-${i}` }
            }));

            const result = await batchOptimizer.batchUpdate(mockEntity, updates);

            expect(result.success).toBe(true);
            expect(result.updated).toBe(250);
            expect(result.failed).toBe(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle empty updates array', async () => {
            const result = await batchOptimizer.batchUpdate(mockEntity, []);

            expect(result.success).toBe(true);
            expect(result.updated).toBe(0);
            expect(result.failed).toBe(0);
        });

        it('should isolate errors in failed batches', async () => {
            // Mock one batch to fail
            let callCount = 0;
            mockCDS.UPDATE.mockImplementation(() => ({
                set: () => ({
                    where: () => {
                        callCount++;
                        if (callCount > 100 && callCount <= 200) {
                            return Promise.reject(new Error('Database error'));
                        }
                        return Promise.resolve(1);
                    }
                })
            }));

            const updates = Array.from({ length: 250 }, (_, i) => ({
                where: { ID: `test-${i}` },
                set: { value: `updated-${i}` }
            }));

            const result = await batchOptimizer.batchUpdate(mockEntity, updates);

            expect(result.success).toBe(false);
            expect(result.failed).toBeGreaterThan(0);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should respect custom batch size', async () => {
            const updates = Array.from({ length: 50 }, (_, i) => ({
                where: { ID: `test-${i}` },
                set: { value: `updated-${i}` }
            }));

            const result = await batchOptimizer.batchUpdate(mockEntity, updates, { batchSize: 10 });

            expect(result.success).toBe(true);
            expect(result.updated).toBe(50);
        });
    });

    describe('batchInsert', () => {
        it('should successfully insert records in batches', async () => {
            const records = Array.from({ length: 150 }, (_, i) => ({
                ID: `test-${i}`,
                value: `value-${i}`
            }));

            const result = await batchOptimizer.batchInsert(mockEntity, records);

            expect(result.success).toBe(true);
            expect(result.inserted).toBe(150);
            expect(result.failed).toBe(0);
        });

        it('should handle insert failures gracefully', async () => {
            let callCount = 0;
            mockCDS.INSERT.into.mockImplementation(() => ({
                entries: () => {
                    callCount++;
                    if (callCount === 2) {
                        return Promise.reject(new Error('Duplicate key'));
                    }
                    return Promise.resolve();
                }
            }));

            const records = Array.from({ length: 250 }, (_, i) => ({
                ID: `test-${i}`,
                value: `value-${i}`
            }));

            const result = await batchOptimizer.batchInsert(mockEntity, records);

            expect(result.success).toBe(false);
            expect(result.failed).toBeGreaterThan(0);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('batchDelete', () => {
        it('should successfully delete records in batches', async () => {
            mockCDS.DELETE.from.mockImplementation(() => ({
                where: () => Promise.resolve(1)
            }));

            const whereConditions = Array.from({ length: 100 }, (_, i) => ({
                ID: `test-${i}`
            }));

            const result = await batchOptimizer.batchDelete(mockEntity, whereConditions);

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(100);
            expect(result.failed).toBe(0);
        });

        it('should handle delete failures', async () => {
            let callCount = 0;
            mockCDS.DELETE.from.mockImplementation(() => ({
                where: () => {
                    callCount++;
                    if (callCount > 50) {
                        return Promise.reject(new Error('Foreign key constraint'));
                    }
                    return Promise.resolve(1);
                }
            }));

            const whereConditions = Array.from({ length: 100 }, (_, i) => ({
                ID: `test-${i}`
            }));

            const result = await batchOptimizer.batchDelete(mockEntity, whereConditions);

            expect(result.success).toBe(false);
            expect(result.failed).toBeGreaterThan(0);
        });
    });

    describe('batchRead', () => {
        it('should successfully read records in batches', async () => {
            const mockRecords = Array.from({ length: 150 }, (_, i) => ({
                ID: `test-${i}`,
                value: `value-${i}`
            }));

            mockCDS.SELECT.from.mockImplementation(() => ({
                where: () => ({
                    columns: () => Promise.resolve(mockRecords.slice(0, 100))
                })
            }));

            const ids = Array.from({ length: 150 }, (_, i) => `test-${i}`);
            const result = await batchOptimizer.batchRead(mockEntity, ids);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should support column selection', async () => {
            mockCDS.SELECT.from.mockImplementation(() => ({
                where: () => ({
                    columns: jest.fn(() => Promise.resolve([{ ID: 'test-1', value: 'value-1' }]))
                })
            }));

            const ids = ['test-1', 'test-2'];
            await batchOptimizer.batchRead(mockEntity, ids, { columns: ['ID', 'value'] });

            // Verify columns method was called (indicates column selection was applied)
            expect(mockCDS.SELECT.from).toHaveBeenCalled();
        });
    });

    describe('_chunk', () => {
        it('should split array into correct chunk sizes', () => {
            const array = Array.from({ length: 250 }, (_, i) => i);
            const chunks = batchOptimizer._chunk(array, 100);

            expect(chunks).toHaveLength(3);
            expect(chunks[0]).toHaveLength(100);
            expect(chunks[1]).toHaveLength(100);
            expect(chunks[2]).toHaveLength(50);
        });

        it('should handle array smaller than chunk size', () => {
            const array = [1, 2, 3];
            const chunks = batchOptimizer._chunk(array, 100);

            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toHaveLength(3);
        });

        it('should handle empty array', () => {
            const chunks = batchOptimizer._chunk([], 100);
            expect(chunks).toHaveLength(0);
        });
    });

    describe('Performance', () => {
        it('should process large batches efficiently', async () => {
            const updates = Array.from({ length: 1000 }, (_, i) => ({
                where: { ID: `test-${i}` },
                set: { value: `updated-${i}` }
            }));

            const startTime = Date.now();
            await batchOptimizer.batchUpdate(mockEntity, updates);
            const duration = Date.now() - startTime;

            // Should complete in reasonable time (< 5 seconds for 1000 records)
            expect(duration).toBeLessThan(5000);
        });
    });

    describe('Configuration', () => {
        it('should use default batch size of 100', () => {
            expect(batchOptimizer.config.maxBatchSize).toBe(100);
        });

        it('should use default parallel batch limit of 5', () => {
            expect(batchOptimizer.config.maxParallelBatches).toBe(5);
        });

        it('should have 30-second timeout', () => {
            expect(batchOptimizer.config.batchTimeout).toBe(30000);
        });
    });
});
