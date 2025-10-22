sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, JSONModel, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.Wizard", {
        onInit() {
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
            
            // Initialize time tracking
            this._wizardStartTime = new Date();
            this._sessionId = null;
            this._analysisId = null;
            
            // Attach to route matched event
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Wizard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched(oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            const sProjectId = oArgs.projectId;
            
            if (sProjectId) {
                // Project was pre-selected from project list
                this._autoSelectProject(sProjectId);
            } else {
                // Reset wizard if no project selected
                const oWizardModel = this.getView().getModel("wizardModel");
                oWizardModel.setProperty("/projectID", "");
                oWizardModel.setProperty("/projectName", "");
                oWizardModel.setProperty("/autoSelectedProject", false);
                this.byId("projectStep").setValidated(false);
            }
        },

        _autoSelectProject(sProjectId) {
            // Load project details and auto-select
            const oModel = this.getView().getModel();
            oModel.read("/Projects('" + sProjectId + "')", {
                success: (oData) => {
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
                },
                error: (oError) => {
                    console.error("Failed to load project:", oError);
                }
            });
        },

        onProjectStepActivate() {
            this._updateNextButtonState();
        },

        onObjectStepActivate() {
            this._updateNextButtonState();
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
                
                // Load constraints and examples for this object type
                this._loadConstraints(oSelectedItem.getKey());
                this._loadExamples(oSelectedItem.getKey());
            }
            this._validateObjectStep();
        },
        
        _loadConstraints(sObjectType) {
            const oModel = this.getView().getModel();
            const oConstraintsModel = this.getView().getModel("constraintsModel");
            const oWizardModel = this.getView().getModel("wizardModel");
            
            // Get project details for deployment type
            const sProjectId = oWizardModel.getProperty("/projectID");
            
            // Load performance thresholds
            oModel.read("/PerformanceThresholds", {
                filters: [
                    new sap.ui.model.Filter("applicableObjectTypes", sap.ui.model.FilterOperator.Contains, sObjectType),
                    new sap.ui.model.Filter("isActive", sap.ui.model.FilterOperator.EQ, true)
                ],
                success: (oData) => {
                    oConstraintsModel.setProperty("/performanceConstraints", oData.results || []);
                },
                error: (oError) => {
                    console.error("Failed to load performance constraints:", oError);
                }
            });
            
            // Load deployment constraints (if project is selected)
            if (sProjectId) {
                oModel.read("/Projects('" + sProjectId + "')", {
                    success: (oProjectData) => {
                        const aDeploymentConstraints = this._getDeploymentConstraints(
                            oProjectData.s4HanaFlavor,
                            sObjectType
                        );
                        oConstraintsModel.setProperty("/deploymentConstraints", aDeploymentConstraints);
                        
                        // Load compliance constraints
                        const aComplianceConstraints = this._getComplianceConstraints(
                            oProjectData.complianceRequirements
                        );
                        oConstraintsModel.setProperty("/complianceConstraints", aComplianceConstraints);
                    }
                });
            }
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
            
            oModel.read("/RealWorldExamples", {
                filters: [
                    new sap.ui.model.Filter("objectType", sap.ui.model.FilterOperator.EQ, sObjectType),
                    new sap.ui.model.Filter("isActive", sap.ui.model.FilterOperator.EQ, true)
                ],
                success: (oData) => {
                    oExamplesModel.setProperty("/examples", oData.results || []);
                },
                error: (oError) => {
                    console.error("Failed to load examples:", oError);
                }
            });
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
        
        onIndustryFilterChange(oEvent) {
            this._applyExamplesFilters();
        },
        
        onLevelFilterChange(oEvent) {
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
        
        onShowDetailedHint() {
            // Load hint for RICEFW ID format
            const oHintModel = this.getView().getModel("hintModel");
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
            
            if (!this._detailedHintPopover) {
                this._detailedHintPopover = sap.ui.xmlfragment(
                    "sd.solutionadvisor.view.fragments.DetailedHintPopover",
                    this
                );
                this.getView().addDependent(this._detailedHintPopover);
            }
            
            const oButton = this.byId("ricefwIdLabel")?.getParent().getItems()[1];
            this._detailedHintPopover.openBy(oButton || this.byId("ricefwIdInput"));
        },
        
        onCloseDetailedHint() {
            if (this._detailedHintPopover) {
                this._detailedHintPopover.close();
            }
        },
        
        onSaveDraft() {
            const oWizard = this.byId("cleanCoreWizard");
            const oDraftModel = this.getView().getModel("draftModel");
            
            // Update draft model with current progress
            oDraftModel.setData({
                currentStep: oWizard.getCurrentStep() === "projectStep" ? 1 : 
                            oWizard.getCurrentStep() === "objectStep" ? 2 : 3,
                totalSteps: 3,
                timeSpent: Math.floor(Math.random() * 30) + 5 // Placeholder - would track actual time
            });
            
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
            const oWizardModel = this.getView().getModel("wizardModel");
            const oData = oWizardModel.getData();
            
            // In a real implementation, this would save to WizardSession entity
            const draftName = sap.ui.getCore().byId("draftNameInput")?.getValue() || 
                             `Draft - ${oData.objectName || oData.ricefwId}`;
            
            // Placeholder for actual save logic
            MessageToast.show(`Draft "${draftName}" saved successfully. You can resume this analysis later.`);
            
            this._saveDraftDialog.close();
        },
        
        onCancelSaveDraft() {
            this._saveDraftDialog.close();
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
            
            oModel.read("/Analyses", {
                filters: [
                    new sap.ui.model.Filter("ricefwId", sap.ui.model.FilterOperator.EQ, sRicefwId)
                ],
                sorters: [
                    new sap.ui.model.Sorter("analysisDate", true) // Descending
                ],
                success: (oData) => {
                    oHistoryModel.setProperty("/analyses", oData.results || []);
                },
                error: (oError) => {
                    console.error("Failed to load RICEFW history:", oError);
                    MessageToast.show("Failed to load history");
                }
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
            
            // Load constraints and examples for copied object type
            if (oPreviousAnalysis.objectType) {
                this._loadConstraints(oPreviousAnalysis.objectType);
                this._loadExamples(oPreviousAnalysis.objectType);
            }
            
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
            const bValid = pattern.test(sRicefwId) && sObjectType && sObjectName;
            
            this.byId("objectStep").setValidated(bValid);
            this._updateNextButtonState();
        },

        onNextStep() {
            const oWizard = this.byId("cleanCoreWizard");
            const currentStep = oWizard.getCurrentStep();
            
            if (currentStep === "projectStep") {
                oWizard.nextStep();
            } else if (currentStep === "objectStep") {
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
            
            if (currentStep === "projectStep") {
                const bValidated = this.byId("projectStep").getValidated();
                oNextButton.setEnabled(bValidated);
            } else if (currentStep === "objectStep") {
                const bValidated = this.byId("objectStep").getValidated();
                oNextButton.setEnabled(bValidated);
            }
        },

        onStartAnalysis() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const oData = oWizardModel.getData();
            
            // Call backend to start wizard
            const oModel = this.getView().getModel();
            const sPath = "/startWizard";
            
            oModel.callFunction(sPath, {
                method: "POST",
                urlParameters: {
                    projectID: oData.projectID,
                    ricefwId: oData.ricefwId,
                    objectType: oData.objectType,
                    objectName: oData.objectName
                },
                success: (oResult) => {
                    MessageToast.show("Analysis started successfully!");
                    // Store session ID for draft saving
                    this._sessionId = oResult.sessionID;
                    this._analysisId = oResult.analysisID;
                    // Navigate to analysis details
                    this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                        key: oResult.analysisID
                    });
                },
                error: (oError) => {
                    MessageBox.error("Failed to start analysis: " + oError.message);
                }
            });
        },

        onSaveDraft() {
            // Update draft model with current progress
            const oWizard = this.byId("cleanCoreWizard");
            const iCurrentStep = oWizard.getSteps().indexOf(oWizard.getCurrentStep()) + 1;
            const iTotalSteps = oWizard.getSteps().length;
            
            const oDraftModel = this.getView().getModel("draftModel");
            oDraftModel.setProperty("/currentStep", iCurrentStep);
            oDraftModel.setProperty("/totalSteps", iTotalSteps);
            
            // Calculate time spent (implement time tracking)
            const iTimeSpent = this._calculateTimeSpent();
            oDraftModel.setProperty("/timeSpent", iTimeSpent);
            
            // Open save draft dialog
            if (!this._saveDraftDialog) {
                sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: "sd.solutionadvisor.view.fragments.SaveDraftDialog",
                    controller: this
                }).then((oDialog) => {
                    this._saveDraftDialog = oDialog;
                    this.getView().addDependent(this._saveDraftDialog);
                    this._saveDraftDialog.open();
                });
            } else {
                this._saveDraftDialog.open();
            }
        },

        onConfirmSaveDraft() {
            const oDraftModel = this.getView().getModel("draftModel");
            const oWizardModel = this.getView().getModel("wizardModel");
            
            const sDraftName = sap.ui.core.Fragment.byId(
                this.getView().getId(),
                "draftNameInput"
            ).getValue();
            
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
            
            // Create analysis in draft mode
            oModel.callFunction("/startWizard", {
                method: "POST",
                urlParameters: {
                    projectID: oData.projectID,
                    ricefwId: oData.ricefwId,
                    objectType: oData.objectType,
                    objectName: oData.objectName
                },
                success: (oResult) => {
                    this._sessionId = oResult.sessionID;
                    this._analysisId = oResult.analysisID;
                    this._updateDraftSession(sDraftName);
                },
                error: (oError) => {
                    MessageBox.error("Failed to save draft: " + oError.message);
                }
            });
        },

        _updateDraftSession(sDraftName) {
            const oDraftModel = this.getView().getModel("draftModel");
            const oModel = this.getView().getModel();
            
            // Prepare wizard session data
            const oSessionData = {
                sessionStatus: "Paused",
                currentStep: oDraftModel.getProperty("/currentStep"),
                totalSteps: oDraftModel.getProperty("/totalSteps"),
                timeSpentTotal: oDraftModel.getProperty("/timeSpent") * 60, // Convert to seconds
                lastActivity: new Date().toISOString()
            };
            
            // Update the session via OData
            oModel.update(`/WizardSessions('${this._sessionId}')`, oSessionData, {
                success: () => {
                    MessageToast.show("Draft saved successfully", {
                        duration: 3000
                    });
                    this._saveDraftDialog.close();
                },
                error: (oError) => {
                    MessageBox.error("Failed to save draft: " + oError.message);
                }
            });
        },

        onCancelSaveDraft() {
            this._saveDraftDialog.close();
        },

        _calculateTimeSpent() {
            // Implement time tracking logic
            if (!this._wizardStartTime) {
                this._wizardStartTime = new Date();
            }
            
            const now = new Date();
            const diffMs = now - this._wizardStartTime;
            const diffMins = Math.floor(diffMs / 60000);
            
            return diffMins;
        },

        onWizardComplete() {
            MessageToast.show("Wizard completed!");
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
            const sProjectName = oWizardModel.getProperty("/projectName");
            
            if (sProjectId) {
                // Navigate back to analyses list with project context
                this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                    projectId: sProjectId,
                    projectName: encodeURIComponent(sProjectName)
                });
            } else {
                // Navigate back to project list
                this.getOwnerComponent().getRouter().navTo("ProjectsList");
            }
        }
    });
});
