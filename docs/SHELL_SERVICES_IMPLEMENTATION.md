# Shell Services Implementation Guide

## Overview

This document describes the **Shell Services** implementation for the SAP Clean Core Solution Advisor application. These services provide enterprise-grade capabilities that integrate with the SAP Fiori Launchpad shell, including notifications, global search, and theme management.

**Implementation Date**: Post Shell/Launchpad infrastructure completion (Task 6 of 6)  
**Location**: `/app/solutionadvisor/webapp/services/`  
**Integration**: Component.js with model registration

---

## Architecture

### Service Pattern

All three shell services follow a consistent singleton pattern:

```javascript
// Service instantiation in Component.js
_initShellServices() {
    this._oNotificationService = new NotificationService(this);
    this.setModel(this._oNotificationService.getModel(), "notifications");
    
    this._oSearchService = new SearchService(this);
    this.setModel(this._oSearchService.getModel(), "search");
    
    this._oThemeService = new ThemeService(this);
    this.setModel(this._oThemeService.getModel(), "theme");
}

// Access from controllers
const oNotificationService = this.getOwnerComponent().getNotificationService();
const oSearchService = this.getOwnerComponent().getSearchService();
const oThemeService = this.getOwnerComponent().getThemeService();
```

### Shell Integration Points

| Service | Shell API | Purpose |
|---------|-----------|---------|
| **NotificationService** | `sap.ushell.Container.getServiceAsync("Notifications")` | Display alerts, action reminders, system messages |
| **SearchService** | `sap.ushell.Container.getServiceAsync("Search")` | Global search across all entities, search suggestions |
| **ThemeService** | `sap.ui.getCore().applyTheme()` + Shell Personalization | Theme switching, dark mode, content density, customization |

---

## 1. NotificationService

**File**: `services/NotificationService.js` (435 lines)  
**Purpose**: Manage application notifications with shell integration

### Key Features

- **Shell Integration**: Uses `sap.ushell.Container.getServiceAsync("Notifications")` for native Fiori notifications
- **Notification Model**: JSONModel with notifications array, unread count, priority counts
- **Mock Notifications**: 3 sample notifications for testing (AnalysisComplete, WizardSaved, ConfigUpdate)
- **Action Handlers**: View, resume, export actions with navigation integration
- **Subscriber Pattern**: Real-time updates to notification popover/panel
- **Priority System**: High, Medium, Low priorities with color coding

### Model Structure

```json
{
  "notifications": [
    {
      "id": "...",
      "title": "Analysis Complete",
      "message": "...",
      "timestamp": "2025-01-15T10:30:00Z",
      "isRead": false,
      "priority": "high",
      "type": "analysis",
      "actions": ["view", "export"]
    }
  ],
  "unreadCount": 3,
  "priorityCounts": { "high": 1, "medium": 1, "low": 1 }
}
```

### Core Methods

#### Load Notifications
```javascript
loadNotifications()
  .then(() => {
    const iUnread = oNotificationService.getUnreadCount();
  });
```

#### Create New Notification
```javascript
oNotificationService.createNotification({
  title: "Wizard Session Saved",
  message: "Your analysis has been saved and can be resumed later",
  priority: "medium",
  type: "wizard",
  actions: ["resume", "view"],
  data: { sessionId: "SESSION123" }
});
```

#### Mark as Read
```javascript
oNotificationService.markAsRead("notification-id");
```

#### Execute Action
```javascript
oNotificationService.executeNotificationAction(oNotification, "view");
// Navigates to analysis details page with parameter passing
```

#### Subscribe to Updates
```javascript
const fnCallback = (sType, oData) => {
  if (sType === "new") {
    // Handle new notification
  } else if (sType === "read") {
    // Update UI
  }
};
oNotificationService.subscribe(fnCallback);
```

### Usage in Controllers

```javascript
// In controller onInit
const oNotificationService = this.getOwnerComponent().getNotificationService();
const oNotificationModel = oNotificationService.getModel();
this.getView().setModel(oNotificationModel, "notifications");

// Display notification count in header
const iUnread = oNotificationModel.getProperty("/unreadCount");

// Bind notification list in popover
<List items="{notifications>/notifications}">
  <StandardListItem 
    title="{notifications>title}" 
    description="{notifications>message}"
    info="{notifications>priority}" />
</List>
```

---

## 2. SearchService

**File**: `services/SearchService.js` (348 lines)  
**Purpose**: Global search across all application entities with relevance ranking

### Key Features

- **Multi-Entity Search**: Projects, Analyses, QuestionFlow, RealWorldExample
- **Multi-Field Search**: OR filters across multiple fields per entity
- **Relevance Ranking**: Exact match (100), starts with (50), contains (25), description (10)
- **Search Suggestions**: Auto-complete with max results limit
- **Shell Integration**: Search provider registration for global shell search
- **Navigation Integration**: Direct navigation to search results by entity type

