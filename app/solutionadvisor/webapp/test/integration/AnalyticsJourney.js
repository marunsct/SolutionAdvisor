/* global QUnit */

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/AnalyticsPage"
], function (opaTest) {
	"use strict";

	QUnit.module("Analytics Journey");

	opaTest("Should display analytics dashboard", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyApp({ hash: "#/analytics" });

		// Assertions
		Then.onTheAnalyticsPage.iShouldSeeTheDashboard();
		Then.onTheAnalyticsPage.iShouldSeeLevelDistributionChart();
		Then.onTheAnalyticsPage.iShouldSeeAverageScoresChart();
	});

	opaTest("Should filter analytics by date range", function (Given, When, Then) {
		// Actions
		When.onTheAnalyticsPage.iSelectDateRange("2024-01-01", "2024-12-31");

		// Assertions
		Then.onTheAnalyticsPage.iShouldSeeFilteredData();
	});

	opaTest("Should export analytics report", function (Given, When, Then) {
		// Actions
		When.onTheAnalyticsPage.iPressExport();

		// Teardown
		Then.iTeardownMyApp();
	});
});
