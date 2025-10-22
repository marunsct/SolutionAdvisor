const cds = require('@sap/cds');
const LOG = cds.log('decision-engine'); // Use proper CDS logging

/**
 * Decision Engine - Handles wizard navigation and decision tree logic
 * Consolidated version with improvements from both implementations
 */
class DecisionEngine {
    constructor(srv) {
        this.srv = srv;
    }

    /**
     * Get the first question for a given object type
     */
    async getFirstQuestion(objectType) {
        const { QuestionFlow } = cds.entities('sd');
        
        const question = await SELECT.one.from(QuestionFlow)
            .where({ objectType, displayOrder: 1, isActive: true })
            .orderBy('displayOrder');
        
        if (!question) {
            throw new Error(`No questions found for object type: ${objectType}`);
        }
        
        return this.formatQuestion(question);
    }

    /**
     * Get the next question based on current answer
     * @param {string} currentQuestionId - ID of the current question
     * @param {string} selectedAnswer - ID or key of the selected answer
     * @param {string} [objectType] - Type of object being analyzed (not used in this implementation but kept for API compatibility)
     */
    async getNextQuestion(currentQuestionId, selectedAnswer) {
        const { QuestionFlow } = cds.entities('sd');
        
        // Get current question to access navigation rules
        const currentQuestion = await SELECT.one.from(QuestionFlow)
            .where({ questionId: currentQuestionId });
        
        if (!currentQuestion || !currentQuestion.navigationRules) {
            throw new Error('Invalid question or missing navigation rules');
        }
        
        // Parse navigation rules
        let navigationRules;
        try {
            navigationRules = JSON.parse(currentQuestion.navigationRules);
        } catch (error) {
            throw new Error(`Error parsing navigation rules for question ${currentQuestionId}: ${error.message}`);
        }
        
        const nextStep = navigationRules[selectedAnswer];
        
        if (!nextStep) {
            throw new Error(`No navigation rule found for answer: ${selectedAnswer}`);
        }
        
        // Check if this is a final answer
        if (nextStep.finalAnswer) {
            return {
                isComplete: true,
                recommendation: nextStep.finalAnswer,
                reasoning: nextStep.reasoning || `Based on your answers, the recommended Clean Core Level is ${nextStep.finalAnswer}`
            };
        }
        
        // Get the next question
        const nextQuestion = await SELECT.one.from(QuestionFlow)
            .where({ questionId: nextStep.nextQuestion, isActive: true });
        
        if (!nextQuestion) {
            throw new Error(`Next question not found: ${nextStep.nextQuestion}`);
        }
        
        return {
            isComplete: false,
            question: this.formatQuestion(nextQuestion)
        };
    }

    /**
     * Format question object for response
     */
    formatQuestion(question) {
        // Parse answer options
        let answerOptions;
        try {
            answerOptions = typeof question.answerOptions === 'string' 
                ? JSON.parse(question.answerOptions) 
                : question.answerOptions;
        } catch (error) {
            LOG.error(`Error parsing answer options for question ${question.questionId}:`, error);
            answerOptions = [];
        }
        
        // Parse performance context if available
        let performanceContext;
        if (question.performanceContext) {
            try {
                performanceContext = typeof question.performanceContext === 'string'
                    ? JSON.parse(question.performanceContext)
                    : question.performanceContext;
            } catch (error) {
                LOG.error(`Error parsing performance context for question ${question.questionId}:`, error);
                performanceContext = {};
            }
        }
        
        return {
            questionId: question.questionId,
            questionText: question.questionText,
            answerOptions: answerOptions,
            hint: question.questionHint,
            detailedHint: question.detailedHint,
            performanceContext: performanceContext
        };
    }

    /**
     * Get total question count for an object type
     */
    async getTotalSteps(objectType) {
        const { QuestionFlow } = cds.entities('sd');
        
        // Count active questions for this object type
        const count = await SELECT.one.from(QuestionFlow)
            .columns('count(*) as count')
            .where({ objectType, isActive: true });
        
        return count ? count.count : 10; // Default to 10 if not found
    }

