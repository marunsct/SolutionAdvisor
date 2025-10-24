/* global QUnit */

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/AnalysisListPage"
], function (opaTest) {
	"use strict";

	QUnit.module("Navigation Journey");

	opaTest("Should see the initial page", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyApp();

		// Assertions
		Then.onTheAnalysisListPage.iShouldSeeTheAnalysisList();
	});

	opaTest("Should navigate to wizard when pressing Start Wizard button", function (Given, When, Then) {
		// Actions
		When.onTheAnalysisListPage.iPressOnStartWizard();

		// Assertions
		Then.onTheWizardPage.iShouldSeeTheWizard();
	});

	opaTest("Should search for analysis", function (Given, When, Then) {
		// Actions
		When.onTheAnalysisListPage.iSearchForAnalysis("I-0001");

		// Assertions
		Then.onTheAnalysisListPage.theListShouldHaveEntries();
	});
});
