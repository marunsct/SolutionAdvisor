using solutionAdvisorService as service from '../../srv/service';

// ===============================
// Projects - List Report & Object Page
// ===============================

annotate service.Projects with @(
    UI.SelectionFields : [
        clientName,
        projectName,
        status,
        s4HanaFlavor,
        businessCriticality
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : clientName,
            Label : 'Client Name'
        },
        {
            $Type : 'UI.DataField',
            Value : projectName,
            Label : 'Project Name'
        },
        {
            $Type : 'UI.DataField',
            Value : projectType,
            Label : 'Project Type'
        },
        {
            $Type : 'UI.DataField',
            Value : s4HanaFlavor,
            Label : 'S/4HANA Flavor'
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status',
            Criticality : statusCriticality
        },
        {
            $Type : 'UI.DataField',
            Value : timeline,
            Label : 'Timeline'
        },
        {
            $Type : 'UI.DataField',
            Value : businessCriticality,
            Label : 'Business Criticality'
        }
    ],
    UI.HeaderInfo : {
        TypeName : 'Project',
        TypeNamePlural : 'Projects',
        Title : {
            $Type : 'UI.DataField',
            Value : projectName
        },
        Description : {
            $Type : 'UI.DataField',
            Value : clientName
        }
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneralInfo'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Technical Configuration',
            Target : '@UI.FieldGroup#TechnicalConfig'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Governance & Compliance',
            Target : '@UI.FieldGroup#Governance'
        }
    ],
    UI.FieldGroup #GeneralInfo : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : clientName,
                Label : 'Client Name'
            },
            {
                $Type : 'UI.DataField',
                Value : projectName,
                Label : 'Project Name'
            },
            {
                $Type : 'UI.DataField',
                Value : projectType,
                Label : 'Project Type'
            },
            {
                $Type : 'UI.DataField',
                Value : timeline,
                Label : 'Timeline'
            },
            {
                $Type : 'UI.DataField',
                Value : expectedDuration,
                Label : 'Expected Duration (months)'
            },
            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Status'
            }
        ]
    },
    UI.FieldGroup #TechnicalConfig : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : s4HanaFlavor,
                Label : 'S/4HANA Flavor'
            },
            {
                $Type : 'UI.DataField',
                Value : availableBTPServices,
                Label : 'Available BTP Services'
            },
            {
                $Type : 'UI.DataField',
                Value : thirdPartyServices,
                Label : 'Third Party Services'
            },
            {
                $Type : 'UI.DataField',
                Value : technicalTeamSize,
                Label : 'Technical Team Size'
            }
        ]
    },
    UI.FieldGroup #Governance : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : governanceModel,
                Label : 'Governance Model'
            },
            {
                $Type : 'UI.DataField',
                Value : complianceRequirements,
                Label : 'Compliance Requirements'
            },
            {
                $Type : 'UI.DataField',
                Value : businessCriticality,
                Label : 'Business Criticality'
            },
            {
                $Type : 'UI.DataField',
                Value : budgetRange,
                Label : 'Budget Range'
            }
        ]
    }
);

// ===============================
// Analyses - List Report & Object Page
// ===============================

