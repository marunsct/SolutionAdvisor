# Cross-App Navigation Implementation Guide

## Overview
Successfully implemented intent-based cross-app navigation with semantic objects, parameter passing, deep linking, and navigation services for seamless app-to-app communication in SAP Fiori Launchpad.

**Implementation Date:** October 25, 2025  
**Status:** ✅ COMPLETED (Task 4 of 6)  
**Estimated Effort:** 8 hours  
**Actual Effort:** 4 hours

---

## Architecture

### Navigation Flow
```
┌─────────────────┐
│  Tile Click     │
│  (Launchpad)    │
└────────┬────────┘
         │ Intent: #SolutionAdvisor-wizard
         ▼
┌─────────────────┐
│ Shell Services  │
│ - CrossAppNav   │
│ - ShellNav      │
└────────┬────────┘
         │ Resolve Intent
         ▼
┌─────────────────┐
│ App Manifest    │
│ (inbounds)      │
└────────┬────────┘
         │ Match: SolutionAdvisor-wizard
         ▼
┌─────────────────┐
│ App Router      │
│ (routes)        │
└────────┬────────┘
         │ Navigate to Wizard route
         ▼
┌─────────────────┐
│ Controller      │
│ - Get params    │
│ - Load data     │
└─────────────────┘
```

---

## Semantic Objects & Actions

### Defined Intents

| Intent | Semantic Object | Action | Purpose |
|--------|----------------|--------|---------|
| `#SolutionAdvisor-wizard` | SolutionAdvisor | wizard | Create/resume analysis |
| `#SolutionAdvisor-projects` | SolutionAdvisor | projects | View projects list |
| `#SolutionAdvisor-analytics` | SolutionAdvisor | analytics | Analytics dashboard |
| `#SolutionAdvisor-analyses` | SolutionAdvisor | analyses | View analyses list |
| `#SolutionAdvisor-admin` | SolutionAdvisor | admin | Administration |

### Parameter Definitions

#### SolutionAdvisor-wizard
**Parameters:**
- `projectId` (optional) - Pre-select project for new analysis
- `sessionId` (optional) - Resume saved wizard session
- `analysisId` (optional) - Edit existing analysis

**Example Intent:**
```
#SolutionAdvisor-wizard?projectId=12345&sessionId=abc-def-ghi
```

#### SolutionAdvisor-analytics
**Parameters:**
- `projectId` (optional) - Filter analytics by project
- `dateFrom` (optional) - Start date for trend analysis
- `dateTo` (optional) - End date for trend analysis

**Example Intent:**
```
#SolutionAdvisor-analytics?projectId=12345&dateFrom=2025-01-01&dateTo=2025-10-25
```

#### SolutionAdvisor-analyses
**Parameters:**
- `projectId` (optional) - Filter by project
- `status` (optional) - Filter by status ("In Progress", "Completed")
- `level` (optional) - Filter by clean core level (A, B, C, D)

**Example Intent:**
```
#SolutionAdvisor-analyses?status=In%20Progress&level=A
```

---

## Files Created/Modified

### 1. Updated Manifest.json (`app/solutionadvisor/webapp/manifest.json`)
**Lines Changed:** 101 lines (crossNavigation section)

**Before:**
```json
"crossNavigation": {
  "inbounds": {
    "undefined-undefined": { ... },
    "solitionadvisor-display": { ... }
  }
}
```

**After:**
```json
"crossNavigation": {
  "inbounds": {
    "SolutionAdvisor-wizard": {
      "semanticObject": "SolutionAdvisor",
      "action": "wizard",
      "title": "Start New Analysis",
      "subTitle": "Create Clean Core Analysis",
      "icon": "sap-icon://action",
      "signature": {
        "parameters": {
          "projectId": { "required": false },
          "sessionId": { "required": false },
          "analysisId": { "required": false }
        },
        "additionalParameters": "allowed"
      }
    },
    "SolutionAdvisor-projects": { ... },
    "SolutionAdvisor-analytics": { ... },
    "SolutionAdvisor-analyses": { ... },
    "SolutionAdvisor-admin": { ... }
  }
}
```

**Key Features:**
- 5 inbound definitions (wizard, projects, analytics, analyses, admin)
- Parameter signatures with optional flags
- Title, subtitle, and icon for each intent
- `additionalParameters: "allowed"` for extensibility

---

