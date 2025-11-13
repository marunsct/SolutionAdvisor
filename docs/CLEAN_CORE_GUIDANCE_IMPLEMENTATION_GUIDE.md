# Clean Core Guidance Feature - Implementation Guide

## Overview

This document provides guidance for completing the Clean Core Guidance feature implementation, particularly the seed data generation from markdown files.

## What Has Been Implemented

### Database Schema (db/schema.cds)

Three new entities have been added:

1. **CleanCoreGuidance** - Main guidance document per RICEFW type
   - `ricefwType`: Single character (R, I, C, E, F, W)
   - Text fields: `title`, `introduction`, `apiExplanation`, `deploymentConstraints`, `designGuidance`, `beginnerFaq`
   - JSON fields (stored as LargeString): `decisionTree`, `determinationFactors`, `performanceThresholds`, `realWorldScenarios`, `officialGuidance`, `strategyMatrix`, `summaryTable`

2. **CleanCoreLevels** - Detailed breakdown for each level per RICEFW type
   - Keys: `level` (A/B/C/D), `ricefwType` (R/I/C/E/F/W)
   - Educational fields: `whatItMeans`, `beginnerAnalogy`, `toolsUsed`, `exampleReport`, `whyReasoning`
   - Classification fields: `description`, `technology`, `upgradeComplexity`, `maintenanceEffort`, `cloudReadiness`, `technicalRisk`

3. **RealWorldExamples** - Examples with full context
   - Fields: `exampleId`, `title`, `scenario`, `design`, `whyLevel`, `outcome`, `associatedLevel`, `industry`, `ricefwType`

### Service Layer (srv/)

- **getFullGuidance(ricefwType)** function added to `solutionAdvisorService`
- Returns complete guidance data in single call: `{ guidance, levels, examples }`
- Entity projections added for all three new entities

### Frontend (app/solutionadvisor/webapp/)

- **Guidance.view.xml**: ObjectPageLayout with comprehensive sections
- **Guidance.controller.js**: Handles data loading and JSON parsing
- **Wizard.view.xml**: New Step 3 for guidance display
- **Wizard.controller.js**: Activates and loads guidance on step navigation

## What Needs to Be Completed

### 1. Seed Data Generation

The primary remaining task is to create CSV seed data files from the markdown documents in `.github/supporting documents/`.

#### Source Files Mapping

| Source Markdown File | Target CSV File | Entity |
|---------------------|-----------------|---------|
| `Report-CleanCore-Complete.md` | `db/data/sd-CleanCoreGuidance.csv` | CleanCoreGuidance (R) |
| `Interface-CleanCore-Complete.md` | `db/data/sd-CleanCoreGuidance.csv` | CleanCoreGuidance (I) |
| `Conversion-CleanCore-Complete.md` | `db/data/sd-CleanCoreGuidance.csv` | CleanCoreGuidance (C) |
| `Enhancement-CleanCore-Complete.md` | `db/data/sd-CleanCoreGuidance.csv` | CleanCoreGuidance (E) |
| `Forms-CleanCore-Complete.md` | `db/data/sd-CleanCoreGuidance.csv` | CleanCoreGuidance (F) |
| `Workflow-CleanCore-Complete.md` | `db/data/sd-CleanCoreGuidance.csv` | CleanCoreGuidance (W) |
| All level sections in above files | `db/data/sd-CleanCoreLevels.csv` | CleanCoreLevels |
| `Examples/*_Examples_AtoD.md` | `db/data/sd-RealWorldExamples.csv` | RealWorldExamples |

#### Data Transformation Rules

##### 1. Text Content (for LargeString fields)

**Markdown to HTML conversion:**
- Bold: `**text**` → `<b>text</b>`
- Bullet lists:
  ```markdown
  - Item 1
  - Item 2
  ```
  →
  ```html
  <ul><li>Item 1</li><li>Item 2</li></ul>
  ```
- Keep emojis as-is: 🟩, 🟦, 🟨, 🟥

**Example:**
```markdown
**What it means:**
- You use only officially released APIs
- No direct database access
```

