/**
 * Unit Tests for CacheService
 * 
 * Tests the multi-tier caching functionality
 */

const cacheService = require('../../srv/lib/cache-service');

describe('CacheService', () => {
    beforeEach(() => {
        // Clear all caches before each test
        cacheService.flushAll();
        // Reset stats
        cacheService.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    });

    afterAll(() => {
        // Clean up after all tests
        cacheService.flushAll();
    });

    describe('Basic cache operations', () => {
        it('should set and get a value from default cache', () => {
            const entity = 'TestEntity';
            const id = 'test-id-1';
            const value = { name: 'Test', value: 123 };

            const setResult = cacheService.set(entity, id, value);
            expect(setResult).toBe(true);

            const retrieved = cacheService.get(entity, id);
            expect(retrieved).toEqual(value);
        });

        it('should return undefined for cache miss', () => {
            const retrieved = cacheService.get('NonExistent', 'no-id');
            expect(retrieved).toBeUndefined();
        });

        it('should delete a cached value', () => {
            const entity = 'TestEntity';
            const id = 'test-id-2';
            const value = { data: 'test' };

            cacheService.set(entity, id, value);
            const deleted = cacheService.delete(entity, id);
            
            expect(deleted).toBe(1);
            expect(cacheService.get(entity, id)).toBeUndefined();
        });

        it('should use tenant-aware cache keys', () => {
            // Simulate different tenant contexts by directly setting keys
            const entity = 'Project';
            const id = '123';
            const value1 = { tenant: 'tenant-A', data: 'A' };
            const value2 = { tenant: 'tenant-B', data: 'B' };

            // In real usage, cds.context.tenant would be different
            // For testing, we verify the key structure
            cacheService.set(entity, id, value1);
            const key = cacheService._getCacheKey(entity, id);
            
            expect(key).toContain(entity);
            expect(key).toContain(id);
        });

        it('should clone objects to prevent cache corruption', () => {
            const entity = 'TestEntity';
            const id = 'test-id-3';
            const value = { data: [1, 2, 3] };

            cacheService.set(entity, id, value);
            const retrieved = cacheService.get(entity, id);
            
            // Modify the retrieved object
            retrieved.data.push(4);
            
            // Original cached value should be unchanged
            const retrievedAgain = cacheService.get(entity, id);
            expect(retrievedAgain.data).toEqual([1, 2, 3]);
        });
    });

    describe('Multi-tier caching', () => {
        it('should use master data cache for master data', () => {
            const entity = 'CleanCoreLevels';
            const id = 'all';
            const value = [{ level: 'A' }, { level: 'B' }];

            cacheService.set(entity, id, value, null, 'master');
            const retrieved = cacheService.get(entity, id, 'master');
            
            expect(retrieved).toEqual(value);
        });

        it('should use analytics cache for analytics data', () => {
            const entity = 'analytics';
            const id = 'dashboard-stats';
            const value = { totalAnalyses: 100 };

            cacheService.set(entity, id, value, null, 'analytics');
            const retrieved = cacheService.get(entity, id, 'analytics');
            
            expect(retrieved).toEqual(value);
        });

        it('should isolate different cache tiers', () => {
            const entity = 'TestData';
            const id = 'shared-id';
            const defaultValue = { cache: 'default' };
            const masterValue = { cache: 'master' };

            cacheService.set(entity, id, defaultValue, null, 'default');
            cacheService.set(entity, id, masterValue, null, 'master');

            expect(cacheService.get(entity, id, 'default')).toEqual(defaultValue);
            expect(cacheService.get(entity, id, 'master')).toEqual(masterValue);
        });
    });

    describe('Custom TTL', () => {
        it('should respect custom TTL', (done) => {
            const entity = 'ShortLived';
            const id = 'expires-soon';
            const value = { data: 'temporary' };
            const ttl = 1; // 1 second

            cacheService.set(entity, id, value, ttl);
            
            // Should exist immediately
            expect(cacheService.get(entity, id)).toEqual(value);
            
            // Should expire after TTL
            setTimeout(() => {
                expect(cacheService.get(entity, id)).toBeUndefined();
                done();
            }, 1500);
        }, 2000);
    });

    describe('Entity invalidation', () => {
        it('should invalidate all entries for an entity', () => {
            const entity = 'PerformanceThreshold';
            
            cacheService.set(entity, 'id-1', { value: 1 });
            cacheService.set(entity, 'id-2', { value: 2 });
            cacheService.set(entity, 'id-3', { value: 3 });
            cacheService.set('OtherEntity', 'id-1', { value: 'other' });

            cacheService.invalidateEntity(entity);

            expect(cacheService.get(entity, 'id-1')).toBeUndefined();
            expect(cacheService.get(entity, 'id-2')).toBeUndefined();
            expect(cacheService.get(entity, 'id-3')).toBeUndefined();
            expect(cacheService.get('OtherEntity', 'id-1')).toEqual({ value: 'other' });
        });

        it('should invalidate across all cache tiers when specified', () => {
            const entity = 'SharedEntity';
            
            cacheService.set(entity, 'id-1', { cache: 'default' }, null, 'default');
            cacheService.set(entity, 'id-2', { cache: 'master' }, null, 'master');
            cacheService.set(entity, 'id-3', { cache: 'analytics' }, null, 'analytics');

            cacheService.invalidateEntity(entity, 'all');

            expect(cacheService.get(entity, 'id-1', 'default')).toBeUndefined();
            expect(cacheService.get(entity, 'id-2', 'master')).toBeUndefined();
            expect(cacheService.get(entity, 'id-3', 'analytics')).toBeUndefined();
        });
    });

    describe('Statistics tracking', () => {
        it('should track cache hits and misses', () => {
            const entity = 'TestEntity';
            const id = 'test-id';
            const value = { data: 'test' };

            // Miss
            cacheService.get(entity, 'non-existent');
            
            // Set
            cacheService.set(entity, id, value);
            
            // Hit
            cacheService.get(entity, id);
            cacheService.get(entity, id);

            const stats = cacheService.getStats();
            
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.sets).toBe(1);
            expect(stats.totalRequests).toBe(3);
        });

        it('should calculate hit rate correctly', () => {
            const entity = 'TestEntity';
            cacheService.set(entity, 'id-1', { value: 1 });

            // 2 hits
            cacheService.get(entity, 'id-1');
            cacheService.get(entity, 'id-1');
            
            // 1 miss
            cacheService.get(entity, 'non-existent');

            const stats = cacheService.getStats();
            
            expect(stats.hitRate).toBe('66.67%');
        });

        it('should track deletes', () => {
            const entity = 'TestEntity';
            cacheService.set(entity, 'id-1', { value: 1 });
            cacheService.delete(entity, 'id-1');

            const stats = cacheService.getStats();
            expect(stats.deletes).toBe(1);
        });
    });

    describe('Helper methods', () => {
        it('should use getMasterData wrapper correctly', async () => {
            const entity = 'CleanCoreLevels';
            const data = [{ level: 'A' }, { level: 'B' }, { level: 'C' }, { level: 'D' }];
            let queryCallCount = 0;

            const queryFn = async () => {
                queryCallCount++;
                return data;
            };

            // First call should query and cache
            const result1 = await cacheService.getMasterData(entity, queryFn);
            expect(result1).toEqual(data);
            expect(queryCallCount).toBe(1);

            // Second call should use cache
            const result2 = await cacheService.getMasterData(entity, queryFn);
            expect(result2).toEqual(data);
            expect(queryCallCount).toBe(1); // Query not called again
        });

        it('should use getAnalytics wrapper correctly', async () => {
            const key = 'project-stats';
            const data = { totalProjects: 50, avgScore: 75 };
            let queryCallCount = 0;

            const queryFn = async () => {
                queryCallCount++;
                return data;
            };

            // First call should query and cache
            const result1 = await cacheService.getAnalytics(key, queryFn);
            expect(result1).toEqual(data);
            expect(queryCallCount).toBe(1);

            // Second call should use cache
            const result2 = await cacheService.getAnalytics(key, queryFn);
            expect(result2).toEqual(data);
            expect(queryCallCount).toBe(1);
        });
    });

    describe('Flush operations', () => {
        it('should flush all caches', () => {
            cacheService.set('Entity1', 'id-1', { value: 1 }, null, 'default');
            cacheService.set('Entity2', 'id-2', { value: 2 }, null, 'master');
            cacheService.set('Entity3', 'id-3', { value: 3 }, null, 'analytics');

            cacheService.flushAll();

            expect(cacheService.get('Entity1', 'id-1', 'default')).toBeUndefined();
            expect(cacheService.get('Entity2', 'id-2', 'master')).toBeUndefined();
            expect(cacheService.get('Entity3', 'id-3', 'analytics')).toBeUndefined();
        });
    });
});
