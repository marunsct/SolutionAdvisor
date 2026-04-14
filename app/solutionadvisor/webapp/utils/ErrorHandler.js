sap.ui.define([
    "sap/m/MessageBox"
], function (MessageBox) {
    "use strict";
    
    return {
        /**
         * Handles a failed OData request with appropriate user feedback
         * 
         * @param {object} oError - The error object from OData request
         * @param {string} sDefaultMessage - Default message to show if error details cannot be extracted
         */
        showServiceError: function(oError, sDefaultMessage) {
            // Default message if we can't extract details
            let sErrorMessage = sDefaultMessage || "An error occurred during the operation";
            
            try {
                // Try to extract error details
                if (oError.responseJSON && oError.responseJSON.error) {
                    // OData V4 format
                    sErrorMessage = oError.responseJSON.error.message || sErrorMessage;
                } else if (oError.responseText) {
                    // Try to parse as JSON
                    const oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message) {
                        sErrorMessage = oErrorResponse.error.message;
                    }
                } else if (oError.message) {
                    // Direct error message
                    sErrorMessage = oError.message;
                } else if (typeof oError === 'string') {
                    // Error is already a string
                    sErrorMessage = oError;
                }
            } catch (e) {
                // If parsing fails, use default message
                // Log silently to avoid cascading errors
            }
            
            // Show error in MessageBox
            MessageBox.error(sErrorMessage, {
                title: "Error",
                onClose: function() {
                    // Optional: Add analytics logging for errors here
                }
            });
        },
        
        /**
         * Handle specific error for analysis wizard
         * 
         * @param {object} oError - Error object
         * @param {string} sObjectType - Object type (Reports, Interfaces, etc.)
         * @returns {boolean} Whether the error was handled
         */
        handleWizardSpecificError: function(oError, sObjectType) {
            // Check for specific error patterns
            if (oError && oError.message && 
                oError.message.includes("No questions found for object type")) {
                
                // Show helpful message for missing questions
                const sMessage = `No questions are defined for object type "${sObjectType}". ` +
                                 `This may be because the question catalog is still being developed. ` +
                                 `Please try another object type or contact the administrator.`;
                
                MessageBox.information(sMessage, {
                    title: "No Questions Available"
                });
                return true;
            }
            
            // Navigation rule errors
            if (oError && oError.message && 
                (oError.message.includes("navigation") || oError.message.includes("Navigation"))) {
                
                const sMessage = "There is an issue with the decision tree navigation. " +
                                "This has been logged and will be fixed by the administrators.";
                
                MessageBox.error(sMessage, {
                    title: "Decision Tree Error"
                });
                return true;
            }
            
            return false;
        },
        
        /**
         * Log error for later analysis
         * 
         * @param {object} oError - Error object
         * @param {string} sContext - Context where the error occurred
         */
        logErrorForAnalytics: function(oError, sContext) {
            // In a real app, this would send error details to a logging service
            // For now, we just log to console in development
            if (window["sap-ui-debug"]) {
                /* eslint-disable no-console */
                console.error(`Error in ${sContext}:`, oError);
                /* eslint-enable no-console */
            }
        }
    };
});