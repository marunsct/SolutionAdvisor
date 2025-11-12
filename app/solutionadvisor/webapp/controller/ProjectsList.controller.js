sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/base/Log"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Fragment, Log) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.ProjectsList", {
        onInit() {
            // Initialize view model for counts
            const oViewModel = new JSONModel({
                projectsCount: 0,
                activeProjectsCount: 0,
                hasSelection: false,
                isAdmin: false // Will be set after checking user roles
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Check user roles for admin access
            this._checkUserRoles();
            
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
            
            // Attach to route matched to ensure model is loaded and refresh counts
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("ProjectsList").attachPatternMatched(this._onRouteMatched, this);
        },
        
        /**
         * Check if current user has Admin or TenantAdmin role
         * Uses app router user API endpoint configured in xs-app.json
         * @private
         */
        _checkUserRoles() {
            const oViewModel = this.getView().getModel("viewModel");
            
            // Use app router's user API to get current user info with scopes
            fetch("/user-api/currentUser")
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`User API returned ${response.status}`);
                    }
                    return response.json();
                })
                .then(userData => {
                    Log.debug("User data from app router:", userData);
                    
                    // Check scopes for Admin or TenantAdmin roles
                    const scopes = userData.scopes || [];
                    const isAdmin = scopes.some(scope => 
                        scope.includes("Admin") || 
                        scope.includes("TenantAdmin") ||
                        scope.includes("SolutionAdvisor.Admin") ||
                        scope.includes("SolutionAdvisor.TenantAdmin")
                    );
                    
                    oViewModel.setProperty("/isAdmin", isAdmin);
                    Log.info(`User admin status: ${isAdmin}`, scopes);
                })
                .catch(error => {
                    Log.error("Error fetching user info from app router:", error);
                    
                    // Fallback for local development
                    if (window.location.hostname === "localhost") {
                        Log.warning("Running on localhost - defaulting to admin access");
                        oViewModel.setProperty("/isAdmin", true);
                    } else {
                        // Default to false for security in production
                        oViewModel.setProperty("/isAdmin", false);
                    }
                });
        },
        
        /**
         * Removed - no longer needed, now using app router user API directly
         * @deprecated Use _checkUserRoles() which calls /user-api/currentUser
         */
        
        _onRouteMatched() {
            // Show loading indicator while data is being fetched
            this.getView().setBusy(true);
            
            // Load counts when route is matched (model is guaranteed to be available)
            this._loadCounts();
            
            // Refresh table binding to get latest data (with delay to avoid cache conflicts)
            setTimeout(() => {
                const oTable = this.byId("projectsTable");
                if (oTable) {
                    const oBinding = oTable.getBinding("items");
                    if (oBinding && oBinding.isA("sap.ui.model.odata.v4.ODataListBinding")) {
                        // Only refresh if binding is not already loading
                        if (!oBinding.isSuspended()) {
                            oBinding.refresh();
                        }
                    }
                }
            }, 100);
        },
        
        onSelectionChange() {
            const oTable = this.byId("projectsTable");
            const bHasSelection = oTable.getSelectedItems().length > 0;
            this.getView().getModel("viewModel").setProperty("/hasSelection", bHasSelection);
        },

        _loadCounts() {
            const oModel = this.getView().getModel();
            if (!oModel) {
                this.getView().setBusy(false);
                return;
            }
            
            const oViewModel = this.getView().getModel("viewModel");
            const aCountPromises = [];

            // Get total projects count
            const oTotalBinding = oModel.bindList("/Projects");
            aCountPromises.push(
                oTotalBinding.requestContexts(0, 0).then(() => {
                    const iCount = oTotalBinding.getLength();
                    oViewModel.setProperty("/projectsCount", iCount);
                }).catch((oError) => {
                    Log.error("Failed to load projects count:", oError);
                    oViewModel.setProperty("/projectsCount", 0);
                })
            );

            // Get active projects count
            const aActiveFilters = [new Filter("status", FilterOperator.EQ, "Active")];
            const oActiveBinding = oModel.bindList("/Projects", null, null, aActiveFilters);
            aCountPromises.push(
                oActiveBinding.requestContexts(0, 0).then(() => {
                    const iCount = oActiveBinding.getLength();
                    oViewModel.setProperty("/activeProjectsCount", iCount);
                }).catch((oError) => {
                    Log.error("Failed to load active projects count:", oError);
                    oViewModel.setProperty("/activeProjectsCount", 0);
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

            // Navigate to analyses list with project context
            this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                projectId: sProjectId
            });
        },

        onViewProjectAnalyses() {
            const oTable = this.byId("projectsTable");
            const aSelectedItems = oTable.getSelectedItems();
            
            if (aSelectedItems.length === 0) {
                MessageToast.show("Please select a project to view its analyses");
                return;
            }
            
            const oContext = aSelectedItems[0].getBindingContext();
            const sProjectId = oContext.getProperty("ID");

            // Navigate to analyses list with project context
            this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                projectId: sProjectId
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
                            projectId: oCreatedProject.ID
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
            
            // Navigate to project details in display mode
            this.getOwnerComponent().getRouter().navTo("ProjectDetails", {
                key: sProjectId
            });
        },

        onDeleteProject() {
            const oTable = this.byId("projectsTable");
            const aSelectedItems = oTable.getSelectedItems();
            
            if (aSelectedItems.length === 0) {
                MessageToast.show("Please select a project to delete");
                return;
            }
            
            const oContext = aSelectedItems[0].getBindingContext();
            const sProjectName = oContext.getProperty("projectName");
            const sProjectId = oContext.getProperty("ID");
            
            // Confirm deletion
            MessageBox.confirm(
                `Are you sure you want to delete project "${sProjectName}"? This will also delete all associated analyses.`,
                {
                    title: "Delete Project",
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) {
                            this._deleteProjectWithAnalyses(oContext, sProjectId, sProjectName);
                        }
                    },
                    emphasizedAction: MessageBox.Action.CANCEL
                }
            );
        },

        _deleteProjectWithAnalyses(oContext, sProjectId, sProjectName) {
            const oModel = this.getView().getModel();
            const oTable = this.byId("projectsTable");
            
            this.getView().setBusy(true);

            // First, get all analyses for this project
            const oAnalysesBinding = oModel.bindList("/Analyses", null, null, [
                new Filter("projectConfig_ID", FilterOperator.EQ, sProjectId)
            ]);

            oAnalysesBinding.requestContexts().then((aAnalysesContexts) => {
                // Delete all analyses first
                const aDeletePromises = aAnalysesContexts.map(ctx => ctx.delete());
                
                return Promise.all(aDeletePromises);
            }).then(() => {
                // Now delete the project
                return oContext.delete();
            }).then(() => {
                this.getView().setBusy(false);
                MessageToast.show(`Project "${sProjectName}" and all associated analyses deleted successfully`);
                
                // Refresh table and counts
                if (oTable && oTable.getBinding("items")) {
                    oTable.getBinding("items").refresh();
                }
                // Clear selection and disable action buttons
                if (oTable) {
                    oTable.removeSelections();
                }
                this.getView().getModel("viewModel").setProperty("/hasSelection", false);
                this._loadCounts();
            }).catch((oError) => {
                this.getView().setBusy(false);
                Log.error("Failed to delete project:", oError);
                MessageBox.error(`Failed to delete project: ${oError.message || oError.toString()}`);
            });
        },
        
        onViewAllAnalyses() {
            // Navigate to all analyses without project filter
            this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                projectId: "all"
            });
        },

        onTilePress() {
            // Refresh the list
            this._loadCounts();
            const oTable = this.byId("projectsTable");
            oTable.getBinding("items").refresh();
        },

        onNavigateToAnalytics() {
            // Navigate to analytics dashboard
            this.getOwnerComponent().getRouter().navTo("AnalyticsDashboard");
        },

        onNavigateToAdmin() {
            // Navigate to admin page
            this.getOwnerComponent().getRouter().navTo("Admin");
        }
    });
});