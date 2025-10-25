sap.ui.define([
    "sd/solutionadvisor/utils/NavigationService"
], function (NavigationService) {
    "use strict";

    /**
     * Navigation Helper - Mixin for controllers to simplify navigation
     * Usage: Include in controller's onInit() with NavigationHelper.init(this)
     */
    return {
        /**
         * Initialize navigation helper for a controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         */
        init: function (oController) {
            if (!oController._oNavigationService) {
                const oComponent = oController.getOwnerComponent();
                oController._oNavigationService = new NavigationService(oComponent);
            }
        },

        /**
         * Get navigation service instance
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @returns {NavigationService} - Navigation service instance
         */
        getService: function (oController) {
            if (!oController._oNavigationService) {
                this.init(oController);
            }
            return oController._oNavigationService;
        },

        /**
         * Navigate to wizard from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @param {object} oParams - Navigation parameters
         */
        toWizard: function (oController, oParams) {
            this.getService(oController).toWizard(oParams);
        },

        /**
         * Navigate to projects from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         */
        toProjects: function (oController) {
            this.getService(oController).toProjects();
        },

        /**
         * Navigate to analytics from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @param {object} oParams - Navigation parameters
         */
        toAnalytics: function (oController, oParams) {
            this.getService(oController).toAnalytics(oParams);
        },

        /**
         * Navigate to analyses from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @param {object} oParams - Navigation parameters
         */
        toAnalyses: function (oController, oParams) {
            this.getService(oController).toAnalyses(oParams);
        },

        /**
         * Navigate to admin from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @param {string} sSection - Admin section
         */
        toAdmin: function (oController, sSection) {
            this.getService(oController).toAdmin(sSection);
        },

        /**
         * Navigate back from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         */
        back: function (oController) {
            this.getService(oController).back();
        },

        /**
         * Get navigation parameter from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @param {string} sParamName - Parameter name
         * @returns {string|null} - Parameter value
         */
        getParameter: function (oController, sParamName) {
            return this.getService(oController).getParameter(sParamName);
        },

        /**
         * Navigate with confirmation from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @param {object} oTarget - Navigation target
         * @param {string} sMessage - Confirmation message
         */
        navigateWithConfirmation: function (oController, oTarget, sMessage) {
            this.getService(oController).navigateWithConfirmation(oTarget, sMessage);
        },

        /**
         * Create deep link from any controller
         * @param {sap.ui.core.mvc.Controller} oController - Controller instance
         * @param {string} sSemanticObject - Semantic object
         * @param {string} sAction - Action
         * @param {object} oParams - Parameters
         * @returns {Promise<string>} - Deep link URL
         */
        createDeepLink: function (oController, sSemanticObject, sAction, oParams) {
            return this.getService(oController).createDeepLink(sSemanticObject, sAction, oParams);
        }
    };
}, true);
