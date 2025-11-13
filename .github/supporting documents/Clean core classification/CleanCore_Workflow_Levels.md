
# SAP Clean Core Levels for Workflow (Beginner-Friendly Detailed Guide)

This guide explains SAP's **Clean Core** levels **A–D** for designing **Workflows** in S/4HANA ↔ BTP projects with clear details, analogies, tools, examples, and best practices.

---

## 🟩 Level A – “Cleanest” (Gold Standard)

🔹 **What it means**
- Design workflows using **released/public APIs**, **ABAP Cloud** services, **SAP Build Process Automation (SBPA)** on **BTP**, or **Flexible Workflow** (standard, configuration‑driven).
- Do **not** modify SAP standard workflow code or directly manipulate business tables.

🔹 **Beginner Analogy (Windows PC)**
> Automate tasks with Power Automate using official connectors; you don’t edit Windows system files—your flows keep working after updates.

🔹 **Tools You Use**
- **Flexible Workflow** (S/4HANA standard, configuration via Fiori)
- **SAP Build Process Automation** (low-code workflows, bots, forms)
- **ABAP Cloud/RAP** with **released events** and **actions**
- **SAP Event Mesh** (publish/subscribe events)
- **Public OData/REST APIs** and **released CDS views** for decisions/data

🔹 **Example Workflow**
- **Purchase Order Approval**: Flexible Workflow with rule-based approvals (amount, company code), notifications via Fiori Inbox; escalations handled by SBPA using released events (e.g., “PO submitted”).
- **Supplier Onboarding**: SBPA orchestrates steps (data entry, compliance check) calling public BP API; emits events for downstream systems.

✅ **Why it’s best**
- Upgrade-safe, configurable, and SAP-supported
- Decoupled from core code; Clean Core compliant
- Scales with BTP; easy to monitor and change

---

## 🟦 Level B – “Classic but Acceptable”

🔹 **What it means**
- Use **classic SAP Business Workflow** (WS‑templates, BOR objects), **workflow exits** and **BAdIs** that are stable but not part of released ABAP Cloud.
- Avoid direct DB writes; do not modify standard workflow engines.

🔹 **Beginner Analogy (Windows PC)**
> Use older, supported Windows Task Scheduler scripts. They work, but aren’t the most modern or recommended for new builds.

🔹 **Tools You Use**
- **SAP Business Workflow** (SWDD, BOR/CL‑based)
- **Workflow BAdIs** and **user exits**
- **PI/PO** or **BTP iFlows** to trigger/receive workflow steps via classic APIs

🔹 **Example Workflow**
- **Invoice Approval**: Classic SAP Workflow template (WS*) using BAPI/RFC to fetch GL data and route approvals; user decisions in SAP Inbox.
- **Material Master Change**: Workflow triggered via IDoc/BAPI; approvals and notifications handled by classic inbox.

✅ **Why it’s acceptable**
- Mature and widely used in brownfield
- Lower change effort where Flexible Workflow isn’t available
- Moderate upgrade risk; plan evolution to Level A

---

## 🟨 Level C – “Risky Legacy”

🔹 **What it means**
- Workflow steps call **internal tables** directly or rely on **undocumented function modules**, custom includes, or hard-coded logic in standard objects.
- Orchestrate flows via **custom Z-programs** that read/write business tables.

🔹 **Beginner Analogy (Windows PC)**
> Automation reads/writes raw registry/system files instead of using approved APIs. It works until updates change internals.

🔹 **Tools You Use**
- Z-workflows calling `SELECT/UPDATE` on tables like `EKKO`, `EKPO`
- Undocumented FMs to change statuses
- Custom batch jobs controlling approvals via table flags

🔹 **Example Workflow**
- **PO Release**: Z-program checks amounts in `EKKO` and sets custom status fields; sends emails via direct table updates and internal FMs (no standard events).
- **Credit Memo Workflow**: Internal FM updates document status then triggers mail; no published events.

❗ **Why it’s risky**
- Not upgrade-safe; table or FM changes break flows
- Bypasses business validation; hard to audit
- Use only temporary; refactor to Flexible Workflow/SBPA