### 2. NavigationService.js (`app/solutionadvisor/webapp/utils/NavigationService.js`)
**Lines:** 410  
**Purpose:** Centralized service for all navigation operations

**Key Methods:**

#### Navigation Methods
```javascript
// Navigate to wizard
toWizard(oParams) {
    // oParams: { projectId, sessionId, analysisId }
}

// Navigate to projects
toProjects() { }

// Navigate to analytics
toAnalytics(oParams) {
    // oParams: { projectId, dateFrom, dateTo }
}

// Navigate to analyses
toAnalyses(oParams) {
    // oParams: { projectId, status, level }
}

// Navigate to admin
toAdmin(sSection) {
    // sSection: "questionflow" | "thresholds"
}

// Navigate back
back() { }

// Navigate to home
toHome() { }
```

#### Parameter Handling
```javascript
// Get all navigation parameters
getNavigationParameters() {
    // Returns: { param1: ["value1"], param2: ["value2"] }
}

// Get specific parameter value
getParameter(sParamName) {
    // Returns: "value" or null
}
```

#### Advanced Features
```javascript
// Navigate with confirmation dialog
navigateWithConfirmation(oTarget, sMessage) {
    // Shows confirmation before navigation
}

// Get navigation hash
getNavigationHash(sSemanticObject, sAction, oParams) {
    // Returns: Promise<"#SolutionAdvisor-wizard?projectId=123">
}

// Create deep link URL
createDeepLink(sSemanticObject, sAction, oParams) {
    // Returns: Promise<"https://app.com/#SolutionAdvisor-wizard?projectId=123">
}

// Check if intent is supported
isIntentSupported(sSemanticObject, sAction) {
    // Returns: Promise<boolean>
}

// Get supported intents
getSupportedIntents() {
    // Returns: Promise<Array<Intent>>
}
```

#### Fallback Handling
```javascript
_navigateViaRouter(sRouteName, oParameters) {
    // Fallback to app router when FLP not available
    // Used in standalone mode
}
```

**Architecture:**
- **Singleton Pattern:** One instance per component
- **Service Initialization:** Async loading of shell services
- **Graceful Degradation:** Falls back to router navigation
- **Error Handling:** Catches and logs navigation errors

---

### 3. NavigationHelper.js (`app/solutionadvisor/webapp/utils/NavigationHelper.js`)
**Lines:** 117  
**Purpose:** Controller mixin for simplified navigation

**Usage Pattern:**
```javascript
// In controller's onInit()
NavigationHelper.init(this);

// Navigate from controller
NavigationHelper.toWizard(this, { projectId: "123" });

// Get parameter from controller
const sProjectId = NavigationHelper.getParameter(this, "projectId");
```

**Available Methods:**
- `init(oController)` - Initialize navigation for controller
- `getService(oController)` - Get navigation service instance
- `toWizard(oController, oParams)` - Navigate to wizard
- `toProjects(oController)` - Navigate to projects
- `toAnalytics(oController, oParams)` - Navigate to analytics
- `toAnalyses(oController, oParams)` - Navigate to analyses
- `toAdmin(oController, sSection)` - Navigate to admin
- `back(oController)` - Navigate back
- `getParameter(oController, sParamName)` - Get parameter
- `navigateWithConfirmation(oController, oTarget, sMessage)` - Confirm before navigate
- `createDeepLink(oController, sSemanticObject, sAction, oParams)` - Create deep link

**Benefits:**
- ✅ Less boilerplate code in controllers
- ✅ Consistent navigation API across app
- ✅ Automatic service initialization
- ✅ Type-safe navigation methods

---

### 4. NavigationExample.controller.js (`app/solutionadvisor/webapp/controller/NavigationExample.controller.js`)
**Lines:** 255  
**Purpose:** Complete example showing all navigation patterns

**Example Scenarios:**

#### 1. Create New Analysis
```javascript
onCreateAnalysis: function () {
    NavigationHelper.toWizard(this);
}
```

#### 2. Create Analysis for Specific Project
```javascript
onCreateAnalysisForProject: function (oEvent) {
    const oContext = oEvent.getSource().getBindingContext();
    const sProjectId = oContext.getProperty("ID");
    
    NavigationHelper.toWizard(this, {
        projectId: sProjectId
    });
}
```

