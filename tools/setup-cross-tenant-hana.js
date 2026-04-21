#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'db', 'src', 'provider-analytics');

const bindingsRaw = process.env.CROSS_TENANT_BINDINGS;
const roleName = process.env.CROSS_TENANT_READER_ROLE || 'TENANT_ANALYTICS_READER';

function fail(message) {
  console.error(`\n[setup-cross-tenant-hana] ${message}`);
  process.exit(1);
}

if (!bindingsRaw) {
  fail('Missing CROSS_TENANT_BINDINGS environment variable.\n' +
    'Expected JSON array, e.g.\n' +
    "  CROSS_TENANT_BINDINGS='[{\"tenantId\":\"t1\",\"grantorService\":\"hdi-t1-grantor\",\"sourceObject\":\"ANALYTICSVIEW_AGGREGATEDSCORES\"}]'");
}

let bindings;
try {
  bindings = JSON.parse(bindingsRaw);
} catch (error) {
  fail(`CROSS_TENANT_BINDINGS is not valid JSON: ${error.message}`);
}

if (!Array.isArray(bindings) || bindings.length === 0) {
  fail('CROSS_TENANT_BINDINGS must be a non-empty JSON array.');
}

const normalized = bindings.map((item, index) => {
  const tenantId = item?.tenantId;
  const grantorService = item?.grantorService;
  const sourceObject = item?.sourceObject || 'ANALYTICSVIEW_AGGREGATEDSCORES';

  if (!tenantId || !grantorService) {
    fail(`Binding at index ${index} must include tenantId and grantorService.`);
  }

  const token = tenantId.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
  return { tenantId, grantorService, sourceObject, token };
});

const grants = {};
for (const item of normalized) {
  grants[item.grantorService] = {
    object_owner: { schema_roles: [roleName] },
    application_user: { schema_roles: [roleName] }
  };
}

const synonyms = {};
for (const item of normalized) {
  synonyms[`TENANT_ANALYTICS_${item.token}`] = {
    target: {
      object: item.sourceObject,
      'schema.configure': `${item.grantorService}/schema`
    }
  };
}

const viewSelects = normalized.map((item) => {
  const synonym = `TENANT_ANALYTICS_${item.token}`;
  return `SELECT '${item.tenantId}' AS \"TENANT\", src.* FROM \"${synonym}\" AS src`;
});

const viewSql = [
  'VIEW "V_PROVIDER_CROSS_TENANT_ANALYTICS" AS',
  viewSelects.join('\nUNION ALL\n')
].join('\n');

fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(
  path.join(outputDir, 'cross-tenant-consumer.hdbgrants'),
  `${JSON.stringify(grants, null, 2)}\n`,
  'utf8'
);

fs.writeFileSync(
  path.join(outputDir, 'cross-tenant-analysis.hdbsynonym'),
  `${JSON.stringify(synonyms, null, 2)}\n`,
  'utf8'
);

fs.writeFileSync(
  path.join(outputDir, 'provider-cross-tenant-analysis.hdbview'),
  `${viewSql}\n`,
  'utf8'
);

console.log('[setup-cross-tenant-hana] Generated cross-container artifacts:');
console.log(`  - ${path.relative(rootDir, path.join(outputDir, 'cross-tenant-consumer.hdbgrants'))}`);
console.log(`  - ${path.relative(rootDir, path.join(outputDir, 'cross-tenant-analysis.hdbsynonym'))}`);
console.log(`  - ${path.relative(rootDir, path.join(outputDir, 'provider-cross-tenant-analysis.hdbview'))}`);
console.log('[setup-cross-tenant-hana] Bind all listed grantor services to your HDI deployer module before deploying to HANA.');
