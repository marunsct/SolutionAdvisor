sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Fragment) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.ProjectsList", {
        onInit() {
            // Initialize view model for counts
            const oViewModel = new JSONModel({
                projectsCount: 0,
                activeProjectsCount: 0
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Initialize project model for create dialog
            const oProjectModel = new JSONModel({
                clientName: "",
                projectName: "",
                projectType: "",
                expectedDuration: null,
                timeline: null,
                status: "Active",
                s4HanaFlavor: "",
                availableBTPServices: "",
                thirdPartyServices: "",
                governanceModel: "",
                complianceRequirementsArray: [],
                complianceRequirements: "",
                businessCriticality: "",
                technicalTeamSize: null,
                budgetRange: ""
            });
            this.getView().setModel(oProjectModel, "projectModel");
            
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
            const sProjectName = oContext.getProperty("projectName");

            // Navigate to analyses list with project context
            this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                projectId: sProjectId,
                projectName: encodeURIComponent(sProjectName)
            });
        },

        onCreateProject() {
            // Reset project model
            const oProjectModel = this.getView().getModel("projectModel");
            oProjectModel.setData({
                clientName: "",
                projectName: "",
                projectType: "",
                expectedDuration: null,
                timeline: null,
                status: "Active",
                s4HanaFlavor: "",
                availableBTPServices: "",
                thirdPartyServices: "",
                governanceModel: "",
                complianceRequirementsArray: [],
                complianceRequirements: "",
                businessCriticality: "",
                technicalTeamSize: null,
                budgetRange: ""
            });
            
            // Open create project dialog
            if (!this._createProjectDialog) {
                Fragment.load({
                    name: "sd.solutionadvisor.view.fragments.CreateProjectDialog",
                    controller: this
                }).then((oDialog) => {
                    // Fragment.load might return an array, get the actual dialog control
                    const oActualDialog = Array.isArray(oDialog) ? oDialog[oDialog.length - 1] : oDialog;
                    this._createProjectDialog = oActualDialog;
                    this.getView().addDependent(this._createProjectDialog);
                    this._createProjectDialog.open();
                });
            } else {
                this._createProjectDialog.open();
            }
        },
        
        onCreateProjectConfirm() {
            const oProjectModel = this.getView().getModel("projectModel");
            const oData = oProjectModel.getData();
            
            // Validate required fields
            if (!oData.clientName || !oData.projectName || !oData.projectType || 
                !oData.timeline || !oData.s4HanaFlavor) {
                MessageBox.error("Please fill in all required fields (marked with *)");
                return;
            }
            
            // Convert compliance requirements array to comma-separated string
            if (oData.complianceRequirementsArray && oData.complianceRequirementsArray.length > 0) {
                oData.complianceRequirements = oData.complianceRequirementsArray.join(", ");
            }
            
            // Prepare project data for creation
            const oNewProject = {
                clientName: oData.clientName,
                projectName: oData.projectName,
                projectType: oData.projectType,
                expectedDuration: oData.expectedDuration || 0,
                timeline: oData.timeline,
                status: oData.status || "Active",
                s4HanaFlavor: oData.s4HanaFlavor,
                availableBTPServices: oData.availableBTPServices || "",
                thirdPartyServices: oData.thirdPartyServices || "",
                governanceModel: oData.governanceModel || "",
                complianceRequirements: oData.complianceRequirements || "",
                businessCriticality: oData.businessCriticality || "",
                technicalTeamSize: oData.technicalTeamSize || 0,
                budgetRange: oData.budgetRange || ""
            };
            
            // Create project via OData V4 service (ListBinding.create)
            const oModel = this.getView().getModel();
            const oTable = this.byId("projectsTable");
            // Prefer the table binding if available (ensures automatic refresh)
            const oListBinding = (oTable && oTable.getBinding && oTable.getBinding("items"))
                ? oTable.getBinding("items")
                : oModel.bindList("/Projects");

            try {
                const oContext = oListBinding.create(oNewProject); // returns a Context immediately

                oContext.created().then(() => {
                    // Fetch created object
                    return oContext.requestObject();
                }).then((oCreatedProject) => {
                    MessageToast.show("Project '" + oCreatedProject.projectName + "' created successfully!");

                    // Close dialog
                    this._createProjectDialog.close();

                    // Refresh bindings and counts
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }
                    this._loadCounts();

                    // Navigate to the new project's analyses
                    if (oCreatedProject && oCreatedProject.ID) {
                        this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                            projectId: oCreatedProject.ID,
                            projectName: encodeURIComponent(oCreatedProject.projectName || oData.projectName)
                        });
                    }
                }).catch((oError) => {
                    // Creation was rejected by the server or canceled
                    const sMsg = (oError && (oError.message || oError.toString())) || "Failed to create project";
                    MessageBox.error(sMsg);
                });
            } catch (oError) {
                const sMsg = (oError && (oError.message || oError.toString())) || "Failed to create project";
                MessageBox.error(sMsg);
            }
        },
        
        onCancelCreateProject() {
            this._createProjectDialog.close();
        },

        onEditProject() {
            const oTable = this.byId("projectsTable");
            const aSelectedItems = oTable.getSelectedItems();
            
            if (aSelectedItems.length === 0) {
                MessageToast.show("Please select a project to edit");
                return;
            }
            
            const oContext = aSelectedItems[0].getBindingContext();
            const sProjectId = oContext.getProperty("ID");
            
            // Navigate to project details for editing
            this.getOwnerComponent().getRouter().navTo("ProjectDetails", {
                key: sProjectId
            });
        },
        
        onViewAllAnalyses() {
            // Navigate to all analyses without project filter
            this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                projectId: "all",
                projectName: "All Projects"
            });
        },

        onTilePress() {
            // Refresh the list
            this._loadCounts();
            const oTable = this.byId("projectsTable");
            oTable.getBinding("items").refresh();
        }
    });
});