# Wizard Integration with Decision Engine - Implementation Task

## Overview

This document outlines the specific implementation tasks needed to fully integrate the wizard UI (`Wizard.controller.js`) with the backend decision engine. Currently, the wizard UI is not fully leveraging the dynamic question flow provided by the decision engine's `startWizard` and `submitAnswer` actions.

## Current Status

The backend decision engine (`decision-engine-consolidated.js`) is fully implemented and working correctly. The wizard controller is partially set up to use the decision engine, but several key integration points need to be completed.

## Implementation Tasks

### 1. Enhance Question Display Structure (2 hours)

Create a dynamic UI container for questions in the wizard:

**File:** `app/solutionadvisor/webapp/view/Wizard.view.xml`

```xml
<!-- Add this to the wizard step after the summary step -->
<WizardStep id="questionStep" title="Analysis Questions" validated="false">
    <Panel id="questionPanel" visible="{= !!${wizardModel>/currentQuestion}}">
        <VBox>
            <Title text="{wizardModel>/currentQuestion/questionText}" level="H2" class="sapUiMediumMarginBottom" />
            <Text text="{wizardModel>/currentQuestion/hint}" class="sapUiSmallMarginBottom" />
            
            <RadioButtonGroup id="answerOptions" 
                selectedKey="{wizardModel>/selectedAnswer}" 
                columns="1" 
                select=".onAnswerSelect">
                <buttons>
                    <RadioButton text="{label}" key="{value}" 
                        tooltip="{description}" class="sapUiSmallMarginBottom"
                        enabled="{= !${wizardModel>/questionCompleted}}">
                    </RadioButton>
                </buttons>
            </RadioButtonGroup>
            
            <HBox class="sapUiSmallMarginTop">
                <Button text="Show Detailed Hint" 
                    icon="sap-icon://hint" 
                    press=".onShowDetailedHint" 
                    class="sapUiTinyMarginEnd" />
                <Button text="Next Question" 
                    type="Emphasized" 
                    enabled="{= !!${wizardModel>/selectedAnswer}}"
                    press=".onSubmitAnswer" 
                    class="sapUiTinyMarginEnd" />
            </HBox>
        </VBox>
    </Panel>

    <!-- Final recommendation panel (visible when wizard complete) -->
    <Panel id="recommendationPanel" visible="{= !!${wizardModel>/finalRecommendation}}">
        <VBox>
            <Title text="Analysis Complete" level="H2" />
            <Text text="Based on your answers, we recommend:" class="sapUiSmallMarginBottom" />
            <Title text="{wizardModel>/finalRecommendation}" level="H3" class="sapUiSmallMarginBottom" />
            <Text text="{wizardModel>/finalReasoning}" class="sapUiMediumMarginBottom" />
            
            <!-- Scores display -->
            <HBox class="sapUiMediumMarginBottom">
                <VBox class="sapUiSmallMarginEnd" width="25%">
                    <Label text="Technical Debt" />
                    <ProgressIndicator 
                        percentValue="{wizardModel>/scores/technicalDebt}" 
                        displayValue="{wizardModel>/scores/technicalDebt}%" 
                        state="{= ${wizardModel>/scores/technicalDebt} < 30 ? 'Success' : 
                                ${wizardModel>/scores/technicalDebt} < 70 ? 'Warning' : 'Error' }" />
                </VBox>
                <!-- Add similar blocks for other scores -->
            </HBox>

            <Button text="View Details" type="Emphasized" press=".onViewAnalysisDetails" />
        </VBox>
    </Panel>
</WizardStep>
```

### 2. Update Wizard Model (1 hour)

Enhance the wizard model to support dynamic question flow:

**File:** `app/solutionadvisor/webapp/controller/Wizard.controller.js`

```javascript
// In onInit() method
const oWizardModel = new JSONModel({
    // Existing properties
    projectID: "",
    projectName: "",
    ricefwId: "",
    objectType: "",
    objectName: "",
    objectDescription: "",
    autoSelectedProject: false,
    
    // New properties for question flow
    currentQuestion: null,
    selectedAnswer: null,
    questionCompleted: false,
    currentStep: 0,
    totalSteps: 0,
    finalRecommendation: null,
    finalReasoning: null,
    scores: {
        technicalDebt: 0,
        cloudReadiness: 0,
        upgradeImpact: 0,
        compositeHealth: 0
    }
});
this.getView().setModel(oWizardModel, "wizardModel");
```

### 3. Implement Start Analysis Method (2 hours)

Replace the current `onStartAnalysis` method with this enhanced version:

