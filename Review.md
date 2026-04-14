Critical - Cache bypass in `before(READ)` handlers doesn't work

Setting `req.results` in a CAP `before` handler does not bypass the database call in CDS v9. The DB query still executes after the handler returns — the cached value is overwritten. Use `req.reply(cached); return` to short-circuit correctly.

📄 srv/service.js — before('READ', 'CleanCoreLevels'), before('READ', 'ObjectTypes'), before('READ', 'PerformanceThresholds')

Critical - Wrong question fetched in `submitAnswer` — missing `objectType` filter

`SELECT.one.from(QuestionFlows).where({ questionId: questionId })` is ambiguous — `Q1` exists for Reports, Interfaces, Workflows, etc. Without an `objectType` filter, CAP may return the question from the wrong object type, causing incorrect decision paths and wrong recommendations.

📄 srv/service.js — submitAnswer handler

Critical - Index annotations reference non-existent fields — deploy will fail

`db/indexes.cds` has several broken field references that will cause HANA deployment errors:

- `recommendedLevel_levelCode` doesn't exist on `CleanCoreAnalysis` (it's `finalRecommendation`)
- `threshold_ID` and `wasViolated` don't exist on `ConstraintLog`
- `code` doesn't exist on `ObjectTypes` (it's `objectCode`)
- `actionType` / `actionTimestamp` don't exist on `AuditLog` (they're `eventType` / `timestamp`)

📄 db/indexes.cds — multiple annotate blocks

Medium - Tenant isolation gap — `WizardSessions` reads are not tenant-filtered

The `before('READ', 'Analyses')` handler filters by `createdBy` for non-admins, but there is no equivalent filter for `WizardSessions` reads. A user could query `/WizardSessions` with an analysis_ID from another tenant and receive data. Add a tenant `WHERE` clause in a `before('READ', 'WizardSessions')` handler.

📄 srv/service.js

Medium - Cloud readiness score formula is incorrect (`* 2` makes Level A/B always 100)

`baseScore * levelFactor * 2` results in Level A scoring 200 (capped to 100) and Level B scoring 120 (capped to 100), making the level factor meaningless for upper levels. The `* 2` multiplier inflates scores and should be removed. The `levelFactor` alone correctly scales the base score.

📄 srv/lib/scoring-service.js — calculateCloudReadiness()

Medium - N+1 query pattern in `getDecisionPathQuestions`

The decision engine loops over decision path steps and fires a separate DB query per step to fetch the question. With 10 steps this means 11 DB round-trips. Fetch all `questionId` values in one `IN` query first, then build a lookup map before the loop.

📄 srv/lib/decision-engine-consolidated.js — getDecisionPathQuestions()

Medium - Race condition in `startWizard` — duplicate analyses possible

The check-then-create pattern for detecting existing draft analyses has a TOCTOU race condition. If two requests arrive simultaneously for the same `ricefwId`, both will pass the existence check and both will insert a new analysis. A unique database constraint on `(projectConfig_ID, ricefwId, tenant)` where `status = 'In Progress'` would prevent duplicates at the DB level.

📄 srv/service.js — startWizard handler

Medium - In-memory rate limiter and cache are not cluster-safe

Both `RateLimiter` and `CacheService` use in-memory storage (`Map` / `node-cache`). On CF/BTP with multiple app instances, each instance has its own state — rate limits reset on restart and cache misses across instances cause inconsistency. In production, these need a shared store such as Redis or SAP's Session Management service. A warning comment exists in the code but the issue deserves a clear TODO or issue tracker entry.

Improvement - `getDeploymentBonus()` is a stub — always returns 10

The method is documented as using the project's `s4HanaFlavor` to adjust cloud readiness, but it ignores the input and always returns 10. This bonus is never applied in `calculateCloudReadiness` either. Either implement it (e.g. +15 for Cloud Public, 0 for On-Premise) or remove it.

📄 srv/lib/scoring-service.js — getDeploymentBonus()

Improvement - Duplicate service directories: `service/` and `services/` in UI

The UI webapp has two directories: `webapp/service/` (NotificationService, UnsavedChangesService) and `webapp/services/` (NotificationService, SearchService, ThemeService). There is a duplicate `NotificationService.js` in both folders. Consolidate into one `services/` directory to avoid confusion over which version is imported.

📄 app/solutionadvisor/webapp/service/ vs webapp/services/

Improvement - Add `objectType` filter in `getNextQuestion` and `getDecisionPathQuestions`

Both methods query `QuestionFlow` by `questionId` alone. As noted above for `submitAnswer`, this is ambiguous. Since the session or analysis always carries an `objectType`, pass it through and add it to the WHERE clause. The unique index `idx_question_objecttype` is already defined — use it.

📄 srv/lib/decision-engine-consolidated.js