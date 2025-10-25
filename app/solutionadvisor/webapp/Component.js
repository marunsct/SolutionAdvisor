sap.ui.define([
    "sap/ui/core/UIComponent",
    "sd/solutionadvisor/model/models",
    "sd/solutionadvisor/localService/MockService",
    "sd/solutionadvisor/services/NotificationService",
    "sd/solutionadvisor/services/SearchService",
    "sd/solutionadvisor/services/ThemeService"
], (UIComponent, models, MockService, NotificationService, SearchService, ThemeService) => {
    "use strict";

    return UIComponent.extend("sd.solutionadvisor.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
            
            // apply content density mode (responsive design)
            this.getContentDensityClass = function () {
                if (!this._sContentDensityClass) {
                    if (!sap.ui.Device.support.touch) {
                        // Desktop: use compact mode
                        this._sContentDensityClass = "sapUiSizeCompact";
                    } else {
                        // Mobile/Tablet: use cozy mode for larger touch targets
                        this._sContentDensityClass = "sapUiSizeCozy";
                    }
                }
                return this._sContentDensityClass;
            };

            // enable routing
            this.getRouter().initialize();
            
            // Initialize mock services for local development and testing
            // We check URL parameter or local storage to determine if mock mode is active
            this._initMockServices();
            
            // Initialize shell services (notifications, search, theme)
            this._initShellServices();
        },
        
        /**
         * Initialize mock services if needed
         * @private
         */
        _initMockServices() {
            // Check URL parameter 'mock=true' or local storage setting
            const bUseMock = this._isMockModeActive();
            
            if (bUseMock) {
                // Initialize mock services
                MockService.init(this);
                MockService.initMockData(true);
                
                if (sap.base && sap.base.Log) {
                    sap.base.Log.info("Component: Mock mode active - using mock services");
                }
            }
        },
        
        /**
         * Check if mock mode is active
         * @returns {boolean} True if mock mode is active
         * @private
         */
        _isMockModeActive() {
            // Check URL parameter
            const oURLParams = new URLSearchParams(window.location.search);
            if (oURLParams.has("mock")) {
                const sMockValue = oURLParams.get("mock");
                return sMockValue === "true" || sMockValue === "1";
            }
            
            // Check local storage
            try {
                const sMockMode = window.localStorage.getItem("sd.solutionadvisor.mockMode");
                return sMockMode === "true";
            } catch (error) {
                // If local storage access fails, return false
                if (sap.base && sap.base.Log) {
                    sap.base.Log.debug("Component: Failed to access localStorage: " + error.message);
                }
                return false;
            }
        },
        
        /**
         * Initialize shell services (notifications, search, theme)
         * @private
         */
        _initShellServices() {
            // Initialize notification service
            this._oNotificationService = new NotificationService(this);
            this.setModel(this._oNotificationService.getModel(), "notifications");
            
            // Initialize search service
            this._oSearchService = new SearchService(this);
            this.setModel(this._oSearchService.getModel(), "search");
            
            // Initialize theme service
            this._oThemeService = new ThemeService(this);
            this.setModel(this._oThemeService.getModel(), "theme");
            
            if (sap.base && sap.base.Log) {
                sap.base.Log.info("Component: Shell services initialized (notifications, search, theme)");
            }
        },
        
        /**
         * Get notification service instance
         * @returns {sd.solutionadvisor.services.NotificationService} Notification service
         * @public
         */
        getNotificationService() {
            return this._oNotificationService;
        },
        
        /**
         * Get search service instance
         * @returns {sd.solutionadvisor.services.SearchService} Search service
         * @public
         */
        getSearchService() {
            return this._oSearchService;
        },
        
        /**
         * Get theme service instance
         * @returns {sd.solutionadvisor.services.ThemeService} Theme service
         * @public
         */
        getThemeService() {
            return this._oThemeService;
        }
    });
});