```javascript
onStartAnalysis() {
    const oWizardModel = this.getView().getModel("wizardModel");
    const oData = oWizardModel.getData();
    
    // Show loading indicator
    this.getView().setBusy(true);
    
    // Call backend action using OData V4
    const oModel = this.getView().getModel();
    const oOperation = oModel.bindContext("/startWizard(...)");
    
    // Set parameters
    oOperation.setParameter("projectID", oData.projectID);
    oOperation.setParameter("ricefwId", oData.ricefwId);
    oOperation.setParameter("objectType", oData.objectType);
    oOperation.setParameter("objectName", oData.objectName);
    
    oOperation.execute().then((oContext) => {
        const oResult = oContext.getObject();
        
        // Store session and analysis IDs
        this._sessionId = oResult.sessionID;
        this._analysisId = oResult.analysisID;
        
        // Reset selected answer
        oWizardModel.setProperty("/selectedAnswer", null);
        
        // Store first question in model
        oWizardModel.setProperty("/currentQuestion", oResult.firstQuestion);
        
        // Parse answer options from JSON string if needed
        const answerOptions = typeof oResult.firstQuestion.answerOptions === 'string' ? 
            JSON.parse(oResult.firstQuestion.answerOptions) : oResult.firstQuestion.answerOptions;
            
        // Store parsed answer options
        oWizardModel.setProperty("/currentQuestion/answerOptions", answerOptions);
        
        // Initialize step counters
        oWizardModel.setProperty("/currentStep", 1);
        
        // Update wizard navigation
        const oWizard = this.byId("cleanCoreWizard");
        oWizard.nextStep(); // Go to question step
        
        // Hide start button, show back/save buttons
        this.byId("wizardStartButton").setVisible(false);
        this.byId("wizardBackButton").setVisible(true);
        this.byId("wizardSaveButton").setVisible(true);
        
        // Load constraints and examples for first question context
        this._loadConstraints(oData.objectType);
        this._loadExamples(oData.objectType);
        
        // Hide loading indicator
        this.getView().setBusy(false);
        
        MessageToast.show("Analysis started successfully!");
    }).catch((oError) => {
        // Hide loading indicator
        this.getView().setBusy(false);
        
        // Use ErrorHandler utility to show appropriate message
        sap.ui.require(["sd/solutionadvisor/utils/ErrorHandler"], function(ErrorHandler) {
            ErrorHandler.handleWizardSpecificError(oError, oData.objectType) || 
            ErrorHandler.showServiceError(oError, "Failed to start analysis");
            
            // Log error for analytics
            ErrorHandler.logErrorForAnalytics(oError, "startWizard");
        });
    });
}
```

### 4. Implement Answer Selection Method (2 hours)

Add a new method for handling answer selection and fetching the next question:

```javascript
onAnswerSelect(oEvent) {
    // Get selected answer
    const selectedKey = oEvent.getParameter("selectedItem").getKey();
    
    // Store in model
    const oWizardModel = this.getView().getModel("wizardModel");
    oWizardModel.setProperty("/selectedAnswer", selectedKey);
}

onSubmitAnswer() {
    const oWizardModel = this.getView().getModel("wizardModel");
    const currentQuestion = oWizardModel.getProperty("/currentQuestion");
    const selectedAnswer = oWizardModel.getProperty("/selectedAnswer");
    
    if (!selectedAnswer || !currentQuestion) {
        MessageToast.show("Please select an answer to continue.");
        return;
    }
    
    // Show loading indicator
    this.getView().setBusy(true);
    
    // Mark question as completed to disable further changes
    oWizardModel.setProperty("/questionCompleted", true);
    
    // Calculate time spent on this question (placeholder)
    const timeSpent = 30; // Seconds
    
    // Call backend action using OData V4
    const oModel = this.getView().getModel();
    const oOperation = oModel.bindContext("/submitAnswer(...)");
    
    // Set parameters
    oOperation.setParameter("sessionID", this._sessionId);
    oOperation.setParameter("questionId", currentQuestion.questionId);
    oOperation.setParameter("selectedAnswer", selectedAnswer);
    oOperation.setParameter("answerIndex", 0); // Get proper index from UI
    oOperation.setParameter("userComments", "");
    oOperation.setParameter("timeSpent", timeSpent);
    
    oOperation.execute().then((oContext) => {
        const oResult = oContext.getObject();
        
        // Reset UI state
        oWizardModel.setProperty("/selectedAnswer", null);
        oWizardModel.setProperty("/questionCompleted", false);
        
        // Increment current step
        const currentStep = oWizardModel.getProperty("/currentStep");
        oWizardModel.setProperty("/currentStep", currentStep + 1);
        
        if (oResult.isComplete) {
            // Wizard complete - show final recommendation
            oWizardModel.setProperty("/finalRecommendation", oResult.recommendation);
            oWizardModel.setProperty("/finalReasoning", oResult.reasoning);
            oWizardModel.setProperty("/scores", oResult.scores);
            oWizardModel.setProperty("/currentQuestion", null);
            
            // Update UI for completion
            this._showCompletionUI();
        } else {
            // Store next question
            oWizardModel.setProperty("/currentQuestion", oResult.nextQuestion);
            
            // Parse answer options if needed
            const answerOptions = typeof oResult.nextQuestion.answerOptions === 'string' ? 
                JSON.parse(oResult.nextQuestion.answerOptions) : oResult.nextQuestion.answerOptions;
                
            // Store parsed answer options
            oWizardModel.setProperty("/currentQuestion/answerOptions", answerOptions);
            
            // Update constraints and examples based on new question
            this._loadConstraints(this.getView().getModel("wizardModel").getProperty("/objectType"));
            this._loadExamples(this.getView().getModel("wizardModel").getProperty("/objectType"));
        }
        
        // Hide loading indicator
        this.getView().setBusy(false);
    }).catch((oError) => {
        // Reset completion state
        oWizardModel.setProperty("/questionCompleted", false);
        
        // Hide loading indicator
        this.getView().setBusy(false);
        
        // Show error
        sap.ui.require(["sd/solutionadvisor/utils/ErrorHandler"], function(ErrorHandler) {
            ErrorHandler.showServiceError(oError, "Failed to process answer");
        });
    });
}
```

