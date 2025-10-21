namespace sd;

using {
    Country ,
    Currency ,
    Language ,
    User ,
    cuid ,
    managed ,
    temporal
} from '@sap/cds/common';

// Project Configuration entity
entity ProjectConfiguration : cuid, managed {
  clientName               : String(200) not null;
  projectName              : String(200) not null;
  projectType              : String(50) not null;
  expectedDuration         : Integer;
  timeline                 : Date not null;
  status                   : String(20) default 'Active';
  
  s4HanaFlavor             : String(50) not null;
  availableBTPServices     : String(1000);
  thirdPartyServices       : String(1000);
  
  governanceModel          : String(50);
  complianceRequirements   : String(500);
  businessCriticality      : String(20);
  
  technicalTeamSize        : Integer;
  budgetRange              : String(50);
  
  tenant                   : String(36) not null;
  
  analyses                 : Composition of many CleanCoreAnalysis on analyses.projectConfig = $self;
}

// Clean Core Analysis entity
entity CleanCoreAnalysis : cuid, managed {
  projectConfig            : Association to ProjectConfiguration not null;
  
  ricefwId                 : String(10) not null;
  objectType               : String(50) not null;
  objectName               : String(200) not null;
  objectDescription        : String(1000);
  
  analysisDate             : Date not null;
  status                   : String(20) default 'In Progress';
  
  finalRecommendation      : String(10);
  finalReasoning           : String(2000);
  decisionFlowData         : String(5000);
  
  estimatedEffort          : Integer;
  riskAssessment           : String(20);
  businessImpact           : String(500);
  technicalComplexity      : String(20);
  complianceStatus         : String(20);
  
  technicalDebtScore       : Decimal(5,2);
  cloudReadinessScore      : Decimal(5,2);
  upgradeImpactScore       : Decimal(5,2);
}
