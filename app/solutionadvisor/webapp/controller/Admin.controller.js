sap.ui.define([], function() {
  "use strict";

  return sap.ui.controller("sd.solutionadvisor.controller.Admin", {
    
    /**
     * Controller initialization
     * Sets up admin landing page with tiles for each maintenance application
     */
    onInit: function() {
      // Initialize view model for admin tiles
      const oViewModel = new sap.ui.model.json.JSONModel({
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
            route: "AdminThresholds"
          },
          {
            id: "examples",
            title: "Real-World Examples",
            subtitle: "Manage implementation examples",
            icon: "sap-icon://example",
            recordCount: 0,
            route: "AdminExamples"
          },
          {
            id: "levels",
            title: "Clean Core Levels",
            subtitle: "Manage level definitions",
            icon: "sap-icon://org-chart",
            recordCount: 0,
            route: "AdminLevels"
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
      
      // Load record counts for each entity
      this._loadRecordCounts();
    },

    /**
     * Load record counts for all maintained entities
     * @private
     */
    _loadRecordCounts: function() {
      const oModel = this.getView().getModel();
      const aTiles = this.getView().getModel("adminModel").getProperty("/tiles");
      
      // Map tile IDs to entity names
      const entityMap = {
        questionFlow: "QuestionFlow",
        thresholds: "PerformanceThreshold",
        examples: "RealWorldExample",
        levels: "CleanCoreLevels",
        objectTypes: "ObjectTypes"
      };
      
      // Load counts for each entity
      aTiles.forEach((tile, index) => {
        const entityName = entityMap[tile.id];
        if (entityName) {
          const oBinding = oModel.bindList(`/${entityName}`);
          oBinding.requestContexts(0, 0).then(() => {
            const iCount = oBinding.getLength();
            this.getView().getModel("adminModel").setProperty(`/tiles/${index}/recordCount`, iCount);
          }).catch(error => {
            console.error(`Error loading count for ${entityName}:`, error);
          });
        }
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
      sap.m.MessageToast.show("Record counts refreshed");
    }
  });
});
