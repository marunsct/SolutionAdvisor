# Feature Plan: Project-Specific Question Flows

**Status:** Planning (not yet implemented)  
**Created:** April 14, 2026  
**Scope:** Allow each `ProjectConfiguration` to use a customized set of `QuestionFlow` records instead of the global default set.

---

## 1. Problem Statement

Today every project and tenant shares the **same** `QuestionFlow` master data. The `tenant` column on `QuestionFlow` exists (`NULL` = global, non-null = tenant-specific) but there is no **project-level** override capability.

Different projects may need:
- Extra questions for stricter compliance contexts (e.g., FDA-regulated projects add validation questions).
- Skipping questions that don't apply (e.g., a cloud-only project omits on-premise upgrade questions).
- Re-worded questions to match customer terminology.
- Different navigation rules (answer "Yes" goes to Q5 instead of Q3).
- Project-specific scoring weights embedded in question metadata.

---

## 2. Current Architecture (As-Is)

### Schema
```
QuestionFlow : cuid, managed {
    questionId       : String(10)    // Q1, Q2, ...
    objectType       : String(50)    // Reports, Interfaces, ...
    questionText     : String(500)
    answerOptions    : String(2000)  // JSON
    navigationRules  : String(5000)  // JSON
    displayOrder     : Integer
    isActive         : Boolean
    tenant           : String(36)    // NULL = global
}
```

### Decision Engine Query Pattern
```javascript
// decision-engine-consolidated.js → getFirstQuestion()
SELECT.one.from(QuestionFlow)
    .where({ objectType, displayOrder: 1, isActive: true })

// getNextQuestion()
SELECT.one.from(QuestionFlow)
    .where({ questionId: nextStep.nextQuestion, objectType, isActive: true })
```

### Key Observations
- **No project association** on `QuestionFlow` today.
- The decision engine queries by `objectType` + `questionId` + `isActive`. It does **not** filter by `tenant` or `project`.
- Global seed data lives in 7 CSV files (`sd-QuestionFlow.csv`, `sd-QuestionFlow-Reports.csv`, etc.).
- WizardSession tracks `currentQuestionId` and `answeredPath` (JSON) but not which flow set was used.
- Admin service exposes full CRUD on `QuestionFlow` plus (unimplemented) `bulkImportQuestionFlow` and `validateQuestionFlowLogic` actions.

---

## 3. Proposed Design (To-Be)

### 3.1 New Entity: `QuestionFlowSet`

Introduce a **named set** concept that groups question flows together:

```cds
entity QuestionFlowSet : cuid, managed {
    name            : String(200) not null;    // "Default", "FDA Compliant", "Cloud-Only"
    description     : String(1000);
    sourceSet       : Association to QuestionFlowSet; // Cloned from (null = original)
    isDefault       : Boolean default false;   // One default per tenant
    isLocked        : Boolean default false;   // Prevent edits on global sets
    tenant          : String(36);              // NULL = global/system set
}
```

### 3.2 Schema Changes to `QuestionFlow`

Add an association from `QuestionFlow` to `QuestionFlowSet`:

```cds
entity QuestionFlow : cuid, managed {
    // ... existing fields unchanged ...

    // NEW: Association to a question flow set
    flowSet         : Association to QuestionFlowSet;
}
```

### 3.3 Schema Changes to `ProjectConfiguration`

Add an optional association from project to its selected question flow set:

```cds
entity ProjectConfiguration : cuid, managed {
    // ... existing fields unchanged ...

    // NEW: Optional custom question flow for this project
    questionFlowSet : Association to QuestionFlowSet;
    // NULL → use tenant default set → fall back to global default set
}
```

### 3.4 Schema Changes to `WizardSession`

