/**
 * Unit Tests for Scoring Service
 * 
 * Tests scoring formula calculations (TDS, CRS, UIS, CHS)
 */

const ScoringService = require('../../srv/lib/scoring-service');

// Mock CDS
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
    }))
}));

// Mock SELECT
global.SELECT = {
    one: {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis()
    },
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis()
};

describe('ScoringService', () => {
    let scoringService;

    beforeEach(() => {
        jest.clearAllMocks();
        scoringService = new ScoringService();
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
            SELECT.where.mockResolvedValue(mockDecisionPath);

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
            SELECT.where.mockResolvedValue([
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
                cleanCoreLevel: 'Level A',
                technicalDebtMultiplier: 0.5,
                cloudReadinessMultiplier: 1.0,
                upgradeImpactMultiplier: 0.5,
                complexityWeight: 0.2
            };

            SELECT.one.from.mockReturnThis();
            SELECT.one.where
                .mockResolvedValueOnce(mockAnalysis)
                .mockResolvedValueOnce(mockLevelData);

            SELECT.from.mockReturnThis();
            SELECT.where.mockResolvedValue([
                { questionId: 'Q1', selectedAnswer: 'A1' }
            ]);

            const result = await scoringService.calculateScores('analysis-3');

            // Level A should have low technical debt (<40)
            expect(result.technicalDebt).toBeLessThan(40);
            // Level A should have high cloud readiness (>70)
            expect(result.cloudReadiness).toBeGreaterThan(70);
        });
    });

    describe('_calculateTechnicalDebtScore', () => {
        it('should calculate score based on decision path complexity', () => {
            const decisionPath = [
                { selectedAnswer: 'custom' },
                { selectedAnswer: 'high-volume' },
                { selectedAnswer: 'complex-logic' }
            ];
            const multiplier = 1.5;

            const score = scoringService._calculateTechnicalDebtScore(decisionPath, multiplier);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should return 0 for empty decision path', () => {
            const score = scoringService._calculateTechnicalDebtScore([], 1.0);
            expect(score).toBe(0);
        });
    });

    describe('_calculateCloudReadinessScore', () => {
        it('should return high score for Level A', () => {
            const score = scoringService._calculateCloudReadinessScore('Level A', 'Cloud Public');
            expect(score).toBeGreaterThan(80);
        });

        it('should return low score for Level D', () => {
            const score = scoringService._calculateCloudReadinessScore('Level D', 'On-Premise');
            expect(score).toBeLessThan(40);
        });

        it('should boost score for Cloud Public deployment', () => {
            const cloudScore = scoringService._calculateCloudReadinessScore('Level B', 'Cloud Public');
            const onPremScore = scoringService._calculateCloudReadinessScore('Level B', 'On-Premise');
            
            expect(cloudScore).toBeGreaterThan(onPremScore);
        });
    });

    describe('_calculateUpgradeImpactScore', () => {
        it('should calculate based on decision path and multiplier', () => {
            const decisionPath = [
                { selectedAnswer: 'modification' },
                { selectedAnswer: 'core-change' }
            ];
            const multiplier = 1.8;

            const score = scoringService._calculateUpgradeImpactScore(decisionPath, multiplier);

            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });
    });

    describe('_calculateCompositeHealthScore', () => {
        it('should calculate weighted average of all scores', () => {
            const scores = {
                technicalDebt: 30,
                cloudReadiness: 80,
                upgradeImpact: 25
            };

            const compositeScore = scoringService._calculateCompositeHealthScore(scores);

            expect(compositeScore).toBeGreaterThanOrEqual(0);
            expect(compositeScore).toBeLessThanOrEqual(100);
            // Higher cloud readiness and lower debt/impact should yield good score
            expect(compositeScore).toBeGreaterThan(60);
        });

        it('should handle edge cases with all zeros', () => {
            const scores = {
                technicalDebt: 0,
                cloudReadiness: 0,
                upgradeImpact: 0
            };

            const compositeScore = scoringService._calculateCompositeHealthScore(scores);
            expect(compositeScore).toBe(50); // Neutral score when all inputs are 0
        });
    });
});
