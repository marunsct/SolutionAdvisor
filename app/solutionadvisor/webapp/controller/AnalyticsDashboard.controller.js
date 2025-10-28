sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/base/Log"
], function (Controller, JSONModel, FlattenedDataset, FeedItem, MessageToast, MessageBox, Log) {
  "use strict";

  /**
   * Analytics Dashboard Controller
   * 
   * @class sd.solutionadvisor.controller.AnalyticsDashboard
   * @extends sap.ui.core.mvc.Controller
   * @description
   * Manages the Clean Core Analytics Dashboard with KPIs, visualizations, and filtering.
   * Retrieves aggregated analytics data from backend action (getAnalyticsData), renders
   * charts using SAP VizFrame, and provides export to PDF/Excel functionality.
   * 
   * Key responsibilities:
   * - Load and display analytics KPIs (avg tech debt, cloud readiness, upgrade impact)
   * - Render charts (level distribution, RICEFW type distribution, trends, risk matrix)
   * - Display top 10 complex objects table
   * - Apply filters (date range, RICEFW types, clean core levels, project)
   * - Export analytics to PDF and Excel
   * - Navigate to drill-down views (individual analysis details)
   * 
   * Charts rendered:
   * - Donut chart: Clean Core level distribution (A/B/C/D)
   * - Donut chart: RICEFW type distribution (R/I/C/E/F/W)
   * - Line chart: Score trends over time (monthly)
   * - Bubble chart: Risk matrix (technical debt vs cloud readiness)
   * 
   * Models used:
   * - analytics: Aggregated KPI and chart data from backend
   * - filterModel: Filter selections (date, types, levels, project)
   * 
   * @author SAP Clean Core Team
   * @version 1.0.0
   * @public
   */
  return Controller.extend("sd.solutionadvisor.controller.AnalyticsDashboard", {
    
    /**
     * Controller initialization
     * @description
     * Registers route matched handler and initializes filter model.
     * @public
     */
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
  const oProjectsBinding = oModel.bindList("/Projects");
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
        Log.error("Failed to load analytics data:", oError);
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
        Log.error("Error exporting PDF:", error);
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
        Log.error("Error exporting Excel:", error);
        MessageBox.error(
          "Failed to export Excel file. " + error.message,
          { title: "Export Error" }
        );
      }
    },
    
    /**
     * Additional Trend Analysis Views
     */
    
    /**
     * Show year-over-year comparison chart
     */
    onShowYearOverYearComparison: function() {
      const oView = this.getView();
      const oModel = oView.getModel();
      
      // Fetch year-over-year data
      oView.setBusy(true);
      
      const oBinding = oModel.bindContext("/getYearOverYearComparison(...)");
      oBinding.execute().then(() => {
        const oResult = oBinding.getBoundContext().getObject();
        
        // Create comparison model
        const oComparisonModel = new JSONModel(oResult);
        oView.setModel(oComparisonModel, "comparisonModel");
        
        // Render comparison chart
        this._renderYearOverYearChart();
        
        oView.setBusy(false);
        MessageToast.show("Year-over-year comparison loaded");
      }).catch((oError) => {
        oView.setBusy(false);
        MessageBox.error("Failed to load year-over-year comparison: " + oError.message);
      });
    },
    
    /**
     * Render year-over-year comparison chart
     * @private
     */
    _renderYearOverYearChart: function() {
      const oView = this.getView();
      const oComparisonModel = oView.getModel("comparisonModel");
      
      if (!oComparisonModel) {
        return;
      }
      
      const oVizFrame = oView.byId("idYearOverYearChart");
      if (!oVizFrame) {
        return;
      }
      
      // Configure viz frame for comparison
      oVizFrame.setVizType("column");
      oVizFrame.setModel(oComparisonModel);
      
      const oDataset = new FlattenedDataset({
        dimensions: [{
          name: "Year",
          value: "{year}"
        }],
        measures: [{
          name: "Technical Debt",
          value: "{technicalDebt}"
        }, {
          name: "Cloud Readiness",
          value: "{cloudReadiness}"
        }, {
          name: "Upgrade Impact",
          value: "{upgradeImpact}"
        }],
        data: {
          path: "/yearlyData"
        }
      });
      
      oVizFrame.setDataset(oDataset);
      oVizFrame.addFeed(new FeedItem({
        uid: "categoryAxis",
        type: "Dimension",
        values: ["Year"]
      }));
      oVizFrame.addFeed(new FeedItem({
        uid: "valueAxis",
        type: "Measure",
        values: ["Technical Debt", "Cloud Readiness", "Upgrade Impact"]
      }));
    },
    
    /**
     * Show project-to-project comparison
     */
    onShowProjectComparison: function() {
      const oView = this.getView();
      const oFilterModel = oView.getModel("filterModel");
      const aSelectedProjects = oFilterModel.getProperty("/selectedProjects") || [];
      
      if (aSelectedProjects.length < 2) {
        MessageBox.warning("Please select at least 2 projects to compare");
        return;
      }
      
      const oModel = oView.getModel();
      oView.setBusy(true);
      
      const oBinding = oModel.bindContext("/compareProjects(...)");
      oBinding.setParameter("projectIds", aSelectedProjects);
      oBinding.execute().then(() => {
        const oResult = oBinding.getBoundContext().getObject();
        
        // Create comparison model
        const oProjectComparisonModel = new JSONModel(oResult);
        oView.setModel(oProjectComparisonModel, "projectComparisonModel");
        
        // Render comparison table/chart
        this._renderProjectComparisonChart();
        
        oView.setBusy(false);
        MessageToast.show("Project comparison loaded");
      }).catch((oError) => {
        oView.setBusy(false);
        MessageBox.error("Failed to load project comparison: " + oError.message);
      });
    },
    
    /**
     * Render project comparison chart
     * @private
     */
    _renderProjectComparisonChart: function() {
      const oView = this.getView();
      const oComparisonModel = oView.getModel("projectComparisonModel");
      
      if (!oComparisonModel) {
        return;
      }
      
      const oVizFrame = oView.byId("idProjectComparisonChart");
      if (!oVizFrame) {
        return;
      }
      
      // Configure radar/spider chart for multi-dimensional comparison
      oVizFrame.setVizType("radar");
      oVizFrame.setModel(oComparisonModel);
      
      const oDataset = new FlattenedDataset({
        dimensions: [{
          name: "Metric",
          value: "{metric}"
        }],
        measures: oComparisonModel.getProperty("/projects").map((proj, idx) => ({
          name: proj.projectName,
          value: `{value${idx}}`
        })),
        data: {
          path: "/comparisonData"
        }
      });
      
      oVizFrame.setDataset(oDataset);
    },
    
    /**
     * Show monthly trend analysis with moving averages
     */
    onShowMonthlyTrends: function() {
      const oView = this.getView();
      const oModel = oView.getModel();
      const oFilterModel = oView.getModel("filterModel");
      
      const sDateFrom = oFilterModel.getProperty("/dateFrom");
      const sDateTo = oFilterModel.getProperty("/dateTo");
      
      oView.setBusy(true);
      
      const oBinding = oModel.bindContext("/getMonthlyTrends(...)");
      oBinding.setParameter("dateFrom", sDateFrom || new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString());
      oBinding.setParameter("dateTo", sDateTo || new Date().toISOString());
      oBinding.execute().then(() => {
        const oResult = oBinding.getBoundContext().getObject();
        
        // Calculate moving averages
        const trendData = this._calculateMovingAverages(oResult.monthlyData, 3);
        
        // Create trend model
        const oTrendModel = new JSONModel({
          monthlyData: trendData,
          showMovingAverage: true
        });
        oView.setModel(oTrendModel, "trendModel");
        
        // Render trend chart
        this._renderMonthlyTrendChart();
        
        oView.setBusy(false);
        MessageToast.show("Monthly trends loaded with moving averages");
      }).catch((oError) => {
        oView.setBusy(false);
        MessageBox.error("Failed to load monthly trends: " + oError.message);
      });
    },
    
    /**
     * Calculate moving averages for trend smoothing
     * @param {Array} data - Array of monthly data points
     * @param {number} window - Moving average window size (default: 3)
     * @returns {Array} Data with moving averages
     * @private
     */
    _calculateMovingAverages: function(data, window = 3) {
      if (!data || data.length === 0) {
        return [];
      }
      
      return data.map((point, index) => {
        if (index < window - 1) {
          return {
            ...point,
            technicalDebtMA: null,
            cloudReadinessMA: null,
            upgradeImpactMA: null
          };
        }
        
        const windowData = data.slice(index - window + 1, index + 1);
        
        return {
          ...point,
          technicalDebtMA: this._average(windowData.map(d => d.technicalDebt)),
          cloudReadinessMA: this._average(windowData.map(d => d.cloudReadiness)),
          upgradeImpactMA: this._average(windowData.map(d => d.upgradeImpact))
        };
      });
    },
    
    /**
     * Calculate average of array
     * @param {Array} arr - Array of numbers
     * @returns {number} Average value
     * @private
     */
    _average: function(arr) {
      if (!arr || arr.length === 0) {
        return 0;
      }
      return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    },
    
    /**
     * Render monthly trend chart with moving averages
     * @private
     */
    _renderMonthlyTrendChart: function() {
      const oView = this.getView();
      const oTrendModel = oView.getModel("trendModel");
      
      if (!oTrendModel) {
        return;
      }
      
      const oVizFrame = oView.byId("idMonthlyTrendChart");
      if (!oVizFrame) {
        return;
      }
      
      // Configure dual-axis line chart (actuals + moving averages)
      oVizFrame.setVizType("dual_line");
      oVizFrame.setModel(oTrendModel);
      
      const oDataset = new FlattenedDataset({
        dimensions: [{
          name: "Month",
          value: "{month}"
        }],
        measures: [{
          name: "Technical Debt",
          value: "{technicalDebt}"
        }, {
          name: "Technical Debt (MA)",
          value: "{technicalDebtMA}"
        }, {
          name: "Cloud Readiness",
          value: "{cloudReadiness}"
        }, {
          name: "Cloud Readiness (MA)",
          value: "{cloudReadinessMA}"
        }],
        data: {
          path: "/monthlyData"
        }
      });
      
      oVizFrame.setDataset(oDataset);
      oVizFrame.addFeed(new FeedItem({
        uid: "categoryAxis",
        type: "Dimension",
        values: ["Month"]
      }));
      oVizFrame.addFeed(new FeedItem({
        uid: "valueAxis",
        type: "Measure",
        values: ["Technical Debt", "Cloud Readiness"]
      }));
      oVizFrame.addFeed(new FeedItem({
        uid: "valueAxis2",
        type: "Measure",
        values: ["Technical Debt (MA)", "Cloud Readiness (MA)"]
      }));
    },
    
    /**
     * Toggle between different chart types for trend visualization
     */
    onToggleChartType: function(oEvent) {
      const sSelectedType = oEvent.getParameter("selectedItem").getKey();
      const oVizFrame = this.getView().byId("idTrendChart");
      
      if (oVizFrame) {
        oVizFrame.setVizType(sSelectedType);
        MessageToast.show(`Chart type changed to: ${sSelectedType}`);
      }
    },
    
    /**
     * Export trend analysis to separate report
     */
    onExportTrendReport: function() {
      const oView = this.getView();
      const oTrendModel = oView.getModel("trendModel");
      
      if (!oTrendModel) {
        MessageBox.warning("No trend data available to export");
        return;
      }
      
      // Create detailed trend report (PDF)
      MessageToast.show("Trend report export functionality - to be implemented with jsPDF");
    }
  });
});
