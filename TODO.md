# Save Draft Resume Flow - Complete Implementation Guide

**Feature:** Save Draft Resume Flow  
**Status:** 60% Complete (Save/Pause works; Resume needs implementation)  
**Priority:** HIGH  
**Effort:** 0.5–1 day  
**Assignee:** Coding Agent

---

## 📌 Overview

This feature allows users to save their progress in the wizard and resume later from where they left off. The save functionality is complete, but the resume flow is missing.

---

## ✅ What's Already Implemented

### Backend (100% Complete)

1. **Database Schema** (`db/schema.cds`)
   - `WizardSession` entity exists with all required fields:
     - `analysis` (Association to CleanCoreAnalysis)
     - `currentStep`, `totalSteps`, `currentQuestionId`
     - `sessionStatus` (Active, Paused, Completed, Abandoned)
     - `answeredPath` (JSON string of answered questions)
     - `lastActivity`, `expiresAt` (24-hour expiry)
     - `startedBy`, `timeSpentTotal`

2. **Service Layer** (`srv/service.cds` and `srv/service.js`)
   - `WizardSessions` entity exposed via OData
   - `resumeWizard(sessionID)` action exists (returns current question and progress)
   - Sessions automatically set `expiresAt` to 24 hours from `lastActivity`

### Frontend — Save Flow (100% Complete)

1. **Save Draft Button** (`app/solutionadvisor/webapp/view/Wizard.view.xml`)
   - "Save Draft" button visible in footer when `projectID` is set
   - Opens `SaveDraftDialog.fragment.xml` on click

2. **Save Logic** (`app/solutionadvisor/webapp/controller/Wizard.controller.js`)
   - `onSaveDraft()` method opens save dialog
   - `onConfirmSaveDraft()` updates `WizardSessions` via OData:
     - Sets `sessionStatus: "Paused"`
     - Saves `currentStep`, `totalSteps`
     - Saves `timeSpentTotal` (calculated from `_wizardStartTime`)
     - Updates `lastActivity`

### Frontend — Resume Prompt (100% Complete)

1. **Detection** (`app/solutionadvisor/webapp/controller/AnalysesList.controller.js`)
   - `_checkForDraft(analysisId)` queries for paused sessions
   - Automatically triggered when user clicks "In Progress" analysis

2. **Resume Dialog** (`app/solutionadvisor/webapp/controller/AnalysesList.controller.js`)
   - `_showResumeDraftDialog()` displays MessageBox with:
     - "Resume Wizard" button
     - "View Analysis" button
     - Expiry warning if `expiresAt` has passed
   - Shows saved date and progress (X/Y steps completed)

---

## ❌ What Needs to Be Implemented

### Task 1: Add `sessionId` Route Parameter

**File:** `app/solutionadvisor/webapp/manifest.json`

**Location:** Find the Wizard routing configuration

**Current:**
```json
{
  "name": "Wizard",
  "pattern": "wizard/:projectId:",
  "target": "Wizard"
}
```

**Change to:**
```json
{
  "name": "Wizard",
  "pattern": "wizard/:projectId:/:sessionId:",
  "target": "Wizard"
}
```

**Note:** The `:sessionId:` pattern makes it optional (like `:projectId:`).

---

### Task 2: Update Resume Navigation

**File:** `app/solutionadvisor/webapp/controller/AnalysesList.controller.js`

**Location:** Line ~245 (search for `_resumeWizard`)

**Current code:**
```javascript
_resumeWizard(sAnalysisId, oSession) {
    // Navigate to wizard with session ID
    // This would require updating the Wizard route to accept sessionId parameter
    // For now, just navigate to wizard
    this.getOwnerComponent().getRouter().navTo("Wizard");
    MessageToast.show("Resume functionality will be implemented in the wizard");
}
```

**Replace with:**
```javascript
_resumeWizard(sAnalysisId, oSession) {
    // Navigate to wizard with session ID for resume
    this.getOwnerComponent().getRouter().navTo("Wizard", {
        projectId: "resume", // Special flag to indicate resume mode
        sessionId: oSession.ID
    });
}
```

