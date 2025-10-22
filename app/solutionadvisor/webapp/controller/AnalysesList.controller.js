sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.AnalysesList", {
        onInit() {
            // Initialize view model for counts
            const oViewModel = new JSONModel({
                analysesCount: 0,
                levelACount: 0,
                levelBCount: 0,
                levelCCount: 0
            });
            this.getView().setModel(oViewModel, "viewModel");
            
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

        _loadCounts() {
            const oModel = this.getView().getModel();
            if (!oModel) {
                return;
            }
            
            const oViewModel = this.getView().getModel("viewModel");

            // Get total analyses count
            oModel.read("/Analyses/$count", {
                success: (oData) => {
                    oViewModel.setProperty("/analysesCount", oData || 0);
                },
                error: (oError) => {
                    console.error("Failed to load analyses count:", oError);
                }
            });

            // Get Level A count
            oModel.read("/Analyses/$count", {
                filters: [new Filter("finalRecommendation", FilterOperator.EQ, "Level A")],
                success: (oData) => {
                    oViewModel.setProperty("/levelACount", oData || 0);
                },
                error: (oError) => {
                    console.error("Failed to load Level A count:", oError);
                }
            });

            // Get Level B count
            oModel.read("/Analyses/$count", {
                filters: [new Filter("finalRecommendation", FilterOperator.EQ, "Level B")],
                success: (oData) => {
                    oViewModel.setProperty("/levelBCount", oData || 0);
                },
                error: (oError) => {
                    console.error("Failed to load Level B count:", oError);
                }
            });

            // Get Level C count
            oModel.read("/Analyses/$count", {
                filters: [new Filter("finalRecommendation", FilterOperator.EQ, "Level C")],
                success: (oData) => {
                    oViewModel.setProperty("/levelCCount", oData || 0);
                }
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

            // Navigate to analysis details
            this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                key: sAnalysisId
            });
        },

        onStartWizard() {
            // Navigate to wizard
            this.getOwnerComponent().getRouter().navTo("Wizard");
        },

        onBackToProjects() {
            this.getOwnerComponent().getRouter().navTo("ProjectsList");
        }
    });
});
