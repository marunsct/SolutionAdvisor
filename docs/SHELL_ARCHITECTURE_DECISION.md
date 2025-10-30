# Fiori Launchpad Shell - Architecture Decision Document

## Document Information
**Version:** 1.0  
**Date:** October 22, 2025  
**Status:** Proposal for Review  
**Author:** Development Team

## Executive Summary

This document outlines the architectural decisions required for implementing a Fiori Launchpad-style shell for the SAP Clean Core Solution Advisor application. The shell will provide unified session management, language switching, and multi-application navigation capabilities.

---

## 1. Background

### Current State
- Single SAP UI5 application (Solution Advisor)
- No centralized navigation or session management
- Language switching requires browser-level changes
- Direct component loading without shell wrapper

### Desired State
- Fiori Launchpad-style home screen with tiles
- Centralized user session management
- In-app language switcher (7 languages)
- Extensible for future applications
- Professional user experience aligned with SAP Fiori 3.0

---

## 2. Architectural Options

### Option A: Full SAP Fiori Launchpad Integration
**Description:** Deploy application on actual SAP Fiori Launchpad (FLP)

**Pros:**
- ✅ Native SAP solution with full feature set
- ✅ Proven scalability and security
- ✅ Standard user management integration
- ✅ Professional tile management
- ✅ Built-in personalization

**Cons:**
- ❌ Requires SAP Gateway/NetWeaver or Cloud Platform
- ❌ Complex setup and configuration
- ❌ Additional licensing costs
- ❌ Overkill for single-app scenario
- ❌ Steep learning curve

**Recommendation:** Not suitable for standalone CAP application

---

### Option B: Custom Shell with SAP UI5 Components (RECOMMENDED)
**Description:** Build lightweight shell using SAP UI5 ShellBar and ushell-like components

**Pros:**
- ✅ Full control over features and behavior
- ✅ No additional infrastructure required
- ✅ Aligned with CAP application architecture
- ✅ Lightweight and fast
- ✅ Can mimic FLP user experience
- ✅ Easy to extend for future apps

**Cons:**
- ❌ Custom development effort (~16 hours)
- ❌ Need to implement session management
- ❌ Need to implement tile framework
- ❌ Requires maintenance

**Recommendation:** **BEST FIT** for this use case

---

### Option C: Use sap.ushell Libraries Without Full FLP
**Description:** Leverage sap.ushell library components in standalone mode

**Pros:**
- ✅ Reuses SAP components
- ✅ More standard than full custom
- ✅ Good documentation available

**Cons:**
- ❌ Still requires significant custom integration
- ❌ Some features require FLP backend
- ❌ May have dependency issues
- ❌ Not officially supported standalone

**Recommendation:** Not recommended due to complexity

---

## 3. Recommended Architecture (Option B - Custom Shell)

### 3.1 Component Structure

```
app/
├── shell/                          # New shell application
│   ├── Component.js               # Shell component
│   ├── manifest.json              # Shell manifest
│   ├── view/
│   │   ├── Shell.view.xml        # Main shell view
│   │   └── Launchpad.view.xml    # Tile container view
│   ├── controller/
│   │   ├── Shell.controller.js   # Shell logic
│   │   └── Launchpad.controller.js
│   ├── model/
│   │   └── apps.json             # Application catalog
│   └── i18n/                      # Shell-specific i18n
│       ├── i18n.properties
│       └── ...
├── solutionadvisor/               # Existing app (unchanged)
│   └── ...
└── index.html                     # Modified to load shell
```

### 3.2 Technical Components

#### A. Shell Bar (Top Navigation)
```xml
<ShellBar
    title="SAP Clean Core Solution Advisor"
    homeIcon="sap-icon://sap-logo-shape"
    showNavButton="false"
    showCopilot="false"
    showSearch="false"
    showNotifications="false"
    showProductSwitcher="false">
    
    <profile>
        <Avatar initials="{user>/initials}"/>
    </profile>
    
    <menu>
        <Menu>
            <MenuItem text="Settings" icon="sap-icon://action-settings"/>
            <MenuItem text="Language" icon="sap-icon://globe" 
                      press="onLanguageSelect"/>
            <MenuItem text="Help" icon="sap-icon://sys-help"/>
            <MenuItem text="Logout" icon="sap-icon://log"/>
        </Menu>
    </menu>
</ShellBar>
```