Becomes in CSV:
```csv
"<b>What it means:</b><ul><li>You use only officially released APIs</li><li>No direct database access</li></ul>"
```

##### 2. Table Content (for JSON fields)

**Markdown table:**
```markdown
| Q.ID | Question | Answers | Navigation |
|------|----------|---------|------------|
| Q1   | Need?    | 2       | Yes→Q2     |
```

**JSON format:**
```json
[
  {
    "qid": "Q1",
    "question": "Need?",
    "answers": "2",
    "navigation": "Yes→Q2"
  }
]
```

**Stored in CSV as escaped JSON string:**
```csv
"[{\"qid\":\"Q1\",\"question\":\"Need?\",\"answers\":\"2\",\"navigation\":\"Yes→Q2\"}]"
```

##### 3. CSV Escaping Rules

- Double quotes in content must be doubled: `"` → `""`
- Entire field must be quoted if it contains: commas, newlines, or quotes
- JSON strings require double escaping: `\"` for quotes within JSON

#### Sample CSV Structure

**db/data/sd-CleanCoreGuidance.csv:**
```csv
ID;ricefwType;title;introduction;apiExplanation;decisionTree;determinationFactors;performanceThresholds;deploymentConstraints;realWorldScenarios;officialGuidance;strategyMatrix;summaryTable;designGuidance;beginnerFaq;createdAt;modifiedAt
guid-001;R;Clean Core Levels A–D for SAP Report Design;"<b>Why Clean Core?</b><ul><li>Reason 1</li><li>Reason 2</li></ul>";"<b>What is an API in SAP?</b><p>Explanation text</p>";"[{\"qid\":\"Q1\",\"question\":\"Text\"}]";"[{\"factor\":\"API Usage\"}]";"[{\"metric\":\"Volume\"}]";"<ul><li>Cloud Public: No custom ABAP</li></ul>";"[{\"scenario\":\"E-commerce\"}]";"[{\"level\":\"A\"}]";"[{\"scenario\":\"Simple\"}]";"Summary text";"<ol><li>Guideline 1</li></ol>";"<b>Q:</b> Question?<br><b>A:</b> Answer.";2025-11-13;2025-11-13
```

**db/data/sd-CleanCoreLevels.csv:**
```csv
ID;level;ricefwType;title;whatItMeans;beginnerAnalogy;toolsUsed;exampleReport;whyReasoning;description;technology;upgradeComplexity;maintenanceEffort;cloudReadiness;technicalRisk;createdAt;modifiedAt
guid-level-r-a;A;R;Level A – "Cleanest" (Gold Standard);"<ul><li>Use only released APIs</li></ul>";"Building with LEGO pieces";"<ul><li>CDS Views</li><li>OData</li></ul>";"Fiori app with I_SalesOrderItem";"<ul><li>Fully upgrade-safe</li></ul>";Standard SAP Apps/APIs;Released CDS, OData;None;Low;Full;Low;2025-11-13;2025-11-13
```

**db/data/sd-RealWorldExamples.csv:**
```csv
ID;exampleId;title;scenario;design;whyLevel;outcome;associatedLevel;industry;ricefwType;createdAt;modifiedAt
guid-ex-001;R-A-001;Real-time Sales Dashboard;"Need to display sales data";"Use CDS view I_SalesOrder";"Uses released API";"Fast, upgrade-safe solution";A;Retail;R;2025-11-13;2025-11-13
```

### 2. Seed Data Creation Approaches

#### Option A: Manual CSV Creation (Quick but tedious)
1. Open Excel or Google Sheets
2. Create columns matching entity fields
3. Copy content from markdown files
4. Convert markdown formatting manually
5. For JSON fields, use online tools to escape JSON
6. Export as CSV with semicolon delimiter

#### Option B: Script-Based Generation (Recommended)

