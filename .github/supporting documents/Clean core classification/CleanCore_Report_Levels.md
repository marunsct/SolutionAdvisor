
# Clean Core Levels A–D for SAP Report Design (Beginner Guide)

This guide explains SAP's **Clean Core** levels **A–D** for designing reports in S/4HANA ↔ BTP projects using very simple language and real-world examples.

> **Why Clean Core?** Keep custom work *outside* or *safely on* the core so upgrades stay smooth and systems remain stable. SAP's updated guidance classifies extensions into A–D based on how clean and upgrade-safe they are. [ASUG overview](https://www.asug.com/insights/sap-updates-clean-core-guidance-to-help-customers-clarify-extensibility-criteria) and community/blog summaries explain the model and intent. [Community post](https://community.sap.com/t5/technology-blog-posts-by-sap/business-excellence-with-sap-s-new-clean-core-extensibility-levels-why-what/ba-p/14191481), [Avotechs explainer](https://avotechs.com/blog/what-is-clean-core-a-d-extensibility-model/).

---

## 🔍 What is an API in SAP?

Think of an API as a **safe doorway** to read data or run functions without touching SAP’s internals. 

- **Released API**: Official, documented, upgrade-safe (e.g., Public CDS/OData in SAP API Hub). → **Preferred**. 
- **Classic API**: Older, widely-used (BAPI/RFC/ALV). Generally stable but without a formal stability contract. → **Acceptable fallback**. 
- **Internal API**: Undocumented tables, views, or function modules; not intended for direct use. → **Risky**.

References: [ASUG](https://www.asug.com/insights/sap-updates-clean-core-guidance-to-help-customers-clarify-extensibility-criteria), [Sachin Artani blog](https://sachinartani.com/blog/clean-core-extensibility-4-level-model), [LinkedIn explainer](https://www.linkedin.com/pulse/sap-clean-core-extensibility-levels-d-explained-yathish-kumar-r-ns85f).

---

## 🟩 Level A – “Cleanest” (Gold Standard)

🔹 **What it means:**
- You use only officially released APIs and tools.
- No direct access to SAP database tables.
- No modifications to SAP standard code.

🔹 **Beginner Analogy (Windows PC):**
- You build a Windows app using Microsoft-approved tools like .NET or PowerShell cmdlets.
- You never touch system files or registry directly.
- Your app is safe, clean, and works even after Windows updates.

🔹 **Tools You Use:**
- CDS Views from SAP API Hub (e.g., `I_SalesOrderItem`)
- OData Services
- SAP BTP apps (CAP/RAP)
- SAP Build dashboards
- SAP Analytics Cloud

🔹 **Example Report:**
- You build a Fiori app that shows sales orders using the released CDS view `I_SalesOrderItem`.
- You use SAP Analytics Cloud to visualize data from a public OData API exposed by S/4HANA.

✅ **Why it’s best:**
- Fully upgrade-safe
- No risk of breaking SAP during upgrades
- SAP supports it officially
- Clean Core compliant and future-proof

---

## 🟦 Level B – “Classic but Acceptable”

🔹 **What it means:**
- You use classic APIs like BAPIs or RFCs.
- These are stable but not officially released in API Hub.
- No modifications to SAP standard code.

🔹 **Beginner Analogy (Windows PC):**
- You use older Windows DLLs or COM objects that Microsoft still supports but doesn’t recommend for new apps.
- Your app works, but future updates might require changes.

🔹 **Tools You Use:**
- BAPIs (e.g., `BAPI_PO_GETDETAIL`)
- RFCs
- ALV Reports
- Web Dynpro

🔹 **Example Report:**
- You create an ALV report that calls `BAPI_PO_GETDETAIL` to fetch purchase order details.
- You build a Fiori app that uses a custom RFC to get data from S/4HANA.

✅ **Why it’s acceptable:**
- Still supported by SAP
- Easier for brownfield systems
- Upgrade risk is moderate

---

## 🟨 Level C – “Risky Legacy”

🔹 **What it means:**
- You access internal SAP tables or undocumented function modules directly.
- These are not exposed via released APIs.
- No modifications to SAP standard code, but uses hidden internals.

🔹 **Beginner Analogy (Windows PC):**
- You open Windows system folders and read files directly instead of using official APIs.
- Works now, but breaks easily after updates.

🔹 **Tools You Use:**
- Direct SELECT on tables like `EKPO`, `MARA`
- Undocumented function modules
- Custom Z-reports

🔹 **Example Report:**
- You write a Z-report that does `SELECT * FROM EKPO` to get PO items.
- You use a function module like `ME_READ_PO_FOR_REPORTING` that’s not in API Hub.

❗ **Why it’s risky:**
- Not upgrade-safe
- SAP may change these tables or functions anytime
- Should only be temporary

---

## 🟥 Level D – “Do Not Do This” (Modifications)

🔹 **What it means:**
- You modify SAP standard code or tables.
- You use implicit enhancements or direct updates to SAP tables.

🔹 **Beginner Analogy (Windows PC):**
- You edit Windows system files or registry keys to change OS behavior.
- Works now, but future updates will break everything.

🔹 **Tools You Use:**
- Modifying standard SAP reports
- Enhancement spots altering standard logic
- Direct UPDATE/DELETE on SAP tables

🔹 **Example Report:**
- You change the standard PO report to add a new field.
- You write a Z-program that updates `EKPO` directly.

🚫 **Why it’s bad:**
- Breaks upgrade compatibility
- High technical debt
- SAP will not support it

---

## ✅ Summary Table

| Level | What You Use | Example | Upgrade Risk |
|-------|--------------|---------|--------------|
| 🟩 A | Released APIs, CDS, BTP | Fiori app using `I_SalesOrderItem` | ✅ Safe |
| 🟦 B | Classic APIs (BAPI, RFC) | ALV report using `BAPI_PO_GETDETAIL` | ⚠️ Medium |
| 🟨 C | Internal tables/functions | Z-report with `SELECT * FROM EKPO` | ❗ High |
| 🟥 D | Modifications to SAP code | Change standard report or update SAP table | 🚫 Very High |
---

## 🧠 Beginner FAQ

**Q: What is an “internal table” here?**  
- In ABAP code: a temporary program table → *fine*.  
- In Clean Core context: *internal SAP database tables* accessed directly (e.g., `EKPO`) → *risky*.

**Q: What does “RFC wrapped in CDS” mean?**  
- Instead of calling an RFC directly from UI, expose its data via a CDS view/OData → cleaner, reusable access (still Level B if the RFC is classic).

**Q: How do I check if an API is released?**  
- Look it up in **SAP API Hub** or **CDS View Browser** in S/4. If it’s public/released, it’s Level A material.

---

## 🧭 Design Guidance

1. **Aim for Level A** first (CDS/RAP/BTP; public APIs).  
2. **Use Level B** where A isn’t available; encapsulate classic APIs and plan modernization.  
3. **Treat Level C** as temporary; avoid direct table reads in new designs.  
4. **Eliminate Level D**; never modify standard for reporting.

