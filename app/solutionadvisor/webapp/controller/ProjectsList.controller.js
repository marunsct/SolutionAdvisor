sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.ProjectsList", {
        onInit() {
            // Initialize view model for counts
            const oViewModel = new JSONModel({
                projectsCount: 0,
                activeProjectsCount: 0
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Load counts when model is available
            const oModel = this.getView().getModel();
            if (oModel) {
                if (oModel.getMetadata && oModel.getMetadata()) {
                    // Model metadata already loaded
                    this._loadCounts();
                } else {
                    // Wait for metadata to load
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

            // Get total projects count
            oModel.read("/Projects/$count", {
                success: (oData) => {
                    oViewModel.setProperty("/projectsCount", oData || 0);
                },
                error: (oError) => {
                    console.error("Failed to load projects count:", oError);
                }
            });

            // Get active projects count
            oModel.read("/Projects/$count", {
                filters: [new Filter("status", FilterOperator.EQ, "Active")],
                success: (oData) => {
                    oViewModel.setProperty("/activeProjectsCount", oData || 0);
                },
                error: (oError) => {
                    console.error("Failed to load active projects count:", oError);
                }
            });
        },

        onSearch(oEvent) {
            const sQuery = oEvent.getParameter("query");
            const aFilters = [];

            if (sQuery && sQuery.length > 0) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("clientName", FilterOperator.Contains, sQuery),
                        new Filter("projectName", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            const oTable = this.byId("projectsTable");
            const oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },

        onProjectSelect(oEvent) {
            const oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sProjectId = oContext.getProperty("ID");

            // Navigate to project details
            this.getOwnerComponent().getRouter().navTo("ProjectDetails", {
                key: sProjectId
            });
        },

        onCreateProject() {
            MessageToast.show("Create Project dialog will be implemented");
            // TODO: Open create project dialog
        },

        onViewAnalyses() {
            this.getOwnerComponent().getRouter().navTo("AnalysesList");
        },

        onTilePress() {
            // Refresh the list
            this._loadCounts();
            const oTable = this.byId("projectsTable");
            oTable.getBinding("items").refresh();
        }
    });
});