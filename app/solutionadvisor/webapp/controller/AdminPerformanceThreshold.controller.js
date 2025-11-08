sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/FilterType",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/base/Log",
  "sap/ui/core/format/DateFormat",
  "sap/ui/core/Fragment"
], (Controller, JSONModel, Filter, FilterOperator, FilterType, MessageToast, MessageBox, Log, DateFormat, Fragment) => {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.AdminPerformanceThreshold", {
    
    /**
     * Formatter for timestamp display
     * Safely formats date or returns dash if invalid
     * @param {string|Date} sTimestamp - Timestamp to format
     * @returns {string} Formatted date or "-"
     */
    formatTimestamp: function(sTimestamp) {
      if (!sTimestamp) {
        return "-";
      }
      try {
        const oDateFormat = DateFormat.getDateTimeInstance({
          pattern: "yyyy-MM-dd HH:mm"
        });
        const oDate = new Date(sTimestamp);
        
        if (isNaN(oDate.getTime())) {
          return "-";
        }
        
        return oDateFormat.format(oDate);
      } catch (e) {
        void e;
        return "-";
      }
    },
    
    onInit: function() {
      const oViewModel = new JSONModel({
        recordCount: 0,
        selectedCount: 0,
        busy: false
      });
      this.getView().setModel(oViewModel, "viewModel");
      
      // Attach to route matched to ensure model is ready
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("AdminPerformanceThreshold").attachPatternMatched(this._onRouteMatched, this);
    },
    
    _onRouteMatched: function() {
      // Clear any filters from previous navigation
      const oTable = this.byId("thresholdTable");
      if (oTable) {
        const oBinding = oTable.getBinding("items");
        if (oBinding) {
          oBinding.filter([], FilterType.Application);
        }
      }
      this._loadData();
    },

    _loadData: function() {
      const oModel = this.getView().getModel("admin");
      const oViewModel = this.getView().getModel("viewModel");
      const oTable = this.byId("thresholdTable");
      
      if (!oModel) {
        Log.error("Admin model not available");
        MessageBox.error("Admin service not available. Please refresh the page.");
        return;
      }
      
      if (!oTable) {
        Log.error("Table not found");
        return;
      }
      
      // Get the existing table binding
      const oBinding = oTable.getBinding("items");
      
      if (!oBinding) {
        Log.error("Table binding not available");
        return;
      }
      
      // Check if the binding or model has pending changes before refreshing
      if (oModel.hasPendingChanges() || oBinding.hasPendingChanges()) {
        Log.warning("Model or binding has pending changes, waiting for them to clear...");
        setTimeout(() => {
          this._loadData();
        }, 200);
        return;
      }
      
      oViewModel.setProperty("/busy", true);
      
      // Set up event handler to update count when data is received
      const fnUpdateCount = () => {
        const iCount = oBinding.getCount ? oBinding.getCount() : oBinding.getLength();
        oViewModel.setProperty("/recordCount", iCount);
        oViewModel.setProperty("/busy", false);
        if (iCount > 0) {
          MessageToast.show(`Loaded ${iCount} threshold records`);
        }
        oBinding.detachChange(fnUpdateCount);
      };
      
      oBinding.attachChange(fnUpdateCount);
      
      // Refresh the binding
      oBinding.refresh();
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("Admin");
    },

    onCreate: function() {
      MessageBox.information("Create threshold dialog - to be implemented");
    },

    /**
     * Handle item press - open dialog in readonly mode
     */
    onItemPress: function(oEvent) {
      const oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      const oContext = oItem.getBindingContext("admin");
      
      if (oContext) {
        this._openEditDialog(oContext, true); // true = readonly mode
      }
    },

    /**
     * Handle edit button press - open dialog in edit mode
     */
    onEdit: function(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oContext = oItem.getBindingContext("admin");
      
      if (oContext) {
        this._openEditDialog(oContext, false); // false = edit mode
      }
    },

    /**
     * Open Edit Dialog with the selected context
     * @param {sap.ui.model.Context} oContext - The binding context
     * @param {boolean} bReadOnly - Whether to open in readonly mode
     * @private
     */
    _openEditDialog: function(oContext, bReadOnly) {
      const oModel = this.getView().getModel("admin");
      const sSelect = [
        "ID","category","method","volumeLimit","sizeThreshold","frequencyLimit",
        "responseTimeTarget","concurrencyLimit","cleanCoreLevel","whenExceeded",
        "alternativeSolution","applicableObjectTypes","deploymentTypes","isActive",
        "createdAt","createdBy","modifiedAt","modifiedBy"
      ].join(",");

      const oCtxBinding = oModel.bindContext(oContext.getPath(), null, { $select: sSelect });
      let oData = oContext.getObject();
      
      try {
        const oFull = oCtxBinding ? (oCtxBinding.getBoundContext() ? oCtxBinding.getBoundContext().getObject() : null) : null;
        if (!oFull || Object.keys(oFull || {}).length < 2) {
          oData = oCtxBinding.requestObject ? oCtxBinding.requestObject() : oData;
        } else {
          oData = oFull;
        }
      } catch (e) {
        void e;
      }

      const _open = (fullData) => {
        const data = fullData && typeof fullData === 'object' ? fullData : (oData || {});
        
  // Add dialog metadata
  data.editable = !bReadOnly;
  data.dialogTitle = bReadOnly ? "View Threshold" : "Edit Threshold";
        
        this._oEditContext = oContext;

        if (!this._oEditDialog) {
          Fragment.load({
            id: this.getView().getId(),
            name: "sd.solutionadvisor.view.fragments.EditPerformanceThresholdDialog",
            controller: this
          }).then((oDialog) => {
            this._oEditDialog = oDialog;
            const oEditModel = new JSONModel(data);
            oDialog.setModel(oEditModel, "editModel");
            this.getView().addDependent(oDialog);
            oDialog.open();
          });
        } else {
          const oEditModel = this._oEditDialog.getModel("editModel");
          if (oEditModel) {
            oEditModel.setData(data);
          } else {
            this._oEditDialog.setModel(new JSONModel(data), "editModel");
          }
          this._oEditDialog.open();
        }
      };

      if (oData && typeof oData.then === 'function') {
        oData.then(_open).catch(() => _open(oContext.getObject()));
      } else {
        _open(oData);
      }
    },

    /**
     * Save changes from edit dialog
     */
    onEditConfirm: function() {
      const oModel = this.getView().getModel("admin");
      const oEditModel = this._oEditDialog && this._oEditDialog.getModel("editModel");
      if (!oEditModel) { MessageBox.error("Edit model not found"); return; }
      const oData = oEditModel.getData();
      const oCtx = this._oEditContext;

      if (!oCtx) { MessageBox.error("No record selected"); return; }

      // Validate required fields
      if (!oData.category) {
        MessageBox.error("Please fill in all required fields (Category)");
        return;
      }

      // Coerce types
      if (typeof oData.isActive === 'string') {
        oData.isActive = oData.isActive === 'true';
      }
      ["volumeLimit","responseTimeTarget","concurrencyLimit"].forEach((f)=>{
        if (Object.prototype.hasOwnProperty.call(oData,f)) {
          const n = parseInt(oData[f],10);
          if (!Number.isNaN(n)) oData[f] = n; // keep if parsable
        }
      });

      // Update fields via context
      const fields = [
        "category","method","volumeLimit","sizeThreshold","frequencyLimit",
        "responseTimeTarget","concurrencyLimit","cleanCoreLevel","whenExceeded",
        "alternativeSolution","applicableObjectTypes","deploymentTypes","isActive"
      ];
      fields.forEach((f) => {
        if (Object.prototype.hasOwnProperty.call(oData, f)) {
          oCtx.setProperty(f, oData[f]);
        }
      });

      oModel.submitBatch("$auto").then(() => {
        MessageToast.show("Saved successfully");
        if (this._oEditDialog) { this._oEditDialog.close(); }
        
        setTimeout(() => {
          this._loadData();
        }, 300);
      }).catch((error) => {
        if (oModel.hasPendingChanges()) {
          oModel.resetChanges();
        }
        Log.error("Save failed", error);
        MessageBox.error("Failed to save changes");
      });
    },

    /**
     * Cancel edit dialog
     */
    onEditCancel: function() {
      if (this._oEditDialog) { this._oEditDialog.close(); }
      this._oEditContext = null;
    },

    onDelete: function(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oContext = oItem.getBindingContext("admin");
      const oData = oContext.getObject();
      
      MessageBox.confirm(`Delete threshold "${oData.name}"?`, {
        onClose: (sAction) => {
          if (sAction === MessageBox.Action.OK) {
            oContext.delete().then(() => {
              MessageToast.show("Threshold deleted successfully");
              
              // After successful deletion, context is removed - no need to reset changes
              setTimeout(() => {
                this._loadData();
              }, 100);
            }).catch((error) => {
              Log.error("Error deleting threshold:", error);
              MessageBox.error("Failed to delete threshold");
            });
          }
        }
      });
    },

    onExport: function() {
      MessageToast.show("Export to Excel - to be implemented");
    },

    onMassUpload: function() {
      MessageToast.show("Mass upload from Excel - to be implemented");
    },

    onSearch: function(oEvent) {
      const sQuery = oEvent.getParameter("query");
      const oTable = this.byId("thresholdTable");
      const oBinding = oTable.getBinding("items");
      
      if (sQuery) {
        const aFilters = [
          new Filter({
            filters: [
              new Filter("name", FilterOperator.Contains, sQuery),
              new Filter("description", FilterOperator.Contains, sQuery)
            ],
            and: false
          })
        ];
        oBinding.filter(aFilters);
      } else {
        oBinding.filter([]);
      }
    },

    onFilterChange: function() {
      const oObjectTypeFilter = this.byId("objectTypeFilterThreshold");
      const oCategoryFilter = this.byId("categoryFilterThreshold");
      const oActiveSwitch = this.byId("activeOnlySwitch");
      const oTable = this.byId("thresholdTable");
      const oBinding = oTable.getBinding("items");
      
      const aFilters = [];
      
      const sObjectType = oObjectTypeFilter.getSelectedKey();
      if (sObjectType) {
        aFilters.push(new Filter("applicableObjectTypes", FilterOperator.Contains, sObjectType));
      }
      
      const sCategory = oCategoryFilter.getSelectedKey();
      if (sCategory) {
        aFilters.push(new Filter("category", FilterOperator.EQ, sCategory));
      }
      
      if (oActiveSwitch.getState()) {
        aFilters.push(new Filter("isActive", FilterOperator.EQ, true));
      }
      
      oBinding.filter(aFilters);
    },

    onClearFilters: function() {
      this.byId("objectTypeFilterThreshold").setSelectedKey("");
      this.byId("categoryFilterThreshold").setSelectedKey("");
      this.byId("activeOnlySwitch").setState(true);
      this.onFilterChange();
    }
  });
});
