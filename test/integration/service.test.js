/**
 * Integration Tests for OData Services (Simplified)
 * 
 * Basic smoke tests for service availability
 * Full integration tests require a deployed CAP server
 */

describe('SolutionAdvisor Service Integration', () => {
    describe('Service Configuration', () => {
        it('should have correct service configuration', () => {
            const cds = require('@sap/cds');
            
            // Check CDS is loaded
            expect(cds).toBeDefined();
            expect(cds.version).toBeDefined();
        });

        it('should load service definitions', () => {
            const path = require('path');
            const fs = require('fs');
            
            // Check srv/service.cds exists
            const servicePath = path.join(__dirname, '../../srv/service.cds');
            expect(fs.existsSync(servicePath)).toBe(true);
        });

        it('should have database schema defined', () => {
            const path = require('path');
            const fs = require('fs');
            
            // Check db/schema.cds exists
            const schemaPath = path.join(__dirname, '../../db/schema.cds');
            expect(fs.existsSync(schemaPath)).toBe(true);
        });
    });

    describe('Service Modules', () => {
        it('should load service handler modules', () => {
            const path = require('path');
            const fs = require('fs');
            
            // Check main service.js exists
            const servicePath = path.join(__dirname, '../../srv/service.js');
            expect(fs.existsSync(servicePath)).toBe(true);
        });

        it('should load core service libraries', () => {
            const path = require('path');
            const fs = require('fs');
            
            const libraries = [
                '../../srv/lib/scoring-service.js',
                '../../srv/lib/decision-engine-consolidated.js',
                '../../srv/lib/constraints-service.js',
                '../../srv/lib/examples-service.js',
                '../../srv/lib/cache-service.js'
            ];

            libraries.forEach(lib => {
                const libPath = path.join(__dirname, lib);
                expect(fs.existsSync(libPath)).toBe(true);
            });
        });
    });

    describe('Service Classes', () => {
        it('should instantiate ExamplesService', () => {
            const ExamplesService = require('../../srv/lib/examples-service');
            const service = new ExamplesService(null);
            
            expect(service).toBeDefined();
            expect(typeof service.getContextualExamples).toBe('function');
            expect(typeof service.calculateRelevance).toBe('function');
        });

        it('should instantiate ConstraintsService', () => {
            const ConstraintsService = require('../../srv/lib/constraints-service');
            const service = new ConstraintsService(null);
            
            expect(service).toBeDefined();
            expect(typeof service.getRelevantConstraints).toBe('function');
        });

        it('should load CacheService', () => {
            const cacheService = require('../../srv/lib/cache-service');
            
            expect(cacheService).toBeDefined();
            expect(typeof cacheService.get).toBe('function');
            expect(typeof cacheService.set).toBe('function');
            expect(typeof cacheService.getStats).toBe('function');
        });
    });
});
