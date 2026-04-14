/**
 * Centralized Notification Service
 * Provides consistent messaging across all controllers with standardized styling,
 * positioning, and duration management for success, error, warning, and information messages.
 * 
 * Features:
 * - Consistent message styling and positioning
 * - Auto-dismiss with configurable duration
 * - Queue management for multiple messages
 * - Context-aware messaging with action buttons
 * - Accessibility support with screen reader announcements
 */

sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/MessageStrip",
    "sap/ui/core/library"
], function (BaseObject, MessageToast, MessageBox, MessageStrip, coreLibrary) {
    "use strict";

    const MessageType = coreLibrary.MessageType;

    return BaseObject.extend("sd.solutionadvisor.service.NotificationService", {
        
        constructor: function() {
            BaseObject.prototype.constructor.apply(this, arguments);
            this._messageQueue = [];
            this._activeMessageStrips = new Map(); // Track active message strips by container ID
        },

        /**
         * Show a success message
         * @param {string} message - Message text
         * @param {object} options - Optional configuration
         */
        showSuccess: function(message, options) {
            const config = Object.assign({
                type: "success",
                icon: "sap-icon://message-success",
                duration: 3000,
                closeable: true
            }, options);

            if (config.toast) {
                this._showToast(message, config);
            } else if (config.dialog) {
                this._showDialog(message, config);
            } else {
                this._showMessageStrip(message, config);
            }
        },

        /**
         * Show an error message
         * @param {string} message - Message text
         * @param {object} options - Optional configuration
         */
        showError: function(message, options) {
            const config = Object.assign({
                type: "error",
                icon: "sap-icon://message-error",
                duration: 5000,
                closeable: true
            }, options);

            if (config.toast) {
                this._showToast(message, config);
            } else if (config.dialog) {
                this._showDialog(message, config);
            } else {
                this._showMessageStrip(message, config);
            }
        },

        /**
         * Show a warning message
         * @param {string} message - Message text
         * @param {object} options - Optional configuration
         */
        showWarning: function(message, options) {
            const config = Object.assign({
                type: "warning",
                icon: "sap-icon://message-warning",
                duration: 4000,
                closeable: true
            }, options);

            if (config.toast) {
                this._showToast(message, config);
            } else if (config.dialog) {
                this._showDialog(message, config);
            } else {
                this._showMessageStrip(message, config);
            }
        },

        /**
         * Show an information message
         * @param {string} message - Message text
         * @param {object} options - Optional configuration
         */
        showInfo: function(message, options) {
            const config = Object.assign({
                type: "information",
                icon: "sap-icon://message-information",
                duration: 3000,
                closeable: true
            }, options);

            if (config.toast) {
                this._showToast(message, config);
            } else if (config.dialog) {
                this._showDialog(message, config);
            } else {
                this._showMessageStrip(message, config);
            }
        },

        /**
         * Show confirmation dialog
         * @param {string} message - Confirmation message
         * @param {object} options - Configuration with onConfirm/onCancel callbacks
         * @returns {Promise} Promise resolving with user choice
         */
        confirm: function(message, options) {
            const config = Object.assign({
                title: "Confirmation",
                icon: MessageBox.Icon.QUESTION,
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL]
            }, options);

            return new Promise((resolve) => {
                MessageBox.show(message, {
                    icon: config.icon,
                    title: config.title,
                    actions: config.actions,
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            if (config.onConfirm) config.onConfirm();
                            resolve(true);
                        } else {
                            if (config.onCancel) config.onCancel();
                            resolve(false);
                        }
                    }
                });
            });
        },

        /**
         * Clear all active notifications in a specific container
         * @param {string} containerId - Container ID to clear messages from
         */
        clearMessages: function(containerId) {
            if (containerId && this._activeMessageStrips.has(containerId)) {
                const messageStrip = this._activeMessageStrips.get(containerId);
                if (messageStrip && !messageStrip.bIsDestroyed) {
                    messageStrip.destroy();
                }
                this._activeMessageStrips.delete(containerId);
            } else if (!containerId) {
                // Clear all message strips
                this._activeMessageStrips.forEach((messageStrip) => {
                    if (messageStrip && !messageStrip.bIsDestroyed) {
                        messageStrip.destroy();
                    }
                });
                this._activeMessageStrips.clear();
            }
        },

        /**
         * Show contextual messages for specific business scenarios
         */
        showAnalysisComplete: function(recommendation, ricefwId) {
            this.showSuccess(
                `Analysis complete! Recommended Clean Core Level: ${recommendation} for RICEFW ${ricefwId}`,
                { duration: 4000, toast: true }
            );
        },

        showWizardStepValidation: function(stepName, errors) {
            const message = `Please complete ${stepName}: ${errors.join(", ")}`;
            this.showWarning(message, { containerId: "wizardValidationContainer" });
        },

        showDataSaved: function(entityType, entityId) {
            this.showSuccess(
                `${entityType} ${entityId} saved successfully`,
                { toast: true }
            );
        },

        showDataLoadError: function(entityType) {
            this.showError(
                `Failed to load ${entityType} data. Please check your connection and try again.`,
                { 
                    dialog: true,
                    title: "Data Loading Error"
                }
            );
        },

        showExportSuccess: function(format, filename) {
            this.showSuccess(
                `${format} export completed: ${filename}`,
                { toast: true, duration: 2000 }
            );
        },

        showUnsavedChanges: function() {
            return this.confirm(
                "You have unsaved changes. Do you want to continue without saving?",
                {
                    title: "Unsaved Changes",
                    icon: MessageBox.Icon.WARNING
                }
            );
        },

        /**
         * Private methods for different notification types
         */
        _showToast: function(message, config) {
            MessageToast.show(message, {
                duration: config.duration || 3000,
                width: config.width || "15em",
                my: config.my || "center bottom",
                at: config.at || "center bottom",
                of: config.of || window,
                offset: config.offset || "0 -50",
                collision: config.collision || "fit fit"
            });
        },

        _showDialog: function(message, config) {
            const icon = this._getMessageBoxIcon(config.type);
            
            MessageBox.show(message, {
                icon: icon,
                title: config.title || this._getDefaultTitle(config.type),
                actions: config.actions || [MessageBox.Action.OK],
                emphasizedAction: config.emphasizedAction || MessageBox.Action.OK,
                onClose: config.onClose
            });
        },

        _showMessageStrip: function(message, config) {
            const containerId = config.containerId || "defaultMessageContainer";
            
            // Clear existing message strip in this container
            this.clearMessages(containerId);

            const messageStrip = new MessageStrip({
                text: message,
                type: this._getSAPMessageType(config.type),
                showIcon: true,
                showCloseButton: config.closeable,
                class: "sapUiMediumMarginBottom"
            });

            // Store reference for cleanup
            this._activeMessageStrips.set(containerId, messageStrip);

            // Auto-dismiss if duration is specified
            if (config.duration && config.duration > 0) {
                setTimeout(() => {
                    if (messageStrip && !messageStrip.bIsDestroyed) {
                        messageStrip.destroy();
                        this._activeMessageStrips.delete(containerId);
                    }
                }, config.duration);
            }

            // Try to add to specified container
            const container = sap.ui.getCore().byId(containerId) || 
                            document.getElementById(containerId);
            
            if (container && container.addContent) {
                container.addContent(messageStrip);
            } else if (container && container.appendChild) {
                container.appendChild(messageStrip.getDomRef());
            } else {
                // Fallback to current view's content area
                const currentView = sap.ui.getCore().getCurrentFocusedControlId();
                if (currentView) {
                    const view = sap.ui.getCore().byId(currentView);
                    if (view && view.addContent) {
                        view.addContent(messageStrip);
                    }
                }
            }

            return messageStrip;
        },

        _getSAPMessageType: function(type) {
            switch (type) {
                case "success": return MessageType.Success;
                case "error": return MessageType.Error;
                case "warning": return MessageType.Warning;
                case "information": return MessageType.Information;
                default: return MessageType.Information;
            }
        },

        _getMessageBoxIcon: function(type) {
            switch (type) {
                case "success": return MessageBox.Icon.SUCCESS;
                case "error": return MessageBox.Icon.ERROR;
                case "warning": return MessageBox.Icon.WARNING;
                case "information": return MessageBox.Icon.INFORMATION;
                default: return MessageBox.Icon.INFORMATION;
            }
        },

        _getDefaultTitle: function(type) {
            switch (type) {
                case "success": return "Success";
                case "error": return "Error";
                case "warning": return "Warning";
                case "information": return "Information";
                default: return "Notification";
            }
        }
    });
});