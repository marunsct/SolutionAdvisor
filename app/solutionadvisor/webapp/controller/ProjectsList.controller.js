sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) => {
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
                this._createProjectDialog = sap.ui.xmlfragment(
                    "sd.solutionadvisor.view.fragments.CreateProjectDialog",
                    this
                );
                this.getView().addDependent(this._createProjectDialog);
            }
            
            this._createProjectDialog.open();
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
            
            // Create project via OData service
            const oModel = this.getView().getModel();
            oModel.create("/Projects", oNewProject, {
                success: (oCreatedProject) => {
                    MessageToast.show("Project '" + oCreatedProject.projectName + "' created successfully!");
                    this._createProjectDialog.close();
                    
                    // Refresh the table
                    const oTable = this.byId("projectsTable");
                    oTable.getBinding("items").refresh();
                    
                    // Reload counts
                    this._loadCounts();
                    
                    // Navigate to the new project's analyses
                    this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                        projectId: oCreatedProject.ID,
                        projectName: encodeURIComponent(oCreatedProject.projectName)
                    });
                },
                error: (oError) => {
                    let sErrorMessage = "Failed to create project";
                    try {
                        const oErrorResponse = JSON.parse(oError.responseText);
                        if (oErrorResponse.error && oErrorResponse.error.message) {
                            sErrorMessage = oErrorResponse.error.message;
                        }
                    } catch (e) {
                        // Use default error message
                    }
                    MessageBox.error(sErrorMessage);
                }
            });
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