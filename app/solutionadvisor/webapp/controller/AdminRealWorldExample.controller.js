sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/base/Log"
  ],
  (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Log) => {
    "use strict";

    return Controller.extend(
      "sd.solutionadvisor.controller.AdminRealWorldExample",
      {
        onInit: function () {
          const oViewModel = new JSONModel({
            recordCount: 0,
            selectedCount: 0,
            busy: false,
          });
          this.getView().setModel(oViewModel, "viewModel");
          
          // Attach to route matched to ensure model is ready
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.getRoute("AdminRealWorldExample").attachPatternMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function() {
          this._loadData();
        },

        _loadData: function () {
          const oModel = this.getView().getModel("admin");
          const oViewModel = this.getView().getModel("viewModel");

          if (!oModel) {
            Log.error("Admin model not available");
            return;
          }

          oViewModel.setProperty("/busy", true);

          const oBinding = oModel.bindList("/RealWorldExample");
          oBinding
            .requestContexts()
            .then((aContexts) => {
              const iCount = aContexts.length;
              oViewModel.setProperty("/recordCount", iCount);
              oViewModel.setProperty("/busy", false);
              MessageToast.show(`Loaded ${iCount} example records`);
            })
            .catch(() => {
              oViewModel.setProperty("/busy", false);
              MessageBox.error("Failed to load example data");
            });
        },

        onNavBack: function () {
          this.getOwnerComponent().getRouter().navTo("Admin");
        },

        onCreate: function () {
          MessageBox.information("Create example dialog - to be implemented");
        },

        onEdit: function (oEvent) {
          const oItem = oEvent.getSource().getParent().getParent();
          const oContext = oItem.getBindingContext("admin");
          const oData = oContext.getObject();
          MessageBox.information(`Edit example: ${oData.exampleTitle}`);
        },

        onDelete: function (oEvent) {
          const oItem = oEvent.getSource().getParent().getParent();
          const oContext = oItem.getBindingContext("admin");
          const oData = oContext.getObject();

          MessageBox.confirm(`Delete example "${oData.exampleTitle}"?`, {
            onClose: (sAction) => {
              if (sAction === MessageBox.Action.OK) {
                oContext
                  .delete()
                  .then(() => {
                    MessageToast.show("Example deleted");
                    this._loadData();
                  })
                  .catch(() => {
                    MessageBox.error("Failed to delete example");
                  });
              }
            },
          });
        },

        onExport: function () {
          MessageToast.show("Export to Excel - to be implemented");
        },

        onMassUpload: function () {
          MessageToast.show("Mass upload from Excel - to be implemented");
        },

        onSearch: function (oEvent) {
          const sQuery = oEvent.getParameter("query");
          const oTable = this.byId("exampleTable");
          const oBinding = oTable.getBinding("items");

          if (sQuery) {
            const aFilters = [
              new Filter({
                filters: [
                  new Filter("exampleTitle", FilterOperator.Contains, sQuery),
                  new Filter("description", FilterOperator.Contains, sQuery),
                  new Filter("technologies", FilterOperator.Contains, sQuery),
                ],
                and: false,
              }),
            ];
            oBinding.filter(aFilters);
          } else {
            oBinding.filter([]);
          }
        },

        onFilterChange: function () {
          const oObjectTypeFilter = this.byId("objectTypeFilterExample");
          const oIndustryFilter = this.byId("industryFilterExample");
          const oLevelFilter = this.byId("levelFilterExample");
          const oTable = this.byId("exampleTable");
          const oBinding = oTable.getBinding("items");

          const aFilters = [];

          const sObjectType = oObjectTypeFilter.getSelectedKey();
          if (sObjectType) {
            aFilters.push(
              new Filter("objectType", FilterOperator.EQ, sObjectType)
            );
          }

          const sIndustry = oIndustryFilter.getSelectedKey();
          if (sIndustry) {
            aFilters.push(new Filter("industry", FilterOperator.EQ, sIndustry));
          }

          const sLevel = oLevelFilter.getSelectedKey();
          if (sLevel) {
            aFilters.push(
              new Filter("cleanCoreLevel", FilterOperator.EQ, sLevel)
            );
          }

          oBinding.filter(aFilters);
        },

        onClearFilters: function () {
          this.byId("objectTypeFilterExample").setSelectedKey("");
          this.byId("industryFilterExample").setSelectedKey("");
          this.byId("levelFilterExample").setSelectedKey("");
          this.onFilterChange();
        },
      }
    );
  }
);
