# QuestionFlow Seed Data Creation Guide

This document provides a structured approach for creating comprehensive QuestionFlow seed data for all RICEFW object types in the SAP Clean Core Solution Advisor.

## QuestionFlow Entity Structure

Each question in the QuestionFlow entity has the following structure:

```csv
ID;questionId;objectType;questionText;questionHint;detailedHint;answerCount;answerOptions;navigationRules;performanceContext;displayOrder;isActive;tenant
```

Key fields:
- **ID**: UUID (e.g., `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`)
- **questionId**: Format `{ObjectType}-Q{Number}` (e.g., `R-Q1`, `I-Q2`)
- **objectType**: One of: `Reports`, `Interfaces`, `Conversions`, `Enhancements`, `Forms`, `Workflows`
- **questionText**: The main question text (limit to 500 chars)
- **answerOptions**: JSON array of possible answers with structure:
  ```json
  [
    {"value":"Answer1","label":"Answer 1 Label","description":"Detailed description"},
    {"value":"Answer2","label":"Answer 2 Label","description":"Detailed description"}
  ]
  ```
- **navigationRules**: JSON defining the next question or final recommendation:
  ```json
  {
    "Answer1": {"nextQuestion":"R-Q2","finalAnswer":null},
    "Answer2": {"nextQuestion":null,"finalAnswer":"Level A","reasoning":"This is clean core compliant."}
  }
  ```

## Question Structure Guidelines

### 1. Reports (R) Questions

**Theme 1: Reporting Purpose**
- Report type (operational, management, regulatory, ad-hoc)
- Data source (standard tables, custom tables, external)
- Data volume (small, medium, large)
- Visualization requirements (tables, charts, dashboards)
- Distribution method (on-screen, print, export, email)

**Theme 2: Technical Implementation**
- Development approach (Fiori, ABAP, BTP)
- Performance requirements (real-time, batch, scheduled)
- Integration with external tools (SAC, PowerBI)
- Security requirements (standard auth, custom roles)

**Theme 3: Data Complexity**
- Data aggregation requirements
- Filtering and parameter options
- Historical data needs
- Calculated fields complexity
- Multi-source data joins

### 2. Interfaces (I) Questions

**Theme 1: Integration Type**
- Direction (inbound, outbound, bidirectional)
- Integration pattern (synchronous, asynchronous, batch)
- Technology (OData, RFC, SOAP, REST, IDOC)
- Trigger mechanism (event-based, scheduled, user-initiated)

**Theme 2: Data Characteristics**
- Volume (records per call/batch)
- Frequency (real-time, hourly, daily, weekly)
- Complexity (simple mapping, transformations, validations)
- Security requirements (encryption, authentication)

**Theme 3: Error Handling**
- Error management approach (retry, queue, manual)
- Monitoring requirements (standard, custom, alerts)
- Recovery capabilities (automated, manual)
- Business criticality (low, medium, high)

### 3. Conversions (C) Questions

**Theme 1: Data Migration Scope**
- Data volume (small, medium, large)
- Source systems (single, multiple, legacy)
- Data quality (clean, requires cleansing)
- Historical data requirements (all, limited, none)

**Theme 2: Transformation Complexity**
- Mapping complexity (simple, moderate, complex)
- Business rules (few, many, complex)
- Validation requirements (basic, advanced, custom)
- Reference data dependencies (standard, custom)

**Theme 3: Migration Approach**
- Migration method (direct, staging, phased)
- Tool selection (standard SAP, custom, third-party)
- Testing approach (automated, manual, sampling)
- Cutover strategy (big bang, phased, parallel)

### 4. Enhancements (E) Questions

**Theme 1: Enhancement Type**
- Enhancement method (BADI, exit, modification, custom)
- Scope (field additions, logic changes, process changes)
- Standard functionality gap (minor, moderate, major)
- Impact area (UI, process, reporting, master data)

**Theme 2: Implementation Complexity**
- Code complexity (simple, moderate, complex)
- Integration points (few, many, critical)
- Performance impact (minimal, moderate, significant)
- Security implications (standard, custom, sensitive)

**Theme 3: Lifecycle Management**
- Upgrade impact (low, medium, high)
- Testing requirements (standard, comprehensive, complex)
- Documentation needs (basic, detailed, extensive)
- Maintenance strategy (standard, custom, third-party)

### 5. Forms (F) Questions

**Theme 1: Form Requirements**
- Output type (print, interactive, email)
- Form complexity (simple, moderate, complex)
- Layout requirements (standard, custom, dynamic)
- Legal/compliance requirements (standard, specific)

**Theme 2: Technical Approach**
- Technology selection (Smart Forms, Adobe, custom)
- Data source complexity (single, multiple, external)
- Integration requirements (standalone, workflow, approval)
- Volume considerations (low, medium, high)

