# SAP Clean Core Solution Advisor - Phase 3 Implementation TODO List

**Phase 3: Polish & UX Improvements**  
**Duration:** 1 week  
**Target Completion:** Production-ready user experience with mobile support, rich visualizations, and polished interactions  
**Dependencies:** Phase 1 completion (constraints/examples display, real scoring)

---

## 1. Add Radar Chart to Analysis Details (4 hours)

### 1.1 Create Radar Chart Component (2 hours)
**File:** `app/solutionadvisor/webapp/view/fragments/RadarChart.fragment.xml`  
**Task:** Create reusable radar chart fragment for scoring visualization.

**Required Content:**
```xml
<core:FragmentDefinition
  xmlns:core="sap.ui.core"
  xmlns="sap.m"
  xmlns:viz="sap.viz.ui5.controls"
  xmlns:viz.feeds="sap.viz.ui5.controls.common.feeds">

  <VBox class="sapUiSmallMargin">
    <Title text="{i18n>scoringRadarChart}" level="H4"/>
    <viz:VizFrame id="radarChart" vizType="radar"
      width="100%" height="300px"
      vizProperties="{
        plotArea: {
          dataLabel: { visible: true },
          gridline: { visible: true }
        },
        valueAxis: {
          title: { visible: false },
          scale: { fixedRange: true, minValue: 0, maxValue: 100 }
        },
        categoryAxis: {
          title: { visible: false }
        }
      }">
    </viz:VizFrame>
  </VBox>
</core:FragmentDefinition>
```

**Acceptance Criteria:**
- Radar chart fragment with proper VizFrame configuration
- Scales from 0-100 for all metrics
- Data labels visible on chart

### 1.2 Integrate Radar Chart in AnalysisDetails Controller (2 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalysisDetails.controller.js`  
**Task:** Load and configure radar chart with analysis scoring data.

**Required Changes:**
```javascript
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/viz/ui5/data/FlattenedDataset",
  "sap/viz/ui5/controls/common/feeds/FeedItem"
], function (Controller, JSONModel, FlattenedDataset, FeedItem) {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.AnalysisDetails", {
    onInit: function() {
      // ... existing code ...
      this._setupRadarChart();
    },

    _setupRadarChart: function() {
      const oAnalysis = this.getView().getBindingContext().getObject();

      const radarData = [
        { metric: "Technical Debt", value: oAnalysis.technicalDebtScore },
        { metric: "Cloud Readiness", value: oAnalysis.cloudReadinessScore },
        { metric: "Upgrade Impact", value: oAnalysis.upgradeImpactScore }
      ];

      const oDataset = new FlattenedDataset({
        dimensions: [{ name: "Metric", value: "{metric}" }],
        measures: [{ name: "Score", value: "{value}" }],
        data: radarData
      });

      const oVizFrame = this.byId("radarChart");
      oVizFrame.setDataset(oDataset);

      const feedValueAxis = new FeedItem({
        uid: "valueAxis",
        type: "Measure",
        values: ["Score"]
      });
      const feedCategoryAxis = new FeedItem({
        uid: "categoryAxis",
        type: "Dimension",
        values: ["Metric"]
      });

      oVizFrame.addFeed(feedValueAxis);
      oVizFrame.addFeed(feedCategoryAxis);
    }
  });
});
```

**Acceptance Criteria:**
- Radar chart displays three scoring metrics
- Data loaded from current analysis
- Chart renders correctly in AnalysisDetails view

---

## 2. Implement Scoring Drill-Down Dialog (4 hours)

### 2.1 Create Drill-Down Dialog Fragment (2 hours)
**File:** `app/solutionadvisor/webapp/view/fragments/ScoringDrillDownDialog.fragment.xml`  
**Task:** Create detailed scoring breakdown dialog.

