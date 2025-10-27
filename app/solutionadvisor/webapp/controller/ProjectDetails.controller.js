sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], (Controller, History, JSONModel, MessageToast, MessageBox, Fragment) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.ProjectDetails", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("ProjectDetails").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched(oEvent) {
            const sProjectId = oEvent.getParameter("arguments").key;
            const oQueryParams = oEvent.getParameter("arguments")["?query"];
            const bEditMode = oQueryParams && oQueryParams.edit === "true";
            
            this._sCurrentProjectId = sProjectId;
            this.getView().bindElement({
                path: `/Projects(${sProjectId})`,
                parameters: {
                    expand: "analyses"
                }
            });
            
            // Enable edit mode if requested
            if (bEditMode) {
                // Wait for binding to be initialized
                this.getView().getElementBinding().attachEventOnce("dataReceived", () => {
                    this.onEdit();
                });
            }
        },

        onNavBack() {
            const oHistory = History.getInstance();
            const sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("ProjectsList", {}, true);
            }
        },

        onViewAnalyses() {
            const oView = this.getView();
            const oBindingContext = oView.getBindingContext();
            
            if (!oBindingContext) {
                MessageToast.show("Project data not loaded yet");
                return;
            }
            
            const sProjectId = oBindingContext.getProperty("ID");
            const sProjectName = oBindingContext.getProperty("projectName");
            
            // Navigate to analyses list for this project
            this.getOwnerComponent().getRouter().navTo("AnalysesList", {
                projectId: sProjectId,
                projectName: encodeURIComponent(sProjectName)
            });
        },

        onNewAnalysis() {
            this.getOwnerComponent().getRouter().navTo("Wizard");
        },

        onManageUsers() {
            const sProjectId = this._sCurrentProjectId;
            
            // Load project users
            this._loadProjectUsers(sProjectId);
            
            // Open dialog
            if (!this._manageUsersDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "sd.solutionadvisor.view.fragments.ManageUsersDialog",
                    controller: this
                }).then((oDialog) => {
                    this._manageUsersDialog = oDialog;
                    this.getView().addDependent(this._manageUsersDialog);
                    this._manageUsersDialog.open();
                });
            } else {
                this._manageUsersDialog.open();
            }
        },

        _loadProjectUsers(sProjectId) {
            const oModel = this.getView().getModel();
            
            const aFilters = [new sap.ui.model.Filter("project_ID", sap.ui.model.FilterOperator.EQ, sProjectId)];
            const oBinding = oModel.bindList("/ProjectUsers", null, null, aFilters);
            
            oBinding.requestContexts().then((aContexts) => {
                const aUsers = aContexts.map(ctx => ctx.getObject());
                const oUsersModel = new JSONModel({
                    users: aUsers
                });
                this.getView().setModel(oUsersModel, "projectUsersModel");
            }).catch((oError) => {
                console.error("Failed to load project users:", oError);
                MessageBox.error("Failed to load project users");
            });
        },

        onAddUserToProject() {
            // Initialize add user model
            const oAddUserModel = new JSONModel({
                userId: "",
                userEmail: "",
                userName: "",
                role: "Developer"
            });
            this.getView().setModel(oAddUserModel, "addUserModel");
            
            // Open add user dialog
            if (!this._addUserDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "sd.solutionadvisor.view.fragments.AddUserDialog",
                    controller: this
                }).then((oDialog) => {
                    this._addUserDialog = oDialog;
                    this.getView().addDependent(this._addUserDialog);
                    this._addUserDialog.open();
                });
            } else {
                this._addUserDialog.open();
            }
        },

        onConfirmAddUser() {
            const oAddUserModel = this.getView().getModel("addUserModel");
            const oData = oAddUserModel.getData();
            const sProjectId = this._sCurrentProjectId;
            
            // Validate
            if (!oData.userId || !oData.userEmail || !oData.userName || !oData.role) {
                MessageBox.error("Please fill in all required fields");
                return;
            }
            
            // Call backend action using OData V4
            const oModel = this.getView().getModel();
            const oOperation = oModel.bindContext(`/assignUserToProject(...)`);
            oOperation.setParameter("projectId", sProjectId);
            oOperation.setParameter("userId", oData.userId);
            oOperation.setParameter("userEmail", oData.userEmail);
            oOperation.setParameter("userName", oData.userName);
            oOperation.setParameter("role", oData.role);
            
            oOperation.execute().then(() => {
                MessageToast.show(`User ${oData.userName} added successfully`);
                this._addUserDialog.close();
                this._loadProjectUsers(sProjectId);
            }).catch((oError) => {
                console.error("Failed to add user:", oError);
                const sMessage = oError.message || "Failed to add user";
                MessageBox.error(sMessage);
            });
        },

        onCancelAddUser() {
            this._addUserDialog.close();
        },

        onRemoveUserFromProject(oEvent) {
            const oItem = oEvent.getSource().getParent();
            const oContext = oItem.getBindingContext("projectUsersModel");
            const sUserId = oContext.getProperty("ID");
            const sUserName = oContext.getProperty("userName");
            
            MessageBox.confirm(
                `Are you sure you want to remove ${sUserName} from this project?`,
                {
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.DELETE) {
                            this._removeUser(sUserId);
                        }
                    }
                }
            );
        },

        _removeUser(sUserId) {
            const oModel = this.getView().getModel();
            const sProjectId = this._sCurrentProjectId;
            
            // Call backend action using OData V4
            const oOperation = oModel.bindContext(`/removeUserFromProject(...)`);
            oOperation.setParameter("projectUserId", sUserId);
            
            oOperation.execute().then(() => {
                MessageToast.show("User removed successfully");
                this._loadProjectUsers(sProjectId);
            }).catch((oError) => {
                console.error("Failed to remove user:", oError);
                MessageBox.error("Failed to remove user");
            });
        },

        onCloseManageUsersDialog() {
            this._manageUsersDialog.close();
        }
    });
});
