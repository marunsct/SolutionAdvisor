
# SAP Clean Core Levels for Interfaces (Beginner-Friendly Detailed Guide)

This guide explains SAP's **Clean Core** levels **A–D** for designing **Interfaces** in S/4HANA ↔ BTP projects with clear details, analogies, tools, examples, and best practices.

---

## 🟩 Level A – “Cleanest” (Gold Standard)

🔹 **What it means**
- Integrate using **released/public APIs** (OData/REST, Event APIs) or **released CDS views** and **SAP Integration Suite** on **SAP BTP**.
- No direct read/write on SAP tables.
- No modifications to SAP standard integration objects.

🔹 **Beginner Analogy (Windows PC)**
> Use Microsoft Graph API and webhooks to integrate with Microsoft 365, not by reading PST files or patching executables.

🔹 **Tools You Use**
- SAP API Hub (released OData/REST APIs)
- Released CDS views (read-only)
- SAP BTP Integration Suite (Cloud Integration, API Management)
- SAP Event Mesh / Business Events (publish–subscribe)
- Outbound/Inbound services in ABAP Cloud/RAP
- Fiori/UI5 or CAP apps consuming the above

🔹 **Example Interface**
- Supplier onboarding app on BTP calls public S/4HANA OData API for Business Partner; changes publish events to Event Mesh; downstream systems subscribe.
- Order status interface: a BTP iFlow reads released CDS view `I_SalesOrder` and exposes it as a REST API to non‑SAP consumers.

✅ **Why it’s best**
- Upgrade-safe, clean decoupling
- SAP-supported interfaces with stability contracts
- Fits Clean Core and BTP-first strategy

---

## 🟦 Level B – “Classic but Acceptable”

🔹 **What it means**
- Integrate via **classic interfaces**: IDoc/ALE, BAPI/RFC, SOAP services; documented and widely used but not “released” in the Clean Core sense.
- Avoid direct DB access; do not modify standard objects.

🔹 **Beginner Analogy (Windows PC)**
> Use older COM automation or SOAP services that Microsoft still supports—works, but not the modern recommendation.

🔹 **Tools You Use**
- IDoc/ALE (e.g., `ORDERS05`, `INVOIC02`)
- BAPI/RFC (e.g., `BAPI_PO_CREATE1`)
- SOAP web services (SOAMANAGER)
- PI/PO or BTP Cloud Integration to mediate

🔹 **Example Interface**
- PO creation: External solution sends IDoc ORDERS05 to S/4HANA; standard inbound function posts the PO.
- Master data sync: A BTP iFlow calls BAPI to fetch Materials; response transformed to JSON for a legacy app.

✅ **Why it’s acceptable**
- Mature and supported
- Practical for brownfield and legacy coexistence
- Moderate upgrade risk; plan path to Level A

---

## 🟨 Level C – “Risky Legacy”

🔹 **What it means**
- Interfaces read/write SAP internal tables or use undocumented function modules/classes.
- Custom file interfaces bypass APIs and touch business tables directly.

🔹 **Beginner Analogy (Windows PC)**
> Read/write raw registry keys or system files rather than using Windows APIs—it works until an update changes internals.

🔹 **Tools You Use**
- Custom ABAP Z-programs with `SELECT/UPDATE` on tables like `EKKO`, `EKPO`, `MARA`
- Undocumented function modules (not in API Hub)
- Ad‑hoc file drops (CSV, flat file) processed by programs that write into core tables

🔹 **Example Interface**
- Bulk price upload: Nightly CSV loaded by a Z‑program that updates `PRCD_ELEMENTS` directly.
- Inventory sync: External system FTPs a file; custom program inserts stock into `MKPF/MSEG` without standard posting APIs.

❗ **Why it’s risky**
- Not upgrade-safe
- Bypasses business validation; can corrupt data
- Use only temporary; schedule remediation to A/B

---

## 🟥 Level D – “Do Not Do This” (Modifications)

🔹 **What it means**
- Modify SAP standard integration objects or code: change IDoc basic types, alter standard function modules, patch posting logic.
- Insert implicit enhancements that alter core processing of standard interfaces.