#### B. Tile Container (Launchpad Home)
```xml
<TileContainer>
    <GenericTile 
        header="Solution Advisor"
        subheader="Analyze RICEFW Objects"
        press="onNavigateToApp"
        data:appId="solutionadvisor">
        <tileContent>
            <TileContent>
                <ImageContent src="sap-icon://decision"/>
            </TileContent>
        </tileContent>
    </GenericTile>
    
    <!-- Future apps as tiles -->
    <GenericTile 
        header="Table Maintenance"
        subheader="Admin Tools"
        press="onNavigateToApp"
        visible="{= ${user>/role} === 'admin' }"
        data:appId="admin">
        ...
    </GenericTile>
</TileContainer>
```

#### C. App Container (Content Area)
```xml
<NavContainer id="appContainer">
    <!-- Apps loaded dynamically here -->
</NavContainer>
```

### 3.3 Session Management

#### Implementation Approach:
```javascript
// Shell.controller.js
class ShellController {
    onInit() {
        // Initialize session from XSUAA or mock
        this._initializeSession();
        
        // Start activity tracker
        this._startActivityMonitor();
        
        // Load user preferences
        this._loadUserPreferences();
    }
    
    _initializeSession() {
        // Get user from XSUAA
        const userInfo = this._getUserInfo();
        const sessionModel = new JSONModel({
            user: {
                name: userInfo.name,
                email: userInfo.email,
                initials: this._getInitials(userInfo.name),
                role: userInfo.role,
                tenant: userInfo.tenant
            },
            session: {
                startTime: Date.now(),
                lastActivity: Date.now(),
                timeout: 30 * 60 * 1000, // 30 minutes
                language: userInfo.language || 'en'
            }
        });
        this.getView().setModel(sessionModel, "session");
    }
    
    _startActivityMonitor() {
        // Track user activity (mouse, keyboard)
        ['mousedown', 'keydown', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                this._updateLastActivity();
            });
        });
        
        // Check session expiry every minute
        setInterval(() => {
            this._checkSessionExpiry();
        }, 60000);
    }
    
    _checkSessionExpiry() {
        const session = this.getView().getModel("session").getData().session;
        const idle = Date.now() - session.lastActivity;
        const timeout = session.timeout;
        
        if (idle > timeout - 5 * 60 * 1000 && idle < timeout) {
            // Show warning 5 minutes before expiry
            this._showSessionWarning();
        } else if (idle > timeout) {
            // Session expired
            this._handleSessionExpiry();
        }
    }
}
```

### 3.4 Language Switching

#### Implementation:
```javascript
onLanguageSelect() {
    // Show language selection dialog
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'de', name: 'Deutsch' },
        { code: 'ja', name: '日本語' },
        { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' },
        { code: 'zh', name: '中文' },
        { code: 'nl', name: 'Nederlands' }
    ];
    
    // Create selection dialog
    const oDialog = new sap.m.SelectDialog({
        title: "Select Language",
        items: languages.map(lang => new sap.m.StandardListItem({
            title: lang.name,
            type: "Active",
            customData: [new sap.ui.core.CustomData({
                key: "code",
                value: lang.code
            })]
        })),
        confirm: (oEvent) => {
            const selectedItem = oEvent.getParameter("selectedItem");
            const langCode = selectedItem.data("code");
            this._changeLanguage(langCode);
        }
    });
    
    oDialog.open();
}

_changeLanguage(langCode) {
    // Update UI5 configuration
    sap.ui.getCore().getConfiguration().setLanguage(langCode);
    
    // Save preference
    this._saveUserPreference('language', langCode);
    
    // Update session model
    this.getView().getModel("session").setProperty("/session/language", langCode);
    
    // Reload current app to apply language
    window.location.reload();
}
```

### 3.5 App Navigation

