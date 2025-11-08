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

  return Controller.extend("sd.solutionadvisor.controller.AdminObjectTypes", {
    
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
        busy: false
      });
      this.getView().setModel(oViewModel, "viewModel");
      
      // Attach to route matched to ensure model is ready
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("AdminObjectTypes").attachPatternMatched(this._onRouteMatched, this);
    },
    
    _onRouteMatched: function() {
      // Clear any filters from previous navigation
      const oTable = this.byId("objectTypesTable");
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
      const oTable = this.byId("objectTypesTable");
      
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
          MessageToast.show(`Loaded ${iCount} object type records`);
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
      MessageBox.information("Create object type dialog - to be implemented");
    },

    onItemPress: function(oEvent) {
      const oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      const oContext = oItem.getBindingContext("admin");
      if (oContext) this._openEditDialog(oContext, true);
    },

    onEdit: function(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oContext = oItem.getBindingContext("admin");
      if (oContext) this._openEditDialog(oContext, false);
    },

    _openEditDialog: function(oContext, bReadOnly) {
      const oModel = this.getView().getModel("admin");
      const sSelect = [
        "ID","objectCode","displayName","description","iconName","isActive",
        "complexity","avgAnalysisTime","questionCount","createdAt","createdBy","modifiedAt","modifiedBy"
      ].join(",");
      const oCtxBinding = oModel.bindContext(oContext.getPath(), null, { $select: sSelect });
      let vData = oCtxBinding.requestObject ? oCtxBinding.requestObject() : oContext.getObject();

      const openDialog = (d) => {
        const oData = d && typeof d === 'object' ? d : (oContext.getObject() || {});
        const oEditModel = new JSONModel(Object.assign({}, oData, {
          editable: !bReadOnly,
          dialogTitle: bReadOnly ? "View Object Type" : "Edit Object Type"
        }));
        this._oEditContext = oContext;
        if (!this._oEditDialog) {
          Fragment.load({
            id: this.getView().getId(),
            name: "sd.solutionadvisor.view.fragments.EditObjectTypeDialog",
            controller: this
          }).then((oDialog) => {
            this._oEditDialog = oDialog;
            this.getView().addDependent(oDialog);
            oDialog.setModel(oEditModel, "editModel");
            oDialog.open();
          });
        } else {
          this._oEditDialog.setModel(oEditModel, "editModel");
          this._oEditDialog.open();
        }
      };

      if (vData && typeof vData.then === 'function') {
        vData.then(openDialog).catch(() => openDialog(oContext.getObject()));
      } else {
        openDialog(vData);
      }
    },

    onEditConfirm: function() {
      const oModel = this.getView().getModel("admin");
      const oDialog = this._oEditDialog;
      const oEditModel = oDialog && oDialog.getModel("editModel");
      if (!oEditModel) {
        MessageBox.error("Edit model not found");
        return;
      }
      const d = oEditModel.getData();
      const oContext = this._oEditContext;
      if (!oContext) {
        MessageBox.error("No record selected");
        return;
      }
      if (!d.displayName || !d.description) {
        MessageBox.error("Please fill in required fields (Display Name, Description)");
        return;
      }
      ["displayName","description","iconName","isActive"].forEach((f)=>{
        if (Object.prototype.hasOwnProperty.call(d,f)) {
          oContext.setProperty(f, d[f]);
        }
      });
      oModel.submitBatch("$auto").then(() => {
        MessageToast.show("Saved successfully");
        if (this._oEditDialog) this._oEditDialog.close();
        setTimeout(() => this._loadData(), 300);
      }).catch((e) => {
        Log.error("Save failed", e);
        MessageBox.error("Failed to save changes");
      });
    },

    onEditCancel: function() {
      if (this._oEditDialog) this._oEditDialog.close();
      this._oEditContext = null;
    },

    onDelete: function() {
      MessageBox.warning("Delete is disabled for Object Types as they are system-critical master data.");
    },

    onExport: function() {
      MessageToast.show("Export to Excel - to be implemented");
    },

    onSearch: function(oEvent) {
      const sQuery = oEvent.getParameter("query");
      const oTable = this.byId("objectTypesTable");
      const oBinding = oTable.getBinding("items");
      
      if (sQuery) {
        const aFilters = [
          new Filter({
            filters: [
              new Filter("objectCode", FilterOperator.Contains, sQuery),
              new Filter("displayName", FilterOperator.Contains, sQuery),
              new Filter("description", FilterOperator.Contains, sQuery)
            ],
            and: false
          })
        ];
        oBinding.filter(aFilters);
      } else {
        oBinding.filter([]);
      }
    }
  });
});
