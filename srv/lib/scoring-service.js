const cds = require('@sap/cds');

/**
 * Scoring Service - Calculates Clean Core quality metrics
 * 
 * @class ScoringService
 * @description
 * Computes four key scoring metrics for Clean Core analyses:
 * 1. Technical Debt Score (0-100, lower is better)
 * 2. Cloud Readiness Score (0-100%, higher is better)
 * 3. Upgrade Impact Score (0-100, lower is better)
 * 4. Composite Health Score (0-100, higher is better)
 * 
 * Scoring formulas are based on:
 * - Clean Core Level (A/B/C/D) with multipliers from CleanCoreLevels entity
 * - Decision path complexity (time spent, number of steps)
 * - S/4HANA deployment flavor (Cloud Public/Private/On-Premise)
 * 
 * Level multipliers (default):
 * - Level A: technicalDebt=0.00, cloudReadiness=1.00, upgradeImpact=0.00
 * - Level B: technicalDebt=1.00, cloudReadiness=0.80, upgradeImpact=1.00
 * - Level C: technicalDebt=3.00, cloudReadiness=0.50, upgradeImpact=3.00
 * - Level D: technicalDebt=5.00, cloudReadiness=0.20, upgradeImpact=5.00
 * 
 * @author SAP Clean Core Team
 * @version 1.0.0
 */
class ScoringService {
    /**
     * Create a Scoring Service instance
     * @param {Object} srv - CAP service instance (unused but kept for consistency)
     */
    constructor(srv) {
        this.srv = srv;
    }

    /**
     * Calculate all scores for an analysis
     * 
     * @async
     * @param {string} analysisID - UUID of the Clean Core analysis
     * @returns {Promise<Object>} Calculated scores
     * @returns {number} technicalDebt - Technical debt score (0-100, lower=better)
     * @returns {number} cloudReadiness - Cloud readiness % (0-100, higher=better)
     * @returns {number} upgradeImpact - Upgrade impact score (0-100, lower=better)
     * @returns {number} compositeHealth - Overall health score (0-100, higher=better)
     * 
     * @throws {Error} Analysis not found
     * 
     * @description
     * Main entry point for scoring calculations. Retrieves analysis, decision paths,
     * and clean core level weights, then calculates all four metrics. Returns default
     * scores if level data is missing.
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
        
        // Normalize recommendation to extract canonical level (e.g., "Level A")
        const canonicalLevel = this.extractLevel(analysis.finalRecommendation);

        // Get clean core level weights
        const level = await SELECT.one.from(CleanCoreLevels)
            .where({ level: canonicalLevel });
        
        if (!level) {
            return this.getDefaultScores();
        }
        
        // Calculate individual scores
        const technicalDebtScore = this.calculateTechnicalDebt(decisionPaths, level);
    const cloudReadinessScore = this.calculateCloudReadiness({ ...analysis, finalRecommendation: canonicalLevel }, level);
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
     * 
     * @param {Array<Object>} decisionPaths - Array of decision path records
     * @param {Object} level - Clean Core level record with multipliers
     * @returns {number} Technical debt score (0-100, lower is better)
     * 
     * @description
     * Formula: TDS = Σ (Level Weight × Complexity Factor) / Step Count × 100
     * 
     * Level weights from CleanCoreLevels.technicalDebtMultiplier:
     * - A=0.00, B=1.00, C=3.00, D=5.00
     * 
     * Complexity factor: Normalized time spent (0-2 range based on minutes)
     * - Faster answers = lower complexity = lower score
     * - Time cap: 2 minutes per question
     * 
     * Lower score is better (0 = no technical debt).
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
        // Based on final recommendation level (canonical form)
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

    /**
     * Extract canonical level (e.g., "Level A") from a descriptive recommendation
     * Examples:
     *  - "Event-Driven Integration - Level A" => "Level A"
     *  - "Level B" => "Level B"
     *  - null/undefined => null
     */
    extractLevel(recommendation) {
        if (!recommendation || typeof recommendation !== 'string') return null;
        const match = recommendation.match(/Level\s+[ABCD]\b/);
        return match ? match[0] : recommendation;
    }
}

module.exports = ScoringService;
