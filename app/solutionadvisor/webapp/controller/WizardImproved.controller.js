sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/ErrorHandler"
], (Controller, JSONModel, MessageToast, MessageBox, ErrorHandler) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.WizardImproved", {
        onInit() {
            // Initialize models
            this._initModels();
            
            // Initialize time tracking
            this._wizardStartTime = new Date();
            this._questionStartTime = new Date();
            this._sessionId = null;
            this._analysisId = null;
            this._currentQuestionId = null;
            this._answeredQuestions = [];
            
            // Use mock service if configured
            this._useMockService = window.USE_MOCK_SERVICE === true;
            if (this._useMockService) {
                sap.ui.require(["sd/solutionadvisor/localService/MockAnalysisService"], (MockAnalysisService) => {
                    this._mockService = new MockAnalysisService();
                });
            }
            
            // Initialize error handler
            this._errorHandler = new ErrorHandler();
            
            // Attach to route matched event
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Wizard").attachPatternMatched(this._onRouteMatched, this);
        },
        
        /**
         * Initialize all models used by this controller
         */
        _initModels() {
            // Initialize wizard model
            const oWizardModel = new JSONModel({
                projectID: "",
                projectName: "",
                ricefwId: "",
                objectType: "",
                objectName: "",
                objectDescription: "",
                autoSelectedProject: false
            });
            this.getView().setModel(oWizardModel, "wizardModel");
            
            // Initialize question model
            const oQuestionModel = new JSONModel({
                questionId: "",
                questionText: "",
                answerOptions: [],
                hint: "",
                detailedHint: "",
                performanceContext: {}
            });
            this.getView().setModel(oQuestionModel, "questionModel");
            
            // Initialize constraints model
            const oConstraintsModel = new JSONModel({
                performanceConstraints: [],
                deploymentConstraints: [],
                complianceConstraints: []
            });
            this.getView().setModel(oConstraintsModel, "constraintsModel");
            
            // Initialize examples model
            const oExamplesModel = new JSONModel({
                examples: [],
                selectedExample: {},
                selectedIndustry: "",
                selectedLevel: ""
            });
            this.getView().setModel(oExamplesModel, "examplesModel");
            
            // Initialize progress model
            const oProgressModel = new JSONModel({
                currentStep: 1,
                totalSteps: 10,
                progress: 10,
                answeredQuestions: []
            });
            this.getView().setModel(oProgressModel, "progressModel");
            
            // Initialize draft model
            const oDraftModel = new JSONModel({
                draftName: "",
                timeSpent: 0
            });
            this.getView().setModel(oDraftModel, "draftModel");
        },
        
        _onRouteMatched(oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            const sProjectId = oArgs.projectId;
            const sSessionId = oArgs.sessionId;
            
            if (sSessionId) {
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
                this._errorHandler.showServiceError(oError, "Failed to load project");
            });
        },
        
        /**
         * Resume wizard from saved session
         * @param {string} sSessionId - Session ID to resume
         */
        _resumeSession(sSessionId) {
            const oModel = this.getView().getModel();
            
            this.getView().setBusy(true);
            
            if (this._useMockService) {
                setTimeout(() => {
                    // Mock implementation for resume wizard
                    this._sessionId = "mock-session-id";
                    this._analysisId = "mock-analysis-id";
                    this._displayMockQuestion();
                    this.getView().setBusy(false);
                    MessageToast.show("Session resumed (mock mode)");
                }, 1000);
                return;
            }
            
            // Call backend action to resume wizard
            const oOperation = oModel.bindContext("/resumeWizard(...)");
            oOperation.setParameter("sessionID", sSessionId);
            
            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                
                // Store session and analysis ID
                this._sessionId = sSessionId;
                
                // Display current question
                const oQuestion = oResult.currentQuestion;
                this._displayQuestion(oQuestion);
                
                // Update progress
                const oProgress = oResult.progress;
                this._updateProgress(oProgress.currentStep, oProgress.totalSteps);
                
                // Parse answered path to restore previous answers
                const answeredPath = JSON.parse(oProgress.answeredPath || "[]");
                this._answeredQuestions = answeredPath;
                
                this.getView().setBusy(false);
                MessageToast.show("Session resumed successfully", { duration: 3000 });
            }).catch((oError) => {
                this.getView().setBusy(false);
                this._errorHandler.showServiceError(oError, "Failed to resume session");
                this._resetWizard();
            });
        },
        
        /**
         * Reset wizard to initial state
         */
        _resetWizard() {
            // Reset models
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
            
            const oProgressModel = this.getView().getModel("progressModel");
            oProgressModel.setData({
                currentStep: 1,
                totalSteps: 10,
                progress: 10,
                answeredQuestions: []
            });
            
            // Reset wizard
            this.byId("projectStep").setValidated(false);
            this.byId("objectStep").setValidated(false);
            
            const oWizard = this.byId("cleanCoreWizard");
            oWizard.discardProgress(this.byId("projectStep"));
            
            // Reset state variables
            this._wizardStartTime = new Date();
            this._questionStartTime = new Date();
            this._sessionId = null;
            this._analysisId = null;
            this._currentQuestionId = null;
            this._answeredQuestions = [];
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
                
                // Load constraints and examples for this object type
                this._loadConstraints(oSelectedItem.getKey());
                this._loadExamples(oSelectedItem.getKey());
            }
            this._validateObjectStep();
        },
        
        onObjectNameChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oWizardModel = this.getView().getModel("wizardModel");
            oWizardModel.setProperty("/objectName", sValue);
            this._validateObjectStep();
        },
        
        onObjectDescriptionChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oWizardModel = this.getView().getModel("wizardModel");
            oWizardModel.setProperty("/objectDescription", sValue);
        },
        
        /**
         * Validate object step before allowing navigation
         */
        _validateObjectStep() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sRicefwId = oWizardModel.getProperty("/ricefwId");
            const sObjectType = oWizardModel.getProperty("/objectType");
            const sObjectName = oWizardModel.getProperty("/objectName");
            
            const pattern = /^[RICEFYW]-[0-9]{4}-[A-Z]{3}$/;
            const bValid = pattern.test(sRicefwId) && sObjectType && sObjectName;
            
            this.byId("objectStep").setValidated(bValid);
        },
        
        /**
         * Start analysis and initialize wizard session
         */
        onStartAnalysis() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const oData = oWizardModel.getData();
            
            // Check if we are in mock mode
            if (this._useMockService && this._mockService) {
                this._sessionId = "mock-session-id";
                this._analysisId = "mock-analysis-id";
                this._displayMockQuestion();
                return;
            }
            
            // Show busy indicator
            this.getView().setBusy(true);
            
            // Call backend action using OData V4
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext("/startWizard(...)");
            oOperation.setParameter("projectID", oData.projectID);
            oOperation.setParameter("ricefwId", oData.ricefwId);
            oOperation.setParameter("objectType", oData.objectType);
            oOperation.setParameter("objectName", oData.objectName);
            
            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                
                // Store session ID and analysis ID
                this._sessionId = oResult.sessionID;
                this._analysisId = oResult.analysisID;
                
                // Display first question
                this._displayQuestion(oResult.firstQuestion);
                
                // Update progress
                this._updateProgress(1, 10); // Initial estimate, will be updated with actual count
                
                // Load constraints and examples for first question
                this._loadConstraintsForQuestion(oResult.firstQuestion.questionId);
                this._loadExamplesForQuestion(oResult.firstQuestion.questionId, oData.objectType);
                
                this.getView().setBusy(false);
                this._showWizardContent(true);
            }).catch((oError) => {
                this.getView().setBusy(false);
                this._errorHandler.showServiceError(oError, "Failed to start analysis");
            });
        },
        
        /**
         * Display mock question for testing
         */
        _displayMockQuestion() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sObjectType = oWizardModel.getProperty("/objectType");
            
            // Get a mock question based on object type
            const oMockQuestion = this._mockService.getFirstQuestion(sObjectType);
            
            // Display the question
            this._displayQuestion(oMockQuestion);
            
            // Update progress
            this._updateProgress(1, 10);
            
            // Show wizard content
            this._showWizardContent(true);
        },
        
        /**
         * Display question in the wizard UI
         */
        _displayQuestion(question) {
            // Store current question ID
            this._currentQuestionId = question.questionId;
            this._questionStartTime = new Date();
            
            // Update question model
            const oQuestionModel = this.getView().getModel("questionModel");
            oQuestionModel.setData(question);
        },
        
        /**
         * Update wizard progress
         */
        _updateProgress(currentStep, totalSteps) {
            const oProgressModel = this.getView().getModel("progressModel");
            const progress = Math.round((currentStep / totalSteps) * 100);
            
            oProgressModel.setData({
                currentStep: currentStep,
                totalSteps: totalSteps,
                progress: progress,
                answeredQuestions: this._answeredQuestions
            });
        },
        
        /**
         * Show wizard question content and hide setup steps
         */
        _showWizardContent(show) {
            this.byId("wizardSetupSteps").setVisible(!show);
            this.byId("wizardQuestionContent").setVisible(show);
        },
        
        /**
         * Handle answer selection
         */
        onAnswerSelect(oEvent) {
            const oSelectedItem = oEvent.getSource();
            const sSelectedAnswer = oSelectedItem.getBindingContext("questionModel").getObject().value;
            const iSelectedIndex = parseInt(oSelectedItem.data("answerIndex") || "0", 10);
            
            // Calculate time spent on this question
            const timeSpent = Math.round((new Date() - this._questionStartTime) / 1000); // in seconds
            
            // Show busy indicator
            this.getView().setBusy(true);
            
            // Check if we are in mock mode
            if (this._useMockService && this._mockService) {
                setTimeout(() => {
                    const result = this._mockService.submitAnswer(
                        this._currentQuestionId, 
                        sSelectedAnswer
                    );
                    
                    this._processAnswerResult(result, sSelectedAnswer, iSelectedIndex, timeSpent);
                    this.getView().setBusy(false);
                }, 1000);
                return;
            }
            
            // Call backend action using OData V4
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext("/submitAnswer(...)");
            oOperation.setParameter("sessionID", this._sessionId);
            oOperation.setParameter("questionId", this._currentQuestionId);
            oOperation.setParameter("selectedAnswer", sSelectedAnswer);
            oOperation.setParameter("answerIndex", iSelectedIndex);
            oOperation.setParameter("timeSpent", timeSpent);
            
            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                this._processAnswerResult(oResult, sSelectedAnswer, iSelectedIndex, timeSpent);
                this.getView().setBusy(false);
            }).catch((oError) => {
                this.getView().setBusy(false);
                this._errorHandler.showServiceError(oError, "Failed to submit answer");
            });
        },
        
        /**
         * Process the result of submitting an answer
         */
        _processAnswerResult(result, selectedAnswer, answerIndex, timeSpent) {
            // Add to answered questions
            this._answeredQuestions.push({
                questionId: this._currentQuestionId,
                selectedAnswer: selectedAnswer,
                answerIndex: answerIndex,
                timeSpent: timeSpent
            });
            
            if (result.isComplete) {
                // Wizard is complete, show recommendation
                this._showRecommendation(result.recommendation, result.reasoning, result.scores);
            } else {
                // Continue wizard with next question
                this._displayQuestion(result.nextQuestion);
                
                // Update progress
                const oProgressModel = this.getView().getModel("progressModel");
                const currentStep = oProgressModel.getProperty("/currentStep") + 1;
                const totalSteps = oProgressModel.getProperty("/totalSteps");
                this._updateProgress(currentStep, totalSteps);
                
                // Load constraints and examples for next question
                this._loadConstraintsForQuestion(result.nextQuestion.questionId);
                this._loadExamplesForQuestion(result.nextQuestion.questionId);
            }
        },
        
        /**
         * Show final recommendation
         */
        _showRecommendation(recommendation, reasoning, scores) {
            // Hide question content, show recommendation
            this.byId("wizardQuestionContent").setVisible(false);
            this.byId("wizardRecommendationContent").setVisible(true);
            
            // Update recommendation model
            const oRecommendationModel = new JSONModel({
                level: recommendation,
                reasoning: reasoning,
                scores: scores || {
                    technicalDebt: 35,
                    cloudReadiness: 80,
                    upgradeImpact: 25,
                    compositeHealth: 75
                }
            });
            this.getView().setModel(oRecommendationModel, "recommendationModel");
            
            // Update progress to 100%
            const oProgressModel = this.getView().getModel("progressModel");
            oProgressModel.setProperty("/progress", 100);
        },
        
        /**
         * Load constraints specific to a question
         */
        _loadConstraintsForQuestion(questionId) {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sObjectType = oWizardModel.getProperty("/objectType");
            
            if (this._useMockService && this._mockService) {
                const constraints = this._mockService.getConstraints(sObjectType, questionId);
                const oConstraintsModel = this.getView().getModel("constraintsModel");
                oConstraintsModel.setData(constraints);
                return;
            }
            
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext("/getRelevantConstraints(...)");
            oOperation.setParameter("objectType", sObjectType);
            oOperation.setParameter("questionContext", questionId);
            
            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                const oConstraintsModel = this.getView().getModel("constraintsModel");
                oConstraintsModel.setData(oResult);
            }).catch((oError) => {
                console.error("Failed to load constraints:", oError);
                // Not critical, continue without constraints
            });
        },
        
        /**
         * Load examples specific to a question
         */
        _loadExamplesForQuestion(questionId, objectType) {
            // Use the object type from model if not provided
            const oWizardModel = this.getView().getModel("wizardModel");
            const sObjectType = objectType || oWizardModel.getProperty("/objectType");
            
            if (this._useMockService && this._mockService) {
                const examples = this._mockService.getExamples(sObjectType);
                const oExamplesModel = this.getView().getModel("examplesModel");
                oExamplesModel.setProperty("/examples", examples);
                return;
            }
            
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext("/getContextualExamples(...)");
            oOperation.setParameter("objectType", sObjectType);
            oOperation.setParameter("questionContext", questionId);
            
            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                const oExamplesModel = this.getView().getModel("examplesModel");
                oExamplesModel.setProperty("/examples", oResult.value || []);
            }).catch((oError) => {
                console.error("Failed to load examples:", oError);
                // Not critical, continue without examples
            });
        },
        
        /**
         * Show detailed hint popover
         */
        onShowDetailedHint() {
            const oQuestionModel = this.getView().getModel("questionModel");
            
            if (!this._detailedHintPopover) {
                this._detailedHintPopover = sap.ui.xmlfragment(
                    "sd.solutionadvisor.view.fragments.DetailedHintPopover",
                    this
                );
                this.getView().addDependent(this._detailedHintPopover);
            }
            
            this._detailedHintPopover.openBy(this.byId("hintButton"));
        },
        
        onCloseDetailedHint() {
            if (this._detailedHintPopover) {
                this._detailedHintPopover.close();
            }
        },
        
        /**
         * Save current wizard progress as draft
         */
        onSaveDraft() {
            if (!this._sessionId) {
                MessageToast.show("Cannot save draft before starting analysis");
                return;
            }
            
            const oProgressModel = this.getView().getModel("progressModel");
            const oDraftModel = this.getView().getModel("draftModel");
            
            // Update draft model with current progress
            oDraftModel.setProperty("/timeSpent", this._calculateTimeSpent());
            
            if (!this._saveDraftDialog) {
                this._saveDraftDialog = sap.ui.xmlfragment(
                    "sd.solutionadvisor.view.fragments.SaveDraftDialog",
                    this
                );
                this.getView().addDependent(this._saveDraftDialog);
            }
            
            this._saveDraftDialog.open();
        },
        
        onConfirmSaveDraft() {
            const oDraftModel = this.getView().getModel("draftModel");
            const sDraftName = oDraftModel.getProperty("/draftName") || 
                              "Draft " + new Date().toLocaleDateString();
            
            // Show busy indicator
            this.getView().setBusy(true);
            
            if (this._useMockService) {
                setTimeout(() => {
                    MessageToast.show("Draft saved successfully (mock mode)");
                    this._saveDraftDialog.close();
                    this.getView().setBusy(false);
                }, 1000);
                return;
            }
            
            // Call backend to save draft
            const oModel = this.getView().getModel();
            const oBinding = oModel.bindContext(`/WizardSessions('${this._sessionId}')`);
            
            oBinding.requestObject().then(() => {
                oBinding.setProperty("sessionStatus", "Paused");
                oBinding.setProperty("draftName", sDraftName);
                oBinding.setProperty("lastActivity", new Date().toISOString());
                
                oModel.submitBatch("draftGroup").then(() => {
                    MessageToast.show("Draft saved successfully");
                    this._saveDraftDialog.close();
                    this.getView().setBusy(false);
                }).catch((oError) => {
                    this._errorHandler.showServiceError(oError, "Failed to save draft");
                    this.getView().setBusy(false);
                });
            }).catch((oError) => {
                this._errorHandler.showServiceError(oError, "Failed to load session");
                this.getView().setBusy(false);
            });
        },
        
        onCancelSaveDraft() {
            this._saveDraftDialog.close();
        },
        
        /**
         * Navigate to analysis details
         */
        onViewAnalysisDetails() {
            if (!this._analysisId) {
                MessageToast.show("Analysis not created yet");
                return;
            }
            
            // Navigate to analysis details
            this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                key: this._analysisId
            });
        },
        
        /**
         * Calculate time spent in wizard
         */
        _calculateTimeSpent() {
            if (!this._wizardStartTime) {
                this._wizardStartTime = new Date();
                return 0;
            }
            
            const diffMs = new Date() - this._wizardStartTime;
            const diffMins = Math.round(diffMs / 60000);
            return diffMins;
        },
        
        onCancel() {
            MessageBox.confirm("Do you want to cancel the analysis?", {
                onClose: (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        this.onNavBack();
                    }
                }
            });
        },
        
        onNavBack() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sProjectId = oWizardModel.getProperty("/projectID");
            
            if (sProjectId) {
                // Navigate back to analyses list with project context
                this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                    projectId: sProjectId
                });
            } else {
                // Navigate back to project list
                this.getOwnerComponent().getRouter().navTo("ProjectsList");
            }
        }
    });
});