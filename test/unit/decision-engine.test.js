/**
 * Unit Tests for Decision Engine
 * 
 * Tests question navigation, JSON parsing, and decision tree logic
 */

const DecisionEngine = require('../../srv/lib/decision-engine-consolidated');

// Mock CDS
jest.mock('@sap/cds', () => ({
    log: () => ({
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }),
    entities: jest.fn(() => ({
        QuestionFlow: 'sd.QuestionFlow',
        WizardSessions: 'sd.WizardSessions'
    }))
}));

// Mock SELECT and UPDATE
global.SELECT = {
    one: {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis()
    },
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis()
};

global.UPDATE = jest.fn().mockReturnThis();
global.INSERT = {
    into: jest.fn().mockReturnThis(),
    entries: jest.fn().mockResolvedValue({})
};

describe('DecisionEngine', () => {
    let decisionEngine;
    let mockSrv;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSrv = {};
        decisionEngine = new DecisionEngine(mockSrv);
    });

    describe('getFirstQuestion', () => {
        it('should return the first question for a given object type', async () => {
            const mockQuestion = {
                questionId: 'Q1',
                questionText: 'What is the business requirement?',
                answerOptions: JSON.stringify([
                    { key: 'A1', label: 'Standard functionality', value: 'standard' },
                    { key: 'A2', label: 'Custom development', value: 'custom' }
                ]),
                hint: 'Select the primary driver',
                detailedHint: 'This determines the starting point...',
                navigationLogic: JSON.stringify({ 'A1': { nextQuestion: 'Q2' }, 'A2': { nextQuestion: 'Q3' } }),
                displayOrder: 1,
                objectType: 'Interfaces',
                isActive: true
            };

            SELECT.one.from.mockReturnThis();
            SELECT.one.where.mockReturnThis();
            SELECT.one.orderBy.mockResolvedValue(mockQuestion);

            const result = await decisionEngine.getFirstQuestion('Interfaces');

            expect(result).toBeDefined();
            expect(result.questionId).toBe('Q1');
            expect(result.answerOptions).toHaveLength(2);
            expect(SELECT.one.from).toHaveBeenCalled();
        });

        it('should throw error if no questions found for object type', async () => {
            SELECT.one.from.mockReturnThis();
            SELECT.one.where.mockReturnThis();
            SELECT.one.orderBy.mockResolvedValue(null);

            await expect(decisionEngine.getFirstQuestion('InvalidType'))
                .rejects.toThrow('No questions found for object type');
        });
    });

    describe('getNextQuestion', () => {
        it('should return next question based on navigation logic', async () => {
            const mockCurrentQuestion = {
                questionId: 'Q1',
                navigationLogic: JSON.stringify({
                    'A1': { nextQuestion: 'Q2', finalAnswer: null },
                    'A2': { nextQuestion: 'Q3', finalAnswer: null }
                })
            };

            const mockNextQuestion = {
                questionId: 'Q2',
                questionText: 'Next question',
                answerOptions: JSON.stringify([{ key: 'B1', label: 'Option B1' }]),
                navigationLogic: JSON.stringify({ 'B1': { finalAnswer: 'Level A' } })
            };

            SELECT.one.from.mockReturnThis();
            SELECT.one.where
                .mockResolvedValueOnce(mockCurrentQuestion)
                .mockResolvedValueOnce(mockNextQuestion);

            const result = await decisionEngine.getNextQuestion('Q1', 'A1');

            expect(result).toBeDefined();
            expect(result.question.questionId).toBe('Q2');
            expect(result.isComplete).toBe(false);
        });

        it('should return final recommendation when navigation logic specifies it', async () => {
            const mockCurrentQuestion = {
                questionId: 'Q5',
                navigationLogic: JSON.stringify({
                    'E1': { finalAnswer: 'Level A', reasoning: 'Standard functionality with released APIs' }
                })
            };

            SELECT.one.from.mockReturnThis();
            SELECT.one.where.mockResolvedValue(mockCurrentQuestion);

            const result = await decisionEngine.getNextQuestion('Q5', 'E1');

            expect(result).toBeDefined();
            expect(result.isComplete).toBe(true);
            expect(result.recommendation).toBe('Level A');
        });
    });

    describe('formatQuestion', () => {
        it('should parse JSON fields correctly', () => {
            const mockQuestion = {
                questionId: 'Q1',
                questionText: 'Test question',
                answerOptions: JSON.stringify([
                    { key: 'A1', label: 'Option 1' },
                    { key: 'A2', label: 'Option 2' }
                ]),
                navigationLogic: JSON.stringify({ 'A1': { nextQuestion: 'Q2' } }),
                hint: 'Test hint'
            };

            const result = decisionEngine.formatQuestion(mockQuestion);

            expect(result.answerOptions).toBeInstanceOf(Array);
            expect(result.answerOptions).toHaveLength(2);
            expect(result.navigationLogic).toBeInstanceOf(Object);
        });

        it('should handle invalid JSON gracefully', () => {
            const mockQuestion = {
                questionId: 'Q1',
                questionText: 'Test question',
                answerOptions: 'invalid json',
                navigationLogic: 'invalid json'
            };

            const result = decisionEngine.formatQuestion(mockQuestion);

            expect(result.answerOptions).toEqual([]);
            expect(result.navigationLogic).toEqual({});
        });
    });

    describe('generateFinalRecommendation', () => {
        it('should generate recommendation with reasoning', async () => {
            const mockSession = { ID: 'session-1', currentStep: 5 };
            const result = await decisionEngine.generateFinalRecommendation(
                mockSession,
                'Level B',
                'Uses standard APIs with minor extensions'
            );

            expect(result.isComplete).toBe(true);
            expect(result.recommendation).toBe('Level B');
            expect(result.reasoning).toContain('minor extensions');
        });
    });
});
