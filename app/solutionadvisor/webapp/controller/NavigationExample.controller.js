sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sd/solutionadvisor/utils/NavigationHelper"
], function (Controller, NavigationHelper) {
    "use strict";

    /**
     * Example Controller with Cross-App Navigation Integration
     * Demonstrates how to use NavigationService and NavigationHelper
     */
    return Controller.extend("sd.solutionadvisor.controller.NavigationExample", {
        
        onInit: function () {
            // Initialize navigation helper
            NavigationHelper.init(this);
            
            // Check for navigation parameters (e.g., projectId from deep link)
            const sProjectId = NavigationHelper.getParameter(this, "projectId");
            if (sProjectId) {
                console.log("Opened with projectId:", sProjectId);
                // Load project-specific data
                this._loadProjectData(sProjectId);
            }
            
            // Check for status filter parameter
            const sStatus = NavigationHelper.getParameter(this, "status");
            if (sStatus) {
                console.log("Opened with status filter:", sStatus);
                // Apply filter to list
                this._applyStatusFilter(sStatus);
            }
        },

        /**
         * Navigate to wizard (create new analysis)
         */
        onCreateAnalysis: function () {
            // Navigate to wizard without parameters (new analysis)
            NavigationHelper.toWizard(this);
        },

        /**
         * Navigate to wizard with project context
         */
        onCreateAnalysisForProject: function (oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sProjectId = oContext.getProperty("ID");
            
            // Navigate to wizard with projectId parameter
            NavigationHelper.toWizard(this, {
                projectId: sProjectId
            });
        },

        /**
         * Resume wizard session
         */
        onResumeWizard: function (oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sSessionId = oContext.getProperty("ID");
            const sProjectId = oContext.getProperty("project_ID");
            
            // Navigate to wizard with sessionId to resume
            NavigationHelper.toWizard(this, {
                projectId: sProjectId,
                sessionId: sSessionId
            });
        },

        /**
         * Navigate to analytics dashboard
         */
        onShowAnalytics: function () {
            // Navigate to analytics without filters
            NavigationHelper.toAnalytics(this);
        },

        /**
         * Navigate to analytics with project filter
         */
        onShowProjectAnalytics: function (oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sProjectId = oContext.getProperty("ID");
            
            // Navigate to analytics filtered by project
            NavigationHelper.toAnalytics(this, {
                projectId: sProjectId
            });
        },

        /**
         * Navigate to analytics with date range
         */
        onShowTrendAnalytics: function () {
            // Get date range from date picker (example)
            const oDatePicker = this.byId("dateRangePicker");
            const oDateRange = oDatePicker.getDateValue();
            
            if (oDateRange) {
                const sDateFrom = oDateRange.from.toISOString().split('T')[0];
                const sDateTo = oDateRange.to.toISOString().split('T')[0];
                
                NavigationHelper.toAnalytics(this, {
                    dateFrom: sDateFrom,
                    dateTo: sDateTo
                });
            } else {
                NavigationHelper.toAnalytics(this);
            }
        },

        /**
         * Navigate to analyses list
         */
        onShowAllAnalyses: function () {
            // Navigate to all analyses
            NavigationHelper.toAnalyses(this);
        },

        /**
         * Navigate to analyses filtered by project
         */
        onShowProjectAnalyses: function (oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sProjectId = oContext.getProperty("ID");
            const sProjectName = oContext.getProperty("projectName");
            
            // Navigate to analyses filtered by project
            NavigationHelper.toAnalyses(this, {
                projectId: sProjectId,
                projectName: sProjectName
            });
        },

        /**
         * Navigate to analyses filtered by status
         */
        onShowPendingAnalyses: function () {
            // Navigate to analyses with status filter
            NavigationHelper.toAnalyses(this, {
                status: "In Progress"
            });
        },

        /**
         * Navigate to analyses filtered by clean core level
         */
        onShowLevelAnalyses: function (sLevel) {
            // Navigate to analyses filtered by level (A, B, C, or D)
            NavigationHelper.toAnalyses(this, {
                level: sLevel
            });
        },

        /**
         * Navigate to administration
         */
        onShowAdmin: function () {
            NavigationHelper.toAdmin(this);
        },

        /**
         * Navigate to specific admin section
         */
        onManageQuestionFlow: function () {
            NavigationHelper.toAdmin(this, "questionflow");
        },

        /**
         * Navigate to specific admin section
         */
        onManageThresholds: function () {
            NavigationHelper.toAdmin(this, "thresholds");
        },

        /**
         * Navigate back with confirmation if there are unsaved changes
         */
        onCancel: function () {
            if (this._hasUnsavedChanges()) {
                NavigationHelper.navigateWithConfirmation(
                    this,
                    { route: "ProjectsList" },
                    "You have unsaved changes. Do you want to discard them?"
                );
            } else {
                NavigationHelper.back(this);
            }
        },

        /**
         * Create and share deep link
         */
        onShareAnalysis: function (oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const sAnalysisId = oContext.getProperty("ID");
            
            // Create deep link
            NavigationHelper.createDeepLink(
                this,
                "SolutionAdvisor",
                "analyses",
                { analysisId: sAnalysisId }
            ).then(function (sDeepLink) {
                // Copy to clipboard
                navigator.clipboard.writeText(sDeepLink).then(function () {
                    sap.m.MessageToast.show("Deep link copied to clipboard: " + sDeepLink);
                }).catch(function () {
                    // Fallback: show in dialog
                    sap.m.MessageBox.information("Deep Link:\n" + sDeepLink);
                });
            });
        },

        /**
         * Example: Check if changes are unsaved
         */
        _hasUnsavedChanges: function () {
            // Implement your logic to check for unsaved changes
            return false;
        },

        /**
         * Example: Load data based on navigation parameter
         */
        _loadProjectData: function (sProjectId) {
            // Load project-specific data
            const oModel = this.getView().getModel();
            const oBinding = oModel.bindContext("/Projects(" + sProjectId + ")");
            
            oBinding.requestObject().then(function (oProject) {
                console.log("Loaded project:", oProject);
                // Use project data
            }).catch(function (oError) {
                console.error("Failed to load project:", oError);
            });
        },

        /**
         * Example: Apply filter based on navigation parameter
         */
        _applyStatusFilter: function (sStatus) {
            const oList = this.byId("analysesList");
            if (oList) {
                const oBinding = oList.getBinding("items");
                const aFilters = [new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, sStatus)];
                oBinding.filter(aFilters);
            }
        }
    });
});