**Required Content:**
```xml
<core:FragmentDefinition
  xmlns:core="sap.ui.core"
  xmlns="sap.m"
  xmlns:layout="sap.ui.layout">

  <Dialog id="scoringDrillDownDialog" title="{i18n>scoringBreakdown}">
    <content>
      <VBox class="sapUiSmallMargin">
        <!-- Technical Debt Section -->
        <Panel headerText="{i18n>technicalDebtScore}" expandable="true" expanded="true">
          <content>
            <layout:Grid defaultSpan="XL6 L6 M12 S12">
              <ObjectAttribute title="{i18n>formula}" text="Σ(Level Weight × Complexity Factor) / Count × 100"/>
              <ObjectAttribute title="{i18n>levelWeights}" text="A: 0.00, B: 1.00, C: 3.00, D: 5.00"/>
            </layout:Grid>
            <List items="{scoring>/technicalDebtBreakdown}">
              <StandardListItem
                title="{scoring>stepDescription}"
                description="Level: {scoring>level}, Weight: {scoring>weight}, Factor: {scoring>factor}"
                info="{scoring>contribution}%"/>
            </List>
          </content>
        </Panel>

        <!-- Cloud Readiness Section -->
        <Panel headerText="{i18n>cloudReadinessScore}" expandable="true">
          <content>
            <ObjectAttribute title="{i18n>formula}" text="(Count A + 0.5 × Count B) / Total × 100"/>
            <Text text="{i18n>cloudReadinessExplanation}"/>
          </content>
        </Panel>

        <!-- Upgrade Impact Section -->
        <Panel headerText="{i18n>upgradeImpactScore}" expandable="true">
          <content>
            <ObjectAttribute title="{i18n>formula}" text="Σ(Level Weight × Custom Lines) / Total Lines × 100"/>
            <Text text="{i18n>upgradeImpactExplanation}"/>
          </content>
        </Panel>
      </VBox>
    </content>
    <buttons>
      <Button text="{i18n>close}" press="onCloseDrillDown"/>
    </buttons>
  </Dialog>
</core:FragmentDefinition>
```

**Acceptance Criteria:**
- Dialog shows formula explanations
- Breakdown lists contributing factors
- Expandable panels for each metric

### 2.2 Wire Drill-Down Functionality (2 hours)
**File:** `app/solutionadvisor/webapp/controller/AnalysisDetails.controller.js`  
**Task:** Add drill-down button and data preparation.

**Required Changes:**
```javascript
onScoringDrillDown: function() {
  if (!this._oScoringDialog) {
    this._oScoringDialog = sap.ui.xmlfragment(
      "sd.solutionadvisor.view.fragments.ScoringDrillDownDialog",
      this
    );
    this.getView().addDependent(this._oScoringDialog);
  }

  // Prepare breakdown data
  const oAnalysis = this.getView().getBindingContext().getObject();
  const breakdownData = this._prepareScoringBreakdown(oAnalysis);

  const oModel = new JSONModel(breakdownData);
  this._oScoringDialog.setModel(oModel, "scoring");

  this._oScoringDialog.open();
},

_prepareScoringBreakdown: function(analysis) {
  // Get decision path for detailed breakdown
  const decisionPath = analysis.decisionPath || [];

  const technicalDebtBreakdown = decisionPath.map(step => ({
    stepDescription: step.questionText || 'Decision Step',
    level: step.recommendedLevel,
    weight: this._getLevelWeight(step.recommendedLevel),
    factor: step.complexityFactor || 1.0,
    contribution: Math.round(this._getLevelWeight(step.recommendedLevel) * (step.complexityFactor || 1.0))
  }));

  return {
    technicalDebtBreakdown,
    cloudReadinessBreakdown: this._calculateCloudReadinessBreakdown(decisionPath),
    upgradeImpactBreakdown: this._calculateUpgradeImpactBreakdown(decisionPath)
  };
},

onCloseDrillDown: function() {
  this._oScoringDialog.close();
}
```

**Acceptance Criteria:**
- Drill-down button opens detailed dialog
- Breakdown data shows contributing factors
- Dialog closes properly

---

## 3. Implement Mobile Responsive Layouts (6 hours)

### 3.1 Update Wizard Mobile Layout (3 hours)
**File:** `app/solutionadvisor/webapp/view/Wizard.view.xml`  
**Task:** Make wizard mobile-friendly with full-screen questions and bottom sheets.

