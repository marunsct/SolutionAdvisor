sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sd/solutionadvisor/utils/FlowchartGenerator",
    "sd/solutionadvisor/utils/ErrorHandler",
    "sap/base/Log",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/ui/core/Fragment"
], (Controller, History, JSONModel, MessageToast, FlowchartGenerator, ErrorHandler, Log, FlattenedDataset, FeedItem, Fragment) => {
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
            
            // Check if we're in mock mode and the ID starts with "mock-"
            if (this.getOwnerComponent().mockAnalysisService && sAnalysisId.startsWith("mock-")) {
                // Create a mock analysis object
                const oMockAnalysis = this._createMockAnalysisObject(sAnalysisId);
                
                // Create a JSONModel with the mock data
                const oModel = new JSONModel(oMockAnalysis);
                this.getView().setModel(oModel, "mockAnalysis");
                
                // Set mock binding context
                this.getView().bindElement({
                    path: "/",
                    model: "mockAnalysis"
                });
                
                // Generate flowchart with mock data
                setTimeout(() => {
                    this._generateFlowchart(oMockAnalysis);
                }, 100);
            } else {
                // Real backend data
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
            }
        },
        
        /**
         * Create a mock analysis object for testing without backend
         * @param {string} sAnalysisId - The analysis ID
         * @returns {object} Mock analysis object
         * @private
         */
        _createMockAnalysisObject(sAnalysisId) {
            return {
                ID: sAnalysisId,
                ricefwId: "I-0042-MOCK",
                objectType: "Interface",
                objectName: "Mock Analysis Interface",
                recommendedLevel: "B",
                technicalDebtScore: 65,
                cloudReadinessScore: 78,
                upgradeImpactScore: 45,
                createdAt: new Date().toISOString(),
                createdBy: "Mock User",
                modifiedAt: new Date().toISOString(),
                modifiedBy: "Mock User",
                projectConfig: {
                    ID: "mock-project-1",
                    name: "Mock Project",
                    clientName: "Mock Client",
                    s4HanaFlavor: "Cloud Public",
                    complianceRequirements: ["GDPR", "SOX"],
                    createdAt: new Date().toISOString()
                },
                decisionPaths: [
                    {
                        ID: "path-1",
                        questionId: "Q1",
                        questionText: "What type of interface is this?",
                        answerId: "A1-1",
                        answerText: "Real-time synchronous",
                        step: 1
                    },
                    {
                        ID: "path-2",
                        questionId: "Q2",
                        questionText: "Is this interface part of standard SAP delivered content?",
                        answerId: "A2-2",
                        answerText: "No, it's custom",
                        step: 2
                    },
                    {
                        ID: "path-3",
                        questionId: "Q3",
                        questionText: "Are there existing BTP services for this purpose?",
                        answerId: "A3-1",
                        answerText: "Yes",
                        step: 3
                    }
                ]
            };
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
        
        _generateFlowchart(oMockData) {
            // If mock data is provided directly, use it
            if (oMockData) {
                try {
                    FlowchartGenerator.generateFlowchart(oMockData, "flowchartSvgContainer");
                    this._currentSvg = document.getElementById("flowchartSvgContainer")?.querySelector("svg");
                    return;
                } catch (error) {
                    Log.error("Failed to generate flowchart from mock data:", error);
                    ErrorHandler.showServiceError(error, "Failed to generate flowchart");
                    return;
                }
            }
            
            // Check if we're in mock mode with mock model
            if (this.getView().getModel("mockAnalysis")) {
                const oAnalysis = this.getView().getModel("mockAnalysis").getData();
                try {
                    FlowchartGenerator.generateFlowchart(oAnalysis, "flowchartSvgContainer");
                    this._currentSvg = document.getElementById("flowchartSvgContainer")?.querySelector("svg");
                } catch (error) {
                    Log.error("Failed to generate flowchart from mock model:", error);
                    ErrorHandler.showServiceError(error, "Failed to generate flowchart");
                }
                return;
            }
            
            // Normal backend data flow
            const oContext = this.getView().getBindingContext();
            if (!oContext) return;
            
            const oAnalysis = oContext.getObject();
            if (!oAnalysis) return;
            
            // Load decision paths using context binding with $expand
            const oModel = this.getView().getModel();
            const oBinding = oModel.bindContext(`/Analyses('${oAnalysis.ID}')`, null, {
                $expand: "decisionPaths"
            });
            
            oBinding.requestObject().then((oData) => {
                const analysisData = {
                    ...oData,
                    decisionPaths: oData.decisionPaths || []
                };
                
                // Generate flowchart
                try {
                    FlowchartGenerator.generateFlowchart(analysisData, "flowchartSvgContainer");
                    this._currentSvg = document.getElementById("flowchartSvgContainer")?.querySelector("svg");
                } catch (error) {
                    Log.error("Failed to generate flowchart:", error);
                    ErrorHandler.showServiceError(error, "Failed to generate flowchart");
                }
            }).catch((oError) => {
                Log.error("Failed to load decision paths:", oError);
                ErrorHandler.showServiceError(oError, "Failed to load decision paths");
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
            const oContext = this.getView().getBindingContext();
            if (!oContext) {
                MessageToast.show("No analysis data available");
                return;
            }
            
            const oAnalysis = oContext.getObject();
            const filename = `flowchart_${oAnalysis.ricefwId}.png`;
            
            this.getView().setBusy(true);
            
            FlowchartGenerator.exportAsPNG("flowchartSvgContainer", filename)
                .then(() => {
                    this.getView().setBusy(false);
                    MessageToast.show("Flowchart exported as PNG");
                })
                .catch((error) => {
                    this.getView().setBusy(false);
                    Log.error("Failed to export PNG:", error);
                    ErrorHandler.showServiceError(error, "Failed to export PNG");
                });
        },
        
        onExportFlowchartPDF() {
            const oContext = this.getView().getBindingContext();
            if (!oContext) {
                MessageToast.show("No analysis data available");
                return;
            }
            
            const oAnalysis = oContext.getObject();
            const filename = `flowchart_${oAnalysis.ricefwId}.pdf`;
            
            this.getView().setBusy(true);
            
            FlowchartGenerator.exportAsPDF("flowchartSvgContainer", oAnalysis, filename)
                .then(() => {
                    this.getView().setBusy(false);
                    MessageToast.show("Flowchart exported as PDF");
                })
                .catch((error) => {
                    this.getView().setBusy(false);
                    Log.error("Failed to export PDF:", error);
                    ErrorHandler.showServiceError(error, "Failed to export PDF");
                });
        },

        onExportFlowchartSVG() {
            const oContext = this.getView().getBindingContext();
            if (!oContext) {
                MessageToast.show("No analysis data available");
                return;
            }
            
            const oAnalysis = oContext.getObject();
            const filename = `flowchart_${oAnalysis.ricefwId}`;
            
            try {
                FlowchartGenerator.exportAsSVG("flowchartSvgContainer", filename);
                MessageToast.show("Flowchart exported as SVG");
            } catch (error) {
                Log.error("Failed to export SVG:", error);
                ErrorHandler.showServiceError(error, "Failed to export SVG");
            }
        },

        /**
         * Setup radar chart for scoring visualization
         * @private
         */
        _setupRadarChart: function() {
            const oContext = this.getView().getBindingContext();
            if (!oContext) {
                return;
            }

            const oAnalysis = oContext.getObject();
            
            // Prepare radar chart data
            const radarData = [
                { 
                    metric: "Technical Debt", 
                    value: oAnalysis.technicalDebtScore || 0 
                },
                { 
                    metric: "Cloud Readiness", 
                    value: oAnalysis.cloudReadinessScore || 0 
                },
                { 
                    metric: "Upgrade Impact", 
                    value: oAnalysis.upgradeImpactScore || 0 
                }
            ];

            // Create JSON model for radar data
            const oRadarModel = new JSONModel({ radarData: radarData });
            this.getView().setModel(oRadarModel, "radarModel");

            // Load and configure radar chart fragment if not already loaded
            if (!this._oRadarChartFragment) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "sd.solutionadvisor.view.fragments.RadarChart",
                    controller: this
                }).then(function(oFragment) {
                    this._oRadarChartFragment = oFragment;
                    // Add fragment to the container in the view
                    const oContainer = this.byId("radarChartContainer");
                    if (oContainer) {
                        oContainer.addItem(oFragment);
                    }
                    this._configureRadarChart();
                }.bind(this));
            } else {
                this._configureRadarChart();
            }
        },

        /**
         * Configure radar chart with data
         * @private
         */
        _configureRadarChart: function() {
            const oVizFrame = this.byId("radarChart");
            if (!oVizFrame) {
                return;
            }

            const oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Metric",
                    value: "{radarModel>metric}"
                }],
                measures: [{
                    name: "Score",
                    value: "{radarModel>value}"
                }],
                data: {
                    path: "radarModel>/radarData"
                }
            });

            oVizFrame.setDataset(oDataset);
            
            const feedValueAxis = new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: ["Score"]
            });

            const feedCategoryAxis = new FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Metric"]
            });

            oVizFrame.removeAllFeeds();
            oVizFrame.addFeed(feedValueAxis);
            oVizFrame.addFeed(feedCategoryAxis);
        },

        /**
         * Show scoring drill-down dialog
         */
        onScoringDrillDown: function() {
            const oContext = this.getView().getBindingContext();
            if (!oContext) {
                MessageToast.show("No analysis data available");
                return;
            }

            if (!this._oScoringDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "sd.solutionadvisor.view.fragments.ScoringDrillDownDialog",
                    controller: this
                }).then(function(oDialog) {
                    this._oScoringDialog = oDialog;
                    this.getView().addDependent(this._oScoringDialog);
                    this._openScoringDialog();
                }.bind(this));
            } else {
                this._openScoringDialog();
            }
        },

        /**
         * Open scoring drill-down dialog with data
         * @private
         */
        _openScoringDialog: function() {
            const oAnalysis = this.getView().getBindingContext().getObject();
            const breakdownData = this._prepareScoringBreakdown(oAnalysis);

            const oModel = new JSONModel(breakdownData);
            this._oScoringDialog.setModel(oModel, "scoring");

            this._oScoringDialog.open();
        },

        /**
         * Prepare scoring breakdown data
         * @param {object} analysis - Analysis object
         * @returns {object} Breakdown data
         * @private
         */
        _prepareScoringBreakdown: function(analysis) {
            // Parse decision path if it's a string
            let decisionPath = [];
            if (typeof analysis.decisionPath === 'string') {
                try {
                    decisionPath = JSON.parse(analysis.decisionPath);
                } catch (e) {
                    Log.error("Failed to parse decision path:", e);
                }
            } else if (Array.isArray(analysis.decisionPath)) {
                decisionPath = analysis.decisionPath;
            }

            const technicalDebtBreakdown = decisionPath.map(step => ({
                stepDescription: step.questionText || 'Decision Step',
                level: step.recommendedLevel || 'Unknown',
                weight: this._getLevelWeight(step.recommendedLevel),
                factor: step.complexityFactor || 1.0,
                contribution: Math.round(this._getLevelWeight(step.recommendedLevel) * (step.complexityFactor || 1.0))
            }));

            return {
                technicalDebtBreakdown: technicalDebtBreakdown,
                cloudReadinessExplanation: `Level A: ${this._countLevel(decisionPath, 'A')}, Level B: ${this._countLevel(decisionPath, 'B')}`,
                upgradeImpactExplanation: `Total impact based on ${decisionPath.length} decision points`
            };
        },

        /**
         * Get weight for clean core level
         * @param {string} level - Clean core level (A/B/C/D)
         * @returns {number} Weight value
         * @private
         */
        _getLevelWeight: function(level) {
            const weights = {
                'A': 0.0,
                'B': 1.0,
                'C': 3.0,
                'D': 5.0
            };
            return weights[level] || 0;
        },

        /**
         * Count occurrences of a level in decision path
         * @param {array} path - Decision path array
         * @param {string} level - Level to count
         * @returns {number} Count
         * @private
         */
        _countLevel: function(path, level) {
            return path.filter(step => step.recommendedLevel === level).length;
        },

        /**
         * Close scoring drill-down dialog
         */
        onCloseDrillDown: function() {
            if (this._oScoringDialog) {
                this._oScoringDialog.close();
            }
        }
    });
});
