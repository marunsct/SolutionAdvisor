const cds = require('@sap/cds');

/**
 * Scoring Service - Calculates technical debt, cloud readiness, and upgrade impact scores
 */
class ScoringService {
    constructor(srv) {
        this.srv = srv;
    }

    /**
     * Calculate all scores for an analysis
     */
    async calculateScores(analysisID) {
        const { CleanCoreAnalysis, DecisionPath, CleanCoreLevels } = cds.entities('sd');
        
        // Get the analysis
        const analysis = await SELECT.one.from(CleanCoreAnalysis)
            .where({ ID: analysisID });
        
        if (!analysis) {
            throw new Error('Analysis not found');
        }
        
        // Get decision paths
        const decisionPaths = await SELECT.from(DecisionPath)
            .where({ analysis_ID: analysisID })
            .orderBy('stepOrder');
        
        // Get clean core level weights
        const level = await SELECT.one.from(CleanCoreLevels)
            .where({ level: analysis.finalRecommendation });
        
        if (!level) {
            return this.getDefaultScores();
        }
        
        // Calculate individual scores
        const technicalDebtScore = this.calculateTechnicalDebt(decisionPaths, level);
        const cloudReadinessScore = this.calculateCloudReadiness(analysis, level);
        const upgradeImpactScore = this.calculateUpgradeImpact(decisionPaths, level);
        const compositeHealthScore = this.calculateCompositeHealth(
            technicalDebtScore,
            cloudReadinessScore,
            upgradeImpactScore
        );
        
        return {
            technicalDebt: technicalDebtScore,
            cloudReadiness: cloudReadinessScore,
            upgradeImpact: upgradeImpactScore,
            compositeHealth: compositeHealthScore
        };
    }

    /**
     * Calculate Technical Debt Score (0-100)
     * Lower is better - 0 means no technical debt
     */
    calculateTechnicalDebt(decisionPaths, level) {
        const baseScore = 10; // Base score
        const complexityFactor = decisionPaths.length * 0.5; // More questions = more complexity
        const levelMultiplier = level.technicalDebtMultiplier || 1;
        
        const score = Math.min(100, baseScore + complexityFactor * levelMultiplier);
        return parseFloat(score.toFixed(2));
    }

    /**
     * Calculate Cloud Readiness Score (0-100%)
     * Higher is better - 100 means fully cloud ready
     */
    calculateCloudReadiness(analysis, level) {
        const levelFactor = level.cloudReadinessFactor || 0.5;
        const deploymentBonus = this.getDeploymentBonus(analysis.projectConfig);
        
        const score = Math.min(100, levelFactor * 100 + deploymentBonus);
        return parseFloat(score.toFixed(2));
    }

    /**
     * Calculate Upgrade Impact Score (0-100)
     * Lower is better - 0 means no upgrade impact
     */
    calculateUpgradeImpact(decisionPaths, level) {
        const baseScore = 5;
        const customizationDepth = decisionPaths.length * 0.3;
        const levelMultiplier = level.upgradeImpactMultiplier || 1;
        
        const score = Math.min(100, baseScore + customizationDepth * levelMultiplier);
        return parseFloat(score.toFixed(2));
    }

    /**
     * Calculate Composite Health Score (0-100)
     * Higher is better - weighted average of all scores
     */
    calculateCompositeHealth(technicalDebt, cloudReadiness, upgradeImpact) {
        // Invert technical debt and upgrade impact (lower is better)
        const invertedTechnicalDebt = 100 - technicalDebt;
        const invertedUpgradeImpact = 100 - upgradeImpact;
        
        // Weighted average: 30% tech debt, 40% cloud readiness, 30% upgrade impact
        const composite = (
            invertedTechnicalDebt * 0.3 +
            cloudReadiness * 0.4 +
            invertedUpgradeImpact * 0.3
        );
        
        return parseFloat(composite.toFixed(2));
    }

    /**
     * Get deployment type bonus for cloud readiness
     */
    getDeploymentBonus(projectConfig) {
        if (!projectConfig) return 0;
        
        // This would typically fetch project config from database
        // For now, return a default bonus
        return 10;
    }

    /**
     * Get default scores when level is not found
     */
    getDefaultScores() {
        return {
            technicalDebt: 50.00,
            cloudReadiness: 50.00,
            upgradeImpact: 50.00,
            compositeHealth: 50.00
        };
    }
}

module.exports = ScoringService;
