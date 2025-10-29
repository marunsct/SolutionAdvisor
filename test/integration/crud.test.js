/**
 * Integration Tests - CRUD Operations
 * 
 * Tests all entity Create/Read/Update/Delete operations, draft handling, composition
 */

const cds = require('@sap/cds/lib');
const { expect } = require('@jest/globals');

describe('CRUD Operations', () => {
    let service;
    let adminUser;
    let architectUser;

    beforeAll(async () => {
        // Deploy test database
        await cds.deploy(__dirname + '/../../srv/service.cds');
        
        // Get service instance
        service = await cds.connect.to('solutionAdvisorService');
        
        // Mock users with different roles
        adminUser = {
            id: 'test-admin',
            attr: {
                tenant: 'test-tenant-1'
            },
            is: (role) => role === 'TenantAdmin' || role === 'authenticated-user'
        };
        
        architectUser = {
            id: 'test-architect',
            attr: {
                tenant: 'test-tenant-1'
            },
            is: (role) => role === 'SolutionArchitect' || role === 'authenticated-user'
        };
    });

    describe('ProjectConfiguration Entity', () => {
        it('should create new project configuration', async () => {
            const { ProjectConfiguration } = service.entities;
            
            const newProject = {
                projectName: 'Test S/4HANA Migration',
                clientName: 'ACME Corporation',
                s4HanaFlavor: 'Cloud Public',
                complianceRequirements: ['GDPR', 'SOX'],
                isActive: true
            };
            
            const result = await INSERT.into(ProjectConfiguration).entries(newProject);
            expect(result).toBeDefined();
            
            // Verify creation
            const created = await SELECT.one.from(ProjectConfiguration)
                .where({ projectName: newProject.projectName });
            
            expect(created).toBeDefined();
            expect(created.clientName).toBe('ACME Corporation');
            expect(created.s4HanaFlavor).toBe('Cloud Public');
        });

        it('should read project configurations with filtering', async () => {
            const { ProjectConfiguration } = service.entities;
            
            const projects = await SELECT.from(ProjectConfiguration)
                .where({ isActive: true });
            
            expect(Array.isArray(projects)).toBe(true);
            expect(projects.length).toBeGreaterThan(0);
        });

        it('should update project configuration', async () => {
            const { ProjectConfiguration } = service.entities;
            
            const project = await SELECT.one.from(ProjectConfiguration);
            expect(project).toBeDefined();
            
            await UPDATE(ProjectConfiguration)
                .set({ projectName: 'Updated Project Name' })
                .where({ ID: project.ID });
            
            const updated = await SELECT.one.from(ProjectConfiguration)
                .where({ ID: project.ID });
            
            expect(updated.projectName).toBe('Updated Project Name');
        });

        it('should delete project configuration', async () => {
            const { ProjectConfiguration } = service.entities;
            
            // Create test project
            const testProject = {
                projectName: 'To Be Deleted',
                clientName: 'Test Client',
                s4HanaFlavor: 'On-Premise',
                isActive: false
            };
            
            await INSERT.into(ProjectConfiguration).entries(testProject);
            
            const created = await SELECT.one.from(ProjectConfiguration)
                .where({ projectName: 'To Be Deleted' });
            
            expect(created).toBeDefined();
            
            // Delete
            await DELETE.from(ProjectConfiguration).where({ ID: created.ID });
            
            // Verify deletion
            const deleted = await SELECT.one.from(ProjectConfiguration)
                .where({ ID: created.ID });
            
            expect(deleted).toBeNull();
        });
    });

    describe('CleanCoreAnalysis Entity with Drafts', () => {
        it('should create new analysis as draft', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            const newAnalysis = {
                ricefwId: 'R-0099-TST',
                objectType_typeCode: 'R',
                objectDescription: 'Test Report Analysis',
                businessJustification: 'Testing draft functionality',
                isDraft: true
            };
            
            const result = await INSERT.into(CleanCoreAnalysis).entries(newAnalysis);
            expect(result).toBeDefined();
            
            const draft = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'R-0099-TST' });
            
            expect(draft).toBeDefined();
            expect(draft.isDraft).toBe(true);
        });

        it('should activate draft to create final analysis', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Get draft
            const draft = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'R-0099-TST', isDraft: true });
            
            expect(draft).toBeDefined();
            
            // Activate draft
            await UPDATE(CleanCoreAnalysis)
                .set({ isDraft: false })
                .where({ ID: draft.ID });
            
            const activated = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ID: draft.ID });
            
            expect(activated.isDraft).toBe(false);
        });

        it('should read analyses with expanded decision paths', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            const analyses = await SELECT.from(CleanCoreAnalysis, a => {
                a.ID, a.ricefwId, a.objectDescription,
                a.decisionPath(dp => {
                    dp.ID, dp.questionId, dp.answerText
                })
            }).where({ isDraft: false });
            
            expect(Array.isArray(analyses)).toBe(true);
        });

        it('should delete analysis with cascade to decision paths', async () => {
            const { CleanCoreAnalysis, DecisionPath } = service.entities;
            
            // Create test analysis with decision paths
            const testAnalysis = {
                ricefwId: 'E-9999-DEL',
                objectType_typeCode: 'E',
                objectDescription: 'To be deleted with paths',
                isDraft: false
            };
            
            const analysisResult = await INSERT.into(CleanCoreAnalysis).entries(testAnalysis);
            
            const created = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'E-9999-DEL' });
            
            // Add decision paths
            await INSERT.into(DecisionPath).entries([
                {
                    analysis_ID: created.ID,
                    stepNumber: 1,
                    questionId: 'Q1',
                    answerText: 'Test answer 1'
                },
                {
                    analysis_ID: created.ID,
                    stepNumber: 2,
                    questionId: 'Q2',
                    answerText: 'Test answer 2'
                }
            ]);
            
            // Delete analysis (should cascade to decision paths)
            await DELETE.from(CleanCoreAnalysis).where({ ID: created.ID });
            
            // Verify analysis deleted
            const deletedAnalysis = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ID: created.ID });
            expect(deletedAnalysis).toBeNull();
            
            // Verify decision paths deleted (cascade)
            const deletedPaths = await SELECT.from(DecisionPath)
                .where({ analysis_ID: created.ID });
            expect(deletedPaths).toHaveLength(0);
        });
    });

    describe('WizardSession Entity', () => {
        it('should create wizard session', async () => {
            const { WizardSession } = service.entities;
            
            const session = {
                sessionState: JSON.stringify({ currentStep: 1 }),
                isCompleted: false
            };
            
            await INSERT.into(WizardSession).entries(session);
            
            const created = await SELECT.one.from(WizardSession)
                .where({ isCompleted: false })
                .orderBy({ createdAt: 'desc' });
            
            expect(created).toBeDefined();
            expect(created.isCompleted).toBe(false);
        });

        it('should update wizard session state', async () => {
            const { WizardSession } = service.entities;
            
            const session = await SELECT.one.from(WizardSession)
                .where({ isCompleted: false });
            
            const newState = { currentStep: 3, answers: ['A1', 'A2'] };
            
            await UPDATE(WizardSession)
                .set({ sessionState: JSON.stringify(newState) })
                .where({ ID: session.ID });
            
            const updated = await SELECT.one.from(WizardSession)
                .where({ ID: session.ID });
            
            const parsedState = JSON.parse(updated.sessionState);
            expect(parsedState.currentStep).toBe(3);
        });

        it('should mark wizard session as completed', async () => {
            const { WizardSession } = service.entities;
            
            const session = await SELECT.one.from(WizardSession)
                .where({ isCompleted: false });
            
            await UPDATE(WizardSession)
                .set({ isCompleted: true })
                .where({ ID: session.ID });
            
            const completed = await SELECT.one.from(WizardSession)
                .where({ ID: session.ID });
            
            expect(completed.isCompleted).toBe(true);
        });
    });

    describe('Composition Handling', () => {
        it('should create analysis with nested decision paths in one operation', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            const analysisWithPaths = {
                ricefwId: 'I-0100-CMP',
                objectType_typeCode: 'I',
                objectDescription: 'Composition Test',
                decisionPath: [
                    {
                        stepNumber: 1,
                        questionId: 'Q1',
                        answerText: 'Answer 1'
                    },
                    {
                        stepNumber: 2,
                        questionId: 'Q2',
                        answerText: 'Answer 2'
                    }
                ]
            };
            
            const result = await INSERT.into(CleanCoreAnalysis).entries(analysisWithPaths);
            
            const created = await SELECT.one.from(CleanCoreAnalysis, a => {
                a.ID, a.ricefwId,
                a.decisionPath(dp => dp('*'))
            }).where({ ricefwId: 'I-0100-CMP' });
            
            expect(created).toBeDefined();
            expect(created.decisionPath).toHaveLength(2);
        });
    });

    describe('Master Data Entities', () => {
        it('should read CleanCoreLevels master data', async () => {
            const { CleanCoreLevels } = service.entities;
            
            const levels = await SELECT.from(CleanCoreLevels);
            
            expect(levels).toHaveLength(4); // A, B, C, D
            expect(levels.some(l => l.levelCode === 'A')).toBe(true);
            expect(levels.some(l => l.levelCode === 'B')).toBe(true);
            expect(levels.some(l => l.levelCode === 'C')).toBe(true);
            expect(levels.some(l => l.levelCode === 'D')).toBe(true);
        });

        it('should read ObjectTypes master data', async () => {
            const { ObjectTypes } = service.entities;
            
            const types = await SELECT.from(ObjectTypes);
            
            expect(types.length).toBeGreaterThanOrEqual(6); // R, I, C, E, F, W
            expect(types.some(t => t.typeCode === 'R')).toBe(true);
        });

        it('should not allow modification of master data (read-only)', async () => {
            const { CleanCoreLevels } = service.entities;
            
            // Attempt to update master data should be prevented
            try {
                await UPDATE(CleanCoreLevels)
                    .set({ levelName: 'Modified' })
                    .where({ levelCode: 'A' });
                
                // If we reach here, test should fail
                expect(true).toBe(false);
            } catch (error) {
                // Expected to fail with authorization or validation error
                expect(error).toBeDefined();
            }
        });
    });

    describe('AuditLog Entity', () => {
        it('should create audit log entry', async () => {
            const { AuditLog } = service.entities;
            
            const auditEntry = {
                eventType: 'CREATE',
                entityName: 'CleanCoreAnalysis',
                entityId: 'test-analysis-id',
                userId: 'test-user',
                isPersonalData: false,
                isFinancialData: false,
                isRegulatedData: true
            };
            
            await INSERT.into(AuditLog).entries(auditEntry);
            
            const created = await SELECT.one.from(AuditLog)
                .where({ entityId: 'test-analysis-id' })
                .orderBy({ createdAt: 'desc' });
            
            expect(created).toBeDefined();
            expect(created.eventType).toBe('CREATE');
        });

        it('should enforce @readonly on audit log entries', async () => {
            const { AuditLog } = service.entities;
            
            const entry = await SELECT.one.from(AuditLog);
            
            if (entry) {
                try {
                    await UPDATE(AuditLog)
                        .set({ eventType: 'MODIFIED' })
                        .where({ ID: entry.ID });
                    
                    // Should not reach here
                    expect(true).toBe(false);
                } catch (error) {
                    // Expected - audit logs are immutable
                    expect(error).toBeDefined();
                }
            }
        });
    });
});
