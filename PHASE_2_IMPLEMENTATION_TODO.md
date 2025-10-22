# SAP Clean Core Solution Advisor - Phase 2 Implementation TODO List

**Phase 2: Build Analytics Dashboard**  
**Duration:** 1 week  
**Target Completion:** Complete analytics view with charts, KPIs, and exports  
**Dependencies:** Phase 1 completion (real scoring formulas, adequate seed data)

---

## 1. Create Analytics Dashboard Foundation (1 day)

### 1.1 Create AnalyticsDashboard.view.xml (4 hours)
**File:** `app/solutionadvisor/webapp/view/AnalyticsDashboard.view.xml`  
**Task:** Create the main dashboard view with responsive layout and sections for KPIs and charts.

**Required Content:**
```xml
<mvc:View
  controllerName="sd.solutionadvisor.controller.AnalyticsDashboard"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:layout="sap.ui.layout"
  xmlns:viz="sap.viz.ui5.controls"
  xmlns:viz.feeds="sap.viz.ui5.controls.common.feeds">

  <Page title="{i18n>analyticsDashboardTitle}" showNavButton="true" navButtonPress="onNavBack">
    <content>
      <!-- KPI Tiles Section -->
      <layout:Grid defaultSpan="XL3 L3 M6 S12" class="sapUiSmallMargin">
        <GenericTile
          class="sapUiTinyMargin"
          header="{i18n>technicalDebtScore}"
          subheader="{analytics>/technicalDebtScore}%"
          press="onKPIDrillDown"
          frameType="TwoByOne">
          <tileContent>
            <TileContent footer="{i18n>averageAcrossAllAnalyses}">
              <content>
                <NumericContent value="{analytics>/technicalDebtScore}" scale="%"
                  valueColor="Critical" indicator="Up"/>
              </content>
            </TileContent>
          </tileContent>
        </GenericTile>
        <!-- Repeat for Cloud Readiness, Upgrade Impact, Composite Health -->
      </layout:Grid>

      <!-- Charts Section -->
      <VBox class="sapUiSmallMargin">
        <layout:Grid defaultSpan="XL6 L6 M12 S12">
          <!-- Level Distribution Chart -->
          <VBox class="sapUiTinyMargin">
            <Title text="{i18n>levelDistribution}" level="H3"/>
            <viz:VizFrame id="levelDistributionChart" vizType="donut"
              width="100%" height="300px" vizProperties="{/* donut properties */}"/>
          </VBox>

          <!-- Trend Analysis Chart -->
          <VBox class="sapUiTinyMargin">
            <Title text="{i18n>trendAnalysis}" level="H3"/>
            <viz:VizFrame id="trendAnalysisChart" vizType="line"
              width="100%" height="300px"/>
          </VBox>
        </layout:Grid>

        <layout:Grid defaultSpan="XL6 L6 M12 S12">
          <!-- Risk Matrix Chart -->
          <VBox class="sapUiTinyMargin">
            <Title text="{i18n>riskMatrix}" level="H3"/>
            <viz:VizFrame id="riskMatrixChart" vizType="scatter"
              width="100%" height="300px"/>
          </VBox>

          <!-- Top Objects Table -->
          <VBox class="sapUiTinyMargin">
            <Title text="{i18n>topObjects}" level="H3"/>
            <Table id="topObjectsTable" items="{analytics>/topObjects}">
              <columns>
                <Column><Text text="{i18n>ricefwId}"/></Column>
                <Column><Text text="{i18n>objectType}"/></Column>
                <Column><Text text="{i18n>complexityScore}"/></Column>
              </columns>
              <items>
                <ColumnListItem press="onObjectDrillDown">
                  <cells>
                    <Text text="{analytics>ricefwId}"/>
                    <Text text="{analytics>objectType}"/>
                    <Text text="{analytics>complexityScore}"/>
                  </cells>
                </ColumnListItem>
              </items>
            </Table>
          </VBox>
        </layout:Grid>
      </VBox>

      <!-- Export Section -->
      <HBox class="sapUiSmallMargin" justifyContent="End">
        <Button text="{i18n>exportPDF}" press="onExportPDF" type="Emphasized"/>
        <Button text="{i18n>exportExcel}" press="onExportExcel"/>
      </HBox>
    </content>
  </Page>
</mvc:View>
```

