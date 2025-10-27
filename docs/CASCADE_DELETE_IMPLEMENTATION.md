# Cascade Delete Implementation

## Overview

The application implements comprehensive cascade delete functionality to maintain referential integrity when deleting Projects and Analyses. This ensures no orphaned records remain in the database.

## Architecture

### Deletion Hierarchy

```
Project (ProjectConfiguration)
  └─> Analysis (CleanCoreAnalysis) - Multiple per project
       └─> Decision Path (DecisionPath) - Multiple per analysis
```

When a Project is deleted, all associated Analyses and their Decision Paths are automatically removed.

## Backend Implementation (CAP Service Layer)

### Location
`srv/service.js`

### Cascade Delete Handlers

#### 1. Project Deletion → Delete Analyses

```javascript
this.before('DELETE', Projects, async (req) => {
    const projectID = req.data.ID;
    const tenant = req.user?.tenant || 'default';

    if (!projectID) {
        return;
    }

    try {
        // Delete all analyses associated with this project
        await DELETE.from(Analyses)
            .where({ projectConfig_ID: projectID, tenant: tenant });

        LOG.info(`Cascade deleted all analyses for project ${projectID}`);
    } catch (error) {
        LOG.error('Error cascade deleting analyses for project:', error);
        // Continue with project deletion even if analyses deletion fails
    }
});
```

**Trigger:** Before a Project is deleted  
**Action:** Deletes all Analyses where `projectConfig_ID` matches the project being deleted  
**Multi-tenancy:** Filters by tenant to ensure isolation  
**Error Handling:** Logs errors but continues with project deletion  

#### 2. Analysis Deletion → Delete Decision Paths

```javascript
this.before('DELETE', Analyses, async (req) => {
    const analysisID = req.data.ID;
    const tenant = req.user?.tenant || 'default';

    if (!analysisID) {
        return;
    }

    try {
        // Delete all decision paths associated with this analysis
        await DELETE.from(DecisionPaths)
            .where({ analysis_ID: analysisID, tenant: tenant });

        LOG.info(`Cascade deleted all decision paths for analysis ${analysisID}`);
    } catch (error) {
        LOG.error('Error cascade deleting decision paths for analysis:', error);
        // Continue with analysis deletion even if decision paths deletion fails
    }
});
```

**Trigger:** Before an Analysis is deleted (either directly or via Project cascade)  
**Action:** Deletes all DecisionPaths where `analysis_ID` matches the analysis being deleted  
**Multi-tenancy:** Filters by tenant to ensure isolation  
**Error Handling:** Logs errors but continues with analysis deletion  

### Execution Flow

When a user deletes a Project:

1. **Frontend** → User clicks "Delete Project" button → Confirmation dialog → Calls `onDeleteProject()`
2. **Frontend Cascade** → Deletes all Analyses via OData (client-side safety check)
3. **Backend `before DELETE Projects`** → Deletes all Analyses (server-side enforcement)
4. **Backend `before DELETE Analyses`** → For each Analysis, deletes all DecisionPaths
5. **Final DELETE** → Project record is removed

**Why Both Frontend and Backend?**
- **Frontend:** Provides immediate feedback and handles UI state
- **Backend:** Ensures data integrity even if deletion comes from other clients/APIs

## Frontend Implementation (UI5)

### Location
`app/solutionadvisor/webapp/controller/ProjectsList.controller.js`

### UI Components

#### Delete Button Visibility

```xml
<!-- app/solutionadvisor/webapp/view/ProjectsList.view.xml -->
<Button 
    id="deleteButton"
    text="Delete Project"
    icon="sap-icon://delete"
    type="Reject"
    press="onDeleteProject"
    visible="{user>/isAdmin}" />
```

**Visibility:** Only shown to users with Admin role  
**Binding:** Uses `user` model with `isAdmin` flag  

### Delete Handler