---

## 🟥 Level D – “Do Not Do This” (Modifications)

🔹 **What it means**
- Modify **standard workflow engine code**, change **standard WS templates**, or patch standard classes that control approvals/events.
- Insert **implicit enhancements** into core workflow runtime or standard applications to force behavior.

🔹 **Beginner Analogy (Windows PC)**
> Patch the Windows service manager to change how scheduled tasks run—unsupported and fragile.

🔹 **Tools You Use**
- Changes to **standard workflow classes/templates**
- Implicit enhancements in standard application methods for approvals
- Direct updates to standard tables in workflow engine

🔹 **Example Workflow**
- Alter SAP-delivered **PO Flexible Workflow** logic directly instead of configuring rules.
- Modify standard **inbox** processing to skip approvals under certain conditions.

🚫 **Why it’s bad**
- Blocks upgrades, breaks support contracts
- Creates severe technical debt and audit issues
- Violates Clean Core principles

---

## ✅ Summary Table (Workflow)

| Level | Pattern | Technologies | Example | Upgrade Risk |
|---:|---|---|---|---|
| 🟩 A | Released events/APIs; configuration-first | Flexible Workflow, SBPA, ABAP Cloud/RAP, Event Mesh | PO approval via Flexible Workflow + SBPA escalations | ✅ Safe |
| 🟦 B | Classic workflow engine | SAP Business Workflow (WS/BOR), BAdIs, user exits | Invoice approval with classic WS template | ⚠️ Medium |
| 🟨 C | Internal objects / custom orchestration | Z-programs reading tables, undocumented FMs | Z-workflow updates `EKKO` flags directly | ❗ High |
| 🟥 D | Modifications | Changes to standard workflow runtime/templates | Patch standard PO Flexible Workflow | 🚫 Very High |

> **Beginner metrics**
> - “Complex workflow” = ≥5 steps, ≥3 roles, cross-app data → prefer SBPA/Flexible Workflow (Level A).
> - “High volume approvals” = >1,000 approvals/day → use events, asynchronous steps, and work inbox; avoid synchronous custom Z-orchestration.

---

## ❓ Beginner FAQ (Workflow)

**Q1. What is “Flexible Workflow”?**
- A configuration-driven workflow in S/4HANA for objects like PO, PR, etc. You set conditions and steps in Fiori—no custom code (Level A).

**Q2. When should I choose SBPA vs Flexible Workflow?**
- Flexible Workflow for standard business objects and approvals. SBPA for end-to-end orchestration across systems, human tasks, bots, forms—especially when steps go beyond S/4HANA.

**Q3. How do I ensure my workflow is clean-core compliant?**
- Use released events/APIs, no direct table writes, and no modifications. Prefer configuration (Flexible Workflow) over custom code.

**Q4. Can classic SAP Business Workflow be used in clean-core?**
- Yes, as Level B: keep logic in BAdIs/exits, avoid internal tables; plan a roadmap to Flexible Workflow/SBPA.

**Q5. How do I monitor workflows?**
- Use Fiori My Inbox, Workflow Logs, and SBPA Monitoring. Track SLA metrics (e.g., <24h average approval time; escalations if >48h).

**Q6. What common anti-patterns should I avoid?**
- Writing directly to business tables to “set status” (Level C/D). Hard-coding approver lists in ABAP. Modifying standard workflow artifacts.

---

## 🧭 Design Guidance (Workflow)

1. **Target Level A**
   - Start with Flexible Workflow if a standard object exists.
   - Use SBPA for orchestration and Event Mesh for decoupling.
   - Keep steps configurable; consume released APIs.

2. **Use Level B for legacy scenarios**
   - Leverage classic WS templates with BAdIs/exits.
   - No direct table writes; wrap external calls properly.

3. **Treat Level C as temporary**
   - Replace Z-orchestration/table writes with released events.
   - Document internals and commit to refactor (e.g., next two releases).

4. **Prohibit Level D**
   - Do not modify standard workflow runtime/templates.
   - Enforce transport governance and code reviews to catch violations.

