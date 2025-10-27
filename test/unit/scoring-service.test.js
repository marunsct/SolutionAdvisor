/**
 * Unit Tests for Scoring Service
 * 
 * Tests scoring formula calculations (TDS, CRS, UIS, CHS)
 */

// Mock CDS before requiring any modules that use it
jest.mock('@sap/cds', () => ({
    log: () => ({
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
    }),
    entities: jest.fn(() => ({
        CleanCoreAnalysis: 'sd.CleanCoreAnalysis',
        CleanCoreLevels: 'sd.CleanCoreLevels',
        DecisionPath: 'sd.DecisionPath'
    })),
    // Mock CDS SQL builder to prevent SELECT getter from initializing
    ql: {}
}));

const ScoringService = require('../../srv/lib/scoring-service');

// Must initialize global SELECT before tests run
beforeAll(() => {
    global.SELECT = {
        one: {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis()
        },
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis()
    };
});

describe('ScoringService', () => {
    let scoringService;

    beforeEach(() => {
        jest.clearAllMocks();
        scoringService = new ScoringService();
        
        // Reset global SELECT mocks for each test
        global.SELECT.one.from = jest.fn().mockReturnThis();
        global.SELECT.one.where = jest.fn().mockReturnThis();
        global.SELECT.from = jest.fn().mockReturnThis();
        global.SELECT.where = jest.fn().mockReturnThis();
        global.SELECT.orderBy = jest.fn().mockReturnThis();
    });

    describe('calculateScores', () => {
        it('should calculate all four scores for an analysis', async () => {
            const mockAnalysis = {
                ID: 'analysis-1',
                finalRecommendation: 'Level B',
                objectType: 'Interfaces',
                ricefwId: 'I-0042-IMP'
            };

            const mockLevelData = {
                cleanCoreLevel: 'Level B',
                technicalDebtMultiplier: 1.3,
                cloudReadinessMultiplier: 0.8,
                upgradeImpactMultiplier: 1.2,
                complexityWeight: 0.5
            };

            const mockDecisionPath = [
                { questionId: 'Q1', selectedAnswer: 'A1', questionText: 'Custom development?' },
                { questionId: 'Q2', selectedAnswer: 'B2', questionText: 'Data volume?' }
            ];

            SELECT.one.from.mockReturnThis();
            SELECT.one.where
                .mockResolvedValueOnce(mockAnalysis)
                .mockResolvedValueOnce(mockLevelData);

            SELECT.from.mockReturnThis();
            SELECT.where.mockReturnThis();
            SELECT.orderBy.mockResolvedValue(mockDecisionPath);

            const result = await scoringService.calculateScores('analysis-1');

            expect(result).toBeDefined();
            expect(result.technicalDebt).toBeGreaterThanOrEqual(0);
            expect(result.technicalDebt).toBeLessThanOrEqual(100);
            expect(result.cloudReadiness).toBeGreaterThanOrEqual(0);
            expect(result.cloudReadiness).toBeLessThanOrEqual(100);
            expect(result.upgradeImpact).toBeGreaterThanOrEqual(0);
            expect(result.upgradeImpact).toBeLessThanOrEqual(100);
            expect(result.compositeHealth).toBeGreaterThanOrEqual(0);
            expect(result.compositeHealth).toBeLessThanOrEqual(100);
        });

        it('should return higher technical debt for Level D', async () => {
            const mockAnalysis = {
                ID: 'analysis-2',
                finalRecommendation: 'Level D',
                objectType: 'Enhancements'
            };

            const mockLevelData = {
                cleanCoreLevel: 'Level D',
                technicalDebtMultiplier: 2.5,
                cloudReadinessMultiplier: 0.3,
                upgradeImpactMultiplier: 2.2,
                complexityWeight: 1.0
            };

            SELECT.one.from.mockReturnThis();
            SELECT.one.where
                .mockResolvedValueOnce(mockAnalysis)
                .mockResolvedValueOnce(mockLevelData);

            SELECT.from.mockReturnThis();
            SELECT.where.mockReturnThis();
            SELECT.orderBy.mockResolvedValue([
                { questionId: 'Q1', selectedAnswer: 'A4' }
            ]);

            const result = await scoringService.calculateScores('analysis-2');

            // Level D should have high technical debt (>60)
            expect(result.technicalDebt).toBeGreaterThan(60);
            // Level D should have low cloud readiness (<50)
            expect(result.cloudReadiness).toBeLessThan(50);
        });

        it('should return lower technical debt for Level A', async () => {
            const mockAnalysis = {
                ID: 'analysis-3',
                finalRecommendation: 'Level A',
                objectType: 'Reports'
            };

            const mockLevelData = {
                level: 'Level A',
                technicalDebtMultiplier: 0,
                cloudReadinessFactor: 1.0,
                upgradeImpactMultiplier: 0
            };

            SELECT.one.from.mockReturnThis();
            SELECT.one.where
                .mockResolvedValueOnce(mockAnalysis)
                .mockResolvedValueOnce(mockLevelData);

            SELECT.from.mockReturnThis();
            SELECT.where.mockReturnThis();
            SELECT.orderBy.mockResolvedValue([
                { questionId: 'Q1', selectedAnswer: 'A1', timeSpentSeconds: 20, userComments: '' }
            ]);

            const result = await scoringService.calculateScores('analysis-3');

            // Level A should have zero technical debt (multiplier = 0)
            expect(result.technicalDebt).toBe(0);
            // Level A should have maximum cloud readiness (factor = 1.0)
            expect(result.cloudReadiness).toBe(100);
            // Level A should have zero upgrade impact (multiplier = 0)
            expect(result.upgradeImpact).toBe(0);
            // Composite health should be 100 (perfect score)
            expect(result.compositeHealth).toBe(100);
        });

        it('should extract Level A from descriptive recommendation', async () => {
            const mockAnalysis = {
                ID: 'analysis-descriptive',
                finalRecommendation: 'Standard API / Create RAP service - Level A',
                objectType: 'Interfaces'
            };

            const mockLevelData = {
                level: 'Level A',
                technicalDebtMultiplier: 0,
                cloudReadinessFactor: 1.0,
                upgradeImpactMultiplier: 0
            };

            SELECT.one.from.mockReturnThis();
            SELECT.one.where
                .mockResolvedValueOnce(mockAnalysis)
                .mockResolvedValueOnce(mockLevelData);

            SELECT.from.mockReturnThis();
            SELECT.where.mockReturnThis();
            SELECT.orderBy.mockResolvedValue([
                { questionId: 'Q1', selectedAnswer: 'A1', timeSpentSeconds: 30, userComments: '' }
            ]);

            const result = await scoringService.calculateScores('analysis-descriptive');

            // Should correctly parse Level A from long descriptive recommendation
            expect(result.technicalDebt).toBe(0);
            expect(result.cloudReadiness).toBe(100);
            expect(result.upgradeImpact).toBe(0);
            expect(result.compositeHealth).toBe(100);
        });
    });

    describe('calculateTechnicalDebt', () => {
        it('should calculate score based on decision path complexity', () => {
            const decisionPath = [
                { selectedAnswer: 'custom', timeSpentSeconds: 60, userComments: '' },
                { selectedAnswer: 'high-volume', timeSpentSeconds: 90, userComments: '' },
                { selectedAnswer: 'complex-logic', timeSpentSeconds: 120, userComments: '' }
            ];
            const level = { technicalDebtMultiplier: 1.5, level: 'Level B' };

            const score = scoringService.calculateTechnicalDebt(decisionPath, level);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should return 0 for empty decision path', () => {
            const level = { technicalDebtMultiplier: 1.0, level: 'Level B' };
            const score = scoringService.calculateTechnicalDebt([], level);
            expect(score).toBe(0);
        });
    });

    describe('calculateCloudReadiness', () => {
        it('should return high score for Level A', () => {
            const analysis = { finalRecommendation: 'Level A' };
            const level = { cloudReadinessFactor: 1.0, level: 'Level A' };
            const score = scoringService.calculateCloudReadiness(analysis, level);
            expect(score).toBe(100);
        });

        it('should return low score for Level D', () => {
            const analysis = { finalRecommendation: 'Level D' };
            const level = { cloudReadinessFactor: 0.0, level: 'Level D' };
            const score = scoringService.calculateCloudReadiness(analysis, level);
            expect(score).toBe(0);
        });

        it('should handle Level B with default factor', () => {
            const analysis = { finalRecommendation: 'Level B' };
            const level = { cloudReadinessFactor: 0.5, level: 'Level B' };
            const score = scoringService.calculateCloudReadiness(analysis, level);
            expect(score).toBe(75);
        });
    });

    describe('calculateUpgradeImpact', () => {
        it('should calculate based on decision path and multiplier', () => {
            const decisionPath = [
                { selectedAnswer: 'modification', userComments: '', timeSpentSeconds: 40 },
                { selectedAnswer: 'core-change', userComments: 'complex change', timeSpentSeconds: 60 }
            ];
            const level = { upgradeImpactMultiplier: 1.8, level: 'Level B' };

            const score = scoringService.calculateUpgradeImpact(decisionPath, level);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('calculateCompositeHealth', () => {
        it('should calculate weighted average of all scores', () => {
            const technicalDebt = 30;
            const cloudReadiness = 80;
            const upgradeImpact = 25;

            const compositeScore = scoringService.calculateCompositeHealth(technicalDebt, cloudReadiness, upgradeImpact);

            expect(compositeScore).toBeGreaterThanOrEqual(0);
            expect(compositeScore).toBeLessThanOrEqual(100);
            // Higher cloud readiness and lower debt/impact should yield good score
            expect(compositeScore).toBeGreaterThan(60);
        });

        it('should handle edge cases with all zeros', () => {
            const technicalDebt = 0;
            const cloudReadiness = 0;
            const upgradeImpact = 0;

            const compositeScore = scoringService.calculateCompositeHealth(technicalDebt, cloudReadiness, upgradeImpact);
            // (100 - 0) * 0.4 + 0 * 0.3 + (100 - 0) * 0.3 = 40 + 0 + 30 = 70
            expect(compositeScore).toBe(70);
        });

        it('should return 100 for perfect Level A scores', () => {
            const technicalDebt = 0;
            const cloudReadiness = 100;
            const upgradeImpact = 0;

            const compositeScore = scoringService.calculateCompositeHealth(technicalDebt, cloudReadiness, upgradeImpact);
            expect(compositeScore).toBe(100); // (100 - 0) * 0.4 + 100 * 0.3 + (100 - 0) * 0.3 = 40 + 30 + 30 = 100
        });
    });
});
