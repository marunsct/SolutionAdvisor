const cds = require('@sap/cds');
const LOG = cds.log('analytics-service');
const TenantContext = require('./tenant-context');

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
   * @param {string} tenant - Request tenant ID (required)
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
  async getAnalyticsData(filters = {}, tenant) {
    try {
      if (!tenant) {
        throw new Error('tenant parameter required for analytics queries');
      }
      // Build where clause with tenant filtering and optional filters
      const whereClause = TenantContext.addTenantFilter({}, tenant);

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
        whereClause.projectConfig_ID = filters.projectId;
      }

      // Get all analyses for calculations with filters
      let analyses = await SELECT.from('sd.CleanCoreAnalysis')
        .where(whereClause);

      // Apply additional filters in JavaScript (for array-based filters)
      if (filters.ricefwTypes && filters.ricefwTypes.length > 0) {
        analyses = analyses.filter(a => filters.ricefwTypes.includes(a.objectType));
      }

      if (filters.cleanCoreLevels && filters.cleanCoreLevels.length > 0) {
        analyses = analyses.filter(a => {
          const level = this._extractLevel(a.finalRecommendation) || 'Unknown';
          return filters.cleanCoreLevels.includes(level);
        });
      }

      if (!analyses || analyses.length === 0) {
        return this._getEmptyAnalyticsData();
      }

      // Calculate KPIs
      const kpiData = this._calculateKPIs(analyses);

      // Prepare chart data
      const levelDistribution = this._prepareLevelDistribution(analyses);
      const ricefwTypeDistribution = this._prepareRicefwTypeDistribution(analyses);
      const trendData = await this._prepareTrendData(tenant);
      const riskMatrixData = this._prepareRiskMatrixData(analyses);
      const topObjects = this._prepareTopObjectsData(analyses);
      const projectComparison = await this._prepareProjectComparison(analyses);
      const yearOverYearData = await this._prepareYearOverYearData(analyses);

      return {
        ...kpiData,
        levelDistribution,
        ricefwTypeDistribution,
        trendData,
        riskMatrixData,
        topObjects,
        projectComparison,
        yearOverYearData,
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
    // Convert string scores to numbers
    const technicalDebtScore = analyses.reduce((sum, a) => {
      const score = parseFloat(a.technicalDebtScore) || 0;
      return sum + score;
    }, 0) / analyses.length;
    
    const cloudReadinessScore = analyses.reduce((sum, a) => {
      const score = parseFloat(a.cloudReadinessScore) || 0;
      return sum + score;
    }, 0) / analyses.length;
    
    const upgradeImpactScore = analyses.reduce((sum, a) => {
      const score = parseFloat(a.upgradeImpactScore) || 0;
      return sum + score;
    }, 0) / analyses.length;
    
    const compositeHealthScore = analyses.reduce((sum, a) => {
      const score = parseFloat(a.compositeHealthScore) || 0;
      return sum + score;
    }, 0) / analyses.length;

    return {
      technicalDebtScore: Math.round(technicalDebtScore),
      cloudReadinessScore: Math.round(cloudReadinessScore),
      upgradeImpactScore: Math.round(upgradeImpactScore),
      compositeHealthScore: Math.round(compositeHealthScore)
    };
  }

  /**
   * Extract clean core level from recommendation string
   * Handles formats like "Use Standard Template - Level A" or "Level A"
   * @private
   */
  _extractLevel(recommendation) {
    if (!recommendation) return 'Unknown';
    const match = recommendation.match(/Level\s+([ABCD])\b/i);
    return match ? `Level ${match[1].toUpperCase()}` : 'Unknown';
  }

  /**
   * Prepare level distribution data for donut chart
   * @private
   */
  _prepareLevelDistribution(analyses) {
    const levelCounts = {};

    analyses.forEach(analysis => {
      const level = this._extractLevel(analysis.finalRecommendation) || 'Unknown';
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
   * Prepare RICEFW type distribution data with level breakdown for stacked bar chart
   * Shows total count per object type and breaks down by Clean Core Level (A, B, C, D)
   * @private
   */
  _prepareRicefwTypeDistribution(analyses) {
    const typeNames = {
      'Reports': 'Reports',
      'Interfaces': 'Interfaces',
      'Conversions': 'Conversions',
      'Enhancements': 'Enhancements',
      'Forms': 'Forms',
      'Workflows': 'Workflows'
    };

    // Group analyses by object type and then by level
    const typeData = {};

    analyses.forEach(analysis => {
      const objectType = analysis.objectType || 'Unknown';
      const displayName = typeNames[objectType] || objectType;
      const level = this._extractLevel(analysis.finalRecommendation) || 'Unknown';

      if (!typeData[displayName]) {
        typeData[displayName] = {
          objectType: displayName,
          total: 0,
          'Level A': 0,
          'Level B': 0,
          'Level C': 0,
          'Level D': 0,
          'Unknown': 0
        };
      }

      typeData[displayName].total += 1;
      typeData[displayName][level] = (typeData[displayName][level] || 0) + 1;
    });

    // Convert to array format for VizFrame
    return Object.values(typeData);
  }

  /**
   * Prepare time-series trend data using CAP query API for database portability
   * Works with both SQLite (development) and HANA Cloud (production)
   * @private
   * @param {string} tenant - Request tenant ID
   */
  async _prepareTrendData(tenant) {
    try {
      // Use CAP query API for database portability instead of raw SQL
      // Get all analyses with tenant filter, then group in JavaScript
      const analyses = await SELECT.from('sd.CleanCoreAnalysis')
        .where(TenantContext.addTenantFilter({}, tenant))
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

        monthlyData[month].technicalDebtSum += parseFloat(analysis.technicalDebtScore) || 0;
        monthlyData[month].cloudReadinessSum += parseFloat(analysis.cloudReadinessScore) || 0;
        monthlyData[month].upgradeImpactSum += parseFloat(analysis.upgradeImpactScore) || 0;
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
      level: this._extractLevel(analysis.finalRecommendation) || 'Unknown',
      x: parseFloat(analysis.technicalDebtScore) || 0,
      y: parseFloat(analysis.cloudReadinessScore) || 0,
      size: 1
    }));
  }

  /**
   * Prepare top objects data (most complex)
   * @private
   */
    /**
   * Prepare top objects data for table display
   * @private
   */
  _prepareTopObjectsData(analyses) {
    // Calculate complexity score and sort
    const analyzedObjects = analyses.map(obj => ({
      id: obj.ID,
      ricefwId: obj.ricefwId,
      objectType: obj.objectType || 'Unknown',
      complexityScore: Math.round(((parseFloat(obj.technicalDebtScore) || 0) + (parseFloat(obj.upgradeImpactScore) || 0)) / 2),
      level: this._extractLevel(obj.finalRecommendation) || 'Unknown'
    }));

    // Sort by complexity score and return top 10
    return analyzedObjects
      .sort((a, b) => b.complexityScore - a.complexityScore)
      .slice(0, 10);
  }

  /**
   * Prepare project comparison data
   * Compares KPI metrics across different projects
   * @private
   */
  async _prepareProjectComparison(analyses) {
    try {
      // Group analyses by project
      const projectMap = {};

      analyses.forEach(analysis => {
        const projectId = analysis.projectConfig_ID;
        if (!projectMap[projectId]) {
          projectMap[projectId] = [];
        }
        projectMap[projectId].push(analysis);
      });

      // Fetch project names
      const projectIds = Object.keys(projectMap);
      const projects = await SELECT.from('sd.ProjectConfiguration').where({ ID: { in: projectIds } });
      const projectNames = {};
      projects.forEach(p => {
        projectNames[p.ID] = p.projectName;
      });

      // Calculate KPIs per project
      return Object.keys(projectMap).map(projectId => {
        const projectAnalyses = projectMap[projectId];
        const avgTechDebt = projectAnalyses.reduce((sum, a) => sum + (parseFloat(a.technicalDebtScore) || 0), 0) / projectAnalyses.length;
        const avgCloudReadiness = projectAnalyses.reduce((sum, a) => sum + (parseFloat(a.cloudReadinessScore) || 0), 0) / projectAnalyses.length;
        const avgUpgradeImpact = projectAnalyses.reduce((sum, a) => sum + (parseFloat(a.upgradeImpactScore) || 0), 0) / projectAnalyses.length;

        return {
          projectId,
          projectName: projectNames[projectId] || 'Unknown Project',
          analysisCount: projectAnalyses.length,
          technicalDebt: Math.round(avgTechDebt),
          cloudReadiness: Math.round(avgCloudReadiness),
          upgradeImpact: Math.round(avgUpgradeImpact)
        };
      }).sort((a, b) => b.analysisCount - a.analysisCount).slice(0, 5); // Top 5 projects
    } catch (error) {
      LOG.error('Error preparing project comparison:', error);
      return [];
    }
  }

  /**
   * Prepare year-over-year comparison data
   * Compares metrics between same month in different years
   * @private
   */
  async _prepareYearOverYearData(analyses) {
    try {
      if (!analyses || analyses.length === 0) {
        return [];
      }

      // Group by year and month
      const yearMonthMap = {};

      analyses.forEach(analysis => {
        if (!analysis.createdAt) return;

        const date = new Date(analysis.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const yearMonth = `${month}`;  // Month only (for comparison across years)
        const yearKey = `${year}`;

        if (!yearMonthMap[yearMonth]) {
          yearMonthMap[yearMonth] = {};
        }
        if (!yearMonthMap[yearMonth][yearKey]) {
          yearMonthMap[yearMonth][yearKey] = [];
        }

        yearMonthMap[yearMonth][yearKey].push(analysis);
      });

      // Build year-over-year comparison
      const result = [];
      Object.keys(yearMonthMap).sort().forEach(month => {
        const monthData = {
          month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(month) - 1]
        };

        Object.keys(yearMonthMap[month]).sort().forEach(year => {
          const yearAnalyses = yearMonthMap[month][year];
          const avgTechDebt = yearAnalyses.reduce((sum, a) => sum + (parseFloat(a.technicalDebtScore) || 0), 0) / yearAnalyses.length;
          const avgCloudReadiness = yearAnalyses.reduce((sum, a) => sum + (parseFloat(a.cloudReadinessScore) || 0), 0) / yearAnalyses.length;

          monthData[`technicalDebt_${year}`] = Math.round(avgTechDebt);
          monthData[`cloudReadiness_${year}`] = Math.round(avgCloudReadiness);
          monthData[`count_${year}`] = yearAnalyses.length;
        });

        result.push(monthData);
      });

      return result;
    } catch (error) {
      LOG.error('Error preparing year-over-year data:', error);
      return [];
    }
  }

  /**
   * Return empty analytics data structure
   * @private
   */

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
      projectComparison: [],
      yearOverYearData: [],
      totalAnalyses: 0
    };
  }
}

module.exports = AnalyticsService;
