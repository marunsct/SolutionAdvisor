sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/AggregationFilled"
], function (Opa5, Press, AggregationFilled) {
	"use strict";

	var sViewName = "Analytics";

	Opa5.createPageObjects({
		onTheAnalyticsPage: {
			actions: {
				iSelectDateRange: function (sStartDate, sEndDate) {
					return this.waitFor({
						id: "startDatePicker",
						viewName: sViewName,
						actions: function (oDatePicker) {
							oDatePicker.setValue(sStartDate);
							oDatePicker.fireChange();
						},
						success: function () {
							this.waitFor({
								id: "endDatePicker",
								viewName: sViewName,
								actions: function (oDatePicker) {
									oDatePicker.setValue(sEndDate);
									oDatePicker.fireChange();
								}
							});
						},
						errorMessage: "Did not find the date range pickers"
					});
				},

				iPressExport: function () {
					return this.waitFor({
						id: "exportButton",
						viewName: sViewName,
						actions: new Press(),
						errorMessage: "Did not find the Export button"
					});
				}
			},

			assertions: {
				iShouldSeeTheDashboard: function () {
					return this.waitFor({
						id: "analyticsPanel",
						viewName: sViewName,
						success: function () {
							Opa5.assert.ok(true, "Analytics dashboard is displayed");
						},
						errorMessage: "Did not find the analytics dashboard"
					});
				},

				iShouldSeeLevelDistributionChart: function () {
					return this.waitFor({
						id: "levelDistributionChart",
						viewName: sViewName,
						success: function (oChart) {
							Opa5.assert.ok(oChart.getVisible(), "Level distribution chart is visible");
						},
						errorMessage: "Did not find the level distribution chart"
					});
				},

				iShouldSeeAverageScoresChart: function () {
					return this.waitFor({
						id: "averageScoresChart",
						viewName: sViewName,
						success: function (oChart) {
							Opa5.assert.ok(oChart.getVisible(), "Average scores chart is visible");
						},
						errorMessage: "Did not find the average scores chart"
					});
				},

				iShouldSeeFilteredData: function () {
					return this.waitFor({
						id: "analyticsTable",
						viewName: sViewName,
						matchers: new AggregationFilled({ name: "items" }),
						success: function () {
							Opa5.assert.ok(true, "Filtered data is displayed");
						},
						errorMessage: "Did not find filtered data"
					});
				}
			}
		}
	});
});