### 5. Add Helper Method for Completion UI (1 hour)

Add this method to handle wizard completion:

```javascript
_showCompletionUI() {
    // Get wizard model
    const oWizardModel = this.getView().getModel("wizardModel");
    
    // Update wizard navigation if needed
    const oWizard = this.byId("cleanCoreWizard");
    
    // Show completion button
    this.byId("wizardViewDetailsButton").setVisible(true);
    this.byId("wizardSaveButton").setVisible(false);
    
    // Log completion
    console.log("Analysis complete with recommendation:", 
        oWizardModel.getProperty("/finalRecommendation"));
        
    // Play completion sound or animation if needed
    this._playCompletionAnimation();
    
    // Show success message
    MessageToast.show("Analysis completed successfully!");
}

_playCompletionAnimation() {
    // Optional - add subtle animation or sound
    const oRecommendationPanel = this.byId("recommendationPanel");
    if (oRecommendationPanel) {
        // Add CSS class for animation
        oRecommendationPanel.addStyleClass("fadeInAnimation");
    }
}
```

### 6. Update View Analysis Details Method (1 hour)

Add this method to navigate to the analysis details screen:

```javascript
onViewAnalysisDetails() {
    // Navigate to analysis details with the analysis ID
    this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
        key: this._analysisId
    });
}
```

### 7. Update Progress Indicator (1 hour)

Add a new method for updating the progress indicator based on current step:

```javascript
_updateProgressIndicator() {
    const oWizardModel = this.getView().getModel("wizardModel");
    const currentStep = oWizardModel.getProperty("/currentStep");
    const totalSteps = oWizardModel.getProperty("/totalSteps") || 10; // Default if not set
    
    // Calculate percentage
    const progressPercentage = Math.min(100, Math.round((currentStep / totalSteps) * 100));
    
    // Update progress indicator
    const oProgressIndicator = this.byId("wizardProgressIndicator");
    if (oProgressIndicator) {
        oProgressIndicator.setPercentValue(progressPercentage);
        oProgressIndicator.setDisplayValue(`Step ${currentStep} of ${totalSteps}`);
    }
}
```

### 8. Update Save Draft Method (1 hour)

Update the save draft functionality to handle the dynamic wizard:

```javascript
onSaveDraft() {
    const oWizardModel = this.getView().getModel("wizardModel");
    
    // Update draft model with current progress
    const oDraftModel = this.getView().getModel("draftModel");
    oDraftModel.setData({
        currentStep: oWizardModel.getProperty("/currentStep"),
        totalSteps: oWizardModel.getProperty("/totalSteps") || 10,
        timeSpent: this._calculateTimeSpent()
    });
    
    // Show draft save dialog
    if (!this._saveDraftDialog) {
        this._saveDraftDialog = sap.ui.xmlfragment(
            "sd.solutionadvisor.view.fragments.SaveDraftDialog",
            this
        );
        this.getView().addDependent(this._saveDraftDialog);
    }
    
    this._saveDraftDialog.open();
}
```

## Testing Plan

1. **Unit Tests:**
   - Test each method independently with mock data
   - Verify parsing of answer options works correctly

2. **Integration Tests:**
   - Test full wizard flow from start to finish
   - Test saving draft and resuming
   - Test navigation to analysis details after completion

3. **Edge Cases:**
   - Test with empty answer options
   - Test with network errors during question fetch
   - Test with large answer sets

## Acceptance Criteria

- ✅ Wizard starts with startWizard action
- ✅ Questions display dynamically based on engine responses
- ✅ Answer selection triggers submitAnswer action
- ✅ Progress indicator shows current step / total steps
- ✅ Final recommendation displays with scores
- ✅ Navigation to analysis details works correctly
- ✅ Save draft functionality preserves current question

## Estimation

**Total effort:** 11 hours (approx. 1.5 days)