---

### Task 3: Update Route Matched Handler

**File:** `app/solutionadvisor/webapp/controller/Wizard.controller.js`

**Location:** Line ~72 (search for `_onRouteMatched`)

**Current code:**
```javascript
_onRouteMatched(oEvent) {
    const oArgs = oEvent.getParameter("arguments");
    const sProjectId = oArgs.projectId;
    
    if (sProjectId) {
        // Project was pre-selected from project list
        this._autoSelectProject(sProjectId);
    } else {
        // Reset wizard if no project selected
        const oWizardModel = this.getView().getModel("wizardModel");
        oWizardModel.setProperty("/projectID", "");
        oWizardModel.setProperty("/projectName", "");
        oWizardModel.setProperty("/autoSelectedProject", false);
        this.byId("projectStep").setValidated(false);
    }
}
```

**Replace with:**
```javascript
_onRouteMatched(oEvent) {
    const oArgs = oEvent.getParameter("arguments");
    const sProjectId = oArgs.projectId;
    const sSessionId = oArgs.sessionId;
    
    if (sSessionId) {
        // Resume from saved session
        this._resumeSession(sSessionId);
    } else if (sProjectId && sProjectId !== "resume") {
        // Project was pre-selected from project list
        this._autoSelectProject(sProjectId);
    } else {
        // Reset wizard if no project selected
        this._resetWizard();
    }
}
```

---

### Task 4: Add Resume Session Method

**File:** `app/solutionadvisor/webapp/controller/Wizard.controller.js`

**Location:** After `_autoSelectProject` method (around line ~110)

**Add this new method:**

```javascript
/**
 * Resume wizard from saved session
 * @param {string} sSessionId - Session ID to resume
 */
_resumeSession: function(sSessionId) {
    const oModel = this.getView().getModel();
    const oWizardModel = this.getView().getModel("wizardModel");
    
    this.getView().setBusy(true);
    
    // Load session data with expanded analysis
    oModel.read(`/WizardSessions('${sSessionId}')`, {
        urlParameters: {
            "$expand": "analysis"
        },
        success: (oSession) => {
            if (!oSession) {
                MessageBox.error("Session not found or has expired");
                this.getView().setBusy(false);
                this._resetWizard();
                return;
            }
            
            // Store session ID
            this._sessionId = sSessionId;
            this._analysisId = oSession.analysis_ID;
            
            // Parse answered path to restore previous answers
            const answeredPath = JSON.parse(oSession.answeredPath || "[]");
            this._answeredQuestions = answeredPath.reduce((acc, item) => {
                acc[item.questionId] = item;
                return acc;
            }, {});
            
            // Load full analysis data to populate wizard fields
            oModel.read(`/Analyses('${oSession.analysis_ID}')`, {
                urlParameters: {
                    "$expand": "projectConfig"
                },
                success: (oAnalysis) => {
                    // Restore wizard model data
                    oWizardModel.setData({
                        projectID: oAnalysis.projectConfig_ID,
                        projectName: oAnalysis.projectConfig?.projectName || "",
                        ricefwId: oAnalysis.ricefwId,
                        objectType: oAnalysis.objectType,
                        objectName: oAnalysis.objectName,
                        objectDescription: oAnalysis.objectDescription || "",
                        autoSelectedProject: true
                    });
                    
                    // Restore UI input fields
                    this.byId("ricefwIdInput")?.setValue(oAnalysis.ricefwId);
                    this.byId("objectTypeComboBox")?.setSelectedKey(oAnalysis.objectType);
                    this.byId("objectNameInput")?.setValue(oAnalysis.objectName);
                    this.byId("objectDescriptionInput")?.setValue(oAnalysis.objectDescription || "");
                    
                    // Mark completed steps as validated
                    this.byId("projectStep").setValidated(true);
                    this.byId("objectStep").setValidated(true);
                    
                    // Restore wizard to current step
                    const oWizard = this.byId("cleanCoreWizard");
                    const iCurrentStep = oSession.currentStep || 1;
                    
                    // Navigate wizard to the saved step
                    if (iCurrentStep >= 1) {
                        oWizard.setCurrentStep(this.byId("projectStep"));
                    }
                    if (iCurrentStep >= 2) {
                        oWizard.nextStep();
                    }
                    if (iCurrentStep >= 3) {
                        oWizard.nextStep();
                    }
                    
                    // Update session status from Paused to Active
                    oModel.update(`/WizardSessions('${sSessionId}')`, {
                        sessionStatus: "Active",
                        lastActivity: new Date().toISOString()
                    }, {
                        success: () => {
                            this.getView().setBusy(false);
                            MessageToast.show(`Draft resumed successfully from step ${iCurrentStep}`, {
                                duration: 3000
                            });
                        },
                        error: (oError) => {
                            this.getView().setBusy(false);
                            console.error("Failed to update session status:", oError);
                            // Continue anyway, just log the error
                        }
                    });
                },
                error: (oError) => {
                    this.getView().setBusy(false);
                    MessageBox.error("Failed to load analysis data");
                    console.error("Failed to load analysis:", oError);
                    this._resetWizard();
                }
            });
        },
        error: (oError) => {
            this.getView().setBusy(false);
            MessageBox.error("Failed to restore draft session");
            console.error("Failed to load session:", oError);
            this._resetWizard();
        }
    });
}
```