### Search Configuration

```javascript
_oSearchConfig = {
  Projects: {
    entity: "/ProjectConfiguration",
    searchFields: ["projectName", "clientName", "description"],
    resultFields: ["projectName", "clientName", "createdAt"],
    icon: "sap-icon://project-definition-triangle",
    type: "Project"
  },
  Analyses: {
    entity: "/CleanCoreAnalysis",
    searchFields: ["ricefwId", "objectName", "description"],
    resultFields: ["ricefwId", "objectName", "recommendedLevel"],
    icon: "sap-icon://documents",
    type: "Analysis"
  }
  // ... QuestionFlow, RealWorldExample
}
```

### Core Methods

#### Global Search
```javascript
oSearchService.search("SAP Integration")
  .then((aResults) => {
    // aResults = [
    //   { id: "...", title: "SAP Integration Project", type: "Project", relevance: 100 },
    //   { id: "...", title: "Integration Analysis", type: "Analysis", relevance: 50 }
    // ]
  });
```

#### Search Specific Entity
```javascript
oSearchService.searchProjects("Customer Portal")
  .then((aProjects) => {
    // Filtered project results
  });

oSearchService.searchAnalyses("Interface")
  .then((aAnalyses) => {
    // Filtered analysis results
  });
```

#### Search by RICEFW ID
```javascript
oSearchService.searchByRicefwId("I-0042-IMP")
  .then((aResults) => {
    // All analyses with matching RICEFW ID
  });
```

#### Get Suggestions
```javascript
oSearchService.getSuggestions("SAP", 5)
  .then((aSuggestions) => {
    // Top 5 most relevant results across all entities
  });
```

#### Relevance Ranking Algorithm

```javascript
_rankResults(aResults, sQuery) {
  return aResults.map(result => {
    let iRelevance = 0;
    const sLowerQuery = sQuery.toLowerCase();
    const sLowerTitle = result.title.toLowerCase();
    
    if (sLowerTitle === sLowerQuery) {
      iRelevance += 100; // Exact match
    } else if (sLowerTitle.startsWith(sLowerQuery)) {
      iRelevance += 50; // Starts with
    } else if (sLowerTitle.includes(sLowerQuery)) {
      iRelevance += 25; // Contains
    }
    
    if (result.description && result.description.toLowerCase().includes(sLowerQuery)) {
      iRelevance += 10; // Description match
    }
    
    return { ...result, relevance: iRelevance };
  }).sort((a, b) => b.relevance - a.relevance);
}
```

### Usage in Controllers

```javascript
// Global search with navigation
onSearch: function(oEvent) {
  const sQuery = oEvent.getParameter("query");
  const oSearchService = this.getOwnerComponent().getSearchService();
  
  oSearchService.search(sQuery).then((aResults) => {
    if (aResults.length > 0) {
      // Navigate to first result
      const oResult = aResults[0];
      oSearchService.navigateToResult(oResult);
    } else {
      MessageBox.information("No results found for: " + sQuery);
    }
  });
},

// Search suggestions for auto-complete
onSuggest: function(oEvent) {
  const sValue = oEvent.getParameter("suggestValue");
  const oSearchService = this.getOwnerComponent().getSearchService();
  
  oSearchService.getSuggestions(sValue, 5).then((aSuggestions) => {
    // Update suggestion items in SearchField
    const oSearchField = oEvent.getSource();
    oSearchField.destroySuggestionItems();
    aSuggestions.forEach(suggestion => {
      oSearchField.addSuggestionItem(
        new SuggestionItem({
          text: suggestion.title,
          icon: suggestion.icon,
          description: suggestion.type
        })
      );
    });
  });
}
```

---

## 3. ThemeService

**File**: `services/ThemeService.js` (366 lines)  
**Purpose**: Application theming and personalization with shell integration

### Key Features

- **Theme Management**: 6 SAP themes (Fiori 3, Belize, High Contrast)
- **Dark Mode Toggle**: Quick switch between light/dark themes
- **Content Density**: Cozy (mobile) vs Compact (desktop) modes
- **Personalization**: User preferences saved via Shell Personalization Service
- **Customization Options**: Animations, font size, shadows
- **Accessibility**: High contrast themes for WCAG compliance

### Theme Catalog

```javascript
availableThemes: [
  {
    id: "sap_fiori_3",
    name: "SAP Fiori 3",
    description: "Modern, clean interface",
    category: "Light"
  },
  {
    id: "sap_fiori_3_dark",
    name: "SAP Fiori 3 Dark",
    description: "Dark theme for low-light conditions",
    category: "Dark"
  },
  {
    id: "sap_hcb",
    name: "High Contrast Black",
    description: "Accessibility theme (black background)",
    category: "High Contrast"
  }
  // ... sap_belize, sap_belize_plus, sap_hcw
]
```

