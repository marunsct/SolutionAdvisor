/**
 * Jest Test Setup File
 * 
 * This file runs before all tests and sets up the test environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CDS_ENV = 'test';

// Suppress console logs during tests (optional)
// global.console = {
//     ...console,
//     log: jest.fn(),
//     debug: jest.fn(),
//     info: jest.fn(),
//     warn: jest.fn(),
//     error: jest.fn(),
// };

// Global test timeout
jest.setTimeout(10000);

// Mock CDS logger for tests
global.mockLog = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Helper function to create mock request object
global.createMockRequest = (data = {}, user = null) => {
    return {
        data: data,
        user: user || { id: 'test-user@example.com', name: 'Test User', tenant: 'test-tenant' },
        headers: {},
        query: {},
        params: {}
    };
};

// Helper function to create mock CDS context
global.createMockCdsContext = () => {
    return {
        user: { id: 'test-user@example.com', tenant: 'test-tenant' },
        tenant: 'test-tenant',
        req: createMockRequest()
    };
};

// Cleanup after all tests
afterAll(() => {
    jest.clearAllMocks();
});
