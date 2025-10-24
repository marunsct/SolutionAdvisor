/**
 * Integration Tests for OData Services
 * 
 * Tests the complete OData V4 service endpoints with HTTP requests
 */

const request = require('supertest');
const cds = require('@sap/cds');

describe('SolutionAdvisor OData Service', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Start CAP server in test mode
        app = await cds.test('.', '--in-memory', '--with-mocks');
        server = app.server;
    });

    afterAll(async () => {
        // Cleanup
        if (server) {
            await server.close();
        }
    });

    describe('Service Metadata', () => {
        it('should return service metadata document', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/$metadata')
                .expect('Content-Type', /xml/)
                .expect(200);

            expect(response.text).toContain('Edm');
            expect(response.text).toContain('EntityType');
        });
    });

    describe('Entity Collections', () => {
        it('should return empty CleanCoreAnalysis collection', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/CleanCoreAnalysis')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('value');
            expect(Array.isArray(response.body.value)).toBe(true);
        });

        it('should return CleanCoreLevels master data', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/CleanCoreLevels')
                .expect(200);

            expect(response.body.value).toBeDefined();
            expect(response.body.value.length).toBeGreaterThan(0);
            
            // Should have Level A, B, C, D
            const levelCodes = response.body.value.map(l => l.levelCode);
            expect(levelCodes).toContain('A');
            expect(levelCodes).toContain('B');
        });

        it('should return ObjectTypes master data', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/ObjectTypes')
                .expect(200);

            expect(response.body.value).toBeDefined();
            expect(response.body.value.length).toBeGreaterThan(0);
            
            // Should have RICEFW types
            const typeCodes = response.body.value.map(t => t.typeCode);
            expect(typeCodes).toContain('R'); // Reports
            expect(typeCodes).toContain('I'); // Interfaces
        });
    });

    describe('OData Query Options', () => {
        it('should support $filter query', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/CleanCoreLevels?$filter=levelCode eq \'A\'')
                .expect(200);

            expect(response.body.value).toBeDefined();
            if (response.body.value.length > 0) {
                expect(response.body.value[0].levelCode).toBe('A');
            }
        });

        it('should support $orderby query', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/ObjectTypes?$orderby=typeCode asc')
                .expect(200);

            expect(response.body.value).toBeDefined();
        });

        it('should support $select query', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/CleanCoreLevels?$select=levelCode,levelName')
                .expect(200);

            expect(response.body.value).toBeDefined();
        });

        it('should support $top and $skip pagination', async () => {
            const response = await request(app)
                .get('/service/SolutionAdvisorSvcs/PerformanceThreshold?$top=5&$skip=0')
                .expect(200);

            expect(response.body.value).toBeDefined();
            expect(response.body.value.length).toBeLessThanOrEqual(5);
        });
    });

    describe('startWizard Action', () => {
        it('should start a new wizard session', async () => {
            const payload = {
                projectConfigId: 'test-project-123',
                objectType: 'Interfaces',
                ricefwId: 'I-0001-TST'
            };

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/startWizard')
                .send(payload)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('sessionId');
            expect(response.body).toHaveProperty('currentQuestion');
            expect(response.body.currentQuestion).toHaveProperty('questionId');
            expect(response.body.currentQuestion).toHaveProperty('questionText');
        });

        it('should return 400 for missing required parameters', async () => {
            const payload = {
                objectType: 'Interfaces'
                // Missing projectConfigId and ricefwId
            };

            await request(app)
                .post('/service/SolutionAdvisorSvcs/startWizard')
                .send(payload)
                .expect(400);
        });

        it('should return 400 for invalid RICEFW ID format', async () => {
            const payload = {
                projectConfigId: 'test-project-123',
                objectType: 'Interfaces',
                ricefwId: 'INVALID-FORMAT'
            };

            await request(app)
                .post('/service/SolutionAdvisorSvcs/startWizard')
                .send(payload)
                .expect(400);
        });
    });

    describe('submitAnswer Action', () => {
        let sessionId;

        beforeEach(async () => {
            // Create a wizard session first
            const startResponse = await request(app)
                .post('/service/SolutionAdvisorSvcs/startWizard')
                .send({
                    projectConfigId: 'test-project-123',
                    objectType: 'Interfaces',
                    ricefwId: 'I-0001-TST'
                });
            
            sessionId = startResponse.body.sessionId;
        });

        it('should submit an answer and return next question', async () => {
            const payload = {
                sessionId: sessionId,
                answerId: 'A1'
            };

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/submitAnswer')
                .send(payload)
                .expect(200);

            expect(response.body).toHaveProperty('nextQuestion');
            expect(response.body.nextQuestion).toHaveProperty('questionId');
        });

        it('should complete wizard when final answer reached', async () => {
            // Submit answers until final recommendation
            const payload = {
                sessionId: sessionId,
                answerId: 'A_FINAL'
            };

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/submitAnswer')
                .send(payload)
                .expect(200);

            expect(response.body).toHaveProperty('isComplete');
            if (response.body.isComplete) {
                expect(response.body).toHaveProperty('finalRecommendation');
                expect(response.body.finalRecommendation).toHaveProperty('recommendedLevel');
            }
        });

        it('should return 400 for invalid session ID', async () => {
            const payload = {
                sessionId: 'invalid-session-id',
                answerId: 'A1'
            };

            await request(app)
                .post('/service/SolutionAdvisorSvcs/submitAnswer')
                .send(payload)
                .expect(400);
        });
    });

    describe('getAnalyticsData Action', () => {
        it('should return analytics data for a project', async () => {
            const payload = {
                projectConfigId: 'test-project-123',
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/getAnalyticsData')
                .send(payload)
                .expect(200);

            expect(response.body).toHaveProperty('levelDistribution');
            expect(response.body).toHaveProperty('averageScores');
            expect(response.body).toHaveProperty('objectTypeBreakdown');
        });

        it('should return empty data for non-existent project', async () => {
            const payload = {
                projectConfigId: 'non-existent-project',
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/getAnalyticsData')
                .send(payload)
                .expect(200);

            expect(response.body.levelDistribution).toEqual({});
        });
    });

    describe('getRelevantConstraints Action', () => {
        it('should return constraints for object type and deployment', async () => {
            const payload = {
                objectType: 'Interfaces',
                deploymentType: 'Cloud Public',
                complianceRequirements: ['GDPR']
            };

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/getRelevantConstraints')
                .send(payload)
                .expect(200);

            expect(response.body).toHaveProperty('performanceConstraints');
            expect(response.body).toHaveProperty('deploymentConstraints');
            expect(response.body).toHaveProperty('complianceConstraints');
        });

        it('should filter constraints by deployment type', async () => {
            const payload = {
                objectType: 'Interfaces',
                deploymentType: 'On-Premise'
            };

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/getRelevantConstraints')
                .send(payload)
                .expect(200);

            expect(response.body.performanceConstraints).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for non-existent entity', async () => {
            await request(app)
                .get('/service/SolutionAdvisorSvcs/NonExistentEntity')
                .expect(404);
        });

        it('should return 400 for invalid OData query', async () => {
            await request(app)
                .get('/service/SolutionAdvisorSvcs/CleanCoreLevels?$filter=invalidSyntax')
                .expect(400);
        });

        it('should return 405 for unsupported HTTP methods on read-only entities', async () => {
            await request(app)
                .post('/service/SolutionAdvisorSvcs/CleanCoreLevels')
                .send({ levelCode: 'X' })
                .expect(405);
        });
    });

    describe('Batch Requests', () => {
        it('should support OData $batch requests', async () => {
            const batchPayload = `--batch_boundary
Content-Type: application/http
Content-Transfer-Encoding: binary

GET CleanCoreLevels HTTP/1.1
Accept: application/json


--batch_boundary
Content-Type: application/http
Content-Transfer-Encoding: binary

GET ObjectTypes HTTP/1.1
Accept: application/json


--batch_boundary--`;

            const response = await request(app)
                .post('/service/SolutionAdvisorSvcs/$batch')
                .set('Content-Type', 'multipart/mixed; boundary=batch_boundary')
                .send(batchPayload)
                .expect(200);

            expect(response.text).toContain('HTTP/1.1');
        });
    });
});
