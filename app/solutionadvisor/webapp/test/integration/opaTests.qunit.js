/* global QUnit */

QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"sd/solutionadvisor/test/integration/arrangements/Startup",
	"sd/solutionadvisor/test/integration/NavigationJourney",
	"sd/solutionadvisor/test/integration/WizardJourney",
	"sd/solutionadvisor/test/integration/AnalyticsJourney"
], function (Opa5, Startup) {
	"use strict";

	Opa5.extendConfig({
		arrangements: new Startup(),
		viewNamespace: "sd.solutionadvisor.view.",
		autoWait: true
	});

	QUnit.start();
});
