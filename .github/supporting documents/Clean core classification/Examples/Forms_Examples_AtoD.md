
# Forms Examples by Clean Core Level (A–D)

---

## 🟩 Level A Example — Adobe Form via Output Management
**Scenario**: Print PO PDF using released CDS.

**Design**:
- Use **Output Management (BRF+)** with Adobe Form.
- Data from released CDS view `I_PurchaseOrderItem`.

**Why Level A?**
- Upgrade-safe; uses released APIs.

---

## 🟦 Level B Example — SmartForm Using BAPI
**Scenario**: Print PO using SmartForm.

**Design**:
- Fetch data via `BAPI_PO_GETDETAIL`.
- Render SmartForm; no table writes.

**Why Level B?**
- Classic API; acceptable fallback.

---

## 🟨 Level C Example — SmartForm with Direct Table Access
**Scenario**: Custom PO print form.

**Design**:
- SELECT from `EKKO` and `EKPO` inside form logic.

**Why Level C?**
- Internal tables; high upgrade risk.

---

## 🟥 Level D Example — Modify Standard Form
**Scenario**: Edit SAP-delivered PO SmartForm.

**Design**:
- Change standard form object directly.

**Why Level D?**
- Blocks upgrades; not supported.
