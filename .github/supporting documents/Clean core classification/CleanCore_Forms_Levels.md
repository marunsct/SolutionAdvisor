
# SAP Clean Core Levels for Forms Design (Beginner-Friendly Detailed Guide)

This guide explains SAP's **Clean Core** levels **A–D** for designing **Forms** in S/4HANA ↔ BTP projects with clear details, analogies, tools, examples, and best practices.

---

## 🟩 Level A – “Cleanest” (Gold Standard)

🔹 **What it means:**
- Use **released APIs and key-user tools** only (public CDS/OData, Output Management).
- No direct access to SAP database tables.
- No modifications to SAP standard forms or code.

🔹 **Beginner Analogy (Windows PC):**
- You create a form using Microsoft Word templates and approved add-ins.
- You never edit system files or registry keys.
- Your forms keep working after Windows updates.

🔹 **Tools You Use:**
- Output Management (BRF+ rules) with Adobe Forms
- Released CDS views / Public OData APIs (e.g., `I_PurchaseOrderItem`)
- SAP BTP (SAP Build Process Automation, CAP/RAP services)
- SAP Fiori (UI5) for interactive forms
- SAP Analytics Cloud for dashboards/printable PDFs

🔹 **Example Form:**
- PO Print Form built in Adobe Lifecycle Designer, sourcing data via released CDS view `I_PurchaseOrderItem` exposed as OData.
- Supplier Feedback Form in SAP Build, writing responses through a public OData API to S/4HANA.

✅ **Why it’s best:**
- Fully upgrade-safe
- No risk of breaking SAP during upgrades
- SAP supports it officially
- Clean Core compliant and future-proof

---

## 🟦 Level B – “Classic but Acceptable”

🔹 **What it means:**
- Use **classic APIs** like BAPIs or RFCs to populate forms.
- No modifications to standard SAP forms; data comes from classic interfaces.
- Suitable when released CDS/OData is not available yet.

🔹 **Beginner Analogy (Windows PC):**
- You rely on older COM components that still work but aren’t recommended for new builds.
- The form runs fine, but future updates may require fixes.

🔹 **Tools You Use:**
- SmartForms or SAPscript pulling data via BAPI (e.g., `BAPI_PO_GETDETAIL`)
- Adobe Forms calling RFC function modules
- ALV printable outputs as interim forms

🔹 **Example Form:**
- PO Print (SmartForm) calling `BAPI_PO_GETDETAIL` for header/items.
- Delivery Note Form using a custom RFC to enrich data.

✅ **Why it’s acceptable:**
- Supported by SAP in many landscapes
- Good for brownfield systems
- Moderate upgrade risk; plan to modernize later

---

## 🟨 Level C – “Risky Legacy”

🔹 **What it means:**
- Form logic reads **internal tables** directly (e.g., `EKKO`, `EKPO`, `MARA`) or uses undocumented FMs/classes.
- No standard modification, but hidden internals are used.

