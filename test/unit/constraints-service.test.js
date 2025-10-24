/**
 * Unit Tests for Constraints Service
 * 
 * Tests constraint retrieval and violation detection
 */

const ConstraintsService = require('../../srv/lib/constraints-service');

// Mock CDS
jest.mock('@sap/cds', () => ({
    log: () => ({
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
    }),
    entities: jest.fn(() => ({
        PerformanceThreshold: 'sd.PerformanceThreshold'
    }))
}));

// Mock SELECT
global.SELECT = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis()
};

describe('ConstraintsService', () => {
    let constraintsService;

    beforeEach(() => {
        jest.clearAllMocks();
        constraintsService = new ConstraintsService();
    });

    describe('getRelevantConstraints', () => {
        it('should return constraints for given object type', async () => {
            const mockThresholds = [
                {
                    ID: 'threshold-1',
                    category: 'Integration',
                    method: 'OData API',
                    volumeLimit: 5000,
                    sizeThreshold: '35MB',
                    responseTimeTarget: 5000,
                    cleanCoreLevel: 'Level A',
                    applicableObjectTypes: 'I,C',
                    deploymentTypes: 'Cloud Public,Private Cloud',
                    isActive: true
                },
                {
                    ID: 'threshold-2',
                    category: 'Integration',
                    method: 'Enterprise Events',
                    volumeLimit: 999999,
                    sizeThreshold: '10MB',
                    responseTimeTarget: 2000,
                    cleanCoreLevel: 'Level A',
                    applicableObjectTypes: 'I,W',
                    deploymentTypes: 'Cloud Public',
                    isActive: true
                }
            ];

            SELECT.from.mockReturnThis();
            SELECT.where.mockResolvedValue(mockThresholds);

            const result = await constraintsService.getRelevantConstraints('Interfaces', 'Cloud Public', 'High');

            expect(result.performanceConstraints).toBeDefined();
            expect(result.performanceConstraints.length).toBeGreaterThan(0);
            expect(result.deploymentConstraints).toBeDefined();
            expect(result.complianceConstraints).toBeDefined();
        });

        it('should filter constraints by deployment type', async () => {
            const mockThresholds = [
                {
                    ID: 'threshold-1',
                    applicableObjectTypes: 'I',
                    deploymentTypes: 'Cloud Public',
                    isActive: true
                },
                {
                    ID: 'threshold-2',
                    applicableObjectTypes: 'I',
                    deploymentTypes: 'On-Premise',
                    isActive: true
                }
            ];

            SELECT.from.mockReturnThis();
            SELECT.where.mockResolvedValue(mockThresholds);

            const result = await constraintsService.getRelevantConstraints('Interfaces', 'Cloud Public');

            expect(SELECT.where).toHaveBeenCalled();
        });
    });

    describe('checkConstraintViolations', () => {
        it('should detect violations when user values exceed thresholds', () => {
            const constraints = [
                {
                    ID: 'threshold-1',
                    thresholdName: 'OData API Volume',
                    volumeLimit: 5000,
                    sizeThreshold: '35MB',
                    responseTimeTarget: 5000,
                    whenExceeded: 'Consider batch processing',
                    alternativeSolution: 'Use Enhanced IDOC'
                }
            ];

            const userSelections = {
                expectedVolume: 10000, // Exceeds 5000
                dataSize: '50MB',      // Exceeds 35MB
                responseTime: 3000     // Within limit
            };

            const violations = constraintsService.checkConstraintViolations(constraints, userSelections);

            expect(violations).toBeDefined();
            expect(violations.length).toBeGreaterThan(0);
            
            const volumeViolation = violations.find(v => v.thresholdName === 'OData API Volume');
            expect(volumeViolation).toBeDefined();
            expect(volumeViolation.isViolated).toBe(true);
        });

        it('should return empty array when no violations', () => {
            const constraints = [
                {
                    ID: 'threshold-1',
                    thresholdName: 'OData API Volume',
                    volumeLimit: 10000,
                    responseTimeTarget: 5000
                }
            ];

            const userSelections = {
                expectedVolume: 3000,  // Within limit
                responseTime: 2000     // Within limit
            };

            const violations = constraintsService.checkConstraintViolations(constraints, userSelections);

            expect(violations).toEqual([]);
        });

        it('should handle size threshold comparisons (MB/GB)', () => {
            const constraints = [
                {
                    ID: 'threshold-1',
                    thresholdName: 'File Transfer Size',
                    sizeThreshold: '5GB'
                }
            ];

            const userSelections = {
                dataSize: '10GB' // Exceeds 5GB
            };

            const violations = constraintsService.checkConstraintViolations(constraints, userSelections);

            expect(violations.length).toBeGreaterThan(0);
        });

        it('should handle missing user selections gracefully', () => {
            const constraints = [
                {
                    ID: 'threshold-1',
                    thresholdName: 'Test Threshold',
                    volumeLimit: 1000
                }
            ];

            const userSelections = {}; // No selections

            const violations = constraintsService.checkConstraintViolations(constraints, userSelections);

            // Should not throw error, return empty array
            expect(violations).toEqual([]);
        });
    });

    describe('getDeploymentConstraints', () => {
        it('should return Cloud Public constraints', () => {
            const constraints = constraintsService.getDeploymentConstraints('Cloud Public');

            expect(constraints).toBeDefined();
            expect(constraints.length).toBeGreaterThan(0);
            
            const noCustomAbap = constraints.find(c => c.constraint.includes('custom ABAP'));
            expect(noCustomAbap).toBeDefined();
        });

        it('should return On-Premise constraints', () => {
            const constraints = constraintsService.getDeploymentConstraints('On-Premise');

            expect(constraints).toBeDefined();
            expect(constraints.length).toBeGreaterThan(0);
        });

        it('should handle unknown deployment types', () => {
            const constraints = constraintsService.getDeploymentConstraints('Unknown');

            expect(constraints).toEqual([]);
        });
    });

    describe('getComplianceConstraints', () => {
        it('should return GDPR constraints', () => {
            const constraints = constraintsService.getComplianceConstraints(['GDPR']);

            expect(constraints).toBeDefined();
            expect(constraints.length).toBeGreaterThan(0);
            
            const gdprConstraint = constraints.find(c => c.requirement === 'GDPR');
            expect(gdprConstraint).toBeDefined();
        });

        it('should return multiple compliance constraints', () => {
            const constraints = constraintsService.getComplianceConstraints(['GDPR', 'SOX', 'FDA']);

            expect(constraints.length).toBeGreaterThanOrEqual(3);
        });

        it('should return empty array for no requirements', () => {
            const constraints = constraintsService.getComplianceConstraints([]);

            expect(constraints).toEqual([]);
        });
    });
});
