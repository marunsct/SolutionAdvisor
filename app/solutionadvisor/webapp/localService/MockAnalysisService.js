sap.ui.define([
    "sap/ui/base/Object"
], function (BaseObject) {
    "use strict";
    
    /**
     * Mock implementation for the analysis service
     * Used for testing without a backend connection
     */
    return BaseObject.extend("sd.solutionadvisor.localService.MockAnalysisService", {
        constructor: function() {
            // Initialize mock data
            this._initMockData();
        },
        
        /**
         * Initialize mock data for the service
         * @private
         */
        _initMockData: function() {
            // Mock questions for different object types
            this._questions = {
                "Reports": this._createReportsQuestions(),
                "Interfaces": this._createInterfacesQuestions(),
                "Conversions": this._createConversionsQuestions(),
                "Enhancements": this._createEnhancementsQuestions(),
                "Forms": this._createFormsQuestions(),
                "Workflows": this._createWorkflowsQuestions()
            };
            
            // Current question state
            this._currentQuestion = null;
            this._answeredQuestions = [];
        },
        
        /**
         * Get the first question for an object type
         * @param {string} objectType - The object type (Reports, Interfaces, etc.)
         * @returns {object} The first question
         */
        getFirstQuestion: function(objectType) {
            // Return the first question for the object type or a default
            const questions = this._questions[objectType] || this._createDefaultQuestions();
            if (questions.length === 0) {
                throw new Error(`No questions found for object type: ${objectType}`);
            }
            
            this._currentQuestion = questions[0];
            return this._currentQuestion;
        },
        
        /**
         * Submit an answer and get the next question
         * @param {string} questionId - The current question ID
         * @param {string} selectedAnswer - The selected answer value
         * @returns {object} The next question or final recommendation
         */
        submitAnswer: function(questionId, selectedAnswer) {
            // Find current question
            const objectType = this._getObjectTypeFromQuestionId(questionId);
            const questions = this._questions[objectType] || this._createDefaultQuestions();
            
            const questionIndex = questions.findIndex(q => q.questionId === questionId);
            if (questionIndex === -1) {
                throw new Error(`Question not found: ${questionId}`);
            }
            
            // Add to answered questions
            this._answeredQuestions.push({
                questionId: questionId,
                selectedAnswer: selectedAnswer
            });
            
            // Navigation logic - in a real implementation, this would be based on the navigation rules
            // For mock, we simply move to the next question or return a recommendation after 3 questions
            
            if (this._answeredQuestions.length >= 3) {
                // Return final recommendation after 3 questions
                return this._getFinalRecommendation(objectType, selectedAnswer);
            }
            
            // Otherwise, return the next question
            const nextQuestion = questions[questionIndex + 1] || questions[0];
            this._currentQuestion = nextQuestion;
            
            return {
                isComplete: false,
                nextQuestion: nextQuestion
            };
        },
        
        /**
         * Get constraints for a specific question and object type
         * @param {string} objectType - The object type
         * @returns {object} Constraints data
         */
        getConstraints: function(objectType) {
            // Return mock constraints based on object type
            return {
                performanceConstraints: this._createPerformanceConstraints(objectType),
                deploymentConstraints: this._createDeploymentConstraints(objectType),
                complianceConstraints: []
            };
        },
        
        /**
         * Get examples for a specific object type
         * @param {string} objectType - The object type
         * @returns {Array} Examples data
         */
        getExamples: function(objectType) {
            // Return mock examples based on object type
            return this._createExamples(objectType);
        },
        
        /**
         * Get final recommendation based on answers
         * @param {string} objectType - The object type
         * @param {string} lastAnswer - The last answer selected
         * @returns {object} Final recommendation data
         */
        _getFinalRecommendation: function(objectType, lastAnswer) {
            // Simplified logic - in a real implementation, this would be based on the decision tree
            
            // Map last answer to a level
            let level = "Level B"; // Default
            
            if (lastAnswer === "Operational" || lastAnswer === "Real-time" || 
                lastAnswer === "API" || lastAnswer === "Low" || lastAnswer === "Yes") {
                level = "Level A";
            } else if (lastAnswer === "Batch" || lastAnswer === "High" || 
                      lastAnswer === "Complex" || lastAnswer === "Direct") {
                level = "Level C";
            }
            
            // Return mock recommendation
            return {
                isComplete: true,
                recommendation: level,
                reasoning: `Based on your answers, the recommended Clean Core Level is ${level}. ` +
                           `This recommendation considers the ${objectType.toLowerCase()} characteristics ` +
                           `and optimal implementation approach.`,
                scores: {
                    technicalDebt: level === "Level A" ? 25 : (level === "Level B" ? 50 : 75),
                    cloudReadiness: level === "Level A" ? 90 : (level === "Level B" ? 70 : 40),
                    upgradeImpact: level === "Level A" ? 20 : (level === "Level B" ? 45 : 70),
                    compositeHealth: level === "Level A" ? 85 : (level === "Level B" ? 65 : 40)
                }
            };
        },
        
        /**
         * Create mock Reports questions
         * @returns {Array} Array of question objects
         */
        _createReportsQuestions: function() {
            return [
                {
                    questionId: "R-Q1",
                    questionText: "What is the primary purpose of this report?",
                    answerOptions: [
                        { value: "Operational", label: "Operational Reporting", description: "Daily operations and transactions" },
                        { value: "Management", label: "Management Reporting", description: "KPIs and dashboards" },
                        { value: "Regulatory", label: "Regulatory Reporting", description: "Compliance and audit" },
                        { value: "AdHoc", label: "Ad-hoc Analysis", description: "Flexible queries and exploration" }
                    ],
                    hint: "Different report types have varying complexity and clean core alignment.",
                    detailedHint: "Operational reports focus on transactional data with standard KPIs. Management reports require aggregations and analytics. Regulatory reports have strict compliance requirements. Ad-hoc reports need flexible query capabilities.",
                    performanceContext: { category: "Reporting", methods: ["Embedded Analytics: Standard CDS views", "SAP Analytics Cloud: Cloud BI", "Custom ABAP: Avoid if possible"] }
                },
                {
                    questionId: "R-Q2",
                    questionText: "Does this operational report require real-time data?",
                    answerOptions: [
                        { value: "Yes", label: "Yes - Real-time (<5 seconds)", description: "Live data required" },
                        { value: "No", label: "No - Batch acceptable", description: "Scheduled reports OK" }
                    ],
                    hint: "Real-time reporting uses CDS views, batch reports can use scheduled jobs.",
                    detailedHint: "Real-time operational reports leverage SAP Fiori apps with CDS views for immediate data access. Batch reports can use background jobs with ALV Grid or Smart Forms for scheduled output.",
                    performanceContext: { responseTime: ["Real-time: <5 seconds", "Batch: Minutes to hours acceptable"] }
                },
                {
                    questionId: "R-Q3",
                    questionText: "What is the data volume for this management report?",
                    answerOptions: [
                        { value: "Small", label: "Small (<100K records)", description: "Limited data volume" },
                        { value: "Medium", label: "Medium (100K-1M records)", description: "Moderate data volume" },
                        { value: "Large", label: "Large (>1M records)", description: "Large datasets" }
                    ],
                    hint: "Large datasets require optimization and may need SAP Analytics Cloud.",
                    detailedHint: "Management reports with <1M records can use embedded analytics. Larger datasets benefit from SAP Analytics Cloud with live data connections and in-memory calculations.",
                    performanceContext: { dataVolume: ["Small: <100K records", "Medium: 100K-1M records", "Large: >1M records - consider SAC"] }
                }
            ];
        },
        
        /**
         * Create mock Interfaces questions
         * @returns {Array} Array of question objects
         */
        _createInterfacesQuestions: function() {
            return [
                {
                    questionId: "I-Q1",
                    questionText: "Is the requirement for real-time or batch communication?",
                    answerOptions: [
                        { value: "Real-time", label: "Real-time (<5 seconds)", description: "Immediate synchronization required" },
                        { value: "Batch", label: "Batch (Daily/Weekly/Monthly)", description: "Scheduled data transfer acceptable" }
                    ],
                    hint: "Real-time integration (<5 seconds) enables Enterprise Event Enablement and REST APIs. Batch processing allows Enhanced IDocs and asynchronous file transfer.",
                    detailedHint: "Real-time integration is ideal for scenarios requiring immediate synchronization (e.g., order creation, inventory updates). It leverages OData APIs and Enterprise Events for cloud-ready solutions. Batch processing is suitable for high-volume data transfers (e.g., mass uploads, overnight reconciliation) and supports Enhanced IDocs with delta mechanisms.",
                    performanceContext: { category: "Integration", methods: ["OData API: ≤5000 records/call, <5s response", "Enterprise Events: Event-based, no volume limit", "Enhanced IDOC: 10K-100K records/batch"] }
                },
                {
                    questionId: "I-Q2",
                    questionText: "What is the expected data volume per transaction?",
                    answerOptions: [
                        { value: "Low", label: "Low (<1000 records)", description: "Small data sets per transaction" },
                        { value: "Medium", label: "Medium (1000-5000 records)", description: "Moderate data sets" },
                        { value: "High", label: "High (>5000 records)", description: "Large data sets requiring batch processing" }
                    ],
                    hint: "Volume impacts technology choice. OData APIs are optimized for <5000 records per call.",
                    detailedHint: "OData APIs have a soft limit of 5000 records per call for optimal performance. For larger volumes, consider pagination, batch processing, or Enhanced IDocs. Enterprise Events are suitable for single-record notifications.",
                    performanceContext: { volumeThresholds: ["OData API: ≤5000 records optimal", "Enterprise Events: Single record per event", "Enhanced IDOC: 10K-100K records per batch"] }
                },
                {
                    questionId: "I-Q3",
                    questionText: "Does the integration require complex data transformations?",
                    answerOptions: [
                        { value: "Yes", label: "Yes - Complex transformations", description: "Multi-step data mapping, aggregation, or business rules" },
                        { value: "No", label: "No - Simple field mapping", description: "Direct field-to-field mapping" }
                    ],
                    hint: "Complex transformations may require middleware or BTP Integration Suite.",
                    detailedHint: "Simple field mappings can be handled in OData APIs. Complex transformations (multi-source aggregation, business rule evaluation) benefit from SAP Integration Suite with iFlows and mapping templates.",
                    performanceContext: { transformationComplexity: ["Simple: Field mapping in API", "Moderate: BTP Integration Suite", "Complex: Custom middleware"] }
                }
            ];
        },
        
        /**
         * Create mock Conversions questions
         * @returns {Array} Array of question objects
         */
        _createConversionsQuestions: function() {
            return [
                {
                    questionId: "C-Q1",
                    questionText: "What is the total data volume to be converted?",
                    answerOptions: [
                        { value: "Small", label: "Small (<100K records)", description: "Limited data volume" },
                        { value: "Medium", label: "Medium (100K-1M records)", description: "Moderate data volume" },
                        { value: "Large", label: "Large (>1M records)", description: "Large datasets" }
                    ],
                    hint: "Data volume impacts conversion approach and tools.",
                    detailedHint: "Small volumes (<100K records) can use LSMW or direct upload programs. Medium volumes (100K-1M) benefit from parallel processing. Large volumes (>1M) require specialized migration tools and staging tables.",
                    performanceContext: { category: "DataMigration", volumeLimits: ["LSMW: Up to 100K optimal", "Migration Cockpit: 100K-1M", "Custom programs: >1M with parallel processing"] }
                },
                {
                    questionId: "C-Q2",
                    questionText: "Does the conversion require complex data transformations?",
                    answerOptions: [
                        { value: "Simple", label: "Simple - Field mapping", description: "Direct field-to-field mapping" },
                        { value: "Complex", label: "Complex - Business logic", description: "Calculations, aggregations, validations" }
                    ],
                    hint: "Simple mappings use standard tools, complex logic needs custom programs.",
                    detailedHint: "Simple field mappings can leverage SAP S/4HANA Migration Cockpit with templates. Complex transformations (multi-source aggregation, business logic) require custom ABAP programs with proper error handling.",
                    performanceContext: { transformationComplexity: ["Simple: Migration Cockpit templates", "Complex: Custom ABAP with extensibility framework"] }
                },
                {
                    questionId: "C-Q3",
                    questionText: "How many source systems will feed this conversion?",
                    answerOptions: [
                        { value: "Single", label: "Single source", description: "One legacy system" },
                        { value: "Multiple", label: "Multiple sources (2-3)", description: "Few source systems" },
                        { value: "Many", label: "Many sources (>3)", description: "Complex landscape" }
                    ],
                    hint: "Multiple source systems increase complexity and coordination effort.",
                    detailedHint: "Single source conversions are straightforward with direct mapping. Multiple sources require data consolidation, deduplication, and master data harmonization.",
                    performanceContext: { sourceSystems: ["Single: Direct migration", "Multiple: Consolidation logic required", "Many: Complex data governance needed"] }
                }
            ];
        },
        
        /**
         * Create mock Enhancements questions
         * @returns {Array} Array of question objects
         */
        _createEnhancementsQuestions: function() {
            return [
                {
                    questionId: "E-Q1",
                    questionText: "What type of enhancement is required?",
                    answerOptions: [
                        { value: "UserExit", label: "User Exit / BADI", description: "Standard extensibility points" },
                        { value: "Modification", label: "Code Modification", description: "Changes to standard objects" },
                        { value: "Custom", label: "New Custom Object", description: "Z* programs/tables" }
                    ],
                    hint: "Enhancement types have different clean core implications.",
                    detailedHint: "User exits and BADIs are extensibility framework options (clean core). Modifications to standard code break clean core. New custom objects (Z*) depend on integration approach.",
                    performanceContext: { category: "Enhancement", methods: ["BADI: Preferred extensibility", "User Exit: Legacy but acceptable", "Modification: Avoid - breaks clean core"] }
                },
                {
                    questionId: "E-Q2",
                    questionText: "How much custom code is in the BADI implementation?",
                    answerOptions: [
                        { value: "Small", label: "Small (<500 lines)", description: "Simple logic" },
                        { value: "Medium", label: "Medium (500-2000 lines)", description: "Moderate complexity" },
                        { value: "Large", label: "Large (>2000 lines)", description: "Complex logic" }
                    ],
                    hint: "Code volume affects maintainability and upgrade impact.",
                    detailedHint: "Small BADIs (<500 lines) are easy to maintain during upgrades. Large implementations (>2000 lines) should be evaluated for standard functionality or Key User Extensibility.",
                    performanceContext: { codeVolume: ["Small: <500 lines - easy maintenance", "Medium: 500-2000 lines - moderate risk", "Large: >2000 lines - high maintenance effort"] }
                },
                {
                    questionId: "E-Q3",
                    questionText: "Does the custom object integrate with standard SAP tables?",
                    answerOptions: [
                        { value: "API", label: "Via Released APIs", description: "OData, CDS views, BAPIs" },
                        { value: "Direct", label: "Direct Table Access", description: "SELECT from standard tables" }
                    ],
                    hint: "Integration approach affects clean core classification.",
                    detailedHint: "Custom objects using released APIs and CDS views maintain clean core. Direct table access or database views break clean core and create upgrade risks.",
                    performanceContext: { integrationMethods: ["Released APIs: Upgrade-safe", "CDS views: Preferred for read access", "Direct tables: Avoid - breaks clean core"] }
                }
            ];
        },
        
        /**
         * Create mock Forms questions
         * @returns {Array} Array of question objects
         */
        _createFormsQuestions: function() {
            return [
                {
                    questionId: "F-Q1",
                    questionText: "What type of form output is required?",
                    answerOptions: [
                        { value: "InteractivePDF", label: "Interactive PDF", description: "Fillable PDF forms" },
                        { value: "Print", label: "Print Output", description: "Invoice, delivery note, etc." },
                        { value: "WebForm", label: "Web Form", description: "Online data entry" },
                        { value: "Email", label: "Email Notification", description: "Automated emails" }
                    ],
                    hint: "Output type influences technology choice and clean core alignment.",
                    detailedHint: "Interactive PDFs use Adobe Forms. Print outputs can use Smart Forms. Web forms leverage SAP Fiori with OData services. Email notifications use workflows or BTP services.",
                    performanceContext: { category: "Forms", technologies: ["Adobe Forms: Interactive PDFs", "Smart Forms: Print output", "Fiori: Web forms", "BTP: Email automation"] }
                },
                {
                    questionId: "F-Q2",
                    questionText: "How complex is the PDF form layout?",
                    answerOptions: [
                        { value: "Simple", label: "Simple (<20 fields)", description: "Basic form layout" },
                        { value: "Moderate", label: "Moderate (20-50 fields)", description: "Standard complexity" },
                        { value: "Complex", label: "Complex (>50 fields)", description: "Multi-page, dynamic" }
                    ],
                    hint: "Layout complexity affects development effort and technology choice.",
                    detailedHint: "Simple layouts (<20 fields) can use standard templates. Complex layouts (>50 fields, multi-page, dynamic sections) require Adobe LiveCycle Designer expertise.",
                    performanceContext: { formComplexity: ["Simple: <20 fields", "Moderate: 20-50 fields", "Complex: >50 fields with dynamic sections"] }
                },
                {
                    questionId: "F-Q3",
                    questionText: "What is the expected print volume?",
                    answerOptions: [
                        { value: "Low", label: "Low (<1000/day)", description: "Occasional printing" },
                        { value: "Medium", label: "Medium (1000-10000/day)", description: "Regular printing" },
                        { value: "High", label: "High (>10000/day)", description: "High volume" }
                    ],
                    hint: "Print volume affects infrastructure and optimization needs.",
                    detailedHint: "Low volume (<1000 pages/day) can use standard print processing. High volume (>10000 pages/day) requires print optimization, output management, and potentially third-party solutions.",
                    performanceContext: { printVolume: ["Low: Standard processing", "Medium: Output management setup", "High: Consider third-party tools"] }
                }
            ];
        },
        
        /**
         * Create mock Workflows questions
         * @returns {Array} Array of question objects
         */
        _createWorkflowsQuestions: function() {
            return [
                {
                    questionId: "W-Q1",
                    questionText: "What is the workflow complexity?",
                    answerOptions: [
                        { value: "Simple", label: "Simple (Single approval)", description: "One-step approval" },
                        { value: "MultiStep", label: "Multi-step (2-5 approvals)", description: "Sequential approvals" },
                        { value: "Complex", label: "Complex (Parallel, conditional)", description: "Advanced routing" }
                    ],
                    hint: "Complexity determines tool choice and clean core approach.",
                    detailedHint: "Simple approvals (single-step) use standard SAP Business Workflow. Multi-step workflows benefit from SAP Workflow Management on BTP. Complex process orchestration may need SAP Build Process Automation.",
                    performanceContext: { category: "Workflow", tools: ["Standard Workflow: Simple approvals", "BTP Workflow Management: Multi-step", "Build Process Automation: Complex orchestration"] }
                },
                {
                    questionId: "W-Q2",
                    questionText: "What is the expected workflow volume?",
                    answerOptions: [
                        { value: "Low", label: "Low (<100/day)", description: "Occasional workflows" },
                        { value: "Medium", label: "Medium (100-1000/day)", description: "Regular workflows" },
                        { value: "High", label: "High (>1000/day)", description: "High volume" }
                    ],
                    hint: "Volume affects infrastructure and performance considerations.",
                    detailedHint: "Low volume (<100 instances/day) uses standard configuration. High volume (>1000/day) requires performance tuning, parallel processing, and monitoring.",
                    performanceContext: { workflowVolume: ["Low: Standard config", "Medium: Add monitoring", "High: Performance tuning needed"] }
                },
                {
                    questionId: "W-Q3",
                    questionText: "Does the multi-step workflow require parallel approvals?",
                    answerOptions: [
                        { value: "Sequential", label: "Sequential Only", description: "One after another" },
                        { value: "Parallel", label: "Parallel Approvals", description: "Simultaneous approvals" }
                    ],
                    hint: "Parallel approvals add complexity but improve efficiency.",
                    detailedHint: "Sequential approvals are simpler to implement. Parallel approvals (multiple approvers simultaneously) require coordination logic but reduce approval time.",
                    performanceContext: { approvalPatterns: ["Sequential: Simple implementation", "Parallel: Requires consensus rules", "Mixed: Highest complexity"] }
                }
            ];
        },
        
        /**
         * Create default questions when object type is not found
         * @returns {Array} Array of question objects
         */
        _createDefaultQuestions: function() {
            return [
                {
                    questionId: "DEFAULT-Q1",
                    questionText: "What is the primary purpose of this object?",
                    answerOptions: [
                        { value: "Operational", label: "Operational", description: "Daily operations" },
                        { value: "Analytical", label: "Analytical", description: "Reporting and analytics" },
                        { value: "Integration", label: "Integration", description: "System integration" }
                    ],
                    hint: "Object purpose affects clean core alignment.",
                    detailedHint: "The object's primary purpose will determine the optimal implementation approach and clean core level.",
                    performanceContext: {}
                },
                {
                    questionId: "DEFAULT-Q2",
                    questionText: "What is the expected usage frequency?",
                    answerOptions: [
                        { value: "High", label: "High (Daily/Hourly)", description: "Frequent usage" },
                        { value: "Medium", label: "Medium (Weekly)", description: "Regular usage" },
                        { value: "Low", label: "Low (Monthly/Quarterly)", description: "Occasional usage" }
                    ],
                    hint: "Usage frequency impacts performance requirements.",
                    detailedHint: "Frequently used objects require optimized performance and may need caching or specialized implementations.",
                    performanceContext: {}
                },
                {
                    questionId: "DEFAULT-Q3",
                    questionText: "Is this object critical for business continuity?",
                    answerOptions: [
                        { value: "Yes", label: "Yes - Business Critical", description: "Directly impacts operations" },
                        { value: "No", label: "No - Non-Critical", description: "Support function only" }
                    ],
                    hint: "Criticality affects implementation approach.",
                    detailedHint: "Business-critical objects may require more robust implementations and failover mechanisms.",
                    performanceContext: {}
                }
            ];
        },
        
        /**
         * Create performance constraints for an object type
         * @param {string} objectType - The object type
         * @returns {Array} Array of constraint objects
         */
        _createPerformanceConstraints: function(objectType) {
            // Return constraints based on object type
            switch (objectType) {
                case "Reports":
                    return [
                        {
                            category: "Performance",
                            method: "CDS Views",
                            threshold: "≤1M records",
                            level: "A",
                            guidance: "For larger datasets, consider SAP Analytics Cloud"
                        },
                        {
                            category: "Response Time",
                            method: "Interactive Reports",
                            threshold: "<5 seconds",
                            level: "A",
                            guidance: "Optimize CDS views with proper indexing"
                        }
                    ];
                case "Interfaces":
                    return [
                        {
                            category: "Volume",
                            method: "OData API",
                            threshold: "≤5000 records/call",
                            level: "A",
                            guidance: "Use pagination for larger datasets"
                        },
                        {
                            category: "Frequency",
                            method: "Real-time Integration",
                            threshold: "≤1000 calls/hour",
                            level: "A",
                            guidance: "Consider batch processing for higher volumes"
                        }
                    ];
                default:
                    return [
                        {
                            category: "General",
                            method: objectType,
                            threshold: "Varies by implementation",
                            level: "B",
                            guidance: "Refer to SAP Best Practices for detailed thresholds"
                        }
                    ];
            }
        },
        
        /**
         * Create deployment constraints for an object type
         * @param {string} objectType - The object type
         * @returns {Array} Array of constraint objects
         */
        _createDeploymentConstraints: function(objectType) {
            return [
                {
                    title: "Cloud Public Edition Constraints",
                    description: "Cloud Public Edition does not support custom ABAP code. Use extensibility framework.",
                    severity: "High"
                },
                {
                    title: `${objectType} Specific Considerations`,
                    description: `${objectType} in Cloud require cloud-native implementation patterns.`,
                    severity: "Information"
                }
            ];
        },
        
        /**
         * Create examples for an object type
         * @param {string} objectType - The object type
         * @returns {Array} Array of example objects
         */
        _createExamples: function(objectType) {
            // Return mock examples based on object type
            const examples = [];
            
            switch (objectType) {
                case "Reports":
                    examples.push({
                        id: "r-ex-001",
                        title: "Management Dashboard",
                        scenario: "Healthcare",
                        challenge: "Executive leadership needed real-time KPI dashboard for patient admission metrics",
                        solution: "Used SAP Analytics Cloud embedded in S/4HANA with standard CDS views",
                        level: "Level A",
                        industry: "Healthcare",
                        technologies: ["SAP Analytics Cloud", "CDS Views", "HANA Live Models"],
                        volumeHandled: "500000 patient records",
                        performance: "Dashboard loads in <3 seconds",
                        implementationTime: "4 weeks"
                    });
                    break;
                case "Interfaces":
                    examples.push({
                        id: "i-ex-001",
                        title: "Real-time Order Integration via OData API",
                        scenario: "E-commerce Order Integration",
                        challenge: "Customer needed real-time order synchronization between e-commerce platform and S/4HANA with <5 second latency",
                        solution: "Implemented OData API with Enterprise Event Enablement for order creation notifications",
                        level: "Level A",
                        industry: "Retail",
                        technologies: ["OData v4 API", "Enterprise Events", "SAP Event Mesh"],
                        volumeHandled: "5000 orders/day",
                        performance: "Average 2.5 second end-to-end latency",
                        implementationTime: "6 weeks"
                    });
                    break;
                default:
                    examples.push({
                        id: "ex-001",
                        title: `Sample ${objectType} Implementation`,
                        scenario: "Generic",
                        challenge: `Typical ${objectType.toLowerCase()} implementation challenge`,
                        solution: `Standard solution approach for ${objectType.toLowerCase()}`,
                        level: "Level B",
                        industry: "Cross-Industry",
                        technologies: ["SAP S/4HANA", "SAP BTP"],
                        volumeHandled: "Medium volume",
                        performance: "Standard performance",
                        implementationTime: "8 weeks"
                    });
            }
            
            return examples;
        },
        
        /**
         * Get object type from question ID
         * @param {string} questionId - The question ID
         * @returns {string} The object type
         */
        _getObjectTypeFromQuestionId: function(questionId) {
            const prefix = questionId.charAt(0);
            
            const mapping = {
                "R": "Reports",
                "I": "Interfaces",
                "C": "Conversions",
                "E": "Enhancements",
                "F": "Forms",
                "W": "Workflows",
                "D": "DEFAULT"
            };
            
            return mapping[prefix] || "Reports"; // Default to Reports if not found
        }
    });
});