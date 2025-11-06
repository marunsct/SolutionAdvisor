const cds = require('@sap/cds');
const LOG = cds.log('solutionadvisor');
const DecisionEngine = require('./lib/decision-engine-consolidated');
const ScoringService = require('./lib/scoring-service');
const ConstraintsService = require('./lib/constraints-service');
const ExamplesService = require('./lib/examples-service');
const AnalyticsService = require('./lib/analytics-service');
const AuditService = require('./lib/audit-service');
const SecurityMiddleware = require('./lib/security-middleware');
const notificationService = require('./lib/notification-service');
const { rateLimiter } = require('./lib/rate-limiter');
const { batchOptimizer } = require('./lib/batch-optimizer');
const queryOptimizer = require('./lib/query-optimizer');
const cacheService = require('./lib/cache-service');

/**
 * Solution Advisor Service Implementation
 * 
 * This module implements the main CAP service for the SAP Clean Core Solution Advisor.
 * It provides custom actions for wizard-based decision flows, analytics, scoring,
 * and project management with multi-tenant support.
 * 
 * @module srv/service
 * @author SAP Clean Core Team
 * @version 1.0.0
 * 
 * @description
 * Core responsibilities:
 * - Wizard session management (start, resume, submit answers)
 * - Clean Core analysis and scoring calculations
 * - Project and user assignment management
 * - Analytics data aggregation
 * - Audit logging for compliance
 * - Tenant context enforcement
 * 
 * @requires @sap/cds
 * @requires ./lib/decision-engine-consolidated
 * @requires ./lib/scoring-service
 * @requires ./lib/constraints-service
 * @requires ./lib/examples-service
 * @requires ./lib/analytics-service
 * @requires ./lib/audit-service
 */

