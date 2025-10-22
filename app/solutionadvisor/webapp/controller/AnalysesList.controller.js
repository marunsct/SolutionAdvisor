sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.AnalysesList", {
        onInit() {
            // Initialize view model for counts
            const oViewModel = new JSONModel({
                analysesCount: 0,
                levelACount: 0,
                levelBCount: 0,
                levelCCount: 0,
                projectId: null,
                projectName: "",
                isFiltered: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Attach to route matched event
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("AnalysesList").attachPatternMatched(this._onRouteMatched, this);
            
            // Load counts when model is available
            const oModel = this.getView().getModel();
            if (oModel) {
                if (oModel.getMetadata && oModel.getMetadata()) {
                    this._loadCounts();
                } else {
                    oModel.attachMetadataLoaded(() => {
                        this._loadCounts();
                    });
                }
            }
        },

        _onRouteMatched(oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            const sProjectId = oArgs.projectId;
            const sProjectName = decodeURIComponent(oArgs.projectName || "");
            
            const oViewModel = this.getView().getModel("viewModel");
            
            if (sProjectId && sProjectId !== "all") {
                // Set project filter
                oViewModel.setProperty("/projectId", sProjectId);
                oViewModel.setProperty("/projectName", sProjectName);
                oViewModel.setProperty("/isFiltered", true);
                
                // Apply filter to table
                this._applyProjectFilter(sProjectId);
            } else {
                // Clear project filter
                oViewModel.setProperty("/projectId", null);
                oViewModel.setProperty("/projectName", "All Projects");
                oViewModel.setProperty("/isFiltered", false);
                
                // Clear filter from table
                const oTable = this.byId("analysesTable");
                if (oTable) {
                    const oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.filter([]);
                    }
                }
            }
            
            // Reload counts with filter
            this._loadCounts();
        },

        _applyProjectFilter(sProjectId) {
            const oTable = this.byId("analysesTable");
            if (!oTable) return;
            
            const oBinding = oTable.getBinding("items");
            if (!oBinding) return;
            
            const aFilters = [
                new Filter("projectConfig_ID", FilterOperator.EQ, sProjectId)
            ];
            
            oBinding.filter(aFilters);
        },

        _loadCounts() {
            const oModel = this.getView().getModel();
            if (!oModel) {
                return;
            }
            
            const oViewModel = this.getView().getModel("viewModel");
            const sProjectId = oViewModel.getProperty("/projectId");
            
            // Build base filters for project context
            const aBaseFilters = [];
            if (sProjectId && sProjectId !== "all") {
                aBaseFilters.push(new Filter("projectConfig_ID", FilterOperator.EQ, sProjectId));
            }

            // Get total analyses count using OData V4 binding
            const oListBinding = oModel.bindList("/Analyses", null, null, aBaseFilters);
            oListBinding.requestContexts(0, 0).then(() => {
                const iCount = oListBinding.getLength();
                oViewModel.setProperty("/analysesCount", iCount);
            }).catch((oError) => {
                console.error("Failed to load analyses count:", oError);
                oViewModel.setProperty("/analysesCount", 0);
            });

            // Get Level A count
            const aLevelAFilters = [...aBaseFilters, new Filter("finalRecommendation", FilterOperator.EQ, "Level A")];
            const oLevelABinding = oModel.bindList("/Analyses", null, null, aLevelAFilters);
            oLevelABinding.requestContexts(0, 0).then(() => {
                const iCount = oLevelABinding.getLength();
                oViewModel.setProperty("/levelACount", iCount);
            }).catch((oError) => {
                console.error("Failed to load Level A count:", oError);
                oViewModel.setProperty("/levelACount", 0);
            });

            // Get Level B count
            const aLevelBFilters = [...aBaseFilters, new Filter("finalRecommendation", FilterOperator.EQ, "Level B")];
            const oLevelBBinding = oModel.bindList("/Analyses", null, null, aLevelBFilters);
            oLevelBBinding.requestContexts(0, 0).then(() => {
                const iCount = oLevelBBinding.getLength();
                oViewModel.setProperty("/levelBCount", iCount);
            }).catch((oError) => {
                console.error("Failed to load Level B count:", oError);
                oViewModel.setProperty("/levelBCount", 0);
            });

            // Get Level C count
            const aLevelCFilters = [...aBaseFilters, new Filter("finalRecommendation", FilterOperator.EQ, "Level C")];
            const oLevelCBinding = oModel.bindList("/Analyses", null, null, aLevelCFilters);
            oLevelCBinding.requestContexts(0, 0).then(() => {
                const iCount = oLevelCBinding.getLength();
                oViewModel.setProperty("/levelCCount", iCount);
            }).catch((oError) => {
                console.error("Failed to load Level C count:", oError);
                oViewModel.setProperty("/levelCCount", 0);
            });
        },

        onSearch(oEvent) {
            const sQuery = oEvent.getParameter("query");
            const aFilters = [];

            if (sQuery && sQuery.length > 0) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("ricefwId", FilterOperator.Contains, sQuery),
                        new Filter("objectName", FilterOperator.Contains, sQuery),
                        new Filter("objectType", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            const oTable = this.byId("analysesTable");
            const oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },

        onAnalysisSelect(oEvent) {
            const oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sAnalysisId = oContext.getProperty("ID");
            const sStatus = oContext.getProperty("status");

            if (sStatus === "In Progress") {
                // Check if there's a saved draft session
                this._checkForDraft(sAnalysisId);
            } else {
                // Navigate to analysis details
                this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                    key: sAnalysisId
                });
            }
        },

        _checkForDraft(sAnalysisId) {
            const oModel = this.getView().getModel();
            
            const aFilters = [
                new Filter("analysis_ID", FilterOperator.EQ, sAnalysisId),
                new Filter("sessionStatus", FilterOperator.EQ, "Paused")
            ];
            const oBinding = oModel.bindList("/WizardSessions", null, null, aFilters);
            
            oBinding.requestContexts().then((aContexts) => {
                if (aContexts && aContexts.length > 0) {
                    const oSession = aContexts[0].getObject();
                    this._showResumeDraftDialog(sAnalysisId, oSession);
                } else {
                    // No draft found, view as normal
                    this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                        key: sAnalysisId
                    });
                }
            }).catch((oError) => {
                console.error("Failed to check for draft:", oError);
                // On error, just navigate to analysis details
                this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                    key: sAnalysisId
                });
            });
        },

        _showResumeDraftDialog(sAnalysisId, oSession) {
            const sSavedDate = new Date(oSession.lastActivity).toLocaleString();
            const bExpired = oSession.expiresAt && new Date() > new Date(oSession.expiresAt);
            
            MessageBox.confirm(
                `A draft was saved on ${sSavedDate} (${oSession.currentStep}/${oSession.totalSteps} steps completed).` +
                (bExpired ? "\n\nWarning: This draft has expired and may not be recoverable." : ""),
                {
                    title: "Resume Draft?",
                    actions: ["Resume Wizard", "View Analysis", MessageBox.Action.CANCEL],
                    onClose: (sAction) => {
                        if (sAction === "Resume Wizard") {
                            this._resumeWizard(sAnalysisId, oSession);
                        } else if (sAction === "View Analysis") {
                            this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                                key: sAnalysisId
                            });
                        }
                    }
                }
            );
        },

        _resumeWizard(sAnalysisId, oSession) {
            // Navigate to wizard with session ID for resume
            this.getOwnerComponent().getRouter().navTo("Wizard", {
                projectId: "resume", // Special flag to indicate resume mode
                sessionId: oSession.ID
            });
        },

        onStartWizard() {
            // Get project context
            const oViewModel = this.getView().getModel("viewModel");
            const sProjectId = oViewModel.getProperty("/projectId");
            
            if (sProjectId && sProjectId !== "all") {
                // Navigate to wizard with project context
                this.getOwnerComponent().getRouter().navTo("Wizard", {
                    projectId: sProjectId
                });
            } else {
                // Navigate to wizard without project context (will need to select project)
                this.getOwnerComponent().getRouter().navTo("Wizard");
            }
        },

        onBackToProjects() {
            this.getOwnerComponent().getRouter().navTo("ProjectsList");
        }
    });
});
