# Technical Specification (Revised v2): Integrated Clean Core Guidance Step

This document outlines the technical implementation plan for a new, dedicated "Guidance" step (Step 3) in the wizard. This step will replace the previous implementation of contextual panels and provide comprehensive information based on the RICEFW object type selected in Step 2.

## 1. **Executive Summary**

The requirement is to create a new **Step 3** in the analysis wizard that serves as a dedicated educational screen. This step will display detailed Clean Core guidance for the `objectType` (e.g., "Forms", "Report") chosen in Step 2. It will present the rich, structured content from the provided markdown files (e.g., `Forms-CleanCore-Complete.md`) in a user-friendly manner, integrating level descriptions, performance thresholds, constraints, and real-world examples.

This feature will be implemented by:
1.  **Enhancing the Data Model** to store the highly structured guidance content.
2.  **Updating the UI** to include a new wizard step containing an `sap.uxap.ObjectPageLayout` for a rich, sectioned display.
3.  **Removing** the now-redundant `ConstraintsPanel` and `ExamplesPanel` from the subsequent analysis step (Step 4).

## 2. **Revised Data Model (DB Layer)**

To capture the full depth of the provided markdown files, the data model will be significantly expanded.

**File: `db/schema.cds`**
```cds
using { cuid, managed } from '@sap/cds/common';

namespace sd;

@cds.autoexpose
entity CleanCoreGuidance : cuid, managed {
    key ricefwType      : String(1); // 'R', 'I', 'C', 'E', 'F', 'W'
        title           : String(255); // e.g., "Clean Core Levels A–D for SAP Report Design"
        introduction    : LargeString; // Introduction paragraph with "Why Clean Core?" section
        apiExplanation  : LargeString; // "What is an API in SAP?" section (for R, I types)
        // Storing structured content as stringified JSON is flexible
        decisionTree    : LargeString; // JSON array for the decision tree table
        determinationFactors : LargeString; // JSON array for the factors table
        performanceThresholds: LargeString; // JSON array for the thresholds table
        deploymentConstraints: LargeString; // Simple text or markdown (bullet list)
        realWorldScenarios: LargeString; // JSON array for scenarios section
        officialGuidance: LargeString; // JSON array for the guidance table
        strategyMatrix  : LargeString; // JSON array for the strategy matrix table
        // Additional content sections
        summaryTable    : LargeString; // Summary table at the end (markdown or JSON)
        designGuidance  : LargeString; // "Design Guidance" section (numbered list)
        beginnerFaq     : LargeString; // "Beginner FAQ" section (Q&A format)
}

@cds.autoexpose
entity CleanCoreLevels : cuid, managed {
    key level           : String(1); // 'A', 'B', 'C', 'D'
    key ricefwType      : String(1); // 'R', 'I', 'C', 'E', 'F', 'W'
        title           : String(100); // e.g., "Level A – "Cleanest" (Gold Standard)"
        // Detailed level information from markdown files
        whatItMeans     : LargeString; // "What it means" section
        beginnerAnalogy : LargeString; // "Beginner Analogy" section
        toolsUsed       : LargeString; // "Tools You Use" section (bullet list)
        exampleReport   : LargeString; // "Example Report" or "Example Interface" section
        whyReasoning    : LargeString; // "Why it's best/acceptable/risky/bad" section
        // Summary table columns
        description     : LargeString;
        technology      : LargeString;
        upgradeComplexity: String(50);
        maintenanceEffort: String(50);
        cloudReadiness  : String(50);
        technicalRisk   : String(50);
        // Link to the parent guidance document
        guidance        : Association to CleanCoreGuidance;
}

@cds.autoexpose
entity RealWorldExamples : cuid, managed {
    key exampleId       : String(10);
        title           : String(255);
        scenario        : LargeString; // The scenario description
        design          : LargeString; // The design/solution approach
        whyLevel        : LargeString; // Why it's classified at this level
        problemStatement: LargeString; // Additional problem statement (from scenarios)
        solutionDescription: LargeString; // Additional solution details
        outcome         : LargeString; // Outcome/benefit of the solution
        // Add a simple text field for the level, as it's for display purposes
        associatedLevel : String(1); // A, B, C, D
        industry        : String(100);
        businessBenefit : LargeString;
        ricefwType      : String(1); // R, I, C, E, F, W
}
```

