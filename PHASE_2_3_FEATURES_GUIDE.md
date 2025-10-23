# Phase 2 & 3 Features - Quick Reference Guide

## Analytics Dashboard

### Access
Navigate to the Analytics Dashboard by clicking the "Analytics Dashboard" button in the Projects List page header.

**Route:** `#/analytics`

### Features

#### 1. KPI Tiles
Four key performance indicators displayed at the top of the dashboard:

- **Technical Debt Score** (0-100) - Lower is better
  - Color: Green (<25), Yellow (25-50), Red (>50)
  
- **Cloud Readiness Score** (0-100) - Higher is better
  - Color: Red (<50), Yellow (50-75), Green (>75)
  
- **Upgrade Impact Score** (0-100) - Lower is better
  - Color: Green (<25), Yellow (25-50), Red (>50)
  
- **Composite Health Score** (0-100) - Higher is better
  - Color: Red (<50), Yellow (50-75), Green (>75)

**Action:** Click on any tile for KPI drill-down (coming soon)

#### 2. Level Distribution Chart (Donut)
Shows the breakdown of analyses by Clean Core Level (A, B, C, D)

- **Level A (Clean Core):** Green
- **Level B (Enhanced Clean Core):** Yellow  
- **Level C (Managed Extensions):** Orange
- **Level D (Custom Solutions):** Red

**Data Labels:** Show percentage of total analyses

#### 3. Score Trends Over Time (Line Chart)
Multi-series line chart showing how scores change over time

- **X-Axis:** Month (YYYY-MM format)
- **Y-Axis:** Score percentage (0-100)
- **Three Series:**
  - Technical Debt (tracked over time)
  - Cloud Readiness (tracked over time)
  - Upgrade Impact (tracked over time)

**Interactive:** Hover over data points for exact values

#### 4. Risk Matrix (Scatter Plot)
Correlation between Technical Debt (X-axis) and Cloud Readiness (Y-axis)

- **Each Point:** Represents one analysis
- **Color:** Indicates Clean Core Level
- **Quadrants:**
  - Top-Left: High readiness, low debt (ideal)
  - Top-Right: High readiness, high debt (needs attention)
  - Bottom-Left: Low readiness, low debt (improvement potential)
  - Bottom-Right: Low readiness, high debt (high risk)

**Interactive:** Click on points to navigate to analysis details (if ID available)

#### 5. Top 10 Complex Objects Table
Lists the most complex RICEFW objects based on combined Technical Debt and Upgrade Impact

**Columns:**
- RICEFW ID
- Object Type
- Complexity Score (0-100)
- Clean Core Level

**Action:** Click on any row to drill down to the full analysis

#### 6. Export Functions
- **Export PDF:** Generate PDF report (requires jsPDF library)
- **Export Excel:** Export data to Excel (requires SheetJS library)

**Note:** Currently displays information dialogs with feature details

---

## Analysis Details Enhancements

### Radar Chart
Located in the Scoring Metrics Dashboard panel on the Analysis Details page

**Displays:**
- Technical Debt Score
- Cloud Readiness Score
- Upgrade Impact Score

**Scale:** 0-100 for all metrics

**Purpose:** Provides visual comparison of the three key metrics at a glance

### Scoring Drill-Down Dialog
Click the "View Breakdown" button in the Scoring Metrics Dashboard header

**Contents:**

1. **Technical Debt Breakdown Panel**
   - Formula: Σ(Level Weight × Complexity Factor) / Count × 100
   - Level Weights: A: 0.00, B: 1.00, C: 3.00, D: 5.00
   - Contributing Factors List:
     - Step description
     - Level assigned
     - Weight applied
     - Complexity factor
     - Contribution percentage

2. **Cloud Readiness Breakdown Panel**
   - Formula: (Count A + 0.5 × Count B) / Total × 100
   - Explanation of cloud compatibility
   - Level distribution

3. **Upgrade Impact Breakdown Panel**
   - Formula: Σ(Level Weight × Custom Lines) / Total Lines × 100
   - Explanation of upgrade effort
   - Impact assessment

4. **Composite Health Score Panel**
   - Formula: 100 - ((Technical Debt × 0.4) + (Upgrade Impact × 0.3) - (Cloud Readiness × 0.3))
   - Overall solution health explanation

**Action:** Click "Close" to dismiss the dialog

---

## Utility Services

### NotificationService
Centralized notification handling for consistent user messaging

**Available Methods:**

```javascript
// Import the service
const NotificationService = sap.ui.require("sd/solutionadvisor/utils/NotificationService");

// Success message
NotificationService.showSuccess("Operation completed", "Optional details");

// Error message (with optional retry)
NotificationService.showError("Operation failed", "Error details", true, retryFunction);

// Warning message
NotificationService.showWarning("Please review", "Warning details");

// Information message
NotificationService.showInformation("Information", "Details");

// Confirmation dialog
NotificationService.showConfirmation(
  "Are you sure?",
  "This action cannot be undone",
  confirmCallback,
  cancelCallback
);

// Delete confirmation (specific style)
NotificationService.showDeleteConfirmation(
  "Analysis XYZ",
  deleteCallback,
  cancelCallback
);
```

