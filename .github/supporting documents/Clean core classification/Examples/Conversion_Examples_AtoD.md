
# Conversion Examples by Clean Core Level (A–D)

---

## 🟩 Level A Example — Migration Cockpit
**Scenario**: Load Material Master.

**Design**:
- Use **Migration Cockpit** standard object.
- Validate via cockpit; no custom table writes.

**Why Level A?**
- Upgrade-safe; SAP-supported.

---

## 🟦 Level B Example — BAPI Posting
**Scenario**: Load open AR items.

**Design**:
- Use `BAPI_ACC_DOCUMENT_POST` in controlled batches.

**Why Level B?**
- Classic API; acceptable fallback.

---

## 🟨 Level C Example — Z-Program Writing Tables
**Scenario**: Load inventory balances.

**Design**:
- Z-program inserts into `MSEG` and `MKPF` directly.

**Why Level C?**
- Internal tables; bypasses validations.

---

## 🟥 Level D Example — Modify Posting FM
**Scenario**: Remove checks in standard FM for migration.

**Design**:
- Edit SAP FM to skip valuation checks.

**Why Level D?**
- Blocks upgrades; not supported.
