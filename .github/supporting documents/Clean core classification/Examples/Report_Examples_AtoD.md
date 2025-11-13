
# Purchase Order (PO) Report — Examples by Clean Core Level (A–D)

Below are four concrete PO reporting designs, each mapped to a Clean Core level with the reasoning.

---

## 🟩 Level A Example — Fiori Elements using Released CDS

**Scenario**: Business needs a PO Items report with filters, totals, and drill-down.

**Design**:
- Use a **released CDS view** (e.g., `I_PurchaseOrderItem` / public API) and expose as **OData**.
- Build a **Fiori Elements** List Report/Analytical List Page on top of the OData service.
- Optional: Use **SAP Analytics Cloud** for charts on the same released API.

**Why Level A?**
- Only released, documented interfaces; ABAP Cloud compliant; upgrade-safe per Clean Core guidance. 
- No direct table access or modifications.

---

## 🟦 Level B Example — ALV Report using BAPI

**Scenario**: Existing landscape relies on BAPIs; no suitable released CDS yet.

**Design**:
- Create an **ABAP ALV report** that calls `BAPI_PO_GETDETAIL` (or similar) to fetch PO header/items.
- Format results in ALV grid with filters and export.
- Optionally wrap the BAPI in a service or CDS interface for reuse.

**Why Level B?**
- Uses **classic, stable APIs** (BAPI/RFC). Acceptable when Level A artefacts are unavailable.  
- Still no core modifications; but not formally covered by released API contracts.

---

## 🟨 Level C Example — Z‑Report with Direct Table Access

**Scenario**: Quick custom needs; team reads PO items directly.

**Design**:
- Write a **Z‑program** that does `SELECT * FROM EKPO` and joins with `EKKO` for header.
- Add filters and totals in the program; export to Excel.

**Why Level C?**
- Direct access to **internal SAP tables** (not exposed via released APIs).  
- Common in legacy systems, but **upgrade risk is high** (table structures can change).

---

## 🟥 Level D Example — Modification of Standard PO Program

**Scenario**: Team edits SAP’s standard PO display to add custom fields/calculation.

**Design**:
- Modify the **standard SAP program** or insert implicit enhancements altering logic.  
- Or write a Z‑program that **updates** standard tables like `EKPO` directly during reporting.

**Why Level D?**
- Direct **modifications** to SAP standard or dangerous updates to standard tables.  
- Violates Clean Core; **blocks upgrades** and adds severe technical debt.

---

## 🔚 What to Choose?

- **New PO reports** → Prefer **Level A** (released CDS/OData/RAP/BTP).  
- **Existing classic integrations** → **Level B** (BAPI), but plan a path to Level A.  
- **Legacy quick wins** → **Level C** only as temporary; schedule remediation.  
- **Never** → Level D.

