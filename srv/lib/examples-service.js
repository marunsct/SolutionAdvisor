const cds = require('@sap/cds');

/**
 * Examples Service - Handles real-world examples display
 */
class ExamplesService {
    constructor(srv) {
        this.srv = srv;
    }

    /**
     * Get contextual examples based on analysis context
     * 
     * @async
     * @param {string} objectType - RICEFW object type (R/I/C/E/F/W)
     * @param {string} scenario - Current analysis scenario description
     * @param {Array<string>|string} keywords - Search keywords
     * @param {Object} context - Additional context for relevance scoring
     * @param {string} context.industry - Industry vertical
     * @param {string} context.volumeLevel - Data volume level
     * @param {string} context.cleanCoreLevel - Target clean core level
     * @param {string} context.deploymentType - S/4HANA deployment type
     * @param {number} limit - Maximum number of examples to return (default: 5)
     * 
     * @returns {Promise<Array<Object>>} Top matching examples with relevance scores
     */
    async getContextualExamples(objectType, scenario, keywords, context = {}, limit = 5) {
        const { RealWorldExample } = cds.entities('sd');
        
        // Start with object type filter
        let query = SELECT.from(RealWorldExample)
            .where({ objectType, isActive: true });
        
        // Apply optional filters from context
        if (context.industry) {
            query = query.and({ industry: context.industry });
        }
        
        if (context.cleanCoreLevel) {
            query = query.and({ cleanCoreLevel: context.cleanCoreLevel });
        }
        
        const examples = await query;
        
        // Return empty array if no examples found
        if (!examples || examples.length === 0) {
            return [];
        }
        
        // Calculate relevance scores with enhanced algorithm
        let scored = examples.map(example => {
            const score = this.calculateRelevance(example, scenario, keywords, context);
            return {
                ...example,
                relevanceScore: score
            };
        });
        
        // Filter out examples with very low relevance (< 10 points)
        scored = scored.filter(ex => ex.relevanceScore >= 10);
        
        // Sort by relevance (highest first) and take top N
        scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const topExamples = scored.slice(0, limit);
        
        // Format for response with relevance metadata
        return topExamples.map(example => ({
            id: example.ID,
            title: example.title,
            scenario: example.scenario,
            challenge: example.challengeDescription,
            solution: example.solutionDescription,
            level: example.cleanCoreLevel,
            industry: example.industry,
            technologies: example.technologiesUsed,
            volumeHandled: example.volumeHandled,
            performance: example.performanceAchieved,
            implementationTime: example.implementationTime,
            lessonsLearned: example.lessonsLearned,
            implementation: example.implementation,
            relevanceScore: example.relevanceScore,
            relevancePercentage: this.calculateRelevancePercentage(example.relevanceScore)
        }));
    }
    
    /**
     * Convert relevance score to percentage for UI display
     * 
     * @param {number} score - Raw relevance score
     * @returns {number} Percentage (0-100)
     */
    calculateRelevancePercentage(score) {
        // Assume max possible score is ~300
        const maxScore = 300;
        return Math.min(100, Math.round((score / maxScore) * 100));
    }