**Required Changes:**
```xml
<!-- Add device-specific layouts -->
<Page id="wizardPage" title="{i18n>wizardTitle}" showNavButton="true">
  <content>
    <!-- Desktop/Tablet Layout -->
    <VBox id="desktopLayout" visible="{= ${device>/system/phone} === false }">
      <layout:Grid defaultSpan="XL8 L8 M12 S12" class="sapUiSmallMargin">
        <!-- Existing wizard content -->
      </layout:Grid>
    </VBox>

    <!-- Mobile Layout -->
    <VBox id="mobileLayout" visible="{device>/system/phone}">
      <VBox class="sapUiSmallMargin">
        <!-- Full-screen question display -->
        <Panel id="questionPanel" expandable="false" class="sapUiNoMargin">
          <content>
            <VBox class="sapUiSmallMargin">
              <Title text="{wizard>/currentQuestion/questionText}" level="H4" class="sapUiSmallMarginBottom"/>
              <List id="answerList" items="{wizard>/currentQuestion/answers}" mode="SingleSelectMaster">
                <StandardListItem title="{wizard>text}" type="Active" press="onAnswerSelect"/>
              </List>
            </VBox>
          </content>
        </Panel>

        <!-- Bottom sheet for constraints/examples -->
        <Panel id="infoPanel" expandable="true" expanded="false" headerText="{i18n>additionalInfo}" class="sapUiSmallMarginTop">
          <content>
            <!-- Constraints and Examples panels -->
          </content>
        </Panel>
      </VBox>
    </VBox>
  </content>
</Page>
```

**Acceptance Criteria:**
- Mobile layout shows full-screen questions
- Bottom sheet for constraints/examples
- Touch-friendly button sizes

### 3.2 Update Analysis Details Mobile Layout (3 hours)
**File:** `app/solutionadvisor/webapp/view/AnalysisDetails.view.xml`  
**Task:** Optimize analysis details for mobile with collapsible sections.

**Required Changes:**
```xml
<!-- Add mobile-specific sections -->
<IconTabBar id="iconTabBar" expandable="false" visible="{= ${device>/system/phone} === false }">
  <!-- Desktop tabs -->
</IconTabBar>

<!-- Mobile accordion layout -->
<VBox id="mobileAccordion" visible="{device>/system/phone}">
  <Panel headerText="{i18n>scoringOverview}" expandable="true" expanded="true">
    <!-- Scoring content -->
  </Panel>
  <Panel headerText="{i18n>decisionFlowchart}" expandable="true">
    <!-- Flowchart content -->
  </Panel>
  <Panel headerText="{i18n>recommendations}" expandable="true">
    <!-- Recommendations content -->
  </Panel>
</VBox>
```

**Acceptance Criteria:**
- Mobile uses accordion instead of tabs
- Panels collapsible for better space usage
- Touch gestures supported

---

## 4. Standardize Success Notifications (3 hours)

### 4.1 Create Notification Service (2 hours)
**File:** `app/solutionadvisor/webapp/utils/NotificationService.js`  
**Task:** Centralize notification handling with consistent messaging.

**Required Content:**
```javascript
sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
  "use strict";

  return {
    showSuccess: function(sMessage, sDetails) {
      const sFullMessage = sDetails ? `${sMessage}\n\n${sDetails}` : sMessage;
      MessageToast.show(sFullMessage, {
        duration: 4000,
        width: "20em"
      });
    },

    showError: function(sMessage, sDetails, bRetry) {
      const sFullMessage = sDetails ? `${sMessage}\n\n${sDetails}` : sMessage;

      if (bRetry) {
        MessageBox.error(sFullMessage, {
          actions: [MessageBox.Action.RETRY, MessageBox.Action.CANCEL],
          onClose: function(sAction) {
            if (sAction === MessageBox.Action.RETRY) {
              // Trigger retry logic
              sap.ui.getCore().getEventBus().publish("notification", "retry");
            }
          }
        });
      } else {
        MessageBox.error(sFullMessage);
      }
    },

    showWarning: function(sMessage, sDetails) {
      MessageBox.warning(sDetails ? `${sMessage}\n\n${sDetails}` : sMessage);
    },

    showConfirmation: function(sMessage, sDetails, fnConfirm, fnCancel) {
      MessageBox.confirm(
        sDetails ? `${sMessage}\n\n${sDetails}` : sMessage,
        {
          onClose: function(sAction) {
            if (sAction === MessageBox.Action.OK) {
              fnConfirm && fnConfirm();
            } else {
              fnCancel && fnCancel();
            }
          }
        }
      );
    }
  };
});
```

**Acceptance Criteria:**
- Consistent notification patterns
- Retry options for errors
- Confirmation dialogs standardized

