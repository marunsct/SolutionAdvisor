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
        let level = await SELECT.one.from(CleanCoreLevels)
            .where({ level: canonicalLevel });

        // Fallback: if master data missing or level not found, derive weights from level name
        if (!level) {
            const fallbackLevel = canonicalLevel || analysis.finalRecommendation;
            level = {
                level: fallbackLevel,
                technicalDebtMultiplier: this.getLevelWeightByName(fallbackLevel),
                upgradeImpactMultiplier: this.getLevelWeightByName(fallbackLevel),
                cloudReadinessFactor: this.getCloudFactorByName(fallbackLevel)
            };
        }
        
        // Get project config for deployment bonus calculation
        const { ProjectConfiguration } = cds.entities('sd');
        const projectConfig = analysis.projectConfig_ID ? 
            await SELECT.one.from(ProjectConfiguration).where({ ID: analysis.projectConfig_ID }) : 
            null;

        // Calculate individual scores
        const technicalDebtScore = this.calculateTechnicalDebt(decisionPaths, level);
        const cloudReadinessScore = this.calculateCloudReadiness({ ...analysis, finalRecommendation: canonicalLevel }, level, projectConfig);
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
        
    const levelWeight = (level.technicalDebtMultiplier ?? this.getLevelWeightByName(level.level));
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
    calculateCloudReadiness(analysis, level, projectConfig) {
        // Based on final recommendation level (canonical form)
        const levelScores = {
            'Level A': 100,
            'Level B': 75,
            'Level C': 50,
            'Level D': 25
        };
        
        const baseScore = levelScores[analysis.finalRecommendation] || 50;
        const levelFactor = (level.cloudReadinessFactor ?? 0.5);
        
        // Apply level factor + deployment flavor bonus
        const baseCalculatedScore = baseScore * levelFactor;
        const deploymentBonus = this.getDeploymentBonus(projectConfig) || 0;
        const score = Math.min(100, Math.max(0, baseCalculatedScore + deploymentBonus));
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
        
    const levelWeight = (level.upgradeImpactMultiplier ?? this.getLevelWeightByName(level.level));
        
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
    return (weights[levelName] ?? 1.00);
    }

    /**
     * Fallback cloud readiness factor by level name
     * @param {string} levelName
     * @returns {number} factor between 0 and 1
     */
    getCloudFactorByName(levelName) {
        const factors = {
            'Level A': 1.00,
            'Level B': 0.50,
            'Level C': 0.20,
            'Level D': 0.00
        };
        return factors[levelName] ?? 0.50;
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
    /**
     * Get deployment type bonus for cloud readiness
     * Returns bonus points based on S/4HANA deployment flavor
     * Cloud-native deployments get higher bonuses since less migration work needed
     * @param {Object} projectConfig - Project configuration object with s4HanaFlavor
     * @returns {number} Bonus points (0-25) to add to cloud readiness score
     */
    getDeploymentBonus(projectConfig) {
        if (!projectConfig || !projectConfig.s4HanaFlavor) return 0;
        
        // Bonus points by S/4HANA deployment flavor
        // Higher bonus = already closer to cloud-native, less migration work
        const bonusByFlavor = {
            'Cloud Public': 25,      // Already cloud-native, highest readiness
            'Cloud Private': 15,     // Some cloud infrastructure, moderate effort
            'On-Premise': 0,         // Traditional deployment, maximum work needed
            'Hybrid': 10             // Mix of on-prem and cloud
        };
        
        return bonusByFlavor[projectConfig.s4HanaFlavor] || 0;
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
        const str = recommendation.trim();
        // Match variants like "... - Level A", "Level  B", "level c", etc.
        const m = str.match(/level\s*([ABCD])\b/i);
        if (m && m[1]) {
            return `Level ${m[1].toUpperCase()}`;
        }
        // If it already looks like Level X with unusual casing/spaces
    const m2 = str.match(/(level)\s*[–—-]?\s*([ABCD])\b/i);
        if (m2 && m2[2]) {
            return `Level ${m2[2].toUpperCase()}`;
        }
        // Fallback: return as-is; upstream logic will still apply safe defaults
        return str;
    }

    /**
     * Calculate Risk Assessment based on clean core level and scores
     * @param {string} level - Clean core level (Level A/B/C/D)
     * @param {number} technicalDebtScore - Technical debt score
     * @param {number} upgradeImpactScore - Upgrade impact score
     * @returns {string} Risk assessment (Low, Medium, High, Critical)
     */
    calculateRiskAssessment(level, technicalDebtScore = 0, upgradeImpactScore = 0) {
        const canonicalLevel = this.extractLevel(level) || level;
        
        // Base risk by level
        let baseRisk = 0;
        if (canonicalLevel === 'Level A') baseRisk = 0; // No risk
        else if (canonicalLevel === 'Level B') baseRisk = 1; // Low
        else if (canonicalLevel === 'Level C') baseRisk = 2; // Medium
        else if (canonicalLevel === 'Level D') baseRisk = 3; // High
        
        // Adjust based on scores
        let scoreRisk = 0;
        if (technicalDebtScore > 70) scoreRisk += 2;
        else if (technicalDebtScore > 40) scoreRisk += 1;
        
        if (upgradeImpactScore > 70) scoreRisk += 2;
        else if (upgradeImpactScore > 40) scoreRisk += 1;
        
        const totalRisk = baseRisk + scoreRisk;
        
        if (totalRisk <= 1) return 'Low';
        if (totalRisk <= 3) return 'Medium';
        if (totalRisk <= 5) return 'High';
        return 'Critical';
    }

    /**
     * Determine Compliance Status based on clean core level and requirements
     * @param {string} level - Clean core level (Level A/B/C/D)
     * @param {string} complianceRequirements - Comma-separated compliance requirements (SOX, GDPR, FDA)
     * @returns {string} Compliance status (Compliant, Requires Review, Non-Compliant)
     */
    calculateComplianceStatus(level, complianceRequirements = '') {
        const canonicalLevel = this.extractLevel(level) || level;
        
        // If no compliance requirements, assume compliant
        if (!complianceRequirements || complianceRequirements.trim() === '') {
            return 'Compliant';
        }
        
        // Check level suitability for compliance
        if (canonicalLevel === 'Level A' || canonicalLevel === 'Level B') {
            // Levels A & B are well-suited for compliance
            return 'Compliant';
        } else if (canonicalLevel === 'Level C') {
            // Level C requires review for compliance
            return 'Requires Review';
        } else if (canonicalLevel === 'Level D') {
            // Level D has compliance concerns
            return 'Non-Compliant';
        }
        
        return 'Requires Review';
    }

    /**
     * Estimate effort in person-days based on complexity and level
     * @param {Array} decisionPaths - Array of decision path steps
     * @param {string} level - Clean core level
     * @returns {number} Estimated effort in person-days
     */
    estimateEffort(decisionPaths = [], level = 'Level A') {
        const canonicalLevel = this.extractLevel(level) || level;
        let baseEffort = 5; // Base 5 days
        
        // Add effort based on number of steps
        if (decisionPaths && decisionPaths.length > 0) {
            baseEffort += decisionPaths.length * 2;
        }
        
        // Multiply by level complexity
        const effortMultipliers = {
            'Level A': 1.0,  // 5-15 days
            'Level B': 1.5,  // 7.5-22.5 days
            'Level C': 2.5,  // 12.5-37.5 days
            'Level D': 4.0   // 20-60 days
        };
        
        const multiplier = effortMultipliers[canonicalLevel] || 1.0;
        return Math.round(baseEffort * multiplier);
    }

    /**
     * Determine technical complexity based on level
     * @param {string} level - Clean core level
     * @returns {string} Technical complexity (Simple, Moderate, Complex, Very Complex)
     */
    calculateTechnicalComplexity(level) {
        const canonicalLevel = this.extractLevel(level) || level;
        
        if (canonicalLevel === 'Level A') return 'Simple';
        if (canonicalLevel === 'Level B') return 'Moderate';
        if (canonicalLevel === 'Level C') return 'Complex';
        if (canonicalLevel === 'Level D') return 'Very Complex';
        
        return 'Moderate';
    }

    /**
     * Determine business impact based on scores
     * @param {number} technicalDebtScore - Technical debt score
     * @param {number} cloudReadinessScore - Cloud readiness score
     * @param {number} upgradeImpactScore - Upgrade impact score
     * @returns {string} Business impact assessment
     */
    calculateBusinessImpact(technicalDebtScore = 0, cloudReadinessScore = 0, upgradeImpactScore = 0) {
        const avgScore = (technicalDebtScore + (100 - cloudReadinessScore) + upgradeImpactScore) / 3;
        
        if (avgScore <= 25) {
            return 'Minimal impact. Solution is production-ready with low risk and maintenance overhead.';
        } else if (avgScore <= 50) {
            return 'Low impact. Solution requires minor enhancements but is generally maintainable.';
        } else if (avgScore <= 75) {
            return 'Moderate impact. Solution requires planned improvements for future upgrades.';
        } else {
            return 'High impact. Solution requires significant refactoring to align with clean core principles.';
        }
    }
}

module.exports = ScoringService;
