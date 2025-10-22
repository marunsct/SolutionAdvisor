const cds = require('@sap/cds');
const DecisionEngine = require('./lib/decision-engine-consolidated');
const ScoringService = require('./lib/scoring-service');
const ConstraintsService = require('./lib/constraints-service');
const ExamplesService = require('./lib/examples-service');

module.exports = cds.service.impl(async function () {
    const {
        Projects,
        Analyses,
        DecisionPaths,
        WizardSessions,
        QuestionFlows,
        ConstraintLogs,
        ProjectUsers
    } = this.entities;

    // Initialize service components
    const decisionEngine = new DecisionEngine(this);
    const scoringService = new ScoringService(this);
    const constraintsService = new ConstraintsService(this);
    const examplesService = new ExamplesService(this);

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
    });

    // ===============================
    // Custom Action Handlers
    // ===============================

    /**
     * Start Wizard - Initialize a new wizard session
     */
    this.on('startWizard', async (req) => {
        const { projectID, ricefwId, objectType, objectName } = req.data;
        const tenant = req.user?.tenant || 'default';

        try {
            // Validate RICEFW ID format
            const ricefwPattern = /^[RICEFYW]-[0-9]{4}-[A-Z]{3}$/;
            if (!ricefwPattern.test(ricefwId)) {
                return req.error(400, 'Invalid RICEFW ID format. Expected format: [RICEFYW]-[0-9]{4}-[A-Z]{3}');
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
            console.error('Error starting wizard:', error);
            return req.error(500, `Failed to start wizard: ${error.message}`);
        }
    });

    /**
     * Submit Answer - Process answer and get next question
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
                return req.error(404, 'Wizard session not found');
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
                // Wizard complete - calculate scores
                const scores = await scoringService.calculateScores(session.analysis_ID);

                // Update analysis with final results
                await UPDATE(Analyses)
                    .set({
                        finalRecommendation: nextStep.recommendation,
                        finalReasoning: nextStep.reasoning,
                        status: 'Completed',
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

                return {
                    nextQuestion: nextStep.question,
                    isComplete: false,
                    recommendation: null,
                    reasoning: null,
                    scores: null
                };
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            return req.error(500, `Failed to submit answer: ${error.message}`);
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
            console.error('Error getting constraints:', error);
            return req.error(500, `Failed to get constraints: ${error.message}`);
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
            console.error('Error getting examples:', error);
            return req.error(500, `Failed to get examples: ${error.message}`);
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
            console.error('Error calculating scores:', error);
            return req.error(500, `Failed to calculate scores: ${error.message}`);
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
                return req.error(404, 'Wizard session not found');
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
            console.error('Error resuming wizard:', error);
            return req.error(500, `Failed to resume wizard: ${error.message}`);
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
            console.error('Error exporting flowchart:', error);
            return req.error(500, `Failed to export flowchart: ${error.message}`);
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
                return req.error(409, `User ${userName} is already assigned to this project`);
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
                message: `User ${userName} added successfully`
            };
        } catch (error) {
            console.error('Error assigning user to project:', error);
            return req.error(500, `Failed to assign user: ${error.message}`);
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
                message: 'User removed successfully'
            };
        } catch (error) {
            console.error('Error removing user from project:', error);
            return req.error(500, `Failed to remove user: ${error.message}`);
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
            console.error('Error getting accessible projects:', error);
            return req.error(500, `Failed to get accessible projects: ${error.message}`);
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
            console.error('Error filtering projects by user:', error);
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
            // Calculate scores if not already present
            if (analysis.finalRecommendation && !analysis.technicalDebtScore) {
                try {
                    const scores = await scoringService.calculateScores(analysis.ID);
                    Object.assign(analysis, {
                        technicalDebtScore: scores.technicalDebt,
                        cloudReadinessScore: scores.cloudReadiness,
                        upgradeImpactScore: scores.upgradeImpact,
                        compositeHealthScore: scores.compositeHealth
                    });
                } catch (error) {
                    console.error('Error enriching analysis with scores:', error);
                }
            }
        }
    });
});