### 4.2 Update Controllers to Use Notification Service (1 hour)
**File:** All controller files (Wizard.controller.js, AnalysisDetails.controller.js, etc.)  
**Task:** Replace direct MessageToast/MessageBox calls with notification service.

**Required Changes:**
Example in Wizard.controller.js:
```javascript
// Before
sap.m.MessageToast.show("Analysis saved successfully");

// After
const NotificationService = sap.ui.require("sd/solutionadvisor/utils/NotificationService");
NotificationService.showSuccess("Analysis saved successfully", "You can resume it later from the dashboard");
```

**Acceptance Criteria:**
- All success messages use standardized format
- Error messages include retry options where appropriate
- Confirmation dialogs consistent across app

---

## 5. Add Warning Dialogs and Unsaved Changes Protection (4 hours)

### 5.1 Implement Unsaved Changes Warning (2 hours)
**File:** `app/solutionadvisor/webapp/controller/BaseController.js`  
**Task:** Create base controller with unsaved changes tracking.

**Required Content:**
```javascript
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox"
], function (Controller, MessageBox) {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.BaseController", {
    _bHasUnsavedChanges: false,

    setUnsavedChanges: function(bHasChanges) {
      this._bHasUnsavedChanges = bHasChanges;
      // Update window beforeunload handler
      if (bHasChanges) {
        window.addEventListener("beforeunload", this._onBeforeUnload.bind(this));
      } else {
        window.removeEventListener("beforeunload", this._onBeforeUnload.bind(this));
      }
    },

    _onBeforeUnload: function(oEvent) {
      oEvent.preventDefault();
      oEvent.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return oEvent.returnValue;
    },

    onNavButtonPress: function() {
      if (this._bHasUnsavedChanges) {
        MessageBox.confirm(
          "You have unsaved changes. Do you want to leave without saving?",
          {
            onClose: function(sAction) {
              if (sAction === MessageBox.Action.OK) {
                this.setUnsavedChanges(false);
                // Proceed with navigation
                this._performNavigation();
              }
            }.bind(this)
          }
        );
      } else {
        this._performNavigation();
      }
    }
  });
});
```

**Acceptance Criteria:**
- Unsaved changes tracked across forms
- Browser close warning
- Navigation confirmation dialogs

### 5.2 Add Session Expiring Warning (2 hours)
**File:** `app/solutionadvisor/webapp/controller/Wizard.controller.js`  
**Task:** Warn users before draft session expires.

**Required Changes:**
```javascript
onInit: function() {
  // ... existing code ...
  this._startSessionExpiryWarning();
},

_startSessionExpiryWarning: function() {
  // Warn 5 minutes before expiry (assuming 30 min sessions)
  setTimeout(function() {
    MessageBox.warning(
      "Your draft session will expire in 5 minutes. Please save your progress.",
      {
        actions: [MessageBox.Action.OK, "Save Now"],
        onClose: function(sAction) {
          if (sAction === "Save Now") {
            this.onSaveDraft();
          }
        }.bind(this)
      }
    );
  }, 25 * 60 * 1000); // 25 minutes
}
```

**Acceptance Criteria:**
- Session expiry warnings at appropriate times
- Save option in warning dialog

---

## 6. Expand Performance Thresholds Seed Data (4 hours)

### 6.1 Add Comprehensive Threshold Data (4 hours)
**File:** `db/data/sd-PerformanceThreshold.csv`  
**Task:** Expand from 6 to 25+ entries covering all integration methods and constraints.