#### Routing Strategy:
```javascript
// URL Pattern: #/shell/app/{appId}/{appRoute}
// Example: #/shell/app/solutionadvisor/Projects

// manifest.json (Shell)
{
    "routing": {
        "routes": [
            {
                "name": "launchpad",
                "pattern": "",
                "target": "launchpad"
            },
            {
                "name": "app",
                "pattern": "app/{appId}/{appRoute*}",
                "target": "appContainer"
            }
        ]
    }
}

// Shell.controller.js
onNavigateToApp(oEvent) {
    const tile = oEvent.getSource();
    const appId = tile.data("appId");
    
    // Load app component
    this._loadApp(appId);
    
    // Navigate to app
    this.getRouter().navTo("app", {
        appId: appId,
        appRoute: "" // Default route
    });
}

_loadApp(appId) {
    const appContainer = this.byId("appContainer");
    
    // Check if app already loaded
    if (this._loadedApps[appId]) {
        appContainer.to(this._loadedApps[appId]);
        return;
    }
    
    // Load app component dynamically
    sap.ui.require([`${appId}/Component`], (Component) => {
        const oComponentContainer = new ComponentContainer({
            name: appId,
            height: "100%",
            settings: {
                id: `${appId}-component`
            }
        });
        
        appContainer.addPage(oComponentContainer);
        this._loadedApps[appId] = oComponentContainer;
        appContainer.to(oComponentContainer);
    });
}
```

---

## 4. Implementation Plan

### Phase 1: Shell Foundation (8 hours)
1. Create shell component structure
2. Implement ShellBar with user menu
3. Create launchpad view with tiles
4. Set up basic routing
5. Modify index.html to load shell

### Phase 2: Session Management (4 hours)
6. Implement session initialization
7. Add activity-based session monitoring
8. Create session warning dialog
9. Implement logout functionality
10. Add user preference storage

### Phase 3: Language Switching (2 hours)
11. Create language selection dialog
12. Implement language change logic
13. Test with all 7 languages
14. Add language indicator to shell bar

### Phase 4: Multi-App Support (2 hours)
15. Implement dynamic app loading
16. Create app catalog configuration
17. Add role-based tile visibility
18. Test navigation between apps

**Total Effort:** 16 hours

---

## 5. Data Models

### Shell Session Model
```json
{
    "user": {
        "id": "USER001",
        "name": "John Doe",
        "email": "john.doe@company.com",
        "initials": "JD",
        "role": "SolutionArchitect",
        "tenant": "TENANT001",
        "avatar": ""
    },
    "session": {
        "startTime": 1698000000000,
        "lastActivity": 1698003600000,
        "timeout": 1800000,
        "language": "en",
        "theme": "sap_horizon"
    },
    "preferences": {
        "language": "en",
        "notifications": true,
        "compactMode": false
    }
}
```

### App Catalog Model
```json
{
    "apps": [
        {
            "id": "solutionadvisor",
            "title": "Solution Advisor",
            "subtitle": "Analyze RICEFW Objects",
            "icon": "sap-icon://decision",
            "componentName": "sd.solutionadvisor",
            "roles": ["*"],
            "category": "Analysis"
        },
        {
            "id": "admin",
            "title": "Table Maintenance",
            "subtitle": "Admin Tools",
            "icon": "sap-icon://admin",
            "componentName": "sd.admin",
            "roles": ["TenantAdmin"],
            "category": "Administration"
        }
    ]
}
```

---

## 6. Security Considerations

### Authentication
- Leverage existing XSUAA integration
- No additional auth layer needed in shell
- Pass user context to child apps via model

### Authorization
- Tile visibility based on user roles
- Each app enforces its own @restrict rules
- Shell only controls UI visibility, not data access

### Session Security
- Use secure session storage (sessionStorage, not localStorage)
- Clear sensitive data on logout
- Implement proper CSRF token handling

---

## 7. Performance Considerations

