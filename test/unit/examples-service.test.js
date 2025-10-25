/**
 * Unit Tests for ExamplesService
 * 
 * Tests the real-world examples matching logic and relevance scoring algorithm
 */

const ExamplesService = require('../../srv/lib/examples-service');

describe('ExamplesService', () => {
    let examplesService;

    beforeEach(() => {
        examplesService = new ExamplesService(null);
    });

    describe('calculateRelevance', () => {
        const baseExample = {
            ID: 'example-1',
            title: 'SAP API Integration for Sales Orders',
            scenario: 'Real-time sales order synchronization',
            challengeDescription: 'Need to integrate legacy CRM with S/4HANA sales orders',
            solutionDescription: 'Implemented using SAP released APIs with OData integration',
            keywords: 'API integration OData sales CRM real-time',
            industry: 'Retail',
            cleanCoreLevel: 'Level A',
            volumeHandled: 'High - 50,000 orders per day',
            createdAt: new Date().toISOString()
        };

        it('should return high score for exact scenario match', () => {
            const score = examplesService.calculateRelevance(
                baseExample,
                'Real-time sales order synchronization',
                [],
                {}
            );
            
            expect(score).toBeGreaterThanOrEqual(100);
        });

        it('should return medium score for partial scenario match', () => {
            const score = examplesService.calculateRelevance(
                baseExample,
                'sales order',
                [],
                {}
            );
            
            expect(score).toBeGreaterThanOrEqual(50);
            expect(score).toBeLessThan(100);
        });

        it('should add points for keyword matches in title', () => {
            const scoreWithKeywords = examplesService.calculateRelevance(
                baseExample,
                '',
                ['API', 'Integration'],
                {}
            );
            
            const scoreWithoutKeywords = examplesService.calculateRelevance(
                baseExample,
                '',
                [],
                {}
            );
            
            expect(scoreWithKeywords).toBeGreaterThan(scoreWithoutKeywords);
            expect(scoreWithKeywords).toBeGreaterThanOrEqual(40); // 2 keywords * 20 points
        });

        it('should add points for keyword matches in keywords field', () => {
            const score = examplesService.calculateRelevance(
                baseExample,
                '',
                ['OData', 'real-time'],
                {}
            );
            
            expect(score).toBeGreaterThanOrEqual(20); // 2 keywords * 10 points
        });

        it('should add points for keyword matches in challenge/solution', () => {
            const score = examplesService.calculateRelevance(
                baseExample,
                '',
                ['CRM', 'legacy'],
                {}
            );
            
            // Should match in challenge description (2 * 5 = 10 points)
            expect(score).toBeGreaterThanOrEqual(10);
        });

        it('should add points for industry match', () => {
            const scoreWithMatch = examplesService.calculateRelevance(
                baseExample,
                '',
                [],
                { industry: 'Retail' }
            );
            
            const scoreWithoutMatch = examplesService.calculateRelevance(
                baseExample,
                '',
                [],
                { industry: 'Manufacturing' }
            );
            
            expect(scoreWithMatch).toBe(scoreWithoutMatch + 15);
        });

        it('should add points for clean core level match', () => {
            const scoreWithMatch = examplesService.calculateRelevance(
                baseExample,
                '',
                [],
                { cleanCoreLevel: 'Level A' }
            );
            
            const scoreWithoutMatch = examplesService.calculateRelevance(
                baseExample,
                '',
                [],
                { cleanCoreLevel: 'Level B' }
            );
            
            expect(scoreWithMatch).toBe(scoreWithoutMatch + 10);
        });

        it('should handle string keywords input', () => {
            const score = examplesService.calculateRelevance(
                baseExample,
                '',
                'API Integration OData',
                {}
            );
            
            expect(score).toBeGreaterThan(0);
        });

        it('should filter out short keywords (< 3 chars)', () => {
            const score = examplesService.calculateRelevance(
                baseExample,
                '',
                'API in is',
                {}
            );
            
            // Only 'API' should be counted (3 chars)
            expect(score).toBeGreaterThan(0);
        });

        it('should boost recently added examples', () => {
            const recentExample = { ...baseExample };
            const oldExample = {
                ...baseExample,
                createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
            };

            const recentScore = examplesService.calculateRelevance(recentExample, '', [], {});
            const oldScore = examplesService.calculateRelevance(oldExample, '', [], {});

            expect(recentScore).toBeGreaterThan(oldScore);
        });

        it('should handle missing context gracefully', () => {
            const score = examplesService.calculateRelevance(
                baseExample,
                null,
                null,
                null
            );
            
            // Should have minimal score (only recency boost if example is recent)
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThan(10);
        });

        it('should calculate combined score correctly', () => {
            const context = {
                industry: 'Retail',
                cleanCoreLevel: 'Level A',
                volumeLevel: 'High'
            };

            const score = examplesService.calculateRelevance(
                baseExample,
                'sales order synchronization',
                ['API', 'Integration', 'OData'],
                context
            );

            // Should have points from:
            // - Partial scenario match: 50
            // - Title keywords (API, Integration): 40
            // - Keywords field (OData): 10
            // - Industry match: 15
            // - Level match: 10
            // - Volume similarity: ~20
            // Total: ~145+
            expect(score).toBeGreaterThan(100);
        });
    });

    describe('calculateVolumeSimilarity', () => {
        it('should return max score for exact volume match', () => {
            const score = examplesService.calculateVolumeSimilarity('High', 'High - 50,000 records');
            expect(score).toBe(20);
        });

        it('should return reduced score for adjacent volume levels', () => {
            const score = examplesService.calculateVolumeSimilarity('Medium', 'High - 10,000 records');
            expect(score).toBe(13);
        });

        it('should return minimal score for distant volume levels', () => {
            const score = examplesService.calculateVolumeSimilarity('Low', 'Very High - millions');
            expect(score).toBeLessThanOrEqual(7);
        });

        it('should recognize "million" as very high volume', () => {
            const score = examplesService.calculateVolumeSimilarity('Very High', '5 million records per day');
            expect(score).toBe(20);
        });

        it('should recognize "thousand" as high volume', () => {
            const score = examplesService.calculateVolumeSimilarity('High', '50 thousand records');
            expect(score).toBe(20);
        });

        it('should recognize "hundred" as low volume', () => {
            const score = examplesService.calculateVolumeSimilarity('Low', 'Few hundred records');
            expect(score).toBe(20);
        });

        it('should default to medium volume when unclear', () => {
            const score = examplesService.calculateVolumeSimilarity('Medium', 'Standard volume');
            expect(score).toBeGreaterThan(0);
        });
    });

    describe('calculateRelevancePercentage', () => {
        it('should convert score to percentage', () => {
            expect(examplesService.calculateRelevancePercentage(150)).toBe(50);
            expect(examplesService.calculateRelevancePercentage(300)).toBe(100);
            expect(examplesService.calculateRelevancePercentage(30)).toBe(10);
        });

        it('should cap at 100%', () => {
            expect(examplesService.calculateRelevancePercentage(500)).toBe(100);
        });

        it('should round to nearest integer', () => {
            expect(examplesService.calculateRelevancePercentage(45)).toBe(15);
        });
    });

    describe('getContextualExamples', () => {
        // These tests would require mocking the database
        // For now, we'll add placeholder tests that verify the method exists
        it('should be defined', () => {
            expect(examplesService.getContextualExamples).toBeDefined();
            expect(typeof examplesService.getContextualExamples).toBe('function');
        });
    });

    describe('logExampleView', () => {
        it('should be defined', () => {
            expect(examplesService.logExampleView).toBeDefined();
            expect(typeof examplesService.logExampleView).toBe('function');
        });
    });

    describe('getPopularExamples', () => {
        it('should be defined', () => {
            expect(examplesService.getPopularExamples).toBeDefined();
            expect(typeof examplesService.getPopularExamples).toBe('function');
        });
    });
});
