# SAP Clean Core Solution Advisor - API Reference

**Version:** 1.0.0  
**Base URL:** `https://<your-domain>/service/SolutionAdvisorSvcs`  
**Protocol:** OData V4  
**Authentication:** OAuth 2.0 (XSUAA)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Entities](#entities)
3. [Actions](#actions)
4. [Common Patterns](#common-patterns)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## Authentication

All API requests require authentication via OAuth 2.0 Bearer token (XSUAA).

### Obtaining Access Token

```http
POST https://{{subdomain}}.authentication.eu10.hana.ondemand.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={{client_id}}
&client_secret={{client_secret}}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 43199
}
```

### Using Access Token

Include the token in the `Authorization` header:

```http
GET /service/SolutionAdvisorSvcs/Analyses
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Entities

### 1. Projects (ProjectConfiguration)

Manage S/4HANA implementation projects.

#### Properties

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `ID` | UUID | Unique project identifier | Auto-generated |
| `projectName` | String(255) | Project name | ✅ Yes |
| `clientName` | String(255) | Client organization name | ✅ Yes |
| `s4HanaFlavor` | String | Deployment flavor: `Cloud Public`, `Cloud Private`, `On-Premise` | ✅ Yes |
| `complianceRequirements` | Array<String> | Regulatory frameworks: `GDPR`, `SOX`, `FDA`, `HIPAA` | No |
| `businessCriticality` | String | Criticality level: `Critical`, `High`, `Medium`, `Low` | No |
| `status` | String | Project status: `Active`, `Planning`, `Completed`, `On Hold` | Auto-set |
| `createdAt` | DateTime | Creation timestamp | Auto-generated |
| `createdBy` | String | Creator user ID | Auto-set |
| `modifiedAt` | DateTime | Last modification timestamp | Auto-updated |
| `modifiedBy` | String | Last modifier user ID | Auto-updated |

#### Endpoints

```http
# List all projects (paginated)
GET /service/SolutionAdvisorSvcs/Projects?$top=50&$skip=0

# Get single project
GET /service/SolutionAdvisorSvcs/Projects({{projectId}})

# Create new project
POST /service/SolutionAdvisorSvcs/Projects
Content-Type: application/json

{
  "projectName": "Global S/4HANA Transformation",
  "clientName": "ACME Corporation",
  "s4HanaFlavor": "Cloud Public",
  "complianceRequirements": ["GDPR", "SOX"],
  "businessCriticality": "Critical"
}

# Update project
PATCH /service/SolutionAdvisorSvcs/Projects({{projectId}})
Content-Type: application/json

{
  "status": "Active",
  "businessCriticality": "High"
}

# Delete project (Admin only)
DELETE /service/SolutionAdvisorSvcs/Projects({{projectId}})
```

**Query Options:**
- `$filter`: `status eq 'Active'`, `s4HanaFlavor eq 'Cloud Public'`
- `$orderby`: `createdAt desc`, `projectName asc`
- `$search`: `"ACME"`
- `$expand`: `analyses` (list of analyses for this project)

---

### 2. Analyses (CleanCoreAnalysis)

Clean core analysis results for RICEFW objects.

#### Properties

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `ID` | UUID | Unique analysis identifier | Auto-generated |
| `ricefwId` | String(20) | RICEFW ID (format: `[RICEFYW]-[0-9]{4}-[A-Z]{3}`) | ✅ Yes |
| `objectType_typeCode` | String(1) | Object type: `R`, `I`, `C`, `E`, `F`, `W` | ✅ Yes |
| `objectDescription` | String(500) | Business description | ✅ Yes |
| `businessJustification` | String(2000) | Justification for customization | No |
| `recommendedLevel_levelCode` | String(1) | Clean core level: `A`, `B`, `C`, `D` | Auto-calculated |
| `technicalDebtScore` | Integer | Technical debt (0-100, lower is better) | Auto-calculated |
| `cloudReadinessScore` | Integer | Cloud readiness (0-100, higher is better) | Auto-calculated |
| `upgradeImpactScore` | Integer | Upgrade impact (0-100, lower is better) | Auto-calculated |
| `compositeHealthScore` | Integer | Overall health (0-100, higher is better) | Auto-calculated |
| `status` | String | Status: `Draft`, `In Review`, `Approved`, `Rejected` | Auto-set |
| `analysisDate` | Date | Analysis completion date | Auto-set |

#### Endpoints

```http
# List analyses with scores
GET /service/SolutionAdvisorSvcs/Analyses
  ?$select=ricefwId,objectDescription,recommendedLevel_levelCode,technicalDebtScore,compositeHealthScore
  &$filter=status eq 'Approved'
  &$orderby=compositeHealthScore desc
  &$top=50

# Get single analysis with decision path
GET /service/SolutionAdvisorSvcs/Analyses({{analysisId}})
  ?$expand=decisionPath($orderby=stepOrder)

# Create draft analysis
POST /service/SolutionAdvisorSvcs/Analyses
Content-Type: application/json

{
  "ricefwId": "E-0042-IMP",
  "objectType_typeCode": "E",
  "objectDescription": "Custom pricing logic for promotions",
  "businessJustification": "Complex regulatory requirements",
  "isDraft": true
}

# Activate draft
PATCH /service/SolutionAdvisorSvcs/Analyses({{analysisId}})
Content-Type: application/json

{
  "isDraft": false,
  "status": "In Review"
}
```

**Query Filters:**
- By level: `recommendedLevel_levelCode eq 'A'`
- By object type: `objectType_typeCode eq 'E'`
- By date range: `analysisDate ge 2024-01-01 and analysisDate le 2024-12-31`
- By health score: `compositeHealthScore lt 50` (high-risk)
- By user: `createdBy eq '{{userId}}'`

---

### 3. DecisionPaths

Step-by-step wizard decisions for each analysis.

#### Properties

| Field | Type | Description |
|-------|------|-------------|
| `ID` | UUID | Unique path step identifier |
| `analysis_ID` | UUID | Parent analysis ID |
| `stepOrder` | Integer | Sequential step number |
| `questionId` | String(20) | Question identifier |
| `questionText` | String(1000) | Question asked |
| `answerText` | String(1000) | Answer selected |
| `answeredAt` | DateTime | Timestamp of answer |

#### Endpoints

```http
# Get decision path for analysis
GET /service/SolutionAdvisorSvcs/DecisionPaths
  ?$filter=analysis_ID eq {{analysisId}}
  &$orderby=stepOrder

# Get decision path with analysis details
GET /service/SolutionAdvisorSvcs/Analyses({{analysisId}})
  ?$expand=decisionPath($select=stepOrder,questionText,answerText)
```

---

### 4. WizardSessions

Active wizard sessions (save/resume).

#### Properties

| Field | Type | Description |
|-------|------|-------------|
| `ID` | UUID | Session identifier |
| `sessionStatus` | String | `Active`, `Paused`, `Completed`, `Expired` |
| `currentStep` | Integer | Current question step |
| `startedAt` | DateTime | Session start time |
| `expiresAt` | DateTime | Session expiration (24 hours) |
| `analysis_ID` | UUID | Associated analysis ID |
| `isCompleted` | Boolean | Completion flag |

#### Endpoints

```http
# List active sessions for user
GET /service/SolutionAdvisorSvcs/WizardSessions
  ?$filter=sessionStatus eq 'Active' and createdBy eq '{{userId}}'

# Get session details
GET /service/SolutionAdvisorSvcs/WizardSessions({{sessionId}})
  ?$expand=analysis($select=ricefwId,objectDescription)
```

---

### 5. Master Data Entities (Read-Only)

#### CleanCoreLevels

```http
GET /service/SolutionAdvisorSvcs/CleanCoreLevels
```

**Response:**
```json
{
  "value": [
    {
      "levelCode": "A",
      "levelName": "Standard SAP - No Customization",
      "description": "Use standard SAP functionality without modifications",
      "technicalDebtMultiplier": 0.1,
      "cloudReadinessMultiplier": 1.0,
      "upgradeImpactMultiplier": 0.1
    },
    {
      "levelCode": "B",
      "levelName": "Tier 1 Extensions - Key User Tools",
      "description": "Use SAP-supported extension mechanisms",
      "technicalDebtMultiplier": 0.3,
      "cloudReadinessMultiplier": 0.8,
      "upgradeImpactMultiplier": 0.3
    }
  ]
}
```

#### ObjectTypes (RICEFW)

```http
GET /service/SolutionAdvisorSvcs/ObjectTypes
```

**Response:**
```json
{
  "value": [
    {
      "typeCode": "R",
      "typeName": "Reports",
      "description": "Custom reports and analytical tools"
    },
    {
      "typeCode": "I",
      "typeName": "Interfaces",
      "description": "System integrations and data exchanges"
    }
  ]
}
```

#### PerformanceThresholds

```http
GET /service/SolutionAdvisorSvcs/PerformanceThresholds
  ?$filter=applicableObjectTypes eq 'E'
```

---

## Actions

### 1. startWizard

Start a new guided decision wizard session.

**Endpoint:** `POST /service/SolutionAdvisorSvcs/startWizard`

**Request:**
```json
{
  "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ricefwId": "E-0042-IMP",
  "objectType": "E",
  "objectDescription": "Custom pricing extension",
  "businessJustification": "Regulatory requirements for promotion handling"
}
```

**Response:**
```json
{
  "sessionId": "f1e2d3c4-b5a6-7890-cdef-ab1234567890",
  "analysisId": "9876abcd-ef01-2345-6789-0abcdef12345",
  "firstQuestion": {
    "questionId": "E_Q1",
    "questionText": "What is the primary purpose of this enhancement?",
    "answerOptions": [
      {
        "answerId": "E_Q1_A1",
        "answerText": "Regulatory compliance requirement",
        "hint": "Mandatory change due to legal/regulatory obligations"
      },
      {
        "answerId": "E_Q1_A2",
        "answerText": "Business process optimization",
        "hint": "Improve efficiency or reduce costs"
      }
    ],
    "detailedHint": "Consider whether this is mandated by law or chosen for business benefit"
  }
}
```

---

### 2. submitAnswer

Submit answer to current wizard question.

**Endpoint:** `POST /service/SolutionAdvisorSvcs/submitAnswer`

**Request:**
```json
{
  "sessionId": "f1e2d3c4-b5a6-7890-cdef-ab1234567890",
  "questionId": "E_Q1",
  "answerId": "E_Q1_A1"
}
```

**Response (Next Question):**
```json
{
  "isComplete": false,
  "nextQuestion": {
    "questionId": "E_Q2",
    "questionText": "Will this enhancement modify standard SAP tables?",
    "answerOptions": [
      {
        "answerId": "E_Q2_A1",
        "answerText": "Yes, standard tables will be modified"
      },
      {
        "answerId": "E_Q2_A2",
        "answerText": "No, only custom tables will be used"
      }
    ]
  },
  "progress": {
    "currentStep": 2,
    "totalSteps": 8,
    "percentComplete": 25
  }
}
```

**Response (Wizard Complete):**
```json
{
  "isComplete": true,
  "finalRecommendation": {
    "recommendedLevel": "B",
    "levelName": "Tier 1 Extensions - Key User Tools",
    "technicalDebtScore": 35,
    "cloudReadinessScore": 75,
    "upgradeImpactScore": 30,
    "compositeHealthScore": 70,
    "recommendation": "Use SAP BTP side-by-side extensions with API integration",
    "alternatives": [
      {
        "level": "A",
        "description": "Reconsider if standard SAP functionality can meet requirements",
        "pros": ["Minimal technical debt", "Full cloud compatibility"],
        "cons": ["May not fully address regulatory requirements"]
      }
    ]
  },
  "analysisId": "9876abcd-ef01-2345-6789-0abcdef12345"
}
```

---

### 3. resumeWizard

Resume a paused wizard session.

**Endpoint:** `POST /service/SolutionAdvisorSvcs/resumeWizard`

**Request:**
```json
{
  "sessionId": "f1e2d3c4-b5a6-7890-cdef-ab1234567890"
}
```

**Response:**
```json
{
  "sessionId": "f1e2d3c4-b5a6-7890-cdef-ab1234567890",
  "currentQuestion": {
    "questionId": "E_Q3",
    "questionText": "..."
  },
  "completedSteps": [
    {
      "stepNumber": 1,
      "questionText": "What is the primary purpose?",
      "answerText": "Regulatory compliance requirement"
    },
    {
      "stepNumber": 2,
      "questionText": "Will this modify standard tables?",
      "answerText": "No, only custom tables"
    }
  ],
  "progress": {
    "currentStep": 3,
    "totalSteps": 8,
    "percentComplete": 37
  }
}
```

---

### 4. recalculateScores

Recalculate scoring metrics for a single analysis.

**Endpoint:** `POST /service/SolutionAdvisorSvcs/Analyses({{analysisId}})/recalculateScores`

**Request:** Empty body `{}`

**Response:**
```json
{
  "success": true,
  "message": "Scores recalculated successfully",
  "scores": {
    "technicalDebtScore": 42,
    "cloudReadinessScore": 68,
    "upgradeImpactScore": 35,
    "compositeHealthScore": 64
  },
  "previousScores": {
    "technicalDebtScore": 40,
    "cloudReadinessScore": 70,
    "upgradeImpactScore": 33,
    "compositeHealthScore": 66
  },
  "recalculatedAt": "2024-12-15T10:30:00Z"
}
```

---

### 5. batchRecalculateScores

Recalculate scores for multiple analyses in parallel.

**Endpoint:** `POST /service/SolutionAdvisorSvcs/batchRecalculateScores`

**Request:**
```json
{
  "analysisIDs": [
    "9876abcd-ef01-2345-6789-0abcdef12345",
    "1234abcd-ef01-2345-6789-0abcdef67890",
    "5678abcd-ef01-2345-6789-0abcdef09876"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch recalculation completed",
  "totalProcessed": 3,
  "successCount": 3,
  "failedCount": 0,
  "durationMs": 8450,
  "results": [
    {
      "analysisID": "9876abcd-ef01-2345-6789-0abcdef12345",
      "ricefwId": "E-0042-IMP",
      "success": true,
      "scores": {
        "technicalDebtScore": 42,
        "cloudReadinessScore": 68,
        "upgradeImpactScore": 35,
        "compositeHealthScore": 64
      }
    }
  ]
}
```

**Performance:** Processes ~100 analyses in 8-10 seconds (3-6x faster than individual calls).

---

### 6. getAnalyticsData

Get aggregated analytics and KPIs.

**Endpoint:** `POST /service/SolutionAdvisorSvcs/getAnalyticsData`

**Request:**
```json
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "objectType": "E",
  "cleanCoreLevel": "B",
  "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "groupBy": "cleanCoreLevel"
}
```

**Response:**
```json
{
  "aggregatedMetrics": {
    "totalAnalyses": 150,
    "averageTechnicalDebt": 48.5,
    "averageCloudReadiness": 62.3,
    "averageUpgradeImpact": 45.2,
    "averageCompositeHealth": 58.7
  },
  "distributionByLevel": [
    {
      "level": "A",
      "count": 25,
      "percentage": 16.7,
      "averageTechnicalDebt": 12.5,
      "averageCloudReadiness": 93.5
    },
    {
      "level": "B",
      "count": 50,
      "percentage": 33.3,
      "averageTechnicalDebt": 35.0,
      "averageCloudReadiness": 72.5
    }
  ],
  "distributionByObjectType": [
    {
      "objectType": "E",
      "count": 60,
      "percentage": 40.0,
      "averageTechnicalDebt": 55.2
    },
    {
      "objectType": "R",
      "count": 30,
      "percentage": 20.0,
      "averageTechnicalDebt": 25.8
    }
  ],
  "healthDistribution": {
    "excellent": 35,
    "good": 50,
    "moderate": 40,
    "poor": 25
  },
  "topAnalyses": [
    {
      "ricefwId": "R-0001-SAP",
      "objectDescription": "Standard sales report",
      "compositeHealthScore": 95
    }
  ],
  "highRiskAnalyses": [
    {
      "ricefwId": "E-0099-LEG",
      "objectDescription": "Legacy custom code",
      "compositeHealthScore": 18
    }
  ]
}
```

**Query Parameters:**
- `startDate`, `endDate` - Date range filter
- `objectType` - Filter by RICEFW type
- `cleanCoreLevel` - Filter by level (A/B/C/D)
- `projectId` - Filter by project
- `groupBy` - Group results: `cleanCoreLevel`, `objectType`, `month`, `quarter`
- `healthThreshold` - Minimum health score (e.g., 30 for high-risk)
- `includeTopAnalyses` - Include top performers (boolean)
- `topCount` - Number of top analyses (default: 5)

---

### 7. getRateLimitStatus

Check current rate limit status for authenticated user.

**Endpoint:** `POST /service/SolutionAdvisorSvcs/getRateLimitStatus`

**Request:** Empty body `{}`

**Response:**
```json
{
  "limit": 100,
  "remaining": 87,
  "resetTime": "2024-12-15T11:00:00Z",
  "resetInSeconds": 1800,
  "userRole": "SolutionArchitect"
}
```

**Rate Limits by Role:**
- `Developer`: 100 requests / minute
- `SolutionArchitect`: 200 requests / minute
- `TenantAdmin`: 1000 requests / minute

---

## Common Patterns

### Pagination

Use `$top` and `$skip` for pagination:

```http
# Page 1 (records 1-50)
GET /service/SolutionAdvisorSvcs/Analyses?$top=50&$skip=0

# Page 2 (records 51-100)
GET /service/SolutionAdvisorSvcs/Analyses?$top=50&$skip=50

# Get total count
GET /service/SolutionAdvisorSvcs/Analyses/$count
  ?$filter=status eq 'Approved'
```

### Filtering

```http
# Single condition
GET /Analyses?$filter=status eq 'Approved'

# Multiple conditions (AND)
GET /Analyses?$filter=status eq 'Approved' and compositeHealthScore gt 70

# Multiple conditions (OR)
GET /Analyses?$filter=status eq 'Approved' or status eq 'In Review'

# Date range
GET /Analyses?$filter=analysisDate ge 2024-01-01 and analysisDate le 2024-12-31

# Array contains
GET /Projects?$filter=contains(complianceRequirements, 'GDPR')
```

### Sorting

```http
# Single field ascending
GET /Analyses?$orderby=compositeHealthScore

# Single field descending
GET /Analyses?$orderby=compositeHealthScore desc

# Multiple fields
GET /Analyses?$orderby=status,compositeHealthScore desc
```

### Field Selection

```http
# Select specific fields
GET /Analyses?$select=ricefwId,objectDescription,compositeHealthScore

# Exclude large fields
GET /Analyses?$select=ID,ricefwId,technicalDebtScore
```

### Expanding Associations

```http
# Expand single association
GET /Analyses({{id}})?$expand=decisionPath

# Expand with sub-select
GET /Analyses({{id}})?$expand=decisionPath($select=questionText,answerText)

# Expand with filter
GET /Analyses({{id}})?$expand=decisionPath($filter=stepOrder le 5)

# Multiple expansions
GET /Projects({{id}})?$expand=analyses,projectUsers
```

### Full-Text Search

```http
# Search across all text fields
GET /Analyses?$search="pricing promotion"

# Search with filter
GET /Analyses?$search="API" and $filter=objectType_typeCode eq 'I'
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "RICEFW ID format is invalid",
    "target": "ricefwId",
    "details": [
      {
        "code": "INVALID_FORMAT",
        "message": "Expected format: [RICEFYW]-[0-9]{4}-[A-Z]{3}",
        "target": "ricefwId"
      }
    ]
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| **400** | `VALIDATION_ERROR` | Invalid request data |
| **401** | `UNAUTHORIZED` | Missing or invalid access token |
| **403** | `FORBIDDEN` | Insufficient permissions (RBAC/ABAC) |
| **404** | `NOT_FOUND` | Resource does not exist |
| **409** | `CONFLICT` | Duplicate RICEFW ID |
| **429** | `RATE_LIMIT_EXCEEDED` | Too many requests |
| **500** | `INTERNAL_SERVER_ERROR` | Server error |
| **503** | `SERVICE_UNAVAILABLE` | Temporary outage |

### Error Handling Example

```javascript
try {
  const response = await fetch('/service/SolutionAdvisorSvcs/Analyses', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 429) {
      // Rate limit exceeded - wait and retry
      const resetTime = error.error.resetInSeconds;
      await sleep(resetTime * 1000);
      return retry();
    }
    
    if (response.status === 403) {
      // Insufficient permissions
      console.error('Access denied:', error.error.message);
      return;
    }
    
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  return data;
  
} catch (error) {
  console.error('API Error:', error);
}
```

---

## Rate Limiting

### Limits by Role

| Role | Requests / Minute | Requests / Hour |
|------|-------------------|-----------------|
| Developer | 100 | 5,000 |
| SolutionArchitect | 200 | 10,000 |
| TenantAdmin | 1,000 | 50,000 |

### Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1702642800
```

### Handling Rate Limits

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitTime = (resetTime * 1000) - Date.now();
      
      console.log(`Rate limited. Waiting ${waitTime}ms...`);
      await sleep(waitTime);
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## Examples

### Complete Wizard Flow

```javascript
// 1. Start wizard
const startResponse = await fetch('/service/SolutionAdvisorSvcs/startWizard', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ricefwId: 'E-0042-IMP',
    objectType: 'E',
    objectDescription: 'Custom pricing extension'
  })
});