module.exports = cds.service.impl(async function () {
    const {
        Projects,
        Analyses,
        DecisionPaths,
        WizardSessions,
        QuestionFlows,
        ProjectUsers,
        Notifications
    } = this.entities;

    // Initialize service components
    const decisionEngine = new DecisionEngine(this);
    const scoringService = new ScoringService(this);
    const constraintsService = new ConstraintsService(this);
    const examplesService = new ExamplesService(this);
    const analyticsService = new AnalyticsService();
    const auditService = new AuditService();

    // Initialize audit service
    await auditService.init();

    // ===============================
    // Rate Limiting Enforcement
    // ===============================

    this.before('*', (req) => {
        // Apply rate limiting to all requests
        const result = rateLimiter.checkLimit(req);

        if (!result.allowed) {
            req.reject(429, result.reason || 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
        }
    });

    // ===============================
    // Tenant Context Enforcement
    // ===============================

    this.before('*', (req) => {
        // Add tenant context to all operations
        const tenant = req.user?.tenant || 'default';

        if (req.data && !req.data.tenant) {
            req.data.tenant = tenant;
        }

        // For queries, add tenant filter
        if (req.query && req.query.SELECT) {
            // This would be enhanced with proper tenant filtering in production
            req.tenant = tenant;
        }

        // Ensure i18n translator exists on request (req.t)
        if (typeof req.t !== 'function') {
            try {
                const i18n = cds.i18n(req);
                if (i18n && typeof i18n.t === 'function') {
                    req.t = i18n.t.bind(i18n);
                } else {
                    req.t = (key) => key; // graceful fallback
                }
            } catch {
                req.t = (key) => key; // graceful fallback
            }
        }
    });

    // ===============================
    // Query Optimization Interceptors
    // ===============================

    /**
     * Optimize READ queries for master data with caching
     */
    this.before('READ', 'CleanCoreLevels', async (req) => {
        const cacheKey = 'all';
        const cached = cacheService.get('CleanCoreLevels', cacheKey, 'master');

        if (cached) {
            LOG.debug('Returning cached CleanCoreLevels');
            req.results = cached;
            req.reject(200); // Skip database query
        }
    });

    this.after('READ', 'CleanCoreLevels', (results) => {
        if (results && results.length > 0) {
            cacheService.set('CleanCoreLevels', 'all', results, null, 'master');
        }
    });

    this.before('READ', 'ObjectTypes', async (req) => {
        const cached = cacheService.get('ObjectTypes', 'all', 'master');

        if (cached) {
            LOG.debug('Returning cached ObjectTypes');
            req.results = cached;
            req.reject(200);
        }
    });

    this.after('READ', 'ObjectTypes', (results) => {
        if (results && results.length > 0) {
            cacheService.set('ObjectTypes', 'all', results, null, 'master');
        }
    });

    this.before('READ', 'PerformanceThresholds', async (req) => {
        const cached = cacheService.get('PerformanceThreshold', 'all', 'master');

        if (cached) {
            LOG.debug('Returning cached PerformanceThresholds');
            req.results = cached;
            req.reject(200);
        }
    });

    this.after('READ', 'PerformanceThresholds', (results) => {
        if (results && results.length > 0) {
            cacheService.set('PerformanceThreshold', 'all', results, null, 'master');
        }
    });

    /**
     * Optimize READ queries for large entities
     */
    this.before('READ', 'Analyses', (req) => {
        const sel = req.query?.SELECT;
        if (!sel) return;

        // Do not override columns for either entity or collection reads; let CAP infer
        // Only enforce safe pagination defaults
        if (!sel.limit) {
            sel.limit = { rows: { val: 50 } };
            LOG.debug('Applied default pagination (50 rows) for Analyses');
        } else if (sel.limit?.rows?.val > 1000) {
            sel.limit.rows.val = 1000;
            LOG.warn('Page size capped at 1000 for Analyses');
        }
    });

    // ===============================
    // Attribute-Based Access Control (ABAC)
    // ===============================

    /**
     * ABAC for Analyses - Users can only edit their own analyses
     * Admins and TenantAdmins bypass this restriction
     */
    this.before(['UPDATE', 'DELETE'], 'Analyses', async (req) => {
        // Check if user has admin privileges
        const isAdmin = req.user.is('Admin') || req.user.is('TenantAdmin');

        if (isAdmin) {
            return; // Admins bypass ownership checks
        }

        // Get the analysis ID from request
        const analysisID = req.data.ID || req.params[0]?.ID;

        if (!analysisID) {
            return req.error(400, 'Analysis ID is required');
        }

        // Fetch the analysis to check ownership
        const analysis = await SELECT.one.from(Analyses).where({ ID: analysisID });

        if (!analysis) {
            return req.error(404, 'Analysis not found');
        }

        // Check if user is the owner (createdBy matches user ID)
        const currentUserId = req.user.id;

        if (analysis.createdBy !== currentUserId) {
            return req.error(403, 'You can only edit or delete your own analyses');
        }
    });

    /**
     * ABAC for Analyses READ - Filter results by ownership for non-admin users
     */
    this.before('READ', 'Analyses', async (req) => {
        // Check if user has admin/viewer privileges (can see all)
        const canViewAll = req.user.is('Admin') ||
            req.user.is('TenantAdmin') ||
            req.user.is('Viewer') ||
            req.user.is('ServiceProviderAdmin');

        if (canViewAll) {
            return; // No filtering needed
        }

        // For SolutionArchitect and Developer roles, filter by ownership
        const currentUserId = req.user.id;

        // Add ownership filter to the query using CQN array syntax
        if (req.query && req.query.SELECT) {
            const sel = req.query.SELECT;
            const own = [{ ref: ['createdBy'] }, '=', { val: currentUserId }];

            if (Array.isArray(sel.where) && sel.where.length > 0) {
                sel.where = ['(', ...sel.where, ')', 'and', ...own];
            } else if (sel.where) {
                // If where is not array (shouldn't happen), wrap it defensively
                sel.where = ['(', sel.where, ')', 'and', ...own];
            } else {
                sel.where = own;
            }
        }
    });

    /**
     * Auto-assign createdBy on CREATE
     */
    this.before('CREATE', 'Analyses', async (req) => {
        if (!req.data.createdBy) {
            req.data.createdBy = req.user.id;
        }
    });

    /**
     * ABAC for Projects - ProjectAdmin can only access assigned projects
     */
    this.before(['UPDATE', 'DELETE'], 'Projects', async (req) => {
        const isGlobalAdmin = req.user.is('Admin') || req.user.is('TenantAdmin');

        if (isGlobalAdmin) {
            return; // Global admins bypass project restrictions
        }

        const isProjectAdmin = req.user.is('ProjectAdmin');

        if (!isProjectAdmin) {
            return req.error(403, 'Insufficient permissions to modify projects');
        }

        // Get project ID
        const projectID = req.data.ID || req.params[0]?.ID;

        if (!projectID) {
            return req.error(400, 'Project ID is required');
        }

        // Check if user is assigned to this project via attributes
        const userProjectIds = req.user.attr.projectId || [];
        const allowedProjects = Array.isArray(userProjectIds) ? userProjectIds : [userProjectIds];

        if (!allowedProjects.includes(projectID)) {
            return req.error(403, 'You can only modify projects you are assigned to');
        }
    });

    // ===============================
    // Custom Action Handlers
    // ===============================

    /**
     * Start Wizard - Initialize a new wizard session
     * 
     * @async
     * @param {Object} req - CDS request object
     * @param {string} req.data.projectID - UUID of the project configuration
     * @param {string} req.data.ricefwId - RICEFW ID in format [RICEFYW]-[0-9]{4}-[A-Z]{3}
     * @param {string} req.data.objectType - Object type (R/I/C/E/F/W)
     * @param {string} req.data.objectName - Name of the object being analyzed
     * 
     * @returns {Object} Session initialization response
     * @returns {string} sessionID - Unique wizard session identifier
     * @returns {string} analysisID - Unique analysis record identifier
     * @returns {Object} firstQuestion - First question in the decision flow
     * 
     * @throws {400} Invalid RICEFW ID format
     * @throws {500} Failed to start wizard (database or logic error)
     * 
     * @description
     * Creates a new Clean Core analysis record and wizard session. Validates RICEFW ID
     * format, initializes session with 24-hour expiry, and returns the first question
     * from the decision tree based on object type. Logs audit trail for analysis creation.
     */
    this.on('startWizard', async (req) => {
        const { projectID, ricefwId, objectType, objectName } = req.data;
        const tenant = req.user?.tenant || 'default';

        try {
            // Validate RICEFW ID format
            const ricefwPattern = /^[RICEFYW]-[0-9]{4}-[A-Z]{3}$/;
            if (!ricefwPattern.test(ricefwId)) {
                return req.error(400, req.t('error.invalidRicefwId'));
            }

            // Create new analysis record
            const analysisID = cds.utils.uuid();
            const analysis = {
                ID: analysisID,
                projectConfig_ID: projectID,
                ricefwId: ricefwId,
                objectType: objectType,
                objectName: objectName,
                analysisDate: new Date().toISOString().split('T')[0],
                status: 'In Progress',
                tenant: tenant
            };

            await INSERT.into(Analyses).entries(analysis);

            // Audit log: Analysis created
            await auditService.logDataChange(req, 'CREATE', 'CleanCoreAnalysis', analysisID, null, analysis);

            // Create wizard session
            const sessionID = cds.utils.uuid();
            const totalSteps = await decisionEngine.getTotalSteps(objectType);

            const session = {
                ID: sessionID,
                analysis_ID: analysisID,
                currentStep: 1,
                totalSteps: totalSteps,
                sessionStatus: 'Active',
                lastActivity: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                startedBy: req.user?.id || 'anonymous',
                tenant: tenant,
                answeredPath: '[]'
            };

            await INSERT.into(WizardSessions).entries(session);

            // Get first question
            const firstQuestion = await decisionEngine.getFirstQuestion(objectType);

            // Update session with first question
            await UPDATE(WizardSessions)
                .set({ currentQuestionId: firstQuestion.questionId })
                .where({ ID: sessionID });

            return {
                sessionID: sessionID,
                analysisID: analysisID,
                firstQuestion: firstQuestion
            };
        } catch (error) {
            LOG.error('Error starting wizard:', error);
            return req.error(500, req.t('error.startWizardFailed', [error.message]));
        }
    });

    /**
     * Submit Answer - Process wizard answer and get next question
     * 
     * @async
     * @param {Object} req - CDS request object
     * @param {string} req.data.sessionID - Active wizard session UUID
     * @param {string} req.data.questionId - Current question identifier
     * @param {string} req.data.selectedAnswer - User's selected answer text
     * @param {number} [req.data.answerIndex] - Index of selected answer (0-based)
     * @param {string} [req.data.userComments] - Optional user notes/comments
     * @param {number} [req.data.timeSpent] - Time spent on question (seconds)
     * 
     * @returns {Object} Next step response
     * @returns {boolean} isComplete - Whether wizard is complete
     * @returns {Object} [nextQuestion] - Next question if not complete
     * @returns {string} [recommendation] - Final clean core level (A/B/C/D) if complete
     * @returns {string} [reasoning] - Justification for recommendation if complete
     * @returns {Object} [scores] - Calculated scores if complete
     * 
     * @throws {404} Wizard session not found
     * @throws {500} Failed to submit answer or calculate scores
     * 
     * @description
     * Records user's answer in decision path, determines next question using decision engine,
     * and calculates final scores when wizard completes. Updates analysis status to 'Completed'
     * and wizard session to 'Completed' upon finishing all questions.
     */
    this.on('submitAnswer', async (req) => {
        const {
            sessionID,
            questionId,
            selectedAnswer,
            answerIndex,
            userComments,
            timeSpent
        } = req.data;

        const tenant = req.user?.tenant || 'default';

        try {
            // Get session
            const session = await SELECT.one.from(WizardSessions)
                .where({ ID: sessionID, tenant: tenant });

            if (!session) {
                return req.error(404, req.t('error.wizardSessionNotFound'));
            }

            // Get question details
            const question = await SELECT.one.from(QuestionFlows)
                .where({ questionId: questionId });

            // Create decision path entry
            const decisionPathID = cds.utils.uuid();
            const decisionPath = {
                ID: decisionPathID,
                analysis_ID: session.analysis_ID,
                questionId: questionId,
                questionText: question.questionText,
                selectedAnswer: selectedAnswer,
                answerIndex: answerIndex || 0,
                userComments: userComments || '',
                timeSpentSeconds: timeSpent || 0,
                stepOrder: session.currentStep,
                answeredAt: new Date().toISOString(),
                answeredBy: req.user?.id || 'anonymous',
                tenant: tenant
            };

            await INSERT.into(DecisionPaths).entries(decisionPath);

            // Get analysis to determine object type
            const analysis = await SELECT.one.from(Analyses)
                .where({ ID: session.analysis_ID });

            // Get next question or completion
            const nextStep = await decisionEngine.getNextQuestion(
                questionId,
                selectedAnswer,
                analysis.objectType
            );

            // Update answered path
            const answeredPath = JSON.parse(session.answeredPath || '[]');
            answeredPath.push({
                questionId: questionId,
                questionText: question.questionText,
                selectedAnswer: selectedAnswer,
                answeredAt: new Date().toISOString(),
                timeSpent: timeSpent || 0
            });

            if (nextStep.isComplete) {
                // Wizard complete - update analysis with recommendation FIRST
                // Use direct CDS UPDATE (bypasses draft automatically for internal operations)
                await cds.update(Analyses)
                    .set({
                        finalRecommendation: nextStep.recommendation,
                        finalReasoning: nextStep.reasoning,
                        status: 'Completed'
                    })
                    .where({ ID: session.analysis_ID });

                // Now calculate scores (will read the updated finalRecommendation)
                const scores = await scoringService.calculateScores(session.analysis_ID);

                // Update analysis with calculated scores
                await cds.update(Analyses)
                    .set({
                        technicalDebtScore: scores.technicalDebt,
                        cloudReadinessScore: scores.cloudReadiness,
                        upgradeImpactScore: scores.upgradeImpact,
                        compositeHealthScore: scores.compositeHealth
                    })
                    .where({ ID: session.analysis_ID });

                // Update session
                await UPDATE(WizardSessions)
                    .set({
                        sessionStatus: 'Completed',
                        answeredPath: JSON.stringify(answeredPath),
                        lastActivity: new Date().toISOString()
                    })
                    .where({ ID: sessionID });

                // Send notifications for analysis completion and threshold violations
                try {
                    const analysisData = await SELECT.one.from(Analyses).where({ ID: session.analysis_ID });
                    const userData = {
                        id: req.user?.id || req.user?.email,
                        email: req.user?.id || req.user?.email || 'user@example.com',
                        name: req.user?.name || 'User',
                        tenant: req.user?.tenant || 'default',
                        preferences: { emailNotifications: true, pushNotifications: false }
                    };

                    // Send analysis complete notification
                    await notificationService.sendAnalysisCompleteNotification(analysisData, userData);

                    // Check for high technical debt (threshold: 80)
                    if (scores.technicalDebt >= 80) {
                        await notificationService.notifyHighTechnicalDebt(analysisData, userData);
                    }

                    // Check for low cloud readiness (threshold: 50%)
                    if (scores.cloudReadiness < 50) {
                        await notificationService.notifyLowCloudReadiness(analysisData, userData);
                    }

                    // Check for threshold violations and send alerts if needed
                    await notificationService.sendThresholdExceededNotification(analysisData, userData);
                } catch (notifError) {
                    // Log but don't fail the analysis completion
                    if (LOG && LOG.error) {
                        LOG.error('Failed to send notifications:', notifError);
                    }
                }

                return {
                    nextQuestion: null,
                    isComplete: true,
                    recommendation: nextStep.recommendation,
                    reasoning: nextStep.reasoning,
                    scores: scores
                };
            } else {
                // Continue wizard
                await UPDATE(WizardSessions)
                    .set({
                        currentStep: session.currentStep + 1,
                        currentQuestionId: nextStep.question.questionId,
                        answeredPath: JSON.stringify(answeredPath),
                        lastActivity: new Date().toISOString()
                    })
                    .where({ ID: sessionID });

                // Send session saved notification (fire-and-forget)
                try {
                    const sessionData = await SELECT.one.from(WizardSessions).where({ ID: sessionID });
                    const userData = {
                        id: req.user?.id || req.user?.email,
                        email: req.user?.id || req.user?.email || 'user@example.com',
                        tenant: req.user?.tenant || 'default'
                    };
                    notificationService.notifySessionSaved(sessionData, userData).catch(err =>
                        LOG.warn('Failed to send session saved notification:', err)
                    );
                } catch (err) {
                    LOG.warn('Error preparing session saved notification:', err);
                }

                return {
                    nextQuestion: nextStep.question,
                    isComplete: false,
                    recommendation: null,
                    reasoning: null,
                    scores: null
                };
            }
        } catch (error) {
            LOG.error('Error submitting answer:', error);
            return req.error(500, req.t('error.submitAnswerFailed', [error.message]));
        }
    });

    /**
     * Get Relevant Constraints
     */
    this.on('getRelevantConstraints', async (req) => {
        const { objectType, deploymentType, volumeLevel } = req.data;

        try {
            return await constraintsService.getRelevantConstraints(
                objectType,
                deploymentType,
                volumeLevel
            );
        } catch (error) {
            LOG.error('Error getting constraints:', error);
            return req.error(500, req.t('error.getConstraintsFailed', [error.message]));
        }
    });

    /**
     * Get Contextual Examples
     */
    this.on('getContextualExamples', async (req) => {
        const { objectType, scenario, keywords } = req.data;

        try {
            return await examplesService.getContextualExamples(
                objectType,
                scenario,
                keywords
            );
        } catch (error) {
            LOG.error('Error getting examples:', error);
            return req.error(500, req.t('error.getExamplesFailed', [error.message]));
        }
    });

    /**
     * Calculate Scores
     */
    this.on('calculateScores', async (req) => {
        const { analysisID } = req.data;

        try {
            return await scoringService.calculateScores(analysisID);
        } catch (error) {
            LOG.error('Error calculating scores:', error);
            return req.error(500, req.t('error.calculateScoresFailed', [error.message]));
        }
    });

    /**
     * Recalculate Scores - Update existing analysis with fresh scores
     */
    this.on('recalculateScores', async (req) => {
        const { analysisID } = req.data;
        const tenant = req.user?.tenant || 'default';

        try {
            // Verify analysis exists and has a final recommendation
            const analysis = await SELECT.one.from(Analyses)
                .where({ ID: analysisID, tenant: tenant });

            if (!analysis) {
                return req.error(404, req.t('error.analysisNotFound'));
            }

            if (!analysis.finalRecommendation) {
                return req.error(400, 'Cannot recalculate scores for incomplete analysis');
            }

            // Calculate fresh scores
            const scores = await scoringService.calculateScores(analysisID);

            // Update analysis with new scores (cds.update bypasses draft for internal operations)
            await cds.update(Analyses)
                .set({
                    technicalDebtScore: scores.technicalDebt,
                    cloudReadinessScore: scores.cloudReadiness,
                    upgradeImpactScore: scores.upgradeImpact,
                    compositeHealthScore: scores.compositeHealth
                })
                .where({ ID: analysisID, tenant: tenant });

            // Audit log the recalculation
            await auditService.logDataChange(
                req,
                'UPDATE',
                'CleanCoreAnalysis',
                analysisID,
                {
                    technicalDebtScore: analysis.technicalDebtScore,
                    cloudReadinessScore: analysis.cloudReadinessScore,
                    upgradeImpactScore: analysis.upgradeImpactScore,
                    compositeHealthScore: analysis.compositeHealthScore
                },
                scores
            );

            return {
                success: true,
                message: 'Scores recalculated successfully',
                technicalDebt: scores.technicalDebt,
                cloudReadiness: scores.cloudReadiness,
                upgradeImpact: scores.upgradeImpact,
                compositeHealth: scores.compositeHealth
            };
        } catch (error) {
            LOG.error('Error recalculating scores:', error);
            return req.error(500, req.t('error.recalculateScoresFailed', [error.message]));
        }
    });

    /**
     * Batch Recalculate Scores - Optimized batch processing for multiple analyses
     * 
     * @async
     * @param {Object} req - CDS request object
     * @param {Array<string>} req.data.analysisIDs - Array of analysis UUIDs to recalculate
     * 
     * @returns {Object} Batch processing results with success/failure counts
     * 
     * @description
     * Efficiently recalculates scoring metrics for multiple analyses using:
     * - Parallel score calculation (up to 5 concurrent operations)
     * - Batch database updates (100 records per batch)
     * - Error isolation (one failure doesn't stop entire batch)
     * - Detailed per-analysis results
     * 
     * Performance: ~50-100ms per analysis (vs ~200-300ms individual calls)
     */
    this.on('batchRecalculateScores', async (req) => {
        const { analysisIDs } = req.data;
        const tenant = req.user?.tenant || 'default';
        const startTime = Date.now();

        const results = {
            success: true,
            message: '',
            totalProcessed: analysisIDs.length,
            successCount: 0,
            failedCount: 0,
            durationMs: 0,
            results: []
        };

        try {
            LOG.info(`Batch recalculating scores for ${analysisIDs.length} analyses`);

            // Fetch all analyses in batch
            const analyses = await batchOptimizer.batchRead(
                Analyses,
                analysisIDs,
                { columns: ['ID', 'ricefwId', 'finalRecommendation', 'technicalDebtScore', 'cloudReadinessScore', 'upgradeImpactScore', 'compositeHealthScore'] }
            );

            // Create analysis map for quick lookup
            const analysisMap = new Map(analyses.map(a => [a.ID, a]));

            // Process each analysis with parallel execution
            const maxParallel = 5;
            for (let i = 0; i < analysisIDs.length; i += maxParallel) {
                const batch = analysisIDs.slice(i, i + maxParallel);

                const batchPromises = batch.map(async (analysisID) => {
                    const analysis = analysisMap.get(analysisID);

                    if (!analysis) {
                        return {
                            analysisID,
                            ricefwId: null,
                            success: false,
                            error: 'Analysis not found'
                        };
                    }

                    if (!analysis.finalRecommendation) {
                        return {
                            analysisID,
                            ricefwId: analysis.ricefwId,
                            success: false,
                            error: 'Cannot recalculate scores for incomplete analysis'
                        };
                    }

                    try {
                        // Calculate scores
                        const scores = await scoringService.calculateScores(analysisID);

                        return {
                            analysisID,
                            ricefwId: analysis.ricefwId,
                            success: true,
                            technicalDebt: scores.technicalDebt,
                            cloudReadiness: scores.cloudReadiness,
                            upgradeImpact: scores.upgradeImpact,
                            compositeHealth: scores.compositeHealth,
                            oldScores: {
                                technicalDebt: analysis.technicalDebtScore,
                                cloudReadiness: analysis.cloudReadinessScore,
                                upgradeImpact: analysis.upgradeImpactScore,
                                compositeHealth: analysis.compositeHealthScore
                            },
                            error: null
                        };
                    } catch (error) {
                        LOG.error(`Error recalculating scores for ${analysisID}:`, error);
                        return {
                            analysisID,
                            ricefwId: analysis.ricefwId,
                            success: false,
                            error: error.message
                        };
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);

                // Aggregate results
                batchResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        results.results.push(result.value);
                        if (result.value.success) {
                            results.successCount++;
                        } else {
                            results.failedCount++;
                        }
                    } else {
                        results.failedCount++;
                        results.results.push({
                            analysisID: null,
                            success: false,
                            error: result.reason.message
                        });
                    }
                });
            }

            // Batch update all successful analyses
            const updates = results.results
                .filter(r => r.success)
                .map(r => ({
                    where: { ID: r.analysisID, tenant },
                    set: {
                        technicalDebtScore: r.technicalDebt,
                        cloudReadinessScore: r.cloudReadiness,
                        upgradeImpactScore: r.upgradeImpact,
                        compositeHealthScore: r.compositeHealth
                    }
                }));

            if (updates.length > 0) {
                const updateResult = await batchOptimizer.batchUpdate(Analyses, updates);
                LOG.info(`Batch update completed: ${updateResult.updated} analyses updated`);
            }

            // Audit log batch operation (summary)
            await auditService.logDataChange(
                req,
                'BATCH_UPDATE',
                'CleanCoreAnalysis',
                'BATCH_OPERATION',
                null,
                {
                    totalProcessed: results.totalProcessed,
                    successCount: results.successCount,
                    failedCount: results.failedCount,
                    analysisIDs: analysisIDs.slice(0, 10) // Log first 10 IDs only
                }
            );

            results.durationMs = Date.now() - startTime;
            results.success = results.failedCount === 0;
            results.message = results.success
                ? `Successfully recalculated scores for ${results.successCount} analyses`
                : `Recalculated ${results.successCount} analyses, ${results.failedCount} failed`;

            LOG.info(`Batch recalculation completed: ${results.successCount} success, ${results.failedCount} failed in ${results.durationMs}ms`);

            return results;

        } catch (error) {
            LOG.error('Batch recalculation failed:', error);
            results.success = false;
            results.message = `Batch recalculation failed: ${error.message}`;
            results.durationMs = Date.now() - startTime;
            return results;
        }
    });

    /**
     * Resume Wizard
     */
    this.on('resumeWizard', async (req) => {
        const { sessionID } = req.data;
        const tenant = req.user?.tenant || 'default';

        try {
            const session = await SELECT.one.from(WizardSessions)
                .where({ ID: sessionID, tenant: tenant });

            if (!session) {
                return req.error(404, req.t('error.wizardSessionNotFound'));
            }

            // Update session status
            await UPDATE(WizardSessions)
                .set({
                    sessionStatus: 'Active',
                    lastActivity: new Date().toISOString()
                })
                .where({ ID: sessionID });

            // Get current question
            const question = await SELECT.one.from(QuestionFlows)
                .where({ questionId: session.currentQuestionId });

            return {
                currentQuestion: decisionEngine.formatQuestion(question),
                progress: {
                    currentStep: session.currentStep,
                    totalSteps: session.totalSteps,
                    answeredPath: session.answeredPath
                }
            };
        } catch (error) {
            LOG.error('Error resuming wizard:', error);
            return req.error(500, req.t('error.resumeWizardFailed', [error.message]));
        }
    });

    /**
     * Export Flowchart
     */
    this.on('exportFlowchart', async (req) => {
        const { analysisID, format } = req.data;

        try {
            // This is a placeholder - actual implementation would generate SVG/PNG/PDF
            const filename = `flowchart_${analysisID}.${format}`;
            const downloadUrl = `/exports/${filename}`;

            return {
                downloadUrl: downloadUrl,
                filename: filename
            };
        } catch (error) {
            LOG.error('Error exporting flowchart:', error);
            return req.error(500, req.t('error.exportFlowchartFailed', [error.message]));
        }
    });

    /**
     * Assign User to Project
     */
    this.on('assignUserToProject', async (req) => {
        const { projectId, userId, userEmail, userName, role } = req.data;
        const tenant = req.user?.tenant || 'default';

        try {
            // Check if user already assigned
            const existing = await SELECT.one.from(ProjectUsers)
                .where({ project_ID: projectId, userId: userId, tenant: tenant });

            if (existing) {
                return req.error(409, req.t('error.userAlreadyAssigned', [userName]));
            }

            // Create assignment
            const newAssignmentId = cds.utils.uuid();
            const newAssignment = {
                ID: newAssignmentId,
                project_ID: projectId,
                userId: userId,
                userEmail: userEmail,
                userName: userName,
                role: role,
                accessLevel: role === 'Admin' ? 'Admin' : 'Write',
                tenant: tenant
            };

            await INSERT.into(ProjectUsers).entries(newAssignment);

            return {
                ID: newAssignmentId,
                message: req.t('success.userAdded', [userName])
            };
        } catch (error) {
            LOG.error('Error assigning user to project:', error);
            return req.error(500, req.t('error.assignUserFailed', [error.message]));
        }
    });

    /**
     * Remove User from Project
     */
    this.on('removeUserFromProject', async (req) => {
        const { projectUserId } = req.data;
        const tenant = req.user?.tenant || 'default';

        try {
            await DELETE.from(ProjectUsers)
                .where({ ID: projectUserId, tenant: tenant });

            return {
                success: true,
                message: req.t('success.userRemoved')
            };
        } catch (error) {
            LOG.error('Error removing user from project:', error);
            return req.error(500, req.t('error.removeUserFailed', [error.message]));
        }
    });

    /**
     * Get Accessible Projects for Current User
     */
    this.on('getAccessibleProjects', async (req) => {
        const user = req.user?.id || 'anonymous';
        const tenant = req.user?.tenant || 'default';

        try {
            // If admin, return all projects
            if (req.user?.is('Admin')) {
                const projects = await SELECT.from(Projects)
                    .where({ tenant: tenant })
                    .columns('ID', 'projectName', 'clientName', 'status', 's4HanaFlavor');
                return projects;
            }

            // Otherwise, return only assigned projects
            const userProjects = await SELECT.from(ProjectUsers)
                .where({ userId: user, tenant: tenant });

            const projectIds = userProjects.map(up => up.project_ID);

            if (projectIds.length === 0) {
                return [];
            }

            const projects = await SELECT.from(Projects)
                .where({ ID: { in: projectIds }, tenant: tenant })
                .columns('ID', 'projectName', 'clientName', 'status', 's4HanaFlavor');

            return projects;
        } catch (error) {
            LOG.error('Error getting accessible projects:', error);
            return req.error(500, req.t('error.getAccessibleProjectsFailed', [error.message]));
        }
    });

    // ===============================
    // Entity Event Handlers
    // ===============================

    /**
     * Before creating an analysis
     */
    this.before('CREATE', Analyses, async (req) => {
        const tenant = req.user?.tenant || 'default';
        req.data.tenant = tenant;
        req.data.analysisDate = req.data.analysisDate || new Date().toISOString().split('T')[0];
    });

    /**
     * Before creating a project
     */
    this.before('CREATE', Projects, async (req) => {
        const tenant = req.user?.tenant || 'default';

        // Ensure ID is set (CAP should do this automatically, but let's be explicit)
        if (!req.data.ID) {
            req.data.ID = cds.utils.uuid();
        }

        req.data.tenant = tenant;

        // Ensure timeline is in correct format (YYYY-MM-DD)
        if (req.data.timeline) {
            const date = new Date(req.data.timeline);
            if (!isNaN(date.getTime())) {
                req.data.timeline = date.toISOString().split('T')[0];
            }
        }

        // Set default values for optional fields
        req.data.status = req.data.status || 'Active';
        req.data.expectedDuration = req.data.expectedDuration || 0;
        req.data.technicalTeamSize = req.data.technicalTeamSize || 0;
    });

    /**
     * Before deleting a project - cascade delete all associated analyses
     */
    this.before('DELETE', Projects, async (req) => {
        const projectID = req.data.ID;
        const tenant = req.user?.tenant || 'default';

        if (!projectID) {
            return;
        }

        try {
            // Delete all analyses associated with this project
            await DELETE.from(Analyses)
                .where({ projectConfig_ID: projectID, tenant: tenant });

            LOG.info(`Cascade deleted all analyses for project ${projectID}`);
        } catch (error) {
            LOG.error('Error cascade deleting analyses for project:', error);
            // Continue with project deletion even if analyses deletion fails
        }
    });

    /**
     * Before deleting an analysis - cascade delete all associated decision paths
     */
    this.before('DELETE', Analyses, async (req) => {
        const analysisID = req.data.ID;
        const tenant = req.user?.tenant || 'default';

        if (!analysisID) {
            return;
        }

        try {
            // Delete all decision paths associated with this analysis
            await DELETE.from(DecisionPaths)
                .where({ analysis_ID: analysisID, tenant: tenant });

            LOG.info(`Cascade deleted all decision paths for analysis ${analysisID}`);
        } catch (error) {
            LOG.error('Error cascade deleting decision paths for analysis:', error);
            // Continue with analysis deletion even if decision paths deletion fails
        }
    });

    /**
     * Before reading projects - filter by user access
     * TEMPORARILY DISABLED - Enable after implementing user management UI
     */
    /*
    this.before('READ', Projects, async (req) => {
        const user = req.user?.id || 'anonymous';
        const tenant = req.user?.tenant || 'default';
        
        // Admins see all projects
        if (req.user?.is('Admin') || req.user?.is('TenantAdmin')) {
            return;
        }
        
        try {
            // Get user's assigned projects
            const userProjects = await SELECT.from(ProjectUsers)
                .where({ userId: user, tenant: tenant })
                .columns('project_ID');
            
            const projectIds = userProjects.map(up => up.project_ID);
            
            if (projectIds.length === 0) {
                // User has no projects - they'll see empty list
                req.query.where({ ID: { in: ['00000000-0000-0000-0000-000000000000'] } });
            } else {
                // Filter to only user's projects
                if (req.query.SELECT && req.query.SELECT.where) {
                    // Add to existing where
                    req.query.SELECT.where.push('and', { ID: { in: projectIds } });
                } else {
                    // Create where
                    req.query.where({ ID: { in: projectIds } });
                }
            }
        } catch (error) {
            LOG.error('Error filtering projects by user:', error);
        }
    });
    */

    /**
     * After reading analyses - enrich with calculated data
     */
    this.after('READ', Analyses, async (analyses) => {
        if (!analyses) return;

        const analysesList = Array.isArray(analyses) ? analyses : [analyses];

        for (const analysis of analysesList) {
            // Calculate scores if not already present or appear to be defaults (50s)
            const hasFinal = !!analysis.finalRecommendation;
            const missingScores = !analysis.technicalDebtScore && !analysis.cloudReadinessScore && !analysis.upgradeImpactScore && !analysis.compositeHealthScore;
            const looksDefault = [analysis.technicalDebtScore, analysis.cloudReadinessScore, analysis.upgradeImpactScore, analysis.compositeHealthScore]
                .every(v => v === 50 || v === 50.0);

            if (hasFinal && (missingScores || looksDefault)) {
                try {
                    const scores = await scoringService.calculateScores(analysis.ID);
                    Object.assign(analysis, {
                        technicalDebtScore: scores.technicalDebt,
                        cloudReadinessScore: scores.cloudReadiness,
                        upgradeImpactScore: scores.upgradeImpact,
                        compositeHealthScore: scores.compositeHealth
                    });
                } catch (error) {
                    LOG.error('Error enriching analysis with scores:', error);
                }
            }
        }
    });

    /**
     * Get Analytics Data - Aggregated dashboard data
     */
    this.on('getAnalyticsData', async (req) => {
        try {
            // Extract filter parameters from request
            const filters = {
                dateFrom: req.data.dateFrom,
                dateTo: req.data.dateTo,
                ricefwTypes: req.data.ricefwTypes ? JSON.parse(req.data.ricefwTypes) : null,
                cleanCoreLevels: req.data.cleanCoreLevels ? JSON.parse(req.data.cleanCoreLevels) : null,
                projectId: req.data.projectId
            };

            const analyticsData = await analyticsService.getAnalyticsData(filters);
            return analyticsData;
        } catch (error) {
            LOG.error('Error getting analytics data:', error);
            return req.error(500, req.t('error.getAnalyticsDataFailed', [error.message]));
        }
    });

    // ===============================
    // Notification Handlers (FLP Shell Integration)
    // ===============================

    /**
     * Before reading notifications - filter by current user and tenant
     */
    this.before('READ', Notifications, async (req) => {
        try {
            const userId = req.user?.id || req.user?.email;
            const tenant = req.user?.tenant || 'default';

            // Admins should see all notifications
            if (req.user.is('Admin')) {
                return;
            }

            const existing = req.query.SELECT.where || [];
            req.query.SELECT.where = [
                ...existing,
                { userId: userId },
                { tenant: tenant }
            ];

            LOG.info(`Filtering notifications for user: ${userId}, tenant: ${tenant}`);
        } catch (error) {
            LOG.error('Error filtering notifications:', error);
            return req.error(500, 'Failed to filter notifications');
        }
    });

    // ===============================
    // Rate Limiting Management Handlers
    // ===============================

    /**
     * Get rate limit status
     */
    this.on('getRateLimitStatus', async (req) => {
        try {
            const { userId, tenantId } = req.data;

            // Use current user if not specified (non-admins can only check their own status)
            const targetUserId = userId || req.user.id;
            const targetTenantId = tenantId || req.user.tenant;

            // Admins can check any user's status, others only their own
            if (!req.user.is('Admin') && !req.user.is('TenantAdmin')) {
                if (targetUserId !== req.user.id) {
                    return req.error(403, 'You can only check your own rate limit status');
                }
            }

            const status = rateLimiter.getStatus(targetUserId, targetTenantId);
            return status;
        } catch (error) {
            LOG.error('Error getting rate limit status:', error);
            return req.error(500, `Failed to get rate limit status: ${error.message}`);
        }
    });

    /**
     * Reset user rate limit (Admin only)
     */
    this.on('resetUserRateLimit', async (req) => {
        try {
            const { userId } = req.data;

            if (!userId) {
                return { success: false, message: 'User ID is required' };
            }

            rateLimiter.resetUser(userId);

            // Audit log
            await auditService.logSecurityEvent(req, 'RATE_LIMIT_RESET', 'User', userId, {
                resetBy: req.user.id,
                reason: 'Manual reset by administrator'
            });

            return {
                success: true,
                message: `Rate limit reset successfully for user ${userId}`
            };
        } catch (error) {
            LOG.error('Error resetting user rate limit:', error);
            return {
                success: false,
                message: `Failed to reset rate limit: ${error.message}`
            };
        }
    });

    /**
     * Reset tenant rate limit (Admin only)
     */
    this.on('resetTenantRateLimit', async (req) => {
        try {
            const { tenantId } = req.data;

            if (!tenantId) {
                return { success: false, message: 'Tenant ID is required' };
            }

            rateLimiter.resetTenant(tenantId);

            // Audit log
            await auditService.logSecurityEvent(req, 'RATE_LIMIT_RESET', 'Tenant', tenantId, {
                resetBy: req.user.id,
                reason: 'Manual reset by administrator'
            });

            return {
                success: true,
                message: `Rate limit reset successfully for tenant ${tenantId}`
            };
        } catch (error) {
            LOG.error('Error resetting tenant rate limit:', error);
            return {
                success: false,
                message: `Failed to reset rate limit: ${error.message}`
            };
        }
    });



    /**
     * After reading notifications - cleanup expired notifications
     */
    this.after('READ', Notifications, async (notifications, req) => {
        if (!notifications) return;

        try {
            const now = new Date();
            const userId = req.user?.id || req.user?.email;
            const tenant = req.user?.tenant || 'default';

            // Delete expired notifications for this user (fire-and-forget)
            DELETE.from(Notifications)
                .where({
                    userId: userId,
                    tenant: tenant,
                    expiresAt: { '<': now.toISOString() }
                })
                .catch(err => LOG.error('Failed to cleanup expired notifications:', err));

        } catch (error) {
            LOG.error('Error in notifications after hook:', error);
        }

        return notifications;
    });

    /**
     * Custom action: Mark notification as read
     * 
     * @param {string} notificationId - ID of notification to mark as read
     * @returns {object} Updated notification
     */
    this.on('markNotificationAsRead', Notifications, async (req) => {
        try {
            const { notificationId } = req.data;
            const userId = req.user?.id || req.user?.email;
            const tenant = req.user?.tenant || 'default';

            if (!notificationId) {
                return req.error(400, 'Notification ID is required');
            }

            // Update notification
            const updated = await UPDATE(Notifications)
                .set({
                    isRead: true,
                    readAt: new Date().toISOString()
                })
                .where({
                    ID: notificationId,
                    userId: userId,
                    tenant: tenant
                });

            if (updated === 0) {
                return req.error(404, 'Notification not found or access denied');
            }

            LOG.info(`Notification ${notificationId} marked as read by user ${userId}`);

            // Return updated notification
            return await SELECT.one.from(Notifications).where({ ID: notificationId });
        } catch (error) {
            LOG.error('Error marking notification as read:', error);
            return req.error(500, 'Failed to mark notification as read');
        }
    });

    /**
     * Custom function: Get unread notification count
     * 
     * @returns {number} Count of unread notifications
     */
    this.on('getUnreadNotificationCount', Notifications, async (req) => {
        try {
            const userId = req.user?.id || req.user?.email;
            const tenant = req.user?.tenant || 'default';
            const now = new Date();

            if (!userId) {
                return req.error(401, 'User not authenticated');
            }

            const count = await SELECT.one.from(Notifications)
                .columns('count(*) as count')
                .where({
                    userId: userId,
                    tenant: tenant,
                    isRead: false,
                    expiresAt: { '>': now.toISOString() }
                });

            return { count: count?.count || 0 };
        } catch (error) {
            LOG.error('Error getting unread notification count:', error);
            return req.error(500, 'Failed to get notification count');
        }
    });

    // ===============================
    // Rate Limiting Management Handlers
    // ===============================

    /**
     * Get rate limit status
     */
    this.on('getRateLimitStatus', async (req) => {
        try {
            const { userId, tenantId } = req.data;

            // Use current user if not specified (non-admins can only check their own status)
            const targetUserId = userId || req.user.id;
            const targetTenantId = tenantId || req.user.tenant;

            // Admins can check any user's status, others only their own
            if (!req.user.is('Admin') && !req.user.is('TenantAdmin') && !req.user.is('ServiceProviderAdmin')) {
                if (targetUserId !== req.user.id) {
                    return req.error(403, 'You can only check your own rate limit status');
                }
            }

            const status = rateLimiter.getStatus(targetUserId, targetTenantId);
            return status;
        } catch (error) {
            LOG.error('Error getting rate limit status:', error);
            return req.error(500, `Failed to get rate limit status: ${error.message}`);
        }
    });

    /**
     * Reset user rate limit (Admin only)
     */
    this.on('resetUserRateLimit', async (req) => {
        try {
            const { userId } = req.data;

            if (!userId) {
                return { success: false, message: 'User ID is required' };
            }

            rateLimiter.resetUser(userId);

            // Audit log
            await auditService.logSecurityEvent(req, 'RATE_LIMIT_RESET', 'User', userId, {
                resetBy: req.user.id,
                reason: 'Manual reset by administrator'
            });

            return {
                success: true,
                message: `Rate limit reset successfully for user ${userId}`
            };
        } catch (error) {
            LOG.error('Error resetting user rate limit:', error);
            return {
                success: false,
                message: `Failed to reset rate limit: ${error.message}`
            };
        }
    });

    /**
     * Reset tenant rate limit (Admin only)
     */
    this.on('resetTenantRateLimit', async (req) => {
        try {
            const { tenantId } = req.data;

            if (!tenantId) {
                return { success: false, message: 'Tenant ID is required' };
            }

            rateLimiter.resetTenant(tenantId);

            // Audit log
            await auditService.logSecurityEvent(req, 'RATE_LIMIT_RESET', 'Tenant', tenantId, {
                resetBy: req.user.id,
                reason: 'Manual reset by administrator'
            });

            return {
                success: true,
                message: `Rate limit reset successfully for tenant ${tenantId}`
            };
        } catch (error) {
            LOG.error('Error resetting tenant rate limit:', error);
            return {
                success: false,
                message: `Failed to reset rate limit: ${error.message}`
            };
        }
    });
});
