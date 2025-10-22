sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History",
  "sd/solutionadvisor/utils/NotificationService"
], function (Controller, History, NotificationService) {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.BaseController", {
    
    /**
     * Flag for unsaved changes
     * @private
     */
    _bHasUnsavedChanges: false,

    /**
     * Get the router instance
     * @returns {sap.ui.core.routing.Router} Router instance
     */
    getRouter: function() {
      return this.getOwnerComponent().getRouter();
    },

    /**
     * Get the resource bundle
     * @returns {sap.base.i18n.ResourceBundle} Resource bundle
     */
    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle();
    },

    /**
     * Set unsaved changes flag
     * @param {boolean} bHasChanges - Whether there are unsaved changes
     */
    setUnsavedChanges: function(bHasChanges) {
      this._bHasUnsavedChanges = bHasChanges;
      
      // Update window beforeunload handler
      if (bHasChanges) {
        this._addBeforeUnloadHandler();
      } else {
        this._removeBeforeUnloadHandler();
      }
    },

    /**
     * Get unsaved changes flag
     * @returns {boolean} Whether there are unsaved changes
     */
    hasUnsavedChanges: function() {
      return this._bHasUnsavedChanges;
    },

    /**
     * Add beforeunload event handler
     * @private
     */
    _addBeforeUnloadHandler: function() {
      if (!this._fnBeforeUnloadHandler) {
        this._fnBeforeUnloadHandler = this._onBeforeUnload.bind(this);
      }
      window.addEventListener("beforeunload", this._fnBeforeUnloadHandler);
    },

    /**
     * Remove beforeunload event handler
     * @private
     */
    _removeBeforeUnloadHandler: function() {
      if (this._fnBeforeUnloadHandler) {
        window.removeEventListener("beforeunload", this._fnBeforeUnloadHandler);
      }
    },

    /**
     * Handle beforeunload event
     * @param {Event} oEvent - Browser event
     * @private
     */
    _onBeforeUnload: function(oEvent) {
      oEvent.preventDefault();
      oEvent.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return oEvent.returnValue;
    },

    /**
     * Navigate back with unsaved changes check
     */
    onNavBack: function() {
      if (this._bHasUnsavedChanges) {
        NotificationService.showConfirmation(
          "You have unsaved changes. Do you want to leave without saving?",
          "All unsaved changes will be lost.",
          function() {
            this.setUnsavedChanges(false);
            this._performNavigation();
          }.bind(this)
        );
      } else {
        this._performNavigation();
      }
    },

    /**
     * Perform navigation back
     * @private
     */
    _performNavigation: function() {
      const oHistory = History.getInstance();
      const sPreviousHash = oHistory.getPreviousHash();

      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        this.getRouter().navTo("ProjectsList", {}, true);
      }
    },

    /**
     * Cleanup on controller exit
     */
    onExit: function() {
      this._removeBeforeUnloadHandler();
    },

    /**
     * Show session expiry warning
     * @param {number} iMinutesRemaining - Minutes until session expires
     */
    showSessionExpiryWarning: function(iMinutesRemaining) {
      NotificationService.showWarning(
        `Your session will expire in ${iMinutesRemaining} minutes.`,
        "Please save your work to avoid losing progress."
      );
    },

    /**
     * Start session expiry timer
     * @param {number} iSessionDuration - Session duration in minutes (default: 30)
     * @param {number} iWarningTime - Warning time in minutes before expiry (default: 5)
     */
    startSessionExpiryTimer: function(iSessionDuration, iWarningTime) {
      const iDuration = iSessionDuration || 30;
      const iWarning = iWarningTime || 5;
      
      // Calculate warning time in milliseconds
      const iWarningMs = (iDuration - iWarning) * 60 * 1000;
      
      if (this._sessionExpiryTimer) {
        clearTimeout(this._sessionExpiryTimer);
      }
      
      this._sessionExpiryTimer = setTimeout(function() {
        this.showSessionExpiryWarning(iWarning);
        
        // Show final warning 1 minute before expiry
        setTimeout(function() {
          this.showSessionExpiryWarning(1);
        }.bind(this), (iWarning - 1) * 60 * 1000);
      }.bind(this), iWarningMs);
    },

    /**
     * Stop session expiry timer
     */
    stopSessionExpiryTimer: function() {
      if (this._sessionExpiryTimer) {
        clearTimeout(this._sessionExpiryTimer);
        this._sessionExpiryTimer = null;
      }
    }
  });
});
