sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/AggregationLengthEquals",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/PropertyStrictEquals"
], function (Opa5, Press, AggregationLengthEquals, AggregationFilled, PropertyStrictEquals) {
	"use strict";

	var sViewName = "AnalysisList";

	Opa5.createPageObjects({
		onTheAnalysisListPage: {
			actions: {
				iPressOnStartWizard: function () {
					return this.waitFor({
						id: "startWizardButton",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Did not find the Start Wizard button on the Analysis List page"
					});
				},

				iSearchForAnalysis: function (sSearchString) {
					return this.waitFor({
						id: "searchField",
						viewName: sViewName,
						actions: function (oSearchField) {
							oSearchField.setValue(sSearchString);
							oSearchField.fireSearch({ query: sSearchString });
						},
						errorMessage: "Did not find the search field"
					});
				},

				iSelectAnalysisItem: function (sRicefwId) {
					return this.waitFor({
						controlType: "sap.m.ColumnListItem",
						viewName: sViewName,
						matchers: function (oItem) {
							return oItem.getCells()[0].getText() === sRicefwId;
						},
						actions: new Press(),
						errorMessage: "Did not find analysis item with RICEFW ID: " + sRicefwId
					});
				}
			},

			assertions: {
				iShouldSeeTheAnalysisList: function () {
					return this.waitFor({
						id: "analysisTable",
						viewName: sViewName,
						success: function () {
							Opa5.assert.ok(true, "The analysis list is displayed");
						},
						errorMessage: "Did not find the analysis list"
					});
				},

				theListShouldHaveEntries: function () {
					return this.waitFor({
						id: "analysisTable",
						viewName: sViewName,
						matchers: new AggregationFilled({ name: "items" }),
						success: function () {
							Opa5.assert.ok(true, "The analysis list has entries");
						},
						errorMessage: "The analysis list has no entries"
					});
				},

				iShouldSeeAnalysisWithRicefwId: function (sRicefwId) {
					return this.waitFor({
						controlType: "sap.m.ColumnListItem",
						viewName: sViewName,
						matchers: function (oItem) {
							return oItem.getCells()[0].getText() === sRicefwId;
						},
						success: function () {
							Opa5.assert.ok(true, "Found analysis with RICEFW ID: " + sRicefwId);
						},
						errorMessage: "Did not find analysis with RICEFW ID: " + sRicefwId
					});
				}
			}
		}
	});
});