**Sample Additions:**
```
ID,objectType,constraintType,severity,thresholdValue,unit,description,recommendation,deploymentType,isActive
PT-007,I,IntegrationVolume,HIGH,10000,transactions/day,"High volume integration (>10K/day) requires special consideration","Consider event-driven architecture or middleware optimization","Cloud",true
PT-008,I,IntegrationVolume,MEDIUM,1000,transactions/day,"Medium volume integration (1K-10K/day)","Standard integration patterns acceptable","Cloud",true
PT-009,I,IntegrationComplexity,HIGH,5,endpoints,"Integration with >5 endpoints is complex","Consider API consolidation or microservices","Cloud",true
PT-010,I,DataMappingComplexity,HIGH,10,fields,"Complex data mapping (>10 fields) increases maintenance","Use automated mapping tools or simplify mappings","Cloud",true
PT-011,C,DataVolume,HIGH,1000000,records,"Large data conversion (>1M records)","Implement parallel processing and staging tables","Cloud",true
PT-012,C,DataVolume,MEDIUM,100000,records,"Medium data conversion (100K-1M records)","Standard ETL processes acceptable","Cloud",true
PT-013,C,LegacySystemDependency,HIGH,3,systems,"Dependency on >3 legacy systems","Plan system decommissioning sequence","Cloud",true
PT-014,E,CustomCodeVolume,HIGH,5000,lines,"Large custom code (>5K lines)","Consider standard functionality or extensions","Cloud",true
PT-015,E,ModificationImpact,HIGH,10,objects,"Impact on >10 standard objects","Evaluate side effects and regression testing","Cloud",true
PT-016,F,PrintVolume,HIGH,1000,pages/day,"High volume printing (>1K pages/day)","Consider electronic alternatives","Cloud",true
PT-017,F,FormComplexity,HIGH,20,fields,"Complex forms (>20 fields)","Split into multiple simpler forms","Cloud",true
PT-018,W,ApprovalChainLength,HIGH,5,levels,"Long approval chains (>5 levels)","Consider workflow optimization","Cloud",true
PT-019,W,ParallelBranches,HIGH,3,branches,"Complex parallel workflows","Evaluate process simplification","Cloud",true
PT-020,W,ExceptionHandling,HIGH,10,exceptions,"Many exception paths (>10)","Standardize exception handling","Cloud",true
PT-021,R,ReportComplexity,HIGH,50,columns,"Wide reports (>50 columns)","Consider report splitting or drill-down","Cloud",true
PT-022,R,RealTimeRequirement,HIGH,1,second,"Sub-second response required","Evaluate caching and performance optimization","Cloud",true
PT-023,I,APIStability,MEDIUM,6,months,"API changes within 6 months","Monitor API lifecycle and plan migrations","Cloud",true
PT-024,C,DataValidationComplexity,HIGH,15,rules,"Complex validation (>15 rules)","Implement automated testing","Cloud",true
PT-025,E,UpgradeCompatibility,MEDIUM,70,compatibility,"%","Review compatibility matrix","Cloud",true
```

**Acceptance Criteria:**
- 25+ comprehensive thresholds
- Covers all object types and constraint categories
- Different severity levels (HIGH/MEDIUM/LOW)
- Deployment-specific considerations

---

## 7. Expand Real-World Examples Seed Data (6 hours)

### 7.1 Add Diverse Example Data (6 hours)
**File:** `db/data/sd-RealWorldExample.csv`  
**Task:** Expand from 4 to 50+ examples across industries and scenarios.