---

### Task 5: Add Reset Wizard Method

**File:** `app/solutionadvisor/webapp/controller/Wizard.controller.js`

**Location:** After `_resumeSession` method

**Add this new method:**

```javascript
/**
 * Reset wizard to initial state
 */
_resetWizard: function() {
    const oWizardModel = this.getView().getModel("wizardModel");
    oWizardModel.setData({
        projectID: "",
        projectName: "",
        ricefwId: "",
        objectType: "",
        objectName: "",
        objectDescription: "",
        autoSelectedProject: false
    });
    
    this.byId("projectStep").setValidated(false);
    this.byId("objectStep").setValidated(false);
    
    const oWizard = this.byId("cleanCoreWizard");
    oWizard.discardProgress(this.byId("projectStep"));
    
    this._sessionId = null;
    this._analysisId = null;
    this._answeredQuestions = {};
}
```

---

### Task 6 (Optional): Add Draft Name Support

**File:** `db/schema.cds`

**Location:** Find `WizardSession` entity (line ~151)

**Add this field after `timeSpentTotal`:**

```cds
draftName               : String(200); // Optional user-friendly name for saved draft
```

**Then update save logic:**

**File:** `app/solutionadvisor/webapp/controller/Wizard.controller.js`

**Location:** `_updateDraftSession` method

**Add `draftName` to the session data:**

```javascript
_updateDraftSession(sDraftName) {
    const oDraftModel = this.getView().getModel("draftModel");
    const oModel = this.getView().getModel();
    
    // Prepare wizard session data
    const oSessionData = {
        sessionStatus: "Paused",
        currentStep: oDraftModel.getProperty("/currentStep"),
        totalSteps: oDraftModel.getProperty("/totalSteps"),
        timeSpentTotal: oDraftModel.getProperty("/timeSpent") * 60, // Convert to seconds
        lastActivity: new Date().toISOString(),
        draftName: sDraftName || `Draft - ${new Date().toLocaleDateString()}` // Add this line
    };
    
    // ... rest of the method
}
```

---

## ✅ Acceptance Criteria

Test all of these scenarios:

- [ ] Wizard route accepts optional `sessionId` parameter
- [ ] Clicking "Resume Wizard" in Analyses list navigates to Wizard with sessionId in URL
- [ ] Loading indicator shows while restoring session
- [ ] All wizard fields are restored (RICEFW ID, object type, name, description)
- [ ] Project is auto-selected and validated
- [ ] Wizard navigates to the correct step (1, 2, or 3) based on `currentStep`
- [ ] Previous steps (1 and 2) show as validated/completed
- [ ] Session status changes from "Paused" to "Active" in database
- [ ] Success message displays "Draft resumed successfully from step X"
- [ ] Error handling works for:
  - Session not found
  - Session expired
  - Missing analysis data
  - Missing project data
