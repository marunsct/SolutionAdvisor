/**
 * Admin Service Implementation
 * 
 * Provides custom logic and audit logging for admin master data maintenance
 * Delegates to admin-service-handlers for audit trail
 */

const cds = require('@sap/cds');
const LOG = cds.log('admin-service');
const adminHandlers = require('./lib/admin-service-handlers');
const sessionCleanupService = require('./lib/session-cleanup-service');
const TenantContext = require('./lib/tenant-context');

module.exports = cds.service.impl(async function () {
    LOG.info('Initializing Admin Service...');

    // Register audit logging handlers
    await adminHandlers(this);

    // ===============================
    // Session Management Actions
    // ===============================

    /**
     * Cleanup Expired Sessions action handler
     * Triggered manually by admin or via scheduled job
     */
    this.on('cleanupExpiredSessions', async (req) => {
        const { dryRun = false } = req.data;

        try {
            // Enforce explicit tenant scope for cleanup operations
            const tenant = TenantContext.getTenant(req, true);

            LOG.info(`Admin cleanup request: dryRun=${dryRun}, tenant=${tenant}`);

            // Execute cleanup for this tenant
            const result = await sessionCleanupService.cleanupExpiredSessions({
                dryRun: dryRun,
                tenantFilter: tenant
            });

            return {
                success: true,
                cleaned: result.cleaned,
                expired: result.expired,
                errors: result.errors,
                durationMs: result.durationMs,
                message: `Cleanup complete: ${result.cleaned} sessions cleaned, ${result.errors} errors`
            };
        } catch (error) {
            LOG.error('Cleanup failed', { error: error.message });
            return {
                success: false,
                cleaned: 0,
                expired: 0,
                errors: 1,
                durationMs: 0,
                message: `Cleanup failed: ${error.message}`
            };
        }
    });

    // Add any custom actions or validations here in the future
    // For example:
    // this.on('rebuildQuestionFlowIndexes', async (req) => { ... });

    /**
     * Validate QuestionFlow navigation logic
     * Ensures JSON navigation rules are valid and all referenced questions exist
     */
    this.on('validateQuestionFlowLogic', async (req) => {
        const { questionFlowId } = req.data;
        const errors = [];
        const warnings = [];
        const referencedQuestions = [];

        try {
            const { QuestionFlow } = cds.entities('sd');
            const tenant = TenantContext.getTenant(req, true);

            // Load questions to validate — if an ID is given validate that single record,
            // otherwise validate all active questions for the tenant
            let questions;
            if (questionFlowId) {
                const single = await SELECT.one.from(QuestionFlow).where({ ID: questionFlowId });
                if (!single) {
                    return { isValid: false, errors: [`Question flow ${questionFlowId} not found`], warnings: [], referencedQuestions: [] };
                }
                questions = [single];
            } else {
                questions = await SELECT.from(QuestionFlow).where({
                    isActive: true,
                    or: [{ tenant: tenant }, { tenant: null }]
                });
            }

            // Build a lookup of all known questionIds per objectType
            const allQuestions = await SELECT.from(QuestionFlow).columns('questionId', 'objectType');
            const questionIdSet = new Set(allQuestions.map(q => `${q.objectType}::${q.questionId}`));

            for (const q of questions) {
                // Validate answerOptions JSON
                if (q.answerOptions) {
                    try {
                        JSON.parse(q.answerOptions);
                    } catch {
                        errors.push(`${q.questionId} (${q.objectType}): answerOptions is not valid JSON`);
                    }
                }

                // Validate navigationRules JSON and referenced questions
                if (q.navigationRules) {
                    let rules;
                    try {
                        rules = JSON.parse(q.navigationRules);
                    } catch {
                        errors.push(`${q.questionId} (${q.objectType}): navigationRules is not valid JSON`);
                        continue;
                    }

                    for (const [answerKey, rule] of Object.entries(rules)) {
                        if (rule.nextQuestion) {
                            const ref = `${q.objectType}::${rule.nextQuestion}`;
                            referencedQuestions.push(rule.nextQuestion);
                            if (!questionIdSet.has(ref)) {
                                errors.push(`${q.questionId} (${q.objectType}): answer "${answerKey}" references unknown question "${rule.nextQuestion}"`);
                            }
                        } else if (!rule.finalAnswer) {
                            warnings.push(`${q.questionId} (${q.objectType}): answer "${answerKey}" has neither nextQuestion nor finalAnswer`);
                        }
                    }
                } else {
                    warnings.push(`${q.questionId} (${q.objectType}): missing navigationRules`);
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                referencedQuestions: [...new Set(referencedQuestions)]
            };
        } catch (error) {
            LOG.error('Validation failed:', error);
            return { isValid: false, errors: [`Validation failed: ${error.message}`], warnings: [], referencedQuestions: [] };
        }
    });

    /**
     * Bulk import QuestionFlow from JSON
     */
    this.on('bulkImportQuestionFlow', async (req) => {
        const { data } = req.data;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return { success: false, importedCount: 0, errorCount: 0, errors: ['No data provided'] };
        }

        const tenant = TenantContext.getTenant(req, true);
        const importErrors = [];
        let importedCount = 0;

        try {
            const { QuestionFlow } = cds.entities('sd');

            for (const item of data) {
                try {
                    // Validate required fields
                    if (!item.questionId || !item.objectType || !item.questionText) {
                        importErrors.push(`Missing required fields for question: ${item.questionId || 'unknown'}`);
                        continue;
                    }

                    // Validate JSON fields
                    if (item.answerOptions) {
                        try { JSON.parse(item.answerOptions); } catch {
                            importErrors.push(`${item.questionId}: invalid answerOptions JSON`);
                            continue;
                        }
                    }
                    if (item.navigationRules) {
                        try { JSON.parse(item.navigationRules); } catch {
                            importErrors.push(`${item.questionId}: invalid navigationRules JSON`);
                            continue;
                        }
                    }

                    // Check if question already exists (by questionId + objectType + tenant)
                    const existing = await SELECT.one.from(QuestionFlow)
                        .where({ questionId: item.questionId, objectType: item.objectType, tenant: tenant });

                    if (existing) {
                        // Update existing
                        await UPDATE(QuestionFlow)
                            .set({
                                questionText: item.questionText,
                                questionHint: item.questionHint,
                                detailedHint: item.detailedHint,
                                answerCount: item.answerCount,
                                answerOptions: item.answerOptions,
                                navigationRules: item.navigationRules,
                                performanceContext: item.performanceContext,
                                displayOrder: item.displayOrder,
                                isActive: item.isActive !== undefined ? item.isActive : true
                            })
                            .where({ ID: existing.ID });
                    } else {
                        // Insert new
                        await INSERT.into(QuestionFlow).entries({
                            ID: item.ID || cds.utils.uuid(),
                            questionId: item.questionId,
                            objectType: item.objectType,
                            questionText: item.questionText,
                            questionHint: item.questionHint,
                            detailedHint: item.detailedHint,
                            answerCount: item.answerCount || 0,
                            answerOptions: item.answerOptions,
                            navigationRules: item.navigationRules,
                            performanceContext: item.performanceContext,
                            displayOrder: item.displayOrder || 0,
                            isActive: item.isActive !== undefined ? item.isActive : true,
                            tenant: tenant
                        });
                    }

                    importedCount++;
                } catch (itemError) {
                    importErrors.push(`${item.questionId || 'unknown'}: ${itemError.message}`);
                }
            }

            return {
                success: importErrors.length === 0,
                importedCount,
                errorCount: importErrors.length,
                errors: importErrors
            };
        } catch (error) {
            LOG.error('Bulk import failed:', error);
            return { success: false, importedCount, errorCount: importErrors.length + 1, errors: [...importErrors, `Import failed: ${error.message}`] };
        }
    });

    LOG.info('Admin Service initialized successfully');
});
