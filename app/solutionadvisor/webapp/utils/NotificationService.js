sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
  "use strict";

  return {
    /**
     * Show success message
     * @param {string} sMessage - Main message
     * @param {string} sDetails - Optional detailed message
     */
    showSuccess: function(sMessage, sDetails) {
      const sFullMessage = sDetails ? `${sMessage}\n\n${sDetails}` : sMessage;
      MessageToast.show(sFullMessage, {
        duration: 4000,
        width: "20em",
        closeOnBrowserNavigation: false
      });
    },

    /**
     * Show error message
     * @param {string} sMessage - Main message
     * @param {string} sDetails - Optional detailed message
     * @param {boolean} bRetry - Show retry button
     * @param {function} fnRetry - Retry callback function
     */
    showError: function(sMessage, sDetails, bRetry, fnRetry) {
      const sFullMessage = sDetails ? `${sMessage}\n\n${sDetails}` : sMessage;

      if (bRetry && fnRetry) {
        MessageBox.error(sFullMessage, {
          title: "Error",
          actions: [MessageBox.Action.RETRY, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.RETRY,
          onClose: function(sAction) {
            if (sAction === MessageBox.Action.RETRY) {
              fnRetry();
            }
          }
        });
      } else {
        MessageBox.error(sFullMessage, {
          title: "Error"
        });
      }
    },

    /**
     * Show warning message
     * @param {string} sMessage - Main message
     * @param {string} sDetails - Optional detailed message
     */
    showWarning: function(sMessage, sDetails) {
      const sFullMessage = sDetails ? `${sMessage}\n\n${sDetails}` : sMessage;
      MessageBox.warning(sFullMessage, {
        title: "Warning"
      });
    },

    /**
     * Show information message
     * @param {string} sMessage - Main message
     * @param {string} sDetails - Optional detailed message
     */
    showInformation: function(sMessage, sDetails) {
      const sFullMessage = sDetails ? `${sMessage}\n\n${sDetails}` : sMessage;
      MessageBox.information(sFullMessage, {
        title: "Information"
      });
    },

    /**
     * Show confirmation dialog
     * @param {string} sMessage - Main message
     * @param {string} sDetails - Optional detailed message
     * @param {function} fnConfirm - Confirm callback
     * @param {function} fnCancel - Cancel callback
     */
    showConfirmation: function(sMessage, sDetails, fnConfirm, fnCancel) {
      const sFullMessage = sDetails ? `${sMessage}\n\n${sDetails}` : sMessage;
      MessageBox.confirm(sFullMessage, {
        title: "Confirmation",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.OK) {
            if (fnConfirm) {
              fnConfirm();
            }
          } else {
            if (fnCancel) {
              fnCancel();
            }
          }
        }
      });
    },

    /**
     * Show delete confirmation dialog
     * @param {string} sItemName - Name of item to delete
     * @param {function} fnConfirm - Confirm callback
     * @param {function} fnCancel - Cancel callback
     */
    showDeleteConfirmation: function(sItemName, fnConfirm, fnCancel) {
      const sMessage = `Are you sure you want to delete "${sItemName}"?`;
      const sDetails = "This action cannot be undone.";
      
      MessageBox.warning(
        sDetails ? `${sMessage}\n\n${sDetails}` : sMessage,
        {
          title: "Delete Confirmation",
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.DELETE,
          onClose: function(sAction) {
            if (sAction === MessageBox.Action.DELETE) {
              if (fnConfirm) {
                fnConfirm();
              }
            } else {
              if (fnCancel) {
                fnCancel();
              }
            }
          }
        }
      );
    },

    /**
     * Show loading message
     * @param {string} sMessage - Loading message
     */
    showLoading: function(sMessage) {
      MessageToast.show(sMessage || "Loading...", {
        duration: 2000
      });
    }
  };
});
