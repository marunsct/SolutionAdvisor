sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) => {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.AdminObjectTypes", {
    
    onInit: function() {
      const oViewModel = new JSONModel({
        recordCount: 0,
        busy: false
      });
      this.getView().setModel(oViewModel, "viewModel");
      this._loadData();
    },

    _loadData: function() {
      const oModel = this.getView().getModel();
      const oViewModel = this.getView().getModel("viewModel");
      
      oViewModel.setProperty("/busy", true);
      
      const oBinding = oModel.bindList("/ObjectTypes");
      oBinding.requestContexts().then((aContexts) => {
        const iCount = aContexts.length;
        oViewModel.setProperty("/recordCount", iCount);
        oViewModel.setProperty("/busy", false);
        MessageToast.show(`Loaded ${iCount} object type records`);
      }).catch(() => {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to load object type data");
      });
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("Admin");
    },

    onCreate: function() {
      MessageBox.information("Create object type dialog - to be implemented");
    },

    onEdit: function(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oContext = oItem.getBindingContext();
      const oData = oContext.getObject();
      MessageBox.information(`Edit object type: ${oData.typeName}\n\nThis will open a dialog to modify type details and icon.`);
    },

    onDelete: function(oEvent) {
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
              new Filter("typeCode", FilterOperator.Contains, sQuery),
              new Filter("typeName", FilterOperator.Contains, sQuery),
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