### Lazy Loading
- Load shell immediately
- Load apps on-demand when tile clicked
- Cache loaded apps (don't reload on navigation back)

### Bundle Optimization
- Separate shell bundle from app bundles
- Use async loading for heavy components
- Preload frequently used apps

### Memory Management
- Destroy unused apps after timeout
- Limit number of simultaneously loaded apps
- Clean up event listeners on app destroy

---

## 8. Migration Strategy

### Step 1: Parallel Operation
- Deploy shell alongside existing direct app access
- Both URLs work: `/#/shell` and direct `/#/Projects`
- Gradual user migration

### Step 2: Update Entry Point
- Change index.html to load shell by default
- Add redirect from old URLs to shell
- Update bookmarks and documentation

### Step 3: Remove Direct Access (Optional)
- Enforce shell-only access
- Update routing to require shell context
- Complete migration

---

## 9. Testing Strategy

### Unit Tests
- Shell controller logic
- Session management functions
- Language switching
- App loading mechanism

### Integration Tests
- Shell ↔ App communication
- Session persistence
- Multi-app navigation
- Role-based visibility

### E2E Tests
- Complete user journeys
- Login → Navigate → Switch Language → Logout
- Session timeout scenarios
- Multi-window behavior

---

## 10. Open Questions & Decisions Needed

### Q1: Backend Session Management
**Question:** Should session management be purely client-side or integrate with backend?

**Options:**
- A) Client-side only (timeout via JS)
- B) Integrate with XSUAA session (recommended)
- C) Custom backend session service

**Recommendation:** Option B - Leverage XSUAA

---

### Q2: User Preferences Storage
**Question:** Where to persist user preferences (language, theme, etc.)?

**Options:**
- A) Browser localStorage (simple, client-only)
- B) Backend user service (persistent across devices)
- C) Hybrid (cache in localStorage, sync with backend)

**Recommendation:** Option A for MVP, Option C for production

---

### Q3: Multi-Tab Behavior
**Question:** How to handle multiple browser tabs?

**Options:**
- A) Independent sessions per tab
- B) Shared session with cross-tab communication
- C) Single tab enforcement

**Recommendation:** Option A (simpler), Option B for better UX

---

### Q4: Tile Personalization
**Question:** Should users be able to reorder/hide tiles?

**Options:**
- A) Fixed tile layout (MVP)
- B) User-customizable layout

**Recommendation:** Option A for initial release

---

## 11. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Complexity underestimated | High | Medium | Add 20% buffer, phased delivery |
| XSUAA integration issues | High | Low | Test early, have fallback auth |
| Performance degradation | Medium | Low | Load testing, lazy loading |
| Browser compatibility | Medium | Low | Test on IE11, Chrome, Edge, Safari |
| User adoption resistance | Low | Medium | Training, gradual rollout |

---

## 12. Success Criteria

### Must Have (MVP)
- ✅ Shell loads and displays Solution Advisor tile
- ✅ User can navigate to Solution Advisor app
- ✅ Language can be switched (all 7 languages)
- ✅ Session timeout warnings work
- ✅ Logout functionality works

### Should Have
- ✅ Activity-based session renewal
- ✅ User preferences persist
- ✅ Multiple apps supported
- ✅ Role-based tile visibility

### Nice to Have
- Tile personalization
- Recently used apps
- Quick search
- Notification center

---

## 13. Recommendation

**Proceed with Option B: Custom Shell with SAP UI5 Components**

**Rationale:**
1. Best fit for standalone CAP application
2. Full control over features and timeline
3. No additional infrastructure required
4. Reasonable development effort (16 hours)
5. Extensible for future needs
6. Professional user experience

**Next Steps:**
1. ✅ Review and approve this architecture document
2. Create detailed technical specification
3. Set up development environment
4. Begin Phase 1 implementation
5. Regular progress reviews

---

## 14. Appendix

### A. UI5 Components Used
- `sap.m.ShellBar` - Top navigation
- `sap.m.TileContainer` - Tile layout
- `sap.m.GenericTile` - App tiles
- `sap.m.Avatar` - User profile
- `sap.m.NavContainer` - App switching
- `sap.ui.core.ComponentContainer` - App loading

### B. Reference Documentation
- SAP Fiori Design Guidelines: https://experience.sap.com/fiori-design
- SAP UI5 ShellBar: https://ui5.sap.com/#/api/sap.m.ShellBar
- CAP Multi-Tenancy: https://cap.cloud.sap/docs/guides/multitenancy

### C. Similar Implementations
- SAP Build Work Zone (formerly Launchpad)
- SAP Business Application Studio
- Custom enterprise portals

---

**Document Status:** Ready for Review  
**Approval Required From:** Product Owner, Technical Lead, Security Team  
**Target Decision Date:** October 25, 2025