const { sessionId, firstQuestion } = await startResponse.json();

// 2. Answer questions in loop
let currentQuestion = firstQuestion;
let isComplete = false;

while (!isComplete) {
  // Display question to user
  console.log(currentQuestion.questionText);
  currentQuestion.answerOptions.forEach((opt, i) => {
    console.log(`${i + 1}. ${opt.answerText}`);
  });
  
  // Get user's answer
  const selectedAnswer = currentQuestion.answerOptions[0]; // User selection
  
  // Submit answer
  const answerResponse = await fetch('/service/SolutionAdvisorSvcs/submitAnswer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      questionId: currentQuestion.questionId,
      answerId: selectedAnswer.answerId
    })
  });
  
  const result = await answerResponse.json();
  isComplete = result.isComplete;
  
  if (!isComplete) {
    currentQuestion = result.nextQuestion;
  } else {
    // Wizard complete
    console.log('Recommendation:', result.finalRecommendation);
  }
}
```

### Batch Processing

```javascript
// Get all analyses for recalculation
const analysesResponse = await fetch(
  '/service/SolutionAdvisorSvcs/Analyses?$select=ID&$filter=status eq \'Approved\'',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const { value: analyses } = await analysesResponse.json();
const analysisIds = analyses.map(a => a.ID);

// Batch recalculate (100 analyses in ~8 seconds)
const batchResponse = await fetch('/service/SolutionAdvisorSvcs/batchRecalculateScores', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ analysisIDs: analysisIds })
});

