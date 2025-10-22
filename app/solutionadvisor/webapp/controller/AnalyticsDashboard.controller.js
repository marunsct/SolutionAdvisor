sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, FlattenedDataset, FeedItem, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.AnalyticsDashboard", {
    
    onInit: function() {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("AnalyticsDashboard").attachPatternMatched(this._onPatternMatched, this);
    },

    _onPatternMatched: function() {
      // Load analytics data when view is displayed
      this._loadAnalyticsData();
    },

    /**
     * Load analytics data from backend
     * @private
     */
    _loadAnalyticsData: function() {
      const oView = this.getView();
      const oModel = oView.getModel();

      // Show busy indicator
      oView.setBusy(true);

      // Call backend function using OData V4 pattern
      const oBinding = oModel.bindContext("/getAnalyticsData(...)");
      
      oBinding.execute().then(() => {
        const oResult = oBinding.getBoundContext().getObject();
        
        // Create analytics model and bind to view
        const oAnalyticsModel = new JSONModel(oResult);
        oView.setModel(oAnalyticsModel, "analytics");
        
        // Setup charts after data is loaded
        this._setupCharts();
        
        oView.setBusy(false);
        MessageToast.show("Analytics data loaded successfully");
      }).catch((oError) => {
        console.error("Failed to load analytics data:", oError);
        oView.setBusy(false);
        MessageBox.error("Failed to load analytics data. Please try again.");
      });
    },

    /**
     * Setup all charts with data
     * @private
     */
    _setupCharts: function() {
      this._setupLevelDistributionChart();
      this._setupTrendAnalysisChart();
      this._setupRiskMatrixChart();
    },

    /**
     * Configure Level Distribution Donut Chart
     * @private
     */
    _setupLevelDistributionChart: function() {
      const oVizFrame = this.byId("levelDistributionChart");
      const oAnalyticsModel = this.getView().getModel("analytics");
      const levelData = oAnalyticsModel.getProperty("/levelDistribution");

      if (!levelData || levelData.length === 0) {
        return;
      }

      const oDataset = new FlattenedDataset({
        dimensions: [{
          name: "Level",
          value: "{analytics>level}"
        }],
        measures: [{
          name: "Count",
          value: "{analytics>count}"
        }],
        data: {
          path: "analytics>/levelDistribution"
        }
      });

      oVizFrame.setDataset(oDataset);
      oVizFrame.setModel(oAnalyticsModel, "analytics");
      
      oVizFrame.setVizProperties({
        plotArea: {
          dataLabel: {
            visible: true,
            type: "percentage"
          }
        },
        title: {
          visible: false
        },
        legend: {
          visible: true
        }
      });

      const feedSize = new FeedItem({
        uid: "size",
        type: "Measure",
        values: ["Count"]
      });

      const feedColor = new FeedItem({
        uid: "color",
        type: "Dimension",
        values: ["Level"]
      });

      oVizFrame.removeAllFeeds();
      oVizFrame.addFeed(feedSize);
      oVizFrame.addFeed(feedColor);
    },

    /**
     * Configure Trend Analysis Line Chart
     * @private
     */
    _setupTrendAnalysisChart: function() {
      const oVizFrame = this.byId("trendAnalysisChart");
      const oAnalyticsModel = this.getView().getModel("analytics");
      const trendData = oAnalyticsModel.getProperty("/trendData");

      if (!trendData || trendData.length === 0) {
        return;
      }

      const oDataset = new FlattenedDataset({
        dimensions: [{
          name: "Month",
          value: "{analytics>month}"
        }],
        measures: [
          {
            name: "Technical Debt",
            value: "{analytics>technicalDebt}"
          },
          {
            name: "Cloud Readiness",
            value: "{analytics>cloudReadiness}"
          },
          {
            name: "Upgrade Impact",
            value: "{analytics>upgradeImpact}"
          }
        ],
        data: {
          path: "analytics>/trendData"
        }
      });

      oVizFrame.setDataset(oDataset);
      oVizFrame.setModel(oAnalyticsModel, "analytics");
      
      oVizFrame.setVizProperties({
        plotArea: {
          dataPointSize: {
            min: 5,
            max: 10
          },
          line: {
            width: 2
          }
        },
        valueAxis: {
          title: {
            text: "Score (%)"
          }
        },
        categoryAxis: {
          title: {
            text: "Month"
          }
        },
        title: {
          visible: false
        },
        legend: {
          visible: true
        }
      });

      const feedValueAxis = new FeedItem({
        uid: "valueAxis",
        type: "Measure",
        values: ["Technical Debt", "Cloud Readiness", "Upgrade Impact"]
      });

      const feedCategoryAxis = new FeedItem({
        uid: "categoryAxis",
        type: "Dimension",
        values: ["Month"]
      });

      oVizFrame.removeAllFeeds();
      oVizFrame.addFeed(feedValueAxis);
      oVizFrame.addFeed(feedCategoryAxis);
    },

    /**
     * Configure Risk Matrix Scatter Chart
     * @private
     */
    _setupRiskMatrixChart: function() {
      const oVizFrame = this.byId("riskMatrixChart");
      const oAnalyticsModel = this.getView().getModel("analytics");
      const riskData = oAnalyticsModel.getProperty("/riskMatrixData");

      if (!riskData || riskData.length === 0) {
        return;
      }

      const oDataset = new FlattenedDataset({
        dimensions: [
          {
            name: "RICEFW ID",
            value: "{analytics>ricefwId}"
          },
          {
            name: "Level",
            value: "{analytics>level}"
          }
        ],
        measures: [
          {
            name: "Technical Debt",
            value: "{analytics>x}"
          },
          {
            name: "Cloud Readiness",
            value: "{analytics>y}"
          }
        ],
        data: {
          path: "analytics>/riskMatrixData"
        }
      });

      oVizFrame.setDataset(oDataset);
      oVizFrame.setModel(oAnalyticsModel, "analytics");
      
      oVizFrame.setVizProperties({
        plotArea: {
          dataPoint: {
            shape: "circle"
          }
        },
        valueAxis: {
          title: {
            text: "Cloud Readiness (%)"
          }
        },
        valueAxis2: {
          title: {
            text: "Technical Debt (%)"
          }
        },
        title: {
          visible: false
        },
        legend: {
          visible: true
        }
      });

      const feedValueAxis = new FeedItem({
        uid: "valueAxis",
        type: "Measure",
        values: ["Cloud Readiness"]
      });

      const feedValueAxis2 = new FeedItem({
        uid: "valueAxis2",
        type: "Measure",
        values: ["Technical Debt"]
      });

      const feedColor = new FeedItem({
        uid: "color",
        type: "Dimension",
        values: ["Level"]
      });

      oVizFrame.removeAllFeeds();
      oVizFrame.addFeed(feedValueAxis);
      oVizFrame.addFeed(feedValueAxis2);
      oVizFrame.addFeed(feedColor);
    },

    /**
     * Navigate back to previous page
     */
    onNavBack: function() {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.navTo("ProjectsList");
    },

    /**
     * Handle KPI tile drill-down
     */
    onKPIDrillDown: function(oEvent) {
      MessageToast.show("KPI drill-down functionality - detailed view coming soon");
    },

    /**
     * Handle top object drill-down
     */
    onObjectDrillDown: function(oEvent) {
      const oItem = oEvent.getSource();
      const oContext = oItem.getBindingContext("analytics");
      const oData = oContext.getObject();

      if (oData && oData.id) {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("AnalysisDetails", {
          key: oData.id
        });
      } else {
        MessageToast.show("Unable to navigate to analysis details");
      }
    },

    /**
     * Export dashboard to PDF
     */
    onExportPDF: function() {
      MessageBox.information(
        "PDF export functionality requires jsPDF library integration.\n\n" +
        "This will generate a comprehensive report including:\n" +
        "• KPI Summary\n" +
        "• All charts and visualizations\n" +
        "• Top objects table",
        {
          title: "PDF Export"
        }
      );
    },

    /**
     * Export data to Excel
     */
    onExportExcel: function() {
      MessageBox.information(
        "Excel export functionality requires SheetJS library integration.\n\n" +
        "This will generate an Excel file with multiple sheets:\n" +
        "• KPI Summary\n" +
        "• Level Distribution\n" +
        "• Trend Data\n" +
        "• Raw Analysis Data",
        {
          title: "Excel Export"
        }
      );
    }
  });
});