**Acceptance Criteria:**
- Responsive grid layout for desktop/tablet/mobile
- Proper SAP VizFrame chart placeholders
- KPI tiles with numeric content and drill-down capability
- Export buttons positioned appropriately

### 1.2 Create AnalyticsDashboard.controller.js (4 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Implement controller with data loading, chart configuration, and export functionality.

**Required Content:**
```javascript
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem"
], function (Controller, JSONModel, FlattenedDataset, FeedItem) {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.AnalyticsDashboard", {
    onInit: function() {
      this._loadAnalyticsData();
      this._setupCharts();
    },

    _loadAnalyticsData: function() {
      const oModel = this.getView().getModel();
      // Load aggregated analytics data
      oModel.callFunction("/getAnalyticsData", {
        method: "GET",
        success: function(oData) {
          const oAnalyticsModel = new JSONModel(oData);
          this.getView().setModel(oAnalyticsModel, "analytics");
          this._updateCharts();
        }.bind(this)
      });
    },

    _setupCharts: function() {
      // Configure each chart with feeds and data
      this._setupLevelDistributionChart();
      this._setupTrendAnalysisChart();
      this._setupRiskMatrixChart();
    },

    onKPIDrillDown: function(oEvent) {
      // Open drill-down dialog for KPI details
    },

    onExportPDF: function() {
      // Generate PDF with jsPDF
    },

    onExportExcel: function() {
      // Export data to Excel with SheetJS
    }
  });
});
```

**Acceptance Criteria:**
- Controller extends base Controller properly
- Data loading from backend service
- Chart setup methods implemented
- Event handlers for drill-down and export

### 1.3 Add Dashboard Route to manifest.json (2 hours)
**File:** `app/solutionadvisor/webapp/manifest.json`  
**Task:** Add route and target for AnalyticsDashboard.

**Required Changes:**
In the "routing" section:
```json
{
  "routes": [
    {
      "name": "AnalyticsDashboard",
      "pattern": "analytics",
      "target": "AnalyticsDashboard"
    }
  ],
  "targets": [
    {
      "name": "AnalyticsDashboard",
      "type": "View",
      "viewName": "AnalyticsDashboard",
      "viewLevel": 2
    }
  ]
}
```

**Acceptance Criteria:**
- Route accessible via #/analytics
- Navigation from main app works

---

## 2. Implement KPI Tiles (4 hours)

### 2.1 Create Backend Analytics Aggregation Service (2 hours)
**File:** `srv/lib/analytics-service.js`  
**Task:** Create service to aggregate analytics data across all analyses.

**Required Content:**
```javascript
const cds = require('@sap/cds');

class AnalyticsService {
  async getAnalyticsData() {
    // Aggregate KPI data
    const kpiData = await this._calculateKPIs();
    const chartData = await this._prepareChartData();

    return {
      ...kpiData,
      ...chartData
    };
  }

  async _calculateKPIs() {
    const analyses = await SELECT.from('sd.CleanCoreAnalysis');

    const technicalDebtScore = analyses.reduce((sum, a) => sum + a.technicalDebtScore, 0) / analyses.length;
    const cloudReadinessScore = analyses.reduce((sum, a) => sum + a.cloudReadinessScore, 0) / analyses.length;
    const upgradeImpactScore = analyses.reduce((sum, a) => sum + a.upgradeImpactScore, 0) / analyses.length;
    const compositeHealthScore = analyses.reduce((sum, a) => sum + a.compositeHealthScore, 0) / analyses.length;

    return {
      technicalDebtScore: Math.round(technicalDebtScore),
      cloudReadinessScore: Math.round(cloudReadinessScore),
      upgradeImpactScore: Math.round(upgradeImpactScore),
      compositeHealthScore: Math.round(compositeHealthScore)
    };
  }
}

module.exports = AnalyticsService;
```

**Acceptance Criteria:**
- Service calculates averages across all analyses
- Returns properly formatted KPI data

### 2.2 Wire KPI Tiles to Backend Data (2 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Bind KPI tiles to analytics model data.

**Required Changes:**
Update `_loadAnalyticsData` to bind KPIs:
```javascript
_loadAnalyticsData: function() {
  // ... existing code ...
  success: function(oData) {
    const oAnalyticsModel = new JSONModel(oData);
    this.getView().setModel(oAnalyticsModel, "analytics");

    // Bind KPI tiles
    this._bindKPITiles(oData);
    this._updateCharts();
  }.bind(this)
},

_bindKPITiles: function(data) {
  // Set value colors based on score ranges
  const tdTile = this.byId("technicalDebtTile");
  tdTile.setValueColor(data.technicalDebtScore > 50 ? "Error" : data.technicalDebtScore > 25 ? "Critical" : "Good");
  // Similar for other tiles
}
```

