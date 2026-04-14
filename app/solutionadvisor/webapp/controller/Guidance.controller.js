sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/FormattedText",
    "sap/m/Button"
], (Controller, JSONModel, MessageBox, Dialog, VBox, Label, FormattedText, Button) => {
    "use strict";

    return Controller.extend("sd.solutionadvisor.controller.Guidance", {
        /**
         * Controller initialization
         * @public
         */
        onInit() {
            // Initialize guidance model with empty structure
            this.getView().setModel(new JSONModel({
                guidance: null,
                levels: [],
                examples: [],
                decisionTreeParsed: [],
                determinationFactorsParsed: [],
                performanceThresholdsParsed: [],
                officialGuidanceParsed: [],
                strategyMatrixParsed: []
            }), "guidance");
        },

        /**
         * Formatter to get a specific field from a level
         * This function is called from the view bindings with custom data
         * @param {Array} levels - Array of level objects
         * @returns {string} The field value
         * @public
         */
        getLevelField(levels) {
            if (!levels || !Array.isArray(levels)) return "";
            
            // Get the control that triggered the formatter
            const oControl = this;
            if (!oControl || !oControl.data) return "";
            
            // Extract level and field from custom data
            const sLevel = oControl.data("level");
            const sField = oControl.data("field");
            
            if (!sLevel || !sField) return "";
            
            // Find the matching level
            const levelObj = levels.find(l => l.level === sLevel);
            return levelObj ? (levelObj[sField] || "") : "";
        },

        /**
         * This function is called by the main Wizard controller
         * @param {string} sRicefwType - The RICEFW type character (R, I, C, E, F, W)
         * @public
         */
        loadGuidance(sRicefwType) {
            const oModel = this.getView().getModel(); // OData Model
            const oGuidanceModel = this.getView().getModel("guidance");
            
            this.getView().setBusy(true);

            // Use OData V4 function import
            const oOperation = oModel.bindContext("/getFullGuidance(...)");
            oOperation.setParameter("ricefwType", sRicefwType);

            oOperation.execute().then(() => {
                const oData = oOperation.getBoundContext().getObject();
                
                // Parse the JSON strings back into objects/arrays for table binding
                if (oData.guidance) {
                    try {
                        oData.determinationFactorsParsed = this._parseJSON(oData.guidance.determinationFactors);
                        oData.performanceThresholdsParsed = this._parseJSON(oData.guidance.performanceThresholds);
                        oData.officialGuidanceParsed = this._parseJSON(oData.guidance.officialGuidance);
                        oData.strategyMatrixParsed = this._parseJSON(oData.guidance.strategyMatrix);
                    } catch (error) {
                        console.error("Error parsing JSON fields:", error);
                        MessageBox.error("Failed to parse guidance data. Please contact support.");
                        this.getView().setBusy(false);
                        return;
                    }
                }
                
                // Organize levels by level key (A, B, C, D) for direct binding in view
                if (oData.levels && Array.isArray(oData.levels)) {
                    const levelMap = {};
                    oData.levels.forEach(level => {
                        levelMap['level' + level.level] = level;
                    });
                    oData.levelA = levelMap.levelA || {};
                    oData.levelB = levelMap.levelB || {};
                    oData.levelC = levelMap.levelC || {};
                    oData.levelD = levelMap.levelD || {};
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
         * Safely parse JSON strings
         * @param {string} sJson - JSON string to parse
         * @returns {Array|Object} Parsed JSON or empty array on error
         * @private
         */
        _parseJSON(sJson) {
            if (!sJson || sJson === '' || sJson === 'null') {
                return [];
            }
            
            try {
                return JSON.parse(sJson);
            } catch (e) {
                console.error("JSON parse error:", e);
                return [];
            }
        },

        /**
         * Handle example press to show details in a dialog
         * @param {sap.ui.base.Event} oEvent - The press event
         * @public
         */
        onExamplePress(oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext("guidance");
            const oExample = oContext.getObject();

            // Create and show a dialog with example details
            if (!this._exampleDialog) {
                this._exampleDialog = new Dialog({
                    title: oExample.title,
                    contentWidth: "600px",
                    content: [
                        new VBox({
                            items: [
                                new Label({ text: "Scenario:", design: "Bold" }),
                                new FormattedText({ htmlText: oExample.scenario || "" }),
                                new Label({ text: "Design/Solution:", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new FormattedText({ htmlText: oExample.design || "" }),
                                new Label({ text: "Why this level:", design: "Bold", class: "sapUiTinyMarginTop" }),
                                new FormattedText({ htmlText: oExample.whyLevel || "" }),
                                new Label({ 
                                    text: "Outcome:", 
                                    design: "Bold", 
                                    class: "sapUiTinyMarginTop",
                                    visible: !!oExample.outcome && oExample.outcome !== ''
                                }),
                                new FormattedText({ 
                                    htmlText: oExample.outcome || "",
                                    visible: !!oExample.outcome && oExample.outcome !== ''
                                })
                            ]
                        }).addStyleClass("sapUiSmallMargin")
                    ],
                    beginButton: new Button({
                        text: "Close",
                        press: () => {
                            this._exampleDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this._exampleDialog);
            } else {
                // Update dialog content with new example
                this._exampleDialog.setTitle(oExample.title);
                const oVBox = this._exampleDialog.getContent()[0];
                oVBox.getItems()[1].setHtmlText(oExample.scenario || "");
                oVBox.getItems()[3].setHtmlText(oExample.design || "");
                oVBox.getItems()[5].setHtmlText(oExample.whyLevel || "");
                
                // Show/hide outcome fields
                const bHasOutcome = !!oExample.outcome && oExample.outcome !== '';
                oVBox.getItems()[6].setVisible(bHasOutcome);
                oVBox.getItems()[7].setVisible(bHasOutcome);
                oVBox.getItems()[7].setHtmlText(oExample.outcome || "");
            }

            this._exampleDialog.open();
        }
    });
});
