const cds = require('@sap/cds');
const LOG = cds.log('analytics-service');

/**
 * Analytics Service - Aggregates and computes dashboard metrics
 * 
 * @class AnalyticsService
 * @description
 * Provides aggregated analytics data for the Analytics Dashboard view.
 * Computes KPIs, distributions, trends, risk matrices, and top objects
 * based on completed Clean Core analyses with optional date/filter ranges.
 * 
 * KPIs calculated:
 * - Total analyses count
 * - Average technical debt score
 * - Average cloud readiness score
 * - Average upgrade impact score
 * - Average composite health score
 * 
 * Chart data:
 * - Clean Core level distribution (A/B/C/D counts)
 * - RICEFW type distribution (R/I/C/E/F/W counts)
 * - Score trends over time (monthly aggregates)
 * - Risk matrix (technical debt vs cloud readiness scatter)
 * - Top 10 complex objects (highest technical debt)
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */
class AnalyticsService {
  /**
   * Get aggregated analytics data for dashboard
   * 
   * @async
   * @param {Object} [filters={}] - Optional filters
   * @param {string} [filters.dateFrom] - Start date (ISO format)
   * @param {string} [filters.dateTo] - End date (ISO format)
   * @param {Array<string>} [filters.ricefwTypes] - Object type codes to include
   * @param {Array<string>} [filters.cleanCoreLevels] - Levels to include (A/B/C/D)
   * @param {string} [filters.projectId] - Filter by specific project UUID
   * 
   * @returns {Promise<Object>} Complete analytics payload
   * @returns {number} totalAnalyses - Total count of analyses
   * @returns {number} technicalDebtScore - Average technical debt (0-100)
   * @returns {number} cloudReadinessScore - Average cloud readiness % (0-100)
   * @returns {number} upgradeImpactScore - Average upgrade impact (0-100)
   * @returns {number} compositeHealthScore - Average health score (0-100)
   * @returns {Array<Object>} levelDistribution - Clean Core level counts
   * @returns {Array<Object>} ricefwTypeDistribution - RICEFW type counts
   * @returns {Array<Object>} trendData - Monthly trend data
   * @returns {Array<Object>} riskMatrixData - Risk scatter plot data
   * @returns {Array<Object>} topObjects - Top 10 complex objects
   * 
   * @description
   * Main entry point for dashboard analytics. Applies tenant filtering,
   * date ranges, and type filters. Returns empty structure if no data found.
   */
  async getAnalyticsData(filters = {}) {
    try {
      // Build where clause with tenant filtering and optional filters
      const whereClause = { tenant: cds.context.tenant || 'default' };
      
      // Add date range filter
      if (filters.dateFrom) {
        whereClause.createdAt = { '>=': filters.dateFrom };
      }
      if (filters.dateTo) {
        if (whereClause.createdAt) {
          whereClause.createdAt = { '>=': filters.dateFrom, '<=': filters.dateTo };
        } else {
          whereClause.createdAt = { '<=': filters.dateTo };
        }
      }
      
      // Add project filter
      if (filters.projectId) {
        whereClause.project_ID = filters.projectId;
      }
      
      // Get all analyses for calculations with filters
      let analyses = await SELECT.from('sd.CleanCoreAnalysis')
        .where(whereClause);
      
      // Apply additional filters in JavaScript (for array-based filters)
      if (filters.ricefwTypes && filters.ricefwTypes.length > 0) {
        analyses = analyses.filter(a => filters.ricefwTypes.includes(a.objectType_code));
      }
      
      if (filters.cleanCoreLevels && filters.cleanCoreLevels.length > 0) {
        analyses = analyses.filter(a => filters.cleanCoreLevels.includes(a.recommendedLevel));
      }
      
      if (!analyses || analyses.length === 0) {
        return this._getEmptyAnalyticsData();
      }

      // Calculate KPIs
      const kpiData = this._calculateKPIs(analyses);
      
      // Prepare chart data
      const levelDistribution = this._prepareLevelDistribution(analyses);
      const ricefwTypeDistribution = this._prepareRicefwTypeDistribution(analyses);
      const trendData = await this._prepareTrendData();
      const riskMatrixData = this._prepareRiskMatrixData(analyses);
      const topObjects = this._prepareTopObjectsData(analyses);

      return {
        ...kpiData,
        levelDistribution,
        ricefwTypeDistribution,
        trendData,
        riskMatrixData,
        topObjects,
        totalAnalyses: analyses.length
      };
    } catch (error) {
      LOG.error('Error getting analytics data:', error);
      throw error;
    }
  }

  /**
   * Calculate KPI metrics
   * @private
   */
  _calculateKPIs(analyses) {
    const technicalDebtScore = analyses.reduce((sum, a) => sum + (a.technicalDebtScore || 0), 0) / analyses.length;
    const cloudReadinessScore = analyses.reduce((sum, a) => sum + (a.cloudReadinessScore || 0), 0) / analyses.length;
    const upgradeImpactScore = analyses.reduce((sum, a) => sum + (a.upgradeImpactScore || 0), 0) / analyses.length;
    const compositeHealthScore = analyses.reduce((sum, a) => sum + (a.compositeHealthScore || 0), 0) / analyses.length;

    return {
      technicalDebtScore: Math.round(technicalDebtScore),
      cloudReadinessScore: Math.round(cloudReadinessScore),
      upgradeImpactScore: Math.round(upgradeImpactScore),
      compositeHealthScore: Math.round(compositeHealthScore)
    };
  }

