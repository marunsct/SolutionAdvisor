
# SAP Clean Core Levels for Enhancements (Beginner-Friendly Detailed Guide)

This guide explains SAP's **Clean Core** levels **A–D** for designing **Enhancements** in S/4HANA ↔ BTP projects with clear details, analogies, tools, examples, and best practices.

---

## 🟩 Level A – “Cleanest” (Gold Standard)

🔹 **What it means:**
- Use **released extension points** like released BADIs, Key User Extensibility, or ABAP Cloud.
- No changes to SAP standard code.
- Enhancements are done via safe, upgrade-proof mechanisms.

🔹 **Beginner Analogy (Windows PC):**
- You use Microsoft-approved plugins or APIs to extend Excel or Outlook.
- You never touch system DLLs or registry keys.

🔹 **Tools You Use:**
- In-App Extensibility (Custom Fields & Logic, Adapt UI)
- Released BADIs (listed in Extensibility Registry)
- ABAP Cloud (RAP-based enhancements)
- SAP BTP (Side-by-side enhancements via APIs/events)

🔹 **Example Enhancement:**
- Add a custom field to PO screen using Key User Tools.
- Implement a released BADI to add logic during PO approval.

✅ **Why it’s best:**
- Fully upgrade-safe
- SAP-supported
- Clean Core compliant
- No risk of breaking standard code

---

## 🟦 Level B – “Classic but Acceptable”

🔹 **What it means:**
- Use classic BADIs, user exits, or enhancement points that are stable but not officially released.
- No direct modification of SAP code, but uses older enhancement techniques.

🔹 **Beginner Analogy (Windows PC):**
- You use older macros or COM add-ins that still work but aren’t recommended for new builds.

🔹 **Tools You Use:**
- Classic BADIs (not listed in Extensibility Registry)
- User Exits (e.g., EXIT_SAPMM06E_012)
- Explicit Enhancement Points (classic)

🔹 **Example Enhancement:**
- Add custom logic to PO creation via a classic BADI.
- Use a user exit to validate vendor data during invoice posting.

✅ **Why it’s acceptable:**
- Still supported
- Common in brownfield systems
- Moderate upgrade risk

---

## 🟨 Level C – “Risky Legacy”

🔹 **What it means:**
- Use implicit enhancements or modifications that touch internal logic.
- Enhancements are not documented or supported officially.

🔹 **Beginner Analogy (Windows PC):**
- You inject custom code into system DLLs or use registry hacks to change behavior.

🔹 **Tools You Use:**
- Implicit Enhancements in middle of standard methods
- Z-includes inserted into SAP programs
- Custom logic inside standard function modules

🔹 **Example Enhancement:**
- Add logic inside ME21N via an implicit enhancement.
- Insert Z-code into standard SAP report via include.

❗ **Why it’s risky:**
- Not upgrade-safe
- Can break during upgrades
- Difficult to maintain

---

## 🟥 Level D – “Do Not Do This” (Modifications)

🔹 **What it means:**
- Modify SAP standard code directly.
- Change SAP-delivered programs, classes, or function modules.

🔹 **Beginner Analogy (Windows PC):**
- You rewrite parts of Windows itself to change how Excel behaves.
- It works now, but breaks with every update.

🔹 **Tools You Use:**
- Direct changes to SAP standard programs
- Modifying standard classes or methods
- Changing SAP-delivered DDIC objects

🔹 **Example Enhancement:**
- Modify SAPMM06E to add custom logic.
- Change standard PO print program to add new logic.

🚫 **Why it’s bad:**
- Blocks upgrades
- High technical debt
- Not supported by SAP
- Violates Clean Core

---

## ✅ Summary Table (Enhancements)

| Level | Enhancement Type | Tools Used | Example | Upgrade Risk |
|-------|------------------|------------|---------|--------------|
| 🟩 A | Released APIs / Key User | In-App Extensibility, Released BADIs | Add field via Custom Fields & Logic | ✅ Safe |
| 🟦 B | Classic APIs | Classic BADIs, User Exits | Validate vendor via user exit | ⚠️ Medium |
| 🟨 C | Internal / Implicit | Implicit Enhancements, Z-includes | Add logic inside ME21N | ❗ High |
| 🟥 D | Modifications | Direct code changes | Modify SAPMM06E | 🚫 Very High |

---

## ❓ Beginner FAQ (Enhancements)

**Q1. What is a “released BADI”?**
- A BADI listed in the Extensibility Registry or API Hub, officially supported by SAP.

**Q2. Can I still use user exits?**
- Yes, but they are Level B. Use only if no released BADI exists, and plan to migrate.

**Q3. What’s the difference between implicit and explicit enhancements?**
- Explicit = SAP provides a hook (safe).
- Implicit = You insert code at method end/start (risky).

**Q4. How do I check if an enhancement is clean-core compliant?**
- Use the Extensibility Registry in S/4HANA or check SAP documentation. If it’s listed as released, it’s Level A.

**Q5. How do I find implicit enhancement points?**
- In ABAP Editor (SE80/SE38), go to menu: `Edit → Enhancement Operations → Show Implicit Enhancement Options`. These appear at start/end of methods and function modules.

**Q6. How do I find explicit enhancement points?**
- In ABAP Editor, look for `ENHANCEMENT-POINT` or `ENHANCEMENT-SECTION` statements in code. SAP provides these hooks explicitly for safe enhancements.

---

## 🧭 Design Guidance (Enhancements)

1. **Start with Level A**
   - Use Key User Tools, Released BADIs, or ABAP Cloud.
   - Avoid touching standard code.

2. **Use Level B only if A is unavailable**
   - Document all classic exits used.
   - Wrap logic in reusable modules.

3. **Treat Level C as technical debt**
   - Refactor implicit enhancements to released BADIs.
   - Avoid Z-includes in standard programs.

4. **Prohibit Level D**
   - No direct changes to SAP standard.
   - Use governance tools to block transports with modified objects.

