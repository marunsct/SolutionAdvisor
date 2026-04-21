const cds = require('@sap/cds');
const LOG = cds.log('provider-analytics-service');
const AnalyticsService = require('./analytics-service');

class ProviderAnalyticsService {
  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  async getCrossTenantAnalyticsData(filters = {}, requestedTenants = []) {
    const tenants = requestedTenants.length > 0
      ? requestedTenants.filter(Boolean)
      : await this._getSubscribedTenants();

    if (tenants.length === 0) {
      return this._emptyResult();
    }

    const tenantAnalytics = [];

    for (const tenant of tenants) {
      try {
        const tenantSnapshot = await cds.tx({ tenant }, async (tx) => {
          const analytics = await this.analyticsService.getAnalyticsData(filters, tenant);
          const projectCountRow = await tx.run(
            SELECT.one.from('sd.ProjectConfiguration').columns('count(*) as count')
          );

          return {
            tenant,
            totalAnalyses: analytics.totalAnalyses || 0,
            projectCount: projectCountRow?.count || 0,
            technicalDebtScore: analytics.technicalDebtScore || 0,
            cloudReadinessScore: analytics.cloudReadinessScore || 0,
            upgradeImpactScore: analytics.upgradeImpactScore || 0,
            compositeHealthScore: analytics.compositeHealthScore || 0
          };
        });

        tenantAnalytics.push(tenantSnapshot);
      } catch (error) {
        LOG.warn(`Skipping tenant ${tenant} for provider analytics`, error.message);
      }
    }

    if (tenantAnalytics.length === 0) {
      return this._emptyResult();
    }

    const totalAnalyses = tenantAnalytics.reduce((sum, item) => sum + item.totalAnalyses, 0);
    const activeTenants = tenantAnalytics.filter((item) => item.totalAnalyses > 0 || item.projectCount > 0).length;

    return {
      totalTenants: tenantAnalytics.length,
      activeTenants,
      totalAnalyses,
      technicalDebtScore: this._weightedAverage(tenantAnalytics, 'technicalDebtScore', totalAnalyses),
      cloudReadinessScore: this._weightedAverage(tenantAnalytics, 'cloudReadinessScore', totalAnalyses),
      upgradeImpactScore: this._weightedAverage(tenantAnalytics, 'upgradeImpactScore', totalAnalyses),
      compositeHealthScore: this._weightedAverage(tenantAnalytics, 'compositeHealthScore', totalAnalyses),
      tenantAnalytics: tenantAnalytics.sort((left, right) => right.totalAnalyses - left.totalAnalyses)
    };
  }

  async _getSubscribedTenants() {
    try {
      const deploymentService = await cds.connect.to('cds.xt.DeploymentService');
      const tenants = await deploymentService.getTenants();
      return Array.isArray(tenants) ? tenants.filter(Boolean) : [];
    } catch (error) {
      LOG.error('Unable to resolve subscribed tenants from MTX sidecar', error.message);
      throw new Error('MTX DeploymentService is not configured for the backend runtime. Configure cds.xt.DeploymentService as a remote sidecar service before using cross-tenant analytics.');
    }
  }

  _weightedAverage(items, fieldName, totalAnalyses) {
    if (!totalAnalyses) {
      return 0;
    }

    const weightedTotal = items.reduce((sum, item) => {
      return sum + ((item[fieldName] || 0) * item.totalAnalyses);
    }, 0);

    return Math.round(weightedTotal / totalAnalyses);
  }

  _emptyResult() {
    return {
      totalTenants: 0,
      activeTenants: 0,
      totalAnalyses: 0,
      technicalDebtScore: 0,
      cloudReadinessScore: 0,
      upgradeImpactScore: 0,
      compositeHealthScore: 0,
      tenantAnalytics: []
    };
  }
}

module.exports = ProviderAnalyticsService;