    /**
     * Calculate relevance score for an example
     * 
     * Scoring algorithm:
     * - Exact scenario match: 100 points
     * - Partial scenario match: 50 points
     * - Keyword match in title: 20 points each
     * - Keyword match in keywords: 10 points each
     * - Keyword match in challenge/solution: 5 points each
     * - Industry match: 15 points
     * - Volume similarity: 0-20 points (based on proximity)
     * - Level match: 10 points
     * 
     * @param {Object} example - Example record from RealWorldExample entity
     * @param {string} scenario - Current analysis scenario
     * @param {Array<string>|string} keywords - Search keywords (array or space-separated string)
     * @param {Object} context - Additional context (industry, volumeLevel, cleanCoreLevel)
     * @returns {number} Relevance score (0-300+)
     */
    calculateRelevance(example, scenario, keywords, context = {}) {
        let score = 0;
        
        // Ensure context is an object
        const ctx = context || {};
        
        // Normalize keywords to array
        const keywordArray = Array.isArray(keywords) 
            ? keywords 
            : (keywords || '').split(' ').filter(k => k.length > 2);
        
        // 1. Scenario match (highest weight: 50-100 points)
        if (scenario && example.scenario) {
            const exampleScenario = example.scenario.toLowerCase();
            const searchScenario = scenario.toLowerCase();
            
            if (exampleScenario === searchScenario) {
                score += 100; // Exact match
            } else if (exampleScenario.includes(searchScenario) || searchScenario.includes(exampleScenario)) {
                score += 50; // Partial match
            }
        }
        
        // 2. Keyword matching with TF-IDF-like weighting
        if (keywordArray.length > 0) {
            // Title match (high weight: 20 points per keyword)
            if (example.title) {
                const titleLower = example.title.toLowerCase();
                keywordArray.forEach(kw => {
                    if (titleLower.includes(kw.toLowerCase())) {
                        score += 20;
                    }
                });
            }
            
            // Keywords field match (medium weight: 10 points per keyword)
            if (example.keywords) {
                const exampleKeywords = example.keywords.toLowerCase();
                keywordArray.forEach(kw => {
                    if (exampleKeywords.includes(kw.toLowerCase())) {
                        score += 10;
                    }
                });
            }
            
            // Challenge/Solution description match (lower weight: 5 points per keyword)
            const challengeText = (example.challengeDescription || '').toLowerCase();
            const solutionText = (example.solutionDescription || '').toLowerCase();
            
            keywordArray.forEach(kw => {
                const kwLower = kw.toLowerCase();
                if (challengeText.includes(kwLower)) score += 5;
                if (solutionText.includes(kwLower)) score += 5;
            });
        }
        
        // 3. Industry match (15 points)
        if (ctx.industry && example.industry) {
            if (example.industry.toLowerCase() === ctx.industry.toLowerCase()) {
                score += 15;
            }
        }
        
        // 4. Volume similarity (0-20 points based on proximity)
        if (ctx.volumeLevel && example.volumeHandled) {
            const volumeScore = this.calculateVolumeSimilarity(
                ctx.volumeLevel, 
                example.volumeHandled
            );
            score += volumeScore;
        }
        
        // 5. Clean Core Level match (10 points)
        if (ctx.cleanCoreLevel && example.cleanCoreLevel) {
            if (example.cleanCoreLevel === context.cleanCoreLevel) {
                score += 10;
            }
        }
        
        // 6. Boost recently added examples slightly (0-5 points)
        if (example.createdAt) {
            const ageInDays = (Date.now() - new Date(example.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays < 90) {
                score += Math.max(0, 5 - (ageInDays / 30));
            }
        }
        
        return Math.round(score);
    }
    
    /**
     * Calculate volume similarity score
     * 
     * @param {string} currentVolume - Current volume level (Low/Medium/High/Very High)
     * @param {string} exampleVolume - Example volume description
     * @returns {number} Similarity score (0-20)
     */
    calculateVolumeSimilarity(currentVolume, exampleVolume) {
        const volumeLevels = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'very high': 4
        };
        
        // Extract volume level from description if possible
        const currentLevel = volumeLevels[currentVolume?.toLowerCase()] || 2;
        
        let exampleLevel = 2; // Default to medium
        const exampleLower = exampleVolume.toLowerCase();
        if (exampleLower.includes('very high') || exampleLower.includes('million')) {
            exampleLevel = 4;
        } else if (exampleLower.includes('high') || exampleLower.includes('thousand')) {
            exampleLevel = 3;
        } else if (exampleLower.includes('medium')) {
            exampleLevel = 2;
        } else if (exampleLower.includes('low') || exampleLower.includes('hundred')) {
            exampleLevel = 1;
        }
        
        // Calculate proximity score (closer = higher score)
        const difference = Math.abs(currentLevel - exampleLevel);
        return Math.max(0, 20 - (difference * 7)); // 0, 13, or 20 points
    }

    /**
     * Log example view for analytics
     */
    async logExampleView(analysisID, exampleID, relevanceRating = null) {
        const { ExampleLog } = cds.entities('sd');
        
        const logEntry = {
            analysis_ID: analysisID,
            example_ID: exampleID,
            viewedAt: new Date().toISOString(),
            relevanceRating: relevanceRating,
            tenant: cds.context.tenant || 'default'
        };
        
        await INSERT.into(ExampleLog).entries(logEntry);
    }

    /**
     * Get popular examples for an object type
     */
    async getPopularExamples(objectType, limit = 5) {
        const { RealWorldExample, ExampleLog } = cds.entities('sd');
        
        // Get examples with view counts
        const examples = await SELECT.from(RealWorldExample)
            .where({ objectType, isActive: true });
        
        // Get view counts
        const viewCounts = await SELECT.from(ExampleLog)
            .columns('example_ID', 'count(*) as views')
            .where({ 'example.objectType': objectType })
            .groupBy('example_ID')
            .orderBy('views desc')
            .limit(limit);
        
        // Merge data
        const popularIds = viewCounts.map(v => v.example_ID);
        return examples.filter(e => popularIds.includes(e.ID));
    }
}

module.exports = ExamplesService;
