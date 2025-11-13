
# Enhancement Examples by Clean Core Level (A–D)

---

## 🟩 Level A Example — Released BADI via Key User Tools
**Scenario**: Add custom logic during Purchase Order approval.

**Design**:
- Implement a **released BADI** (e.g., `MM_PUR_S4_PO_APPROVAL`) listed in Extensibility Registry.
- Add logic using **Custom Fields & Logic** (Key User Tool) without touching standard code.

**Why Level A?**
- Uses officially released enhancement point.
- Upgrade-safe and SAP-supported.

---

## 🟦 Level B Example — Classic User Exit
**Scenario**: Validate vendor data during invoice posting.

**Design**:
- Use **classic user exit** `EXIT_SAPLF048_001` to check vendor fields.
- No direct table writes; logic encapsulated in exit.

**Why Level B?**
- Stable but not officially released; acceptable for brownfield.

---

## 🟨 Level C Example — Implicit Enhancement in Standard Method
**Scenario**: Add logic inside ME21N transaction.

**Design**:
- Insert **implicit enhancement** at end of standard method to enforce custom checks.

**Why Level C?**
- Risky; depends on internal code structure; breaks easily after upgrades.

---

## 🟥 Level D Example — Modify Standard Program
**Scenario**: Change PO creation logic in SAPMM06E.

**Design**:
- Directly edit SAP standard program to add custom fields and logic.

**Why Level D?**
- Violates Clean Core; blocks upgrades; not supported by SAP.