Create `tools/generate-guidance-seed-data.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Markdown to HTML converter
function markdownToHtml(md) {
    if (!md) return '';
    
    // Bold
    md = md.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    // Lists (simple implementation)
    md = md.replace(/^- (.+)$/gm, '<li>$1</li>');
    md = md.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
    md = md.replace(/\n/g, ''); // Clean up newlines
    
    return md;
}

// Parse markdown table to JSON
function parseTable(tableText) {
    const lines = tableText.trim().split('\n');
    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
    const rows = [];
    
    for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
        if (cells.length > 0) {
            const row = {};
            headers.forEach((h, idx) => {
                row[h.toLowerCase().replace(/\s+/g, '')] = cells[idx] || '';
            });
            rows.push(row);
        }
    }
    
    return JSON.stringify(rows);
}

// CSV escape
function csvEscape(str) {
    if (!str) return '';
    str = str.toString().replace(/"/g, '""');
    return `"${str}"`;
}

// Main processing function
function processGuidanceFiles() {
    const sourceDir = path.join(__dirname, '../.github/supporting documents');
    const outputDir = path.join(__dirname, '../db/data');
    
    const ricefwTypes = {
        'Report-CleanCore-Complete.md': 'R',
        'Interface-CleanCore-Complete.md': 'I',
        'Conversion-CleanCore-Complete.md': 'C',
        'Enhancement-CleanCore-Complete.md': 'E',
        'Forms-CleanCore-Complete.md': 'F',
        'Workflow-CleanCore-Complete.md': 'W'
    };
    
    const guidanceData = [];
    const levelsData = [];
    
    for (const [filename, ricefwType] of Object.entries(ricefwTypes)) {
        const filePath = path.join(sourceDir, filename);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            continue;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract sections (implement parsing logic here)
        // This is a skeleton - you need to implement the actual parsing
        const guidance = {
            ID: uuidv4(),
            ricefwType,
            title: extractTitle(content),
            introduction: markdownToHtml(extractSection(content, 'Introduction')),
            apiExplanation: markdownToHtml(extractSection(content, 'What is an API')),
            // ... extract other sections
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
        
        guidanceData.push(guidance);
        
        // Extract levels (A, B, C, D)
        for (const level of ['A', 'B', 'C', 'D']) {
            const levelData = {
                ID: uuidv4(),
                level,
                ricefwType,
                // ... extract level details
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            levelsData.push(levelData);
        }
    }
    
    // Write CSV files
    writeCsv(path.join(outputDir, 'sd-CleanCoreGuidance.csv'), guidanceData);
    writeCsv(path.join(outputDir, 'sd-CleanCoreLevels.csv'), levelsData);
}

function writeCsv(filePath, data) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(';');
    const rows = data.map(row => 
        Object.values(row).map(csvEscape).join(';')
    );
    
    const csv = [headers, ...rows].join('\n');
    fs.writeFileSync(filePath, csv, 'utf8');
    console.log(`Generated: ${filePath}`);
}

// Helper functions to extract sections from markdown
function extractTitle(content) {
    const match = content.match(/^# (.+)$/m);
    return match ? match[1] : '';
}

function extractSection(content, sectionTitle) {
    const regex = new RegExp(`## ${sectionTitle}\\n([\\s\\S]+?)(?=\\n## |$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
}

// Run
processGuidanceFiles();
```

**Usage:**
```bash
cd /home/runner/work/SolutionAdvisor/SolutionAdvisor
node tools/generate-guidance-seed-data.js
```

### 3. Testing After Seed Data Creation

Once CSV files are created:

1. **Deploy to database:**
   ```bash
   cds deploy --to hana
   ```

2. **Test OData endpoint:**
   ```bash
   curl http://localhost:4004/service/SolutionAdvisorSvcs/getFullGuidance(ricefwType='R')
   ```

3. **Test UI:**
   - Start app: `npm run cds-watch`
   - Open wizard
   - Navigate to Step 2, select object type "Reports"
   - Navigate to Step 3 (Guidance)
   - Verify all sections display correctly

4. **Verify each RICEFW type:**
   - Test R (Reports)
   - Test I (Interfaces)
   - Test C (Conversions)
   - Test E (Enhancements)
   - Test F (Forms)
   - Test W (Workflows)

### 4. Troubleshooting Common Issues

#### Issue: JSON Parse Errors
**Symptom:** "Failed to parse guidance data" error in UI
**Solution:** 
- Validate JSON in fields using https://jsonlint.com/
- Ensure proper escaping in CSV: `\"` for quotes