### Model Structure

```json
{
  "currentTheme": "sap_fiori_3",
  "availableThemes": [...],
  "contentDensity": "cozy",
  "customizations": {
    "enableAnimations": true,
    "enableShadows": true,
    "fontSize": "medium",
    "colorScheme": "default"
  }
}
```

### Core Methods

#### Change Theme
```javascript
oThemeService.changeTheme("sap_fiori_3_dark")
  .then(() => {
    MessageToast.show("Theme changed to SAP Fiori 3 Dark");
  });
```

#### Toggle Dark Mode
```javascript
oThemeService.toggleDarkMode();
// Switches between sap_fiori_3 <-> sap_fiori_3_dark
```

#### Set Content Density
```javascript
oThemeService.setContentDensity("compact");
// Applies sapUiSizeCompact CSS class to <body>
```

#### Toggle Content Density
```javascript
oThemeService.toggleContentDensity();
// Switches between cozy <-> compact
```

#### Customize Appearance
```javascript
// Disable animations
oThemeService.setAnimations(false);

// Change font size
oThemeService.setFontSize("large");

// Apply CSS classes:
// - solutionadvisor-no-animations
// - solutionadvisor-font-large
```

#### Reset to Defaults
```javascript
oThemeService.resetToDefaults()
  .then(() => {
    // Theme: sap_fiori_3
    // Density: cozy
    // Animations: enabled
    // Font size: medium
  });
```

#### Get Theme Info
```javascript
const oInfo = oThemeService.getThemeInfo("sap_fiori_3_dark");
// { id: "...", name: "...", description: "...", category: "Dark" }
```

#### Check Theme State
```javascript
const bDark = oThemeService.isDarkMode();
const bHighContrast = oThemeService.isHighContrast();
```

### Usage in Controllers

```javascript
// Theme switcher in settings dialog
onThemeChange: function(oEvent) {
  const sThemeId = oEvent.getParameter("selectedItem").getKey();
  const oThemeService = this.getOwnerComponent().getThemeService();
  
  oThemeService.changeTheme(sThemeId);
},

// Dark mode toggle button
onToggleDarkMode: function() {
  const oThemeService = this.getOwnerComponent().getThemeService();
  oThemeService.toggleDarkMode();
},

// Content density toggle
onToggleDensity: function() {
  const oThemeService = this.getOwnerComponent().getThemeService();
  oThemeService.toggleContentDensity();
},

// Bind theme model to view
const oThemeModel = this.getOwnerComponent().getModel("theme");
this.getView().setModel(oThemeModel, "theme");

// Use in XML view
<Select 
  selectedKey="{theme>/currentTheme}" 
  change="onThemeChange"
  items="{theme>/availableThemes}">
  <core:Item key="{theme>id}" text="{theme>name}" />
</Select>
```

---

## Integration Examples

### User Menu with Theme & Notifications

```javascript
// In Shell Plugin or settings controller
_createUserMenu: function() {
  const oNotificationService = this.getOwnerComponent().getNotificationService();
  const oThemeService = this.getOwnerComponent().getThemeService();
  
  const iUnreadCount = oNotificationService.getUnreadCount();
  const bDarkMode = oThemeService.isDarkMode();
  
  return {
    menuItems: [
      {
        text: "Notifications (" + iUnreadCount + ")",
        icon: "sap-icon://bell",
        press: () => this._openNotifications()
      },
      {
        text: bDarkMode ? "Light Theme" : "Dark Theme",
        icon: "sap-icon://palette",
        press: () => oThemeService.toggleDarkMode()
      },
      {
        text: "Settings",
        icon: "sap-icon://action-settings",
        press: () => this._openSettings()
      }
    ]
  };
}
```

### Global Search in Shell Header

```javascript
// Register search field in shell header
_addSearchToHeader: function() {
  const oSearchService = this.getOwnerComponent().getSearchService();
  
  const oSearchField = new SearchField({
    placeholder: "Search projects, analyses, examples...",
    enableSuggestions: true,
    suggest: (oEvent) => {
      const sValue = oEvent.getParameter("suggestValue");
      oSearchService.getSuggestions(sValue, 5).then((aSuggestions) => {
        // Update suggestions
      });
    },
    search: (oEvent) => {
      const sQuery = oEvent.getParameter("query");
      oSearchService.search(sQuery).then((aResults) => {
        if (aResults.length > 0) {
          oSearchService.navigateToResult(aResults[0]);
        }
      });
    }
  });
  
  // Add to shell header
  sap.ushell.Container.getRenderer("fiori2").addHeaderItem({
    id: "globalSearchField",
    control: oSearchField
  });
}
```

