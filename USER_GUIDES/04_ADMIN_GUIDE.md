# Clean Core Solution Advisor - User Guide
## For Administrators & Technical Support

**Version:** 1.1 (Detailed Data Dictionary Edition)  
**Last Updated:** December 2025  
**Audience:** System Administrators, Database Administrators, Technical Leads, Master Data Stewards

---

## Table of Contents
1. [Admin Overview](#admin-overview)
2. [Master Data Dictionary & CSV Guide](#master-data-dictionary--csv-guide)
    - [1. ObjectTypes (RICEFW Definitions)](#1-objecttypes-ricefw-definitions)
    - [2. CleanCoreLevels (Scoring Logic)](#2-cleancorelevels-scoring-logic)
    - [3. BusinessAreas (Functional Modules)](#3-businessareas-functional-modules)
    - [4. QuestionFlow (The Decision Tree)](#4-questionflow-the-decision-tree)
    - [5. PerformanceThreshold (Constraints)](#5-performancethreshold-constraints)
    - [6. RealWorldExample (Knowledge Base)](#6-realworldexample-knowledge-base)
3. [Step-by-Step Data Import Guide](#step-by-step-data-import-guide)
4. [Troubleshooting Data Issues](#troubleshooting-data-issues)
5. [System Maintenance](#system-maintenance)

---

## Admin Overview

As an administrator, your primary technical responsibility is managing the **Master Data** that drives the application. The Solution Advisor is data-driven: the questions asked, the logic followed, and the scores calculated are all determined by the data in the database, not hardcoded in the application logic.

This guide provides a **field-by-field breakdown** of every table you need to maintain, with copy-pasteable CSV examples.

---

## Master Data Dictionary & CSV Guide

This section explains how to prepare data for the `db/data` folder. 
**Format:** All files must be `.csv` (Comma Separated Values), but specifically using **semicolons (;)** as delimiters to handle text content better.

### 1. ObjectTypes (RICEFW Definitions)
**File Name:** `sd-ObjectTypes.csv`  
**Purpose:** Defines the high-level categories of extensions (Reports, Interfaces, etc.).

| Field Name | Type | Max Length | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **code** | String | 10 | **Yes** | The unique ID for the type. Use standard RICEFW codes. | `I` |
| **name** | String | 50 | **Yes** | The display name shown to users. | `Interface` |
| **description** | String | 200 | No | A brief explanation of what this type covers. | `APIs, IDOCs, and file transfers` |

**CSV Template:**
```csv
code;name;description
R;Report;Analytics and operational reporting
I;Interface;Integration between systems (API, IDOC, File)
C;Conversion;Data migration and transformation scripts
E;Enhancement;User exits, BAdIs, and core modifications
F;Form;Print forms and interactive documents
W;Workflow;Business process automation and approval flows
```

---

### 2. CleanCoreLevels (Scoring Logic)
**File Name:** `sd-CleanCoreLevels.csv`  
**Purpose:** Defines the 4 levels of Clean Core compliance (A, B, C, D) and their impact on scoring.

| Field Name | Type | Max Length | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **level** | String | 1 | **Yes** | The single-letter grade (A, B, C, D). | `A` |
| **name** | String | 50 | **Yes** | The display title for this level. | `Clean Core Compliant` |
| **description** | String | 500 | **Yes** | Detailed explanation of what this level means. | `Fully cloud-compliant...` |
| **technicalDebtMultiplier** | Decimal | - | **Yes** | Multiplier for debt score (Lower is better). | `1.0` (Low debt) |
| **upgradeImpactMultiplier** | Decimal | - | **Yes** | Multiplier for upgrade effort (Lower is better). | `1.0` (Low effort) |
| **colorCode** | String | 7 | No | Hex color code for UI badges. | `#2B7D2B` |

**CSV Template:**
```csv
level;name;description;technicalDebtMultiplier;upgradeImpactMultiplier;colorCode
A;Clean Core Compliant;Fully cloud-compliant, upgrade-safe, public cloud ready.;1.0;1.0;#2B7D2B
B;Cloud Friendly;Mostly compliant but uses some on-stack logic.;1.5;1.2;#E69A17
C;Technical Debt;Traditional extension, requires regression testing.;3.0;5.0;#BB0000
D;Non-Compliant;Modifies core standard code. Avoid at all costs.;10.0;10.0;#8B0000
```

---

### 3. BusinessAreas (Functional Modules)
**File Name:** `sd-BusinessAreas.csv`  
**Purpose:** Lists the SAP modules (Finance, Sales, etc.) users can select.

| Field Name | Type | Max Length | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **areaId** | String | 10 | **Yes** | Unique ID for the module. | `FI` |
| **name** | String | 100 | **Yes** | Full name of the business area. | `Finance & Controlling` |
| **description** | String | 500 | No | Additional details. | `GL, AP, AR, Asset Accounting` |

**CSV Template:**
```csv
areaId;name;description
FI;Finance;Financial Accounting and Controlling
SD;Sales;Sales and Distribution
MM;Procurement;Materials Management and Purchasing
HR;Human Resources;SuccessFactors and HCM
```

---

### 4. QuestionFlow (The Decision Tree)
**File Name:** `sd-QuestionFlow.csv`  
**Purpose:** This is the **most critical file**. It contains the logic for the wizard.
**Note:** This table uses **JSON strings** for answers and rules. You must be careful with quotes.

| Field Name | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **questionId** | String(10) | **Yes** | Unique ID. Format: `[Type]-[Number]`. | `I-01` |
| **questionText** | String(500) | **Yes** | The question displayed to the user. | `Is this a real-time interface?` |
| **answerOptions** | JSON | **Yes** | Array of possible answers. | `[{"key":"Y","text":"Yes"},{"key":"N","text":"No"}]` |
| **navigationRules** | JSON | **Yes** | Logic mapping answers to next steps. | `{"Y":{"next":"I-02"},"N":{"result":"Level A"}}` |
| **objectType_code** | String(10) | **Yes** | Links to ObjectTypes table. | `I` |
| **displayOrder** | Integer | **Yes** | Sequence number (1, 2, 3...). | `1` |
| **detailedHint** | String | No | HTML/Text hint shown in "More Info". | `Real-time means synchronous...` |

**JSON Formatting Rules for CSV:**
- In a CSV, if your text contains the delimiter (`;`) or double quotes (`"`), you must wrap the entire field in double quotes.
- Inside a double-quoted field, you must escape existing double quotes by doubling them (`""`).

**CSV Template (Advanced):**
```csv
questionId;objectType_code;displayOrder;questionText;answerOptions;navigationRules;detailedHint
I-01;I;1;Is this interface Real-Time or Batch?;""[{""key"":""RT"",""text"":""Real-Time""},{""key"":""BT"",""text"":""Batch""}]"";""{""RT"":{""next"":""I-02""},""BT"":{""next"":""I-03""}}""";Real-time requires synchronous APIs.
I-02;I;2;Is there a standard OData API available?;""[{""key"":""YES"",""text"":""Yes""},{""key"":""NO"",""text"":""No""}]"";""{""YES"":{""result"":""Level A""},""NO"":{""next"":""I-04""}}""";Check api.sap.com first.
```

**Simplified View of the JSON (for understanding):**
*answerOptions:*
```json
[
  {"key": "RT", "text": "Real-Time"},
  {"key": "BT", "text": "Batch"}
]
```
*navigationRules:*
```json
{
  "RT": { "next": "I-02" },
  "BT": { "next": "I-03" }
}
```

---

### 5. PerformanceThreshold (Constraints)
**File Name:** `sd-PerformanceThreshold.csv`  
**Purpose:** Defines technical limits that trigger warnings in the UI.

| Field Name | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **ID** | UUID | **Yes** | Unique ID. Use a generator or placeholder. | `123e4567-e89b...` |
| **category** | String | **Yes** | Grouping (Integration, Reporting). | `Integration` |
| **method** | String | **Yes** | The technology being checked. | `OData API` |
| **volumeLimit** | Integer | No | Max records allowed. | `10000` |
| **sizeThreshold** | String | No | Human readable size limit. | `10MB` |
| **cleanCoreLevel** | String | No | Associated level. | `Level A` |
| **applicableObjectTypes** | String | No | Comma-separated types. | `I,R` |
| **whenExceeded** | String | No | Warning message. | `Use Bulk API instead` |

**CSV Template:**
```csv
ID;category;method;volumeLimit;sizeThreshold;cleanCoreLevel;applicableObjectTypes;whenExceeded
9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d;Integration;OData Synchronous;1000;1MB;Level A;I;Switch to Asynchronous/Batch pattern
9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e;Reporting;CDS View;50000;100MB;Level A;R;Use BW/4HANA or Datasphere
```

---

### 6. RealWorldExample (Knowledge Base)
**File Name:** `sd-RealWorldExample.csv`  
**Purpose:** Provides "Case Studies" shown to users to help them decide.

| Field Name | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **ID** | UUID | **Yes** | Unique ID. | `...` |
| **exampleId** | String | **Yes** | Human readable ID. | `EX-001` |
| **title** | String | **Yes** | Headline. | `Side-by-Side Extension` |
| **scenario** | String | **Yes** | The business problem. | `Custom pricing logic...` |
| **associatedLevel** | String | **Yes** | A, B, C, D. | `A` |
| **ricefwType** | String | **Yes** | R, I, C, E, F, W. | `E` |
| **objectType** | String | No | Specific subtype. | `BAdI` |

**CSV Template:**
```csv
ID;exampleId;title;scenario;associatedLevel;ricefwType;objectType
8a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6a;EX-001;Pricing via BTP;Move complex pricing logic to BTP Java app;A;E;Pricing
8a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6b;EX-002;Custom Field in GUI;Add field to MARA table via Key User Extensibility;A;E;Table
```

---

## Step-by-Step Data Import Guide

Follow this process to update the system with new data.

### Step 1: Prepare Your CSV Files
1.  Create a folder on your computer.
2.  Create the files listed above (e.g., `sd-QuestionFlow.csv`).
3.  Open them in a text editor (Notepad++, VS Code) or Excel.
    *   *Warning:* Excel often messes up CSVs by changing delimiters to commas or messing up quotes. **Text editors are safer.**
4.  Paste the headers and your data.

### Step 2: Place Files in the Project
1.  Navigate to the project folder: `SolutionAdvisor/db/data`.
2.  Paste your `.csv` files here.
3.  Ensure the filenames match the pattern `namespace-EntityName.csv` (e.g., `sd-QuestionFlow.csv`).

### Step 3: Deploy to Database
You need to tell the CAP framework to load this data into the database (HANA or SQLite).

**For Local Development (SQLite):**
1.  Open a terminal in VS Code.
2.  Run:
    ```bash
    cds deploy --to sqlite
    ```
    *This will wipe the local database and reload it from the CSV files.*

**For Production (HANA Cloud):**
1.  Build the project:
    ```bash
    mbt build
    ```
2.  Deploy the MTA archive:
    ```bash
    cf deploy mta_archives/SolutionAdvisor_1.0.0.mtar
    ```
    *The deployment process automatically detects the CSV files and upserts them into HANA.*

---

## Troubleshooting Data Issues

### Common Error: "Unique Constraint Violation"
*   **Symptom:** Deployment fails with "unique constraint violated".
*   **Cause:** You have two rows with the same ID (e.g., two questions with `questionId = 'I-01'`).
*   **Fix:** Check your CSV for duplicate keys.

### Common Error: "Value too long"
*   **Symptom:** Deployment fails with "value too large for column".
*   **Cause:** You put 600 characters in a field defined as `String(500)`.
*   **Fix:** Shorten the text or ask a developer to increase the limit in `db/schema.cds`.

### Common Error: "JSON Parse Error"
*   **Symptom:** The app crashes when loading the wizard.
*   **Cause:** The `answerOptions` or `navigationRules` in `sd-QuestionFlow.csv` have invalid JSON (missing quotes, extra commas).
*   **Fix:** Use a JSON validator (like jsonlint.com) to check your JSON strings before putting them in the CSV. Remember to escape double quotes in the CSV file!

### Common Error: "Reference Integrity Violation"
*   **Symptom:** Deployment fails saying "parent key not found".
*   **Cause:** You are trying to load a Question for `objectType_code = 'X'`, but 'X' does not exist in the `sd-ObjectTypes.csv` file.
*   **Fix:** Ensure all foreign keys (Object Types, Levels) exist in their respective master tables first.