    /**
     * Check if question should be skipped based on project configuration
     */
    async shouldSkipQuestion(questionId, projectConfig) {
        const { QuestionFlow } = cds.entities('sd');
        
        const question = await SELECT.one.from(QuestionFlow)
            .where({ questionId });
        
        if (!question || !question.performanceContext) {
            return false;
        }
        
        try {
            const conditions = typeof question.performanceContext === 'string'
                ? JSON.parse(question.performanceContext)
                : question.performanceContext;
            
            // Check if question is specific to deployment type
            if (conditions.deploymentTypes && projectConfig.s4HanaFlavor) {
                const deploymentTypes = Array.isArray(conditions.deploymentTypes) 
                    ? conditions.deploymentTypes 
                    : conditions.deploymentTypes.split(',').map(t => t.trim());
                
                if (!deploymentTypes.includes(projectConfig.s4HanaFlavor)) {
                    return true; // Skip if deployment type doesn't match
                }
            }
            
            // Check if question is specific to compliance requirements
            if (conditions.complianceRequirements && projectConfig.complianceRequirements) {
                const requiredCompliance = Array.isArray(conditions.complianceRequirements)
                    ? conditions.complianceRequirements
                    : conditions.complianceRequirements.split(',').map(c => c.trim());
                
                const projectCompliance = Array.isArray(projectConfig.complianceRequirements)
                    ? projectConfig.complianceRequirements
                    : projectConfig.complianceRequirements.split(',').map(c => c.trim());
                
                // Check if any required compliance matches project compliance
                const hasMatch = requiredCompliance.some(rc => projectCompliance.includes(rc));
                if (!hasMatch) {
                    return true; // Skip if no compliance match
                }
            }
            
            return false; // Don't skip
        } catch (error) {
            LOG.error('Error parsing conditional logic:', error);
            return false; // Don't skip on error
        }
    }

    /**
     * Get questions for a decision path visualization
     */
    async getDecisionPathQuestions(analysisId) {
        const { DecisionPath, QuestionFlow } = cds.entities('sd');
        
        // Get all decision path entries for this analysis
        const decisionPath = await SELECT.from(DecisionPath)
            .where({ analysis_ID: analysisId })
            .orderBy('stepOrder');
            
        if (!decisionPath || decisionPath.length === 0) {
            return [];
        }
        
        // Build result with question details
        const result = [];
        for (const step of decisionPath) {
            // Get question details
            const question = await SELECT.one.from(QuestionFlow)
                .where({ questionId: step.questionId });
                
            if (question) {
                result.push({
                    stepOrder: step.stepOrder,
                    questionId: step.questionId,
                    questionText: question.questionText,
                    selectedAnswer: step.selectedAnswer,
                    answeredAt: step.answeredAt
                });
            }
        }
        
        return result;
    }

    /**
     * Validate navigation rules JSON structure
     */
    validateNavigationRules(navigationRules, questionId) {
        try {
            const rules = typeof navigationRules === 'string' 
                ? JSON.parse(navigationRules) 
                : navigationRules;
            
            // Check that rules is an object
            if (typeof rules !== 'object' || rules === null) {
                throw new Error(`Navigation rules must be an object for question ${questionId}`);
            }
            
            // Check each rule has either nextQuestion or finalAnswer
            for (const [answer, rule] of Object.entries(rules)) {
                if (!rule.nextQuestion && !rule.finalAnswer) {
                    throw new Error(
                        `Navigation rule for answer "${answer}" in question ${questionId} ` +
                        `must have either nextQuestion or finalAnswer`
                    );
                }
            }
            
            return true;
        } catch (error) {
            LOG.error(`Validation error for question ${questionId}:`, error);
            return false;
        }
    }
    
    /**
     * Generate final recommendation based on wizard answers
     */
    async generateFinalRecommendation(session, finalLevel, reasoning) {
        // This would typically involve more complex logic based on the decision path
        return {
            isComplete: true,
            recommendation: finalLevel,
            reasoning: reasoning || `Based on your answers, the recommended Clean Core Level is ${finalLevel}`
        };
    }
}

module.exports = DecisionEngine;