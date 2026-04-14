sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/base/Log"
], (Controller, JSONModel, Filter, FilterOperator, Sorter, MessageToast, MessageBox, Log) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.AnalysesList", {
        onInit() {
            // Initialize view model for counts
            const oViewModel = new JSONModel({
                analysesCount: 0,
                levelACount: 0,
                levelBCount: 0,
                levelCCount: 0,
                levelDCount: 0,
                projectId: null,
                projectName: "",
                isFiltered: false,
                hasSelection: false,
                sortProperty: null,
                sortDescending: false
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
                    this._attachTableEvents();
                    this._attachColumnHeaderEvents();
                } else {
                    oModel.attachMetadataLoaded(() => {
                        this._loadCounts();
                        this._attachTableEvents();
                        this._attachColumnHeaderEvents();
                    });
                }
            }
        },

        _attachTableEvents() {
            if (this._tableEventsAttached) return;

            const oTable = this.byId("analysesTable");
            if (!oTable) return;

            const oBinding = oTable.getBinding("items");
            if (oBinding) {
                // Keep reference to detach on exit
                this._fnStyleDraftItems = () => {
                    this._styleDraftItems();
                };
                oBinding.attachChange(this._fnStyleDraftItems);
                this._tableEventsAttached = true;

                // Initial styling
                this._styleDraftItems();
            }
        },

        onExit() {
            const oTable = this.byId("analysesTable");
            if (oTable && this._fnStyleDraftItems) {
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.detachChange(this._fnStyleDraftItems);
                }
            }
        },

        /**
         * Attach column header click events for sorting
         * @private
         */
        /**
         * Handle column header button press event
         * Maps button ID to sort property and triggers sort
         * @param {sap.ui.base.Event} oEvent - Button press event
         * @private
         */
        onColumnHeaderPress(oEvent) {
            const oButton = oEvent.getSource();
            const sButtonId = oButton.getId();

            // Map of button IDs to sort properties
            // NOTE: Properties must match OData service entity field names exactly
            const mHeaderMapping = {
                ricefwIdHeader: "ricefwId",
                objectNameHeader: "objectName",
                typeHeader: "objectType",
                cleanCoreLevelHeader: "finalRecommendation",
                techDebtHeader: "technicalDebtScore", // Correct field name from schema
                cloudReadyHeader: "cloudReadinessScore", // Correct field name from schema
                analysesStatusHeader: "status",
                dateHeader: "analysisDate"
            };

            // Extract button ID without view prefix if present
            const sId = sButtonId.split("--").pop();
            const sSortProperty = mHeaderMapping[sId];

            if (sSortProperty) {
                this._onColumnSort(sSortProperty);
            }
        },

        _attachColumnHeaderEvents() {
            // No longer needed - buttons handle press events directly via XML declaration
        },

        /**
         * Handle column sort click
         * @param {string} sSortProperty - Property to sort by
         * @private
         */
        _onColumnSort(sSortProperty) {
            const oViewModel = this.getView().getModel("viewModel");
            const sCurrentSort = oViewModel.getProperty("/sortProperty");
            const bCurrentDescending = oViewModel.getProperty("/sortDescending");

            // Toggle sort direction if clicking same column, otherwise start ascending
            let bDescending = false;
            if (sCurrentSort === sSortProperty) {
                bDescending = !bCurrentDescending;
            }

            // Update sort state
            oViewModel.setProperty("/sortProperty", sSortProperty);
            oViewModel.setProperty("/sortDescending", bDescending);

            // Apply sort to table
            this._applySortToTable(sSortProperty, bDescending);
        },

        /**
         * Apply sorting to table binding
         * @param {string} sSortProperty - Property to sort by
         * @param {boolean} bDescending - Sort in descending order
         * @private
         */
        _applySortToTable(sSortProperty, bDescending) {
            const oTable = this.byId("analysesTable");
            if (!oTable) return;

            const oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            // Create sorter
            const oSorter = new Sorter(sSortProperty, bDescending);

            // Get current filters (maintain existing filters while sorting)
            let aFilters = [];
            const sProjectId = this.getView().getModel("viewModel").getProperty("/projectId");
            if (sProjectId && sProjectId !== "all") {
                aFilters = [
                    new Filter("projectConfig_ID", FilterOperator.EQ, sProjectId)
                ];
            }

            // Apply both filters and sorters
            oBinding.filter(aFilters);
            oBinding.sort([oSorter]);

            // Re-style draft items after sort
            setTimeout(() => {
                this._styleDraftItems();
            }, 100);
        },

        _onRouteMatched(oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            const sProjectId = oArgs.projectId || "all"; // Default to "all" if not provided
            const oViewModel = this.getView().getModel("viewModel");

            // Show loading indicator while data is being fetched
            this.getView().setBusy(true);

            if (sProjectId && sProjectId !== "all") {
                // Fetch project name from backend
                this._fetchProjectName(sProjectId).then((sProjectName) => {
                    // Set project filter for specific project
                    oViewModel.setProperty("/projectId", sProjectId);
                    oViewModel.setProperty("/projectName", sProjectName || sProjectId);
                    oViewModel.setProperty("/isFiltered", true);

                    // Apply filter to table
                    this._applyProjectFilter(sProjectId);
                    
                    // Reload counts with filter
                    this._loadCounts();
                }).catch((oError) => {
                    // Fallback: use projectId as name if fetch fails
                    oViewModel.setProperty("/projectId", sProjectId);
                    oViewModel.setProperty("/projectName", sProjectId);
                    oViewModel.setProperty("/isFiltered", true);
                    
                    this._applyProjectFilter(sProjectId);
                    this._loadCounts();
                });
            } else {
                // Show all analyses (no project filter)
                oViewModel.setProperty("/projectId", "all");
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
                
                // Reload counts with filter
                this._loadCounts();
            }
        },

        /**
         * Fetch the project name from the backend for a given project ID
         * @param {string} sProjectId - The project ID
         * @returns {Promise<string>} Promise resolving to the project name
         * @private
         */
        _fetchProjectName(sProjectId) {
            return new Promise((resolve, reject) => {
                const oModel = this.getView().getModel();
                const oBinding = oModel.bindContext(`/Projects('${sProjectId}')`);
                
                oBinding.requestObject().then((oProject) => {
                    if (oProject && oProject.projectName) {
                        resolve(oProject.projectName);
                    } else {
                        resolve(sProjectId);
                    }
                }).catch(() => {
                    reject();
                });
            });
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

        _styleDraftItems() {
            const oTable = this.byId("analysesTable");
            if (!oTable) return;

            const aItems = oTable.getItems();
            aItems.forEach((oItem) => {
                const oContext = oItem.getBindingContext();
                if (oContext) {
                    // Use status property to determine if draft or completed
                    // Draft items have status "In Progress" and IsActiveEntity === false
                    const sStatus = oContext.getProperty("status");
                    const bIsActiveEntity = oContext.getProperty("IsActiveEntity");
                    
                    // Apply styling based on draft status
                    // Draft: status="In Progress" AND IsActiveEntity=false
                    if (sStatus === "In Progress" || bIsActiveEntity === false) {
                        // This is a draft item
                        oItem.addStyleClass("draftAnalysisItem");
                        oItem.removeStyleClass("completedAnalysisItem");
                        
                        // Show draft label by finding it in the cells
                        const aCells = oItem.getCells();
                        if (aCells && aCells[0]) {
                            const oVBox = aCells[0]; // First cell is the VBox with ricefwId
                            const aItemsInVBox = oVBox.getItems();
                            if (aItemsInVBox && aItemsInVBox[1]) {
                                aItemsInVBox[1].setVisible(true); // Show draft label (second item in VBox)
                            }
                        }
                    } else if (bIsActiveEntity === true || sStatus === "Completed") {
                        // This is a completed/active item
                        oItem.addStyleClass("completedAnalysisItem");
                        oItem.removeStyleClass("draftAnalysisItem");
                        
                        // Hide draft label
                        const aCells = oItem.getCells();
                        if (aCells && aCells[0]) {
                            const oVBox = aCells[0]; // First cell is the VBox with ricefwId
                            const aItemsInVBox = oVBox.getItems();
                            if (aItemsInVBox && aItemsInVBox[1]) {
                                aItemsInVBox[1].setVisible(false); // Hide draft label
                            }
                        }
                    }
                }
            });
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

            // Create all count promises
            const aCountPromises = [];

            // Get total analyses count using OData V4 binding
            const oListBinding = oModel.bindList("/Analyses", null, null, aBaseFilters);
            aCountPromises.push(
                oListBinding.requestContexts(0, 0).then(() => {
                    const iCount = oListBinding.getLength();
                    oViewModel.setProperty("/analysesCount", iCount);
                }).catch((oError) => {
                    Log.error("Failed to load analyses count:", oError);
                    oViewModel.setProperty("/analysesCount", 0);
                })
            );

            // Get Level A count
            const aLevelAFilters = [...aBaseFilters, new Filter("finalRecommendation", FilterOperator.Contains, "Level A")];
            const oLevelABinding = oModel.bindList("/Analyses", null, null, aLevelAFilters);
            aCountPromises.push(
                oLevelABinding.requestContexts(0, 0).then(() => {
                    const iCount = oLevelABinding.getLength();
                    oViewModel.setProperty("/levelACount", iCount);
                }).catch((oError) => {
                    Log.error("Failed to load Level A count:", oError);
                    oViewModel.setProperty("/levelACount", 0);
                })
            );

            // Get Level B count
            const aLevelBFilters = [...aBaseFilters, new Filter("finalRecommendation", FilterOperator.Contains, "Level B")];
            const oLevelBBinding = oModel.bindList("/Analyses", null, null, aLevelBFilters);
            aCountPromises.push(
                oLevelBBinding.requestContexts(0, 0).then(() => {
                    const iCount = oLevelBBinding.getLength();
                    oViewModel.setProperty("/levelBCount", iCount);
                }).catch((oError) => {
                    Log.error("Failed to load Level B count:", oError);
                    oViewModel.setProperty("/levelBCount", 0);
                })
            );

            // Get Level C count
            const aLevelCFilters = [...aBaseFilters, new Filter("finalRecommendation", FilterOperator.Contains, "Level C")];
            const oLevelCBinding = oModel.bindList("/Analyses", null, null, aLevelCFilters);
            aCountPromises.push(
                oLevelCBinding.requestContexts(0, 0).then(() => {
                    const iCount = oLevelCBinding.getLength();
                    oViewModel.setProperty("/levelCCount", iCount);
                }).catch((oError) => {
                    Log.error("Failed to load Level C count:", oError);
                    oViewModel.setProperty("/levelCCount", 0);
                })
            );

            // Get Level D count
            const aLevelDFilters = [...aBaseFilters, new Filter("finalRecommendation", FilterOperator.Contains, "Level D")];
            const oLevelDBinding = oModel.bindList("/Analyses", null, null, aLevelDFilters);
            aCountPromises.push(
                oLevelDBinding.requestContexts(0, 0).then(() => {
                    const iCount = oLevelDBinding.getLength();
                    oViewModel.setProperty("/levelDCount", iCount);
                }).catch((oError) => {
                    Log.error("Failed to load Level D count:", oError);
                    oViewModel.setProperty("/levelDCount", 0);
                })
            );

            // Hide busy indicator when all counts are loaded
            Promise.all(aCountPromises).then(() => {
                this.getView().setBusy(false);
            }).catch(() => {
                // Hide busy even if some counts failed
                this.getView().setBusy(false);
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
                // Navigate to wizard to resume/complete the analysis
                this._navigateToWizard(sAnalysisId);
            } else {
                // Navigate to analysis details for completed analyses
                // Include projectId in URL to maintain project context for back navigation
                const oViewModel = this.getView().getModel("viewModel");
                const sProjectId = oViewModel.getProperty("/projectId") || "all";
                
                // Construct OData key format (router will URL-encode automatically)
                const sKey = `ID=${sAnalysisId},IsActiveEntity=true`;
                
                this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                    projectId: sProjectId,
                    key: sKey
                });
            }
        },

        onSelectionChange(oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedItems = oTable.getSelectedItems();
            const oViewModel = this.getView().getModel("viewModel");
            
            // Update selection flag
            oViewModel.setProperty("/hasSelection", aSelectedItems.length > 0);
        },

        onDeleteAnalysis() {
            const oTable = this.byId("analysesTable");
            const aSelectedItems = oTable.getSelectedItems();
            
            if (aSelectedItems.length === 0) {
                MessageToast.show("Please select an analysis to delete");
                return;
            }
            
            const oContext = aSelectedItems[0].getBindingContext();
            const sAnalysisId = oContext.getProperty("ID");
            const sRicefwId = oContext.getProperty("ricefwId");
            const sObjectName = oContext.getProperty("objectName");
            
            MessageBox.confirm(
                `Are you sure you want to delete the analysis for "${sObjectName}" (${sRicefwId})?`,
                {
                    title: "Confirm Deletion",
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.DELETE) {
                            this._deleteAnalysis(oContext);
                        }
                    }
                }
            );
        },

        _deleteAnalysis(oContext) {
            const oModel = this.getView().getModel();
            
            // Delete the context using OData V4
            oContext.delete().then(() => {
                MessageToast.show("Analysis deleted successfully");
                
                // Clear selection
                const oTable = this.byId("analysesTable");
                oTable.removeSelections(true);
                
                // Update view model
                const oViewModel = this.getView().getModel("viewModel");
                oViewModel.setProperty("/hasSelection", false);
                
                // Reload counts
                this._loadCounts();
            }).catch((oError) => {
                Log.error("Failed to delete analysis:", oError);
                MessageBox.error("Failed to delete analysis. Please try again.");
            });
        },

        _navigateToWizard(sAnalysisId) {
            // First check if there's a saved draft session
            const oModel = this.getView().getModel();

            const aFilters = [
                new Filter("analysis_ID", FilterOperator.EQ, sAnalysisId),
                new Filter("sessionStatus", FilterOperator.EQ, "Paused")
            ];
            const oBinding = oModel.bindList("/WizardSessions", null, null, aFilters);

            oBinding.requestContexts().then((aContexts) => {
                if (aContexts && aContexts.length > 0) {
                    // Draft exists - show resume dialog
                    const oSession = aContexts[0].getObject();
                    this._showResumeDraftDialog(sAnalysisId, oSession);
                } else {
                    // No draft - navigate to wizard with analysisId to resume/continue
                    this.getOwnerComponent().getRouter().navTo("Wizard", {
                        analysisId: sAnalysisId
                    });
                    MessageToast.show("Resuming in-progress analysis...");
                }
            }).catch(() => {
                // On error, just navigate to wizard
                this.getOwnerComponent().getRouter().navTo("Wizard", {
                    analysisId: sAnalysisId
                });
                MessageToast.show("Resuming in-progress analysis...");
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
