/* global QUnit */

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/WizardPage"
], function (opaTest) {
	"use strict";

	QUnit.module("Wizard Journey");

	opaTest("Should complete project selection step", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyApp({ hash: "#/wizard" });

		// Assertions
		Then.onTheWizardPage.iShouldSeeTheWizard();

		// Actions
		When.onTheWizardPage.iSelectProject("TEST-PROJECT-001");
		When.onTheWizardPage.iEnterRicefwId("I-0042-TST");
		When.onTheWizardPage.iSelectObjectType("Interfaces");
		When.onTheWizardPage.iPressNext();
	});

	opaTest("Should answer wizard questions", function (Given, When, Then) {
		// Actions
		When.onTheWizardPage.iSelectAnswer("OData API");
		
		// Assertions
		Then.onTheWizardPage.iShouldSeeConstraintsPanel();

		// Actions
		When.onTheWizardPage.iPressNext();
	});

	opaTest("Should view examples during wizard", function (Given, When, Then) {
		// Actions
		When.onTheWizardPage.iPressShowExamples();

		// Assertions
		Then.onTheWizardPage.iShouldSeeExamplesDialog();

		// Actions
		When.onTheWizardPage.iPressCloseExamplesDialog();
	});

	opaTest("Should complete wizard and see final recommendation", function (Given, When, Then) {
		// Actions - complete remaining questions
		When.onTheWizardPage.iSelectAnswer("Less than 5,000 records");
		When.onTheWizardPage.iPressNext();
		When.onTheWizardPage.iSelectAnswer("Standard OData operations");
		When.onTheWizardPage.iPressNext();

		// Assertions
		Then.onTheWizardPage.iShouldSeeFinalRecommendation();
		Then.onTheWizardPage.iShouldSeeRecommendedLevel("A");
	});

	opaTest("Should save the analysis", function (Given, When, Then) {
		// Actions
		When.onTheWizardPage.iPressSave();

		// Teardown
		Then.iTeardownMyApp();
	});
});