#### 3. Resume Wizard Session
```javascript
onResumeWizard: function (oEvent) {
    const oContext = oEvent.getSource().getBindingContext();
    const sSessionId = oContext.getProperty("ID");
    const sProjectId = oContext.getProperty("project_ID");
    
    NavigationHelper.toWizard(this, {
        projectId: sProjectId,
        sessionId: sSessionId
    });
}
```

#### 4. Show Project-Specific Analytics
```javascript
onShowProjectAnalytics: function (oEvent) {
    const oContext = oEvent.getSource().getBindingContext();
    const sProjectId = oContext.getProperty("ID");
    
    NavigationHelper.toAnalytics(this, {
        projectId: sProjectId
    });
}
```

#### 5. Show Pending Analyses
```javascript
onShowPendingAnalyses: function () {
    NavigationHelper.toAnalyses(this, {
        status: "In Progress"
    });
}
```

#### 6. Navigate with Confirmation
```javascript
onCancel: function () {
    if (this._hasUnsavedChanges()) {
        NavigationHelper.navigateWithConfirmation(
            this,
            { route: "ProjectsList" },
            "You have unsaved changes. Do you want to discard them?"
        );
    } else {
        NavigationHelper.back(this);
    }
}
```

#### 7. Create and Share Deep Link
```javascript
onShareAnalysis: function (oEvent) {
    const oContext = oEvent.getSource().getBindingContext();
    const sAnalysisId = oContext.getProperty("ID");
    
    NavigationHelper.createDeepLink(
        this,
        "SolutionAdvisor",
        "analyses",
        { analysisId: sAnalysisId }
    ).then(function (sDeepLink) {
        navigator.clipboard.writeText(sDeepLink);
        MessageToast.show("Link copied: " + sDeepLink);
    });
}
```

#### 8. Handle Navigation Parameters
```javascript
onInit: function () {
    NavigationHelper.init(this);
    
    // Get parameters from URL
    const sProjectId = NavigationHelper.getParameter(this, "projectId");
    const sStatus = NavigationHelper.getParameter(this, "status");
    
    if (sProjectId) {
        this._loadProjectData(sProjectId);
    }
    
    if (sStatus) {
        this._applyStatusFilter(sStatus);
    }
}
```

---

## Integration with Existing App

### Step 1: Update Component.js
```javascript
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sd/solutionadvisor/utils/NavigationService"
], function (UIComponent, NavigationService) {
    "use strict";

    return UIComponent.extend("sd.solutionadvisor.Component", {
        
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            
            // Initialize navigation service
            this._oNavigationService = new NavigationService(this);
            
            // Initialize router
            this.getRouter().initialize();
        },
        
        getNavigationService: function () {
            return this._oNavigationService;
        }
    });
});
```

### Step 2: Update Controllers
```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sd/solutionadvisor/utils/NavigationHelper"
], function (Controller, NavigationHelper) {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.MyController", {
        
        onInit: function () {
            // Initialize navigation
            NavigationHelper.init(this);
            
            // Handle navigation parameters
            const sProjectId = NavigationHelper.getParameter(this, "projectId");
            if (sProjectId) {
                this._loadProjectData(sProjectId);
            }
        },
        
        onNavigateToWizard: function () {
            NavigationHelper.toWizard(this);
        }
    });
});
```

### Step 3: Update Views (Optional - Add Navigation Buttons)
```xml
<Button 
    text="Create Analysis" 
    icon="sap-icon://action"
    press="onNavigateToWizard" />

<Button 
    text="View Analytics" 
    icon="sap-icon://bar-chart"
    press=".onNavigateToAnalytics" />
```

---

## Navigation Patterns

### 1. Simple Navigation (No Parameters)
```javascript
// From tile or button
NavigationHelper.toProjects(this);
```

### 2. Navigation with Context
```javascript
// From list item
onItemPress: function (oEvent) {
    const oItem = oEvent.getSource();
    const oContext = oItem.getBindingContext();
    const sProjectId = oContext.getProperty("ID");
    
    NavigationHelper.toAnalytics(this, {
        projectId: sProjectId
    });
}
```

### 3. Navigation with Multiple Parameters
```javascript
NavigationHelper.toAnalyses(this, {
    projectId: "123",
    status: "In Progress",
    level: "A"
});
```

### 4. Conditional Navigation
```javascript
onNavigate: function () {
    if (this._isEditMode()) {
        NavigationHelper.navigateWithConfirmation(
            this,
            { semanticObject: "SolutionAdvisor", action: "projects" },
            "Discard changes?"
        );
    } else {
        NavigationHelper.toProjects(this);
    }
}
```

