
# Interface Examples by Clean Core Level (A–D)

---

## 🟩 Level A Example — BTP iFlow Using Released API
**Scenario**: Sync Business Partner data from legacy system.

**Design**:
- Use **SAP API Hub** OData service for Business Partner.
- Orchestrate via **BTP Integration Suite** iFlow.

**Why Level A?**
- Uses released API; upgrade-safe; clean-core compliant.

---

## 🟦 Level B Example — IDoc Integration
**Scenario**: Send Purchase Orders from external system.

**Design**:
- Use **ORDERS05 IDoc** inbound processing.
- Standard FM posts PO; error handling via IDoc status.

**Why Level B?**
- Classic interface; stable but not modern.

---

## 🟨 Level C Example — File Interface Writing Tables
**Scenario**: Load stock data from CSV.

**Design**:
- Z-program reads CSV and updates `MSEG` directly.

**Why Level C?**
- Direct table writes; bypasses validations; high risk.

---

## 🟥 Level D Example — Modify IDoc Basic Type
**Scenario**: Add custom segment to ORDERS05 basic type.

**Design**:
- Change standard IDoc structure and inbound FM.

**Why Level D?**
- Blocks upgrades; violates Clean Core.
