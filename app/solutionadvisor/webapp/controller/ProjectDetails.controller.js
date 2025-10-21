sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], (Controller, History) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.ProjectDetails", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("ProjectDetails").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched(oEvent) {
            const sProjectId = oEvent.getParameter("arguments").key;
            this.getView().bindElement({
                path: `/Projects(${sProjectId})`,
                parameters: {
                    expand: "analyses"
                }
            });
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

        onNewAnalysis() {
            this.getOwnerComponent().getRouter().navTo("Wizard");
        }
    });
});
