
# SAP Clean Core Levels for Conversion (Data Migration) – Beginner-Friendly Guide

This guide explains SAP's **Clean Core** levels **A–D** for **data migration/conversion** in S/4HANA ↔ BTP projects with clear details, analogies, tools, examples, and best practices.

---

## 🟩 Level A – “Cleanest” (Gold Standard)

🔹 **What it means**
- Perform data conversion using **released/public interfaces** only (e.g., released OData APIs, Migration Cockpit standard objects).
- No direct read/write on SAP business tables.
- No modifications to SAP standard migration objects or code.

🔹 **Beginner Analogy (Windows PC)**
> Move files using official OneDrive sync or Microsoft migration tool, not by editing system folders or registry.

🔹 **Tools You Use**
- SAP S/4HANA Migration Cockpit (standard migration objects)
- Public OData/REST APIs from SAP API Hub
- BTP Integration Suite (Cloud Integration)
- Released CDS views for read-only profiling
- ABAP Cloud/RAP for released actions

🔹 **Example Conversion**
- Customer Master: Source cleansed in BTP; iFlow calls Business Partner public API to create customers; post-load checks via released CDS views.
- Material Master: Use Migration Cockpit standard object “Material” with staging tables; validations handled by cockpit.

✅ **Why it’s best**
- Upgrade-safe, SAP-supported, auditable
- Maximizes data quality and traceability
- Fully Clean Core compliant

---

## 🟦 Level B – “Classic but Acceptable”

🔹 **What it means**
- Use classic interfaces for migration: IDoc, BAPI/RFC, or LSMW feeding BAPIs/IDocs.
- Avoid direct DB writes; do not modify standard migration logic.

🔹 **Beginner Analogy (Windows PC)**
> Use older, supported file copy tool or COM automation. Works, but not modern.

🔹 **Tools You Use**
- BAPIs/RFCs (e.g., BAPI_MATERIAL_SAVEDATA)
- IDocs (e.g., DEBMAS, MATMAS)
- LSMW configured to call BAPIs/IDocs
- PI/PO or BTP iFlows for orchestration

🔹 **Example Conversion**
- Open Items (FI-AR): Load via BAPI_ACC_DOCUMENT_POST in controlled batches.
- Customer/Vendor: Use DEBMAS/CREMAS IDocs from legacy; inbound posts through standard FMs.

✅ **Why it’s acceptable**
- Mature and widely used
- Practical for brownfield
- Moderate upgrade risk

---

## 🟨 Level C – “Risky Legacy”

🔹 **What it means**
- Load data by reading/writing internal tables or using undocumented FMs; bypass validations.
- Use LSMW or Z-programs to write directly into tables.

🔹 **Beginner Analogy (Windows PC)**
> Copy files straight into C:\Windows\System32 and tweak registry keys.

🔹 **Tools You Use**
- Z-programs with INSERT/UPDATE on MARA, EKKO, EKPO
- Undocumented FMs
- Legacy LSMW steps writing to DDIC tables

🔹 **Example Conversion**
- Inventory: Z-program inserts MSEG/MKPF rows directly.
- Pricing: Script updates PRCD_ELEMENTS table without pricing procedure.

❗ **Why it’s risky**
- Not upgrade-safe
- Bypasses business rules → corrupt data risk
- Use only temporary; plan remediation

---

## 🟥 Level D – “Do Not Do This” (Modifications)

🔹 **What it means**
- Modify SAP standard posting logic or change standard tables/IDoc types.
- Insert implicit enhancements in core routines to skip validations.

🔹 **Beginner Analogy (Windows PC)**
> Patch Windows kernel to skip permissions. Works now, breaks later.

🔹 **Tools You Use**
- Modified standard FMs (removing checks)
- Changed IDoc basic types instead of extensions
- Implicit enhancements inside standard BAPIs

🔹 **Example Conversion**
- Alter material posting FM to ignore valuation checks.
- Patch IDoc processing to accept custom segments without extension type.

🚫 **Why it’s bad**
- Blocks upgrades, severe technical debt
- Not supported by SAP
- Violates Clean Core principles

---

## ✅ Summary Table (Conversions)

| Level | Pattern | Tech Stack | Example | Upgrade Risk |
|---:|---|---|---|---|
| 🟩 A | Released business APIs / Migration Cockpit | Migration Cockpit, API Hub OData/REST, BTP Integration Suite | BP & Material load via Cockpit + public APIs | ✅ Safe |
| 🟦 B | Classic posting APIs | BAPI/RFC, IDoc, LSMW→BAPI/IDoc | AR open items via BAPI_ACC_DOCUMENT_POST | ⚠️ Moderate |
| 🟨 C | Internal objects | Z-programs writing tables, undocumented FMs | Insert into MSEG/MKPF for stock | ❗ High |
| 🟥 D | Modifications | Changed standard FMs, patched IDoc types | Patch posting FM to skip checks | 🚫 Very High |

---

## ❓ Beginner FAQ (Conversions)

**Q1. When do I pick Migration Cockpit vs APIs?**
- Migration Cockpit for standard objects and mapping with validations (Level A).
- Public APIs for custom orchestration or BTP-driven data quality steps.

**Q2. Is LSMW allowed in S/4HANA?**
- LSMW is legacy. If used, keep it Level B by routing through BAPI/IDoc only.

**Q3. How do I validate data quality before posting?**
- Use released CDS for profiling.
- Build pre-load checks in BTP and post-load reconciliations via Fiori.

**Q4. How do I handle historical documents?**
- Prefer standard posting APIs (Level B).
- Batch documents and throttle calls.

**Q5. What are safe rollback strategies?**
- Use staging tables of Migration Cockpit or iFlow checkpoints.
- Keep idempotency keys.

**Q6. How do I check clean-core compliance quickly?**
- Calls business APIs or Migration Cockpit → A.
- Calls BAPI/IDoc without DB writes → B.
- Touches SAP tables directly → C.
- Modifies SAP standard → D.

---

## 🧭 Design Guidance (Conversions)

1. **Target Level A first**
   - Default to Migration Cockpit and released APIs.
   - Build data quality rules in BTP; run trial loads until error rate <1%.

2. **Use Level B for legacy coexistence**
   - Prefer BAPI/IDoc paths for historical docs.
   - Encapsulate in iFlows; add error queues and retry logic.

3. **Treat Level C as temporary**
   - Document internal objects touched; commit remediation plan.

4. **Prohibit Level D**
   - No changes to standard posting logic or IDoc basic types.
   - Enforce transport governance.