**Acceptance Criteria:**
- KPI tiles display correct aggregated values
- Color coding based on score thresholds
- Drill-down functionality opens detailed view

---

## 3. Implement Level Distribution Donut Chart (4 hours)

### 3.1 Prepare Chart Data in Backend (2 hours)
**File:** `srv/lib/analytics-service.js`  
**Task:** Aggregate level distribution data.

**Required Changes:**
Add to `AnalyticsService`:
```javascript
async _prepareChartData() {
  const levelCounts = await SELECT `
    recommendedLevel,
    COUNT(*) as count
  `.from('sd.CleanCoreAnalysis')
   .groupBy('recommendedLevel');

  const levelDistribution = levelCounts.map(item => ({
    level: item.recommendedLevel,
    count: item.count,
    percentage: Math.round((item.count / levelCounts.reduce((sum, i) => sum + i.count, 0)) * 100)
  }));

  return {
    levelDistribution,
    // ... other chart data
  };
}
```

**Acceptance Criteria:**
- Data aggregated by recommended level
- Percentages calculated correctly

### 3.2 Configure Donut Chart in Controller (2 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Set up SAP VizFrame donut chart.

**Required Changes:**
```javascript
_setupLevelDistributionChart: function() {
  const oVizFrame = this.byId("levelDistributionChart");
  const oDataset = new FlattenedDataset({
    dimensions: [{ name: "Level", value: "{level}" }],
    measures: [{ name: "Count", value: "{count}" }],
    data: "{analytics>/levelDistribution}"
  });

  oVizFrame.setDataset(oDataset);
  oVizFrame.setVizProperties({
    plotArea: {
      dataLabel: { visible: true, type: "percentage" }
    },
    title: { text: "Clean Core Level Distribution" }
  });

  const feedValueAxis = new FeedItem({ uid: "size", type: "Measure", values: ["Count"] });
  const feedCategoryAxis = new FeedItem({ uid: "color", type: "Dimension", values: ["Level"] });

  oVizFrame.addFeed(feedValueAxis);
  oVizFrame.addFeed(feedCategoryAxis);
}
```

**Acceptance Criteria:**
- Donut chart displays level distribution
- Data labels show percentages
- Color coding by level (A=green, B=yellow, C=orange, D=red)

---

## 4. Implement Trend Analysis Line Chart (6 hours)

### 4.1 Prepare Time-Series Data (3 hours)
**File:** `srv/lib/analytics-service.js`  
**Task:** Aggregate scores over time periods.

**Required Changes:**
```javascript
async _prepareTrendData() {
  // Group analyses by month and calculate average scores
  const monthlyTrends = await cds.run(`
    SELECT
      DATE_TRUNC('month', createdAt) as month,
      AVG(technicalDebtScore) as avgTD,
      AVG(cloudReadinessScore) as avgCR,
      AVG(upgradeImpactScore) as avgUI,
      COUNT(*) as analysisCount
    FROM sd_CleanCoreAnalysis
    GROUP BY DATE_TRUNC('month', createdAt)
    ORDER BY month
  `);

  return monthlyTrends.map(item => ({
    month: item.month.toISOString().substring(0, 7), // YYYY-MM format
    technicalDebt: Math.round(item.avgTD),
    cloudReadiness: Math.round(item.avgCR),
    upgradeImpact: Math.round(item.avgUI),
    analysisCount: item.analysisCount
  }));
}
```

**Acceptance Criteria:**
- Data grouped by month
- Averages calculated for each score type

### 4.2 Configure Line Chart (3 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Set up multi-series line chart.

