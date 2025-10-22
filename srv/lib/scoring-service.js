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
     * Formula: TDS = Σ (Level Weight × Complexity Factor) / Analysis Count × 100
     * Level weights: A=0.00, B=1.00, C=3.00, D=5.00
     * Lower is better - 0 means no technical debt
     */
    calculateTechnicalDebt(decisionPaths, level) {
        if (!decisionPaths || decisionPaths.length === 0) {
            return 0.00;
        }
        
        const levelWeight = level.technicalDebtMultiplier || this.getLevelWeightByName(level.level);
        let totalWeightedScore = 0;
        
        for (const step of decisionPaths) {
            // Complexity factor based on time spent (normalized to 0-2 range)
            const complexityFactor = step.timeSpentSeconds ? Math.min(2, step.timeSpentSeconds / 60) : 1.0;
            totalWeightedScore += levelWeight * complexityFactor;
        }
        
        const score = Math.min(100, (totalWeightedScore / decisionPaths.length) * 100);
        return parseFloat(score.toFixed(2));
    }

    /**
     * Calculate Cloud Readiness Score (0-100%)
     * Formula: CRS = (Count_Level_A + 0.5 × Count_Level_B) / Total × 100
     * Higher is better - 100 means fully cloud ready
     */
    calculateCloudReadiness(analysis, level) {
        // Based on final recommendation level
        const levelScores = {
            'Level A': 100,
            'Level B': 75,
            'Level C': 50,
            'Level D': 25
        };
        
        const baseScore = levelScores[analysis.finalRecommendation] || 50;
        const levelFactor = level.cloudReadinessFactor || 0.5;
        
        // Apply level factor and ensure score is between 0-100
        const score = Math.min(100, Math.max(0, baseScore * levelFactor * 2));
        return parseFloat(score.toFixed(2));
    }

    /**
     * Calculate Upgrade Impact Score (0-100)
     * Formula: UIS = Σ (Level Weight × Custom Code Lines) / Total Lines × 100
     * Note: Since we don't track code lines, we use decision path complexity as proxy
     * Lower is better - 0 means no upgrade impact
     */
    calculateUpgradeImpact(decisionPaths, level) {
        if (!decisionPaths || decisionPaths.length === 0) {
            return 0.00;
        }
        
        const levelWeight = level.upgradeImpactMultiplier || this.getLevelWeightByName(level.level);
        
        // Estimate complexity based on number of decisions and user comments
        let totalComplexity = 0;
        for (const step of decisionPaths) {
            // Base complexity of 1, increased if user added comments (indicating complexity)
            const stepComplexity = step.userComments && step.userComments.length > 0 ? 1.5 : 1.0;
            totalComplexity += levelWeight * stepComplexity;
        }
        
        const score = Math.min(100, (totalComplexity / decisionPaths.length) * 20);
        return parseFloat(score.toFixed(2));
    }
    
    /**
     * Get standard level weights
     */
    getLevelWeightByName(levelName) {
        const weights = {
            'Level A': 0.00,
            'Level B': 1.00,
            'Level C': 3.00,
            'Level D': 5.00
        };
        return weights[levelName] || 1.00;
    }

    /**
     * Calculate Composite Health Score (0-100)
     * Formula: CHS = (100 - TDS) × 0.4 + CRS × 0.3 + (100 - UIS) × 0.3
     * Higher is better - weighted average of all scores
     * Weights: Technical Debt 40%, Cloud Readiness 30%, Upgrade Impact 30%
     */
    calculateCompositeHealth(technicalDebt, cloudReadiness, upgradeImpact) {
        // Invert technical debt and upgrade impact (lower is better for these)
        const invertedTechnicalDebt = 100 - technicalDebt;
        const invertedUpgradeImpact = 100 - upgradeImpact;
        
        // Weighted average: 40% tech debt, 30% cloud readiness, 30% upgrade impact
        const composite = (
            invertedTechnicalDebt * 0.4 +
            cloudReadiness * 0.3 +
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
