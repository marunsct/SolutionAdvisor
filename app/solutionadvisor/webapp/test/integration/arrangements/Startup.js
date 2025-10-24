sap.ui.define([
	"sap/ui/test/Opa5"
], function (Opa5) {
	"use strict";

	return Opa5.extend("sd.solutionadvisor.test.integration.arrangements.Startup", {

		iStartMyApp: function (oOptionsParameter) {
			var oOptions = oOptionsParameter || {};

			// Start the app with a minimal delay for faster tests
			oOptions.delay = oOptions.delay || 0;

			// Start the app UI component
			this.iStartMyUIComponent({
				componentConfig: {
					name: "sd.solutionadvisor",
					async: true,
					manifest: true
				},
				hash: oOptions.hash,
				autoWait: oOptions.autoWait
			});
		}
	});
});
