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
}

module.exports = DecisionEngine;