**Sample Additions:**
```
ID,objectType,scenario,industry,companySize,cleanCoreLevel,implementationApproach,challenges,outcome,lessonsLearned,relevanceScore
EX-005,R,SalesReporting,Retail,Large,B,"Implemented SAP S/4HANA embedded analytics with custom CDS views","Performance tuning for large datasets (50M+ records)","Reduced reporting time from 2 hours to 5 minutes, 80% cost savings","Start with standard analytics before custom development",85
EX-006,R,FinancialReporting,Manufacturing,Medium,C,"Custom ABAP reports migrated to SAP Analytics Cloud","Complex financial logic translation","Maintained all regulatory requirements, improved user adoption by 60%","Plan data model changes early in migration",78
EX-007,I,SAPToExternal,OilAndGas,Large,A,"SAP CPI integration with IoT sensors","Real-time data processing at scale","99.9% uptime, reduced manual intervention by 90%","Design for scalability from day one",92
EX-008,I,LegacyToSAP,Healthcare,Medium,B,"SAP PO middleware for HL7 integration","Healthcare data privacy and compliance","HIPAA compliant, zero data loss during transition","Involve compliance team early",88
EX-009,C,MaterialMasterMigration,Automotive,Large,C,"Custom LSMW programs with parallel processing","Complex material hierarchies and classifications","Migrated 2M materials in 48 hours with 99.5% accuracy","Test with production-like data volumes",82
EX-010,C,CustomerDataConversion,Telecom,Large,D,"Custom ABAP conversion programs","Telephone number formatting and duplicate handling","Successful go-live, but 3-month delay due to testing","Allocate sufficient testing time for conversions",65
EX-011,E,PricingLogic,ConsumerGoods,Medium,B,"Custom pricing BADI migrated to subscription billing","Complex promotional pricing rules","Reduced billing errors by 95%, improved cash flow","Document all business rules before migration",85
EX-012,E,QualityManagement,Pharmaceuticals,Large,A,"SAP QM integrated with LIMS via APIs","Regulatory compliance and audit trails","FDA compliant, reduced batch release time by 50%","Maintain detailed audit logs for regulated industries",90
EX-013,F,InvoiceForms,Utilities,Large,C,"Adobe Forms replaced with SAP S/4HANA output management","Complex multi-language invoice layouts","50% reduction in printing costs, improved delivery speed","Evaluate electronic alternatives first",75
EX-014,F,PickLists,Warehousing,Medium,A,"SAP WM pick lists optimized with barcodes","High-volume picking operations","Increased picking accuracy to 99.8%, 30% productivity gain","Focus on mobile device integration",88
EX-015,W,ProcurementApproval,Construction,Small,B,"SAP Workflow replaced with Microsoft Power Automate","Complex approval matrices","Faster approvals, better mobile access, reduced paper","Consider low-code alternatives for simple workflows",80
EX-016,W,ContractApproval,Legal,Medium,C,"Custom workflow with digital signatures","Legal compliance and signature validation","100% digital process, improved audit trail","Ensure legal acceptance of digital signatures",83
EX-017,R,InventoryReporting,Retail,Large,A,"SAP S/4HANA embedded analytics dashboards","Real-time inventory visibility requirements","Reduced stockouts by 40%, improved inventory turnover","Leverage standard dashboards before custom",87
EX-018,I,BankIntegration,FinancialServices,Large,B,"SAP CPI for SWIFT message processing","Financial message standards compliance","Zero failed payments, improved STP rate to 95%","Partner with banking specialists for standards",89
EX-019,C,VendorMasterMigration,Manufacturing,Medium,A,"SAP S/4HANA migration cockpit with custom enhancements","Vendor classification and tax data","Clean migration with improved data quality","Use migration cockpit for standard objects",91
EX-020,C,AssetAccountingConversion,Energy,Large,D,"Custom conversion programs for asset hierarchies","Complex depreciation areas and cost centers","Successful conversion but required significant custom code","Plan for complex organizational structures",70
```

**Continue adding examples for all combinations of:**
- All 6 object types (R, I, C, E, F, W)
- Multiple industries (Retail, Manufacturing, Healthcare, Financial, etc.)
- Different company sizes (Small, Medium, Large)
- All clean core levels (A, B, C, D)
- Various scenarios and implementation approaches

**Acceptance Criteria:**
- 50+ diverse examples
- Covers all object types and levels
- Real-world scenarios with outcomes
- Relevance scores for filtering
- Industry and company size variety

---

## Phase 3 Success Criteria

- ✅ **Radar Chart:** Three-metric visualization in analysis details
- ✅ **Scoring Drill-Down:** Detailed formula breakdown dialog
- ✅ **Mobile Layouts:** Responsive wizard and analysis details
- ✅ **Standardized Notifications:** Consistent success/error/warning messages
- ✅ **Warning Dialogs:** Unsaved changes and session expiry protection
- ✅ **Expanded Seed Data:** 25+ performance thresholds, 50+ examples

## Testing Instructions

1. **Radar Chart:** Verify displays correctly in AnalysisDetails with proper scaling
2. **Drill-Down Dialog:** Test formula explanations and breakdown data
3. **Mobile Layout:** Test on phone/tablet with touch gestures
4. **Notifications:** Verify consistent messaging across all operations
5. **Warnings:** Test unsaved changes and session expiry scenarios
6. **Seed Data:** Verify constraints/examples display with expanded data

## Dependencies

- Phase 1 completion (scoring calculations, basic UI)
- SAP VizFrame for radar chart
- Device API for responsive detection

## Estimated Effort Breakdown

- Radar Chart: 4 hours
- Scoring Drill-Down: 4 hours
- Mobile Layouts: 6 hours
- Notifications: 3 hours
- Warning Dialogs: 4 hours
- Performance Thresholds: 4 hours
- Real-World Examples: 6 hours

**Total: ~31 hours (3.9 days)**

---

**Document Version:** 1.0  
**Created:** October 22, 2025  
**Ready for Coding Agent Delegation**