annotate service.Analyses with @(
    UI.SelectionFields : [
        ricefwId,
        objectType,
        status,
        finalRecommendation,
        riskAssessment
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : ricefwId,
            Label : 'RICEFW ID'
        },
        {
            $Type : 'UI.DataField',
            Value : objectName,
            Label : 'Object Name'
        },
        {
            $Type : 'UI.DataField',
            Value : objectType,
            Label : 'Object Type'
        },
        {
            $Type : 'UI.DataField',
            Value : finalRecommendation,
            Label : 'Clean Core Level',
            Criticality : levelCriticality
        },
        {
            $Type : 'UI.DataFieldForAnnotation',
            Label : 'Technical Debt',
            Target : '@UI.DataPoint#TechnicalDebt'
        },
        {
            $Type : 'UI.DataFieldForAnnotation',
            Label : 'Cloud Readiness',
            Target : '@UI.DataPoint#CloudReadiness'
        },
        {
            $Type : 'UI.DataFieldForAnnotation',
            Label : 'Composite Health',
            Target : '@UI.DataPoint#CompositeHealth'
        },
        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status',
            Criticality : statusCriticality
        },
        {
            $Type : 'UI.DataField',
            Value : analysisDate,
            Label : 'Analysis Date'
        }
    ],
    UI.HeaderInfo : {
        TypeName : 'Analysis',
        TypeNamePlural : 'Analyses',
        Title : {
            $Type : 'UI.DataField',
            Value : objectName
        },
        Description : {
            $Type : 'UI.DataField',
            Value : ricefwId
        }
    },
    UI.DataPoint #TechnicalDebt : {
        Value : technicalDebtScore,
        Title : 'Technical Debt Score',
        Visualization : #Progress,
        Criticality : technicalDebtCriticality
    },
    UI.DataPoint #CloudReadiness : {
        Value : cloudReadinessScore,
        Title : 'Cloud Readiness Score',
        Visualization : #Progress,
        Criticality : cloudReadinessCriticality
    },
    UI.DataPoint #UpgradeImpact : {
        Value : upgradeImpactScore,
        Title : 'Upgrade Impact Score',
        Visualization : #Progress,
        Criticality : upgradeImpactCriticality
    },
    UI.DataPoint #CompositeHealth : {
        Value : compositeHealthScore,
        Title : 'Composite Health Score',
        Visualization : #Progress,
        Criticality : compositeHealthCriticality
    },
    UI.HeaderFacets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Technical Debt',
            Target : '@UI.DataPoint#TechnicalDebt'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Cloud Readiness',
            Target : '@UI.DataPoint#CloudReadiness'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Upgrade Impact',
            Target : '@UI.DataPoint#UpgradeImpact'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Composite Health',
            Target : '@UI.DataPoint#CompositeHealth'
        }
    ],
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Object Details',
            Target : '@UI.FieldGroup#ObjectDetails'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Decision Results',
            Target : '@UI.FieldGroup#DecisionResults'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Scoring Metrics',
            Target : '@UI.FieldGroup#Scores'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Risk & Compliance',
            Target : '@UI.FieldGroup#RiskCompliance'
        }
    ],
    UI.FieldGroup #ObjectDetails : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ricefwId,
                Label : 'RICEFW ID'
            },
            {
                $Type : 'UI.DataField',
                Value : objectType,
                Label : 'Object Type'
            },
            {
                $Type : 'UI.DataField',
                Value : objectName,
                Label : 'Object Name'
            },
            {
                $Type : 'UI.DataField',
                Value : objectDescription,
                Label : 'Description'
            },
            {
                $Type : 'UI.DataField',
                Value : analysisDate,
                Label : 'Analysis Date'
            },
            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Status'
            }
        ]
    },
    UI.FieldGroup #DecisionResults : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : finalRecommendation,
                Label : 'Recommended Clean Core Level'
            },
            {
                $Type : 'UI.DataField',
                Value : finalReasoning,
                Label : 'Reasoning'
            },
            {
                $Type : 'UI.DataField',
                Value : estimatedEffort,
                Label : 'Estimated Effort (person-days)'
            },
            {
                $Type : 'UI.DataField',
                Value : technicalComplexity,
                Label : 'Technical Complexity'
            }
        ]
    },
    UI.FieldGroup #Scores : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : technicalDebtScore,
                Label : 'Technical Debt Score'
            },
            {
                $Type : 'UI.DataField',
                Value : cloudReadinessScore,
                Label : 'Cloud Readiness Score'
            },
            {
                $Type : 'UI.DataField',
                Value : upgradeImpactScore,
                Label : 'Upgrade Impact Score'
            },
            {
                $Type : 'UI.DataField',
                Value : compositeHealthScore,
                Label : 'Composite Health Score'
            }
        ]
    },
    UI.FieldGroup #RiskCompliance : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : riskAssessment,
                Label : 'Risk Assessment'
            },
            {
                $Type : 'UI.DataField',
                Value : businessImpact,
                Label : 'Business Impact'
            },
            {
                $Type : 'UI.DataField',
                Value : complianceStatus,
                Label : 'Compliance Status'
            }
        ]
    }
);

// ===============================
// Value Help & Common Annotations
// ===============================

annotate service.Projects with {
    clientName @title : 'Client Name';
    projectName @title : 'Project Name';
    projectType @title : 'Project Type';
    s4HanaFlavor @title : 'S/4HANA Flavor'  @Common.ValueList : {
        CollectionPath : 'S4HanaFlavors',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : s4HanaFlavor,
                ValueListProperty : 'value'
            }
        ]
    };
    status @title : 'Status'  @Common.ValueList : {
        CollectionPath : 'ProjectStatuses',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : status,
                ValueListProperty : 'value'
            }
        ]
    };
    businessCriticality @title : 'Business Criticality'  @Common.ValueList : {
        CollectionPath : 'BusinessCriticalities',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : businessCriticality,
                ValueListProperty : 'value'
            }
        ]
    };
}

annotate service.Analyses with {
    ricefwId @title : 'RICEFW ID';
    objectType @title : 'Object Type'  @Common.ValueList : {
        CollectionPath : 'ObjectTypes',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : objectType,
                ValueListProperty : 'objectType'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'displayName'
            }
        ]
    };
    objectName @title : 'Object Name';
    businessArea @title : 'Business Area'  @Common.ValueList : {
        CollectionPath : 'BusinessAreas',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : businessArea_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'displayName'
            }
        ]
    };
    complexity @title : 'Complexity'  @Common.ValueList : {
        CollectionPath : 'ComplexityValues',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : complexity,
                ValueListProperty : 'value'
            }
        ]
    };
    finalRecommendation @title : 'Clean Core Level'  @Common.ValueList : {
        CollectionPath : 'CleanCoreLevels',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : finalRecommendation,
                ValueListProperty : 'level'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'levelName'
            }
        ]
    };
    status @title : 'Status';
    riskAssessment @title : 'Risk Assessment';
}