/**
 * Integration Tests - Analytics Service
 * 
 * Tests getAnalyticsData aggregations, filtering, grouping, date ranges
 */

const cds = require('@sap/cds/lib');
const { expect } = require('@jest/globals');

describe('Analytics Service', () => {
    let service;
    let testProjectId;

    beforeAll(async () => {
        await cds.deploy(__dirname + '/../../srv/service.cds');
        service = await cds.connect.to('solutionAdvisorService');
        
        // Create test project
        const { ProjectConfiguration } = service.entities;
        await INSERT.into(ProjectConfiguration).entries({
            projectName: 'Analytics Test Project',
            clientName: 'Analytics Corp',
            s4HanaFlavor: 'Cloud Public'
        });
        
        const project = await SELECT.one.from(ProjectConfiguration)
            .where({ projectName: 'Analytics Test Project' });
        testProjectId = project.ID;
        
        // Create diverse test data for analytics
        await setupAnalyticsTestData();
    });

    async function setupAnalyticsTestData() {
        const { CleanCoreAnalysis } = service.entities;
        
        const testAnalyses = [
            // Level A analyses (low tech debt, high cloud readiness)
            {
                ricefwId: 'R-1100-A1',
                objectType_typeCode: 'R',
                objectDescription: 'Standard Report',
                recommendedLevel_levelCode: 'A',
                technicalDebtScore: 10,
                cloudReadinessScore: 95,
                upgradeImpactScore: 5,
                compositeHealthScore: 90,
                project_ID: testProjectId
            },
            {
                ricefwId: 'I-1101-A2',
                objectType_typeCode: 'I',
                objectDescription: 'API-based Interface',
                recommendedLevel_levelCode: 'A',
                technicalDebtScore: 15,
                cloudReadinessScore: 92,
                upgradeImpactScore: 8,
                compositeHealthScore: 88,
                project_ID: testProjectId
            },
            
            // Level B analyses (moderate)
            {
                ricefwId: 'E-1102-B1',
                objectType_typeCode: 'E',
                objectDescription: 'Key User Extension',
                recommendedLevel_levelCode: 'B',
                technicalDebtScore: 35,
                cloudReadinessScore: 75,
                upgradeImpactScore: 30,
                compositeHealthScore: 70,
                project_ID: testProjectId
            },
            {
                ricefwId: 'C-1103-B2',
                objectType_typeCode: 'C',
                objectDescription: 'Data Migration',
                recommendedLevel_levelCode: 'B',
                technicalDebtScore: 40,
                cloudReadinessScore: 70,
                upgradeImpactScore: 35,
                compositeHealthScore: 65,
                project_ID: testProjectId
            },
            
            // Level C analyses (higher customization)
            {
                ricefwId: 'E-1104-C1',
                objectType_typeCode: 'E',
                objectDescription: 'Custom ABAP',
                recommendedLevel_levelCode: 'C',
                technicalDebtScore: 60,
                cloudReadinessScore: 50,
                upgradeImpactScore: 55,
                compositeHealthScore: 45,
                project_ID: testProjectId
            },
            {
                ricefwId: 'F-1105-C2',
                objectType_typeCode: 'F',
                objectDescription: 'Custom Form',
                recommendedLevel_levelCode: 'C',
                technicalDebtScore: 55,
                cloudReadinessScore: 55,
                upgradeImpactScore: 50,
                compositeHealthScore: 50,
                project_ID: testProjectId
            },
            
            // Level D analyses (legacy, high tech debt)
            {
                ricefwId: 'E-1106-D1',
                objectType_typeCode: 'E',
                objectDescription: 'Legacy Enhancement',
                recommendedLevel_levelCode: 'D',
                technicalDebtScore: 85,
                cloudReadinessScore: 25,
                upgradeImpactScore: 90,
                compositeHealthScore: 20,
                project_ID: testProjectId
            },
            {
                ricefwId: 'W-1107-D2',
                objectType_typeCode: 'W',
                objectDescription: 'Custom Workflow',
                recommendedLevel_levelCode: 'D',
                technicalDebtScore: 90,
                cloudReadinessScore: 20,
                upgradeImpactScore: 85,
                compositeHealthScore: 18,
                project_ID: testProjectId
            }
        ];
        
        await INSERT.into(CleanCoreAnalysis).entries(testAnalyses);
    }

    describe('getAnalyticsData - Aggregated Metrics', () => {
        it('should calculate total analyses count', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            expect(result.aggregatedMetrics).toBeDefined();
            expect(result.aggregatedMetrics.totalAnalyses).toBeGreaterThanOrEqual(8);
        });

        it('should calculate average technical debt score', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            const avgTechDebt = result.aggregatedMetrics.averageTechnicalDebt;
            
            expect(avgTechDebt).toBeGreaterThan(0);
            expect(avgTechDebt).toBeLessThanOrEqual(100);
            
            // With our test data: (10+15+35+40+60+55+85+90)/8 = 48.75
            expect(avgTechDebt).toBeCloseTo(48.75, 1);
        });

        it('should calculate average cloud readiness score', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            const avgCloudReadiness = result.aggregatedMetrics.averageCloudReadiness;
            
            expect(avgCloudReadiness).toBeGreaterThan(0);
            expect(avgCloudReadiness).toBeLessThanOrEqual(100);
            
            // With our test data: (95+92+75+70+50+55+25+20)/8 = 60.25
            expect(avgCloudReadiness).toBeCloseTo(60.25, 1);
        });

        it('should calculate average upgrade impact score', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            const avgUpgradeImpact = result.aggregatedMetrics.averageUpgradeImpact;
            
            expect(avgUpgradeImpact).toBeGreaterThan(0);
            expect(avgUpgradeImpact).toBeLessThanOrEqual(100);
        });

        it('should calculate average composite health score', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            const avgCompositeHealth = result.aggregatedMetrics.averageCompositeHealth;
            
            expect(avgCompositeHealth).toBeGreaterThan(0);
            expect(avgCompositeHealth).toBeLessThanOrEqual(100);
        });
    });

    describe('getAnalyticsData - Distribution by Clean Core Level', () => {
        it('should group analyses by clean core level', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    groupBy: 'cleanCoreLevel'
                }
            });
            
            expect(result.distributionByLevel).toBeDefined();
            expect(result.distributionByLevel).toHaveLength(4); // A, B, C, D
            
            const levelA = result.distributionByLevel.find(d => d.level === 'A');
            const levelB = result.distributionByLevel.find(d => d.level === 'B');
            const levelC = result.distributionByLevel.find(d => d.level === 'C');
            const levelD = result.distributionByLevel.find(d => d.level === 'D');
            
            expect(levelA.count).toBe(2);
            expect(levelB.count).toBe(2);
            expect(levelC.count).toBe(2);
            expect(levelD.count).toBe(2);
        });

        it('should calculate average scores per clean core level', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    groupBy: 'cleanCoreLevel'
                }
            });
            
            const levelA = result.distributionByLevel.find(d => d.level === 'A');
            
            expect(levelA.averageTechnicalDebt).toBeCloseTo(12.5, 1); // (10+15)/2
            expect(levelA.averageCloudReadiness).toBeCloseTo(93.5, 1); // (95+92)/2
        });
    });

    describe('getAnalyticsData - Distribution by Object Type', () => {
        it('should group analyses by RICEFW object type', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    groupBy: 'objectType'
                }
            });
            
            expect(result.distributionByObjectType).toBeDefined();
            
            const reports = result.distributionByObjectType.find(d => d.objectType === 'R');
            const interfaces = result.distributionByObjectType.find(d => d.objectType === 'I');
            const enhancements = result.distributionByObjectType.find(d => d.objectType === 'E');
            
            expect(reports.count).toBe(1);
            expect(interfaces.count).toBe(1);
            expect(enhancements.count).toBeGreaterThanOrEqual(3);
        });

        it('should calculate percentage distribution by object type', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    groupBy: 'objectType'
                }
            });
            
            const totalCount = result.aggregatedMetrics.totalAnalyses;
            
            result.distributionByObjectType.forEach(dist => {
                expect(dist.percentage).toBeCloseTo((dist.count / totalCount) * 100, 1);
            });
        });
    });

    describe('getAnalyticsData - Filtering', () => {
        it('should filter by date range', async () => {
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
            
            expect(result.aggregatedMetrics).toBeDefined();
            expect(result.aggregatedMetrics.totalAnalyses).toBeGreaterThanOrEqual(0);
        });

        it('should filter by specific object type', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    objectType: 'E' // Enhancements
                }
            });
            
            expect(result.aggregatedMetrics).toBeDefined();
            expect(result.aggregatedMetrics.totalAnalyses).toBeGreaterThanOrEqual(3);
            
            // All results should be for object type 'E'
            if (result.analysisDetails) {
                result.analysisDetails.forEach(analysis => {
                    expect(analysis.objectType).toBe('E');
                });
            }
        });

        it('should filter by clean core level', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    cleanCoreLevel: 'A'
                }
            });
            
            expect(result.aggregatedMetrics).toBeDefined();
            expect(result.aggregatedMetrics.totalAnalyses).toBe(2);
            
            // Averages should be for Level A only
            expect(result.aggregatedMetrics.averageTechnicalDebt).toBeCloseTo(12.5, 1);
            expect(result.aggregatedMetrics.averageCloudReadiness).toBeCloseTo(93.5, 1);
        });

        it('should filter by project ID', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    projectId: testProjectId
                }
            });
            
            expect(result.aggregatedMetrics).toBeDefined();
            expect(result.aggregatedMetrics.totalAnalyses).toBe(8);
        });

        it('should support combined filters', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    objectType: 'E',
                    cleanCoreLevel: 'C'
                }
            });
            
            expect(result.aggregatedMetrics).toBeDefined();
            expect(result.aggregatedMetrics.totalAnalyses).toBe(1); // Only E-1104-C1
        });
    });

    describe('getAnalyticsData - Trend Analysis', () => {
        it('should provide time-series data by month', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    groupBy: 'month',
                    startDate: new Date('2024-01-01').toISOString(),
                    endDate: new Date('2024-12-31').toISOString()
                }
            });
            
            expect(result.trendData).toBeDefined();
            expect(Array.isArray(result.trendData)).toBe(true);
            
            if (result.trendData.length > 0) {
                result.trendData.forEach(trend => {
                    expect(trend.period).toBeDefined();
                    expect(trend.count).toBeGreaterThanOrEqual(0);
                    expect(trend.averageCompositeHealth).toBeDefined();
                });
            }
        });

        it('should provide time-series data by quarter', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    groupBy: 'quarter',
                    startDate: new Date('2024-01-01').toISOString(),
                    endDate: new Date('2024-12-31').toISOString()
                }
            });
            
            expect(result.trendData).toBeDefined();
            expect(Array.isArray(result.trendData)).toBe(true);
        });
    });

    describe('getAnalyticsData - Performance Metrics', () => {
        it('should return health score distribution', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            expect(result.healthDistribution).toBeDefined();
            
            const excellent = result.healthDistribution.excellent; // 80-100
            const good = result.healthDistribution.good; // 60-79
            const moderate = result.healthDistribution.moderate; // 40-59
            const poor = result.healthDistribution.poor; // 0-39
            
            expect(excellent + good + moderate + poor).toBe(result.aggregatedMetrics.totalAnalyses);
        });

        it('should identify high-risk analyses (low composite health)', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    healthThreshold: 30 // Composite health < 30
                }
            });
            
            expect(result.highRiskAnalyses).toBeDefined();
            expect(result.highRiskAnalyses.length).toBeGreaterThanOrEqual(2); // Level D analyses
            
            result.highRiskAnalyses.forEach(analysis => {
                expect(analysis.compositeHealthScore).toBeLessThan(30);
            });
        });
    });

    describe('getAnalyticsData - Top/Bottom Rankings', () => {
        it('should return top 5 analyses by composite health', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    includeTopAnalyses: true,
                    topCount: 5
                }
            });
            
            expect(result.topAnalyses).toBeDefined();
            expect(result.topAnalyses.length).toBeLessThanOrEqual(5);
            
            // Should be sorted descending by composite health
            for (let i = 0; i < result.topAnalyses.length - 1; i++) {
                expect(result.topAnalyses[i].compositeHealthScore)
                    .toBeGreaterThanOrEqual(result.topAnalyses[i + 1].compositeHealthScore);
            }
        });

        it('should return bottom 5 analyses (highest tech debt)', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    includeBottomAnalyses: true,
                    bottomCount: 5
                }
            });
            
            expect(result.bottomAnalyses).toBeDefined();
            expect(result.bottomAnalyses.length).toBeLessThanOrEqual(5);
            
            // Should be sorted ascending by composite health (worst first)
            for (let i = 0; i < result.bottomAnalyses.length - 1; i++) {
                expect(result.bottomAnalyses[i].compositeHealthScore)
                    .toBeLessThanOrEqual(result.bottomAnalyses[i + 1].compositeHealthScore);
            }
        });
    });

    describe('getAnalyticsData - Compliance Reporting', () => {
        it('should aggregate by compliance requirements', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    groupBy: 'compliance'
                }
            });
            
            expect(result).toBeDefined();
        });
    });

    describe('getAnalyticsData - Export Formats', () => {
        it('should support JSON format (default)', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {
                    format: 'json'
                }
            });
            
            expect(typeof result).toBe('object');
            expect(result.aggregatedMetrics).toBeDefined();
        });

        it('should validate response structure', async () => {
            const result = await service.send({
                method: 'POST',
                path: '/getAnalyticsData',
                data: {}
            });
            
            // Validate complete response structure
            expect(result).toMatchObject({
                aggregatedMetrics: {
                    totalAnalyses: expect.any(Number),
                    averageTechnicalDebt: expect.any(Number),
                    averageCloudReadiness: expect.any(Number),
                    averageUpgradeImpact: expect.any(Number),
                    averageCompositeHealth: expect.any(Number)
                },
                distributionByLevel: expect.any(Array),
                distributionByObjectType: expect.any(Array),
                healthDistribution: expect.any(Object)
            });
        });
    });
});
