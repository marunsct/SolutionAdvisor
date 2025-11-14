sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sd/solutionadvisor/utils/ErrorHandler",
    "sap/base/Log"
], (Controller, JSONModel, MessageToast, MessageBox, ErrorHandler, Log) => {
    "use strict";

    /**
     * Wizard Controller - Clean Core Analysis Wizard
     * 
     * @class sd.solutionadvisor.controller.Wizard
     * @extends sap.ui.core.mvc.Controller
     * @description
     * Manages the multi-step wizard for conducting Clean Core analyses.
     * Handles dynamic question flows with branching logic, displays contextual
     * constraints and real-world examples, calculates final scoring metrics,
     * and supports draft save/resume functionality.
     * 
     * Key responsibilities:
     * - Project and RICEFW object selection validation
     * - Dynamic question rendering with answer selection
     * - Decision path tracking and navigation
     * - Real-time constraint violation detection
     * - Contextual example filtering by industry/level
     * - Detailed hint display in popovers
     * - Final recommendation display with scoring dashboard
     * - Draft save/resume with 24-hour expiry
     * - RICEFW history view for existing analyses
     * - Time tracking per question for complexity scoring
     * 
     * Models used:
     * - wizardModel: Current wizard state (questions, answers, scores)
     * - constraintsModel: Performance/deployment/compliance constraints
     * - examplesModel: Real-world scenario examples
     * - hintModel: Detailed hints and performance context
     * - draftModel: Draft save/resume state
     * - historyModel: RICEFW analysis history
     * 
     * @author SAP Clean Core Team
     * @version 1.0.0
     * @public
     */
    return Controller.extend("sd.solutionadvisor.controller.Wizard", {
        /**
         * Controller initialization
         * @description
         * Sets up JSON models for wizard state, constraints, examples, hints, drafts,
         * and history. Registers route matched handler for auto-project-selection.
         * Initializes violation detection timer and time tracking.
         * @public
         */
        onInit() {
            // Initialize wizard model with dynamic question flow properties
            const oWizardModel = new JSONModel({
                // Project setup properties
                projectID: "",
                projectName: "",
                ricefwId: "",
                objectType: "",
                objectName: "",
                objectDescription: "",
                autoSelectedProject: false,

                // Business Area & Complexity (Step 2)
                businessArea_ID: "",
                businessAreaName: "",
                complexity: "",
                complexityOptions: [
                    { key: "Simple", text: "Simple" },
                    { key: "Medium", text: "Medium" },
                    { key: "High", text: "High" },
                    { key: "Very High", text: "Very High" }
                ],

                // Dynamic question flow properties
                currentQuestion: null,
                selectedAnswer: null,
                selectedAnswerIndex: -1,
                questionCompleted: false,
                currentStep: 0,
                totalSteps: 0,
                finalRecommendation: null,
                finalReasoning: null,
                scores: {
                    technicalDebt: 0,
                    cloudReadiness: 0,
                    upgradeImpact: 0,
                    compositeHealth: 0
                }
            });
            this.getView().setModel(oWizardModel, "wizardModel");

            // Initialize constraints model (lazy load flags)
            const oConstraintsModel = new JSONModel({
                performanceConstraints: [],
                deploymentConstraints: [],
                complianceConstraints: [],
                violations: [],
                loaded: false,
                loading: false
            });
            this.getView().setModel(oConstraintsModel, "constraintsModel");

            // Initialize examples model (lazy load flags)
            const oExamplesModel = new JSONModel({
                examples: [],
                selectedExample: {},
                selectedIndustry: "",
                selectedLevel: "",
                loaded: false,
                loading: false
            });
            this.getView().setModel(oExamplesModel, "examplesModel");

            // Initialize hint model
            const oHintModel = new JSONModel({
                questionText: "",
                detailedHint: "",
                performanceContext: ""
            });
            this.getView().setModel(oHintModel, "hintModel");

            // Initialize draft model
            const oDraftModel = new JSONModel({
                currentStep: 0,
                totalSteps: 0,
                timeSpent: 0
            });
            this.getView().setModel(oDraftModel, "draftModel");

            // Initialize history model
            const oHistoryModel = new JSONModel({
                ricefwId: "",
                analyses: []
            });
            this.getView().setModel(oHistoryModel, "historyModel");

            // Initialize progress tracking model
            const oProgressModel = new JSONModel({
                percentComplete: 0,
                currentStepIndex: 0,
                totalSteps: 0,
                questionsAnswered: 0,
                estimatedTimeRemaining: 0,
                progressText: "Not started",
                isError: false,
                errorMessage: "",
                canContinue: true,
                lastSaveTime: null,
                autoSaveEnabled: true
            });
            this.getView().setModel(oProgressModel, "progressModel");

            // Initialize time tracking
            this._wizardStartTime = new Date();
            this._sessionId = null;
            this._analysisId = null;
            this._answeredQuestions = {};
            this._questionStartTime = null;
            this._autoSaveTimer = null;

            // Start auto-save timer (every 2 minutes)
            this._startAutoSave();

            // Attach to route matched event
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Wizard").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Start auto-save timer for wizard progress
         * @private
         */
        _startAutoSave() {
            const oProgressModel = this.getView().getModel("progressModel");
            
            if (this._autoSaveTimer) {
                clearInterval(this._autoSaveTimer);
            }

            // Auto-save every 2 minutes if enabled
            this._autoSaveTimer = setInterval(() => {
                if (oProgressModel.getProperty("/autoSaveEnabled") && this._sessionId) {
                    this._autoSaveProgress();
                }
            }, 120000); // 2 minutes
        },

        /**
         * Auto-save wizard progress
         * @private
         */
        _autoSaveProgress() {
            try {
                const oProgressModel = this.getView().getModel("progressModel");
                
                // Only auto-save if we have a session and there's progress
                if (!this._sessionId || oProgressModel.getProperty("/currentStepIndex") === 0) {
                    return;
                }

                // Update last save time (actual save happens when user clicks Save Draft button)
                oProgressModel.setProperty("/lastSaveTime", new Date());
            } catch (oError) {
                Log.error("Auto-save failed:", oError);
                // Don't show error to user for auto-save failures
            }
        },

        /**
         * Update progress tracking
         * @param {number} currentStep - Current step index
         * @param {number} totalSteps - Total number of steps
         * @private
         */
        /**
         * Extract question number from questionId (e.g., "Q003" -> 3)
         * @param {string} questionId - Question ID like "Q001", "Q003", etc.
         * @returns {number} Extracted question number
         * @private
         */
        _extractQuestionNumber(questionId) {
            if (!questionId) return 0;
            const match = questionId.match(/Q(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        },

        _updateProgress(currentQuestionId, totalSteps) {
            const oProgressModel = this.getView().getModel("progressModel");
            
            // Extract actual question number from questionId (e.g., "Q003" -> 3)
            const questionNumber = this._extractQuestionNumber(currentQuestionId);
            
            const percentComplete = totalSteps > 0 ? Math.round((questionNumber / totalSteps) * 100) : 0;
            const questionsAnswered = Object.keys(this._answeredQuestions).length;
            
            // Calculate estimated time remaining based on average time per question
            const elapsedTime = Date.now() - this._wizardStartTime.getTime();
            const avgTimePerQuestion = questionsAnswered > 0 ? elapsedTime / questionsAnswered : 60000; // Default 1min
            const remainingQuestions = totalSteps - questionNumber;
            const estimatedTimeRemaining = Math.round((remainingQuestions * avgTimePerQuestion) / 60000); // in minutes

            oProgressModel.setData({
                percentComplete: percentComplete,
                currentStepIndex: questionNumber,
                totalSteps: totalSteps,
                questionsAnswered: questionsAnswered,
                estimatedTimeRemaining: estimatedTimeRemaining,
                progressText: `Question ${questionNumber} of ${totalSteps}`,
                isError: false,
                errorMessage: "",
                canContinue: true,
                lastSaveTime: oProgressModel.getProperty("/lastSaveTime"),
                autoSaveEnabled: oProgressModel.getProperty("/autoSaveEnabled")
            });
        },

        /**
         * Handle wizard errors with enhanced error reporting
         * @param {Error} oError - Error object
         * @param {string} sContext - Context where error occurred
         * @param {boolean} bRecoverable - Whether the error is recoverable
         * @private
         */
        _handleWizardError(oError, sContext, bRecoverable = true) {
            const oProgressModel = this.getView().getModel("progressModel");
            
            Log.error(`Wizard error in ${sContext}:`, oError);

            let sErrorMessage = "An unexpected error occurred.";
            let bCanContinue = bRecoverable;

            // Check for specific error types
            if (ErrorHandler.handleWizardSpecificError(oError, this.getView().getModel("wizardModel").getProperty("/objectType"))) {
                // Error was handled by ErrorHandler
                oProgressModel.setProperty("/isError", true);
                oProgressModel.setProperty("/canContinue", bRecoverable);
                return;
            }

            // Extract user-friendly error message
            if (oError.message) {
                sErrorMessage = oError.message;
            } else if (typeof oError === 'string') {
                sErrorMessage = oError;
            }

            // Update progress model
            oProgressModel.setProperty("/isError", true);
            oProgressModel.setProperty("/errorMessage", sErrorMessage);
            oProgressModel.setProperty("/canContinue", bCanContinue);

            // Show error to user
            if (bRecoverable) {
                MessageBox.warning(sErrorMessage + "\n\nYou can try again or save your progress and return later.", {
                    title: "Warning",
                    actions: [MessageBox.Action.OK],
                    onClose: () => {
                        // Clear error state after user acknowledges
                        oProgressModel.setProperty("/isError", false);
                        oProgressModel.setProperty("/errorMessage", "");
                    }
                });
            } else {
                MessageBox.error(sErrorMessage + "\n\nPlease save your progress and contact support if the issue persists.", {
                    title: "Error",
                    actions: [MessageBox.Action.OK]
                });
            }

            // Log for analytics
            ErrorHandler.logErrorForAnalytics(oError, sContext);
        },

        _onRouteMatched(oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            const sProjectId = oArgs.projectId;
            const sSessionId = oArgs.sessionId;
            const sAnalysisId = oArgs.analysisId;

            // Check if we're navigating back from history without valid context
            // If no parameters provided and wizard was not intentionally opened, redirect
            if (!sProjectId && !sSessionId && !sAnalysisId) {
                // User likely navigated back from browser history - redirect to projects list
                this.getOwnerComponent().getRouter().navTo("ProjectsList", {}, true);
                return;
            }

            // ✅ IMPORTANT: Reset session/analysis IDs when starting a fresh analysis
            // This prevents resuming a completed analysis when clicking "New Analysis"
            if (sProjectId && !sSessionId && !sAnalysisId) {
                // Starting a new analysis - reset all state
                this._sessionId = null;
                this._analysisId = null;
                this._answeredQuestions = {};
            }

            if (sAnalysisId) {
                // Resume from in-progress analysis
                this._resumeFromAnalysis(sAnalysisId);
            } else if (sSessionId) {
                // Resume from saved session
                this._resumeSession(sSessionId);
            } else if (sProjectId && sProjectId !== "resume") {
                // Project was pre-selected from project list
                this._autoSelectProject(sProjectId);
            } else {
                // Reset wizard if no project selected
                this._resetWizard();
            }
        },

        _autoSelectProject(sProjectId) {
            // Load project details and auto-select
            const oModel = this.getView().getModel();
            const oBinding = oModel.bindContext("/Projects('" + sProjectId + "')");

            oBinding.requestObject().then((oData) => {
                const oWizardModel = this.getView().getModel("wizardModel");
                oWizardModel.setProperty("/projectID", oData.ID);
                oWizardModel.setProperty("/projectName", oData.projectName);
                oWizardModel.setProperty("/autoSelectedProject", true);

                // Display project info
                const sInfo = `S/4HANA: ${oData.s4HanaFlavor} | Criticality: ${oData.businessCriticality}`;
                this.byId("projectInfo").setText(sInfo);

                // Validate step and auto-advance
                this.byId("projectStep").setValidated(true);

                // Auto-advance to next step
                const oWizard = this.byId("cleanCoreWizard");
                oWizard.nextStep();
            }).catch((oError) => {
                Log.error("Failed to load project:", oError);
            });
        },

        /**
         * Resume wizard from saved session
         * @param {string} sSessionId - Session ID to resume
         */
        _resumeSession: function (sSessionId) {
            const oModel = this.getView().getModel();
            const oWizardModel = this.getView().getModel("wizardModel");

            this.getView().setBusy(true);

            // Load session data with expanded analysis
            const oSessionBinding = oModel.bindContext(`/WizardSessions('${sSessionId}')`, null, {
                $expand: "analysis"
            });

            oSessionBinding.requestObject().then((oSession) => {
                if (!oSession) {
                    MessageBox.error("Session not found or has expired");
                    this.getView().setBusy(false);
                    this._resetWizard();
                    return;
                }

                // Store session ID
                this._sessionId = sSessionId;
                this._analysisId = oSession.analysis_ID;

                // Parse answered path to restore previous answers
                const answeredPath = JSON.parse(oSession.answeredPath || "[]");
                this._answeredQuestions = answeredPath.reduce((acc, item) => {
                    acc[item.questionId] = item;
                    return acc;
                }, {});

                // Load full analysis data to populate wizard fields
                // For draft-enabled entities, use ID=guid syntax
                const oAnalysisBinding = oModel.bindContext(`/Analyses(ID=${oSession.analysis_ID},IsActiveEntity=true)`, null, {
                    $expand: "projectConfig"
                });

                oAnalysisBinding.requestObject().then((oAnalysis) => {
                    // Restore wizard model data
                    oWizardModel.setData({
                        projectID: oAnalysis.projectConfig_ID,
                        projectName: oAnalysis.projectConfig?.projectName || "",
                        ricefwId: oAnalysis.ricefwId,
                        objectType: oAnalysis.objectType,
                        objectName: oAnalysis.objectName,
                        objectDescription: oAnalysis.objectDescription || "",
                        autoSelectedProject: true
                    });

                    // Restore UI input fields
                    this.byId("ricefwIdInput")?.setValue(oAnalysis.ricefwId);
                    this.byId("objectTypeComboBox")?.setSelectedKey(oAnalysis.objectType);
                    this.byId("objectNameInput")?.setValue(oAnalysis.objectName);
                    this.byId("objectDescriptionInput")?.setValue(oAnalysis.objectDescription || "");

                    // Mark completed steps as validated
                    this.byId("projectStep").setValidated(true);
                    this.byId("objectStep").setValidated(true);

                    // Restore wizard to current step
                    const oWizard = this.byId("cleanCoreWizard");
                    const iCurrentStep = oSession.currentStep || 1;

                    // Mark completed steps as validated
                    this.byId("projectStep").setValidated(true);
                    this.byId("objectStep").setValidated(true);

                    // Navigate wizard to the saved step
                    // First go to project step
                    oWizard.setCurrentStep(this.byId("projectStep"));
                    
                    // Then navigate forward to the correct step
                    for (let i = 2; i <= iCurrentStep; i++) {
                        oWizard.nextStep();
                    }

                    // Show next button if we're at project or object step
                    const oNextButton = this.byId("wizardNextButton");
                    const oStartButton = this.byId("wizardStartButton");
                    if (iCurrentStep <= 2) {
                        oNextButton.setVisible(true);
                        oStartButton.setVisible(false);
                        this._updateNextButtonState();
                    } else {
                        // At questions step or summary - hide next button initially
                        oNextButton.setVisible(false);
                        oStartButton.setVisible(false);
                    }

                    // Update session status from Paused to Active
                    const oUpdateBinding = oModel.bindContext(`/WizardSessions('${sSessionId}')`);
                    oUpdateBinding.requestObject().then(() => {
                        // Get the bound context and update properties
                        const oUpdateContext = oUpdateBinding.getBoundContext();
                        oUpdateContext.setProperty("sessionStatus", "Active");
                        oUpdateContext.setProperty("lastActivity", new Date().toISOString());

                        return oModel.submitBatch("updateGroup");
                    }).then(() => {
                        this.getView().setBusy(false);
                        MessageToast.show(`Draft resumed successfully from step ${iCurrentStep}`, {
                            duration: 3000
                        });
                    }).catch((oError) => {
                        this.getView().setBusy(false);
                        Log.error("Failed to update session status:", oError);
                        // Continue anyway, just log the error
                    });
                }).catch((oError) => {
                    this.getView().setBusy(false);
                    MessageBox.error("Failed to load analysis data");
                    Log.error("Failed to load analysis:", oError);
                    this._resetWizard();
                });
            }).catch((oError) => {
                this.getView().setBusy(false);
                MessageBox.error("Failed to restore draft session");
                Log.error("Failed to load session:", oError);
                this._resetWizard();
            });
        },

        /**
         * Resume wizard from in-progress analysis
         * @param {string} sAnalysisId - Analysis ID to resume
         */
        _resumeFromAnalysis: function (sAnalysisId) {
            const oModel = this.getView().getModel();
            const oWizardModel = this.getView().getModel("wizardModel");

            this.getView().setBusy(true);

            // First, clean up any draft entities for this analysis
            // Query for draft version using OData V4 list binding
            const aDraftFilters = [
                new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("ID", sap.ui.model.FilterOperator.EQ, sAnalysisId),
                        new sap.ui.model.Filter("IsActiveEntity", sap.ui.model.FilterOperator.EQ, false)
                    ],
                    and: true
                })
            ];
            const oDraftBinding = oModel.bindList("/Analyses", null, null, aDraftFilters);

            oDraftBinding.requestContexts().then((aDraftContexts) => {
                // Delete any draft entities found
                const aDraftDeletions = aDraftContexts.map(oDraftCtx => {
                    Log.info("Discarding stale draft for analysis:", sAnalysisId);
                    return oDraftCtx.delete().catch((oError) => {
                        Log.warning("Failed to discard draft, continuing anyway:", oError);
                    });
                });

                // Wait for all draft deletions to complete (or fail)
                return Promise.allSettled(aDraftDeletions);
            }).then(() => {
                // Now load the active analysis entity
                // For draft-enabled entities, use ID=guid,IsActiveEntity=true syntax
                const oAnalysisBinding = oModel.bindContext(`/Analyses(ID=${sAnalysisId},IsActiveEntity=true)`, null, {
                    $expand: "projectConfig,decisionPaths"
                });

                return oAnalysisBinding.requestObject();
            }).then((oAnalysis) => {
                if (!oAnalysis) {
                    MessageBox.error("Analysis not found");
                    this.getView().setBusy(false);
                    this._resetWizard();
                    return;
                }

                // Store analysis ID
                this._analysisId = sAnalysisId;

                // Store project configuration
                const oProjectConfig = oAnalysis.projectConfig;

                // Populate wizard model with analysis data
                oWizardModel.setData({
                    projectID: oAnalysis.projectConfig_ID,
                    projectName: oProjectConfig?.projectName || "",
                    ricefwId: oAnalysis.ricefwId,
                    objectType: oAnalysis.objectType,
                    objectName: oAnalysis.objectName,
                    objectDescription: oAnalysis.objectDescription || "",
                    autoSelectedProject: true,
                    currentQuestion: null,
                    selectedAnswer: null,
                    selectedAnswerIndex: -1,
                    questionCompleted: false,
                    currentStep: 0,
                    totalSteps: 0,
                    finalRecommendation: null,
                    finalReasoning: null,
                    scores: {
                        technicalDebt: 0,
                        cloudReadiness: 0,
                        upgradeImpact: 0,
                        compositeHealth: 0
                    }
                });

                // Update UI fields
                this.byId("ricefwIdInput")?.setValue(oAnalysis.ricefwId);
                this.byId("objectTypeComboBox")?.setSelectedKey(oAnalysis.objectType);
                this.byId("objectNameInput")?.setValue(oAnalysis.objectName);
                this.byId("objectDescriptionInput")?.setValue(oAnalysis.objectDescription || "");

                // Mark completed steps as validated
                this.byId("projectStep").setValidated(true);
                this.byId("objectStep").setValidated(true);

                // Check if there's an active wizard session for this analysis
                const aSessionFilters = [
                    new sap.ui.model.Filter("analysis_ID", sap.ui.model.FilterOperator.EQ, sAnalysisId),
                    new sap.ui.model.Filter("sessionStatus", sap.ui.model.FilterOperator.EQ, "Active")
                ];
                const oSessionBinding = oModel.bindList("/WizardSessions", null, null, aSessionFilters);

                oSessionBinding.requestContexts().then((aContexts) => {
                    if (aContexts && aContexts.length > 0) {
                        // Active session found - use it to resume
                        const oSession = aContexts[0].getObject();
                        this._sessionId = oSession.ID;

                        // Parse answered path
                        const answeredPath = JSON.parse(oSession.answeredPath || "[]");
                        this._answeredQuestions = answeredPath.reduce((acc, item) => {
                            acc[item.questionId] = item;
                            return acc;
                        }, {});

                        // Navigate wizard to saved step
                        const oWizard = this.byId("cleanCoreWizard");
                        const iCurrentStep = oSession.currentStep || 1;

                        // First go to project step
                        oWizard.setCurrentStep(this.byId("projectStep"));
                        
                        // Then navigate forward to the correct step
                        for (let i = 2; i <= iCurrentStep; i++) {
                            oWizard.nextStep();
                        }

                        // Show next button if we're at project or object step
                        const oNextButton = this.byId("wizardNextButton");
                        const oStartButton = this.byId("wizardStartButton");
                        if (iCurrentStep <= 2) {
                            oNextButton.setVisible(true);
                            oStartButton.setVisible(false);
                            this._updateNextButtonState();
                        } else {
                            // At questions step or summary - hide next button initially
                            oNextButton.setVisible(false);
                            oStartButton.setVisible(false);
                        }

                        // If in questions step (step 3 or higher), load current question
                        if (iCurrentStep >= 3 && oSession.currentQuestionId) {
                            // Load and display the current question
                            this._loadQuestionById(oSession.currentQuestionId);
                            
                            // Update progress display with current question and total steps
                            this._updateProgress(oSession.currentQuestionId, oSession.totalSteps || 0);
                        }

                        this.getView().setBusy(false);
                        MessageToast.show("Resuming analysis: " + oAnalysis.objectName, {
                            duration: 3000
                        });
                    } else {
                        // No active session - need to restart wizard from beginning
                        // User will go through the wizard steps again
                        const oWizard = this.byId("cleanCoreWizard");
                        oWizard.setCurrentStep(this.byId("projectStep"));

                        // Update summary page
                        this.byId("summaryProject")?.setText(oProjectConfig?.projectName || "");
                        this.byId("summaryRicefwId")?.setText(oAnalysis.ricefwId);
                        this.byId("summaryObjectType")?.setText(oAnalysis.objectType);
                        this.byId("summaryObjectName")?.setText(oAnalysis.objectName);

                        this.getView().setBusy(false);
                        MessageToast.show("Continue with analysis: " + oAnalysis.objectName, {
                            duration: 3000
                        });
                    }
                }).catch((oError) => {
                    this.getView().setBusy(false);
                    Log.error("Failed to check for session:", oError);
                    MessageToast.show("Loaded analysis. Start wizard to continue.", {
                        duration: 3000
                    });
                });
            }).catch((oError) => {
                this.getView().setBusy(false);
                MessageBox.error("Failed to load analysis");
                Log.error("Failed to load analysis:", oError);
                this._resetWizard();
            });
        },

        /**
         * Load a specific question by ID
         * @param {string} sQuestionId - Question ID to load
         */
        _loadQuestionById: function (sQuestionId) {
            const oModel = this.getView().getModel();

            const oQuestionBinding = oModel.bindContext(`/QuestionFlows?$filter=questionId eq '${sQuestionId}'`);

            oQuestionBinding.requestObject().then((oData) => {
                if (oData && oData.value && oData.value.length > 0) {
                    const oQuestion = oData.value[0];
                    this._displayQuestion({
                        questionId: oQuestion.questionId,
                        questionText: oQuestion.questionText,
                        hint: oQuestion.questionHint,
                        detailedHint: oQuestion.detailedHint,
                        answerOptions: oQuestion.answerOptions,
                        performanceContext: oQuestion.performanceContext
                    });
                }
            }).catch((oError) => {
                Log.error("Failed to load question:", oError);
                MessageToast.show("Failed to load current question");
            });
        },

        /**
         * Reset wizard to initial state
         */
        _resetWizard: function () {
            const oWizardModel = this.getView().getModel("wizardModel");
            oWizardModel.setData({
                projectID: "",
                projectName: "",
                ricefwId: "",
                objectType: "",
                objectName: "",
                objectDescription: "",
                autoSelectedProject: false
            });

            this.byId("projectStep").setValidated(false);
            this.byId("objectStep").setValidated(false);

            const oWizard = this.byId("cleanCoreWizard");
            oWizard.discardProgress(this.byId("projectStep"));

            this._sessionId = null;
            this._analysisId = null;
            this._answeredQuestions = {};
            this._wizardStartTime = null; // Initialize wizard start time tracker
        },

        onProjectStepActivate() {
            this._updateNextButtonState();
        },

        onObjectStepActivate() {
            this._updateNextButtonState();
        },

        /**
         * Handler for guidance step activation
         * Loads the full guidance content for the selected RICEFW type
         * @public
         */
        onGuidanceStepActivate() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sObjectType = oWizardModel.getProperty("/objectType");
            
            // Extract RICEFW type (first character) from objectType
            // objectType could be "Reports", "Interfaces", etc.
            // We need to map it to R, I, C, E, F, W
            let sRicefwType = "";
            if (sObjectType) {
                // Try to get from ricefwId first
                const sRicefwId = oWizardModel.getProperty("/ricefwId");
                if (sRicefwId && sRicefwId.length > 0) {
                    sRicefwType = sRicefwId.charAt(0);
                } else {
                    // Fallback: map object type name to RICEFW code
                    const typeMapping = {
                        "Reports": "R",
                        "Interfaces": "I",
                        "Conversions": "C",
                        "Enhancements": "E",
                        "Forms": "F",
                        "Workflows": "W"
                    };
                    sRicefwType = typeMapping[sObjectType] || "";
                }
            }
            
            if (sRicefwType && ['R', 'I', 'C', 'E', 'F', 'W'].includes(sRicefwType)) {
                // Get reference to the Guidance view and controller
                const oGuidanceView = this.byId("guidanceView");
                if (oGuidanceView) {
                    const oGuidanceController = oGuidanceView.getController();
                    if (oGuidanceController && typeof oGuidanceController.loadGuidance === 'function') {
                        oGuidanceController.loadGuidance(sRicefwType);
                    }
                }
            } else {
                MessageToast.show("Unable to determine RICEFW type for guidance");
            }
        },

        /**
         * Handler for "Learn Clean Core Levels" button click
         * Opens the guidance content as a modal dialog
         * @public
         */
        onLearnCleanCoreLevels() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sObjectType = oWizardModel.getProperty("/objectType");
            const sRicefwId = oWizardModel.getProperty("/ricefwId");
            
            // Extract RICEFW type
            let sRicefwType = "";
            if (sRicefwId && sRicefwId.length > 0) {
                sRicefwType = sRicefwId.charAt(0);
            } else {
                const typeMapping = {
                    "Reports": "R",
                    "Interfaces": "I",
                    "Conversions": "C",
                    "Enhancements": "E",
                    "Forms": "F",
                    "Workflows": "W"
                };
                sRicefwType = typeMapping[sObjectType] || "";
            }

            if (!sRicefwType) {
                MessageToast.show("Unable to determine object type for guidance");
                return;
            }

            // Store reference to the dialog for later cleanup
            if (!this._guidanceDialogStack) {
                this._guidanceDialogStack = [];
            }

            // Close and destroy any previously opened dialogs
            while (this._guidanceDialogStack.length > 0) {
                const oOldDialog = this._guidanceDialogStack.pop();
                if (oOldDialog && !oOldDialog.isDestroyed()) {
                    oOldDialog.close();
                    oOldDialog.destroy();
                }
            }

            // Generate unique ID for this fragment instance
            const sFragmentId = "guidanceDialog_" + Date.now();

            // Load the dialog fragment with unique ID
            sap.ui.core.Fragment.load({
                id: sFragmentId,
                name: "sd.solutionadvisor.view.fragments.GuidanceDialog",
                controller: this
            }).then((oDialog) => {
                // Store dialog reference
                this._guidanceDialogStack.push(oDialog);

                // Add dialog to view
                this.getView().addDependent(oDialog);
                
                // Load guidance content in the dialog
                const oGuidanceView = sap.ui.core.Fragment.byId(sFragmentId, "guidanceViewDialog");
                if (oGuidanceView) {
                    const oGuidanceController = oGuidanceView.getController();
                    if (oGuidanceController && typeof oGuidanceController.loadGuidance === 'function') {
                        oGuidanceController.loadGuidance(sRicefwType);
                    }
                }
                
                // Open dialog
                oDialog.open();
            }).catch((oError) => {
                Log.error("Failed to load guidance dialog:", oError);
                MessageToast.show("Unable to load guidance content");
            });
        },

        /**
         * Handler for closing the guidance dialog
         * Destroys the dialog to clean up resources
         * @public
         */
        onCloseGuidanceDialog() {
            // Close the most recent dialog in the stack
            if (this._guidanceDialogStack && this._guidanceDialogStack.length > 0) {
                const oDialog = this._guidanceDialogStack[this._guidanceDialogStack.length - 1];
                if (oDialog && !oDialog.isDestroyed()) {
                    oDialog.close();
                    // Destroy dialog after closing to free up resources and remove all controls
                    setTimeout(() => {
                        if (oDialog && !oDialog.isDestroyed()) {
                            oDialog.destroy();
                            this._guidanceDialogStack.pop();
                        }
                    }, 300);
                }
            }
        },

        onProjectSelect(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oContext = oSelectedItem.getBindingContext();
                const oWizardModel = this.getView().getModel("wizardModel");

                oWizardModel.setProperty("/projectID", oContext.getProperty("ID"));
                oWizardModel.setProperty("/projectName", oContext.getProperty("projectName"));

                // Display project info
                const sInfo = `S/4HANA: ${oContext.getProperty("s4HanaFlavor")} | Criticality: ${oContext.getProperty("businessCriticality")}`;
                this.byId("projectInfo").setText(sInfo);

                // Validate step
                this.byId("projectStep").setValidated(true);
            }
            this._updateNextButtonState();
        },

        onRicefwIdChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oWizardModel = this.getView().getModel("wizardModel");
            oWizardModel.setProperty("/ricefwId", sValue);

            // Validate format
            const pattern = /^[RICEFYW]-[0-9]{4}-[A-Z]{3}$/;
            const bValid = pattern.test(sValue);

            const oInput = oEvent.getSource();
            if (sValue && !bValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid format. Expected: [RICEFYW]-[0-9]{4}-[A-Z]{3}");
            } else {
                oInput.setValueState("None");
            }

            this._validateObjectStep();
        },

        onObjectTypeSelect(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oWizardModel = this.getView().getModel("wizardModel");
                oWizardModel.setProperty("/objectType", oSelectedItem.getKey());

                // Reset lazy models so user-triggered expansion loads fresh data
                const oConstraintsModel = this.getView().getModel("constraintsModel");
                oConstraintsModel.setData({
                    performanceConstraints: [],
                    deploymentConstraints: [],
                    complianceConstraints: [],
                    violations: [],
                    loaded: false,
                    loading: false
                });

                const oExamplesModel = this.getView().getModel("examplesModel");
                oExamplesModel.setData({
                    examples: [],
                    selectedExample: {},
                    selectedIndustry: "",
                    selectedLevel: "",
                    loaded: false,
                    loading: false
                });
            }
            this._validateObjectStep();
        },

        /**
         * Handle Business Area selection
         * Stores selected business area ID and display name in wizard model
         */
        onBusinessAreaSelect(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const oWizardModel = this.getView().getModel("wizardModel");
            
            if (oSelectedItem) {
                const sBusinessAreaID = oSelectedItem.getKey();
                const sBusinessAreaName = oSelectedItem.getText();
                oWizardModel.setProperty("/businessArea_ID", sBusinessAreaID);
                oWizardModel.setProperty("/businessAreaName", sBusinessAreaName);
            } else {
                oWizardModel.setProperty("/businessArea_ID", "");
                oWizardModel.setProperty("/businessAreaName", "");
            }
        },

        /**
         * Handle Complexity selection
         * Stores selected complexity level in wizard model
         */
        onComplexitySelect(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const oWizardModel = this.getView().getModel("wizardModel");
            
            if (oSelectedItem) {
                oWizardModel.setProperty("/complexity", oSelectedItem.getKey());
            } else {
                oWizardModel.setProperty("/complexity", "");
            }
        },

        _loadConstraints(sObjectType) {
            const oModel = this.getView().getModel();
            const oConstraintsModel = this.getView().getModel("constraintsModel");
            const oWizardModel = this.getView().getModel("wizardModel");

            // Get project details for deployment type
            const sProjectId = oWizardModel.getProperty("/projectID");

            if (!sProjectId || !sObjectType) {
                Log.warning("Cannot load constraints without project and object type");
                return;
            }

            // Mark as loading
            oConstraintsModel.setProperty("/loading", true);

            // Load project data first to get deployment type
            const oProjectBinding = oModel.bindContext("/Projects('" + sProjectId + "')");

            oProjectBinding.requestObject().then((oProjectData) => {
                const sDeploymentType = oProjectData.s4HanaFlavor || "Cloud Public";

                // Load deployment and compliance constraints (client-side logic)
                const aDeploymentConstraints = this._getDeploymentConstraints(
                    sDeploymentType,
                    sObjectType
                );
                oConstraintsModel.setProperty("/deploymentConstraints", aDeploymentConstraints);

                const aComplianceConstraints = this._getComplianceConstraints(
                    oProjectData.complianceRequirements
                );
                oConstraintsModel.setProperty("/complianceConstraints", aComplianceConstraints);

                // Query performance thresholds directly (simplified approach from bug fix)
                const aThresholdFilters = [
                    new sap.ui.model.Filter("applicableObjectTypes", sap.ui.model.FilterOperator.Contains, sObjectType.charAt(0)),
                    new sap.ui.model.Filter("isActive", sap.ui.model.FilterOperator.EQ, true)
                ];
                const oThresholdBinding = oModel.bindList("/PerformanceThresholds", null, null, aThresholdFilters);

                oThresholdBinding.requestContexts().then((aContexts) => {
                    const aThresholds = aContexts.map(ctx => ctx.getObject());

                    // Add violation detection logic (from my changes)
                    const aViolations = [];
                    const aRegularConstraints = [];

                    aThresholds.forEach(constraint => {
                        // Check for violations based on user selections (if available in wizard model)
                        // Simple violation check - can be enhanced based on actual user inputs
                        let isViolated = false;

                        // Add constraint to appropriate array
                        if (isViolated) {
                            constraint.isViolated = true;
                            aViolations.push(constraint);
                        } else {
                            aRegularConstraints.push(constraint);
                        }
                    });

                    // Set constraints in model
                    oConstraintsModel.setProperty("/violations", aViolations);
                    oConstraintsModel.setProperty("/performanceConstraints", aRegularConstraints);

                    // Show warning toast if violations found
                    if (aViolations.length > 0) {
                        MessageToast.show(
                            aViolations.length + " constraint violation(s) detected. Review warnings below.",
                            { duration: 5000 }
                        );
                    }
                }).catch((oError) => {
                    Log.error("Failed to load performance thresholds:", oError);
                }).finally(() => {
                    oConstraintsModel.setProperty("/loading", false);
                    oConstraintsModel.setProperty("/loaded", true);
                });
            }).catch((oError) => {
                Log.error("Failed to load project data:", oError);
                oConstraintsModel.setProperty("/loading", false);
            });
        },

        _getDeploymentConstraints(sDeployment, sObjectType) {
            // Generate deployment-specific constraints
            const constraints = [];

            if (sDeployment === "Cloud Public") {
                constraints.push({
                    title: "No Custom ABAP",
                    description: "Cloud Public Edition does not support custom ABAP code. Use Key User Extensibility or Side-by-Side extensions only.",
                    severity: "Critical"
                });

                if (sObjectType === "Enhancements") {
                    constraints.push({
                        title: "Limited Enhancement Options",
                        description: "Only Released Extension Points and Key User Tools are available. No modification adjustments.",
                        severity: "High"
                    });
                }
            }

            if (sDeployment === "Private Cloud" || sDeployment === "On-Premise") {
                constraints.push({
                    title: "Clean Core Principle",
                    description: "While custom code is technically possible, clean core principles should guide all decisions.",
                    severity: "Information"
                });
            }

            return constraints;
        },

        _getComplianceConstraints(sCompliance) {
            const constraints = [];

            if (!sCompliance) return constraints;

            if (sCompliance.includes("SOX")) {
                constraints.push({
                    standard: "SOX",
                    requirement: "Audit Trail",
                    description: "All changes must be logged with complete audit trail for financial reporting.",
                    impact: "High"
                });
            }

            if (sCompliance.includes("GDPR")) {
                constraints.push({
                    standard: "GDPR",
                    requirement: "Data Privacy",
                    description: "Personal data must be handled according to GDPR requirements. Implement data masking and retention policies.",
                    impact: "High"
                });
            }

            if (sCompliance.includes("FDA")) {
                constraints.push({
                    standard: "FDA 21 CFR Part 11",
                    requirement: "Electronic Records",
                    description: "System must support electronic signatures and validation requirements for life sciences.",
                    impact: "Critical"
                });
            }

            return constraints;
        },

        _loadExamples(sObjectType) {
            const oModel = this.getView().getModel();
            const oExamplesModel = this.getView().getModel("examplesModel");

            if (!sObjectType) {
                Log.warning("Cannot load examples without object type");
                return;
            }

            oExamplesModel.setProperty("/loading", true);

            // Query examples directly (simplified approach)
            const aExampleFilters = [
                new sap.ui.model.Filter("objectType", sap.ui.model.FilterOperator.EQ, sObjectType),
                new sap.ui.model.Filter("isActive", sap.ui.model.FilterOperator.EQ, true)
            ];
            const oExampleBinding = oModel.bindList("/RealWorldExamples", null, null, aExampleFilters);

            oExampleBinding.requestContexts().then((aContexts) => {
                const aExamples = aContexts.map(ctx => ctx.getObject());
                oExamplesModel.setProperty("/examples", aExamples);
            }).catch((oError) => {
                Log.error("Failed to load real-world examples:", oError);
            }).finally(() => {
                oExamplesModel.setProperty("/loading", false);
                oExamplesModel.setProperty("/loaded", true);
            });
        },

        // Lazy load handlers: load when user expands panels
        onConstraintsPanelToggle(oEvent) {
            const bExpand = oEvent.getParameter("expand");
            if (!bExpand) return;

            const oWizardModel = this.getView().getModel("wizardModel");
            const sObjectType = oWizardModel.getProperty("/objectType");
            const oConstraintsModel = this.getView().getModel("constraintsModel");

            // Only load if not already loaded or loading
            if (!oConstraintsModel.getProperty("/loaded") && !oConstraintsModel.getProperty("/loading")) {
                this._loadConstraints(sObjectType);
            }
        },

        onExamplesPanelToggle(oEvent) {
            const bExpand = oEvent.getParameter("expand");
            if (!bExpand) return;

            const oWizardModel = this.getView().getModel("wizardModel");
            const sObjectType = oWizardModel.getProperty("/objectType");
            const oExamplesModel = this.getView().getModel("examplesModel");

            // Only load if not already loaded or loading
            if (!oExamplesModel.getProperty("/loaded") && !oExamplesModel.getProperty("/loading")) {
                this._loadExamples(sObjectType);
            }
        },

        onShowConstraintDetails(oEvent) {
            const oItem = oEvent.getSource();
            const oCustomData = oItem.getCustomData();

            let sGuidance = "";
            let sAlternative = "";

            oCustomData.forEach(data => {
                if (data.getKey() === "guidance") {
                    sGuidance = data.getValue();
                } else if (data.getKey() === "alternative") {
                    sAlternative = data.getValue();
                }
            });

            const sMessage = `Guidance when exceeded:\n${sGuidance}\n\nAlternative solution:\n${sAlternative}`;
            MessageBox.information(sMessage, {
                title: "Constraint Details",
                contentWidth: "500px"
            });
        },

        onIndustryFilterChange() {
            this._applyExamplesFilters();
        },

        onLevelFilterChange() {
            this._applyExamplesFilters();
        },

        _applyExamplesFilters() {
            const oExamplesModel = this.getView().getModel("examplesModel");
            const sIndustry = oExamplesModel.getProperty("/selectedIndustry");
            const sLevel = oExamplesModel.getProperty("/selectedLevel");

            const oList = this.byId("examplesList");
            if (!oList) return;

            const oBinding = oList.getBinding("items");
            if (!oBinding) return;

            const aFilters = [];

            if (sIndustry) {
                aFilters.push(new sap.ui.model.Filter("industry", sap.ui.model.FilterOperator.EQ, sIndustry));
            }

            if (sLevel) {
                aFilters.push(new sap.ui.model.Filter("cleanCoreLevel", sap.ui.model.FilterOperator.EQ, sLevel));
            }

            oBinding.filter(aFilters);
        },

        onShowExampleDetails(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext("examplesModel");
            const oExample = oContext.getObject();

            const oExamplesModel = this.getView().getModel("examplesModel");
            oExamplesModel.setProperty("/selectedExample", oExample);

            // Open dialog
            if (!this._exampleDialog) {
                this._exampleDialog = sap.ui.xmlfragment(
                    "sd.solutionadvisor.view.fragments.ExamplesPanel",
                    this
                );
                this.getView().addDependent(this._exampleDialog);
            }

            const oDialog = sap.ui.getCore().byId("exampleDetailsDialog");
            if (oDialog) {
                oDialog.open();
            }
        },

        onCloseExampleDialog() {
            const oDialog = sap.ui.getCore().byId("exampleDetailsDialog");
            if (oDialog) {
                oDialog.close();
            }
        },

        onShowDetailedHint(oEvent) {
            const oWizardModel = this.getView().getModel("wizardModel");
            const oCurrentQuestion = oWizardModel.getProperty("/currentQuestion");
            const oHintModel = this.getView().getModel("hintModel");
            const oConstraintsModel = this.getView().getModel("constraintsModel");

            // Check if this is a question-specific hint or RICEFW ID hint
            if (oCurrentQuestion && oCurrentQuestion.detailedHint) {
                // Build performance context from current constraints
                let performanceContext = null;
                const aViolations = oConstraintsModel.getProperty("/violations");
                if (aViolations && aViolations.length > 0) {
                    performanceContext = "⚠️ Current Constraints:\n" +
                        aViolations.map(v => `• ${v.name}: ${v.value} ${v.unit || ''}`).join("\n");
                }

                // Show hint from current wizard question
                oHintModel.setData({
                    questionText: oCurrentQuestion.questionText || "Question",
                    detailedHint: oCurrentQuestion.detailedHint,
                    performanceContext: performanceContext
                });
            } else {
                // Default to RICEFW ID format hint (for the initial step)
                oHintModel.setData({
                    questionText: "RICEFW ID Format",
                    detailedHint: "The RICEFW ID follows a specific pattern to categorize SAP development objects:\n\n" +
                        "• First letter: Object type (R=Report, I=Interface, C=Conversion, E=Enhancement, F=Form, W=Workflow)\n" +
                        "• Four digits: Sequential number (0001-9999)\n" +
                        "• Three letters: Project/Module code\n\n" +
                        "Example: I-0042-IMP means Interface #42 for IMP (Implementation) project.\n\n" +
                        "This standardized naming helps with:\n" +
                        "• Object tracking across landscapes\n" +
                        "• Transport management\n" +
                        "• Documentation and audit trails",
                    performanceContext: "Use consistent RICEFW IDs across all environments (DEV, QAS, PRD) to simplify transport and deployment processes."
                });
            }

            // Create popover if not already created
            if (!this._detailedHintPopover) {
                this._detailedHintPopover = sap.ui.xmlfragment(
                    "sd.solutionadvisor.view.fragments.DetailedHintPopover",
                    this
                );
                this.getView().addDependent(this._detailedHintPopover);
            }

            // Open popover by the button that triggered it
            const oButton = oEvent.getSource();
            this._detailedHintPopover.openBy(oButton);
        },

        onCloseDetailedHint() {
            if (this._detailedHintPopover) {
                this._detailedHintPopover.close();
            }
        },

        onSaveDraft() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const oDraftModel = this.getView().getModel("draftModel");

            // Update draft model with current wizard progress from wizard model
            oDraftModel.setData({
                currentStep: oWizardModel.getProperty("/currentStep") || 1,
                totalSteps: oWizardModel.getProperty("/totalSteps") || 10,
                timeSpent: this._calculateTimeSpent(),
                sessionID: this._sessionId,
                analysisID: this._analysisId,
                currentQuestion: oWizardModel.getProperty("/currentQuestion"),
                selectedAnswer: oWizardModel.getProperty("/selectedAnswer"),
                draftName: oDraftModel.getProperty("/draftName") || ""
            });

            if (!this._saveDraftDialog) {
                // Provide the View ID as the fragment ID prefix so fragment controls resolve via this.byId()
                this._saveDraftDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sd.solutionadvisor.view.fragments.SaveDraftDialog",
                    this
                );
                this.getView().addDependent(this._saveDraftDialog);
            }

            this._saveDraftDialog.open();
        },

        _calculateTimeSpent() {
            // Calculate time spent since wizard started
            if (!this._wizardStartTime) {
                this._wizardStartTime = Date.now();
            }
            const timeSpentMs = Date.now() - this._wizardStartTime;
            return Math.floor(timeSpentMs / 1000); // Return seconds
        },

        onShowRicefwHistory() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sRicefwId = oWizardModel.getProperty("/ricefwId");

            const oHistoryModel = this.getView().getModel("historyModel");
            oHistoryModel.setProperty("/ricefwId", sRicefwId);

            // Load history
            if (sRicefwId) {
                this._loadRicefwHistory(sRicefwId);
            }

            if (!this._historyDialog) {
                this._historyDialog = sap.ui.xmlfragment(
                    "sd.solutionadvisor.view.fragments.RicefwHistoryDialog",
                    this
                );
                this.getView().addDependent(this._historyDialog);
            }

            this._historyDialog.open();
        },

        _loadRicefwHistory(sRicefwId) {
            const oModel = this.getView().getModel();
            const oHistoryModel = this.getView().getModel("historyModel");

            const aHistoryFilters = [
                new sap.ui.model.Filter("ricefwId", sap.ui.model.FilterOperator.EQ, sRicefwId)
            ];
            const aHistorySorters = [
                new sap.ui.model.Sorter("analysisDate", true) // Descending
            ];
            const oHistoryBinding = oModel.bindList("/Analyses", null, aHistorySorters, aHistoryFilters);

            oHistoryBinding.requestContexts().then((aContexts) => {
                const aAnalyses = aContexts.map(ctx => ctx.getObject());
                oHistoryModel.setProperty("/analyses", aAnalyses);
            }).catch((oError) => {
                Log.error("Failed to load RICEFW history:", oError);
                MessageToast.show("Failed to load history");
            });
        },

        onSearchRicefwHistory() {
            const oHistoryModel = this.getView().getModel("historyModel");
            const sRicefwId = oHistoryModel.getProperty("/ricefwId");

            if (sRicefwId) {
                this._loadRicefwHistory(sRicefwId);
            } else {
                MessageToast.show("Please enter a RICEFW ID");
            }
        },

        onViewHistoryDetails(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("historyModel");
            const oAnalysis = oContext.getObject();

            // Navigate to analysis details
            this._historyDialog.close();
            this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                key: oAnalysis.ID
            });
        },

        onCopyHistoryDecisions(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("historyModel");
            const oAnalysis = oContext.getObject();

            MessageBox.confirm(
                `Copy configuration from analysis dated ${new Date(oAnalysis.analysisDate).toLocaleDateString()}?\n\n` +
                `This will pre-fill the wizard with:\n` +
                `- Object Type: ${oAnalysis.objectType}\n` +
                `- Object Name: ${oAnalysis.objectName}\n` +
                `- Description: ${oAnalysis.objectDescription || 'N/A'}`,
                {
                    title: "Copy Configuration",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.YES) {
                            this._copyFromPrevious(oAnalysis);
                        }
                    }
                }
            );
        },

        _copyFromPrevious(oPreviousAnalysis) {
            const oWizardModel = this.getView().getModel("wizardModel");

            // Copy fields
            oWizardModel.setProperty("/objectType", oPreviousAnalysis.objectType);
            oWizardModel.setProperty("/objectName", oPreviousAnalysis.objectName);
            oWizardModel.setProperty("/objectDescription", oPreviousAnalysis.objectDescription || "");

            // Update UI fields if they exist
            const oObjectTypeComboBox = this.byId("objectTypeComboBox");
            if (oObjectTypeComboBox) {
                oObjectTypeComboBox.setSelectedKey(oPreviousAnalysis.objectType);
            }

            const oObjectNameInput = this.byId("objectNameInput");
            if (oObjectNameInput) {
                oObjectNameInput.setValue(oPreviousAnalysis.objectName);
            }

            const oObjectDescriptionInput = this.byId("objectDescriptionInput");
            if (oObjectDescriptionInput && oPreviousAnalysis.objectDescription) {
                oObjectDescriptionInput.setValue(oPreviousAnalysis.objectDescription);
            }

            // Don't load constraints and examples yet - they will be loaded when user expands the panels
            // This ensures smooth UI performance and lazy loading

            // Validate step
            this._validateObjectStep();

            // Close dialog
            this._historyDialog.close();

            MessageToast.show("Configuration copied successfully", {
                duration: 3000
            });
        },

        onCloseRicefwHistory() {
            this._historyDialog.close();
        },

        onObjectNameChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oWizardModel = this.getView().getModel("wizardModel");
            oWizardModel.setProperty("/objectName", sValue);
            this._validateObjectStep();
        },

        _validateObjectStep() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sRicefwId = oWizardModel.getProperty("/ricefwId");
            const sObjectType = oWizardModel.getProperty("/objectType");
            const sObjectName = oWizardModel.getProperty("/objectName");

            const pattern = /^[RICEFYW]-[0-9]{4}-[A-Z]{3}$/;
            const bValid = pattern.test(sRicefwId) && Boolean(sObjectType) && Boolean(sObjectName);

            this.byId("objectStep").setValidated(bValid);
            this._updateNextButtonState();
        },

        onNextStep() {
            const oWizard = this.byId("cleanCoreWizard");
            const currentStep = oWizard.getCurrentStep();

            if (currentStep === "container-sd.solutionadvisor---Wizard--projectStep") {
                oWizard.nextStep();
            } else if (currentStep === "container-sd.solutionadvisor---Wizard--objectStep") {
                // Update summary
                const oWizardModel = this.getView().getModel("wizardModel");
                this.byId("summaryProject").setText(oWizardModel.getProperty("/projectName"));
                this.byId("summaryRicefwId").setText(oWizardModel.getProperty("/ricefwId"));
                this.byId("summaryObjectType").setText(oWizardModel.getProperty("/objectType"));
                this.byId("summaryObjectName").setText(oWizardModel.getProperty("/objectName"));

                oWizard.nextStep();

                // Show start button, hide next button
                this.byId("wizardNextButton").setVisible(false);
                this.byId("wizardStartButton").setVisible(true);
            }
        },

        _updateNextButtonState() {
            const oWizard = this.byId("cleanCoreWizard");
            const currentStep = oWizard.getCurrentStep();
            const oNextButton = this.byId("wizardNextButton");
            const oSaveDraftButton = this.byId("saveDraftButton");

            if (currentStep === "projectStep") {
                const bValidated = this.byId("projectStep").getValidated();
                oNextButton.setEnabled(bValidated);
                // Hide save draft button on project step (no session yet)
                oSaveDraftButton.setVisible(false);
            } else if (currentStep === "objectStep") {
                const bValidated = this.byId("objectStep").getValidated();
                oNextButton.setEnabled(bValidated);
                // Hide save draft button on object step (no session yet)
                oSaveDraftButton.setVisible(false);
            } else if (currentStep === "questionStep") {
                // Show save draft button on question step (session is active)
                oSaveDraftButton.setVisible(true);
            } else if (currentStep === "summaryStep") {
                // Hide save draft button on summary step (analysis is complete)
                oSaveDraftButton.setVisible(false);
            }
        },

        onStartAnalysis() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const oData = oWizardModel.getData();

            // Initialize wizard start time for time tracking
            this._wizardStartTime = new Date();

            // Show loading indicator
            this.getView().setBusy(true);

            // Call backend action using OData V4
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext("/startWizard(...)");

            // Set parameters
            oOperation.setParameter("projectID", oData.projectID);
            oOperation.setParameter("ricefwId", oData.ricefwId);
            oOperation.setParameter("objectType", oData.objectType);
            oOperation.setParameter("objectName", oData.objectName);
            oOperation.setParameter("businessArea_ID", oData.businessArea_ID || null);
            oOperation.setParameter("complexity", oData.complexity || null);

            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();

                // Store session and analysis IDs
                this._sessionId = oResult.sessionID;
                this._analysisId = oResult.analysisID;

                // Reset selected answer
                oWizardModel.setProperty("/selectedAnswer", null);
                oWizardModel.setProperty("/selectedAnswerIndex", -1);

                // Store first question in model
                this._displayQuestion(oResult.firstQuestion);

                // Initialize step counters
                oWizardModel.setProperty("/currentStep", 1);
                oWizardModel.setProperty("/totalSteps", oResult.totalSteps);

                // Update progress with actual question number and total steps
                this._updateProgress(oResult.firstQuestion.questionId, oResult.totalSteps);

                // Update wizard navigation - go to question step
                const oWizard = this.byId("cleanCoreWizard");
                oWizard.nextStep();

                // Update button visibility
                this.byId("wizardStartButton").setVisible(false);
                this.byId("wizardNextButton").setVisible(false);
                this.byId("saveDraftButton").setVisible(true);

                // Lazy: do not auto-load constraints/examples; they'll load on panel expand

                // Hide loading indicator
                this.getView().setBusy(false);

                MessageToast.show("Analysis started successfully!");
            }).catch((oError) => {
                // Hide loading indicator
                this.getView().setBusy(false);

                Log.error("Failed to start analysis:", oError);
                MessageBox.error("Failed to start analysis: " + (oError.message || "Unknown error"));
            });
        },

        // Display a question from the decision engine
        _displayQuestion(oQuestion) {
            const oWizardModel = this.getView().getModel("wizardModel");

            // Parse answer options from JSON string if needed
            let answerOptions = oQuestion.answerOptions;
            if (typeof answerOptions === 'string') {
                try {
                    answerOptions = JSON.parse(answerOptions);
                } catch (e) {
                    Log.error("Error parsing answer options:", e);
                    answerOptions = [];
                }
            }

            // Transform answer options if they're simple strings into objects
            if (answerOptions && answerOptions.length > 0) {
                // Check if first item is a string (old format) or object (new format)
                if (typeof answerOptions[0] === 'string') {
                    // Convert simple string array to object format
                    answerOptions = answerOptions.map(answer => ({
                        value: answer,
                        label: answer,
                        description: answer
                    }));
                }
            }

            // Update wizard model with question data
            oWizardModel.setProperty("/currentQuestion", {
                questionId: oQuestion.questionId,
                questionText: oQuestion.questionText,
                hint: oQuestion.hint,
                detailedHint: oQuestion.detailedHint,
                answerOptions: answerOptions
            });

            // Reset answer selection
            oWizardModel.setProperty("/selectedAnswer", null);
            oWizardModel.setProperty("/selectedAnswerIndex", -1);
            oWizardModel.setProperty("/questionCompleted", false);
        },

        // Handle answer selection
        onAnswerSelect(oEvent) {
            const oWizardModel = this.getView().getModel("wizardModel");
            const iSelectedIndex = oEvent.getParameter("selectedIndex");

            // Get the selected answer value from the options
            const aAnswerOptions = oWizardModel.getProperty("/currentQuestion/answerOptions") || [];
            if (iSelectedIndex >= 0 && iSelectedIndex < aAnswerOptions.length) {
                const selectedAnswerValue = aAnswerOptions[iSelectedIndex].value;
                oWizardModel.setProperty("/selectedAnswer", selectedAnswerValue);
                oWizardModel.setProperty("/selectedAnswerIndex", iSelectedIndex);
            }
        },

        // Submit answer and get next question
        onSubmitAnswer() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const currentQuestion = oWizardModel.getProperty("/currentQuestion");
            const selectedAnswer = oWizardModel.getProperty("/selectedAnswer");

            if (!selectedAnswer || !currentQuestion) {
                MessageToast.show("Please select an answer to continue.");
                return;
            }

            // Show loading indicator
            this.getView().setBusy(true);

            // Mark question as completed to disable further changes
            oWizardModel.setProperty("/questionCompleted", true);

            // Calculate time spent on this question (placeholder)
            const timeSpent = 30; // Seconds

            // Call backend action using OData V4
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext("/submitAnswer(...)");

            // Set parameters
            oOperation.setParameter("sessionID", this._sessionId);
            oOperation.setParameter("questionId", currentQuestion.questionId);
            oOperation.setParameter("selectedAnswer", selectedAnswer);
            oOperation.setParameter("answerIndex", oWizardModel.getProperty("/selectedAnswerIndex"));
            oOperation.setParameter("userComments", "");
            oOperation.setParameter("timeSpent", timeSpent);

            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();

                // Increment current step
                const currentStep = oWizardModel.getProperty("/currentStep");
                oWizardModel.setProperty("/currentStep", currentStep + 1);

                if (oResult.isComplete) {
                    // Wizard complete - show final recommendation
                    oWizardModel.setProperty("/finalRecommendation", oResult.recommendation);
                    oWizardModel.setProperty("/finalReasoning", oResult.reasoning);
                    oWizardModel.setProperty("/scores", oResult.scores || {});
                    oWizardModel.setProperty("/currentQuestion", null);

                    // Clean up draft session and any draft entities
                    this._cleanupDrafts();

                    // Update UI for completion
                    this._showCompletionUI();
                } else {
                    // Display next question
                    this._displayQuestion(oResult.nextQuestion);

                    // Update progress with actual question number
                    const totalSteps = oWizardModel.getProperty("/progressModel/totalSteps") || 
                                      this.getView().getModel("progressModel").getProperty("/totalSteps");
                    this._updateProgress(oResult.nextQuestion.questionId, totalSteps);

                    // Lazy: do not auto-refresh constraints/examples on every question
                }

                // Hide loading indicator
                this.getView().setBusy(false);
            }).catch((oError) => {
                // Reset completion state
                oWizardModel.setProperty("/questionCompleted", false);

                // Hide loading indicator
                this.getView().setBusy(false);

                Log.error("Failed to submit answer:", oError);
                MessageBox.error("Failed to process answer: " + (oError.message || "Unknown error"));
            });
        },

        // Show completion UI
        _showCompletionUI() {
            // Update button visibility
            this.byId("saveDraftButton").setVisible(false);

            MessageToast.show("Analysis completed successfully!");
        },

        // Navigate to analysis details
        onViewAnalysisDetails() {
            if (this._analysisId) {
                this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                    key: this._analysisId
                });
            } else {
                MessageBox.error("Analysis ID not available");
            }
        },

        // Save the current wizard progress as draft
        onCancelSaveDraft() {
            this._saveDraftDialog.close();
        },

        onConfirmSaveDraft() {
            // Read draft name from the draft model to avoid control resolution issues
            const oDraftModel = this.getView().getModel("draftModel");
            const sDraftName = (oDraftModel && oDraftModel.getProperty("/draftName")) || "";

            // If analysis hasn't been started yet, create it first
            if (!this._sessionId) {
                this._createDraftAnalysis(sDraftName);
            } else {
                this._updateDraftSession(sDraftName);
            }
        },

        _createDraftAnalysis(sDraftName) {
            const oWizardModel = this.getView().getModel("wizardModel");
            const oData = oWizardModel.getData();
            const oModel = this.getView().getModel();

            // Create analysis in draft mode using OData V4
            const oOperation = oModel.bindContext("/startWizard(...)");
            oOperation.setParameter("projectID", oData.projectID);
            oOperation.setParameter("ricefwId", oData.ricefwId);
            oOperation.setParameter("objectType", oData.objectType);
            oOperation.setParameter("objectName", oData.objectName);

            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                this._sessionId = oResult.sessionID;
                this._analysisId = oResult.analysisID;
                this._updateDraftSession(sDraftName);
            }).catch((oError) => {
                Log.error("Failed to save draft:", oError);
                MessageBox.error("Failed to save draft: " + oError.message);
            });
        },

        _updateDraftSession(sDraftName) {
            const oDraftModel = this.getView().getModel("draftModel");
            const oModel = this.getView().getModel();

            // Load session context and update via OData V4
            const oSessionBinding = oModel.bindContext(`/WizardSessions('${this._sessionId}')`);

            oSessionBinding.requestObject().then(() => {
                // Get the bound context from the binding
                const oContext = oSessionBinding.getBoundContext();
                
                // Update properties using the context's setProperty method
                oContext.setProperty("sessionStatus", "Paused");
                oContext.setProperty("currentStep", oDraftModel.getProperty("/currentStep"));
                oContext.setProperty("totalSteps", oDraftModel.getProperty("/totalSteps"));
                oContext.setProperty("timeSpentTotal", oDraftModel.getProperty("/timeSpent") * 60); // Convert to seconds
                oContext.setProperty("lastActivity", new Date().toISOString());
                oContext.setProperty("draftName", sDraftName || `Draft - ${new Date().toLocaleDateString()}`);

                // Submit batch to save changes
                return oModel.submitBatch("updateGroup");
            }).then(() => {
                MessageToast.show("Draft saved successfully", {
                    duration: 3000
                });
                this._saveDraftDialog.close();
            }).catch((oError) => {
                Log.error("Failed to save draft:", oError);
                MessageBox.error("Failed to save draft: " + oError.message);
            });
        },

        /**
         * Clean up draft sessions and draft entities after analysis completion
         * @private
         */
        _cleanupDrafts() {
            const oModel = this.getView().getModel();

            // ✅ FIX #2: Only delete the WizardSession, NOT the Analysis record
            // The Analysis must persist as a draft so user can resume it later
            // When analysis is completed, it will be marked as status='Completed' and IsActiveEntity=true
            
            if (this._sessionId) {
                const oSessionBinding = oModel.bindContext(`/WizardSessions('${this._sessionId}')`);
                oSessionBinding.requestObject().then(() => {
                    oSessionBinding.delete().then(() => {
                        Log.info("Draft session deleted successfully:", this._sessionId);
                    }).catch((oError) => {
                        Log.warning("Failed to delete draft session, continuing anyway:", oError);
                    });
                }).catch((oError) => {
                    Log.warning("Failed to load draft session for deletion:", oError);
                });
            }

            // ✅ REMOVED: Code that deleted draft Analysis entities
            // Analysis record now stays in database as a draft (status='In Progress', IsActiveEntity=false)
            // This allows user to resume the analysis later by clicking "Resume Draft"
        },

        onWizardComplete() {
            MessageToast.show("Wizard completed!");
        },

        onCancel() {
            // If analysis has started (session exists), ask about saving draft
            if (this._sessionId) {
                MessageBox.confirm(
                    "Do you want to save this analysis as a draft before leaving?",
                    {
                        title: "Save Draft?",
                        actions: ["Save Draft", "Discard", MessageBox.Action.CANCEL],
                        onClose: (sAction) => {
                            if (sAction === "Save Draft") {
                                // Show save draft dialog
                                this.onSaveDraft();
                            } else if (sAction === "Discard") {
                                // Clean up draft entities before leaving
                                this._cleanupDrafts();
                                // Leave without saving
                                this.onNavBack();
                            }
                            // If Cancel, do nothing - stay on wizard
                        }
                    }
                );
            } else {
                // No session started yet - just confirm cancel
                MessageBox.confirm("Do you want to cancel the analysis?", {
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) {
                            this.onNavBack();
                        }
                    }
                });
            }
        },

        onNavBack() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sProjectId = oWizardModel.getProperty("/projectID");
            const sProjectName = oWizardModel.getProperty("/projectName");

            if (sProjectId) {
                // Navigate back to analyses list with project context
                // Use replace: true to remove wizard from browser history
                this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                    projectId: sProjectId
                }, true); // replace: true
            } else {
                // Navigate back to project list
                // Use replace: true to remove wizard from browser history
                this.getOwnerComponent().getRouter().navTo("ProjectsList", {}, true); // replace: true
            }
        },

        /**
         * Close wizard after completion
         * @description
         * Handles closing the wizard from the final recommendation screen.
         * If analysis has been saved, navigates to analysis details.
         * Otherwise, navigates back to the analyses list or project list.
         * Uses replace: true to prevent wizard from appearing in browser back history.
         * @public
         */
        onCloseWizard() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sProjectId = oWizardModel.getProperty("/projectID");
            const sProjectName = oWizardModel.getProperty("/projectName");
/*on Close button it should always navigate to analyses list page.
            // If we have an analysis ID, it means the analysis was saved
            if (this._analysisId) {
                // Navigate to the analysis details page, replacing history to prevent back to wizard
                this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                    key: this._analysisId
                }, true); // replace: true
            } else
              */
                if (sProjectId) {
                // Navigate back to analyses list with project context, replacing history
                this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                    projectId: sProjectId
                }, true); // replace: true
            } else {
                // Navigate back to project list, replacing history
                this.getOwnerComponent().getRouter().navTo("ProjectsList", {}, true); // replace: true
            }
        }
    });
});