**Seed Data Files (`db/data/`)**
*   `sd-CleanCoreGuidance.csv`: Will be created to hold the structured tables (as JSON strings) and text sections for each RICEFW type.
*   `sd-CleanCoreLevels.csv`: Will be created to store the detailed breakdown for each level from the "Clean Core Levels for Forms" table.
*   `sd-RealWorldExamples.csv`: Will be created from the `Examples` and `Real-World Scenarios` sections of the markdown files.

### Seed Data Preparation Strategy

The markdown files contain rich formatting (bold text, bullet lists, tables, emojis). This content must be transformed into database-compatible format:

1. **Text Content with Formatting:**
   - Convert markdown bold (`**text**`) to HTML (`<b>text</b>`)
   - Convert bullet lists to HTML unordered lists (`<ul><li>item</li></ul>`)
   - Preserve emojis as-is (🟩, 🟦, 🟨, 🟥, etc.)
   - Store in `LargeString` fields ready for `sap.m.FormattedText` rendering

2. **Table Content:**
   - Parse markdown tables into JSON arrays
   - Each row becomes a JSON object with key-value pairs matching column headers
   - Stringify the entire array and store in `LargeString` fields
   - Example for Decision Tree:
     ```json
     [
       {
         "qid": "Q1",
         "question": "Forms Enhancement Needed?",
         "answers": "2",
         "navigation": "Yes → Q2; No → Level A",
         "hint": "Check standard templates",
         "detailedHint": "Evaluate if standard SAPscript/Smart Forms meet requirements..."
       }
     ]
     ```

3. **Level-Specific Content:**
   - Extract the detailed sections for each level (A, B, C, D)
   - Store "What it means", "Beginner Analogy", "Tools You Use", "Example", and "Why" as separate fields
   - Convert bullet lists and formatted text to HTML

4. **Examples Content:**
   - Parse the `Examples/Forms_Examples_AtoD.md` files
   - Each example becomes a row with title, scenario, design, whyLevel
   - Link to the appropriate level (A, B, C, or D)

**Example CSV Structure for `sd-CleanCoreLevels.csv`:**
```csv
ID;level;ricefwType;title;whatItMeans;beginnerAnalogy;toolsUsed;exampleReport;whyReasoning;description;technology;upgradeComplexity;maintenanceEffort;cloudReadiness;technicalRisk;createdAt;modifiedAt
guid-1;A;R;Level A – "Cleanest" (Gold Standard);<ul><li>You use only officially released APIs and tools.</li><li>No direct access to SAP database tables.</li><li>No modifications to SAP standard code.</li></ul>;You build a Windows app using Microsoft-approved tools like .NET or PowerShell cmdlets...;<ul><li>CDS Views from SAP API Hub (e.g., I_SalesOrderItem)</li><li>OData Services</li><li>SAP BTP apps (CAP/RAP)</li></ul>;You build a Fiori app that shows sales orders using the released CDS view I_SalesOrderItem...;<ul><li>Fully upgrade-safe</li><li>No risk of breaking SAP during upgrades</li><li>SAP supports it officially</li></ul>;Standard SAP Apps/APIs;Released CDS, OData, BTP;None;Low;Full;Low;2025-11-13;2025-11-13
```

## 3. **Revised Service Layer (SRV Layer)**

The service will expose the new data structures. We will use a single, comprehensive function import to gather all necessary data for the `ObjectPageLayout` in one backend call.

**File: `srv/service.cds`**
```cds
using { sd } from '../db/schema';

// Define a structured type for the response
type FullGuidance {
    guidance : sd.CleanCoreGuidance;
    levels   : array of sd.CleanCoreLevels;
    examples : array of sd.RealWorldExamples;
}

service SolutionAdvisorSvcs @(path: '/service/SolutionAdvisorSvcs') {
    // ... existing entity exposures

    // Function to get all guidance for a RICEFW type
    function getFullGuidance(ricefwType: String) returns FullGuidance;

    // ... other entities
}
```

**File: `srv/service.js`**
```javascript
// ... inside the class SolutionAdvisorSvcs extends cds.ApplicationService
this.on('getFullGuidance', async (req) => {
    const { ricefwType } = req.data;
    const { CleanCoreGuidance, CleanCoreLevels, RealWorldExamples } = this.entities;

    const guidance = await SELECT.one.from(CleanCoreGuidance).where({ ricefwType });
    const levels = await SELECT.from(CleanCoreLevels).where({ ricefwType });
    const examples = await SELECT.from(RealWorldExamples).where({ ricefwType });

    return {
        guidance: guidance,
        levels: levels,
        examples: examples
    };
});
```

## 4. **Revised UI Layer (APP Layer)**