- [ ] User can continue wizard from resumed step
- [ ] User can save draft again after resuming
- [ ] Optional: Draft name is saved and displayed in resume dialog

---

## 🧪 Testing Instructions

### Test Case 1: Basic Resume Flow

1. Start new wizard, select a project
2. Fill in RICEFW ID: `I-0001-TST`, Object Type: `Interfaces`, Object Name: `Test Interface`
3. Click "Next" to go to step 2
4. Click "Save Draft", enter name "My Test Draft"
5. Navigate to Projects > Analyses list
6. Click on the "In Progress" analysis
7. **Expected:** Dialog shows "A draft was saved on [date] (2/3 steps completed)"
8. Click "Resume Wizard"
9. **Expected:**
   - Wizard opens at step 2 (Object Information)
   - Step 1 is validated (green checkmark)
   - All fields are filled: RICEFW ID, Object Type, Object Name
   - Can click "Next" to go to step 3
   - Can click "Previous" to go back to step 1

### Test Case 2: Expired Session

1. Manually update a session in DB: set `expiresAt` to yesterday
2. Try to resume that session
3. **Expected:** Warning message in dialog "This draft has expired"
4. Resume anyway
5. **Expected:** Should still work (warn but allow)

### Test Case 3: Missing Data

1. Create a session but delete its associated analysis
2. Try to resume
3. **Expected:** Error "Failed to load analysis data", wizard resets to initial state

### Test Case 4: Re-save After Resume

1. Resume a draft
2. Make changes (e.g., update object description)
3. Click "Save Draft" again
4. **Expected:** Session updates, no new session created

---

## 📝 Notes for Implementation

### Important Points

1. **Don't use `resumeWizard` action:** The backend action exists but you don't need to call it. Just load the `WizardSession` entity directly and restore from there.

2. **`_answeredQuestions` object:** This tracks questions already answered. Populate it from `answeredPath` JSON array for future use in the question-answer flow.

3. **Step navigation:** Use `wizard.nextStep()` to advance. Make sure to set current step first, then call `nextStep()` for each subsequent step.

4. **Validation:** Call `.setValidated(true)` on completed steps before navigating forward.

5. **Error handling:** Always handle missing/expired sessions gracefully. Fall back to `_resetWizard()` on errors.

### Edge Cases to Handle

- User has multiple paused sessions (shouldn't happen, but handle gracefully)
- Session exists but analysis was deleted
- Project was deleted but analysis still exists
- Network error while loading session
- User navigates away during resume (cleanup not required)

### Performance Considerations

- Loading session + analysis + project = 3 API calls
- Show busy indicator during all loads
- Consider using `$batch` if performance becomes an issue (optional optimization)

---

## 🔗 Related Files

### Files to Modify
1. `app/solutionadvisor/webapp/manifest.json` — Routing
2. `app/solutionadvisor/webapp/controller/AnalysesList.controller.js` — Resume navigation
3. `app/solutionadvisor/webapp/controller/Wizard.controller.js` — Main implementation
4. `db/schema.cds` — Optional draft name field

### Files to Reference (don't modify)
- `db/schema.cds` — WizardSession entity definition
- `srv/service.cds` — WizardSessions service definition
- `srv/service.js` — Backend handlers (resumeWizard action)
- `app/solutionadvisor/webapp/view/Wizard.view.xml` — Wizard UI
- `app/solutionadvisor/webapp/view/fragments/SaveDraftDialog.fragment.xml` — Save dialog

---

## 🚀 Ready to Implement

All information is provided. You can now:
1. Implement each task in order (1-6)
2. Test after each task
3. Run full acceptance tests
4. Deploy and verify

**Estimated Time:** 4-6 hours for full implementation and testing

Good luck! 🎯