**Required Changes:**
```javascript
_setupTrendAnalysisChart: function() {
  const oVizFrame = this.byId("trendAnalysisChart");
  const oDataset = new FlattenedDataset({
    dimensions: [{ name: "Month", value: "{month}" }],
    measures: [
      { name: "Technical Debt", value: "{technicalDebt}" },
      { name: "Cloud Readiness", value: "{cloudReadiness}" },
      { name: "Upgrade Impact", value: "{upgradeImpact}" }
    ],
    data: "{analytics>/trendData}"
  });

  oVizFrame.setDataset(oDataset);
  oVizFrame.setVizProperties({
    plotArea: {
      dataPointSize: { min: 5, max: 10 },
      line: { width: 2 }
    },
    valueAxis: { title: { text: "Score (%)" } },
    categoryAxis: { title: { text: "Month" } }
  });

  // Add feeds for multiple series
  oVizFrame.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["Technical Debt", "Cloud Readiness", "Upgrade Impact"] }));
  oVizFrame.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Month"] }));
}
```

**Acceptance Criteria:**
- Multi-series line chart with 3 score trends
- Time axis shows months
- Interactive tooltips with values

---

## 5. Implement Risk Matrix Scatter Plot (6 hours)

### 5.1 Prepare Scatter Plot Data (3 hours)
**File:** `srv/lib/analytics-service.js`  
**Task:** Prepare TD vs CR coordinates for each analysis.

**Required Changes:**
```javascript
async _prepareRiskMatrixData() {
  const analyses = await SELECT `
    ID, ricefwId, recommendedLevel,
    technicalDebtScore, cloudReadinessScore
  `.from('sd.CleanCoreAnalysis');

  return analyses.map(analysis => ({
    id: analysis.ID,
    ricefwId: analysis.ricefwId,
    level: analysis.recommendedLevel,
    x: analysis.technicalDebtScore, // Technical Debt on X-axis
    y: analysis.cloudReadinessScore, // Cloud Readiness on Y-axis
    size: 1 // Could vary by complexity
  }));
}
```

**Acceptance Criteria:**
- Each analysis plotted as point
- Quadrants represent risk levels

### 5.2 Configure Scatter Plot (3 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Set up scatter plot with quadrants.

**Required Changes:**
```javascript
_setupRiskMatrixChart: function() {
  const oVizFrame = this.byId("riskMatrixChart");
  const oDataset = new FlattenedDataset({
    dimensions: [
      { name: "RICEFW ID", value: "{ricefwId}" },
      { name: "Level", value: "{level}" }
    ],
    measures: [
      { name: "Technical Debt", value: "{x}" },
      { name: "Cloud Readiness", value: "{y}" },
      { name: "Size", value: "{size}" }
    ],
    data: "{analytics>/riskMatrixData}"
  });

  oVizFrame.setDataset(oDataset);
  oVizFrame.setVizProperties({
    plotArea: {
      dataPoint: {
        shape: "circle",
        size: { field: "Size" }
      },
      referenceLine: {
        line: [
          { value: 50, label: { text: "High Risk Threshold" } }, // Vertical line at TD=50
          { value: 50, orientation: "horizontal", label: { text: "Readiness Threshold" } } // Horizontal line at CR=50
        ]
      }
    },
    valueAxis: { title: { text: "Cloud Readiness (%)" } },
    valueAxis2: { title: { text: "Technical Debt (%)" } }
  });

  oVizFrame.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["Cloud Readiness"] }));
  oVizFrame.addFeed(new FeedItem({ uid: "valueAxis2", type: "Measure", values: ["Technical Debt"] }));
  oVizFrame.addFeed(new FeedItem({ uid: "color", type: "Dimension", values: ["Level"] }));
}
```

**Acceptance Criteria:**
- Scatter plot with TD vs CR axes
- Quadrant lines at 50% thresholds
- Color coding by clean core level
- Clickable points for drill-down

---

## 6. Implement Top Objects Table (4 hours)

### 6.1 Prepare Top Objects Data (2 hours)
**File:** `srv/lib/analytics-service.js`  
**Task:** Rank objects by complexity score.

**Required Changes:**
```javascript
async _prepareTopObjectsData() {
  const topObjects = await SELECT `
    ricefwId, objectType, recommendedLevel,
    (technicalDebtScore + upgradeImpactScore) / 2 as complexityScore
  `.from('sd.CleanCoreAnalysis')
   .orderBy('complexityScore DESC')
   .limit(10);

  return topObjects.map(obj => ({
    ricefwId: obj.ricefwId,
    objectType: obj.objectType,
    complexityScore: Math.round(obj.complexityScore),
    level: obj.recommendedLevel
  }));
}
```

**Acceptance Criteria:**
- Top 10 objects by combined TD+UI score
- Includes RICEFW ID, type, and level