### 4.1. Wizard View (`Wizard.view.xml`)
A new `WizardStep` will be added. This step will contain a view that hosts the `ObjectPageLayout`.

```xml
<WizardStep id="guidanceStep" title="Step 3: Clean Core Guidance" validated="true">
    <core:mvc.View viewName="sd.solutionadvisor.view.Guidance" type="XML" height="100%"/>
</WizardStep>
```

### 4.2. New Guidance View (`Guidance.view.xml`)
A new view file will be created at `app/solutionadvisor/webapp/view/Guidance.view.xml`. This will contain the `ObjectPageLayout` with comprehensive sections.

```xml
<mvc:View controllerName="sd.solutionadvisor.controller.Guidance"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.uxap"
    xmlns:m="sap.m"
    xmlns:f="sap.ui.layout.form"
    xmlns:core="sap.ui.core">
    <ObjectPageLayout id="guidanceObjectPage" enableLazyLoading="false">
        <headerTitle>
            <ObjectPageHeader objectTitle="{guidance>/guidance/title}" />
        </headerTitle>
        <headerContent>
            <!-- Introduction and API Explanation -->
            <m:VBox>
                <m:FormattedText htmlText="{guidance>/guidance/introduction}" />
                <m:FormattedText htmlText="{guidance>/guidance/apiExplanation}" visible="{= ${guidance>/guidance/apiExplanation} !== null }" />
            </m:VBox>
        </headerContent>
        <sections>
            <!-- Section 1: Clean Core Levels - Detailed Breakdown -->
            <ObjectPageSection id="levelsSection" title="Clean Core Levels - Detailed Breakdown">
                <subSections>
                    <!-- Level A -->
                    <ObjectPageSubSection id="levelASubSection" title="🟩 Level A - Cleanest (Gold Standard)">
                        <blocks>
                            <m:VBox class="sapUiSmallMargin">
                                <m:Label text="What it means:" design="Bold" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'A', field: 'whatItMeans'}}" />
                                
                                <m:Label text="Beginner Analogy:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'A', field: 'beginnerAnalogy'}}" />
                                
                                <m:Label text="Tools You Use:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'A', field: 'toolsUsed'}}" />
                                
                                <m:Label text="Example:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'A', field: 'exampleReport'}}" />
                                
                                <m:Label text="Why it's best:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'A', field: 'whyReasoning'}}" />
                            </m:VBox>
                        </blocks>
                    </ObjectPageSubSection>
                    
                    <!-- Level B -->
                    <ObjectPageSubSection id="levelBSubSection" title="🟦 Level B - Classic but Acceptable">
                        <blocks>
                            <m:VBox class="sapUiSmallMargin">
                                <m:Label text="What it means:" design="Bold" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'B', field: 'whatItMeans'}}" />
                                
                                <m:Label text="Beginner Analogy:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'B', field: 'beginnerAnalogy'}}" />
                                
                                <m:Label text="Tools You Use:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'B', field: 'toolsUsed'}}" />
                                
                                <m:Label text="Example:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'B', field: 'exampleReport'}}" />
                                
                                <m:Label text="Why it's acceptable:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'B', field: 'whyReasoning'}}" />
                            </m:VBox>
                        </blocks>
                    </ObjectPageSubSection>
                    
                    <!-- Level C -->
                    <ObjectPageSubSection id="levelCSubSection" title="🟨 Level C - Risky Legacy">
                        <blocks>
                            <m:VBox class="sapUiSmallMargin">
                                <m:Label text="What it means:" design="Bold" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'C', field: 'whatItMeans'}}" />
                                
                                <m:Label text="Beginner Analogy:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'C', field: 'beginnerAnalogy'}}" />
                                
                                <m:Label text="Tools You Use:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'C', field: 'toolsUsed'}}" />
                                
                                <m:Label text="Example:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'C', field: 'exampleReport'}}" />
                                
                                <m:Label text="Why it's risky:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'C', field: 'whyReasoning'}}" />
                            </m:VBox>
                        </blocks>
                    </ObjectPageSubSection>
                    
                    <!-- Level D -->
                    <ObjectPageSubSection id="levelDSubSection" title="🟥 Level D - Do Not Do This (Modifications)">
                        <blocks>
                            <m:VBox class="sapUiSmallMargin">
                                <m:Label text="What it means:" design="Bold" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'D', field: 'whatItMeans'}}" />
                                
                                <m:Label text="Beginner Analogy:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'D', field: 'beginnerAnalogy'}}" />
                                
                                <m:Label text="Tools You Use:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'D', field: 'toolsUsed'}}" />
                                
                                <m:Label text="Example:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'D', field: 'exampleReport'}}" />
                                
                                <m:Label text="Why it's bad:" design="Bold" class="sapUiTinyMarginTop" />
                                <m:FormattedText htmlText="{path: 'guidance>/levels', formatter: '.getLevelField', formatOptions: {level: 'D', field: 'whyReasoning'}}" />
                            </m:VBox>
                        </blocks>
                    </ObjectPageSubSection>
                    
                    <!-- Summary Table for all levels -->
                    <ObjectPageSubSection id="levelsSummarySubSection" title="Summary Table">
                        <blocks>
                            <m:Table id="levelsSummaryTable" items="{guidance>/levels}" width="auto">
                                <m:columns>
                                    <m:Column><m:Text text="Level" /></m:Column>
                                    <m:Column><m:Text text="Description" /></m:Column>
                                    <m:Column><m:Text text="Technology" /></m:Column>
                                    <m:Column><m:Text text="Upgrade Complexity" /></m:Column>
                                    <m:Column><m:Text text="Maintenance Effort" /></m:Column>
                                    <m:Column><m:Text text="Cloud Readiness" /></m:Column>
                                    <m:Column><m:Text text="Technical Risk" /></m:Column>
                                </m:columns>
                                <m:items>
                                    <m:ColumnListItem>
                                        <m:cells>
                                            <m:Text text="{guidance>level}" />
                                            <m:Text text="{guidance>description}" />
                                            <m:Text text="{guidance>technology}" />
                                            <m:Text text="{guidance>upgradeComplexity}" />
                                            <m:Text text="{guidance>maintenanceEffort}" />
                                            <m:Text text="{guidance>cloudReadiness}" />
                                            <m:Text text="{guidance>technicalRisk}" />
                                        </m:cells>
                                    </m:ColumnListItem>
                                </m:items>
                            </m:Table>
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

            <!-- Section 2: Decision Tree -->
            <ObjectPageSection id="decisionTreeSection" title="Decision Tree">
                <subSections>
                    <ObjectPageSubSection>
                        <blocks>
                            <m:Table id="decisionTreeTable" items="{guidance>/guidance/decisionTree}" width="auto">
                                <m:columns>
                                    <m:Column width="5%"><m:Text text="Q.ID" /></m:Column>
                                    <m:Column width="25%"><m:Text text="Question" /></m:Column>
                                    <m:Column width="10%"><m:Text text="Answers" /></m:Column>
                                    <m:Column width="25%"><m:Text text="Navigation/Recommendation" /></m:Column>
                                    <m:Column width="15%"><m:Text text="Hint" /></m:Column>
                                    <m:Column width="20%"><m:Text text="Detailed Hint" /></m:Column>
                                </m:columns>
                                <m:items>
                                    <m:ColumnListItem>
                                        <m:cells>
                                            <m:Text text="{guidance>qid}" />
                                            <m:Text text="{guidance>question}" />
                                            <m:Text text="{guidance>answers}" />
                                            <m:Text text="{guidance>navigation}" />
                                            <m:Text text="{guidance>hint}" />
                                            <m:Text text="{guidance>detailedHint}" />
                                        </m:cells>
                                    </m:ColumnListItem>
                                </m:items>
                            </m:Table>
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

            <!-- Section 3: Determination Factors & Performance -->
            <ObjectPageSection id="factorsPerformanceSection" title="Determination Factors & Performance">
                <subSections>
                    <ObjectPageSubSection id="determinationFactorsSubSection" title="Determination Factors">
                        <blocks>
                            <m:Table id="determinationFactorsTable" items="{guidance>/guidance/determinationFactors}" width="auto">
                                <m:columns>
                                    <m:Column><m:Text text="Factor" /></m:Column>
                                    <m:Column><m:Text text="Level A Criteria" /></m:Column>
                                    <m:Column><m:Text text="Level B Criteria" /></m:Column>
                                    <m:Column><m:Text text="Level C Criteria" /></m:Column>
                                    <m:Column><m:Text text="Level D Criteria" /></m:Column>
                                </m:columns>
                                <m:items>
                                    <m:ColumnListItem>
                                        <m:cells>
                                            <m:Text text="{guidance>factor}" />
                                            <m:Text text="{guidance>levelA}" />
                                            <m:Text text="{guidance>levelB}" />
                                            <m:Text text="{guidance>levelC}" />
                                            <m:Text text="{guidance>levelD}" />
                                        </m:cells>
                                    </m:ColumnListItem>
                                </m:items>
                            </m:Table>
                        </blocks>
                    </ObjectPageSubSection>
                    <ObjectPageSubSection id="performanceThresholdsSubSection" title="Performance Thresholds">
                        <blocks>
                            <m:Table id="performanceThresholdsTable" items="{guidance>/guidance/performanceThresholds}" width="auto">
                                <m:columns>
                                    <m:Column><m:Text text="Metric" /></m:Column>
                                    <m:Column><m:Text text="Level A Threshold" /></m:Column>
                                    <m:Column><m:Text text="Level B Threshold" /></m:Column>
                                    <m:Column><m:Text text="Forces Level C" /></m:Column>
                                    <m:Column><m:Text text="Example Scenario" /></m:Column>
                                </m:columns>
                                <m:items>
                                    <m:ColumnListItem>
                                        <m:cells>
                                            <m:Text text="{guidance>metric}" />
                                            <m:Text text="{guidance>levelAThreshold}" />
                                            <m:Text text="{guidance>levelBThreshold}" />
                                            <m:Text text="{guidance>forcesLevelC}" />
                                            <m:Text text="{guidance>exampleScenario}" />
                                        </m:cells>
                                    </m:ColumnListItem>
                                </m:items>
                            </m:Table>
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

            <!-- Section 4: Deployment Constraints -->
            <ObjectPageSection id="deploymentConstraintsSection" title="Deployment Constraints">
                <subSections>
                    <ObjectPageSubSection>
                        <blocks>
                            <m:FormattedText htmlText="{guidance>/guidance/deploymentConstraints}" />
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

            <!-- Section 5: Real-World Examples -->
            <ObjectPageSection id="realWorldExamplesSection" title="Real-World Examples">
                <subSections>
                    <ObjectPageSubSection>
                        <blocks>
                            <!-- Display examples grouped by level -->
                            <m:List items="{guidance>/examples}">
                                <m:StandardListItem 
                                    title="{guidance>title}" 
                                    description="{guidance>scenario}"
                                    info="{guidance>associatedLevel}"
                                    type="Active"
                                    press="onExamplePress" />
                            </m:List>
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

            <!-- Section 6: SAP Official Guidance -->
            <ObjectPageSection id="officialGuidanceSection" title="SAP Official Guidance">
                <subSections>
                    <ObjectPageSubSection>
                        <blocks>
                            <m:Table id="officialGuidanceTable" items="{guidance>/guidance/officialGuidance}" width="auto">
                                <m:columns>
                                    <m:Column><m:Text text="Level" /></m:Column>
                                    <m:Column><m:Text text="Documentation Reference" /></m:Column>
                                    <m:Column><m:Text text="Best Practices" /></m:Column>
                                </m:columns>
                                <m:items>
                                    <m:ColumnListItem>
                                        <m:cells>
                                            <m:Text text="{guidance>level}" />
                                            <m:Text text="{guidance>documentation}" />
                                            <m:Text text="{guidance>bestPractices}" />
                                        </m:cells>
                                    </m:ColumnListItem>
                                </m:items>
                            </m:Table>
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

            <!-- Section 7: Strategy Matrix -->
            <ObjectPageSection id="strategyMatrixSection" title="Strategy Matrix">
                <subSections>
                    <ObjectPageSubSection>
                        <blocks>
                            <m:Table id="strategyMatrixTable" items="{guidance>/guidance/strategyMatrix}" width="auto">
                                <m:columns>
                                    <m:Column><m:Text text="Scenario" /></m:Column>
                                    <m:Column><m:Text text="Level" /></m:Column>
                                    <m:Column><m:Text text="Approach" /></m:Column>
                                    <m:Column><m:Text text="Tools" /></m:Column>
                                    <m:Column><m:Text text="Effort" /></m:Column>
                                    <m:Column><m:Text text="Key Considerations" /></m:Column>
                                </m:columns>
                                <m:items>
                                    <m:ColumnListItem>
                                        <m:cells>
                                            <m:Text text="{guidance>scenario}" />
                                            <m:Text text="{guidance>level}" />
                                            <m:Text text="{guidance>approach}" />
                                            <m:Text text="{guidance>tools}" />
                                            <m:Text text="{guidance>effort}" />
                                            <m:Text text="{guidance>keyConsiderations}" />
                                        </m:cells>
                                    </m:ColumnListItem>
                                </m:items>
                            </m:Table>
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

            <!-- Section 8: Design Guidance & FAQ (if available) -->
            <ObjectPageSection id="guidanceAndFaqSection" title="Design Guidance & FAQ" visible="{= ${guidance>/guidance/designGuidance} !== null || ${guidance>/guidance/beginnerFaq} !== null }">
                <subSections>
                    <ObjectPageSubSection title="Design Guidance" visible="{= ${guidance>/guidance/designGuidance} !== null }">
                        <blocks>
                            <m:FormattedText htmlText="{guidance>/guidance/designGuidance}" />
                        </blocks>
                    </ObjectPageSubSection>
                    <ObjectPageSubSection title="Beginner FAQ" visible="{= ${guidance>/guidance/beginnerFaq} !== null }">
                        <blocks>
                            <m:FormattedText htmlText="{guidance>/guidance/beginnerFaq}" />
                        </blocks>
                    </ObjectPageSubSection>
                </subSections>
            </ObjectPageSection>

        </sections>
    </ObjectPageLayout>
</mvc:View>
```

