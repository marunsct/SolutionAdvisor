/**
 * Unsaved Changes Protection Service
 * Tracks form modifications and provides navigation protection to prevent accidental data loss.
 * 
 * Features:
 * - Automatic detection of form field changes
 * - Browser beforeunload protection
 * - Navigation confirmation dialogs
 * - Integration with router navigation
 * - Wizard step validation
 * - Model binding change detection
 */

sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History"
], function (BaseObject, MessageBox, History) {
    "use strict";

    return BaseObject.extend("sd.solutionadvisor.service.UnsavedChangesService", {
        
        constructor: function() {
            BaseObject.prototype.constructor.apply(this, arguments);
            this._hasUnsavedChanges = false;
            this._trackedControls = new Map(); // Control ID -> Original Value
            this._trackedModels = new Map(); // Model Name -> Original Data
            this._beforeUnloadHandler = this._handleBeforeUnload.bind(this);
            this._isEnabled = false;
        },

        /**
         * Enable unsaved changes protection
         */
        enable: function() {
            if (!this._isEnabled) {
                window.addEventListener("beforeunload", this._beforeUnloadHandler);
                this._isEnabled = true;
            }
        },

        /**
         * Disable unsaved changes protection
         */
        disable: function() {
            if (this._isEnabled) {
                window.removeEventListener("beforeunload", this._beforeUnloadHandler);
                this._isEnabled = false;
            }
        },

        /**
         * Check if there are unsaved changes
         * @returns {boolean} True if there are unsaved changes
         */
        hasUnsavedChanges: function() {
            return this._hasUnsavedChanges;
        },

        /**
         * Mark as having unsaved changes
         * @param {boolean} hasChanges - Whether there are unsaved changes
         */
        setUnsavedChanges: function(hasChanges) {
            this._hasUnsavedChanges = !!hasChanges;
        },

        /**
         * Start tracking a control for changes
         * @param {sap.ui.core.Control} control - Control to track
         * @param {string} property - Property to track (e.g., "value", "selectedKey")
         */
        trackControl: function(control, property) {
            if (!control || !property) {
                return;
            }

            const controlId = control.getId();
            const currentValue = control.getProperty(property);
            
            // Store original value
            this._trackedControls.set(controlId, {
                control: control,
                property: property,
                originalValue: currentValue,
                currentValue: currentValue
            });

            // Attach change handler
            const eventName = this._getChangeEventName(control, property);
            if (eventName) {
                control.attachEvent(eventName, this._onControlChange.bind(this, controlId));
            }
        },

        /**
         * Start tracking a model for changes
         * @param {sap.ui.model.Model} model - Model to track
         * @param {string} modelName - Name/identifier for the model
         */
        trackModel: function(model, modelName) {
            if (!model || !modelName) {
                return;
            }

            const originalData = this._deepClone(model.getData());
            this._trackedModels.set(modelName, {
                model: model,
                originalData: originalData
            });

            // Attach property change handler
            model.attachPropertyChange(this._onModelChange.bind(this, modelName));
        },

        /**
         * Stop tracking a control
         * @param {string|sap.ui.core.Control} control - Control ID or control instance
         */
        untrackControl: function(control) {
            const controlId = typeof control === "string" ? control : control.getId();
            this._trackedControls.delete(controlId);
            this._updateUnsavedState();
        },

        /**
         * Stop tracking a model
         * @param {string} modelName - Model name to stop tracking
         */
        untrackModel: function(modelName) {
            this._trackedModels.delete(modelName);
            this._updateUnsavedState();
        },

        /**
         * Reset tracking (mark all changes as saved)
         */
        reset: function() {
            // Update original values for controls
            this._trackedControls.forEach((trackInfo, controlId) => {
                const control = trackInfo.control;
                const property = trackInfo.property;
                if (control && !control.bIsDestroyed) {
                    trackInfo.originalValue = control.getProperty(property);
                    trackInfo.currentValue = trackInfo.originalValue;
                }
            });

            // Update original data for models
            this._trackedModels.forEach((trackInfo, modelName) => {
                const model = trackInfo.model;
                if (model) {
                    trackInfo.originalData = this._deepClone(model.getData());
                }
            });

            this._hasUnsavedChanges = false;
        },

        /**
         * Clear all tracking
         */
        clear: function() {
            this._trackedControls.clear();
            this._trackedModels.clear();
            this._hasUnsavedChanges = false;
        },

        /**
         * Show confirmation dialog for unsaved changes
         * @returns {Promise<boolean>} Promise resolving to user choice
         */
        confirmNavigation: function() {
            if (!this._hasUnsavedChanges) {
                return Promise.resolve(true);
            }

            return new Promise((resolve) => {
                MessageBox.confirm(
                    "You have unsaved changes. Do you want to continue without saving?",
                    {
                        title: "Unsaved Changes",
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        emphasizedAction: MessageBox.Action.NO,
                        onClose: function(action) {
                            resolve(action === MessageBox.Action.YES);
                        }
                    }
                );
            });
        },

        /**
         * Wizard-specific navigation confirmation
         * @param {string} stepName - Name of the step being left
         * @returns {Promise<boolean>} Promise resolving to user choice
         */
        confirmWizardNavigation: function(stepName) {
            if (!this._hasUnsavedChanges) {
                return Promise.resolve(true);
            }

            return new Promise((resolve) => {
                MessageBox.confirm(
                    `You have unsaved changes in the ${stepName} step. Do you want to continue without saving?`,
                    {
                        title: "Unsaved Changes - " + stepName,
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        emphasizedAction: MessageBox.Action.NO,
                        onClose: function(action) {
                            resolve(action === MessageBox.Action.YES);
                        }
                    }
                );
            });
        },

        /**
         * Integration with SAP UI5 Router
         * @param {sap.ui.core.routing.Router} router - Router instance
         */
        integrateWithRouter: function(router) {
            if (!router) {
                return;
            }

            // Intercept route navigation
            router.attachBeforeRouteMatched(this._onBeforeRouteMatched.bind(this));
        },

        /**
         * Private methods
         */
        _onControlChange: function(controlId, event) {
            const trackInfo = this._trackedControls.get(controlId);
            if (!trackInfo) {
                return;
            }

            const control = trackInfo.control;
            const property = trackInfo.property;
            
            if (control && !control.bIsDestroyed) {
                trackInfo.currentValue = control.getProperty(property);
                this._updateUnsavedState();
            }
        },

        _onModelChange: function(modelName, event) {
            // Model property change detected
            this._updateUnsavedState();
        },

        _updateUnsavedState: function() {
            let hasChanges = false;

            // Check control changes
            this._trackedControls.forEach((trackInfo) => {
                if (trackInfo.originalValue !== trackInfo.currentValue) {
                    hasChanges = true;
                }
            });

            // Check model changes
            if (!hasChanges) {
                this._trackedModels.forEach((trackInfo) => {
                    const currentData = trackInfo.model.getData();
                    if (!this._deepEqual(trackInfo.originalData, currentData)) {
                        hasChanges = true;
                    }
                });
            }

            this._hasUnsavedChanges = hasChanges;
        },

        _handleBeforeUnload: function(event) {
            if (this._hasUnsavedChanges) {
                const message = "You have unsaved changes. Are you sure you want to leave?";
                event.preventDefault();
                event.returnValue = message;
                return message;
            }
        },

        _onBeforeRouteMatched: function(event) {
            if (this._hasUnsavedChanges) {
                // This is a simplified approach - in a real application,
                // you might need to prevent the route change and show a dialog first
                const proceed = confirm("You have unsaved changes. Do you want to continue?");
                if (!proceed) {
                    // Navigate back to prevent route change
                    const history = History.getInstance();
                    const prevHash = history.getPreviousHash();
                    if (prevHash !== undefined) {
                        window.history.go(-1);
                    }
                }
            }
        },

        _getChangeEventName: function(control, property) {
            // Map common control types to their change events
            const controlType = control.getMetadata().getName();
            
            switch (controlType) {
                case "sap.m.Input":
                case "sap.m.TextArea":
                    return "liveChange";
                case "sap.m.ComboBox":
                case "sap.m.Select":
                    return "selectionChange";
                case "sap.m.CheckBox":
                case "sap.m.RadioButton":
                    return "select";
                case "sap.m.DatePicker":
                case "sap.m.TimePicker":
                    return "change";
                case "sap.m.Slider":
                    return "change";
                default:
                    return "change"; // Generic fallback
            }
        },

        _deepClone: function(obj) {
            if (obj === null || typeof obj !== "object") {
                return obj;
            }
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            if (obj instanceof Array) {
                return obj.map(item => this._deepClone(item));
            }
            if (typeof obj === "object") {
                const cloned = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cloned[key] = this._deepClone(obj[key]);
                    }
                }
                return cloned;
            }
            return obj;
        },

        _deepEqual: function(obj1, obj2) {
            if (obj1 === obj2) {
                return true;
            }
            
            if (obj1 == null || obj2 == null) {
                return obj1 === obj2;
            }
            
            if (typeof obj1 !== typeof obj2) {
                return false;
            }
            
            if (typeof obj1 !== "object") {
                return obj1 === obj2;
            }
            
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
            
            if (keys1.length !== keys2.length) {
                return false;
            }
            
            for (const key of keys1) {
                if (!keys2.includes(key)) {
                    return false;
                }
                if (!this._deepEqual(obj1[key], obj2[key])) {
                    return false;
                }
            }
            
            return true;
        }
    });
});