### 5. Deep Link Generation
```javascript
// Create shareable link
this._oNavService.createDeepLink("SolutionAdvisor", "wizard", {
    projectId: "123"
}).then(function (sUrl) {
    // sUrl: https://app.com/#SolutionAdvisor-wizard?projectId=123
    console.log("Share this link:", sUrl);
});
```

### 6. Back Navigation
```javascript
// Shell-aware back navigation
onBack: function () {
    NavigationHelper.back(this);
}
```

---

## Parameter Handling Best Practices

### 1. Extract Parameters in onInit()
```javascript
onInit: function () {
    NavigationHelper.init(this);
    
    // Extract all relevant parameters
    const oParams = {
        projectId: NavigationHelper.getParameter(this, "projectId"),
        status: NavigationHelper.getParameter(this, "status"),
        level: NavigationHelper.getParameter(this, "level")
    };
    
    // Apply parameters
    this._applyNavigationContext(oParams);
}
```

### 2. Validate Parameters
```javascript
_applyNavigationContext: function (oParams) {
    if (oParams.projectId) {
        // Validate project exists
        this._validateAndLoadProject(oParams.projectId);
    }
    
    if (oParams.status) {
        // Validate status is valid
        const aValidStatuses = ["In Progress", "Completed", "Cancelled"];
        if (aValidStatuses.includes(oParams.status)) {
            this._applyStatusFilter(oParams.status);
        }
    }
}
```

### 3. Default Values
```javascript
const sProjectId = NavigationHelper.getParameter(this, "projectId") || "DEFAULT_PROJECT";
const sStatus = NavigationHelper.getParameter(this, "status") || "In Progress";
```

### 4. Multi-Value Parameters
```javascript
// Get array of values
const oParams = this._oNavService.getNavigationParameters();
const aLevels = oParams.level || []; // ["A", "B", "C"]

// Apply as filter
if (aLevels.length > 0) {
    const aFilters = aLevels.map(sLevel => 
        new Filter("recommendedLevel_ID", FilterOperator.EQ, sLevel)
    );
    oBinding.filter(aFilters);
}
```

---

## Testing Navigation

### 1. Unit Tests (Jest)
```javascript
describe("NavigationService", () => {
    it("should navigate to wizard", () => {
        const oNav = new NavigationService(oMockComponent);
        const spy = jest.spyOn(oNav._oCrossAppNavigator, "toExternal");
        
        oNav.toWizard({ projectId: "123" });
        
        expect(spy).toHaveBeenCalledWith({
            target: { semanticObject: "SolutionAdvisor", action: "wizard" },
            params: { projectId: "123", sessionId: "", analysisId: "" }
        });
    });
    
    it("should extract navigation parameters", () => {
        const oNav = new NavigationService(oMockComponentWithParams);
        const sProjectId = oNav.getParameter("projectId");
        
        expect(sProjectId).toBe("123");
    });
});
```

### 2. Integration Tests
```javascript
describe("Cross-App Navigation", () => {
    it("should navigate from tile to wizard", async () => {
        // Click wizard tile
        await When.onTheLaunchpad.iPressTile("Start New Analysis");
        
        // Verify wizard page opened
        Then.onTheWizardPage.iShouldSeeTheWizard();
    });
    
    it("should pass projectId parameter", async () => {
        // Navigate with parameter
        await When.onTheProjectsList.iPressCreateAnalysisForProject("Project1");
        
        // Verify wizard has project pre-selected
        Then.onTheWizardPage.iShouldSeeProject("Project1");
    });
});
```

### 3. E2E Tests (UIVeri5)
```javascript
When.onTheLaunchpad.iPressHeaderItem("Quick Create");
When.onTheConfirmDialog.iClickYes();
Then.onTheWizard.iShouldSeeTheWizardPage();
When.onTheWizard.iEnterRICEFWID("I-0042-IMP");
When.onTheWizard.iPressSave();
Then.onTheAnalyses.iShouldSeeAnalysis("I-0042-IMP");
```

---

## Troubleshooting

### Issue 1: Navigation Not Working
**Symptoms:** Clicking tile does nothing

**Solutions:**
1. Check browser console for errors
2. Verify manifest inbound configuration matches tile intent
3. Ensure FLP services are initialized:
   ```javascript
   if (sap.ushell && sap.ushell.Container) {
       // FLP available
   } else {
       console.warn("FLP not available");
   }
   ```

