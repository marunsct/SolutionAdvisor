const cds = require('@sap/cds');
const DecisionEngine = require('./lib/decision-engine');
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
        ConstraintLogs
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
        req.data.tenant = tenant;
    });

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
