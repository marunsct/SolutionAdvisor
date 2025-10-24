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
      
      // Initialize filter model
      this._initializeFilterModel();
    },

    _onPatternMatched: function() {
      // Load filter options and analytics data when view is displayed
      this._loadFilterOptions();
      this._loadAnalyticsData();
    },
    
    /**
     * Initialize filter model with empty values
     * @private
     */
    _initializeFilterModel: function() {
      const oFilterModel = new JSONModel({
        dateFrom: null,
        dateTo: null,
        selectedRicefwTypes: [],
        selectedCleanCoreLevels: [],
        selectedProject: null,
        ricefwTypes: [],
        cleanCoreLevels: [],
        projects: []
      });
      this.getView().setModel(oFilterModel, "filterModel");
    },
    
    /**
     * Load filter dropdown options from backend
     * @private
     */
    _loadFilterOptions: function() {
      const oView = this.getView();
      const oModel = oView.getModel();
      const oFilterModel = oView.getModel("filterModel");
      
      // Load RICEFW types
      const oRicefwBinding = oModel.bindList("/ObjectTypes");
      oRicefwBinding.requestContexts().then((aContexts) => {
        const aTypes = aContexts.map(ctx => ctx.getObject());
        oFilterModel.setProperty("/ricefwTypes", aTypes);
      }).catch((oError) => {
        MessageToast.show("Failed to load RICEFW types");
      });
      
      // Load Clean Core levels
      const oLevelsBinding = oModel.bindList("/CleanCoreLevels");
      oLevelsBinding.requestContexts().then((aContexts) => {
        const aLevels = aContexts.map(ctx => ctx.getObject());
        oFilterModel.setProperty("/cleanCoreLevels", aLevels);
      }).catch((oError) => {
        MessageToast.show("Failed to load Clean Core levels");
      });
      
      // Load Projects
      const oProjectsBinding = oModel.bindList("/ProjectConfiguration");
      oProjectsBinding.requestContexts().then((aContexts) => {
        const aProjects = aContexts.map(ctx => ctx.getObject());
        oFilterModel.setProperty("/projects", aProjects);
      }).catch((oError) => {
        MessageToast.show("Failed to load projects");
      });
    },

    /**
     * Load analytics data from backend with current filters
     * @private
     */
    _loadAnalyticsData: function() {
      const oView = this.getView();
      const oModel = oView.getModel();
      const oFilterModel = oView.getModel("filterModel");

      // Show busy indicator
      oView.setBusy(true);

      // Get filter values
      const filters = oFilterModel ? oFilterModel.getData() : {};
      
      // Build filter parameters
      const dateFrom = filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : null;
      const dateTo = filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : null;
      const ricefwTypes = filters.selectedRicefwTypes && filters.selectedRicefwTypes.length > 0 
        ? JSON.stringify(filters.selectedRicefwTypes) : null;
      const cleanCoreLevels = filters.selectedCleanCoreLevels && filters.selectedCleanCoreLevels.length > 0 
        ? JSON.stringify(filters.selectedCleanCoreLevels) : null;
      const projectId = filters.selectedProject || null;

      // Call backend function using OData V4 pattern with parameters
      const oBinding = oModel.bindContext("/getAnalyticsData(...)");
      if (dateFrom) oBinding.setParameter("dateFrom", dateFrom);
      if (dateTo) oBinding.setParameter("dateTo", dateTo);
      if (ricefwTypes) oBinding.setParameter("ricefwTypes", ricefwTypes);
      if (cleanCoreLevels) oBinding.setParameter("cleanCoreLevels", cleanCoreLevels);
      if (projectId) oBinding.setParameter("projectId", projectId);
      
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
     * Handle filter change events
     */
    onFilterChange: function() {
      // Filter changes are tracked in the model automatically
      // Actual filtering happens when Apply Filters button is pressed
    },
    
    /**
     * Apply filters and reload analytics data
     */
    onApplyFilters: function() {
      this._loadAnalyticsData();
      MessageToast.show("Filters applied successfully");
    },
    
    /**
     * Clear all filters and reload analytics data
     */
    onClearFilters: function() {
      const oFilterModel = this.getView().getModel("filterModel");
      oFilterModel.setProperty("/dateFrom", null);
      oFilterModel.setProperty("/dateTo", null);
      oFilterModel.setProperty("/selectedRicefwTypes", []);
      oFilterModel.setProperty("/selectedCleanCoreLevels", []);
      oFilterModel.setProperty("/selectedProject", null);
      
      // Clear UI controls
      this.byId("dateRangeFilter")?.setDateValue(null);
      this.byId("dateRangeFilter")?.setSecondDateValue(null);
      this.byId("ricefwTypeFilter")?.setSelectedKeys([]);
      this.byId("cleanCoreLevelFilter")?.setSelectedKeys([]);
      this.byId("projectFilter")?.setSelectedKey(null);
      
      this._loadAnalyticsData();
      MessageToast.show("Filters cleared");
    },
    
    /**
     * Refresh analytics data
     */
    onRefresh: function() {
      this._loadAnalyticsData();
    },

    /**
     * Setup all charts with data
     * @private
     */
    _setupCharts: function() {
      this._setupLevelDistributionChart();
      this._setupRicefwTypeDistributionChart();
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
     * Configure RICEFW Type Distribution Bar Chart
     * @private
     */
    _setupRicefwTypeDistributionChart: function() {
      const oVizFrame = this.byId("ricefwTypeDistributionChart");
      const oAnalyticsModel = this.getView().getModel("analytics");
      const ricefwData = oAnalyticsModel.getProperty("/ricefwTypeDistribution");

      if (!ricefwData || ricefwData.length === 0) {
        return;
      }

      const oDataset = new FlattenedDataset({
        dimensions: [{
          name: "Object Type",
          value: "{analytics>objectType}"
        }],
        measures: [{
          name: "Count",
          value: "{analytics>count}"
        }],
        data: {
          path: "analytics>/ricefwTypeDistribution"
        }
      });

      oVizFrame.setDataset(oDataset);
      oVizFrame.setModel(oAnalyticsModel, "analytics");
      
      oVizFrame.setVizProperties({
        plotArea: {
          dataLabel: {
            visible: true
          }
        },
        valueAxis: {
          title: {
            text: "Number of Analyses"
          }
        },
        categoryAxis: {
          title: {
            text: "Object Type"
          }
        },
        title: {
          visible: false
        },
        legend: {
          visible: false
        }
      });

      const feedValueAxis = new FeedItem({
        uid: "valueAxis",
        type: "Measure",
        values: ["Count"]
      });

      const feedCategoryAxis = new FeedItem({
        uid: "categoryAxis",
        type: "Dimension",
        values: ["Object Type"]
      });

      oVizFrame.removeAllFeeds();
      oVizFrame.addFeed(feedValueAxis);
      oVizFrame.addFeed(feedCategoryAxis);
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
     * Export dashboard to PDF using jsPDF library
     * Generates a comprehensive report with KPIs, charts, and tables
     */
    onExportPDF: function() {
      // Check if jsPDF is available (corrected check for UMD module loading)
      if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
        MessageBox.error(
          "jsPDF library is not loaded or is incorrectly loaded. Please ensure the library is included in the application.",
          { title: "Export Error" }
        );
        return;
      }

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const oAnalyticsModel = this.getView().getModel("analytics");
        const analyticsData = oAnalyticsModel.getData();

        // Add title and header
        doc.setFontSize(20);
        doc.setTextColor(0, 107, 180); // SAP Blue
        doc.text('Clean Core Analytics Dashboard', 15, 20);

        // Add generation date
        doc.setFontSize(10);
        doc.setTextColor(100);
        const currentDate = new Date().toLocaleDateString();
        doc.text(`Generated: ${currentDate}`, 15, 28);

        // Add KPI Summary Section
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Key Performance Indicators', 15, 40);
        
        doc.setFontSize(11);
        let yPosition = 50;
        doc.text(`Technical Debt Score: ${analyticsData.technicalDebtScore}%`, 20, yPosition);
        doc.text(`Cloud Readiness Score: ${analyticsData.cloudReadinessScore}%`, 20, yPosition + 7);
        doc.text(`Upgrade Impact Score: ${analyticsData.upgradeImpactScore}%`, 20, yPosition + 14);
        doc.text(`Composite Health Score: ${analyticsData.compositeHealthScore}%`, 20, yPosition + 21);
        doc.text(`Total Analyses: ${analyticsData.totalAnalyses}`, 20, yPosition + 28);

        // Add Level Distribution Section
        yPosition = 90;
        doc.setFontSize(14);
        doc.text('Clean Core Level Distribution', 15, yPosition);
        
        doc.setFontSize(11);
        yPosition += 10;
        if (analyticsData.levelDistribution && analyticsData.levelDistribution.length > 0) {
          analyticsData.levelDistribution.forEach((item, index) => {
            doc.text(`Level ${item.level}: ${item.count} analyses (${item.percentage}%)`, 20, yPosition + (index * 7));
          });
        }

        // Add Top Objects Table - check if autoTable plugin is available on doc instance
        if (typeof doc.autoTable === 'function') {
          yPosition += (analyticsData.levelDistribution?.length || 0) * 7 + 15;
          doc.setFontSize(14);
          doc.text('Top 10 Complex Objects', 15, yPosition);
          
          if (analyticsData.topObjects && analyticsData.topObjects.length > 0) {
            doc.autoTable({
              startY: yPosition + 5,
              head: [['RICEFW ID', 'Object Type', 'Complexity Score', 'Level']],
              body: analyticsData.topObjects.map(obj => [
                obj.ricefwId,
                obj.objectType,
                `${obj.complexityScore}%`,
                obj.level
              ]),
              theme: 'striped',
              headStyles: { fillColor: [0, 107, 180] },
              margin: { left: 15 }
            });
          }
        }

        // Save the PDF
        const filename = `analytics-dashboard-${currentDate.replace(/\//g, '-')}.pdf`;
        doc.save(filename);
        
        MessageToast.show("PDF exported successfully");
      } catch (error) {
        console.error("Error exporting PDF:", error);
        MessageBox.error(
          "Failed to export PDF. " + error.message,
          { title: "Export Error" }
        );
      }
    },

    /**
     * Export data to Excel using SheetJS library
     * Creates a workbook with multiple sheets for comprehensive data export
     */
    onExportExcel: function() {
      // Check if XLSX is available
      if (typeof XLSX === 'undefined') {
        MessageBox.error(
          "SheetJS (XLSX) library is not loaded. Please ensure the library is included in the application.",
          { title: "Export Error" }
        );
        return;
      }

      try {
        const oAnalyticsModel = this.getView().getModel("analytics");
        const analyticsData = oAnalyticsModel.getData();

        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Sheet 1: KPI Summary
        const kpiData = [
          ['Metric', 'Value'],
          ['Technical Debt Score', `${analyticsData.technicalDebtScore}%`],
          ['Cloud Readiness Score', `${analyticsData.cloudReadinessScore}%`],
          ['Upgrade Impact Score', `${analyticsData.upgradeImpactScore}%`],
          ['Composite Health Score', `${analyticsData.compositeHealthScore}%`],
          ['Total Analyses', analyticsData.totalAnalyses],
          [''],
          ['Generated Date', new Date().toLocaleDateString()]
        ];
        const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
        XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPI Summary');

        // Sheet 2: Level Distribution
        if (analyticsData.levelDistribution && analyticsData.levelDistribution.length > 0) {
          const levelSheet = XLSX.utils.json_to_sheet(analyticsData.levelDistribution);
          XLSX.utils.book_append_sheet(wb, levelSheet, 'Level Distribution');
        }

        // Sheet 3: Trend Data
        if (analyticsData.trendData && analyticsData.trendData.length > 0) {
          const trendSheet = XLSX.utils.json_to_sheet(analyticsData.trendData);
          XLSX.utils.book_append_sheet(wb, trendSheet, 'Trend Analysis');
        }

        // Sheet 4: Risk Matrix Data
        if (analyticsData.riskMatrixData && analyticsData.riskMatrixData.length > 0) {
          const riskSheet = XLSX.utils.json_to_sheet(analyticsData.riskMatrixData);
          XLSX.utils.book_append_sheet(wb, riskSheet, 'Risk Matrix');
        }

        // Sheet 5: Top Objects
        if (analyticsData.topObjects && analyticsData.topObjects.length > 0) {
          const topObjSheet = XLSX.utils.json_to_sheet(analyticsData.topObjects);
          XLSX.utils.book_append_sheet(wb, topObjSheet, 'Top Objects');
        }

        // Generate Excel file
        const currentDate = new Date().toLocaleDateString().replace(/\//g, '-');
        const filename = `analytics-data-${currentDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        MessageToast.show("Excel file exported successfully");
      } catch (error) {
        console.error("Error exporting Excel:", error);
        MessageBox.error(
          "Failed to export Excel file. " + error.message,
          { title: "Export Error" }
        );
      }
    }
  });
});