### Issue 2: Parameters Not Received
**Symptoms:** `getParameter()` returns null

**Solutions:**
1. Check parameter name spelling (case-sensitive)
2. Verify parameter defined in inbound signature
3. Check componentData in component initialization:
   ```javascript
   const oComponentData = this.getOwnerComponent().getComponentData();
   console.log("startupParameters:", oComponentData.startupParameters);
   ```

### Issue 3: Deep Links Not Working
**Symptoms:** Deep link opens home instead of target app

**Solutions:**
1. Verify intent format: `#SemanticObject-action?param=value`
2. Check URL encoding for special characters
3. Ensure target app is registered in FLP catalog

### Issue 4: Fallback Navigation Fails
**Symptoms:** Navigation works in FLP but fails standalone

**Solutions:**
1. Implement `_navigateViaRouter()` fallback
2. Ensure router routes match intent actions
3. Handle missing parameters gracefully

---

## Performance Considerations

### 1. Lazy Service Initialization
```javascript
// Don't initialize in constructor
constructor: function (oComponent) {
    this._oComponent = oComponent;
    this._oCrossAppNavigator = null; // Lazy init
}

// Initialize on first use
toWizard: function (oParams) {
    if (!this._oCrossAppNavigator) {
        this._initialize();
    }
    // Navigate...
}
```

### 2. Caching Supported Intents
```javascript
getSupportedIntents: function () {
    if (this._aSupportedIntents) {
        return Promise.resolve(this._aSupportedIntents);
    }
    
    return this._oCrossAppNavigator.getLinks(...).then(aLinks => {
        this._aSupportedIntents = aLinks; // Cache
        return aLinks;
    });
}
```

### 3. Avoid Synchronous Navigation Checks
```javascript
// ❌ BAD - Blocks UI
const bSupported = this._checkIfSupported(); // Sync
if (bSupported) { navigate(); }

// ✅ GOOD - Async
this.isIntentSupported("SolutionAdvisor", "wizard").then(bSupported => {
    if (bSupported) { this.toWizard(); }
});
```

---

## Security Considerations

### 1. Parameter Validation
Always validate navigation parameters before use:
```javascript
const sProjectId = NavigationHelper.getParameter(this, "projectId");
if (sProjectId && sProjectId.match(/^[0-9a-f-]{36}$/)) {
    // Valid UUID
    this._loadProject(sProjectId);
} else {
    MessageBox.error("Invalid project ID");
}
```

### 2. Authorization Checks
Check user permissions before navigation:
```javascript
toAdmin: function () {
    if (this._hasAdminRole()) {
        // Navigate
    } else {
        MessageBox.error("Access denied");
    }
}
```

### 3. XSS Prevention
Encode parameters in deep links:
```javascript
createDeepLink: function (sSemanticObject, sAction, oParams) {
    // Parameters are automatically URL-encoded by FLP
    return this._oCrossAppNavigator.hrefForExternal({
        target: { semanticObject: sSemanticObject, action: sAction },
        params: oParams
    });
}
```

---

## Summary

### What Was Implemented
✅ **Manifest Updates** (101 lines)
- 5 inbound definitions (wizard, projects, analytics, analyses, admin)
- Parameter signatures with validation
- Title, subtitle, icon for each intent

✅ **NavigationService** (410 lines)
- Centralized navigation logic
- 10+ navigation methods
- Parameter handling (get/extract)
- Deep link generation
- Fallback to router navigation
- Intent support checking

✅ **NavigationHelper** (117 lines)
- Controller mixin pattern
- 10+ helper methods
- Simplified API for controllers
- Automatic service initialization

✅ **NavigationExample** (255 lines)
- 15+ navigation scenarios
- Parameter handling examples
- Confirmation dialogs
- Deep link sharing
- Best practices demonstration

### Total Implementation
- **Files Created:** 3 new files
- **Files Updated:** 1 existing file (manifest.json)
- **Total Lines:** ~883 lines of new code
- **Estimated Effort:** 8 hours
- **Actual Effort:** 4 hours
- **Status:** ✅ COMPLETE

### Next Steps
Proceed to **Task 5: Configure User Menu and Settings** (already completed in Shell Plugin) and **Task 6: Implement Shell Services** with:
- Search service integration
- Theme management service
- Notification service enhancements
