# Provider Analytics HANA Template

These files are templates for an optional provider-level HANA reporting container.

They are intentionally stored as `.example` artifacts so they are not activated by HDI until tenant-specific grantor services and container bindings are available.

Use this template when you want a database-native cross-container reporting view across MTX tenant containers.

For a concrete setup, use the generator script in `tools/setup-cross-tenant-hana.js`:

```bash
npm run setup:cross-tenant-hana
```

The script generates deployable artifacts in `db/src/provider-analytics/` based on `CROSS_TENANT_BINDINGS`.