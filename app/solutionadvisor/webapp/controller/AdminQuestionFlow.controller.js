sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Fragment) => {
  "use strict";

  return Controller.extend("sd.solutionadvisor.controller.AdminQuestionFlow", {
    
    /**
     * Controller initialization
     * Loads question flow data and sets up file upload handlers
     */
    onInit: function() {
      // Initialize view model
      const oViewModel = new JSONModel({
        recordCount: 0,
        selectedCount: 0,
        busy: false
      });
      this.getView().setModel(oViewModel, "viewModel");
      
      // Load data
      this._loadData();
    },

    /**
     * Load question flow data from backend
     * @private
     */
    _loadData: function() {
      const oModel = this.getView().getModel();
      const oViewModel = this.getView().getModel("viewModel");
      
      oViewModel.setProperty("/busy", true);
      
      const oBinding = oModel.bindList("/QuestionFlow");
      oBinding.requestContexts().then((aContexts) => {
        const iCount = aContexts.length;
        oViewModel.setProperty("/recordCount", iCount);
        oViewModel.setProperty("/busy", false);
        
        MessageToast.show(`Loaded ${iCount} question flow records`);
      }).catch((error) => {
        console.error("Error loading data:", error);
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to load question flow data");
      });
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
        this._oCreateDialog.open();
      }
    },

    /**
     * Handle create dialog confirm
     * @param {sap.ui.base.Event} oEvent - Dialog confirm event
     */
    onCreateConfirm: function(oEvent) {
      const oModel = this.getView().getModel();
      const oNewData = oEvent.getParameter("data");
      
      // Create new record using OData V4
      const oListBinding = oModel.bindList("/QuestionFlow");
      const oContext = oListBinding.create(oNewData);
      
      oContext.created().then(() => {
        MessageToast.show("Question flow created successfully");
        this._loadData();
      }).catch((error) => {
        console.error("Error creating question flow:", error);
        MessageBox.error("Failed to create question flow");
      });
    },

    /**
     * Handle edit button press
     * @param {sap.ui.base.Event} oEvent - Button press event
     */
    onEdit: function(oEvent) {
      const oItem = oEvent.getSource().getParent();
      const oContext = oItem.getBindingContext();
      
      // Open edit dialog with selected item
      this._openEditDialog(oContext);
    },

    /**
     * Handle delete button press
     * @param {sap.ui.base.Event} oEvent - Button press event
     */
    onDelete: function(oEvent) {
      const oItem = oEvent.getSource().getParent();
      const oContext = oItem.getBindingContext();
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
        this._loadData();
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
            questionKey: "Q-INT-001",
            objectType: "I",
            questionText: "What is the data volume?",
            questionCategory: "Volume",
            answerType: "SingleChoice",
            answers: JSON.stringify([
              { key: "LOW", text: "< 1000 records/day" },
              { key: "MEDIUM", text: "1000-10000 records/day" },
              { key: "HIGH", text: "> 10000 records/day" }
            ]),
            navigationLogic: JSON.stringify({
              "LOW": { nextQuestion: "Q-INT-002", finalAnswer: null },
              "MEDIUM": { nextQuestion: "Q-INT-003", finalAnswer: null },
              "HIGH": { nextQuestion: null, finalAnswer: "Level B" }
            }),
            detailedHint: "Consider the peak volume, not average",
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
      const oModel = this.getView().getModel();
      const oListBinding = oModel.bindList("/QuestionFlow");
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Validate and create records
      aData.forEach((record, index) => {
        try {
          // Validate required fields
          if (!record.questionKey || !record.questionText) {
            throw new Error(`Row ${index + 2}: questionKey and questionText are required`);
          }
          
          // Parse JSON fields
          if (typeof record.answers === 'string') {
            record.answers = JSON.parse(record.answers);
          }
          if (typeof record.navigationLogic === 'string') {
            record.navigationLogic = JSON.parse(record.navigationLogic);
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
      const oModel = this.getView().getModel();
      
      // Check if XLSX library is available
      if (typeof XLSX === 'undefined') {
        MessageBox.error("Excel library not loaded");
        return;
      }

      const oBinding = oModel.bindList("/QuestionFlow");
      oBinding.requestContexts().then((aContexts) => {
        const aData = aContexts.map(ctx => ctx.getObject());
        
        // Convert JSON fields to strings for Excel
        const exportData = aData.map(item => ({
          ...item,
          answers: typeof item.answers === 'object' ? JSON.stringify(item.answers) : item.answers,
          navigationLogic: typeof item.navigationLogic === 'object' ? JSON.stringify(item.navigationLogic) : item.navigationLogic
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
      const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
      const oTable = this.byId("questionFlowTable");
      const oBinding = oTable.getBinding("items");
      
      const aFilters = [];
      if (sQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("questionKey", FilterOperator.Contains, sQuery),
            new Filter("questionText", FilterOperator.Contains, sQuery),
            new Filter("questionCategory", FilterOperator.Contains, sQuery)
          ],
          and: false
        }));
      }
      
      oBinding.filter(aFilters);
    }
  });
});
