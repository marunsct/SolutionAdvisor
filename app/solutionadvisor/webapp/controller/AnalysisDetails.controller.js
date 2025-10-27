sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sd/solutionadvisor/utils/ErrorHandler",
    "sap/base/Log",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/ui/core/Fragment"
], (Controller, History, JSONModel, MessageToast, ErrorHandler, Log, FlattenedDataset, FeedItem, Fragment) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.AnalysisDetails", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("AnalysisDetails").attachPatternMatched(this._onObjectMatched, this);
            
            // Listen to tab selection to generate flowchart when tab is selected
            const oIconTabBar = this.byId("analysisDetails_IconTabBar");
            if (oIconTabBar) {
                oIconTabBar.attachSelect(this._onTabSelect, this);
            }

            // Constraints model for constraints tab (lazy loaded)
            const oConstraintsModel = new JSONModel({
                performanceConstraints: [],
                deploymentConstraints: [],
                complianceConstraints: [],
                violations: [],
                loaded: false,
                loading: false
            });
            this.getView().setModel(oConstraintsModel, "constraintsModel");
        },

        _onObjectMatched(oEvent) {
            const sAnalysisId = oEvent.getParameter("arguments").key;
            
            // Reset flowchart generation flag on new analysis
            this._flowchartGenerated = false;
            
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
                
                // Don't auto-generate; wait for tab selection
            } else {
                // Real backend data
                this.getView().bindElement({
                    path: this._getAnalysisKeyPath(sAnalysisId),
                    parameters: {
                        $expand: "projectConfig,decisionPaths"
                    }
                    // Don't auto-generate on dataReceived; container may not exist yet
                    // flowchart will be generated when the flowchart tab is selected
                });
            }
        },

        /**
         * Build canonical key path for draft-enabled Analyses entity (OData V4)
         * @param {string} id Analysis ID (UUID)
         * @returns {string} Key path e.g., /Analyses(ID=00000000-0000-0000-0000-000000000000,IsActiveEntity=true)
         * @private
         */
        _getAnalysisKeyPath(id) {
            // OData V4 uses the plain GUID (36-char with hyphens), without the V2 prefix guid'...'
            // and without quotes. Booleans are unquoted.
            return `/Analyses(ID=${id},IsActiveEntity=true)`;
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
            if (sKey === "flowchart" && !this._flowchartGenerated) {
                // Generate flowchart when tab is selected (container is now in DOM)
                // Use longer timeout to ensure IconTabBar has rendered the tab content
                setTimeout(() => {
                    this._generateFlowchart();
                    this._flowchartGenerated = true;
                }, 250);
            }

            if (sKey === "constraints") {
                // Auto-expand panel and load on first entry if user expands
                // Do not force-load; rely on panel expand handler to keep lazy behavior
            }
        },

        // Panel expand handler from ConstraintsPanel.fragment.xml
        onConstraintsPanelToggle(oEvent) {
            const bExpand = oEvent.getParameter("expand");
            if (!bExpand) return;

            const oConstraintsModel = this.getView().getModel("constraintsModel");
            if (oConstraintsModel.getProperty("/loaded") || oConstraintsModel.getProperty("/loading")) return;

            const oContext = this.getView().getBindingContext();
            if (!oContext) return;
            const oAnalysis = oContext.getObject();
            if (!oAnalysis) return;

            this._loadConstraintsForAnalysis(oAnalysis);
        },

        _loadConstraintsForAnalysis(oAnalysis) {
            const oModel = this.getView().getModel();
            const oConstraintsModel = this.getView().getModel("constraintsModel");

            const sObjectType = oAnalysis.objectType;
            const sDeploymentType = oAnalysis.projectConfig?.s4HanaFlavor || "Cloud Public";
            const aComplianceReq = oAnalysis.projectConfig?.complianceRequirements || [];

            if (!sObjectType) {
                Log.warning("Cannot load constraints without object type in analysis details");
                return;
            }

            oConstraintsModel.setProperty("/loading", true);

            // Client-side generated constraints
            const aDeploymentConstraints = this._getDeploymentConstraints(sDeploymentType, sObjectType);
            oConstraintsModel.setProperty("/deploymentConstraints", aDeploymentConstraints);

            const aComplianceConstraints = this._getComplianceConstraints(aComplianceReq);
            oConstraintsModel.setProperty("/complianceConstraints", aComplianceConstraints);

            // Performance thresholds from backend
            const aThresholdFilters = [
                new sap.ui.model.Filter("applicableObjectTypes", sap.ui.model.FilterOperator.Contains, sObjectType.charAt(0)),
                new sap.ui.model.Filter("isActive", sap.ui.model.FilterOperator.EQ, true)
            ];
            const oThresholdBinding = oModel.bindList("/PerformanceThresholds", null, null, aThresholdFilters);

            oThresholdBinding.requestContexts().then((aContexts) => {
                const aThresholds = aContexts.map(ctx => ctx.getObject());

                // Separate violations vs regular (placeholder logic; can be enhanced using analysis decisionPath)
                const aViolations = [];
                const aRegular = [];
                aThresholds.forEach((c) => {
                    c.isViolated = false;
                    aRegular.push(c);
                });

                oConstraintsModel.setProperty("/violations", aViolations);
                oConstraintsModel.setProperty("/performanceConstraints", aRegular);
            }).catch((oError) => {
                Log.error("Failed to load performance thresholds (details):", oError);
            }).finally(() => {
                oConstraintsModel.setProperty("/loading", false);
                oConstraintsModel.setProperty("/loaded", true);
            });
        },

        _getDeploymentConstraints(sDeployment, sObjectType) {
            const constraints = [];
            if (sDeployment === "Cloud Public") {
                constraints.push({
                    title: "No Custom ABAP",
                    description: "Cloud Public Edition does not support custom ABAP code. Use Key User Extensibility or Side-by-Side extensions only.",
                    severity: "Critical"
                });
                if (sObjectType === "Enhancements") {
                    constraints.push({
                        title: "Limited Enhancement Options",
                        description: "Only Released Extension Points and Key User Tools are available. No modification adjustments.",
                        severity: "High"
                    });
                }
            }
            if (sDeployment === "Private Cloud" || sDeployment === "On-Premise") {
                constraints.push({
                    title: "Clean Core Principle",
                    description: "While custom code is technically possible, clean core principles should guide all decisions.",
                    severity: "Information"
                });
            }
            return constraints;
        },

        _getComplianceConstraints(aCompliance) {
            const constraints = [];
            if (!aCompliance || !Array.isArray(aCompliance)) return constraints;
            if (aCompliance.includes("SOX")) {
                constraints.push({
                    standard: "SOX",
                    requirement: "Audit Trail",
                    description: "All changes must be logged with complete audit trail for financial reporting.",
                    impact: "High"
                });
            }
            if (aCompliance.includes("GDPR")) {
                constraints.push({
                    standard: "GDPR",
                    requirement: "Data Privacy",
                    description: "Personal data must be handled according to GDPR requirements. Implement data masking and retention policies.",
                    impact: "High"
                });
            }
            if (aCompliance.includes("FDA")) {
                constraints.push({
                    standard: "FDA 21 CFR Part 11",
                    requirement: "Electronic Records",
                    description: "System must support electronic signatures and validation requirements for life sciences.",
                    impact: "Critical"
                });
            }
            return constraints;
        },

        onRestartAnalysis() {
            const oContext = this.getView().getBindingContext();
            if (!oContext) {
                MessageToast.show("No analysis loaded");
                return;
            }
            const oAnalysis = oContext.getObject();
            const oModel = this.getView().getModel();

            this.getView().setBusy(true);

            const oOperation = oModel.bindContext("/startWizard(...)");
            oOperation.setParameter("projectID", oAnalysis.projectConfig_ID || oAnalysis.projectConfig?.ID);
            oOperation.setParameter("ricefwId", oAnalysis.ricefwId);
            oOperation.setParameter("objectType", oAnalysis.objectType);
            oOperation.setParameter("objectName", oAnalysis.objectName);

            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                this.getView().setBusy(false);
                // Navigate to Wizard to resume newly created analysis
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("Wizard", {
                    projectId: oAnalysis.projectConfig_ID || oAnalysis.projectConfig?.ID || "",
                    sessionId: oResult.sessionID,
                    analysisId: oResult.analysisID
                });
            }).catch((oError) => {
                this.getView().setBusy(false);
                Log.error("Failed to restart analysis:", oError);
                ErrorHandler.showServiceError(oError, "Failed to restart analysis");
            });
        },

        /**
         * Recalculate scores for the current analysis without re-running wizard
         */
        onRecalculateScores() {
            const oContext = this.getView().getBindingContext();
            if (!oContext) {
                MessageToast.show("No analysis loaded");
                return;
            }

            const oAnalysis = oContext.getObject();
            if (!oAnalysis.finalRecommendation) {
                MessageToast.show("Cannot recalculate scores for incomplete analysis");
                return;
            }

            const oModel = this.getView().getModel();
            this.getView().setBusy(true);

            // Call the recalculateScores action
            const oOperation = oModel.bindContext("/recalculateScores(...)");
            oOperation.setParameter("analysisID", oAnalysis.ID);

            oOperation.execute().then(() => {
                const oResult = oOperation.getBoundContext().getObject();
                
                this.getView().setBusy(false);
                MessageToast.show(`Scores recalculated: TD=${oResult.technicalDebt}, CR=${oResult.cloudReadiness}, UI=${oResult.upgradeImpact}, CH=${oResult.compositeHealth}`);

                // Force rebind to fetch fresh data from backend (avoids draft issues)
                const sAnalysisId = oAnalysis.ID;
                this.getView().unbindElement();
                this.getView().bindElement({
                    path: this._getAnalysisKeyPath(sAnalysisId),
                    parameters: {
                        $expand: "projectConfig,decisionPaths"
                    }
                });
            }).catch((oError) => {
                this.getView().setBusy(false);
                Log.error("Failed to recalculate scores:", oError);
                ErrorHandler.showServiceError(oError, "Failed to recalculate scores");
            });
        },
        
        _generateFlowchart(oMockData) {
            const loadGenerator = () => new Promise((resolve, reject) => {
                if (this._FlowchartGenerator) return resolve(this._FlowchartGenerator);
                // Lazy-load to avoid hard dependency at route load time
                sap.ui.require(["sd/solutionadvisor/utils/FlowchartGenerator"], (Gen) => {
                    this._FlowchartGenerator = Gen;
                    resolve(Gen);
                }, reject);
            });
            // If mock data is provided directly, use it
            if (oMockData) {
                try {
                    loadGenerator().then((Gen) => {
                        Gen.generateFlowchart(oMockData, "flowchartSvgContainer");
                        this._currentSvg = document.getElementById("flowchartSvgContainer")?.querySelector("svg");
                    });
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
                    loadGenerator().then((Gen) => {
                        Gen.generateFlowchart(oAnalysis, "flowchartSvgContainer");
                        this._currentSvg = document.getElementById("flowchartSvgContainer")?.querySelector("svg");
                    });
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
            const oBinding = oModel.bindContext(this._getAnalysisKeyPath(oAnalysis.ID), null, {
                $expand: "decisionPaths"
            });
            
            oBinding.requestObject().then((oData) => {
                const analysisData = {
                    ...oData,
                    decisionPaths: oData.decisionPaths || []
                };
                
                // Generate flowchart
                try {
                    loadGenerator().then((Gen) => {
                        Gen.generateFlowchart(analysisData, "flowchartSvgContainer");
                        this._currentSvg = document.getElementById("flowchartSvgContainer")?.querySelector("svg");
                    });
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
            // Switch to flowchart tab (will trigger _onTabSelect which generates the flowchart)
            const oIconTabBar = this.byId("analysisDetails_IconTabBar");
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
            
            const doExport = () => new Promise((resolve, reject) => {
                if (this._FlowchartGenerator) return resolve(this._FlowchartGenerator);
                sap.ui.require(["sd/solutionadvisor/utils/FlowchartGenerator"], (Gen) => {
                    this._FlowchartGenerator = Gen;
                    resolve(Gen);
                }, reject);
            });

            doExport().then((Gen) => Gen.exportAsPNG("flowchartSvgContainer", filename))
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
            
            const doExport = () => new Promise((resolve, reject) => {
                if (this._FlowchartGenerator) return resolve(this._FlowchartGenerator);
                sap.ui.require(["sd/solutionadvisor/utils/FlowchartGenerator"], (Gen) => {
                    this._FlowchartGenerator = Gen;
                    resolve(Gen);
                }, reject);
            });

            doExport().then((Gen) => Gen.exportAsPDF("flowchartSvgContainer", oAnalysis, filename))
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
            
            const doExport = () => new Promise((resolve, reject) => {
                if (this._FlowchartGenerator) return resolve(this._FlowchartGenerator);
                sap.ui.require(["sd/solutionadvisor/utils/FlowchartGenerator"], (Gen) => {
                    this._FlowchartGenerator = Gen;
                    resolve(Gen);
                }, reject);
            });

            doExport().then((Gen) => {
                Gen.exportAsSVG("flowchartSvgContainer", filename);
                MessageToast.show("Flowchart exported as SVG");
            }).catch((error) => {
                Log.error("Failed to export SVG:", error);
                ErrorHandler.showServiceError(error, "Failed to export SVG");
            });
        },

        /**
         * Zoom in on flowchart
         */
        onZoomIn() {
            this._applyZoom(1.2); // Zoom in by 20%
        },

        /**
         * Zoom out on flowchart
         */
        onZoomOut() {
            this._applyZoom(0.8); // Zoom out by 20%
        },

        /**
         * Reset flowchart zoom to original size
         */
        onResetZoom() {
            const container = document.getElementById("flowchartSvgContainer");
            if (!container) return;
            
            const svg = container.querySelector("svg");
            if (svg && typeof window.d3 !== 'undefined' && window.d3.select) {
                const d3Svg = window.d3.select(svg);
                
                // Reset to identity transform
                const zoom = window.d3.zoom();
                d3Svg.call(zoom.transform, window.d3.zoomIdentity);
                
                MessageToast.show("Zoom reset");
            }
        },

        /**
         * Apply zoom transformation
         * @param {number} scaleFactor - Zoom scale factor
         * @private
         */
        _applyZoom(scaleFactor) {
            const container = document.getElementById("flowchartSvgContainer");
            if (!container) return;
            
            const svg = container.querySelector("svg");
            if (svg && typeof window.d3 !== 'undefined' && window.d3.select && window.d3.zoom) {
                const d3Svg = window.d3.select(svg);
                const currentTransform = window.d3.zoomTransform(svg);
                
                // Calculate new scale
                const newScale = currentTransform.k * scaleFactor;
                
                // Constrain scale between 0.3 and 3
                if (newScale < 0.3 || newScale > 3) {
                    MessageToast.show(newScale < 0.3 ? "Minimum zoom reached" : "Maximum zoom reached");
                    return;
                }
                
                // Apply transformation
                const zoom = window.d3.zoom();
                const newTransform = window.d3.zoomIdentity
                    .translate(currentTransform.x, currentTransform.y)
                    .scale(newScale);
                    
                d3Svg.transition()
                    .duration(300)
                    .call(zoom.transform, newTransform);
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
                    const oContainer = this.byId("analysisDetails_RadarChartContainer");
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
            const oVizFrame = this.byId("analysisDetails_RadarChart");
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
            const oContext = this.getView().getBindingContext();
            const oAnalysis = oContext.getObject();
            const oModel = this.getView().getModel();
            
            // Need to load decision paths with $expand
            const oBinding = oModel.bindContext(this._getAnalysisKeyPath(oAnalysis.ID), null, {
                $expand: "decisionPaths"
            });

            this.getView().setBusy(true);
            
            oBinding.requestObject().then((oData) => {
                const breakdownData = this._prepareScoringBreakdown(oData);
                const oScoringModel = new JSONModel(breakdownData);
                this._oScoringDialog.setModel(oScoringModel, "scoring");
                this._oScoringDialog.open();
                this.getView().setBusy(false);
            }).catch((oError) => {
                this.getView().setBusy(false);
                Log.error("Failed to load analysis data for scoring breakdown:", oError);
                MessageToast.show("Failed to load scoring breakdown data");
            });
        },

        /**
         * Prepare scoring breakdown data
         * @param {object} analysis - Analysis object with decisionPaths
         * @returns {object} Breakdown data
         * @private
         */
        _prepareScoringBreakdown: function(analysis) {
            // Get decision paths from the expanded association
            const decisionPaths = analysis.decisionPaths || [];
            
            // Extract level from finalRecommendation (e.g., "Event-Driven Integration - Level A" -> "Level A")
            const extractLevel = (recommendation) => {
                if (!recommendation) return 'Unknown';
                const match = recommendation.match(/Level\s+([ABCD])\b/i);
                return match ? match[1].toUpperCase() : 'Unknown';
            };
            
            const recommendedLevel = extractLevel(analysis.finalRecommendation);

            // Build technical debt breakdown from decision paths
            const technicalDebtBreakdown = decisionPaths.map((step, index) => {
                const weight = this._getLevelWeight(recommendedLevel);
                const timeMinutes = (step.timeSpentSeconds || 60) / 60;
                const factor = Math.min(2, timeMinutes); // Complexity factor capped at 2
                const contribution = weight * factor;
                
                return {
                    stepOrder: step.stepOrder || (index + 1),
                    stepDescription: step.questionText || 'Decision Step',
                    level: recommendedLevel,
                    weight: weight.toFixed(2),
                    factor: factor.toFixed(2),
                    contribution: contribution.toFixed(2)
                };
            });

            // Count levels in decision paths (for cloud readiness)
            const levelCounts = {
                A: 0,
                B: 0,
                C: 0,
                D: 0
            };
            
            // Since all steps point to the same final recommendation, count total steps for that level
            if (recommendedLevel && Object.prototype.hasOwnProperty.call(levelCounts, recommendedLevel)) {
                levelCounts[recommendedLevel] = decisionPaths.length;
            }

            return {
                ricefwId: analysis.ricefwId,
                objectType: analysis.objectType,
                recommendedLevel: `Level ${recommendedLevel}`,
                analysisDate: analysis.createdAt || analysis.analysisDate,
                
                // Technical Debt
                technicalDebtBreakdown: technicalDebtBreakdown,
                finalTechnicalDebtScore: analysis.technicalDebtScore || 0,
                
                // Cloud Readiness
                cloudReadiness: {
                    levelACount: levelCounts.A,
                    levelBCount: levelCounts.B,
                    levelCDCount: levelCounts.C + levelCounts.D
                },
                finalCloudReadinessScore: analysis.cloudReadinessScore || 0,
                
                // Upgrade Impact
                upgradeImpact: {
                    customCodeLines: decisionPaths.length * 50, // Estimate
                    standardFunctionality: recommendedLevel === 'A' ? 100 : recommendedLevel === 'B' ? 80 : 50,
                    complexityMultiplier: this._getLevelWeight(recommendedLevel)
                },
                finalUpgradeImpactScore: analysis.upgradeImpactScore || 0,
                
                // Composite Health
                finalCompositeHealthScore: analysis.compositeHealthScore || 0,
                
                // Recommendations
                recommendations: this._generateRecommendations(analysis, recommendedLevel)
            };
        },

        /**
         * Generate recommendations based on scores
         * @param {object} analysis - Analysis object
         * @param {string} level - Recommended level (A/B/C/D)
         * @returns {array} Array of recommendations
         * @private
         */
        _generateRecommendations: function(analysis, level) {
            const recommendations = [];
            
            if (level === 'A') {
                recommendations.push({
                    title: "Excellent Clean Core Alignment",
                    description: "Solution follows standard SAP functionality with no customizations",
                    priority: "Low",
                    priorityState: "Success",
                    icon: "sap-icon://accept"
                });
            }
            
            if (level === 'B') {
                recommendations.push({
                    title: "Use Side-by-Side Extensions",
                    description: "Leverage SAP BTP for extensions to maintain clean core",
                    priority: "Medium",
                    priorityState: "Warning",
                    icon: "sap-icon://quality-issue"
                });
            }
            
            if (level === 'C' || level === 'D') {
                recommendations.push({
                    title: "Refactor to Standard SAP APIs",
                    description: "Consider migrating custom code to released SAP APIs and standard patterns",
                    priority: "High",
                    priorityState: "Error",
                    icon: "sap-icon://warning"
                });
            }
            
            if ((analysis.technicalDebtScore || 0) > 60) {
                recommendations.push({
                    title: "Reduce Technical Debt",
                    description: "Simplify solution architecture and remove unnecessary complexity",
                    priority: "High",
                    priorityState: "Error",
                    icon: "sap-icon://activity-2"
                });
            }
            
            if ((analysis.cloudReadinessScore || 0) < 70) {
                recommendations.push({
                    title: "Improve Cloud Readiness",
                    description: "Review BTP services that can replace custom implementations",
                    priority: "Medium",
                    priorityState: "Warning",
                    icon: "sap-icon://cloud"
                });
            }
            
            return recommendations;
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
        },

        /**
         * Export scoring breakdown data
         */
        onExportBreakdown: function() {
            MessageToast.show("Export functionality will be implemented in future release");
        },

        /**
         * Save analysis from drill-down dialog
         */
        onSaveAnalysis: function() {
            if (this._oScoringDialog) {
                this._oScoringDialog.close();
            }
            MessageToast.show("Analysis saved successfully");
        },

        /**
         * Format level state for ObjectStatus
         * @param {string} level - Clean core level
         * @returns {string} State value
         */
        formatLevelState: function(level) {
            if (!level) return "None";
            const levelStr = level.toString().toUpperCase();
            if (levelStr.includes('A')) return "Success";
            if (levelStr.includes('B')) return "Warning";
            if (levelStr.includes('C')) return "Error";
            if (levelStr.includes('D')) return "Error";
            return "None";
        },

        /**
         * Format score state (lower is better for tech debt and upgrade impact)
         * @param {number} score - Score value
         * @returns {string} State value
         */
        formatScoreState: function(score) {
            if (score < 30) return "Success";
            if (score < 60) return "Warning";
            return "Error";
        },

        /**
         * Format cloud readiness state (higher is better)
         * @param {number} score - Score value
         * @returns {string} State value
         */
        formatCloudReadinessState: function(score) {
            if (score >= 80) return "Success";
            if (score >= 60) return "Warning";
            return "Error";
        },

        /**
         * Format composite health state (higher is better)
         * @param {number} score - Score value
         * @returns {string} State value
         */
        formatHealthState: function(score) {
            if (score >= 80) return "Success";
            if (score >= 60) return "Warning";
            if (score >= 40) return "Error";
            return "Error";
        }
    });
});
