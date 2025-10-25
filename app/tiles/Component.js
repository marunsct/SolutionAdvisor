sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (UIComponent, JSONModel, Filter, FilterOperator) {
    "use strict";

    /**
     * Dynamic Tile Component for SAP Clean Core Solution Advisor
     * Provides live KPI data for launchpad tiles
     */
    return UIComponent.extend("sd.solutionadvisor.tiles.Component", {
        metadata: {
            manifest: "json",
            properties: {
                "tileType": { type: "string", defaultValue: "generic" }
            }
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize tile data model
            this.oTileModel = new JSONModel({
                kpis: {
                    totalAnalyses: 0,
                    activeProjects: 0,
                    pendingAnalyses: 0,
                    avgTechnicalDebt: 0,
                    avgCloudReadiness: 0,
                    levelACount: 0,
                    levelBCount: 0,
                    levelCCount: 0,
                    levelDCount: 0,
                    notificationCount: 0
                },
                trends: {
                    analysesChange: 0,
                    projectsChange: 0,
                    debtTrend: "neutral"
                },
                lastUpdated: new Date()
            });
            this.setModel(this.oTileModel, "tile");

            // Load initial KPI data
            this._loadKPIData();

            // Set up refresh interval (every 5 minutes)
            this._setupRefreshInterval();
        },

        /**
         * Load KPI data from backend
         */
        _loadKPIData: function () {
            const oModel = this.getModel();
            
            if (!oModel) {
                console.warn("OData model not available, using mock data");
                this._loadMockData();
                return;
            }

            // Load all KPIs in parallel
            Promise.all([
                this._loadAnalysesKPI(),
                this._loadProjectsKPI(),
                this._loadScoringKPIs(),
                this._loadLevelDistribution(),
                this._loadNotificationsKPI()
            ]).then(() => {
                this.oTileModel.setProperty("/lastUpdated", new Date());
            }).catch((oError) => {
                console.error("Failed to load KPI data:", oError);
                this._loadMockData();
            });
        },

        /**
         * Load analyses KPIs (total count, pending count)
         */
        _loadAnalysesKPI: function () {
            const oModel = this.getModel();
            
            // Total analyses count
            const oTotalBinding = oModel.bindList("/CleanCoreAnalysis");
            
            return oTotalBinding.requestContexts(0, 0).then(() => {
                const iTotalCount = oTotalBinding.getLength();
                this.oTileModel.setProperty("/kpis/totalAnalyses", iTotalCount);
                
                // Pending analyses (status = 'In Progress')
                const aPendingFilters = [new Filter("status", FilterOperator.EQ, "In Progress")];
                const oPendingBinding = oModel.bindList("/CleanCoreAnalysis", null, null, aPendingFilters);
                
                return oPendingBinding.requestContexts(0, 0);
            }).then((aContexts) => {
                const iPendingCount = aContexts.length;
                this.oTileModel.setProperty("/kpis/pendingAnalyses", iPendingCount);
            });
        },

        /**
         * Load projects KPIs
         */
        _loadProjectsKPI: function () {
            const oModel = this.getModel();
            
            // Active projects (status = 'Active')
            const aFilters = [new Filter("status", FilterOperator.EQ, "Active")];
            const oBinding = oModel.bindList("/ProjectConfiguration", null, null, aFilters);
            
            return oBinding.requestContexts(0, 0).then(() => {
                const iActiveCount = oBinding.getLength();
                this.oTileModel.setProperty("/kpis/activeProjects", iActiveCount);
            });
        },

        /**
         * Load scoring KPIs (average technical debt, cloud readiness)
         */
        _loadScoringKPIs: function () {
            const oModel = this.getModel();
            const oBinding = oModel.bindList("/CleanCoreAnalysis");
            
            return oBinding.requestContexts().then((aContexts) => {
                const aAnalyses = aContexts.map(ctx => ctx.getObject());
                
                if (aAnalyses.length === 0) {
                    return;
                }
                
                // Calculate averages
                let totalDebt = 0;
                let totalReadiness = 0;
                
                aAnalyses.forEach(analysis => {
                    totalDebt += analysis.technicalDebtScore || 0;
                    totalReadiness += analysis.cloudReadinessScore || 0;
                });
                
                const avgDebt = Math.round(totalDebt / aAnalyses.length);
                const avgReadiness = Math.round(totalReadiness / aAnalyses.length);
                
                this.oTileModel.setProperty("/kpis/avgTechnicalDebt", avgDebt);
                this.oTileModel.setProperty("/kpis/avgCloudReadiness", avgReadiness);
                
                // Determine debt trend
                const recentAnalyses = aAnalyses.slice(-10); // Last 10
                if (recentAnalyses.length >= 2) {
                    const recentAvg = recentAnalyses.reduce((sum, a) => sum + (a.technicalDebtScore || 0), 0) / recentAnalyses.length;
                    const trend = recentAvg > avgDebt ? "up" : recentAvg < avgDebt ? "down" : "neutral";
                    this.oTileModel.setProperty("/trends/debtTrend", trend);
                }
            });
        },

        /**
         * Load clean core level distribution
         */
        _loadLevelDistribution: function () {
            const oModel = this.getModel();
            const oBinding = oModel.bindList("/CleanCoreAnalysis");
            
            return oBinding.requestContexts().then((aContexts) => {
                const aAnalyses = aContexts.map(ctx => ctx.getObject());
                
                // Count by level
                const levelCounts = {
                    A: 0,
                    B: 0,
                    C: 0,
                    D: 0
                };
                
                aAnalyses.forEach(analysis => {
                    const level = analysis.recommendedLevel_ID || analysis.recommendedLevel;
                    if (level && levelCounts.hasOwnProperty(level)) {
                        levelCounts[level]++;
                    }
                });
                
                this.oTileModel.setProperty("/kpis/levelACount", levelCounts.A);
                this.oTileModel.setProperty("/kpis/levelBCount", levelCounts.B);
                this.oTileModel.setProperty("/kpis/levelCCount", levelCounts.C);
                this.oTileModel.setProperty("/kpis/levelDCount", levelCounts.D);
            });
        },

        /**
         * Load notifications KPI
         */
        _loadNotificationsKPI: function () {
            // TODO: Replace with actual Notifications entity when implemented
            const iNotificationCount = 3; // Mock data
            this.oTileModel.setProperty("/kpis/notificationCount", iNotificationCount);
            return Promise.resolve();
        },

        /**
         * Load mock data for development/testing
         */
        _loadMockData: function () {
            this.oTileModel.setProperty("/kpis", {
                totalAnalyses: 142,
                activeProjects: 8,
                pendingAnalyses: 12,
                avgTechnicalDebt: 42,
                avgCloudReadiness: 78,
                levelACount: 35,
                levelBCount: 58,
                levelCCount: 38,
                levelDCount: 11,
                notificationCount: 3
            });
            this.oTileModel.setProperty("/trends", {
                analysesChange: 12,
                projectsChange: 2,
                debtTrend: "down"
            });
            this.oTileModel.setProperty("/lastUpdated", new Date());
        },

        /**
         * Setup automatic refresh interval
         */
        _setupRefreshInterval: function () {
            // Refresh KPI data every 5 minutes
            this._refreshInterval = setInterval(() => {
                this._loadKPIData();
            }, 300000);
        },

        /**
         * Get tile content based on tile type
         */
        getTileContent: function (sTileType) {
            const oKPIs = this.oTileModel.getProperty("/kpis");
            
            switch (sTileType) {
                case "wizard":
                    return {
                        title: "Start New Analysis",
                        subtitle: "Guided wizard for RICEFW analysis",
                        info: oKPIs.pendingAnalyses + " pending",
                        number: oKPIs.totalAnalyses,
                        numberUnit: "Total Analyses"
                    };
                    
                case "projects":
                    return {
                        title: "My Projects",
                        subtitle: "Manage project configurations",
                        info: "Active",
                        number: oKPIs.activeProjects,
                        numberUnit: "Projects"
                    };
                    
                case "analytics":
                    return {
                        title: "Analytics Dashboard",
                        subtitle: "View trends and metrics",
                        info: "Avg Cloud Readiness: " + oKPIs.avgCloudReadiness + "%",
                        number: oKPIs.avgTechnicalDebt,
                        numberUnit: "Avg Tech Debt"
                    };
                    
                case "analyses":
                    return {
                        title: "All Analyses",
                        subtitle: "Browse and manage analyses",
                        info: "Level A: " + oKPIs.levelACount + " | Level B: " + oKPIs.levelBCount,
                        number: oKPIs.totalAnalyses,
                        numberUnit: "Total"
                    };
                    
                case "admin":
                    return {
                        title: "Administration",
                        subtitle: "System configuration",
                        info: "Master Data",
                        number: oKPIs.activeProjects,
                        numberUnit: "Active Projects"
                    };
                    
                default:
                    return {
                        title: "Solution Advisor",
                        subtitle: "Clean Core Decision Support",
                        info: "",
                        number: 0,
                        numberUnit: ""
                    };
            }
        },

        /**
         * Cleanup on component destroy
         */
        destroy: function () {
            if (this._refreshInterval) {
                clearInterval(this._refreshInterval);
            }
            UIComponent.prototype.destroy.apply(this, arguments);
        }
    });
});
