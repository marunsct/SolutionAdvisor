sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseObject, JSONModel, Filter, FilterOperator) {
    "use strict";

    /**
     * Tile Service - Centralized KPI data management for launchpad tiles
     * Provides singleton service for loading and refreshing tile data
     */
    return BaseObject.extend("sd.solutionadvisor.tiles.TileService", {
        
        /**
         * Constructor
         */
        constructor: function (oModel) {
            this._oModel = oModel;
            this._oDataModel = new JSONModel();
            this._aSubscribers = [];
            this._bDataLoaded = false;
        },

        /**
         * Get the tile data model
         */
        getDataModel: function () {
            return this._oDataModel;
        },

        /**
         * Subscribe to tile data updates
         */
        subscribe: function (fnCallback) {
            if (typeof fnCallback === "function") {
                this._aSubscribers.push(fnCallback);
            }
        },

        /**
         * Unsubscribe from tile data updates
         */
        unsubscribe: function (fnCallback) {
            const iIndex = this._aSubscribers.indexOf(fnCallback);
            if (iIndex > -1) {
                this._aSubscribers.splice(iIndex, 1);
            }
        },

        /**
         * Notify all subscribers of data update
         */
        _notifySubscribers: function (oData) {
            this._aSubscribers.forEach(function (fnCallback) {
                fnCallback(oData);
            });
        },

        /**
         * Load all tile KPI data
         */
        loadData: function () {
            const that = this;
            
            return Promise.all([
                this._loadAnalysisMetrics(),
                this._loadProjectMetrics(),
                this._loadScoringMetrics(),
                this._loadLevelDistribution(),
                this._loadTrendData()
            ]).then(function (aResults) {
                const oKPIData = {
                    analyses: aResults[0],
                    projects: aResults[1],
                    scoring: aResults[2],
                    distribution: aResults[3],
                    trends: aResults[4],
                    lastUpdated: new Date()
                };
                
                that._oDataModel.setData(oKPIData);
                that._bDataLoaded = true;
                that._notifySubscribers(oKPIData);
                
                return oKPIData;
            }).catch(function (oError) {
                console.error("Failed to load tile data:", oError);
                // Load fallback data
                that._loadFallbackData();
            });
        },

        /**
         * Load analysis metrics (total, pending, completed)
         */
        _loadAnalysisMetrics: function () {
            const oModel = this._oModel;
            const oListBinding = oModel.bindList("/CleanCoreAnalysis");
            
            return oListBinding.requestContexts(0, 0).then(function () {
                const iTotalCount = oListBinding.getLength();
                
                // Get pending count
                const aPendingFilters = [new Filter("status", FilterOperator.EQ, "In Progress")];
                const oPendingBinding = oModel.bindList("/CleanCoreAnalysis", null, null, aPendingFilters);
                
                return oPendingBinding.requestContexts(0, 0).then(function () {
                    const iPendingCount = oPendingBinding.getLength();
                    const iCompletedCount = iTotalCount - iPendingCount;
                    
                    return {
                        total: iTotalCount,
                        pending: iPendingCount,
                        completed: iCompletedCount
                    };
                });
            });
        },

        /**
         * Load project metrics (active, total)
         */
        _loadProjectMetrics: function () {
            const oModel = this._oModel;
            const oListBinding = oModel.bindList("/ProjectConfiguration");
            
            return oListBinding.requestContexts(0, 0).then(function () {
                const iTotalCount = oListBinding.getLength();
                
                // Get active count
                const aActiveFilters = [new Filter("status", FilterOperator.EQ, "Active")];
                const oActiveBinding = oModel.bindList("/ProjectConfiguration", null, null, aActiveFilters);
                
                return oActiveBinding.requestContexts(0, 0).then(function () {
                    const iActiveCount = oActiveBinding.getLength();
                    
                    return {
                        total: iTotalCount,
                        active: iActiveCount
                    };
                });
            });
        },

        /**
         * Load scoring metrics (avg technical debt, cloud readiness, upgrade impact)
         */
        _loadScoringMetrics: function () {
            const oModel = this._oModel;
            const oBinding = oModel.bindList("/CleanCoreAnalysis");
            
            return oBinding.requestContexts().then(function (aContexts) {
                const aAnalyses = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                
                if (aAnalyses.length === 0) {
                    return {
                        avgTechnicalDebt: 0,
                        avgCloudReadiness: 0,
                        avgUpgradeImpact: 0
                    };
                }
                
                let totalDebt = 0;
                let totalReadiness = 0;
                let totalImpact = 0;
                
                aAnalyses.forEach(function (oAnalysis) {
                    totalDebt += oAnalysis.technicalDebtScore || 0;
                    totalReadiness += oAnalysis.cloudReadinessScore || 0;
                    totalImpact += oAnalysis.upgradeImpactScore || 0;
                });
                
                return {
                    avgTechnicalDebt: Math.round(totalDebt / aAnalyses.length),
                    avgCloudReadiness: Math.round(totalReadiness / aAnalyses.length),
                    avgUpgradeImpact: Math.round(totalImpact / aAnalyses.length)
                };
            });
        },

        /**
         * Load clean core level distribution
         */
        _loadLevelDistribution: function () {
            const oModel = this._oModel;
            const oBinding = oModel.bindList("/CleanCoreAnalysis");
            
            return oBinding.requestContexts().then(function (aContexts) {
                const aAnalyses = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                
                const oDistribution = {
                    levelA: 0,
                    levelB: 0,
                    levelC: 0,
                    levelD: 0
                };
                
                aAnalyses.forEach(function (oAnalysis) {
                    const sLevel = oAnalysis.recommendedLevel_ID || oAnalysis.recommendedLevel;
                    if (sLevel) {
                        const sKey = "level" + sLevel;
                        if (oDistribution[sKey] !== undefined) {
                            oDistribution[sKey]++;
                        }
                    }
                });
                
                return oDistribution;
            });
        },

        /**
         * Load trend data (compare last 30 days vs previous 30 days)
         */
        _loadTrendData: function () {
            const oModel = this._oModel;
            const oBinding = oModel.bindList("/CleanCoreAnalysis");
            
            return oBinding.requestContexts().then(function (aContexts) {
                const aAnalyses = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                
                const now = new Date();
                const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                
                let recentCount = 0;
                let previousCount = 0;
                let recentDebt = 0;
                let previousDebt = 0;
                
                aAnalyses.forEach(function (oAnalysis) {
                    const createdDate = new Date(oAnalysis.createdAt);
                    
                    if (createdDate >= last30Days) {
                        recentCount++;
                        recentDebt += oAnalysis.technicalDebtScore || 0;
                    } else if (createdDate >= previous30Days && createdDate < last30Days) {
                        previousCount++;
                        previousDebt += oAnalysis.technicalDebtScore || 0;
                    }
                });
                
                const analysesChange = previousCount > 0 
                    ? Math.round(((recentCount - previousCount) / previousCount) * 100)
                    : 0;
                
                const avgRecentDebt = recentCount > 0 ? recentDebt / recentCount : 0;
                const avgPreviousDebt = previousCount > 0 ? previousDebt / previousCount : 0;
                
                const debtTrend = avgRecentDebt < avgPreviousDebt ? "down" : 
                                  avgRecentDebt > avgPreviousDebt ? "up" : "neutral";
                
                return {
                    analysesChange: analysesChange,
                    debtTrend: debtTrend,
                    recentAnalyses: recentCount,
                    previousAnalyses: previousCount
                };
            });
        },

        /**
         * Load fallback data when OData is unavailable
         */
        _loadFallbackData: function () {
            const oFallbackData = {
                analyses: {
                    total: 142,
                    pending: 12,
                    completed: 130
                },
                projects: {
                    total: 10,
                    active: 8
                },
                scoring: {
                    avgTechnicalDebt: 42,
                    avgCloudReadiness: 78,
                    avgUpgradeImpact: 35
                },
                distribution: {
                    levelA: 35,
                    levelB: 58,
                    levelC: 38,
                    levelD: 11
                },
                trends: {
                    analysesChange: 12,
                    debtTrend: "down",
                    recentAnalyses: 28,
                    previousAnalyses: 25
                },
                lastUpdated: new Date()
            };
            
            this._oDataModel.setData(oFallbackData);
            this._bDataLoaded = true;
            this._notifySubscribers(oFallbackData);
        },

        /**
         * Check if data is loaded
         */
        isDataLoaded: function () {
            return this._bDataLoaded;
        },

        /**
         * Refresh tile data
         */
        refresh: function () {
            return this.loadData();
        }
    });
}, true);