const batchResult = await batchResponse.json();
console.log(`Recalculated ${batchResult.successCount} analyses in ${batchResult.durationMs}ms`);
```

### Analytics Dashboard

```javascript
// Get comprehensive analytics
const analyticsResponse = await fetch('/service/SolutionAdvisorSvcs/getAnalyticsData', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    groupBy: 'cleanCoreLevel',
    includeTopAnalyses: true,
    topCount: 10
  })
});

const analytics = await analyticsResponse.json();

// Display KPIs
console.log('Total Analyses:', analytics.aggregatedMetrics.totalAnalyses);
console.log('Average Health Score:', analytics.aggregatedMetrics.averageCompositeHealth);

// Display distribution
analytics.distributionByLevel.forEach(level => {
  console.log(`Level ${level.level}: ${level.count} (${level.percentage}%)`);
});

// Display top performers
console.log('\nTop Analyses:');
analytics.topAnalyses.forEach((analysis, i) => {
  console.log(`${i + 1}. ${analysis.ricefwId}: ${analysis.compositeHealthScore}`);
});
```

---

## Postman Collection

Import the provided `postman_collection.json` for ready-to-use API examples with:
- Pre-configured authentication
- Environment variables
- Example requests for all endpoints
- Test scripts for validation

**Download:** [SolutionAdvisor_Postman_Collection.json](./SolutionAdvisor_Postman_Collection.json)

---

## Support

- **Documentation:** https://solutionadvisor.docs.example.com
- **GitHub Issues:** https://github.com/marunsct/SolutionAdvisor/issues
- **Email:** support@solutionadvisor.com

---

**Last Updated:** December 2024  
**API Version:** 1.0.0
