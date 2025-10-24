sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/actions/EnterText",
	"sap/ui/test/matchers/PropertyStrictEquals"
], function (Opa5, Press, EnterText, PropertyStrictEquals) {
	"use strict";

	var sViewName = "Wizard";

	Opa5.createPageObjects({
		onTheWizardPage: {
			actions: {
				iSelectProject: function (sProjectId) {
					return this.waitFor({
						id: "projectConfigSelect",
						viewName: sViewName,
						actions: function (oSelect) {
							oSelect.setSelectedKey(sProjectId);
							oSelect.fireChange({ selectedItem: oSelect.getSelectedItem() });
						},
						errorMessage: "Did not find the project selection dropdown"
					});
				},

				iEnterRicefwId: function (sRicefwId) {
					return this.waitFor({
						id: "ricefwIdInput",
						viewName: sViewName,
						actions: new EnterText({ text: sRicefwId }),
						errorMessage: "Did not find the RICEFW ID input field"
					});
				},

				iSelectObjectType: function (sObjectType) {
					return this.waitFor({
						id: "objectTypeSelect",
						viewName: sViewName,
						actions: function (oSelect) {
							oSelect.setSelectedKey(sObjectType);
							oSelect.fireChange({ selectedItem: oSelect.getSelectedItem() });
						},
						errorMessage: "Did not find the object type dropdown"
					});
				},

				iPressNext: function () {
					return this.waitFor({
						id: "wizardNextButton",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Did not find the Next button"
					});
				},

				iSelectAnswer: function (sAnswerText) {
					return this.waitFor({
						controlType: "sap.m.RadioButton",
						viewName: sViewName,
						matchers: new PropertyStrictEquals({ name: "text", value: sAnswerText }),
						actions: new Press(),
						errorMessage: "Did not find answer option: " + sAnswerText
					});
				},

				iPressShowExamples: function () {
					return this.waitFor({
						id: "showExamplesButton",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Did not find the Show Examples button"
					});
				},

				iPressCloseExamplesDialog: function () {
					return this.waitFor({
						controlType: "sap.m.Button",
						matchers: new PropertyStrictEquals({ name: "text", value: "Close" }),
						actions: new Press(),
						errorMessage: "Did not find the Close button in examples dialog"
					});
				},

				iPressSave: function () {
					return this.waitFor({
						id: "saveButton",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Did not find the Save button"
					});
				}
			},

			assertions: {
				iShouldSeeTheWizard: function () {
					return this.waitFor({
						controlType: "sap.m.Wizard",
						viewName: sViewName,
						success: function () {
							Opa5.assert.ok(true, "The wizard is displayed");
						},
						errorMessage: "Did not find the wizard"
					});
				},

				iShouldSeeTheQuestionText: function (sQuestionText) {
					return this.waitFor({
						id: "questionText",
						viewName: sViewName,
						matchers: new PropertyStrictEquals({ name: "text", value: sQuestionText }),
						success: function () {
							Opa5.assert.ok(true, "Question text is displayed: " + sQuestionText);
						},
						errorMessage: "Did not find question with text: " + sQuestionText
					});
				},

				iShouldSeeConstraintsPanel: function () {
					return this.waitFor({
						id: "constraintsPanel",
						viewName: sViewName,
						success: function (oPanel) {
							Opa5.assert.ok(oPanel.getVisible(), "Constraints panel is visible");
						},
						errorMessage: "Did not find the constraints panel"
					});
				},

				iShouldSeeExamplesDialog: function () {
					return this.waitFor({
						controlType: "sap.m.Dialog",
						matchers: new PropertyStrictEquals({ name: "title", value: "Real-World Examples" }),
						success: function () {
							Opa5.assert.ok(true, "Examples dialog is displayed");
						},
						errorMessage: "Did not find the examples dialog"
					});
				},

				iShouldSeeFinalRecommendation: function () {
					return this.waitFor({
						id: "recommendationPanel",
						viewName: sViewName,
						success: function (oPanel) {
							Opa5.assert.ok(oPanel.getVisible(), "Final recommendation is displayed");
						},
						errorMessage: "Did not find the final recommendation"
					});
				},

				iShouldSeeRecommendedLevel: function (sLevel) {
					return this.waitFor({
						id: "recommendedLevelText",
						viewName: sViewName,
						matchers: function (oText) {
							return oText.getText().includes("Level " + sLevel);
						},
						success: function () {
							Opa5.assert.ok(true, "Recommended level is: " + sLevel);
						},
						errorMessage: "Did not find recommended level: " + sLevel
					});
				}
			}
		}
	});
});
