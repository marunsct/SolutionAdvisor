sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/FilterType",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/core/format/DateFormat"
], (Controller, JSONModel, Filter, FilterOperator, FilterType, MessageToast, MessageBox, Fragment, DateFormat) => {
  "use strict";

  /* global XLSX, FileReader */
  /* eslint-disable no-console */

  return Controller.extend("sd.solutionadvisor.controller.AdminQuestionFlow", {
    
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
      } catch (_e) {
        // Intentionally ignore exception - return dash for any formatting errors
        return "-";
      }
    },
    
    /**
     * Controller initialization
     * Loads question flow data and sets up file upload handlers
     */
    onInit: function() {
      // Initialize view model
      const oViewModel = new JSONModel({
        recordCount: 0,
        selectedCount: 0,
        busy: false,
        filtersExpanded: true,
        filters: {
          objectType: "",
          isActive: ""
        }
      });
      this.getView().setModel(oViewModel, "viewModel");
      
      // Attach to route matched to ensure model is ready
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("AdminQuestionFlow").attachPatternMatched(this._onRouteMatched, this);
    },
    
    /**
     * Route matched handler - loads data when page is displayed
     * @private
     */
    _onRouteMatched: function() {
      // Show loading indicator
      const oViewModel = this.getView().getModel("viewModel");
      oViewModel.setProperty("/busy", true);
      
      // Clear any existing filters to ensure fresh view
      const oTable = this.byId("questionFlowTable");
      if (oTable) {
        const oBinding = oTable.getBinding("items");
        if (oBinding) {
          oBinding.filter([], FilterType.Application);
        }
      }
      
      // Load data on route match (model should be ready by now)
      this._loadData();
    },

    /**
     * Load question flow data from backend
     * @private
     */
    _loadData: function() {
      const oModel = this.getView().getModel("admin");
      const oViewModel = this.getView().getModel("viewModel");
      const oTable = this.byId("questionFlowTable");
      
      if (!oModel) {
        console.error("Admin model not available");
        MessageBox.error("Admin service not available. Please refresh the page.");
        return;
      }
      
      if (!oTable) {
        console.error("Table not found");
        return;
      }
      
      // Get the existing table binding
      const oBinding = oTable.getBinding("items");
      
      if (!oBinding) {
        console.error("Table binding not available");
        return;
      }
      
      // Check if the binding or model has pending changes before refreshing
      if (oModel.hasPendingChanges() || oBinding.hasPendingChanges()) {
        this._loadRetryCount = (this._loadRetryCount || 0) + 1;
        if (this._loadRetryCount > 5) {
          console.warn("Max retries reached, forcing refresh");
          this._loadRetryCount = 0;
        } else {
          console.warn("Model or binding has pending changes, waiting for them to clear...");
          setTimeout(() => {
            this._loadData();
          }, 200);
          return;
        }
      } else {
        this._loadRetryCount = 0;
      }
      
      // Set up event handler to update count when data is received
      const fnUpdateCount = () => {
        // Use getCount() to get the total count from $count parameter (not just loaded contexts)
        // For OData V4, getLength() returns total count when $count=true is set
        const iCount = oBinding.getCount ? oBinding.getCount() : oBinding.getLength();
        oViewModel.setProperty("/recordCount", iCount);
        oViewModel.setProperty("/busy", false); // Hide loading indicator
        if (iCount > 0) {
          MessageToast.show(`Loaded ${iCount} question flow records`);
        }
        oBinding.detachChange(fnUpdateCount);
      };
      
      oBinding.attachChange(fnUpdateCount);
      
      // Refresh the binding - this will trigger the change event
      oBinding.refresh();
    },
    
    /**
     * Handle selection change in table
     * @param {sap.ui.base.Event} oEvent - Selection change event
     */
    onSelectionChange: function(oEvent) {
      const oViewModel = this.getView().getModel("viewModel");
      const oTable = oEvent.getSource();
      const aSelectedItems = oTable.getSelectedItems();
      oViewModel.setProperty("/selectedCount", aSelectedItems.length);
    },
    
    /**
     * Handle filter change
     */
    onFilterChange: function() {
      // Filters will be applied when user clicks "Apply Filters" button
    },
    
    /**
     * Apply filters to the table
     */
    onApplyFilters: function() {
      const oViewModel = this.getView().getModel("viewModel");
      const oFilters = oViewModel.getProperty("/filters");
      const oTable = this.byId("questionFlowTable");
      const oBinding = oTable.getBinding("items");
      
      const aFilters = [];
      
      // Object Type filter
      if (oFilters.objectType) {
        aFilters.push(new Filter("objectType", FilterOperator.EQ, oFilters.objectType));
      }
      
      // Active status filter
      if (oFilters.isActive !== "") {
        const bActive = oFilters.isActive === "true";
        aFilters.push(new Filter("isActive", FilterOperator.EQ, bActive));
      }
      
      oBinding.filter(aFilters, FilterType.Application);
      
      // Update count after filtering - use getCount() for total count
      setTimeout(() => {
        const iCount = oBinding.getCount ? oBinding.getCount() : oBinding.getLength();
        oViewModel.setProperty("/recordCount", iCount);
      }, 100);
      
      MessageToast.show("Filters applied");
    },
    
    /**
     * Clear all filters
     */
    onClearFilters: function() {
      const oViewModel = this.getView().getModel("viewModel");
      oViewModel.setProperty("/filters", { objectType: "", isActive: "" });
      
      const oTable = this.byId("questionFlowTable");
      const oBinding = oTable.getBinding("items");
      oBinding.filter([], FilterType.Application);
      
      // Update count - use getCount() for total count
      setTimeout(() => {
        const iCount = oBinding.getCount ? oBinding.getCount() : oBinding.getLength();
        oViewModel.setProperty("/recordCount", iCount);
      }, 100);
      
      // Clear search field
      const oSearchField = this.byId("qfSearchField");
      if (oSearchField) {
        oSearchField.setValue("");
      }
      
      MessageToast.show("Filters cleared");
    },
    
    /**
     * Refresh data
     */
    onRefresh: function() {
      this._loadData();
    },

    /**
     * Navigate back to admin panel
     */
    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("Admin");
    },

    /**
     * Open create dialog for new question flow
     */
    onCreate: function() {
      if (!this._oCreateDialog) {
        // Initialize create model
        const oCreateModel = new JSONModel({
          questionId: "",
          objectType: "I",
          questionText: "",
          questionHint: "",
          answerCount: 0,
          answerOptions: "",
          navigationRules: "",
          isActive: true
        });
        this.getView().setModel(oCreateModel, "createModel");
        
        Fragment.load({
          id: this.getView().getId(),
          name: "sd.solutionadvisor.view.fragments.CreateQuestionFlowDialog",
          controller: this
        }).then((oDialog) => {
          this._oCreateDialog = oDialog;
          this.getView().addDependent(oDialog);
          oDialog.open();
        });
      } else {
        // Reset model
        this.getView().getModel("createModel").setData({
          questionId: "",
          objectType: "I",
          questionText: "",
          questionHint: "",
          answerCount: 0,
          answerOptions: "",
          navigationRules: "",
          isActive: true
        });
        this._oCreateDialog.open();
      }
    },

    /**
     * Handle create dialog confirm
     */
    onCreateConfirm: function() {
      const oModel = this.getView().getModel("admin");
      const oCreateModel = this.getView().getModel("createModel");
      const oData = oCreateModel.getData();
      
      // Validate required fields
      if (!oData.questionId || !oData.questionText) {
        MessageBox.error("Please fill in all required fields");
        return;
      }
      
      // Validate JSON fields if provided (keep as strings to match Edm.String)
      try {
        if (oData.answerOptions) { JSON.parse(oData.answerOptions); }
        if (oData.navigationRules) { JSON.parse(oData.navigationRules); }
      } catch {
        MessageBox.error("Invalid JSON format in Answer Options or Navigation Rules");
        return;
      }

      // Coerce primitive types
      if (oData.answerCount !== undefined) {
        const n = parseInt(oData.answerCount, 10);
        if (Number.isNaN(n)) {
          MessageBox.error("Answer Count must be a number");
          return;
        }
        oData.answerCount = n;
      }
      if (typeof oData.isActive === 'string') {
        oData.isActive = oData.isActive === 'true';
      }
      
      // Create new record using OData V4
      const oListBinding = oModel.bindList("/QuestionFlow");
      const oContext = oListBinding.create(oData);
      
      oContext.created().then(() => {
        MessageToast.show("Question flow created successfully");
        this._oCreateDialog.close();
        
        // After successful creation, context is created - no need to reset changes
        setTimeout(() => {
          this._loadData();
        }, 100);
      }).catch((error) => {
        console.error("Error creating question flow:", error);
        MessageBox.error("Failed to create question flow: " + error.message);
      });
    },
    
    /**
     * Handle create dialog cancel
     */
    onCreateCancel: function() {
      this._oCreateDialog.close();
    },

    /**
     * Handle edit button press
     * @param {sap.ui.base.Event} oEvent - Button press event
     */
    onEdit: function(oEvent) {
      const oItem = oEvent.getSource().getParent();
      const oContext = oItem.getBindingContext("admin");
      
      // Open edit dialog with selected item
      this._openEditDialog(oContext);
    },

    /**
     * Open Edit Dialog with the selected context
     * @param {sap.ui.model.Context} oContext
     * @private
     */
    _openEditDialog: function(oContext) {
      const oModel = this.getView().getModel("admin");
      // Explicitly request ALL properties needed for editing to avoid auto $select omissions
      const sSelect = [
        "ID","questionId","objectType","questionText","questionHint","detailedHint",
        "answerCount","answerOptions","navigationRules","performanceContext","displayOrder",
        "isActive","createdAt","createdBy","modifiedAt","modifiedBy"
      ].join(",");

      // Bind a context with a full $select to guarantee complete data
      const oCtxBinding = oModel.bindContext(oContext.getPath(), null, { $select: sSelect });

      let oData = oContext.getObject();
      try {
        const oFull = oCtxBinding ? (oCtxBinding.getBoundContext() ? oCtxBinding.getBoundContext().getObject() : null) : null;
        if (!oFull || Object.keys(oFull || {}).length < 2) {
          // Fallback: request object to ensure data is loaded
          oData = oCtxBinding.requestObject ? oCtxBinding.requestObject() : oData;
        } else {
          oData = oFull;
        }
      } catch (e) {
        // As a safe fallback keep existing lightweight object
        void e;
      }
      // If requestObject returned a Promise, await it via then
      const _open = (fullData) => {
        const data = fullData && typeof fullData === 'object' ? fullData : (oData || {});

        // Stringify JSON fields for editing
        if (data.answerOptions && typeof data.answerOptions !== "string") {
          try { data.answerOptions = JSON.stringify(data.answerOptions, null, 2); } catch (e) { void e; }
        }
        if (data.navigationRules && typeof data.navigationRules !== "string") {
          try { data.navigationRules = JSON.stringify(data.navigationRules, null, 2); } catch (e) { void e; }
        }

        this._oEditContext = oContext;

        if (!this._oEditDialog) {
          Fragment.load({
            id: this.getView().getId(),
            name: "sd.solutionadvisor.view.fragments.EditQuestionFlowDialog",
            controller: this
          }).then((oDialog) => {
            this._oEditDialog = oDialog;
            // Create and set the model BEFORE adding as dependent to avoid premature OData bindings
            const oEditModel = new JSONModel(data);
            oDialog.setModel(oEditModel, "editModel");
            // Do not set a default unnamed model here; keep only the named JSON model to avoid unintended bindings

            this.getView().addDependent(oDialog);
            oDialog.open();
          });
        } else {
          // Update existing model
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
        // requestObject returned a Promise
        oData.then(_open).catch(() => _open(oContext.getObject()));
      } else {
        _open(oData);
      }
    },

    /** Save changes from edit dialog */
    onEditConfirm: function() {
      const oModel = this.getView().getModel("admin");
      const oEditModel = this._oEditDialog && this._oEditDialog.getModel("editModel");
      if (!oEditModel) { MessageBox.error("Edit model not found"); return; }
      const oData = oEditModel.getData();
      const oCtx = this._oEditContext;

      if (!oCtx) { MessageBox.error("No record selected"); return; }

      // Validate
      if (!oData.questionId || !oData.questionText) {
        MessageBox.error("Please fill in all required fields");
        return;
      }

      // Validate JSON fields but keep them as strings (backend expects Edm.String)
      try {
        if (typeof oData.answerOptions === "string" && oData.answerOptions.trim()) {
          JSON.parse(oData.answerOptions);
        }
        if (typeof oData.navigationRules === "string" && oData.navigationRules.trim()) {
          JSON.parse(oData.navigationRules);
        }
      } catch (e) {
        void e;
        MessageBox.error("Invalid JSON format in Answer Options or Navigation Rules");
        return;
      }

      // Coerce primitive types
      if (Object.prototype.hasOwnProperty.call(oData, 'answerCount')) {
        const n = parseInt(oData.answerCount, 10);
        if (Number.isNaN(n)) {
          MessageBox.error("Answer Count must be a number");
          return;
        }
        oData.answerCount = n;
      }
      if (Object.prototype.hasOwnProperty.call(oData, 'isActive') && typeof oData.isActive === 'string') {
        oData.isActive = oData.isActive === 'true';
      }

      // Update fields via context
      const fields = [
        "objectType","questionText","questionHint","detailedHint",
        "answerCount","answerOptions","navigationRules","isActive"
      ];
      fields.forEach((f) => {
        if (Object.prototype.hasOwnProperty.call(oData, f)) {
          oCtx.setProperty(f, oData[f]);
        }
      });

      oModel.submitBatch("$auto").then(() => {
        MessageToast.show("Saved successfully");
        if (this._oEditDialog) { this._oEditDialog.close(); }
        
        // After successful submit, changes are already committed
        // No need to reset changes, just refresh the data
        // Wait a bit longer to ensure model state is fully settled
        setTimeout(() => {
          this._loadData();
        }, 300);
      }).catch((error) => {
        // On error, reset only the specific context's changes, not all pending changes
        if (oModel.hasPendingChanges()) {
          try {
            oModel.resetChanges([oCtx.getPath()]);
          } catch (e) {
            // Fallback to full reset if targeted reset fails
            oModel.resetChanges();
          }
        }
        console.error("Save failed", error);
        MessageBox.error("Failed to save changes");
      });
    },

    onEditCancel: function() {
      if (this._oEditDialog) { this._oEditDialog.close(); }
      this._oEditContext = null;
    },

    /**
     * Handle delete button press
     * @param {sap.ui.base.Event} oEvent - Button press event
     */
    onDelete: function(oEvent) {
      const oItem = oEvent.getSource().getParent();
      const oContext = oItem.getBindingContext("admin");
      const oData = oContext.getObject();
      
      MessageBox.warning(
        `Are you sure you want to delete question "${oData.questionText}"?`,
        {
          title: "Delete Confirmation",
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.DELETE,
          onClose: (sAction) => {
            if (sAction === MessageBox.Action.DELETE) {
              this._deleteRecord(oContext);
            }
          }
        }
      );
    },

    /**
     * Delete a record
     * @param {sap.ui.model.Context} oContext - Record context
     * @private
     */
    _deleteRecord: function(oContext) {
      oContext.delete().then(() => {
        MessageToast.show("Question flow deleted successfully");
        
        // After successful deletion, context is removed - no need to reset changes
        setTimeout(() => {
          this._loadData();
        }, 100);
      }).catch((error) => {
        console.error("Error deleting question flow:", error);
        MessageBox.error("Failed to delete question flow");
      });
    },

    /**
     * Handle download template button press
     * Downloads a CSV/Excel template for mass upload
     */
    onDownloadTemplate: function() {
      // Check if XLSX library is available
      if (typeof XLSX === 'undefined') {
        MessageBox.error("Excel library not loaded");
        return;
      }

      try {
        // Create template with headers and sample data
        const templateData = [
          {
            questionId: "Q-INT-001",
            objectType: "I",
            questionText: "What is the data volume?",
            questionHint: "",
            detailedHint: "Consider the peak volume, not average",
            answerCount: 3,
            answerOptions: JSON.stringify([
              { key: "LOW", text: "< 1000 records/day" },
              { key: "MEDIUM", text: "1000-10000 records/day" },
              { key: "HIGH", text: "> 10000 records/day" }
            ]),
            navigationRules: JSON.stringify({
              "LOW": { nextQuestion: "Q-INT-002", finalAnswer: null },
              "MEDIUM": { nextQuestion: "Q-INT-003", finalAnswer: null },
              "HIGH": { nextQuestion: null, finalAnswer: "Level B" }
            }),
            isActive: true
          }
        ];

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "QuestionFlow");
        
        // Download file
        XLSX.writeFile(wb, "QuestionFlow_Template.xlsx");
        
        MessageToast.show("Template downloaded successfully");
      } catch (error) {
        console.error("Error generating template:", error);
        MessageBox.error("Failed to generate template");
      }
    },

    /**
     * Handle mass upload file selection
     * @param {sap.ui.base.Event} oEvent - File upload event
     */
    onMassUpload: function(oEvent) {
      const oFileUploader = oEvent.getSource();
      const file = oFileUploader.getFocusDomRef().files[0];
      
      if (!file) {
        MessageBox.error("Please select a file to upload");
        return;
      }

      // Check if XLSX library is available
      if (typeof XLSX === 'undefined') {
        MessageBox.error("Excel library not loaded");
        return;
      }

  const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          // Process and validate data
          this._processMassUpload(jsonData);
          
          // Clear file uploader
          oFileUploader.clear();
        } catch (error) {
          console.error("Error reading file:", error);
          MessageBox.error("Failed to read file. Please ensure it's a valid Excel file.");
        }
      };
      
      reader.readAsArrayBuffer(file);
    },

    /**
     * Process mass upload data
     * @param {Array} aData - Array of records from Excel
     * @private
     */
    _processMassUpload: function(aData) {
      const oModel = this.getView().getModel("admin");
  const oListBinding = oModel.bindList("/QuestionFlow");
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Validate and create records
      aData.forEach((record, index) => {
        try {
          // Validate required fields
          if (!record.questionId || !record.questionText) {
            throw new Error(`Row ${index + 2}: questionId and questionText are required`);
          }
          
          // Validate JSON fields - parse to validate, but keep as strings (Edm.String)
          if (typeof record.answerOptions === 'string') {
            JSON.parse(record.answerOptions); // validate only
          } else if (record.answerOptions && typeof record.answerOptions === 'object') {
            record.answerOptions = JSON.stringify(record.answerOptions);
          }
          if (typeof record.navigationRules === 'string') {
            JSON.parse(record.navigationRules); // validate only
          } else if (record.navigationRules && typeof record.navigationRules === 'object') {
            record.navigationRules = JSON.stringify(record.navigationRules);
          }
          
          // Create record
          const oContext = oListBinding.create(record);
          oContext.created().then(() => {
            successCount++;
            if (successCount + errorCount === aData.length) {
              this._showUploadSummary(successCount, errorCount, errors);
            }
          }).catch((error) => {
            errorCount++;
            errors.push(`Row ${index + 2}: ${error.message}`);
            if (successCount + errorCount === aData.length) {
              this._showUploadSummary(successCount, errorCount, errors);
            }
          });
          
        } catch (error) {
          errorCount++;
          errors.push(error.message);
        }
      });
      
      // If all errors were validation errors (no async creates), show summary now
      if (errorCount === aData.length) {
        this._showUploadSummary(0, errorCount, errors);
      }
    },

    /**
     * Show upload summary dialog
     * @param {number} successCount - Number of successful uploads
     * @param {number} errorCount - Number of failed uploads
     * @param {Array} errors - Array of error messages
     * @private
     */
    _showUploadSummary: function(successCount, errorCount, errors) {
      this._loadData(); // Refresh table
      
      let message = `Upload completed:\n\n`;
      message += `✓ Successful: ${successCount}\n`;
      message += `✗ Failed: ${errorCount}\n`;
      
      if (errors.length > 0) {
        message += `\nErrors:\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) {
          message += `\n... and ${errors.length - 5} more errors`;
        }
      }
      
      if (errorCount > 0) {
        MessageBox.warning(message, { title: "Upload Summary" });
      } else {
        MessageBox.success(message, { title: "Upload Summary" });
      }
    },

    /**
     * Handle export to Excel
     * Exports all current records to Excel file
     */
    onExport: function() {
      const oModel = this.getView().getModel("admin");
      
      // Check if XLSX library is available
      if (typeof XLSX === 'undefined') {
        MessageBox.error("Excel library not loaded");
        return;
      }

      const oBinding = oModel.bindList("/QuestionFlow");
      // Request all contexts with a large but finite limit
      oBinding.requestContexts(0, 10000).then((aContexts) => {
        const aData = aContexts.map(ctx => ctx.getObject());
        
        // Convert JSON fields to strings for Excel
        const exportData = aData.map(item => ({
          ...item,
          answerOptions: typeof item.answerOptions === 'object' ? JSON.stringify(item.answerOptions) : item.answerOptions,
          navigationRules: typeof item.navigationRules === 'object' ? JSON.stringify(item.navigationRules) : item.navigationRules
        }));
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        XLSX.utils.book_append_sheet(wb, ws, "QuestionFlow");
        
        // Download
        const currentDate = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `QuestionFlow_Export_${currentDate}.xlsx`);
        
        MessageToast.show(`Exported ${aData.length} records`);
      }).catch((error) => {
        console.error("Error exporting data:", error);
        MessageBox.error("Failed to export data");
      });
    },

    /**
     * Handle search/filter
     * @param {sap.ui.base.Event} oEvent - Search field event
     */
    onSearch: function(oEvent) {
      const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
      const oTable = this.byId("questionFlowTable");
      const oBinding = oTable.getBinding("items");
      const oViewModel = this.getView().getModel("viewModel");
      const oFilters = oViewModel.getProperty("/filters");
      
      const aFilters = [];
      
      // Add search filter
      if (sQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("questionId", FilterOperator.Contains, sQuery),
            new Filter("questionText", FilterOperator.Contains, sQuery),
            new Filter("detailedHint", FilterOperator.Contains, sQuery)
          ],
          and: false
        }));
      }
      
      // Add other filters
      if (oFilters.objectType) {
        aFilters.push(new Filter("objectType", FilterOperator.EQ, oFilters.objectType));
      }
      
      if (oFilters.isActive !== "") {
        const bActive = oFilters.isActive === "true";
        aFilters.push(new Filter("isActive", FilterOperator.EQ, bActive));
      }
      
      // Apply all filters
      oBinding.filter(aFilters);
      
      // Update count
      setTimeout(() => {
        const iCount = oBinding.getLength();
        oViewModel.setProperty("/recordCount", iCount);
      }, 100);
    }
  });
});
