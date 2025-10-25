sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseObject, MessageToast, MessageBox) {
    "use strict";

    /**
     * Navigation Service - Centralized cross-app navigation for SAP Clean Core Solution Advisor
     * Provides intent-based navigation with parameter passing and deep linking support
     */
    return BaseObject.extend("sd.solutionadvisor.utils.NavigationService", {
        
        /**
         * Constructor
         */
        constructor: function (oComponent) {
            this._oComponent = oComponent;
            this._oCrossAppNavigator = null;
            this._oShellNavigation = null;
            this._bInitialized = false;
            
            // Initialize navigation services
            this._initialize();
        },

        /**
         * Initialize navigation services
         */
        _initialize: function () {
            const that = this;
            
            if (sap.ushell && sap.ushell.Container) {
                // Get CrossApplicationNavigation service
                sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oService) {
                    that._oCrossAppNavigator = oService;
                    that._bInitialized = true;
                }).catch(function (oError) {
                    console.error("Failed to initialize CrossApplicationNavigation:", oError);
                });
                
                // Get ShellNavigation service
                sap.ushell.Container.getServiceAsync("ShellNavigation").then(function (oService) {
                    that._oShellNavigation = oService;
                }).catch(function (oError) {
                    console.error("Failed to initialize ShellNavigation:", oError);
                });
            } else {
                console.warn("SAP Fiori Launchpad services not available");
            }
        },

        /**
         * Navigate to wizard (create new analysis)
         * @param {object} oParams - Navigation parameters
         * @param {string} oParams.projectId - Project ID (optional)
         * @param {string} oParams.sessionId - Session ID for resume (optional)
         * @param {string} oParams.analysisId - Analysis ID for edit (optional)
         */
        toWizard: function (oParams) {
            oParams = oParams || {};
            
            if (this._oCrossAppNavigator) {
                this._oCrossAppNavigator.toExternal({
                    target: {
                        semanticObject: "SolutionAdvisor",
                        action: "wizard"
                    },
                    params: {
                        projectId: oParams.projectId || "",
                        sessionId: oParams.sessionId || "",
                        analysisId: oParams.analysisId || ""
                    }
                });
            } else {
                // Fallback to router navigation
                this._navigateViaRouter("Wizard", {
                    projectId: oParams.projectId || "",
                    sessionId: oParams.sessionId || "",
                    analysisId: oParams.analysisId || ""
                });
            }
        },

        /**
         * Navigate to projects list
         */
        toProjects: function () {
            if (this._oCrossAppNavigator) {
                this._oCrossAppNavigator.toExternal({
                    target: {
                        semanticObject: "SolutionAdvisor",
                        action: "projects"
                    }
                });
            } else {
                this._navigateViaRouter("ProjectsList");
            }
        },

        /**
         * Navigate to project details
         * @param {string} sProjectId - Project ID
         */
        toProjectDetails: function (sProjectId) {
            if (!sProjectId) {
                MessageBox.error("Project ID is required");
                return;
            }
            
            const oRouter = this._oComponent.getRouter();
            oRouter.navTo("ProjectDetails", {
                key: sProjectId
            });
        },

        /**
         * Navigate to analytics dashboard
         * @param {object} oParams - Navigation parameters
         * @param {string} oParams.projectId - Filter by project (optional)
         * @param {string} oParams.dateFrom - Filter from date (optional)
         * @param {string} oParams.dateTo - Filter to date (optional)
         */
        toAnalytics: function (oParams) {
            oParams = oParams || {};
            
            if (this._oCrossAppNavigator) {
                this._oCrossAppNavigator.toExternal({
                    target: {
                        semanticObject: "SolutionAdvisor",
                        action: "analytics"
                    },
                    params: {
                        projectId: oParams.projectId || "",
                        dateFrom: oParams.dateFrom || "",
                        dateTo: oParams.dateTo || ""
                    }
                });
            } else {
                this._navigateViaRouter("AnalyticsDashboard");
            }
        },

        /**
         * Navigate to analyses list
         * @param {object} oParams - Navigation parameters
         * @param {string} oParams.projectId - Filter by project (optional)
         * @param {string} oParams.status - Filter by status (optional)
         * @param {string} oParams.level - Filter by clean core level (optional)
         */
        toAnalyses: function (oParams) {
            oParams = oParams || {};
            
            if (this._oCrossAppNavigator) {
                this._oCrossAppNavigator.toExternal({
                    target: {
                        semanticObject: "SolutionAdvisor",
                        action: "analyses"
                    },
                    params: {
                        projectId: oParams.projectId || "",
                        status: oParams.status || "",
                        level: oParams.level || ""
                    }
                });
            } else {
                // Fallback to router with project filter
                if (oParams.projectId && oParams.projectName) {
                    this._navigateViaRouter("AnalysesList", {
                        projectId: oParams.projectId,
                        projectName: oParams.projectName
                    });
                } else {
                    MessageToast.show("Navigation requires project context");
                }
            }
        },

        /**
         * Navigate to analysis details
         * @param {string} sAnalysisId - Analysis ID
         */
        toAnalysisDetails: function (sAnalysisId) {
            if (!sAnalysisId) {
                MessageBox.error("Analysis ID is required");
                return;
            }
            
            const oRouter = this._oComponent.getRouter();
            oRouter.navTo("AnalysisDetails", {
                key: sAnalysisId
            });
        },

        /**
         * Navigate to administration
         * @param {string} sSection - Admin section (optional: questionflow, thresholds)
         */
        toAdmin: function (sSection) {
            if (this._oCrossAppNavigator) {
                this._oCrossAppNavigator.toExternal({
                    target: {
                        semanticObject: "SolutionAdvisor",
                        action: "admin"
                    }
                });
            } else {
                if (sSection === "questionflow") {
                    this._navigateViaRouter("AdminQuestionFlow");
                } else if (sSection === "thresholds") {
                    this._navigateViaRouter("AdminPerformanceThreshold");
                } else {
                    this._navigateViaRouter("Admin");
                }
            }
        },

        /**
         * Navigate back (shell-aware)
         */
        back: function () {
            if (this._oShellNavigation) {
                // Use shell navigation to go back
                window.history.back();
            } else {
                // Fallback to app router
                const oRouter = this._oComponent.getRouter();
                oRouter.navTo("ProjectsList");
            }
        },

        /**
         * Navigate to home (launchpad home)
         */
        toHome: function () {
            if (this._oCrossAppNavigator) {
                this._oCrossAppNavigator.toExternal({
                    target: {
                        semanticObject: "Shell",
                        action: "home"
                    }
                });
            } else {
                this._navigateViaRouter("ProjectsList");
            }
        },

        /**
         * Get navigation parameters from URL
         * @returns {object} - Navigation parameters
         */
        getNavigationParameters: function () {
            if (this._oComponent) {
                const oComponentData = this._oComponent.getComponentData();
                if (oComponentData && oComponentData.startupParameters) {
                    return oComponentData.startupParameters;
                }
            }
            return {};
        },

        /**
         * Parse and extract specific parameter
         * @param {string} sParamName - Parameter name
         * @returns {string|null} - Parameter value or null
         */
        getParameter: function (sParamName) {
            const oParams = this.getNavigationParameters();
            if (oParams && oParams[sParamName]) {
                // Startup parameters are arrays
                return oParams[sParamName][0] || null;
            }
            return null;
        },

        /**
         * Check if navigation service is initialized
         */
        isInitialized: function () {
            return this._bInitialized;
        },

        /**
         * Fallback navigation via router (standalone mode)
         * @param {string} sRouteName - Route name
         * @param {object} oParameters - Route parameters
         */
        _navigateViaRouter: function (sRouteName, oParameters) {
            const oRouter = this._oComponent.getRouter();
            if (oRouter) {
                oRouter.navTo(sRouteName, oParameters || {});
            } else {
                console.error("Router not available for navigation");
            }
        },

        /**
         * Get supported intents for current app
         * @returns {Promise} - Promise resolving to array of supported intents
         */
        getSupportedIntents: function () {
            const that = this;
            
            if (!this._oCrossAppNavigator) {
                return Promise.resolve([]);
            }
            
            return this._oCrossAppNavigator.getLinks({
                semanticObject: "SolutionAdvisor"
            }).then(function (aLinks) {
                return aLinks;
            }).catch(function (oError) {
                console.error("Failed to get supported intents:", oError);
                return [];
            });
        },

        /**
         * Check if specific intent is supported
         * @param {string} sSemanticObject - Semantic object
         * @param {string} sAction - Action
         * @returns {Promise<boolean>} - Promise resolving to true/false
         */
        isIntentSupported: function (sSemanticObject, sAction) {
            if (!this._oCrossAppNavigator) {
                return Promise.resolve(false);
            }
            
            return this._oCrossAppNavigator.isIntentSupported([
                "#" + sSemanticObject + "-" + sAction
            ]).then(function (oResult) {
                const sIntent = "#" + sSemanticObject + "-" + sAction;
                return oResult[sIntent] && oResult[sIntent].supported;
            }).catch(function () {
                return false;
            });
        },

        /**
         * Navigate with confirmation dialog
         * @param {object} oTarget - Navigation target
         * @param {string} sMessage - Confirmation message
         */
        navigateWithConfirmation: function (oTarget, sMessage) {
            const that = this;
            
            MessageBox.confirm(
                sMessage || "Do you want to navigate away? Unsaved changes will be lost.",
                {
                    title: "Confirm Navigation",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            if (oTarget.semanticObject && oTarget.action) {
                                that._oCrossAppNavigator.toExternal({
                                    target: oTarget,
                                    params: oTarget.params || {}
                                });
                            } else if (oTarget.route) {
                                that._navigateViaRouter(oTarget.route, oTarget.params);
                            }
                        }
                    }
                }
            );
        },

        /**
         * Get navigation hash for intent
         * @param {string} sSemanticObject - Semantic object
         * @param {string} sAction - Action
         * @param {object} oParams - Parameters
         * @returns {Promise<string>} - Promise resolving to navigation hash
         */
        getNavigationHash: function (sSemanticObject, sAction, oParams) {
            if (!this._oCrossAppNavigator) {
                return Promise.resolve("");
            }
            
            return this._oCrossAppNavigator.hrefForExternal({
                target: {
                    semanticObject: sSemanticObject,
                    action: sAction
                },
                params: oParams || {}
            });
        },

        /**
         * Create deep link URL
         * @param {string} sSemanticObject - Semantic object
         * @param {string} sAction - Action
         * @param {object} oParams - Parameters
         * @returns {Promise<string>} - Promise resolving to deep link URL
         */
        createDeepLink: function (sSemanticObject, sAction, oParams) {
            return this.getNavigationHash(sSemanticObject, sAction, oParams).then(function (sHash) {
                return window.location.origin + window.location.pathname + sHash;
            });
        }
    });
}, true);