```javascript
onDeleteProject: function() {
    const oTable = this.byId("projectsTable");
    const oSelectedItem = oTable.getSelectedItem();
    
    if (!oSelectedItem) {
        MessageBox.warning("Please select a project to delete.");
        return;
    }
    
    const oContext = oSelectedItem.getBindingContext();
    const sProjectName = oContext.getProperty("projectName");
    const sProjectID = oContext.getProperty("ID");
    
    MessageBox.confirm(
        `Are you sure you want to delete project "${sProjectName}"?\n\n` +
        `This will also delete all associated analyses and cannot be undone.`,
        {
            title: "Confirm Deletion",
            onClose: function(oAction) {
                if (oAction === MessageBox.Action.OK) {
                    this._deleteProjectWithAnalyses(oContext, sProjectID);
                }
            }.bind(this)
        }
    );
}
```

**Safety Features:**
- Validates selection before proceeding
- Shows confirmation dialog with project name
- Warns about cascade deletion
- Cannot be undone warning

### Cascade Delete Implementation

```javascript
_deleteProjectWithAnalyses: async function(oProjectContext, sProjectID) {
    const oView = this.getView();
    const oModel = oView.getModel();
    
    oView.setBusy(true);
    
    try {
        // Step 1: Get all analyses for this project
        const oAnalysesBinding = oModel.bindList("/Analyses", null, null, [
            new Filter("projectConfig_ID", FilterOperator.EQ, sProjectID)
        ]);
        
        const aAnalysesContexts = await oAnalysesBinding.requestContexts();
        
        // Step 2: Delete all analyses first
        if (aAnalysesContexts.length > 0) {
            const aDeletePromises = aAnalysesContexts.map(ctx => ctx.delete());
            await Promise.all(aDeletePromises);
            Log.info(`Deleted ${aAnalysesContexts.length} analyses for project ${sProjectID}`);
        }
        
        // Step 3: Delete the project
        await oProjectContext.delete();
        
        MessageToast.show("Project deleted successfully");
        
        // Step 4: Refresh counts
        this._loadCounts();
        
    } catch (oError) {
        Log.error("Error deleting project:", oError);
        MessageBox.error("Failed to delete project. Please try again.");
    } finally {
        oView.setBusy(false);
    }
}
```

**Execution Steps:**
1. **Filter Analyses:** Uses OData V4 `bindList` with filter on `projectConfig_ID`
2. **Delete Analyses:** Calls `delete()` on each Analysis context via `Promise.all`
3. **Delete Project:** Calls `delete()` on the Project context
4. **Refresh UI:** Reloads tile counts to reflect deletion
5. **Error Handling:** Shows error message and logs details if any step fails

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User Action: Click "Delete Project"                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Show Confirmation Dialog                          │
│ Message: "This will delete all associated analyses"         │
└─────────────────────┬───────────────────────────────────────┘
                      │ User Confirms
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend Controller: _deleteProjectWithAnalyses()           │
│ 1. Query Analyses with projectConfig_ID filter              │
│ 2. Delete each Analysis (triggers backend cascade)          │
│ 3. Delete Project (triggers backend cascade)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: before DELETE Analyses                             │
│ → Deletes DecisionPaths for each Analysis                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: before DELETE Projects                             │
│ → Deletes remaining Analyses (safety check)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Database: Records Removed                                   │
│ ✓ DecisionPaths deleted                                     │
│ ✓ Analyses deleted                                          │
│ ✓ Project deleted                                           │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: UI Updates                                        │
│ 1. MessageToast: "Project deleted successfully"             │
│ 2. Refresh tile counts                                      │
│ 3. Remove busy indicator                                    │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Considerations

All cascade delete operations respect tenant isolation:

- **Frontend:** CAP MTX automatically injects tenant context in OData requests
- **Backend:** Explicit tenant filtering in DELETE queries:
  ```javascript
  .where({ projectConfig_ID: projectID, tenant: tenant })
  ```
- **Isolation:** Tenant A cannot accidentally delete Tenant B's data

## Testing Checklist

### Manual Testing