### 6.2 Configure Table with Drill-Down (2 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Set up sortable table with navigation.

**Required Changes:**
```javascript
onObjectDrillDown: function(oEvent) {
  const oItem = oEvent.getSource();
  const sPath = oItem.getBindingContext("analytics").getPath();
  const oData = this.getView().getModel("analytics").getProperty(sPath);

  // Navigate to analysis details
  this.getRouter().navTo("AnalysisDetails", {
    analysisId: oData.id
  });
}
```

**Acceptance Criteria:**
- Table shows top 10 complex objects
- Click navigates to analysis details
- Sortable by complexity score

---

## 7. Implement Analytics Exports (4 hours)

### 7.1 PDF Export with jsPDF (2 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Generate PDF report of dashboard.

**Required Changes:**
```javascript
onExportPDF: function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape');

  // Add title
  doc.setFontSize(20);
  doc.text('Clean Core Analytics Report', 20, 30);

  // Add KPI summary
  doc.setFontSize(12);
  const analyticsData = this.getView().getModel("analytics").getData();
  doc.text(`Technical Debt: ${analyticsData.technicalDebtScore}%`, 20, 50);
  doc.text(`Cloud Readiness: ${analyticsData.cloudReadinessScore}%`, 20, 60);
  doc.text(`Upgrade Impact: ${analyticsData.upgradeImpactScore}%`, 20, 70);

  // Add charts as images (would need html2canvas)
  // ... chart capture logic ...

  doc.save('analytics-report.pdf');
}
```

**Acceptance Criteria:**
- PDF contains KPI summary
- Charts captured and included
- Proper formatting and headers

### 7.2 Excel Export with SheetJS (2 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalyticsDashboard.controller.js`  
**Task:** Export raw data to Excel.

**Required Changes:**
```javascript
onExportExcel: function() {
  const XLSX = window.XLSX;
  const analyticsData = this.getView().getModel("analytics").getData();

  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new();

  // KPI Summary sheet
  const kpiData = [
    ['Metric', 'Value'],
    ['Technical Debt Score', analyticsData.technicalDebtScore],
    ['Cloud Readiness Score', analyticsData.cloudReadinessScore],
    ['Upgrade Impact Score', analyticsData.upgradeImpactScore],
    ['Composite Health Score', analyticsData.compositeHealthScore]
  ];
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPI Summary');

  // Raw data sheet
  const rawData = analyticsData.allAnalyses || [];
  const rawSheet = XLSX.utils.json_to_sheet(rawData);
  XLSX.utils.book_append_sheet(wb, rawSheet, 'Raw Data');

  XLSX.writeFile(wb, 'analytics-data.xlsx');
}
```

**Acceptance Criteria:**
- Excel file with multiple sheets
- KPI summary and raw analysis data
- Proper column headers and formatting

---

## Phase 2 Success Criteria

- ✅ **Dashboard View:** Complete responsive layout with all sections
- ✅ **KPI Tiles:** 4 tiles showing aggregated scores with drill-down
- ✅ **Level Distribution:** Donut chart with A/B/C/D breakdown
- ✅ **Trend Analysis:** Line chart showing score trends over time
- ✅ **Risk Matrix:** Scatter plot with TD vs CR quadrants
- ✅ **Top Objects:** Table of most complex RICEFW objects
- ✅ **PDF Export:** Dashboard report generation
- ✅ **Excel Export:** Raw data export with multiple sheets

## Testing Instructions

1. **Data Loading:** Verify analytics data loads from backend service
2. **Chart Rendering:** Check all charts display correctly with sample data
3. **Drill-Down:** Test KPI tile and table row navigation
4. **Exports:** Verify PDF and Excel files generate with correct content
5. **Responsive:** Test dashboard layout on different screen sizes

## Dependencies

- Phase 1 completion (scoring formulas, seed data)
- SAP VizFrame library loaded
- jsPDF and SheetJS libraries available

## Estimated Effort Breakdown

- Dashboard Foundation: 10 hours
- KPI Tiles: 4 hours
- Level Distribution Chart: 4 hours
- Trend Analysis Chart: 6 hours
- Risk Matrix Chart: 6 hours
- Top Objects Table: 4 hours
- Analytics Exports: 4 hours

**Total: ~38 hours (4.75 days)**

---

**Document Version:** 1.0  
**Created:** October 22, 2025  
**Ready for Coding Agent Delegation**