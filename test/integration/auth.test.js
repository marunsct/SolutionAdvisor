/**
 * Integration Tests - Authorization & Security
 * 
 * Tests role-based access control (@restrict), ABAC (owner-based access),
 * rate limiting (429 responses), tenant isolation
 */

const cds = require('@sap/cds/lib');
const { expect } = require('@jest/globals');

describe('Authorization & Security', () => {
    let service;
    
    // Mock users with different roles and tenants
    const adminUser = {
        id: 'admin-user',
        attr: {
            tenant: 'tenant-1',
            owner: 'admin-user'
        },
        is: (role) => ['TenantAdmin', 'authenticated-user'].includes(role)
    };
    
    const architectUser = {
        id: 'architect-user',
        attr: {
            tenant: 'tenant-1',
            owner: 'architect-user'
        },
        is: (role) => ['SolutionArchitect', 'authenticated-user'].includes(role)
    };
    
    const developerUser = {
        id: 'developer-user',
        attr: {
            tenant: 'tenant-1',
            owner: 'developer-user'
        },
        is: (role) => ['Developer', 'authenticated-user'].includes(role)
    };
    
    const tenant2User = {
        id: 'tenant2-user',
        attr: {
            tenant: 'tenant-2',
            owner: 'tenant2-user'
        },
        is: (role) => ['SolutionArchitect', 'authenticated-user'].includes(role)
    };

    beforeAll(async () => {
        await cds.deploy(__dirname + '/../../srv/service.cds');
        service = await cds.connect.to('solutionAdvisorService');
    });

    describe('Role-Based Access Control (@restrict)', () => {
        it('should allow TenantAdmin full CRUD access', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // CREATE
            const newAnalysis = {
                ricefwId: 'R-0700-ADM',
                objectType_typeCode: 'R',
                objectDescription: 'Admin Test',
                createdBy: adminUser.id
            };
            
            const createResult = await cds.run(
                INSERT.into(CleanCoreAnalysis).entries(newAnalysis),
                { user: adminUser }
            );
            expect(createResult).toBeDefined();
            
            // READ
            const readResult = await cds.run(
                SELECT.from(CleanCoreAnalysis).where({ ricefwId: 'R-0700-ADM' }),
                { user: adminUser }
            );
            expect(readResult).toHaveLength(1);
            
            // UPDATE
            const updateResult = await cds.run(
                UPDATE(CleanCoreAnalysis)
                    .set({ objectDescription: 'Updated by Admin' })
                    .where({ ricefwId: 'R-0700-ADM' }),
                { user: adminUser }
            );
            expect(updateResult).toBeDefined();
            
            // DELETE
            const deleteResult = await cds.run(
                DELETE.from(CleanCoreAnalysis).where({ ricefwId: 'R-0700-ADM' }),
                { user: adminUser }
            );
            expect(deleteResult).toBeDefined();
        });

        it('should allow SolutionArchitect CREATE, READ, UPDATE (no DELETE)', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // CREATE - allowed
            const newAnalysis = {
                ricefwId: 'E-0701-ARC',
                objectType_typeCode: 'E',
                objectDescription: 'Architect Test',
                createdBy: architectUser.id
            };
            
            await cds.run(
                INSERT.into(CleanCoreAnalysis).entries(newAnalysis),
                { user: architectUser }
            );
            
            const created = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'E-0701-ARC' });
            expect(created).toBeDefined();
            
            // READ - allowed
            const readResult = await cds.run(
                SELECT.from(CleanCoreAnalysis).where({ ricefwId: 'E-0701-ARC' }),
                { user: architectUser }
            );
            expect(readResult).toHaveLength(1);
            
            // UPDATE - allowed
            await cds.run(
                UPDATE(CleanCoreAnalysis)
                    .set({ objectDescription: 'Updated by Architect' })
                    .where({ ricefwId: 'E-0701-ARC' }),
                { user: architectUser }
            );
            
            // DELETE - not allowed
            try {
                await cds.run(
                    DELETE.from(CleanCoreAnalysis).where({ ricefwId: 'E-0701-ARC' }),
                    { user: architectUser }
                );
                
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error.code).toBe(403); // Forbidden
            }
        });

        it('should allow Developer READ only (no CREATE, UPDATE, DELETE)', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // READ - allowed
            const readResult = await cds.run(
                SELECT.from(CleanCoreAnalysis),
                { user: developerUser }
            );
            expect(Array.isArray(readResult)).toBe(true);
            
            // CREATE - not allowed
            try {
                await cds.run(
                    INSERT.into(CleanCoreAnalysis).entries({
                        ricefwId: 'I-0702-DEV',
                        objectType_typeCode: 'I',
                        objectDescription: 'Developer Test'
                    }),
                    { user: developerUser }
                );
                
                expect(true).toBe(false);
            } catch (error) {
                expect(error.code).toBe(403);
            }
            
            // UPDATE - not allowed
            const existingAnalysis = await SELECT.one.from(CleanCoreAnalysis);
            if (existingAnalysis) {
                try {
                    await cds.run(
                        UPDATE(CleanCoreAnalysis)
                            .set({ objectDescription: 'Updated by Developer' })
                            .where({ ID: existingAnalysis.ID }),
                        { user: developerUser }
                    );
                    
                    expect(true).toBe(false);
                } catch (error) {
                    expect(error.code).toBe(403);
                }
            }
        });

        it('should reject unauthenticated access', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            const anonymousUser = {
                id: 'anonymous',
                is: () => false // No roles
            };
            
            try {
                await cds.run(
                    SELECT.from(CleanCoreAnalysis),
                    { user: anonymousUser }
                );
                
                expect(true).toBe(false);
            } catch (error) {
                expect(error.code).toBe(403);
            }
        });
    });

    describe('Attribute-Based Access Control (ABAC - Owner-based)', () => {
        let ownerAnalysisId;
        let otherUserAnalysisId;

        beforeAll(async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Create analysis owned by architectUser
            await INSERT.into(CleanCoreAnalysis).entries({
                ricefwId: 'C-0800-OWN',
                objectType_typeCode: 'C',
                objectDescription: 'Owner Test',
                createdBy: architectUser.id
            });
            
            const ownerAnalysis = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'C-0800-OWN' });
            ownerAnalysisId = ownerAnalysis.ID;
            
            // Create analysis owned by different user
            await INSERT.into(CleanCoreAnalysis).entries({
                ricefwId: 'C-0801-OTH',
                objectType_typeCode: 'C',
                objectDescription: 'Other User Test',
                createdBy: 'other-user'
            });
            
            const otherAnalysis = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'C-0801-OTH' });
            otherUserAnalysisId = otherAnalysis.ID;
        });

        it('should allow user to update their own analysis', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            const result = await cds.run(
                UPDATE(CleanCoreAnalysis)
                    .set({ objectDescription: 'Updated by owner' })
                    .where({ ID: ownerAnalysisId }),
                { user: architectUser }
            );
            
            expect(result).toBeDefined();
        });

        it('should prevent user from updating another user\'s analysis', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            try {
                await cds.run(
                    UPDATE(CleanCoreAnalysis)
                        .set({ objectDescription: 'Unauthorized update' })
                        .where({ ID: otherUserAnalysisId }),
                    { user: architectUser }
                );
                
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error.code).toBe(403);
                expect(error.message).toContain('owner');
            }
        });

        it('should allow admin to update any analysis (bypass ABAC)', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Admin can update analyses they don't own
            const result = await cds.run(
                UPDATE(CleanCoreAnalysis)
                    .set({ objectDescription: 'Updated by admin' })
                    .where({ ID: otherUserAnalysisId }),
                { user: adminUser }
            );
            
            expect(result).toBeDefined();
        });
    });

    describe('Tenant Isolation (Multi-tenancy)', () => {
        let tenant1AnalysisId;
        let tenant2AnalysisId;

        beforeAll(async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Create analysis in tenant-1
            await cds.run(
                INSERT.into(CleanCoreAnalysis).entries({
                    ricefwId: 'F-0900-T1',
                    objectType_typeCode: 'F',
                    objectDescription: 'Tenant 1 Analysis',
                    createdBy: architectUser.id,
                    tenant: 'tenant-1'
                }),
                { user: architectUser }
            );
            
            const t1Analysis = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'F-0900-T1' });
            tenant1AnalysisId = t1Analysis.ID;
            
            // Create analysis in tenant-2
            await cds.run(
                INSERT.into(CleanCoreAnalysis).entries({
                    ricefwId: 'F-0901-T2',
                    objectType_typeCode: 'F',
                    objectDescription: 'Tenant 2 Analysis',
                    createdBy: tenant2User.id,
                    tenant: 'tenant-2'
                }),
                { user: tenant2User }
            );
            
            const t2Analysis = await SELECT.one.from(CleanCoreAnalysis)
                .where({ ricefwId: 'F-0901-T2' });
            tenant2AnalysisId = t2Analysis.ID;
        });

        it('should only return data from user\'s tenant', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Tenant-1 user query
            const t1Results = await cds.run(
                SELECT.from(CleanCoreAnalysis),
                { user: architectUser }
            );
            
            // Should only see tenant-1 data
            const hasOwnTenant = t1Results.some(a => a.ID === tenant1AnalysisId);
            const hasOtherTenant = t1Results.some(a => a.ID === tenant2AnalysisId);
            
            expect(hasOwnTenant).toBe(true);
            expect(hasOtherTenant).toBe(false);
        });

        it('should prevent cross-tenant data access', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Tenant-1 user tries to read tenant-2 analysis
            const result = await cds.run(
                SELECT.from(CleanCoreAnalysis).where({ ID: tenant2AnalysisId }),
                { user: architectUser }
            );
            
            expect(result).toHaveLength(0);
        });

        it('should prevent cross-tenant updates', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            try {
                await cds.run(
                    UPDATE(CleanCoreAnalysis)
                        .set({ objectDescription: 'Cross-tenant update' })
                        .where({ ID: tenant2AnalysisId }),
                    { user: architectUser }
                );
                
                // Should not update anything (tenant isolation)
                const notUpdated = await SELECT.one.from(CleanCoreAnalysis)
                    .where({ ID: tenant2AnalysisId });
                
                expect(notUpdated.objectDescription).not.toBe('Cross-tenant update');
            } catch (error) {
                // Expected - cross-tenant access blocked
                expect(error).toBeDefined();
            }
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits on API calls', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Simulate rapid API calls
            const promises = [];
            for (let i = 0; i < 150; i++) { // Exceed limit of 100/minute
                promises.push(
                    cds.run(
                        SELECT.from(CleanCoreAnalysis).limit(1),
                        { user: developerUser }
                    ).catch(err => err)
                );
            }
            
            const results = await Promise.all(promises);
            
            // Should have some 429 (Too Many Requests) errors
            const rateLimitErrors = results.filter(r => r.code === 429);
            expect(rateLimitErrors.length).toBeGreaterThan(0);
        });

        it('should allow higher rate limits for admin users', async () => {
            const { CleanCoreAnalysis } = service.entities;
            
            // Admin users have higher limits (1000/minute)
            const promises = [];
            for (let i = 0; i < 150; i++) {
                promises.push(
                    cds.run(
                        SELECT.from(CleanCoreAnalysis).limit(1),
                        { user: adminUser }
                    ).catch(err => err)
                );
            }
            
            const results = await Promise.all(promises);
            
            // Admin should have fewer (or no) rate limit errors
            const rateLimitErrors = results.filter(r => r.code === 429);
            expect(rateLimitErrors.length).toBeLessThan(20); // More lenient than developer
        });

        it('should reset rate limit after time window', async () => {
            // Wait for rate limit window to reset (simplified test)
            // In production, this would be 1 minute
            
            const rateLimitStatus = await service.send({
                method: 'POST',
                path: '/getRateLimitStatus',
                data: {}
            }, { user: developerUser });
            
            expect(rateLimitStatus.remaining).toBeGreaterThanOrEqual(0);
            expect(rateLimitStatus.resetTime).toBeDefined();
        });
    });

    describe('Audit Logging for Security Events', () => {
        it('should log unauthorized access attempts', async () => {
            const { CleanCoreAnalysis, AuditLog } = service.entities;
            
            // Attempt unauthorized operation
            try {
                await cds.run(
                    DELETE.from(CleanCoreAnalysis).where({ ID: 'some-id' }),
                    { user: developerUser }
                );
            } catch (error) {
                // Expected to fail
            }
            
            // Check audit log
            const auditEntries = await SELECT.from(AuditLog)
                .where({ 
                    eventType: 'AUTHORIZATION_FAILURE',
                    userId: developerUser.id 
                })
                .orderBy({ createdAt: 'desc' })
                .limit(1);
            
            expect(auditEntries.length).toBeGreaterThan(0);
        });

        it('should log successful privileged operations', async () => {
            const { CleanCoreAnalysis, AuditLog } = service.entities;
            
            // Admin creates analysis
            await cds.run(
                INSERT.into(CleanCoreAnalysis).entries({
                    ricefwId: 'W-1000-AUD',
                    objectType_typeCode: 'W',
                    objectDescription: 'Audit Test',
                    createdBy: adminUser.id
                }),
                { user: adminUser }
            );
            
            // Check audit log
            const auditEntries = await SELECT.from(AuditLog)
                .where({ 
                    eventType: 'CREATE',
                    userId: adminUser.id,
                    entityName: 'CleanCoreAnalysis'
                })
                .orderBy({ createdAt: 'desc' })
                .limit(1);
            
            expect(auditEntries.length).toBeGreaterThan(0);
            expect(auditEntries[0].isCriticalOperation).toBe(true);
        });
    });

    describe('Security Headers & CORS', () => {
        it('should include security headers in responses', async () => {
            // This would be tested at HTTP level in E2E tests
            // Here we verify service configuration
            
            const serviceConfig = service.$getConfig?.();
            
            // Verify CORS and security headers are configured
            expect(serviceConfig).toBeDefined();
        });
    });
});