### Notification Badge in Header

```javascript
// Update notification count in real-time
_initNotificationBadge: function() {
  const oNotificationService = this.getOwnerComponent().getNotificationService();
  const oNotificationModel = oNotificationService.getModel();
  
  const oBadge = new Button({
    icon: "sap-icon://bell",
    text: "{notifications>/unreadCount}",
    type: "Transparent",
    press: () => this._openNotificationPopover()
  });
  
  oBadge.setModel(oNotificationModel, "notifications");
  
  // Subscribe to updates
  oNotificationService.subscribe((sType, oData) => {
    if (sType === "new") {
      MessageToast.show("New notification: " + oData.title);
    }
  });
}
```

---

## Testing Recommendations

### NotificationService Tests

```javascript
describe("NotificationService", () => {
  it("should create notification with high priority", () => {
    oNotificationService.createNotification({
      title: "Test",
      priority: "high"
    });
    const aHighPriority = oNotificationService.getNotificationsByPriority("high");
    expect(aHighPriority.length).toBe(1);
  });
  
  it("should update unread count after marking as read", () => {
    const sBefore = oNotificationService.getUnreadCount();
    oNotificationService.markAsRead(sNotificationId);
    const sAfter = oNotificationService.getUnreadCount();
    expect(sAfter).toBe(sBefore - 1);
  });
});
```

### SearchService Tests

```javascript
describe("SearchService", () => {
  it("should rank exact matches highest", () => {
    return oSearchService.search("SAP Integration").then((aResults) => {
      const oFirst = aResults[0];
      expect(oFirst.title).toBe("SAP Integration");
      expect(oFirst.relevance).toBeGreaterThan(90);
    });
  });
  
  it("should search across multiple entities", () => {
    return oSearchService.search("Report").then((aResults) => {
      const aTypes = [...new Set(aResults.map(r => r.type))];
      expect(aTypes.length).toBeGreaterThan(1); // Projects + Analyses
    });
  });
});
```

### ThemeService Tests

```javascript
describe("ThemeService", () => {
  it("should switch to dark mode", () => {
    return oThemeService.changeTheme("sap_fiori_3_dark").then(() => {
      expect(oThemeService.isDarkMode()).toBe(true);
    });
  });
  
  it("should apply content density class", () => {
    oThemeService.setContentDensity("compact");
    expect(document.body.classList.contains("sapUiSizeCompact")).toBe(true);
  });
});
```

---

## Performance Considerations

### Notification Service
- **Polling Interval**: 5 minutes (configurable)
- **Max Notifications**: Limit to 100 recent notifications
- **Batch Loading**: Load all notifications in one OData call

### Search Service
- **Debouncing**: Implement 300ms delay for search suggestions
- **Result Limit**: Max 50 results per entity type
- **Caching**: Cache recent searches for 5 minutes

### Theme Service
- **Lazy Loading**: Only load theme CSS when switched
- **Personalization**: Batch preference saves (max 1 per 30 seconds)

---

## Security Considerations

### Notification Service
- **Tenant Isolation**: Notifications filtered by `req.tenant`
- **Authorization**: Check user permissions before showing action buttons
- **Data Sanitization**: Escape notification content to prevent XSS

### Search Service
- **Query Validation**: Sanitize search queries
- **Result Filtering**: Apply authorization checks to search results
- **Rate Limiting**: Limit search requests per user per minute

### Theme Service
- **Personalization Access**: Validate user identity before saving preferences
- **CSS Injection**: Only allow predefined theme IDs
- **Local Storage**: Validate data before persisting

---

## Deployment Checklist

- [ ] All three services created (`NotificationService.js`, `SearchService.js`, `ThemeService.js`)
- [ ] Component.js updated with service initialization
- [ ] Models registered (`notifications`, `search`, `theme`)
- [ ] Shell services available via `sap.ushell.Container.getServiceAsync()`
- [ ] Controllers use `getOwnerComponent().getNotificationService()` pattern
- [ ] Mock data implemented for offline testing
- [ ] Error handling for shell service unavailability
- [ ] Unit tests created for all services
- [ ] Documentation updated

---

## Related Documentation

- **Shell Plugin Implementation**: `SHELL_PLUGIN_IMPLEMENTATION.md`
- **Launchpad Tiles**: `LAUNCHPAD_TILES_IMPLEMENTATION.md`
- **Cross-App Navigation**: `CROSS_APP_NAVIGATION_GUIDE.md`
- **Technical Specification**: `.github/technical specification/SAP-Clean-Core-CAP-App-Enhanced-Technical-Spec.md`

---

**Status**: ✅ **COMPLETE** - All shell services implemented and integrated  
**Next Steps**: Testing, user acceptance, production deployment