#### Issue: Empty Sections
**Symptom:** Sections not displaying in UI
**Solution:**
- Check visibility bindings in Guidance.view.xml
- Verify data is in model: Open browser console, check `guidance` model

#### Issue: Formatting Not Applied
**Symptom:** HTML tags showing as text
**Solution:**
- Use `sap.m.FormattedText` control (already in view)
- Check that `htmlText` property is used, not `text`

#### Issue: Level Details Not Showing
**Symptom:** Level A/B/C/D subsections are empty
**Solution:**
- Verify `getLevelField` formatter is working
- Check CustomData is set correctly on FormattedText controls
- Ensure `levels` array has correct structure with `level` field

## File Locations Reference

```
/home/runner/work/SolutionAdvisor/SolutionAdvisor/
├── .github/supporting documents/           # Source markdown files
│   ├── Report-CleanCore-Complete.md
│   ├── Interface-CleanCore-Complete.md
│   ├── Conversion-CleanCore-Complete.md
│   ├── Enhancement-CleanCore-Complete.md
│   ├── Forms-CleanCore-Complete.md
│   ├── Workflow-CleanCore-Complete.md
│   └── Examples/
│       ├── Report_Examples_AtoD.md
│       ├── Interface_Examples_AtoD.md
│       └── ... (other example files)
├── db/
│   ├── schema.cds                         # Entity definitions
│   └── data/                              # Seed data files (TO CREATE)
│       ├── sd-CleanCoreGuidance.csv
│       ├── sd-CleanCoreLevels.csv
│       └── sd-RealWorldExamples.csv
├── srv/
│   ├── service.cds                        # Service definitions
│   └── service.js                         # Service implementation
├── app/solutionadvisor/webapp/
│   ├── view/
│   │   ├── Guidance.view.xml             # Guidance ObjectPageLayout
│   │   └── Wizard.view.xml               # Wizard with new step
│   └── controller/
│       ├── Guidance.controller.js        # Guidance controller
│       └── Wizard.controller.js          # Wizard controller
└── tools/                                 # Utility scripts (TO CREATE)
    └── generate-guidance-seed-data.js     # Seed data generator
```

## Completion Checklist

- [ ] Create `tools/generate-guidance-seed-data.js` script
- [ ] Generate `db/data/sd-CleanCoreGuidance.csv` (6 rows, one per RICEFW type)
- [ ] Generate `db/data/sd-CleanCoreLevels.csv` (24 rows, 4 levels × 6 types)
- [ ] Generate `db/data/sd-RealWorldExamples.csv` (variable, from Examples folder)
- [ ] Deploy to HANA: `cds deploy --to hana`
- [ ] Test getFullGuidance function for each RICEFW type
- [ ] Test UI for each RICEFW type (R, I, C, E, F, W)
- [ ] Verify all ObjectPageLayout sections display correctly
- [ ] Test example detail dialog functionality
- [ ] Verify navigation flow (Step 1 → 2 → 3 → 4 → 5)
- [ ] Remove or document unused constraint/example methods in Wizard controller
- [ ] Update documentation with final seed data structure
- [ ] Run existing test suite
- [ ] Create user acceptance test plan

## Support Resources

- CDS Documentation: https://cap.cloud.sap/docs/cds/
- UI5 ObjectPageLayout: https://sapui5.hana.ondemand.com/#/api/sap.uxap.ObjectPageLayout
- OData V4 Function Imports: https://cap.cloud.sap/docs/node.js/core-services#srv-on-impl
- SAPUI5 FormattedText: https://sapui5.hana.ondemand.com/#/api/sap.m.FormattedText

## Contact

For questions or issues with this implementation:
- Review the technical specification: `docs/TECHNICAL_SPECIFICATION_CLEAN_CORE_GUIDANCE.md`
- Check the PR summary for implementation details
- Review committed code in: `app/solutionadvisor/webapp/view/Guidance.view.xml`
