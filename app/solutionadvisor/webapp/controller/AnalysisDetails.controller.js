sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], (Controller, History, MessageToast) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.AnalysisDetails", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("AnalysisDetails").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched(oEvent) {
            const sAnalysisId = oEvent.getParameter("arguments").key;
            this.getView().bindElement({
                path: `/Analyses(${sAnalysisId})`,
                parameters: {
                    expand: "projectConfig,decisionPaths"
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
                oRouter.navTo("AnalysesList", {}, true);
            }
        },

        onExportFlowchart() {
            MessageToast.show("Flowchart export functionality will be implemented");
            // TODO: Call exportFlowchart action
        }
    });
});