**Theme 3: User Experience**
- Interactive capabilities (none, basic, advanced)
- Mobile requirements (not required, basic, full)
- Accessibility needs (standard, enhanced, full)
- Multilingual support (single, few, many languages)

### 6. Workflows (W) Questions

**Theme 1: Process Complexity**
- Process type (approval, notification, task management)
- Process complexity (linear, branching, complex)
- Decision points (few, several, many)
- Participant types (internal, external, mixed)

**Theme 2: Integration Requirements**
- System integration (single, multiple, external)
- Data requirements (simple, moderate, complex)
- User interface (standard, custom, mobile)
- Notification methods (in-app, email, mobile)

**Theme 3: Performance & Monitoring**
- Volume expectations (low, medium, high)
- Performance requirements (standard, enhanced)
- Monitoring needs (basic, detailed, real-time)
- Reporting requirements (standard, custom, detailed)

## Question Flow Structure

For each object type, design a decision tree with approximately 15-20 questions:

1. Start with broad classification questions
2. Branch into specific scenarios based on initial answers
3. Add detailed technical questions for each branch
4. Ensure every path leads to a Clean Core Level recommendation (A, B, C, or D)
5. Include detailed reasoning for each final recommendation

## Terminal Nodes and Recommendations

Ensure every path terminates with a final recommendation:

- **Level A (Fully Clean Core)**: Standard SAP functionality, released APIs, BTP extensions
- **Level B (Enhanced Clean Core)**: Standard extensibility framework, BADIs, minimal custom code
- **Level C (Managed Extension)**: Custom code with clean core principles, managed technical debt
- **Level D (Non-Clean Core)**: Legacy modifications, direct table access, custom ABAP in core

## Navigation Rules Structure

Always include proper reasoning in the final nodes:

```json
{
  "SelectedAnswer": {
    "nextQuestion": null,
    "finalAnswer": "Level A",
    "reasoning": "This solution uses standard SAP Fiori apps with OData services and remains fully clean core compliant, supporting future upgrades and cloud migration."
  }
}
```

## Question Creation Template

For each new question, follow this template:

1. **Question ID**: Follow the pattern `{ObjectType}-Q{Number}`
2. **Question Text**: Clear, concise question (What, How, Does, etc.)
3. **Question Hint**: Brief guidance that appears below the question
4. **Detailed Hint**: More comprehensive explanation including SAP best practices
5. **Answer Options**: 2-4 clear options with values, labels, and descriptions
6. **Navigation Rules**: JSON mapping each answer to next question or final recommendation
7. **Performance Context**: Add relevant thresholds or constraints

## Testing Your Questions

Before adding questions to the CSV:

1. Validate JSON syntax for answerOptions and navigationRules
2. Test each path to ensure it leads to a recommendation
3. Check for circular references or dead ends
4. Verify logical consistency and technical accuracy
5. Ensure questions address both business and technical aspects

## Best Practices

1. Use clear, concise language
2. Focus on one aspect per question
3. Provide informative hints to guide users
4. Include real-world context in detailed hints
5. Ensure answers are distinct and non-overlapping
6. Balance technical and business considerations
7. Reference SAP best practices in reasoning
8. Consider cloud readiness in recommendations
9. Address upgrade impact explicitly
10. Include technical debt considerations

## CSV Format Example

```csv
ID;questionId;objectType;questionText;questionHint;detailedHint;answerCount;answerOptions;navigationRules;performanceContext;displayOrder;isActive;tenant
50000001-0005-0005-0005-000000000004;W-Q4;Workflows;Does the complex workflow integrate with external systems?;External integrations increase complexity and maintenance.;Workflows limited to SAP systems use standard interfaces. External system integration (email, third-party APIs) requires BTP Integration Suite or custom connectors.;2;[{"value":"Internal","label":"Internal Only","description":"SAP systems only"},{"value":"External","label":"External Systems","description":"Third-party integrations"}];{"Internal":{"nextQuestion":null,"finalAnswer":"Level B","reasoning":"Complex workflow limited to SAP systems - Level B Enhanced Clean Core."},"External":{"nextQuestion":null,"finalAnswer":"Level C","reasoning":"Complex workflow with external integrations - Level C managed extension."}};{"externalIntegration":["Internal: Standard SAP interfaces","External: BTP Integration Suite","APIs: Released APIs preferred"]};4;true;
```

## Expected Contribution Goals

To reach the goal of 100+ questions:

- **Reports (R)**: 20 questions
- **Interfaces (I)**: 20 questions
- **Conversions (C)**: 15 questions
- **Enhancements (E)**: 20 questions
- **Forms (F)**: 15 questions
- **Workflows (W)**: 15 questions

**Total**: 105 questions