### BaseController
Base controller with unsaved changes protection and session management

**Usage:**

```javascript
// Extend BaseController instead of Controller
sap.ui.define([
  "sd/solutionadvisor/controller/BaseController"
], function(BaseController) {
  return BaseController.extend("sd.solutionadvisor.controller.MyController", {
    
    onInit: function() {
      // Start session expiry timer (30 min session, 5 min warning)
      this.startSessionExpiryTimer(30, 5);
    },
    
    onDataChange: function() {
      // Mark that there are unsaved changes
      this.setUnsavedChanges(true);
    },
    
    onSave: function() {
      // Clear unsaved changes flag after successful save
      this.setUnsavedChanges(false);
    },
    
    // onNavBack is automatically handled with confirmation if unsaved changes exist
  });
});
```

**Features:**
- Automatic browser warning before closing with unsaved changes
- Navigation confirmation dialog if unsaved changes exist
- Configurable session expiry warnings
- Helper methods: `getRouter()`, `getResourceBundle()`

---

## Data Aggregation

### Backend Analytics Service

**Function:** `getAnalyticsData()`

**Returns:**
```javascript
{
  technicalDebtScore: Number,      // Average across all analyses
  cloudReadinessScore: Number,     // Average across all analyses
  upgradeImpactScore: Number,      // Average across all analyses
  compositeHealthScore: Number,    // Average across all analyses
  totalAnalyses: Number,           // Total count of analyses
  
  levelDistribution: [             // For donut chart
    { level: String, count: Number, percentage: Number }
  ],
  
  trendData: [                     // For line chart
    { 
      month: String,               // YYYY-MM format
      technicalDebt: Number,
      cloudReadiness: Number,
      upgradeImpact: Number,
      analysisCount: Number
    }
  ],
  
  riskMatrixData: [                // For scatter plot
    {
      id: String,
      ricefwId: String,
      level: String,
      x: Number,                   // Technical Debt
      y: Number,                   // Cloud Readiness
      size: Number
    }
  ],
  
  topObjects: [                    // For top objects table
    {
      id: String,
      ricefwId: String,
      objectType: String,
      complexityScore: Number,
      level: String
    }
  ]
}
```

---

## Testing the Features

### Analytics Dashboard
1. Navigate to Projects List
2. Click "Analytics Dashboard" button in header
3. Verify all KPI tiles display correctly
4. Check that charts render with sample data
5. Click on a row in the Top Objects table to navigate

### Radar Chart
1. Navigate to any completed Analysis Details page
2. Scroll to the Scoring Metrics Dashboard panel
3. Verify the radar chart displays at the bottom
4. Check that all three metrics are visible

### Scoring Drill-Down
1. In Analysis Details, locate the Scoring Metrics Dashboard
2. Click the "View Breakdown" button in the header toolbar
3. Verify the dialog opens with all four panels
4. Expand each panel to see details
5. Click "Close" to dismiss

### Unsaved Changes
1. Open any form with BaseController
2. Make changes without saving
3. Try to navigate away or close the browser
4. Verify confirmation dialog appears

### Session Expiry
1. Open the wizard or any page using BaseController
2. Wait for the configured warning time
3. Verify warning message appears

---

## Troubleshooting

### Charts Not Displaying
- Verify SAP VizFrame library is loaded (check manifest.json)
- Check browser console for errors
- Ensure data is being returned from backend

### Navigation Not Working
- Verify route is defined in manifest.json
- Check that router is properly initialized
- Ensure navigation handler is bound correctly

### Notification Service Not Working
- Verify the service is properly required
- Check that MessageToast/MessageBox are available
- Ensure UI5 version supports these controls

### Unsaved Changes Not Triggering
- Verify BaseController is extended
- Check that `setUnsavedChanges(true)` is called
- Ensure beforeunload handler is attached

---

## Best Practices

1. **Always use OData V4 patterns** for data access
2. **Use NotificationService** for all user messages
3. **Extend BaseController** for forms with unsaved data
4. **Test responsive layouts** on different screen sizes
5. **Handle errors gracefully** with proper logging
6. **Validate data** before visualization
7. **Cache chart configurations** to improve performance
8. **Use proper color coding** for severity levels

---

## Additional Resources

- Complete Implementation Details: `PHASE_2_3_IMPLEMENTATION_COMPLETE.md`
- Technical Specification: `.github/technical specification/`
- SAP UI5 Documentation: https://sapui5.hana.ondemand.com/
- SAP VizFrame Guide: https://sapui5.hana.ondemand.com/#/topic/91f3768f6f4d1014b6dd926db0e91070
