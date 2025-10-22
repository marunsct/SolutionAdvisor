const cds = require('@sap/cds');

class AnalyticsService {
  /**
   * Get aggregated analytics data for dashboard
   * @returns {Object} Complete analytics data including KPIs and chart data
   */
  async getAnalyticsData() {
    try {
      // Get all analyses for calculations
      const analyses = await SELECT.from('sd.CleanCoreAnalysis');
      
      if (!analyses || analyses.length === 0) {
        return this._getEmptyAnalyticsData();
      }

      // Calculate KPIs
      const kpiData = this._calculateKPIs(analyses);
      
      // Prepare chart data
      const levelDistribution = this._prepareLevelDistribution(analyses);
      const trendData = await this._prepareTrendData();
      const riskMatrixData = this._prepareRiskMatrixData(analyses);
      const topObjects = this._prepareTopObjectsData(analyses);

      return {
        ...kpiData,
        levelDistribution,
        trendData,
        riskMatrixData,
        topObjects,
        totalAnalyses: analyses.length
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
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
   * Prepare time-series trend data
   * @private
   */
  async _prepareTrendData() {
    try {
      // Group analyses by month and calculate averages
      const query = `
        SELECT 
          strftime('%Y-%m', createdAt) as month,
          AVG(technicalDebtScore) as avgTD,
          AVG(cloudReadinessScore) as avgCR,
          AVG(upgradeImpactScore) as avgUI,
          COUNT(*) as analysisCount
        FROM sd_CleanCoreAnalysis
        GROUP BY strftime('%Y-%m', createdAt)
        ORDER BY month
      `;
      
      const results = await cds.run(query);
      
      return results.map(item => ({
        month: item.month,
        technicalDebt: Math.round(item.avgTD || 0),
        cloudReadiness: Math.round(item.avgCR || 0),
        upgradeImpact: Math.round(item.avgUI || 0),
        analysisCount: item.analysisCount
      }));
    } catch (error) {
      console.error('Error preparing trend data:', error);
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
      trendData: [],
      riskMatrixData: [],
      topObjects: [],
      totalAnalyses: 0
    };
  }
}

module.exports = AnalyticsService;