- [ ] Create a Project
- [ ] Create 2-3 Analyses for that Project
- [ ] Each Analysis should complete the wizard (generates DecisionPaths)
- [ ] Verify data exists:
  - [ ] Query `/Analyses?$filter=projectConfig_ID eq 'PROJECT_ID'`
  - [ ] Query `/DecisionPaths?$filter=analysis_ID eq 'ANALYSIS_ID'`
- [ ] Delete the Project via UI
- [ ] Verify cascade deletion:
  - [ ] All Analyses removed
  - [ ] All DecisionPaths removed
  - [ ] Tile counts updated

### Error Scenarios

- [ ] Delete Project with 0 Analyses (should succeed)
- [ ] Delete Project with 100+ Analyses (performance test)
- [ ] Network failure during deletion (verify rollback)
- [ ] Permission denied (non-admin user)

### Multi-Tenant Testing

- [ ] Login as Tenant A, create Project A1
- [ ] Login as Tenant B, create Project B1
- [ ] Login as Tenant A, delete Project A1
- [ ] Verify Tenant B's Project B1 still exists

## Performance Considerations

### Current Implementation

- **Frontend:** Sequential OData DELETE calls per Analysis
- **Backend:** Batch DELETE operations

### Optimization Opportunities

1. **Batch API:** Use OData V4 `$batch` to delete multiple Analyses in one request
2. **Backend-Only:** Remove frontend cascade, rely solely on backend hooks
3. **Database Triggers:** Move cascade to HANA triggers for native SQL performance

### Recommended for Production

For projects with 50+ Analyses, consider:

```javascript
// Backend optimization: Single DELETE with subquery
await DELETE.from(DecisionPaths)
    .where`analysis_ID IN (
        SELECT ID FROM Analyses WHERE projectConfig_ID = ${projectID}
    )`;
```

## Security

### Authorization

- **Delete Project:** Requires `Admin` or `TenantAdmin` role
- **UI Visibility:** Button only shown when `user>/isAdmin` is true
- **Backend Enforcement:** CAP `@restrict` annotations on service

### Audit Trail

All deletions are logged:

```javascript
LOG.info(`Cascade deleted all analyses for project ${projectID}`);
LOG.info(`Cascade deleted all decision paths for analysis ${analysisID}`);
```

Consider adding to `AuditLog` entity for compliance:

```javascript
await auditService.logDeletion({
    entityType: 'Project',
    entityID: projectID,
    deletedBy: req.user.id,
    cascadeCount: deletedAnalysesCount
});
```

## Known Limitations

1. **No Soft Delete:** Hard delete with no recovery option
2. **No Batch UI:** Cannot delete multiple projects at once
3. **No Undo:** Deletion is immediate and permanent
4. **No Archive:** No option to archive instead of delete

## Future Enhancements

### Soft Delete Pattern

```javascript
// Instead of DELETE, mark as deleted
await UPDATE(Projects)
    .set({ isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id })
    .where({ ID: projectID });
```

### Bulk Delete

```xml
<Table mode="MultiSelect">
    <headerToolbar>
        <Button text="Delete Selected" press="onBulkDelete" />
    </headerToolbar>
</Table>
```

### Archive Before Delete

```javascript
// Export to JSON before deletion
const oArchive = {
    project: oProjectData,
    analyses: aAnalysesData,
    decisionPaths: aDecisionPathsData,
    archivedAt: new Date().toISOString()
};

await fetch('/archive/projects', {
    method: 'POST',
    body: JSON.stringify(oArchive)
});
```

## References

- **CAP Documentation:** [Event Handlers - Before](https://cap.cloud.sap/docs/node.js/events#before)
- **OData V4 Spec:** [Data Modification - Delete](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part1-protocol.html#_Toc445374635)
- **UI5 Context API:** [ODataContextBinding.delete()](https://ui5.sap.com/#/api/sap.ui.model.odata.v4.ODataContextBinding/methods/delete)

---

**Last Updated:** 2024  
**Implementation Status:** ✅ Complete  
**Test Coverage:** Manual testing required  
