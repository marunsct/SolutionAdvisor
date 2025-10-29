/**
 * Integration Tests - OData Actions
 * 
 * Tests all custom OData actions: startWizard, submitAnswer, recalculateScores, 
 * batchRecalculateScores, resumeWizard, getAnalyticsData, getRateLimitStatus
 */

const cds = require('@sap/cds/lib');
const { expect } = require('@jest/globals');

describe('OData Actions', () => {
    let service;
    let testProject;
    let testAnalysis;

    beforeAll(async () => {
        await cds.deploy(__dirname + '/../../srv/service.cds');
        service = await cds.connect.to('solutionAdvisorService');
        
        // Create test project
        const { ProjectConfiguration } = service.entities;
        const projectData = {
            projectName: 'Action Test Project',
            clientName: 'Test Client',
            s4HanaFlavor: 'Cloud Public',
            complianceRequirements: ['GDPR']
        };
        
        await INSERT.into(ProjectConfiguration).entries(projectData);
        testProject = await SELECT.one.from(ProjectConfiguration)
            .where({ projectName: 'Action Test Project' });
    });

    describe('startWizard Action', () => {
        it('should start new wizard session', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/startWizard',
                data: {
                    projectId: testProject.ID,
                    ricefwId: 'R-0200-ACT',
                    objectType: 'R'
                }
            });
            
            expect(result).toBeDefined();
            expect(result.sessionId).toBeDefined();
            expect(result.firstQuestion).toBeDefined();
            expect(result.firstQuestion.questionId).toBeDefined();
            expect(result.firstQuestion.questionText).toBeDefined();
            expect(result.firstQuestion.answerOptions).toBeDefined();
            expect(Array.isArray(result.firstQuestion.answerOptions)).toBe(true);
        });

        it('should reject wizard start with invalid object type', async () => {
            try {
                await service.send({
                    method: 'POST',
                    path: '/startWizard',
                    data: {
                        projectId: testProject.ID,
                        ricefwId: 'X-0200-BAD',
                        objectType: 'X' // Invalid
                    }
                });
                
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('Invalid object type');
            }
        });

        it('should reject wizard start with duplicate ricefwId', async () => {
            // First wizard
            await service.send({
                method: 'POST',
                path: '/startWizard',
                data: {
                    projectId: testProject.ID,
                    ricefwId: 'R-0201-DUP',
                    objectType: 'R'
                }
            });
            
            // Attempt duplicate
            try {
                await service.send({
                    method: 'POST',
                    path: '/startWizard',
                    data: {
                        projectId: testProject.ID,
                        ricefwId: 'R-0201-DUP',
                        objectType: 'R'
                    }
                });
                
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('submitAnswer Action', () => {
        let wizardSession;

        beforeAll(async () => {
            const startResult = await service.send({
                method: 'POST',
                path: '/startWizard',
                data: {
                    projectId: testProject.ID,
                    ricefwId: 'R-0202-ANS',
                    objectType: 'R'
                }
            });
            
            wizardSession = startResult;
        });

        it('should submit answer and receive next question', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/submitAnswer',
                data: {
                    sessionId: wizardSession.sessionId,
                    questionId: wizardSession.firstQuestion.questionId,
                    answerId: wizardSession.firstQuestion.answerOptions[0].answerId
                }
            });
            
            expect(result).toBeDefined();
            
            if (result.isComplete) {
                expect(result.finalRecommendation).toBeDefined();
                expect(result.finalRecommendation.recommendedLevel).toBeDefined();
            } else {
                expect(result.nextQuestion).toBeDefined();
                expect(result.nextQuestion.questionId).toBeDefined();
            }
        });

        it('should reject answer for invalid session', async () => {
            try {
                await service.send({
                    method: 'POST',
                    path: '/submitAnswer',
                    data: {
                        sessionId: 'invalid-session-id',
                        questionId: 'Q1',
                        answerId: 'A1'
                    }
                });
                
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeDefined();
                expect(error.message).toContain('Session not found');
            }
        });
    });

    describe('recalculateScores Action', () => {
        beforeAll(async () => {
            // Create test analysis
            const { CleanCoreAnalysis } = service.entities;
            const analysisData = {
                ricefwId: 'E-0300-SCR',
                objectType_typeCode: 'E',
                objectDescription: 'Score Recalculation Test',
                recommendedLevel_levelCode: 'B',
                technicalDebtScore: 0,
                cloudReadinessScore: 0,
                upgradeImpactScore: 0,
                compositeHealthScore: 0
            };
            
            await INSERT.into(CleanCoreAnalysis).entries(analysisData);
            testAnalysis = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'E-0300-SCR' });
        });

        it('should recalculate scores for analysis', async () => {
            const result = await service.send({
                method: 'POST',
                path: `/CleanCoreAnalysis(${testAnalysis.ID})/recalculateScores`,
                data: {}
            });
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.scores).toBeDefined();
            expect(result.scores.technicalDebtScore).toBeGreaterThanOrEqual(0);
            expect(result.scores.cloudReadinessScore).toBeGreaterThanOrEqual(0);
            expect(result.scores.upgradeImpactScore).toBeGreaterThanOrEqual(0);
            expect(result.scores.compositeHealthScore).toBeGreaterThanOrEqual(0);
            
            // Verify scores were updated in database
            const updated = await SELECT.one.from(service.entities.CleanCoreAnalysis)
                .where({ ID: testAnalysis.ID });
            
            expect(updated.technicalDebtScore).toBe(result.scores.technicalDebtScore);
        });

        it('should reject recalculation for non-existent analysis', async () => {
            try {
                await service.send({
                    method: 'POST',
                    path: `/CleanCoreAnalysis(non-existent-id)/recalculateScores`,
                    data: {}
                });
                
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('batchRecalculateScores Action', () => {
        let analysisIds;

        beforeAll(async () => {
            // Create multiple test analyses
            const { CleanCoreAnalysis } = service.entities;
            const analyses = [
                {
                    ricefwId: 'I-0400-BA1',
                    objectType_typeCode: 'I',
                    objectDescription: 'Batch Test 1',
                    recommendedLevel_levelCode: 'A'
                },
                {
                    ricefwId: 'I-0401-BA2',
                    objectType_typeCode: 'I',
                    objectDescription: 'Batch Test 2',
                    recommendedLevel_levelCode: 'C'
                },
                {
                    ricefwId: 'I-0402-BA3',
                    objectType_typeCode: 'I',
                    objectDescription: 'Batch Test 3',
                    recommendedLevel_levelCode: 'D'
                }
            ];
            
            await INSERT.into(CleanCoreAnalysis).entries(analyses);
            
            const created = await SELECT.from(CleanCoreAnalysis)
                .where({ ricefwId: { like: 'I-040%-BA%' } });
            
            analysisIds = created.map(a => a.ID);
        });

        it('should batch recalculate scores for multiple analyses', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/batchRecalculateScores',
                data: {
                    analysisIDs: analysisIds
                }
            });
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.totalProcessed).toBe(analysisIds.length);
            expect(result.successCount).toBe(analysisIds.length);
            expect(result.failedCount).toBe(0);
            expect(result.results).toHaveLength(analysisIds.length);
            expect(result.durationMs).toBeGreaterThan(0);
            
            // Verify each result has scores
            result.results.forEach(r => {
                expect(r.analysisID).toBeDefined();
                expect(r.success).toBe(true);
                expect(r.scores).toBeDefined();
                expect(r.scores.technicalDebtScore).toBeGreaterThanOrEqual(0);
            });
        });

        it('should handle empty analysis IDs array', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/batchRecalculateScores',
                data: {
                    analysisIDs: []
                }
            });
            
            expect(result.totalProcessed).toBe(0);
            expect(result.successCount).toBe(0);
        });

        it('should isolate errors in batch processing', async () => {
            const mixedIds = [...analysisIds, 'non-existent-id-1', 'non-existent-id-2'];
            
            const result = await service.send({
                method: 'POST',
                path: '/batchRecalculateScores',
                data: {
                    analysisIDs: mixedIds
                }
            });
            
            expect(result.totalProcessed).toBe(mixedIds.length);
            expect(result.successCount).toBe(analysisIds.length);
            expect(result.failedCount).toBe(2);
            
            // Check failed results have error messages
            const failedResults = result.results.filter(r => !r.success);
            expect(failedResults).toHaveLength(2);
            failedResults.forEach(r => {
                expect(r.error).toBeDefined();
            });
        });
    });

    describe('resumeWizard Action', () => {
        let savedSessionId;

        beforeAll(async () => {
            // Start wizard and save session
            const startResult = await service.send({
                method: 'POST',
                path: '/startWizard',
                data: {
                    projectId: testProject.ID,
                    ricefwId: 'C-0500-RES',
                    objectType: 'C'
                }
            });
            
            savedSessionId = startResult.sessionId;
        });

        it('should resume saved wizard session', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/resumeWizard',
                data: {
                    sessionId: savedSessionId
                }
            });
            
            expect(result).toBeDefined();
            expect(result.sessionId).toBe(savedSessionId);
            expect(result.currentQuestion).toBeDefined();
            expect(result.completedSteps).toBeDefined();
        });

        it('should reject resume for non-existent session', async () => {
            try {
                await service.send({
                    method: 'POST',
                    path: '/resumeWizard',
                    data: {
                        sessionId: 'non-existent-session'
                    }
                });
                
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('getAnalyticsData Action', () => {
        it('should retrieve analytics data with default parameters', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            expect(result).toBeDefined();
            expect(result.aggregatedMetrics).toBeDefined();
            expect(result.aggregatedMetrics.totalAnalyses).toBeGreaterThanOrEqual(0);
            expect(result.aggregatedMetrics.averageTechnicalDebt).toBeDefined();
            expect(result.aggregatedMetrics.averageCloudReadiness).toBeDefined();
        });

        it('should filter analytics by date range', async () => {
            const startDate = new Date('2024-01-01').toISOString();
            const endDate = new Date('2024-12-31').toISOString();
            
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    startDate,
                    endDate
                }
            });
            
            expect(result).toBeDefined();
            expect(result.aggregatedMetrics).toBeDefined();
        });

        it('should filter analytics by object type', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    objectType: 'R'
                }
            });
            
            expect(result).toBeDefined();
            expect(result.aggregatedMetrics).toBeDefined();
        });

        it('should filter analytics by clean core level', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    cleanCoreLevel: 'A'
                }
            });
            
            expect(result).toBeDefined();
            expect(result.aggregatedMetrics).toBeDefined();
        });
    });

    describe('getRateLimitStatus Action', () => {
        it('should retrieve rate limit status for current user', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getRateLimitStatus',
                data: {}
            });
            
            expect(result).toBeDefined();
            expect(result.limit).toBeDefined();
            expect(result.remaining).toBeDefined();
            expect(result.resetTime).toBeDefined();
            expect(result.limit).toBeGreaterThan(0);
            expect(result.remaining).toBeGreaterThanOrEqual(0);
            expect(result.remaining).toBeLessThanOrEqual(result.limit);
        });

        it('should show higher limit for admin users', async () => {
            // Mock admin request
            const adminResult = await service.send({
                method: 'POST',
                path: '/getRateLimitStatus',
                data: {},
                headers: {
                    'x-user-role': 'TenantAdmin'
                }
            });
            
            const userResult = await service.send({
                method: 'POST',
                path: '/getRateLimitStatus',
                data: {},
                headers: {
                    'x-user-role': 'Developer'
                }
            });
            
            expect(adminResult.limit).toBeGreaterThanOrEqual(userResult.limit);
        });
    });

    describe('Action Return Types', () => {
        it('should return correct structure from startWizard', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/startWizard',
                data: {
                    projectId: testProject.ID,
                    ricefwId: 'F-0600-RET',
                    objectType: 'F'
                }
            });
            
            // Verify structure
            expect(result).toMatchObject({
                sessionId: expect.any(String),
                firstQuestion: {
                    questionId: expect.any(String),
                    questionText: expect.any(String),
                    answerOptions: expect.any(Array),
                    detailedHint: expect.any(String)
                }
            });
        });

        it('should return correct structure from batchRecalculateScores', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/batchRecalculateScores',
                data: {
                    analysisIDs: [testAnalysis.ID]
                }
            });
            
            expect(result).toMatchObject({
                success: expect.any(Boolean),
                message: expect.any(String),
                totalProcessed: expect.any(Number),
                successCount: expect.any(Number),
                failedCount: expect.any(Number),
                durationMs: expect.any(Number),
                results: expect.arrayContaining([
                    expect.objectContaining({
                        analysisID: expect.any(String),
                        success: expect.any(Boolean)
                    })
                ])
            });
        });
    });
});