🔹 **Beginner Analogy (Windows PC)**
> Patch the Windows networking stack itself to change how HTTP works—unsupported and will break with updates.

🔹 **Tools You Use**
- Edited standard IDoc basic types/segments
- Modifications to standard RFC/BAPI or function modules
- Implicit enhancements that rewrite standard inbound/outbound flows

🔹 **Example Interface**
- Custom segment added directly into `ORDERS05` basic type (instead of an extension type) and standard inbound FM changed to parse it.
- Posting FM modified to skip validations on inbound payload.

🚫 **Why it’s bad**
- Blocks upgrades; severe technical debt
- Not supported by SAP
- Violates Clean Core and audit/compliance expectations

---

## ✅ Summary Table (Interfaces)

| Level | Pattern | Tech Stack | Example | Upgrade Risk |
|---:|---|---|---|---|
| 🟩 A | Released APIs / Events | API Hub OData/REST, CDS (read), BTP Integration Suite, Event Mesh | BTP iFlow calls public BP API, publishes events | ✅ Safe |
| 🟦 B | Classic APIs | IDoc/ALE, BAPI/RFC, SOAP, PI/PO | ORDERS05 inbound → PO creation; BAPI read via iFlow | ⚠️ Medium |
| 🟨 C | Internal objects | Z-programs with direct DB, undocumented FMs, file drops | CSV → Z‑program updates core tables | ❗ High |
| 🟥 D | Modifications | Changed IDoc basic types, modified standard FMs | Alter ORDERS05 basic type & inbound FM | 🚫 Very High |

> **Volume guidance (beginner metric)**
> - “High volume” = sustained >10,000 records/day or bursts >1,000/min → prefer event/streaming patterns (Level A) and asynchronous designs.
> - “Latency sensitive” = user waits <2 seconds end‑to‑end → prefer synchronous APIs (Level A), avoid batch/file (C).

---

## ❓ Beginner FAQ (Interfaces)

**Q1. How do I find a released API for S/4HANA?**
- Check SAP API Hub; search by object (e.g., Purchase Order, Business Partner). If tagged as released, it’s Level A.
- In S/4HANA, use CDS View Browser and check if the view is released/public (read-only for reporting).

**Q2. When should I use IDoc vs OData?**
- IDoc (Level B) is robust for asynchronous, bulk, legacy scenarios.
- OData/REST (Level A) is ideal for modern, real-time, and UI-driven integrations.

**Q3. What’s Event Mesh, and why use it?**
- SAP Event Mesh provides publish–subscribe events (e.g., “PO created”). Consumers get updates without tight coupling—great for scalability and clean core designs (Level A).

**Q4. How do I check if an interface is clean-core compliant?**
- Verify the data access path: released APIs/events → Level A; IDoc/BAPI → Level B; tables/FMs → Level C; mods → Level D.
- Ensure you don’t write directly to business tables; always go through business APIs.

**Q5. How do I secure interfaces (beginner checklist)?**
- Use OAuth2/SAML on BTP; basic auth only for legacy with compensating controls.
- Log payload IDs and response codes; target <1% error rate in steady-state.
- Apply PI/PO or Integration Suite policies (rate limit, schema validation).

**Q6. How do I choose sync vs async?**
- Sync (OData/REST) for user-driven actions or small payloads; target <2s response.
- Async (IDoc/Event) for bulk, decoupled, or long-running processes.

---

## 🧭 Design Guidance (Interfaces)

1. **Prefer Level A**
   - Use released APIs + Integration Suite; adopt event-driven where possible.
   - Keep stateless, idempotent endpoints; validate schemas centrally.

2. **Use Level B for legacy coexistence**
   - Encapsulate IDoc/BAPI behind iFlows; build mappings and error handling.
   - Plan a migration path to Level A (API-first/event-first).

3. **Treat Level C as temporary debt**
   - Replace direct table/file approaches with business APIs.
   - Document internals; set refactor milestones (e.g., 2 quarters).

4. **Prohibit Level D**
   - No changes to standard IDoc basic types or posting FMs.
   - Implement transport governance: block modifications, enforce code checks.

