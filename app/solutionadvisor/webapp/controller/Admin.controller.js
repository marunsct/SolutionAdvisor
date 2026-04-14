sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/base/Log",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, JSONModel, MessageToast, MessageBox, Log, DateFormat, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.Admin", {
    
    /**
     * Formatter for timestamp display
     * Safely formats date or returns dash if invalid
     */
    formatTimestamp: function(sTimestamp) {
      if (!sTimestamp) {
        return "-";
      }
      
      try {
        const oDateFormat = DateFormat.getDateTimeInstance({
          pattern: "yyyy-MM-dd HH:mm"
        });
        const oDate = new Date(sTimestamp);
        
        if (isNaN(oDate.getTime())) {
          return "-";
        }
        
        return oDateFormat.format(oDate);
      } catch (_e) {
        // Intentionally ignore exception - return dash for any formatting errors
        return "-";
      }
    },
    
    /**
     * Controller initialization
     * Sets up admin landing page with tiles for each maintenance application
     */
    onInit: function() {
      // Initialize view model for admin tiles
      const oViewModel = new JSONModel({
        busy: false,
        recentChangesBusy: false,
        tiles: [
          {
            id: "questionFlow",
            title: "Question Flow Maintenance",
            subtitle: "Manage decision tree questions",
            icon: "sap-icon://question-mark",
            recordCount: 0,
            route: "AdminQuestionFlow"
          },
          {
            id: "thresholds",
            title: "Performance Thresholds",
            subtitle: "Manage performance limits",
            icon: "sap-icon://performance",
            recordCount: 0,
            route: "AdminPerformanceThreshold"
          },
          {
            id: "examples",
            title: "Real-World Examples",
            subtitle: "Manage implementation examples",
            icon: "sap-icon://example",
            recordCount: 0,
            route: "AdminRealWorldExample"
          },
          {
            id: "levels",
            title: "Clean Core Levels",
            subtitle: "Manage level definitions",
            icon: "sap-icon://org-chart",
            recordCount: 0,
            route: "AdminCleanCoreLevels"
          },
          {
            id: "objectTypes",
            title: "Object Types",
            subtitle: "Manage RICEFW types",
            icon: "sap-icon://collections-management",
            recordCount: 0,
            route: "AdminObjectTypes"
          }
        ]
      });
      this.getView().setModel(oViewModel, "adminModel");
      
      // Attach to route matched to load counts when navigated
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("Admin").attachPatternMatched(this._onRouteMatched, this);
    },

    /**
     * Route matched handler - loads counts when page is displayed
     * @private
     */
    _onRouteMatched: function() {
      const oAdminModel = this.getView().getModel("admin");
      const oViewModel = this.getView().getModel("adminModel");
      
      if (!oAdminModel) {
        Log.error("Admin OData model not available");
        MessageBox.error("Admin service is not configured. Please check manifest.json");
        return;
      }
      
      // Show busy indicator
      oViewModel.setProperty("/busy", true);
      
      // Directly load record counts with error handling
      // The model will automatically handle metadata loading internally
      this._loadRecordCounts().then(() => {
        oViewModel.setProperty("/busy", false);
      }).catch((oError) => {
        oViewModel.setProperty("/busy", false);
        Log.error("Failed to load admin data:", oError);
        
        // Handle specific error types
        if (oError.status === 403 || oError.statusCode === 403) {
          MessageBox.error(
            "You do not have permission to access the Administration Panel. " +
            "Please contact your system administrator to request the 'Admin' or 'TenantAdmin' role.",
            { title: "Access Denied" }
          );
        } else if (oError.message && oError.message.includes("x-csrf-token")) {
          MessageBox.error(
            "Security token validation failed. Please refresh the page.",
            { title: "Authentication Error" }
          );
        } else {
          MessageBox.error("Failed to load admin data: " + (oError.message || "Unknown error"));
        }
      });
    },
    
    /**
     * Ensures the OData V4 model has a valid CSRF token before making requests
     * @param {sap.ui.model.odata.v4.ODataModel} oModel - The OData V4 model
     * @returns {Promise} Promise that resolves when token is fetched
     * @private
     */
    _ensureSecurityToken: function(oModel) {
      return new Promise((resolve, reject) => {
        // OData V4 models fetch CSRF tokens automatically on the first modifying request
        // For read-only batch requests, we need to explicitly fetch it via HEAD request
        const sServiceUrl = oModel.getServiceUrl();
        
        // Make HEAD request to trigger CSRF token fetch
        fetch(sServiceUrl, {
          method: "HEAD",
          headers: {
            "x-csrf-token": "fetch",
            "Accept": "application/json"
          },
          credentials: "same-origin"
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HEAD request failed: ${response.status} ${response.statusText}`);
          }
          // Token is now cached in the model
          resolve();
        }).catch(error => {
          Log.error("Failed to fetch CSRF token:", error);
          reject(error);
        });
      });
    },

    /**
     * Load record counts for all master data entities
     * @returns {Promise} Promise that resolves when all counts are loaded
     * @private
     */
    _loadRecordCounts: function() {
      const oModel = this.getView().getModel("admin");
      const oViewModel = this.getView().getModel("adminModel");
      
      if (!oModel) {
        Log.warning("Admin OData model not available yet");
        return Promise.reject(new Error("Admin model not available"));
      }
      
      const entityMapping = {
        questionFlow: "QuestionFlow",
        thresholds: "PerformanceThreshold",
        examples: "RealWorldExample",
        levels: "CleanCoreLevels",
        objectTypes: "ObjectTypes"
      };

      // Load counts for each entity using Promise.allSettled to handle partial failures
      const aPromises = Object.keys(entityMapping).map((key) => {
        const entityName = entityMapping[key];
        return this._loadEntityCount(oModel, entityName).then((iCount) => {
          // Update count in admin model
          const aTiles = oViewModel.getProperty("/tiles");
          const oTile = aTiles.find(tile => tile.id === key);
          if (oTile) {
            oTile.recordCount = iCount;
            oViewModel.setProperty("/tiles", aTiles);
          }
          Log.info(`Loaded count for ${entityName}: ${iCount}`);
          return { entity: entityName, count: iCount };
        }).catch((oError) => {
          Log.error(`Error loading count for ${entityName}:`, oError);
          return { entity: entityName, error: oError };
        });
      });
      
      return Promise.allSettled(aPromises).then((results) => {
        const failures = results.filter(r => r.status === "rejected" || r.value?.error);
        if (failures.length > 0) {
          Log.warning("Some entity counts failed to load:", failures);
          MessageToast.show("Some data could not be loaded");
        }
        return results;
      });
    },
    
    /**
     * Load count for a single entity set using OData V4 list binding
     * @param {sap.ui.model.odata.v4.ODataModel} oModel - The OData V4 model
     * @param {string} sEntityName - Entity name (e.g., "QuestionFlow")
     * @returns {Promise<number>} Promise resolving to entity count
     * @private
     */
    _loadEntityCount: function(oModel, sEntityName) {
      return new Promise((resolve, reject) => {
        const oBinding = oModel.bindList(`/${sEntityName}`, null, null, null, { $count: true });
        
        // Request contexts to trigger the query and get count
        oBinding.requestContexts(0, 1).then(() => {
          const iCount = oBinding.getCount();
          resolve(iCount !== undefined ? iCount : 0);
        }).catch((oError) => {
          Log.error(`Failed to load count for ${sEntityName}:`, oError);
          reject(oError);
        });
      });
    },

    /**
     * Navigate to specific maintenance application
     * @param {sap.ui.base.Event} oEvent - Tile press event
     */
    onTilePress: function(oEvent) {
      const oTile = oEvent.getSource();
      const oBindingContext = oTile.getBindingContext("adminModel");
      const oTileData = oBindingContext.getObject();
      
      // Navigate to maintenance route
      this.getOwnerComponent().getRouter().navTo(oTileData.route);
    },

    /**
     * Navigate back to main application
     */
    onNavBack: function() {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.navTo("ProjectsList");
    },

    /**
     * Refresh all tile counts
     */
    onRefresh: function() {
      const oViewModel = this.getView().getModel("adminModel");
      
      oViewModel.setProperty("/busy", true);
      
      // Reload data directly
      this._loadRecordCounts().then(() => {
        oViewModel.setProperty("/busy", false);
        MessageToast.show("Record counts refreshed");
      }).catch((oError) => {
        oViewModel.setProperty("/busy", false);
        Log.error("Refresh failed:", oError);
        MessageBox.error("Failed to refresh data: " + (oError.message || "Unknown error"));
      });
    },
    
    /**
     * Handler for Recent Changes panel expand
     * Loads audit log data when panel is expanded
     * Filters to show only changes for admin-maintained entities
     * @param {sap.ui.base.Event} oEvent - Panel expand event
     */
    onRecentChangesPanelExpand: function(oEvent) {
      const bExpanded = oEvent.getParameter("expand");
      const oViewModel = this.getView().getModel("adminModel");
      
      // Only load data when expanding (not when collapsing)
      if (!bExpanded) {
        return;
      }
      
      // Check if data is already loaded
      const oTable = this.byId("recentChangesTable");
      const oBinding = oTable.getBinding("items");
      
      if (!oBinding) {
        return;
      }
      
      // Apply filters to show only admin-maintained entities
      const aAdminEntities = [
        "QuestionFlow",
        "PerformanceThreshold", 
        "RealWorldExample",
        "CleanCoreLevels",
        "ObjectTypes"
      ];
      
      // Create OR filter for entity types
      const aEntityFilters = aAdminEntities.map(sEntity => 
        new Filter("entityType", FilterOperator.EQ, sEntity)
      );
      
      const oEntityFilter = new Filter({
        filters: aEntityFilters,
        and: false  // OR condition
      });
      
      // Apply the filter
      oBinding.filter(oEntityFilter);
      
      // Show busy indicator while loading
      oViewModel.setProperty("/recentChangesBusy", true);
      
      // Request only the first 20 items
      oBinding.requestContexts(0, 20).then(() => {
        oViewModel.setProperty("/recentChangesBusy", false);
      }).catch((oError) => {
        oViewModel.setProperty("/recentChangesBusy", false);
        
        // Handle specific errors
        if (oError.message && oError.message.includes("Could not find table")) {
          Log.warning("AuditLog table not yet deployed to database");
          MessageToast.show("Audit log feature not yet available. Database deployment required.");
        } else {
          Log.error("Failed to load recent changes:", oError);
          MessageToast.show("Unable to load recent changes");
        }
      });
    }
  });
});
