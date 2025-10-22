sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sd/solutionadvisor/utils/FlowchartGenerator"
], (Controller, History, JSONModel, MessageToast, FlowchartGenerator) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.AnalysisDetails", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("AnalysisDetails").attachPatternMatched(this._onObjectMatched, this);
            
            // Listen to tab selection to generate flowchart when tab is selected
            const oIconTabBar = this.byId("analysisIconTabBar");
            if (oIconTabBar) {
                oIconTabBar.attachSelect(this._onTabSelect, this);
            }
        },

        _onObjectMatched(oEvent) {
            const sAnalysisId = oEvent.getParameter("arguments").key;
            this.getView().bindElement({
                path: `/Analyses('${sAnalysisId}')`,
                parameters: {
                    expand: "projectConfig,decisionPaths"
                },
                events: {
                    dataReceived: () => {
                        // Generate flowchart after data is loaded
                        this._generateFlowchart();
                    }
                }
            });
        },
        
        _onTabSelect(oEvent) {
            const sKey = oEvent.getParameter("key");
            if (sKey === "flowchart") {
                // Regenerate flowchart when tab is selected
                setTimeout(() => {
                    this._generateFlowchart();
                }, 100);
            }
        },
        
        _generateFlowchart() {
            const oContext = this.getView().getBindingContext();
            if (!oContext) return;
            
            const oAnalysis = oContext.getObject();
            if (!oAnalysis || !oAnalysis.decisionPaths) return;
            
            // Check if we have decision paths data
            const oModel = this.getView().getModel();
            oModel.read(`/Analyses('${oAnalysis.ID}')/decisionPaths`, {
                success: (oData) => {
                    const analysisData = {
                        ...oAnalysis,
                        decisionPaths: oData.results || []
                    };
                    
                    // Generate flowchart
                    try {
                        FlowchartGenerator.generateFlowchart(analysisData, "flowchartSvgContainer");
                        this._currentSvg = document.getElementById("flowchartSvgContainer")?.querySelector("svg");
                    } catch (error) {
                        console.error("Failed to generate flowchart:", error);
                        MessageToast.show("Failed to generate flowchart");
                    }
                },
                error: (oError) => {
                    console.error("Failed to load decision paths:", oError);
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
                oRouter.navTo("AnalysesList", {
                    projectId: "all",
                    projectName: "All Projects"
                }, true);
            }
        },
        
        onViewFlowchart() {
            // Switch to flowchart tab
            const oIconTabBar = this.byId("analysisIconTabBar");
            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("flowchart");
            }
        },

        onExportFlowchartPNG() {
            if (!this._currentSvg) {
                MessageToast.show("Please view the flowchart first");
                return;
            }
            
            const oContext = this.getView().getBindingContext();
            const oAnalysis = oContext.getObject();
            const filename = `flowchart_${oAnalysis.ricefwId}.png`;
            
            try {
                FlowchartGenerator.exportAsPNG(this._currentSvg, filename);
                MessageToast.show("Flowchart exported as PNG");
            } catch (error) {
                console.error("Failed to export PNG:", error);
                MessageToast.show("Failed to export PNG");
            }
        },
        
        onExportFlowchartPDF() {
            if (!this._currentSvg) {
                MessageToast.show("Please view the flowchart first");
                return;
            }
            
            const oContext = this.getView().getBindingContext();
            const oAnalysis = oContext.getObject();
            const filename = `flowchart_${oAnalysis.ricefwId}`;
            
            try {
                FlowchartGenerator.exportAsPDF(this._currentSvg, filename);
                MessageToast.show("Flowchart exported as SVG (PDF export requires additional libraries)");
            } catch (error) {
                console.error("Failed to export PDF:", error);
                MessageToast.show("Failed to export PDF");
            }
        }
    });
});