Track which flow set was used when the wizard session started (prevents mid-session confusion if the project's flow set changes):

```cds
entity WizardSession : cuid, managed {
    // ... existing fields unchanged ...

    // NEW: Snapshot of which flow set was active at session start
    flowSetUsed     : Association to QuestionFlowSet;
}
```

### 3.5 Resolution Logic (Decision Engine)

The decision engine must resolve which flow set to use. Add a new method:

```
resolveFlowSet(projectConfigId, tenant):
    1. Load ProjectConfiguration by ID
    2. If project.questionFlowSet is not null → use it
    3. Else find QuestionFlowSet where tenant = tenant AND isDefault = true
    4. Else find QuestionFlowSet where tenant IS NULL AND isDefault = true  (global)
    5. If still null → error: no question flow set configured
```

All existing `SELECT.from(QuestionFlow).where(...)` queries gain an additional filter:

```javascript
// Before (current):
SELECT.one.from(QuestionFlow)
    .where({ objectType, displayOrder: 1, isActive: true })

// After (new):
const flowSetId = await this.resolveFlowSet(projectConfigId, tenant);
SELECT.one.from(QuestionFlow)
    .where({ objectType, displayOrder: 1, isActive: true, flowSet_ID: flowSetId })
```

### 3.6 Clone-on-Customize Pattern

When a project admin wants to customize a question flow:

1. **Clone** the source set: Create a new `QuestionFlowSet` record with `sourceSet` pointing to the original.
2. **Deep copy** all `QuestionFlow` records associated with the source set, assigning them to the new set and the project's tenant.
3. **Assign** the new set to the `ProjectConfiguration.questionFlowSet`.
4. Admin can now edit individual questions without affecting other projects.

This pattern is similar to SAP's "copy-on-write" for configuration objects.

```
Admin Action: customizeQuestionFlow(projectId, sourceSetId)
    → INSERT new QuestionFlowSet { name: "Custom for Project X", sourceSet: sourceSetId, tenant }
    → INSERT INTO QuestionFlow SELECT * FROM QuestionFlow WHERE flowSet_ID = sourceSetId
       (with new UUIDs, flowSet_ID = new set ID, tenant = project tenant)
    → UPDATE ProjectConfiguration SET questionFlowSet_ID = new set ID WHERE ID = projectId
```

---

## 4. API Changes

### 4.1 New Admin Actions (admin-service.cds)

```cds
// Clone a question flow set for a specific project
action cloneQuestionFlowSet(
    sourceSetId : UUID,
    projectId   : UUID,
    name        : String(200)
) returns {
    success     : Boolean;
    newSetId    : UUID;
    questionsCopied : Integer;
    message     : String;
};

// Revert a project to the default question flow set
action revertToDefaultFlowSet(
    projectId   : UUID
) returns {
    success     : Boolean;
    message     : String;
};

// Compare two question flow sets (diff)
function compareFlowSets(
    setIdA      : UUID,
    setIdB      : UUID
) returns {
    differences : array of {
        questionId   : String;
        objectType   : String;
        field        : String;
        valueA       : String;
        valueB       : String;
    };
};
```

### 4.2 New Service Action (service.cds)

```cds
// Inform the wizard which flow set is active (read-only context)
function getActiveFlowSet(projectId : UUID) returns {
    flowSetId    : UUID;
    flowSetName  : String;
    isCustom     : Boolean;
    sourceSetName: String;
};
```

### 4.3 Modified Actions

- `startWizard(analysisID)` — internally resolve the flow set and store `flowSetUsed` on WizardSession.
- `submitAnswer(sessionID, ...)` — pass `flowSetId` to decision engine queries.
- `resumeWizard(sessionID)` — use `flowSetUsed` from the session (don't re-resolve, preserving consistency).

---

## 5. Data Migration

### Phase 1: Create Default Global Set
```sql
-- Create the global default QuestionFlowSet
INSERT INTO sd_QuestionFlowSet (ID, name, description, isDefault, isLocked, tenant)
VALUES ('GLOBAL-DEFAULT-UUID', 'SAP Standard', 'Default SAP Clean Core question flows', true, true, NULL);

-- Backfill all existing QuestionFlow records to point at this set
UPDATE sd_QuestionFlow SET flowSet_ID = 'GLOBAL-DEFAULT-UUID' WHERE flowSet_ID IS NULL;
```

### Phase 2: Existing Projects
- All existing `ProjectConfiguration` records get `questionFlowSet = NULL` (meaning: use default).
- No immediate disruption — the resolution logic falls back to global default.

### Phase 3: Existing WizardSessions
- All existing `WizardSession` records get `flowSetUsed = 'GLOBAL-DEFAULT-UUID'`.
- Sessions in progress continue using the global set.

---

## 6. UI Changes

### 6.1 Project Configuration Object Page

Add a new section: **"Question Flow Configuration"**

| Element | Description |
|---------|-------------|
| ComboBox: "Question Flow Set" | Shows available sets (global + tenant-specific). Default = "SAP Standard". |
| Button: "Customize" | Clones the current set, assigns to project, opens editor. |
| Button: "Revert to Default" | Removes custom set, falls back to global. |
| Link: "Compare with Standard" | Opens diff dialog showing changes from the source set. |
| Badge/Status | "Using: SAP Standard" or "Using: Custom (based on SAP Standard)" |

### 6.2 Admin Question Flow Management Page

Add a top-level filter/selector for `QuestionFlowSet`:

| Element | Description |
|---------|-------------|
| SegmentedButton | "Global Sets" / "Tenant Sets" / "Project Sets" |
| Table column | "Flow Set" — shows which set each question belongs to |
| Toolbar button | "Create New Set" — clones from existing |
| Toolbar button | "Delete Set" — with cascade delete of associated questions (confirmation dialog) |

### 6.3 Wizard UI

Add an informational header:

```
ℹ️ Using question flow: "SAP Standard" (Global Default)
```
or
```
ℹ️ Using question flow: "FDA Compliant" (Custom for this project)
```

No functional change to wizard interaction — the decision engine handles resolution transparently.

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Tenant A cloning Tenant B's custom set | `cloneQuestionFlowSet` must verify source set is either global (`tenant IS NULL`) or belongs to the requesting tenant |
| Editing locked global sets | `isLocked` flag prevents UPDATE/DELETE on system sets; enforce in CDS `@restrict` |
| Orphaned questions after set deletion | Use CDS Composition (`Composition of many QuestionFlow on ...`) for cascade delete |
| Decision engine query injection | `flowSet_ID` parameter is a UUID from DB lookup, not user input |
| Session consistency | `flowSetUsed` is set once at session start and never updated; prevents mid-wizard flow changes |

---

## 8. Testing Strategy

### Unit Tests
- `resolveFlowSet()` — test fallback chain: project → tenant default → global default → error.
- `cloneQuestionFlowSet()` — verify deep copy creates correct number of questions with new UUIDs.
- `getNextQuestion()` with `flowSetId` — verify questions from the correct set are loaded.

### Integration Tests
- Start wizard on project with custom flow set → verify custom questions appear.
- Start wizard on project without custom flow set → verify global questions appear.
- Mid-wizard: change project's flow set → verify in-progress session continues with original set.
- Clone set → edit cloned question → verify original set unchanged.
- Delete custom set → verify project falls back to default.

### E2E Tests
- Admin: Full flow of clone → edit → assign to project → run wizard → verify.
- Admin: Revert to default → run wizard → verify standard questions.

---

## 9. Implementation Phases

### Phase A: Schema & Migration (Backend)
1. Add `QuestionFlowSet` entity to `db/schema.cds`
2. Add `flowSet` association to `QuestionFlow`
3. Add `questionFlowSet` association to `ProjectConfiguration`
4. Add `flowSetUsed` association to `WizardSession`
5. Create migration script for existing data
6. Update `db/indexes.cds` with new index on `QuestionFlow.flowSet_ID`

### Phase B: Decision Engine Changes (Backend)
1. Add `resolveFlowSet(projectConfigId, tenant)` to decision engine
2. Update `getFirstQuestion()` and `getNextQuestion()` to accept and filter by `flowSetId`
3. Update `startWizard` to resolve and store flow set on session
4. Update `submitAnswer` to pass flow set from session to engine
5. Update `resumeWizard` to read flow set from session

### Phase C: Admin API (Backend)
1. Add `QuestionFlowSet` entity projection to admin-service.cds
2. Implement `cloneQuestionFlowSet` action
3. Implement `revertToDefaultFlowSet` action
4. Implement `compareFlowSets` function
5. Update `bulkImportQuestionFlow` to accept a `flowSetId` parameter

### Phase D: Service API (Backend)
1. Add `getActiveFlowSet` function to service.cds
2. Expose `QuestionFlowSet` as read-only in main service

### Phase E: UI — Project Configuration (Frontend)
1. Add "Question Flow Configuration" section to Project Object Page
2. Implement clone/revert buttons with action calls
3. Implement comparison dialog

### Phase F: UI — Admin Management (Frontend)
1. Add flow set filter to Admin QuestionFlow page
2. Add "Create/Delete Set" toolbar actions
3. Update table columns to show flow set

### Phase G: Testing
1. Unit tests for resolution logic
2. Integration tests for clone/revert
3. E2E tests for wizard with custom flows

---

## 10. Effort Estimate

| Phase | Description | Complexity |
|-------|-------------|------------|
| A | Schema & Migration | Low-Medium |
| B | Decision Engine | Medium |
| C | Admin API | Medium |
| D | Service API | Low |
| E | UI — Project Config | Medium |
| F | UI — Admin | Medium-High |
| G | Testing | Medium |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large question sets cause slow cloning | Medium | Batch INSERT with transaction; show progress indicator |
| Divergent sets become hard to maintain | Medium | "Compare with Standard" diff tool; highlight custom questions in admin |
| Broken navigation rules in cloned sets | High | Run `validateQuestionFlowLogic` automatically after clone |
| Seed data CSV files don't support sets | Low | Add `flowSet_ID` column to CSVs; migration script handles existing |
| Performance: extra JOIN on every question query | Low | Index on `QuestionFlow(flowSet_ID, objectType, questionId)`; cache resolved set ID per session |

---

## 12. Open Questions

1. **Should tenant-level default sets be editable, or always cloned from global?** Recommendation: Editable, but warn if other projects depend on it.
2. **Version history for sets?** Out of scope for v1. Could add `version` field later.
3. **Can a flow set span multiple object types, or one set per object type?** Recommendation: One set covers all object types (simpler). The set is a grouping container; individual questions are still filtered by `objectType`.
4. **Import/Export format?** Extend existing CSV/JSON import to include `flowSetId`. Consider ZIP archive with set metadata + questions.
