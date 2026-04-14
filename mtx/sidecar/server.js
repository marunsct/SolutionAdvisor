const cds = require('@sap/cds')
const LOG = cds.log('mtx')

/**
 * MTX Sidecar Custom Handlers
 *
 * Hooks into DeploymentService lifecycle events to:
 * - Log tenant subscription/unsubscription activity
 * - Verify seed data deployment (CSV files are automatically deployed by HDI)
 * - Handle any post-deployment setup for new tenants
 *
 * CSV seed data from db/data/ is automatically collected by ModelProviderService.getResources()
 * and deployed to each tenant's HDI container during subscribe/upgrade.
 */

cds.on('served', () => {
  const { 'cds.xt.DeploymentService': ds } = cds.services

  if (!ds) {
    LOG.warn('DeploymentService not available — skipping custom MTX handlers')
    return
  }

  // Before subscribe: validate tenant request
  ds.before('subscribe', async (req) => {
    const { tenant } = req.data
    LOG.info(`Subscribing tenant: ${tenant}`)
  })

  // After deploy: seed data has been deployed via HDI (CSV files included automatically)
  ds.after('deploy', async (result, req) => {
    const { tenant } = req.data
    LOG.info(`Database deployed for tenant ${tenant}. Seed data (CSV files) included in HDI deployment.`)

    // Verify seed data was deployed by checking key tables
    try {
      const db = await cds.connect.to('db', { tenant })
      const objectTypesCount = await db.run(
        SELECT.one.from('sd_ObjectTypes').columns('count(*) as count')
      )
      const cleanCoreLevelsCount = await db.run(
        SELECT.one.from('sd_CleanCoreLevels').columns('count(*) as count')
      )
      const questionFlowCount = await db.run(
        SELECT.one.from('sd_QuestionFlow').columns('count(*) as count')
      )

      LOG.info(`Seed data verification for tenant ${tenant}:`, {
        objectTypes: objectTypesCount?.count || 0,
        cleanCoreLevels: cleanCoreLevelsCount?.count || 0,
        questionFlow: questionFlowCount?.count || 0
      })
    } catch (err) {
      LOG.warn(`Seed data verification skipped for tenant ${tenant}:`, err.message)
    }
  })

  // After unsubscribe: log cleanup
  ds.after('unsubscribe', async (_, req) => {
    const { tenant } = req.data
    LOG.info(`Tenant ${tenant} unsubscribed. HDI container and resources cleaned up.`)
  })

  // Before upgrade: log upgrade start
  ds.before('upgrade', async (req) => {
    const { tenant } = req.data
    LOG.info(`Upgrading tenant: ${tenant}`)
  })
})

module.exports = cds.server
