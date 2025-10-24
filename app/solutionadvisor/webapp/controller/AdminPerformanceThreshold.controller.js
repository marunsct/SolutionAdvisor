sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) => {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.AdminPerformanceThreshold", {
    
    onInit: function() {
      const oViewModel = new JSONModel({
        recordCount: 0,
        selectedCount: 0,
        busy: false
      });
      this.getView().setModel(oViewModel, "viewModel");
      this._loadData();
    },

    _loadData: function() {
      const oModel = this.getView().getModel();
      const oViewModel = this.getView().getModel("viewModel");
      
      oViewModel.setProperty("/busy", true);
      
      const oBinding = oModel.bindList("/PerformanceThreshold");
      oBinding.requestContexts().then((aContexts) => {
        const iCount = aContexts.length;
        oViewModel.setProperty("/recordCount", iCount);
        oViewModel.setProperty("/busy", false);
        MessageToast.show(`Loaded ${iCount} threshold records`);
      }).catch(() => {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to load threshold data");
      });
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("Admin");
    },

    onCreate: function() {
      MessageBox.information("Create threshold dialog - to be implemented");
    },

    onEdit: function(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oContext = oItem.getBindingContext();
      const oData = oContext.getObject();
      MessageBox.information(`Edit threshold: ${oData.name}`);
    },

    onDelete: function(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oContext = oItem.getBindingContext();
      const oData = oContext.getObject();
      
      MessageBox.confirm(`Delete threshold "${oData.name}"?`, {
        onClose: (sAction) => {
          if (sAction === MessageBox.Action.OK) {
            oContext.delete().then(() => {
              MessageToast.show("Threshold deleted");
              this._loadData();
            }).catch(() => {
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