  /**
   * Prepare level distribution data for donut chart
   * @private
   */
  _prepareLevelDistribution(analyses) {
    const levelCounts = {};
    
    analyses.forEach(analysis => {
      const level = analysis.recommendedLevel || 'Unknown';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });

    const total = analyses.length;
    
    return Object.keys(levelCounts).map(level => ({
      level,
      count: levelCounts[level],
      percentage: Math.round((levelCounts[level] / total) * 100)
    }));
  }

  /**
   * Prepare RICEFW type distribution data for bar chart
   * @private
   */
  _prepareRicefwTypeDistribution(analyses) {
    const typeCounts = {};
    const typeNames = {
      'Reports': 'Reports',
      'Interfaces': 'Interfaces',
      'Conversions': 'Conversions',
      'Enhancements': 'Enhancements',
      'Forms': 'Forms',
      'Workflows': 'Workflows'
    };
    
    analyses.forEach(analysis => {
      const objectType = analysis.objectType_code || 'Unknown';
      typeCounts[objectType] = (typeCounts[objectType] || 0) + 1;
    });

    const total = analyses.length;
    
    return Object.keys(typeCounts).map(type => ({
      objectType: typeNames[type] || type,
      count: typeCounts[type],
      percentage: Math.round((typeCounts[type] / total) * 100)
    }));
  }

  /**
   * Prepare time-series trend data using CAP query API for database portability
   * Works with both SQLite (development) and HANA Cloud (production)
   * @private
   */
  async _prepareTrendData() {
    try {
      // Use CAP query API for database portability instead of raw SQL
      // Get all analyses with tenant filter, then group in JavaScript
      const analyses = await SELECT.from('sd.CleanCoreAnalysis')
        .where({ tenant: cds.context.tenant || 'default' })
        .orderBy('createdAt');
      
      if (!analyses || analyses.length === 0) {
        return [];
      }
      
      // Group by year-month in JavaScript for portability
      const monthlyData = {};
      analyses.forEach(analysis => {
        if (!analysis.createdAt) return;
        
        const date = new Date(analysis.createdAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[month]) {
          monthlyData[month] = {
            technicalDebtSum: 0,
            cloudReadinessSum: 0,
            upgradeImpactSum: 0,
            count: 0
          };
        }
        
        monthlyData[month].technicalDebtSum += analysis.technicalDebtScore || 0;
        monthlyData[month].cloudReadinessSum += analysis.cloudReadinessScore || 0;
        monthlyData[month].upgradeImpactSum += analysis.upgradeImpactScore || 0;
        monthlyData[month].count++;
      });
      
      // Convert to array and calculate averages
      return Object.keys(monthlyData).sort().map(month => ({
        month,
        technicalDebt: Math.round(monthlyData[month].technicalDebtSum / monthlyData[month].count),
        cloudReadiness: Math.round(monthlyData[month].cloudReadinessSum / monthlyData[month].count),
        upgradeImpact: Math.round(monthlyData[month].upgradeImpactSum / monthlyData[month].count),
        analysisCount: monthlyData[month].count
      }));
    } catch (error) {
      LOG.error('Error preparing trend data:', error);
      // Return empty array if trend data fails
      return [];
    }
  }

  /**
   * Prepare risk matrix scatter plot data
   * @private
   */
  _prepareRiskMatrixData(analyses) {
    return analyses.map(analysis => ({
      id: analysis.ID,
      ricefwId: analysis.ricefwId,
      level: analysis.recommendedLevel || 'Unknown',
      x: analysis.technicalDebtScore || 0,
      y: analysis.cloudReadinessScore || 0,
      size: 1
    }));
  }

  /**
   * Prepare top objects data (most complex)
   * @private
   */
  _prepareTopObjectsData(analyses) {
    // Calculate complexity score and sort
    const analyzedObjects = analyses.map(obj => ({
      id: obj.ID,
      ricefwId: obj.ricefwId,
      objectType: obj.objectType_code || 'Unknown',
      complexityScore: Math.round(((obj.technicalDebtScore || 0) + (obj.upgradeImpactScore || 0)) / 2),
      level: obj.recommendedLevel || 'Unknown'
    }));

    // Sort by complexity score and return top 10
    return analyzedObjects
      .sort((a, b) => b.complexityScore - a.complexityScore)
      .slice(0, 10);
  }

  /**
   * Return empty analytics data structure
   * @private
   */
  _getEmptyAnalyticsData() {
    return {
      technicalDebtScore: 0,
      cloudReadinessScore: 0,
      upgradeImpactScore: 0,
      compositeHealthScore: 0,
      levelDistribution: [],
      ricefwTypeDistribution: [],
      trendData: [],
      riskMatrixData: [],
      topObjects: [],
      totalAnalyses: 0
    };
  }
}

module.exports = AnalyticsService;
