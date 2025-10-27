sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (BaseObject, Filter, FilterOperator, JSONModel) {
    "use strict";

    /**
     * Shell Search Service - Provides global search functionality
     * Integrates with SAP Fiori Launchpad search
     */
    return BaseObject.extend("sd.solutionadvisor.services.SearchService", {

        /**
         * Constructor
         * @param {sap.ui.core.UIComponent} oComponent - Application component
         */
        constructor: function (oComponent) {
            this._oComponent = oComponent;
            this._oModel = oComponent.getModel();
            // State model exposed to the Component as the 'search' model
            this._oStateModel = new JSONModel({
                query: "",
                results: [],
                loading: false,
                error: null
            });
            this._oShellSearchService = null;
            this._bInitialized = false;

            // Search configuration
            this._oSearchConfig = {
                searchableEntities: [
                    {
                        name: "Projects",
                        path: "/ProjectConfiguration",
                        searchFields: ["projectName", "clientName", "description"],
                        resultFields: ["projectName", "clientName", "status"],
                        icon: "sap-icon://folder",
                        type: "Project"
                    },
                    {
                        name: "Analyses",
                        path: "/CleanCoreAnalysis",
                        searchFields: ["ricefwId", "objectName", "description"],
                        resultFields: ["ricefwId", "objectName", "status", "recommendedLevel_ID"],
                        icon: "sap-icon://list",
                        type: "Analysis"
                    },
                    {
                        name: "Question Flow",
                        path: "/QuestionFlow",
                        searchFields: ["questionText", "hint", "detailedHint"],
                        resultFields: ["questionText", "objectType_ID"],
                        icon: "sap-icon://question-mark",
                        type: "Question"
                    },
                    {
                        name: "Real World Examples",
                        path: "/RealWorldExample",
                        searchFields: ["exampleTitle", "description", "scenario"],
                        resultFields: ["exampleTitle", "cleanCoreLevel_ID"],
                        icon: "sap-icon://example",
                        type: "Example"
                    }
                ]
            };

            // Initialize shell search service
            this._initialize();
        },

        /**
         * Expose search state model for bindings (search bar, result lists, etc.)
         * @returns {sap.ui.model.json.JSONModel}
         */
        getModel: function () {
            return this._oStateModel;
        },

        /**
         * Initialize shell search service
         */
        _initialize: function () {
            const that = this;

            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("Search").then(function (oService) {
                    that._oShellSearchService = oService;
                    that._bInitialized = true;

                    // Register search provider
                    that._registerSearchProvider();
                }).catch(function (oError) {
                    if (sap && sap.base && sap.base.Log) {
                        sap.base.Log.warning("Shell Search service not available: " + (oError && oError.message || oError));
                    }
                });
            }
        },

        /**
         * Register application as search provider
         */
        _registerSearchProvider: function () {
            if (!this._oShellSearchService) {
                return;
            }

            const that = this;

            // Register search provider for Solution Advisor
            this._oShellSearchService.registerSearchProvider({
                id: "sd.solutionadvisor.search",
                displayName: "Clean Core Solution Advisor",
                icon: "sap-icon://action",
                onSearch: function (sQuery) {
                    return that.search(sQuery);
                }
            });
        },

        /**
         * Perform global search
         * @param {string} sQuery - Search query
         * @param {object} oOptions - Search options
         * @returns {Promise<Array>} - Promise resolving to search results
         */
        search: function (sQuery, oOptions) {
            const that = this;
            oOptions = oOptions || {};
            this._oStateModel.setProperty("/error", null);
            this._oStateModel.setProperty("/loading", true);
            this._oStateModel.setProperty("/query", sQuery || "");

            if (!sQuery || sQuery.length < 2) {
                return Promise.resolve([]);
            }

            // Determine which entities to search
            const aEntitiesToSearch = oOptions.entities
                ? this._oSearchConfig.searchableEntities.filter(e => oOptions.entities.includes(e.name))
                : this._oSearchConfig.searchableEntities;

            // Search all entities in parallel
            const aSearchPromises = aEntitiesToSearch.map(function (oEntityConfig) {
                return that._searchEntity(sQuery, oEntityConfig, oOptions);
            });

            return Promise.all(aSearchPromises).then(function (aResults) {
                // Flatten and sort results
                const aAllResults = [].concat.apply([], aResults);
                const aRanked = that._rankResults(aAllResults, sQuery);
                that._oStateModel.setProperty("/results", aRanked);
                that._oStateModel.setProperty("/loading", false);
                return aRanked;
            }).catch(function (oError) {
                that._oStateModel.setProperty("/error", (oError && oError.message) || String(oError));
                that._oStateModel.setProperty("/loading", false);
                return [];
            });
        },

        /**
         * Search specific entity
         * @param {string} sQuery - Search query
         * @param {object} oEntityConfig - Entity configuration
         * @param {object} oOptions - Search options
         * @returns {Promise<Array>} - Promise resolving to results
         */
        _searchEntity: function (sQuery, oEntityConfig, oOptions) {
            const that = this;
            const oModel = this._oModel;

            // Build filter for search fields
            const aFilters = oEntityConfig.searchFields.map(function (sField) {
                return new Filter(sField, FilterOperator.Contains, sQuery);
            });

            // Combine with OR logic
            const oFilter = new Filter({
                filters: aFilters,
                and: false
            });

            // Bind list with filter
            const oBinding = oModel.bindList(oEntityConfig.path, null, null, [oFilter]);

            // Set max results
            const iMaxResults = oOptions.maxResults || 10;

            return oBinding.requestContexts(0, iMaxResults).then(function (aContexts) {
                return aContexts.map(function (oContext) {
                    const oData = oContext.getObject();
                    return that._formatSearchResult(oData, oEntityConfig);
                });
            }).catch(function (oError) {
                if (sap && sap.base && sap.base.Log) {
                    sap.base.Log.error("Search failed for entity: " + oEntityConfig.name + " - " + (oError && oError.message || oError));
                }
                return [];
            });
        },

        /**
         * Format search result
         * @param {object} oData - Entity data
         * @param {object} oEntityConfig - Entity configuration
         * @returns {object} - Formatted search result
         */
        _formatSearchResult: function (oData, oEntityConfig) {
            // Extract display fields
            const oResult = {
                id: oData.ID,
                type: oEntityConfig.type,
                icon: oEntityConfig.icon,
                title: oData[oEntityConfig.resultFields[0]] || "Untitled",
                description: "",
                data: oData
            };

            // Build description from result fields
            const aDescParts = [];
            for (let i = 1; i < oEntityConfig.resultFields.length; i++) {
                const sField = oEntityConfig.resultFields[i];
                if (oData[sField]) {
                    aDescParts.push(oData[sField]);
                }
            }
            oResult.description = aDescParts.join(" • ");

            return oResult;
        },

        /**
         * Rank search results by relevance
         * @param {Array} aResults - Search results
         * @param {string} sQuery - Search query
         * @returns {Array} - Ranked results
         */
        _rankResults: function (aResults, sQuery) {
            const sQueryLower = sQuery.toLowerCase();

            // Calculate relevance score
            aResults.forEach(function (oResult) {
                let iScore = 0;
                const sTitleLower = (oResult.title || "").toLowerCase();
                const sDescLower = (oResult.description || "").toLowerCase();

                // Exact match in title = highest score
                if (sTitleLower === sQueryLower) {
                    iScore += 100;
                }
                // Starts with query in title
                else if (sTitleLower.startsWith(sQueryLower)) {
                    iScore += 50;
                }
                // Contains query in title
                else if (sTitleLower.includes(sQueryLower)) {
                    iScore += 25;
                }

                // Contains in description
                if (sDescLower.includes(sQueryLower)) {
                    iScore += 10;
                }

                oResult.score = iScore;
            });

            // Sort by score (descending)
            aResults.sort(function (a, b) {
                return b.score - a.score;
            });

            return aResults;
        },

        /**
         * Search projects
         * @param {string} sQuery - Search query
         * @returns {Promise<Array>} - Promise resolving to project results
         */
        searchProjects: function (sQuery) {
            return this.search(sQuery, { entities: ["Projects"] });
        },

        /**
         * Search analyses
         * @param {string} sQuery - Search query
         * @returns {Promise<Array>} - Promise resolving to analysis results
         */
        searchAnalyses: function (sQuery) {
            return this.search(sQuery, { entities: ["Analyses"] });
        },

        /**
         * Search by RICEFW ID
         * @param {string} sRicefwId - RICEFW ID
         * @returns {Promise<Array>} - Promise resolving to matching analyses
         */
        searchByRicefwId: function (sRicefwId) {
            const oModel = this._oModel;
            const oFilter = new Filter("ricefwId", FilterOperator.EQ, sRicefwId);
            const oBinding = oModel.bindList("/CleanCoreAnalysis", null, null, [oFilter]);

            return oBinding.requestContexts().then(function (aContexts) {
                return aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
            });
        },

        /**
         * Get search suggestions
         * @param {string} sQuery - Partial search query
         * @param {number} iMaxSuggestions - Maximum suggestions
         * @returns {Promise<Array>} - Promise resolving to suggestions
         */
        getSuggestions: function (sQuery, iMaxSuggestions) {
            iMaxSuggestions = iMaxSuggestions || 5;

            return this.search(sQuery, { maxResults: iMaxSuggestions }).then(function (aResults) {
                return aResults.slice(0, iMaxSuggestions).map(function (oResult) {
                    return {
                        text: oResult.title,
                        description: oResult.description,
                        icon: oResult.icon,
                        data: oResult
                    };
                });
            });
        },

        /**
         * Navigate to search result
         * @param {object} oResult - Search result
         */
        navigateToResult: function (oResult) {
            const oNavigationService = this._oComponent.getNavigationService();
            if (!oNavigationService) {
                return;
            }

            switch (oResult.type) {
                case "Project":
                    oNavigationService.toProjectDetails(oResult.id);
                    break;
                case "Analysis":
                    oNavigationService.toAnalysisDetails(oResult.id);
                    break;
                case "Question":
                    oNavigationService.toAdmin("questionflow");
                    break;
                case "Example":
                    // Navigate to examples view (if available)
                    oNavigationService.toAdmin();
                    break;
                default:
                    oNavigationService.toHome();
            }
        },

        /**
         * Clear search cache (if implemented)
         */
        clearCache: function () {
            // Placeholder for future cache implementation
        },

        /**
         * Get searchable entity configurations
         * @returns {Array} - Entity configurations
         */
        getSearchableEntities: function () {
            return this._oSearchConfig.searchableEntities;
        },

        /**
         * Add custom searchable entity
         * @param {object} oEntityConfig - Entity configuration
         */
        addSearchableEntity: function (oEntityConfig) {
            this._oSearchConfig.searchableEntities.push(oEntityConfig);
        }
    });
}, true);
