sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "./MockAnalysisService"
], function (UIComponent, JSONModel, Log, MockAnalysisService) {
    "use strict";
    
    /**
     * MockService - Main entry point for mock services
     * Use this to initialize all mock services for testing without a backend
     */
    return {
        /**
         * Initialize mock services
         * @param {sap.ui.core.UIComponent} oComponent - The UI component
         */
        init: function (oComponent) {
            this._component = oComponent;
            this._mockModel = new JSONModel();
            
            // Initialize mock analysis service
            this._mockAnalysisService = new MockAnalysisService();
            
            // Make the mock model available globally
            this._component.setModel(this._mockModel, "mock");
            
            // Make services available in the component for controller access
            this._component.mockAnalysisService = this._mockAnalysisService;
            
            // Log initialization
            Log.info("MockService: Mock services initialized");
        },
        
        /**
         * Initialize mock data
         * @param {boolean} bSampleData - Whether to load sample data
         */
        initMockData: function (bSampleData) {
            // Set up base mock data structure
            const mockData = {
                projects: this._createMockProjects(),
                analyses: this._createMockAnalyses(),
                sessions: []
            };
            
            // Set to model
            this._mockModel.setData(mockData);
            
            if (bSampleData) {
                // Add more comprehensive sample data for testing
                this._loadSampleData();
            }
        },
        
        /**
         * Create mock projects
         * @returns {Array} Array of project objects
         */
        _createMockProjects: function () {
            return [
                {
                    ID: "project-001",
                    projectName: "S/4HANA Cloud Implementation",
                    clientName: "Acme Corporation",
                    projectType: "New Implementation",
                    status: "Active",
                    s4HanaFlavor: "Cloud Public",
                    timeline: "2025-01-01",
                    expectedDuration: 12,
                    complianceRequirements: "SOX,GDPR",
                    businessCriticality: "High",
                    users: []
                },
                {
                    ID: "project-002",
                    projectName: "S/4HANA On-Premise Upgrade",
                    clientName: "Global Manufacturing Inc.",
                    projectType: "System Conversion",
                    status: "Active",
                    s4HanaFlavor: "On-Premise",
                    timeline: "2025-03-15",
                    expectedDuration: 18,
                    complianceRequirements: "SOX",
                    businessCriticality: "Mission Critical",
                    users: []
                }
            ];
        },
        
        /**
         * Create mock analyses
         * @returns {Array} Array of analysis objects
         */
        _createMockAnalyses: function () {
            return [
                {
                    ID: "analysis-001",
                    projectConfig_ID: "project-001",
                    ricefwId: "I-0042-IMP",
                    objectType: "Interfaces",
                    objectName: "Customer Order Integration",
                    analysisDate: "2025-01-15",
                    status: "Completed",
                    finalRecommendation: "Level A",
                    finalReasoning: "Real-time OData API with Enterprise Events aligns with clean core principles for Cloud Public.",
                    technicalDebtScore: 25.00,
                    cloudReadinessScore: 90.00,
                    upgradeImpactScore: 15.00,
                    compositeHealthScore: 85.00,
                    decisionPaths: this._createDecisionPathsForInterface()
                },
                {
                    ID: "analysis-002",
                    projectConfig_ID: "project-001",
                    ricefwId: "R-0023-IMP",
                    objectType: "Reports",
                    objectName: "Sales Performance Dashboard",
                    analysisDate: "2025-01-20",
                    status: "Completed",
                    finalRecommendation: "Level A",
                    finalReasoning: "Embedded analytics using CDS views with SAC integration fully complies with clean core principles.",
                    technicalDebtScore: 20.00,
                    cloudReadinessScore: 95.00,
                    upgradeImpactScore: 10.00,
                    compositeHealthScore: 90.00,
                    decisionPaths: this._createDecisionPathsForReport()
                }
            ];
        },
        
        /**
         * Create mock decision paths for interface analysis
         * @returns {Array} Array of decision path objects
         */
        _createDecisionPathsForInterface: function () {
            return [
                {
                    ID: "path-001-1",
                    analysis_ID: "analysis-001",
                    questionId: "I-Q1",
                    questionText: "Is the requirement for real-time or batch communication?",
                    selectedAnswer: "Real-time",
                    answerIndex: 0,
                    stepOrder: 1,
                    timeSpentSeconds: 45
                },
                {
                    ID: "path-001-2",
                    analysis_ID: "analysis-001",
                    questionId: "I-Q2",
                    questionText: "What is the expected data volume per transaction?",
                    selectedAnswer: "Low",
                    answerIndex: 0,
                    stepOrder: 2,
                    timeSpentSeconds: 35
                },
                {
                    ID: "path-001-3",
                    analysis_ID: "analysis-001",
                    questionId: "I-Q3",
                    questionText: "Does the integration require complex data transformations?",
                    selectedAnswer: "No",
                    answerIndex: 1,
                    stepOrder: 3,
                    timeSpentSeconds: 30
                }
            ];
        },
        
        /**
         * Create mock decision paths for report analysis
         * @returns {Array} Array of decision path objects
         */
        _createDecisionPathsForReport: function () {
            return [
                {
                    ID: "path-002-1",
                    analysis_ID: "analysis-002",
                    questionId: "R-Q1",
                    questionText: "What is the primary purpose of this report?",
                    selectedAnswer: "Management",
                    answerIndex: 1,
                    stepOrder: 1,
                    timeSpentSeconds: 50
                },
                {
                    ID: "path-002-2",
                    analysis_ID: "analysis-002",
                    questionId: "R-Q3",
                    questionText: "What is the data volume for this management report?",
                    selectedAnswer: "Small",
                    answerIndex: 0,
                    stepOrder: 2,
                    timeSpentSeconds: 40
                }
            ];
        },
        
        /**
         * Add more comprehensive sample data
         */
        _loadSampleData: function () {
            // Add more projects, analyses, and decision paths
            // This would be expanded in a full implementation
            Log.info("MockService: Loading additional sample data");
        },
        
        /**
         * Get analysis service
         * @returns {MockAnalysisService} The mock analysis service
         */
        getAnalysisService: function () {
            return this._mockAnalysisService;
        }
    };
});