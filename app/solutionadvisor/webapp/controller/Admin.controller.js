sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/base/Log"
], (Controller, JSONModel, MessageToast, Log) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.Admin", {
    
    /**
     * Controller initialization
     * Sets up admin landing page with tiles for each maintenance application
     */
    onInit: function() {
      // Initialize view model for admin tiles
      const oViewModel = new JSONModel({
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
      // Load record counts for each entity
      this._loadRecordCounts();
    },

    /**
     * Load record counts for all master data entities
     * @private
     */
    _loadRecordCounts: function() {
      const oModel = this.getView().getModel("admin");
      
      if (!oModel) {
        Log.warning("Admin OData model not available yet");
        return;
      }
      
      const oViewModel = this.getView().getModel("adminModel");
      const entityMapping = {
        questionFlow: "QuestionFlow",
        thresholds: "PerformanceThreshold",
        examples: "RealWorldExample",
        levels: "CleanCoreLevels",
        objectTypes: "ObjectTypes"
      };

      // Load counts for each entity
      Object.keys(entityMapping).forEach((key) => {
        const entityName = entityMapping[key];
        const oBinding = oModel.bindList(`/${entityName}`);
        
        oBinding.requestContexts(0, 0).then(() => {
          const iCount = oBinding.getLength();
          
          // Update count in admin model
          const aTiles = oViewModel.getProperty("/tiles");
          const oTile = aTiles.find(tile => tile.id === key);
          if (oTile) {
            oTile.recordCount = iCount;
            oViewModel.setProperty("/tiles", aTiles);
          }
        }).catch((oError) => {
          Log.error(`Error loading count for ${entityName}:`, oError);
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
      this._loadRecordCounts();
      MessageToast.show("Record counts refreshed");
    }
  });
});
