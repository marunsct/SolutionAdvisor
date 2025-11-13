
# Workflow Examples by Clean Core Level (A–D)

---

## 🟩 Level A Example — Flexible Workflow
**Scenario**: PO approval process.

**Design**:
- Configure **Flexible Workflow** in Fiori.
- Use SBPA for escalations; consume released events.

**Why Level A?**
- Config-driven; upgrade-safe.

---

## 🟦 Level B Example — Classic SAP Workflow
**Scenario**: Invoice approval.

**Design**:
- Use WS template with BAdIs for custom logic.

**Why Level B?**
- Classic workflow engine; acceptable for brownfield.

---

## 🟨 Level C Example — Z-Workflow Updating Tables
**Scenario**: Custom workflow for credit memo.

**Design**:
- Z-program updates status in `BKPF` and sends email.

**Why Level C?**
- Direct table updates; high risk.

---

## 🟥 Level D Example — Modify Standard Workflow Template
**Scenario**: Change SAP-delivered PO workflow logic.

**Design**:
- Edit standard WS template and runtime classes.

**Why Level D?**
- Blocks upgrades; violates Clean Core.