🔹 **Beginner Analogy (Windows PC):**
- Your form reads raw files in `C:\Windows\System32\` instead of using approved APIs.
- It works now, but breaks easily after updates.

🔹 **Tools You Use:**
- SmartForms/SAPscript/Adobe Forms with direct SELECT statements on standard tables
- Internal function modules (not in API Hub) for data fetch
- Z-include logic embedded in form print programs

🔹 **Example Form:**
- Z-PO Print: custom program reads `EKKO` & `EKPO` directly, then prints via SmartForm.
- Custom Invoice Form using internal FM for pricing breakdown.

❗ **Why it’s risky:**
- Not upgrade-safe
- SAP may change tables/FMs anytime
- Use only as temporary; schedule refactoring

---

## 🟥 Level D – “Do Not Do This” (Modifications)

🔹 **What it means:**
- Modify standard form objects or update SAP tables during printing.
- Insert implicit enhancements changing standard print logic or events.

🔹 **Beginner Analogy (Windows PC):**
- You patch Word executable or edit registry to force behavior.
- It may work today, but next update breaks everything.

🔹 **Tools You Use:**
- Altering standard SmartForms/Adobe Forms delivered by SAP
- Enhancement spots changing standard output programs
- Z-programs that write to `EKKO/EKPO` during form printing

🔹 **Example Form:**
- Modified Standard PO Form where SAP-delivered SmartForm is edited directly.
- Print Exit that updates business data while printing.

🚫 **Why it’s bad:**
- Blocks upgrades
- Creates high technical debt
- Not supported by SAP; violates Clean Core

---

## ✅ Summary Table (Forms)

| Level | Data/Access Pattern | Form Technology | Example | Upgrade Risk |
|------:|----------------------|------------------|---------|--------------|
| 🟩 A  | Released CDS/OData only; Output Management (BRF+) | Adobe Forms, Fiori/UI5, SAP Build | PO print via `I_PurchaseOrderItem` OData → Adobe Form | ✅ Safe |
| 🟦 B  | Classic APIs (BAPI/RFC), no core mods | SmartForms/SAPscript/Adobe | SmartForm using `BAPI_PO_GETDETAIL` | ⚠️ Medium |
| 🟨 C  | Direct table reads / internal FMs | SmartForms/Adobe with custom Z logic | Z-form SELECT on `EKKO/EKPO` | ❗ High |
| 🟥 D  | Modifies standard or writes during print | Edited SAP standard forms / enhancement exits | Change SAP form or update tables in print | 🚫 Very High |

---

## ❓ Beginner FAQ (Forms)

**Q1. How do I know if a data source is “released”?**
- Check SAP API Hub or the CDS View Browser in S/4HANA. If the CDS view or OData service is listed as released/public, it’s suitable for Level A.

**Q2. Can I still use SmartForms in Clean Core?**
- Yes—if SmartForms consume released APIs (Level A) or classic BAPIs/RFCs (Level B). Avoid direct table reads (Level C) and never modify SAP-delivered SmartForms (Level D).

**Q3. What’s the difference between Output Management and NAST?**
- Output Management (OM) with BRF+ is the modern, clean-core approach for S/4HANA forms and routing. NAST is legacy; often implies Level B/C patterns. Prefer OM for Level A designs.

**Q4. Is “Adobe Forms” always Level A?**
- No. Adobe Forms is just a rendering technology. The data source decides the level:
  - Adobe + released CDS/OData → Level A
  - Adobe + BAPI/RFC → Level B
  - Adobe + direct table SELECT → Level C
  - Adobe + modifications to standard → Level D

**Q5. What metrics define “risky” for forms?**
- If your form logic touches more than 2 internal tables directly or uses undocumented FMs, consider it Level C. Any write/update during printing is Level D.

---

## 🧭 Design Guidance (Forms)

1. **Target Level A first**
   - Use Output Management + BRF+.
   - Source data via released CDS/OData.
   - Keep form logic read-only and decoupled.

2. **If Level A is unavailable, choose Level B carefully**
   - Use BAPI/RFC for retrieval; do not write in print flows.
   - Encapsulate classic calls in a wrapper and plan a roadmap to Level A.

3. **Treat Level C as temporary debt**
   - Direct table reads are quick but fragile.
   - Document all internal dependencies and create a refactor plan.

4. **Prohibit Level D for new builds**
   - No modifications to standard form objects.
   - No data changes during printing.
   - Establish governance: peer review + transport checks to catch violations.

---

## 🔍 Quick Note on BRF+, NAST, and OM

- **BRF+**: Business Rule Framework Plus – a no-code rules engine for output determination in S/4HANA.
- **NAST**: Legacy output determination framework in ECC; uses condition records and output types.
- **OM (Output Management)**: Modern framework in S/4HANA using BRF+; clean-core compliant and upgrade-safe.

