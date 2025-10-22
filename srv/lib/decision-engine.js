const cds = require('@sap/cds');

/**
 * Decision Engine - Handles wizard navigation and decision tree logic
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
     */
    async getNextQuestion(currentQuestionId, selectedAnswer, objectType) {
        const { QuestionFlow } = cds.entities('sd');
        
        // Get current question to access navigation rules
        const currentQuestion = await SELECT.one.from(QuestionFlow)
            .where({ questionId: currentQuestionId });
        
        if (!currentQuestion || !currentQuestion.navigationRules) {
            throw new Error('Invalid question or missing navigation rules');
        }
        
        // Parse navigation rules
        const navigationRules = JSON.parse(currentQuestion.navigationRules);
        const nextStep = navigationRules[selectedAnswer];
        
        if (!nextStep) {
            throw new Error(`No navigation rule found for answer: ${selectedAnswer}`);
        }
        
        // Check if this is a final answer
        if (nextStep.finalAnswer) {
            return {
                isComplete: true,
                recommendation: nextStep.finalAnswer,
                reasoning: nextStep.reasoning
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
        return {
            questionId: question.questionId,
            questionText: question.questionText,
            answerOptions: question.answerOptions,
            hint: question.questionHint,
            detailedHint: question.detailedHint,
            performanceContext: question.performanceContext
        };
    }

    /**
     * Get total question count for an object type
     */
    async getTotalSteps(objectType) {
        const { ObjectTypes } = cds.entities('sd');
        
        const objectTypeDef = await SELECT.one.from(ObjectTypes)
            .where({ objectType });
        
        return objectTypeDef ? objectTypeDef.questionCount : 10; // Default to 10 if not found
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
            const conditions = JSON.parse(question.performanceContext);
            
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
                
                const projectCompliance = projectConfig.complianceRequirements.split(',').map(c => c.trim());
                
                // Check if any required compliance matches project compliance
                const hasMatch = requiredCompliance.some(rc => projectCompliance.includes(rc));
                if (!hasMatch) {
                    return true; // Skip if no compliance match
                }
            }
            
            return false; // Don't skip
        } catch (error) {
            console.error('Error parsing conditional logic:', error);
            return false; // Don't skip on error
        }
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
            console.error(`Validation error for question ${questionId}:`, error);
            return false;
        }
    }
}

module.exports = DecisionEngine;
