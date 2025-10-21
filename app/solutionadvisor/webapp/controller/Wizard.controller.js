sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, JSONModel, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.Wizard", {
        onInit() {
            // Initialize wizard model
            const oWizardModel = new JSONModel({
                projectID: "",
                projectName: "",
                ricefwId: "",
                objectType: "",
                objectName: "",
                objectDescription: ""
            });
            this.getView().setModel(oWizardModel, "wizardModel");
        },

        onProjectStepActivate() {
            this._updateNextButtonState();
        },

        onObjectStepActivate() {
            this._updateNextButtonState();
        },

        onProjectSelect(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oContext = oSelectedItem.getBindingContext();
                const oWizardModel = this.getView().getModel("wizardModel");
                
                oWizardModel.setProperty("/projectID", oContext.getProperty("ID"));
                oWizardModel.setProperty("/projectName", oContext.getProperty("projectName"));
                
                // Display project info
                const sInfo = `S/4HANA: ${oContext.getProperty("s4HanaFlavor")} | Criticality: ${oContext.getProperty("businessCriticality")}`;
                this.byId("projectInfo").setText(sInfo);
                
                // Validate step
                this.byId("projectStep").setValidated(true);
            }
            this._updateNextButtonState();
        },

        onRicefwIdChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oWizardModel = this.getView().getModel("wizardModel");
            oWizardModel.setProperty("/ricefwId", sValue);
            
            // Validate format
            const pattern = /^[RICEFYW]-[0-9]{4}-[A-Z]{3}$/;
            const bValid = pattern.test(sValue);
            
            const oInput = oEvent.getSource();
            if (sValue && !bValid) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid format. Expected: [RICEFYW]-[0-9]{4}-[A-Z]{3}");
            } else {
                oInput.setValueState("None");
            }
            
            this._validateObjectStep();
        },

        onObjectTypeSelect(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oWizardModel = this.getView().getModel("wizardModel");
                oWizardModel.setProperty("/objectType", oSelectedItem.getKey());
            }
            this._validateObjectStep();
        },

        onObjectNameChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oWizardModel = this.getView().getModel("wizardModel");
            oWizardModel.setProperty("/objectName", sValue);
            this._validateObjectStep();
        },

        _validateObjectStep() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const sRicefwId = oWizardModel.getProperty("/ricefwId");
            const sObjectType = oWizardModel.getProperty("/objectType");
            const sObjectName = oWizardModel.getProperty("/objectName");
            
            const pattern = /^[RICEFYW]-[0-9]{4}-[A-Z]{3}$/;
            const bValid = pattern.test(sRicefwId) && sObjectType && sObjectName;
            
            this.byId("objectStep").setValidated(bValid);
            this._updateNextButtonState();
        },

        onNextStep() {
            const oWizard = this.byId("cleanCoreWizard");
            const currentStep = oWizard.getCurrentStep();
            
            if (currentStep === "projectStep") {
                oWizard.nextStep();
            } else if (currentStep === "objectStep") {
                // Update summary
                const oWizardModel = this.getView().getModel("wizardModel");
                this.byId("summaryProject").setText(oWizardModel.getProperty("/projectName"));
                this.byId("summaryRicefwId").setText(oWizardModel.getProperty("/ricefwId"));
                this.byId("summaryObjectType").setText(oWizardModel.getProperty("/objectType"));
                this.byId("summaryObjectName").setText(oWizardModel.getProperty("/objectName"));
                
                oWizard.nextStep();
                
                // Show start button, hide next button
                this.byId("wizardNextButton").setVisible(false);
                this.byId("wizardStartButton").setVisible(true);
            }
        },

        _updateNextButtonState() {
            const oWizard = this.byId("cleanCoreWizard");
            const currentStep = oWizard.getCurrentStep();
            const oNextButton = this.byId("wizardNextButton");
            
            if (currentStep === "projectStep") {
                const bValidated = this.byId("projectStep").getValidated();
                oNextButton.setEnabled(bValidated);
            } else if (currentStep === "objectStep") {
                const bValidated = this.byId("objectStep").getValidated();
                oNextButton.setEnabled(bValidated);
            }
        },

        onStartAnalysis() {
            const oWizardModel = this.getView().getModel("wizardModel");
            const oData = oWizardModel.getData();
            
            // Call backend to start wizard
            const oModel = this.getView().getModel();
            const sPath = "/startWizard";
            
            oModel.callFunction(sPath, {
                method: "POST",
                urlParameters: {
                    projectID: oData.projectID,
                    ricefwId: oData.ricefwId,
                    objectType: oData.objectType,
                    objectName: oData.objectName
                },
                success: (oResult) => {
                    MessageToast.show("Analysis started successfully!");
                    // Navigate to analysis details
                    this.getOwnerComponent().getRouter().navTo("AnalysisDetails", {
                        key: oResult.analysisID
                    });
                },
                error: (oError) => {
                    MessageBox.error("Failed to start analysis: " + oError.message);
                }
            });
        },

        onWizardComplete() {
            MessageToast.show("Wizard completed!");
        },

        onCancel() {
            MessageBox.confirm("Do you want to cancel the analysis?", {
                onClose: (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                        this.onNavBack();
                    }
                }
            });
        },

        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("AnalysesList");
        }
    });
});
