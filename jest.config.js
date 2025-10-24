/**
 * Jest Configuration for SAP CAP Application Testing
 * 
 * Test Structure:
 * - test/unit/ - Unit tests for business logic services
 * - test/integration/ - Integration tests for OData services
 * - test/e2e/ - End-to-end tests (placeholder)
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Test file patterns
    testMatch: [
        '**/test/**/*.test.js',
        '**/test/**/*.spec.js'
    ],
    
    // Coverage configuration
    collectCoverageFrom: [
        'srv/lib/**/*.js',
        'srv/service.js',
        '!srv/lib/test/**',
        '!**/node_modules/**'
    ],
    
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    
    // Coverage reporters
    coverageReporters: [
        'text',
        'text-summary',
        'html',
        'lcov'
    ],
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    
    // Module paths
    moduleDirectories: [
        'node_modules',
        'srv',
        'srv/lib'
    ],
    
    // Timeout for tests (default 5s)
    testTimeout: 10000,
    
    // Verbose output
    verbose: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks between tests
    restoreMocks: true,
    
    // Transform files (if needed for ES6 modules)
    transform: {},
    
    // Module file extensions
    moduleFileExtensions: ['js', 'json', 'node'],
    
    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/gen/',
        '/mta_archives/',
        '/app/'
    ],
    
    // Coverage directory
    coverageDirectory: '<rootDir>/coverage',
    
    // Globals
    globals: {
        'cds': {
            'test': true
        }
    }
};
