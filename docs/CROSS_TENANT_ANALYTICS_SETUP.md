# Cross-Tenant Analytics Setup

## Current State

The application now has two distinct analytics paths:

- Tenant-local analytics via the existing CDS views and `getAnalyticsData`
- Provider-wide analytics via `getCrossTenantAnalyticsData`, which enumerates subscribed tenants through `cds.xt.DeploymentService.getTenants()` and aggregates each tenant in its own CAP transaction context

This fixes the previous mismatch where documentation implied cross-tenant analytics existed, while the implementation only queried the current tenant.

## Tenant Field Population

Tenant-scoped entities are now populated from resolved request context through `TenantContext.registerMiddleware(...)` and service-level create/update hooks.

Affected runtime behavior:

- `tenant` is assigned from the current CAP/XSUAA tenant context on tenant-owned entities
- Request payloads can no longer spoof a different tenant for normal tenant-scoped writes
- Admin-managed `QuestionFlow` entries may still be created as global records by explicitly sending `tenant = null`

## Provider Analytics API

Use the following function for provider-wide analytics:

- Service: `/service/SolutionAdvisorSvcs/getCrossTenantAnalyticsData`
- Roles: `Admin`, `ServiceProviderAdmin`

Supported inputs:

- `dateFrom`
- `dateTo`
- `ricefwTypes` as JSON array string
- `cleanCoreLevels` as JSON array string
- `projectId`
- `tenantIds` as JSON array string

The function returns:

- total tenant count
- active tenant count
- global weighted KPI averages
- per-tenant KPI summary rows

## Sidecar Connectivity Requirement

Because this project uses the `with-mtx-sidecar` CAP profile, the main backend module does not host `cds.xt.DeploymentService` itself.

Production deployment must expose the sidecar URL to the backend runtime and configure these remote services:

- `cds.xt.DeploymentService`
- `cds.xt.ModelProviderService`

This repository now wires that in `mta.yaml` through backend environment properties derived from `mtx-api`.

If cross-tenant analytics fails at runtime with a DeploymentService configuration error, check that the backend module is deployed with those environment variables and that the MTX sidecar is reachable.

## Optional HANA Cross-Container Reporting View

Live HANA cross-container reporting across MTX tenant containers is not automatically provided by CAP. It requires a dedicated reporting HDI container plus dynamic grants/synonyms for subscriber containers.

This repository now supports two paths:

- Template-only reference artifacts under `db/src/provider-analytics-template/`
- Generated deployable artifacts under `db/src/provider-analytics/` via `npm run setup:cross-tenant-hana`

### Generated Artifact Flow (Deployable)

1. Set `CROSS_TENANT_BINDINGS` as a JSON array of tenant grantor bindings.
2. Run `npm run setup:cross-tenant-hana`.
3. Bind all referenced `grantorService` instances to the HDI deployer used for DB deployment.
4. Deploy DB artifacts to HANA.

Example:

```bash
export CROSS_TENANT_BINDINGS='[
	{"tenantId":"t1","grantorService":"hdi-t1-grantor","sourceObject":"ANALYTICSVIEW_AGGREGATEDSCORES"},
	{"tenantId":"t2","grantorService":"hdi-t2-grantor","sourceObject":"ANALYTICSVIEW_AGGREGATEDSCORES"}
]'
export CROSS_TENANT_READER_ROLE='TENANT_ANALYTICS_READER'
npm run setup:cross-tenant-hana
```

Generated files:

- `db/src/provider-analytics/cross-tenant-consumer.hdbgrants`
- `db/src/provider-analytics/cross-tenant-analysis.hdbsynonym`
- `db/src/provider-analytics/provider-cross-tenant-analysis.hdbview`

The implemented CAP provider analytics API is safe to use immediately. Use the generated HANA artifacts when you want database-native provider reporting instead of service-layer aggregation.