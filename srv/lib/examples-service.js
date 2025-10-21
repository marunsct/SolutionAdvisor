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
     */
    async getContextualExamples(objectType, scenario, keywords) {
        const { RealWorldExample } = cds.entities('sd');
        
        // Start with object type filter
        let query = SELECT.from(RealWorldExample)
            .where({ objectType, isActive: true });
        
        const examples = await query;
        
        // Filter and rank by relevance
        let scored = examples.map(example => ({
            ...example,
            relevanceScore: this.calculateRelevance(example, scenario, keywords)
        }));
        
        // Sort by relevance and take top 5
        scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const topExamples = scored.slice(0, 5);
        
        // Format for response
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
            lessonsLearned: example.lessonsLearned
        }));
    }

    /**
     * Calculate relevance score for an example
     */
    calculateRelevance(example, scenario, keywords) {
        let score = 0;
        
        // Scenario match (high weight)
        if (scenario && example.scenario) {
            const scenarioMatch = example.scenario.toLowerCase().includes(scenario.toLowerCase());
            score += scenarioMatch ? 50 : 0;
        }
        
        // Keywords match (medium weight)
        if (keywords && example.keywords) {
            const exampleKeywords = example.keywords.toLowerCase().split(' ');
            const searchKeywords = keywords.toLowerCase().split(' ');
            
            const matches = searchKeywords.filter(kw => 
                exampleKeywords.some(ek => ek.includes(kw))
            );
            
            score += matches.length * 10;
        }
        
        // Title match (low weight)
        if (keywords && example.title) {
            const titleMatch = example.title.toLowerCase().includes(keywords.toLowerCase());
            score += titleMatch ? 20 : 0;
        }
        
        return score;
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
