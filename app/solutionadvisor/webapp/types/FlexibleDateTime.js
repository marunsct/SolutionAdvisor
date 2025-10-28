sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/core/format/DateFormat"
], function (SimpleType, DateFormat) {
    "use strict";

    const FlexibleDateTime = SimpleType.extend("sd.solutionadvisor.types.FlexibleDateTime", {
        constructor: function () {
            SimpleType.apply(this, arguments);
            this._oFormatter = null;
        },

        formatValue: function (vValue, sTargetType) {
            if (vValue === null || vValue === undefined || vValue === "") {
                return "";
            }

            let oDate = null;
            if (vValue instanceof Date) {
                oDate = vValue;
            } else if (typeof vValue === "string") {
                // ISO 8601, Edm.Date (yyyy-MM-dd), or numeric string
                if (/^\d{4}-\d{2}-\d{2}$/.test(vValue)) {
                    // Treat as date only (assume UTC midnight)
                    oDate = new Date(vValue + "T00:00:00Z");
                } else {
                    const n = Number(vValue);
                    if (!Number.isNaN(n) && vValue.trim() !== "") {
                        oDate = new Date(n);
                    } else {
                        oDate = new Date(vValue);
                    }
                }
            } else if (typeof vValue === "number") {
                oDate = new Date(vValue);
            }

            if (!oDate || Number.isNaN(oDate.getTime())) {
                return "";
            }

            const oFormatter = this._getFormatter();
            return oFormatter.format(oDate);
        },

        parseValue: function (vValue, sSourceType) {
            // Keep as-is for two-way bindings using text; parsing is not needed
            return vValue;
        },

        validateValue: function (vValue) {
            // No-op: display-only scenarios
        },

        _getFormatter: function () {
            if (!this._oFormatter) {
                // Use DateTime by default for flexibility
                if (this.oFormatOptions && this.oFormatOptions.pattern) {
                    this._oFormatter = DateFormat.getDateTimeInstance({
                        pattern: this.oFormatOptions.pattern,
                        UTC: !!(this.oFormatOptions.UTC)
                    });
                } else {
                    this._oFormatter = DateFormat.getDateTimeInstance({
                        style: (this.oFormatOptions && this.oFormatOptions.style) || "medium",
                        UTC: !!(this.oFormatOptions && this.oFormatOptions.UTC)
                    });
                }
            }
            return this._oFormatter;
        }
    });

    return FlexibleDateTime;
});