### 4.3. New Guidance Controller (`Guidance.controller.js`)
A new controller will be created at `app/solutionadvisor/webapp/controller/Guidance.controller.js`.

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, JSONModel, MessageBox) => {
    "use strict";
    return Controller.extend("sd.solutionadvisor.controller.Guidance", {
        onInit() {
            this.getView().setModel(new JSONModel({
                guidance: null,
                levels: [],
                examples: []
            }), "guidance");
        },

        /**
         * Formatter to get a specific field from a level
         * @param {Array} levels - Array of level objects
         * @param {string} level - The level to find (A, B, C, D)
         * @param {string} field - The field name to retrieve
         * @returns {string} The field value
         */
        getLevelField(levels, level, field) {
            if (!levels || !Array.isArray(levels)) return "";
            const levelObj = levels.find(l => l.level === level);
            return levelObj ? (levelObj[field] || "") : "";
        },

        /**
         * This function will be called by the main Wizard controller
         * @param {string} sRicefwType - The RICEFW type character (R, I, C, E, F, W)
         */
        loadGuidance(sRicefwType) {
            const oModel = this.getView().getModel(); // OData Model
            const oGuidanceModel = this.getView().getModel("guidance");
            
            this.getView().setBusy(true);

            // Use OData V4 function import
            const oOperation = oModel.bindContext(`/getFullGuidance(...)`);
            oOperation.setParameter("ricefwType", sRicefwType);

            oOperation.execute().then(() => {
                const oData = oOperation.getBoundContext().getObject();
                
                // Parse the JSON strings back into objects/arrays for table binding
                if (oData.guidance) {
                    try {
                        oData.guidance.decisionTree = JSON.parse(oData.guidance.decisionTree || '[]');
                        oData.guidance.determinationFactors = JSON.parse(oData.guidance.determinationFactors || '[]');
                        oData.guidance.performanceThresholds = JSON.parse(oData.guidance.performanceThresholds || '[]');
                        oData.guidance.realWorldScenarios = JSON.parse(oData.guidance.realWorldScenarios || '[]');
                        oData.guidance.officialGuidance = JSON.parse(oData.guidance.officialGuidance || '[]');
                        oData.guidance.strategyMatrix = JSON.parse(oData.guidance.strategyMatrix || '[]');
                        
                        // The text fields (introduction, apiExplanation, deploymentConstraints, etc.)
                        // are already in the correct format and don't need parsing
                    } catch (error) {
                        console.error("Error parsing JSON fields:", error);
                        MessageBox.error("Failed to parse guidance data. Please contact support.");
                        this.getView().setBusy(false);
                        return;
                    }
                }
                
                // Set the parsed data to the model
                oGuidanceModel.setData(oData);
                this.getView().setBusy(false);
            }).catch(oError => {
                console.error("Failed to load guidance:", oError);
                MessageBox.error("Failed to load Clean Core guidance. Please try again.");
                this.getView().setBusy(false);
            });
        },

        /**
         * Handle example press to show details in a dialog
         * @param {sap.ui.base.Event} oEvent - The press event
         */
        onExamplePress(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext("guidance");
            const oExample = oContext.getObject();

            // Create and show a dialog with example details
            if (!this._exampleDialog) {
                this._exampleDialog = new sap.m.Dialog({
                    title: "{guidance>title}",
                    contentWidth: "600px",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Scenario:", design: "Bold" }),
                                new sap.m.FormattedText({ htmlText: "{guidance>scenario}" }),
                                new sap.m.Label({ text: "Design/Solution:", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new sap.m.FormattedText({ htmlText: "{guidance>design}" }),
                                new sap.m.Label({ text: "Why this level:", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new sap.m.FormattedText({ htmlText: "{guidance>whyLevel}" }),
                                new sap.m.Label({ text: "Outcome:", design: "Bold", class: "sapUiTinyMarginTop", visible: "{= ${guidance>outcome} !== null }" }),
                                new sap.m.FormattedText({ htmlText: "{guidance>outcome}", visible: "{= ${guidance>outcome} !== null }" })
                            ]
                        }).addStyleClass("sapUiSmallMargin")
                    ],
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: () => {
                            this._exampleDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this._exampleDialog);
            }

            this._exampleDialog.setModel(this.getView().getModel("guidance"), "guidance");
            this._exampleDialog.bindElement({
                path: oContext.getPath(),
                model: "guidance"
            });
            this._exampleDialog.open();
        }
    });
});
```

### 4.4. Main Wizard Controller (`Wizard.controller.js`)
The main wizard controller will be updated to call the new Guidance controller.

```javascript
// In onInit or a relevant function
this._guidanceView = this.byId("guidanceStep").getContent()[0];
this._guidanceController = this._guidanceView.getController();

// When navigating from Step 2 to Step 3
const sObjectType = this.getView().getModel("wizardModel").getProperty("/objectType");
this._guidanceController.loadGuidance(sObjectType.charAt(0));
```

### 4.5. Cleanup
*   The `ConstraintsPanel.fragment.xml` and `ExamplesPanel.fragment.xml` will be removed.
*   All related code (`onConstraintsPanelToggle`, `_loadConstraints`, `_loadExamples`) will be deleted from `Wizard.controller.js`.
*   The dynamic question-rendering logic will now be part of **Step 4**.

---

## 5. **Implementation Checklist**

### Phase 1: Database Schema & Seed Data
- [ ] Update `db/schema.cds` with new entities (`CleanCoreGuidance`, `CleanCoreLevels`, `RealWorldExamples`)
- [ ] Create script to parse markdown files and generate CSV seed data
  - [ ] Parse `CleanCore_Report_Levels.md` → `sd-CleanCoreGuidance.csv` (R)
  - [ ] Parse `CleanCore_Interface_Levels.md` → `sd-CleanCoreGuidance.csv` (I)
  - [ ] Parse `CleanCore_Conversion_Levels.md` → `sd-CleanCoreGuidance.csv` (C)
  - [ ] Parse `CleanCore_Enhancement_Levels.md` → `sd-CleanCoreGuidance.csv` (E)
  - [ ] Parse `CleanCore_Forms_Levels.md` → `sd-CleanCoreGuidance.csv` (F)
  - [ ] Parse `CleanCore_Workflow_Levels.md` → `sd-CleanCoreGuidance.csv` (W)
  - [ ] Parse all level details → `sd-CleanCoreLevels.csv`
  - [ ] Parse `Examples/*.md` files → `sd-RealWorldExamples.csv`
- [ ] Test database deployment with seed data
- [ ] Verify all JSON strings are valid and parseable

### Phase 2: Service Layer
- [ ] Add `FullGuidance` type definition to `srv/service.cds`
- [ ] Add `getFullGuidance` function to `srv/service.cds`
- [ ] Implement `getFullGuidance` handler in `srv/service.js`
- [ ] Test function import via OData endpoint
- [ ] Verify response structure and JSON parsing

### Phase 3: Frontend - New Guidance Step
- [ ] Create `app/solutionadvisor/webapp/view/Guidance.view.xml` with complete `ObjectPageLayout`
- [ ] Create `app/solutionadvisor/webapp/controller/Guidance.controller.js`
- [ ] Implement `loadGuidance` function with OData V4 function call
- [ ] Implement `getLevelField` formatter
- [ ] Implement `onExamplePress` event handler
- [ ] Add new `WizardStep` to `Wizard.view.xml` (before current question step)
- [ ] Update `Wizard.controller.js` to trigger guidance loading on Step 2 → Step 3 navigation
- [ ] Test navigation flow and data binding

### Phase 4: UI Enhancement & Testing
- [ ] Apply SAP Fiori design guidelines styling
- [ ] Test responsive behavior on mobile/tablet/desktop
- [ ] Add loading indicators and error handling
- [ ] Test all sections display correctly for each RICEFW type
- [ ] Verify all tables render with correct columns and data
- [ ] Verify formatted text displays HTML correctly
- [ ] Test example details dialog functionality

### Phase 5: Cleanup
- [ ] Remove `app/solutionadvisor/webapp/view/fragments/ConstraintsPanel.fragment.xml`
- [ ] Remove `app/solutionadvisor/webapp/view/fragments/ExamplesPanel.fragment.xml`
- [ ] Remove constraint/example-related code from `Wizard.controller.js`:
  - [ ] `onConstraintsPanelToggle`
  - [ ] `onExamplesPanelToggle`
  - [ ] `_loadConstraints`
  - [ ] `_loadExamples`
  - [ ] `onShowConstraintDetails`
  - [ ] `onIndustryFilterChange`
  - [ ] `onLevelFilterChange`
  - [ ] `_applyExamplesFilters`
  - [ ] `onShowExampleDetails`
  - [ ] `onCloseExampleDialog`
- [ ] Remove constraint/example-related code from `AnalysisDetails.controller.js`
- [ ] Remove constraint/example models from wizard initialization
- [ ] Update wizard step numbers/labels in documentation

### Phase 6: Integration Testing
- [ ] End-to-end wizard flow test (Step 1 → 2 → 3 → 4 → completion)
- [ ] Test guidance display for all 6 RICEFW types
- [ ] Verify backward/forward navigation works correctly
- [ ] Test save/resume functionality with new step structure
- [ ] Performance testing with large guidance datasets
- [ ] Browser compatibility testing (Chrome, Edge, Safari, Firefox)

---

## 6. **Data Mapping Reference**

### Markdown Files → Database Entities

| Source File Pattern | Target Entity | Key Content |
|---------------------|---------------|-------------|
| `CleanCore_*_Levels.md` | `CleanCoreGuidance` | Title, Introduction, API Explanation, All tables |
| `CleanCore_*_Levels.md` (Levels A-D sections) | `CleanCoreLevels` | Per-level details (What, Analogy, Tools, Example, Why) |
| `Examples/*_Examples_AtoD.md` | `RealWorldExamples` | Example scenarios by level |
| `Forms-CleanCore-Complete.md` | `CleanCoreGuidance` (Forms) | Complete reference with all sections |

### UI Sections → Data Sources

| ObjectPageSection | Data Source | Format |
|-------------------|-------------|--------|
| Clean Core Levels - Detailed Breakdown | `CleanCoreLevels` entity | HTML formatted text per level |
| Decision Tree | `CleanCoreGuidance.decisionTree` | JSON array → Table |
| Determination Factors & Performance | `CleanCoreGuidance.determinationFactors`, `performanceThresholds` | JSON arrays → Tables |
| Deployment Constraints | `CleanCoreGuidance.deploymentConstraints` | HTML formatted text |
| Real-World Examples | `RealWorldExamples` entity | List with detail dialog |
| SAP Official Guidance | `CleanCoreGuidance.officialGuidance` | JSON array → Table |
| Strategy Matrix | `CleanCoreGuidance.strategyMatrix` | JSON array → Table |
| Design Guidance & FAQ | `CleanCoreGuidance.designGuidance`, `beginnerFaq` | HTML formatted text |

---

## 7. **Technical Considerations**

### Performance Optimization
- Use OData `$select` to fetch only required fields
- Implement lazy loading for ObjectPageLayout sections
- Cache parsed JSON data to avoid repeated parsing
- Consider pagination for large example lists

### Data Integrity
- Validate JSON structure before storage in CSV files
- Implement backend validation for malformed JSON
- Add error boundaries in UI for graceful degradation
- Log parsing errors for troubleshooting

### Accessibility
- Ensure all `sap.m.Table` controls have proper ARIA labels
- Add alt text for emoji icons (🟩, 🟦, etc.)
- Test keyboard navigation through ObjectPageLayout
- Verify screen reader compatibility

### Maintenance
- Document the markdown → CSV conversion process
- Create scripts for regenerating seed data from updated markdown files
- Version control for both markdown source and generated CSV files
- Establish governance for content updates

---

## 8. **Success Criteria**

The implementation will be considered successful when:
1. ✅ All 6 RICEFW types display complete guidance content
2. ✅ All sections from markdown files are visible and properly formatted
3. ✅ Users can navigate smoothly from Step 2 → Step 3 (Guidance) → Step 4 (Questions)
4. ✅ Example details dialog shows complete information
5. ✅ All tables are interactive and display correct data
6. ✅ Old constraint/example panels are completely removed
7. ✅ Performance is acceptable (< 2 seconds to load guidance)
8. ✅ No console errors or UI5 binding warnings
9. ✅ Responsive design works on all device sizes
10. ✅ Content updates can be made by editing markdown files and regenerating CSV

---

**End of Technical Specification**
