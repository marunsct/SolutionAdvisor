sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel"
], function (BaseObject, JSONModel) {
    "use strict";

    /**
     * Theme Management Service - Manages application theming and appearance
     * Integrates with SAP UI5 theme system and shell personalization
     */
    return BaseObject.extend("sd.solutionadvisor.services.ThemeService", {
        
        /**
         * Constructor
         * @param {sap.ui.core.UIComponent} oComponent - Application component
         */
        constructor: function (oComponent) {
            this._oComponent = oComponent;
            this._oThemeModel = new JSONModel({
                currentTheme: "sap_fiori_3",
                availableThemes: [
                    {
                        id: "sap_fiori_3",
                        name: "SAP Fiori 3",
                        description: "Modern, clean interface with emphasis on content",
                        category: "Light"
                    },
                    {
                        id: "sap_fiori_3_dark",
                        name: "SAP Fiori 3 Dark",
                        description: "Dark theme for reduced eye strain in low-light conditions",
                        category: "Dark"
                    },
                    {
                        id: "sap_belize",
                        name: "SAP Belize",
                        description: "Previous generation Fiori theme",
                        category: "Light"
                    },
                    {
                        id: "sap_belize_plus",
                        name: "SAP Belize Plus",
                        description: "Enhanced Belize with additional features",
                        category: "Light"
                    },
                    {
                        id: "sap_hcb",
                        name: "High Contrast Black",
                        description: "High contrast theme for accessibility (black background)",
                        category: "High Contrast"
                    },
                    {
                        id: "sap_hcw",
                        name: "High Contrast White",
                        description: "High contrast theme for accessibility (white background)",
                        category: "High Contrast"
                    }
                ],
                contentDensity: "cozy", // "cozy" or "compact"
                customizations: {
                    enableAnimations: true,
                    enableShadows: true,
                    fontSize: "medium", // "small", "medium", "large"
                    colorScheme: "default" // "default", "blue", "green"
                }
            });
            
            this._oShellPersonalizationService = null;
            this._bInitialized = false;
            
            // Initialize services
            this._initialize();
        },

        /**
         * Initialize theme service
         */
        _initialize: function () {
            const that = this;
            
            // Detect current theme
            this._detectCurrentTheme();
            
            // Initialize shell personalization service
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("Personalization").then(function (oService) {
                    that._oShellPersonalizationService = oService;
                    that._bInitialized = true;
                    
                    // Load saved theme preferences
                    that._loadThemePreferences();
                }).catch(function (oError) {
                    console.warn("Personalization service not available:", oError);
                });
            }
        },

        /**
         * Get theme model
         * @returns {sap.ui.model.json.JSONModel} - Theme model
         */
        getModel: function () {
            return this._oThemeModel;
        },

        /**
         * Detect current theme
         */
        _detectCurrentTheme: function () {
            const sCurrentTheme = sap.ui.getCore().getConfiguration().getTheme();
            this._oThemeModel.setProperty("/currentTheme", sCurrentTheme);
        },

        /**
         * Load theme preferences from personalization
         */
        _loadThemePreferences: function () {
            if (!this._oShellPersonalizationService) {
                return;
            }
            
            const that = this;
            const oPersonalizer = this._oShellPersonalizationService.getPersonalizer({
                container: "sd.solutionadvisor.theme",
                item: "preferences"
            });
            
            oPersonalizer.getPersData().then(function (oPreferences) {
                if (oPreferences) {
                    if (oPreferences.contentDensity) {
                        that._oThemeModel.setProperty("/contentDensity", oPreferences.contentDensity);
                        that._applyContentDensity(oPreferences.contentDensity);
                    }
                    if (oPreferences.customizations) {
                        that._oThemeModel.setProperty("/customizations", oPreferences.customizations);
                    }
                }
            }).catch(function (oError) {
                console.error("Failed to load theme preferences:", oError);
            });
        },

        /**
         * Save theme preferences to personalization
         */
        _saveThemePreferences: function () {
            if (!this._oShellPersonalizationService) {
                return Promise.resolve();
            }
            
            const oPersonalizer = this._oShellPersonalizationService.getPersonalizer({
                container: "sd.solutionadvisor.theme",
                item: "preferences"
            });
            
            const oPreferences = {
                contentDensity: this._oThemeModel.getProperty("/contentDensity"),
                customizations: this._oThemeModel.getProperty("/customizations")
            };
            
            return oPersonalizer.setPersData(oPreferences);
        },

        /**
         * Change application theme
         * @param {string} sThemeId - Theme ID
         * @returns {Promise} - Promise resolving when theme changed
         */
        changeTheme: function (sThemeId) {
            const that = this;
            
            // Validate theme
            const aThemes = this._oThemeModel.getProperty("/availableThemes");
            const oTheme = aThemes.find(t => t.id === sThemeId);
            
            if (!oTheme) {
                return Promise.reject(new Error("Invalid theme ID: " + sThemeId));
            }
            
            return new Promise(function (resolve) {
                // Apply theme
                sap.ui.getCore().applyTheme(sThemeId);
                
                // Update model
                that._oThemeModel.setProperty("/currentTheme", sThemeId);
                
                // Wait for theme to load
                const fnThemeChanged = function () {
                    sap.ui.getCore().detachThemeChanged(fnThemeChanged);
                    sap.m.MessageToast.show("Theme changed to " + oTheme.name);
                    resolve();
                };
                
                sap.ui.getCore().attachThemeChanged(fnThemeChanged);
            });
        },

        /**
         * Get current theme
         * @returns {string} - Current theme ID
         */
        getCurrentTheme: function () {
            return this._oThemeModel.getProperty("/currentTheme");
        },

        /**
         * Get available themes
         * @returns {Array} - Available themes
         */
        getAvailableThemes: function () {
            return this._oThemeModel.getProperty("/availableThemes");
        },

        /**
         * Get themes by category
         * @param {string} sCategory - Category (Light, Dark, High Contrast)
         * @returns {Array} - Filtered themes
         */
        getThemesByCategory: function (sCategory) {
            const aThemes = this._oThemeModel.getProperty("/availableThemes");
            return aThemes.filter(t => t.category === sCategory);
        },

        /**
         * Toggle between light and dark theme
         */
        toggleDarkMode: function () {
            const sCurrentTheme = this.getCurrentTheme();
            
            if (sCurrentTheme === "sap_fiori_3") {
                return this.changeTheme("sap_fiori_3_dark");
            } else if (sCurrentTheme === "sap_fiori_3_dark") {
                return this.changeTheme("sap_fiori_3");
            } else {
                // Default to Fiori 3 Dark
                return this.changeTheme("sap_fiori_3_dark");
            }
        },

        /**
         * Check if dark mode is active
         * @returns {boolean} - True if dark theme
         */
        isDarkMode: function () {
            const sCurrentTheme = this.getCurrentTheme();
            return sCurrentTheme === "sap_fiori_3_dark" || sCurrentTheme.includes("_dark");
        },

        /**
         * Set content density
         * @param {string} sDensity - Density ("cozy" or "compact")
         * @returns {Promise} - Promise resolving when applied
         */
        setContentDensity: function (sDensity) {
            if (sDensity !== "cozy" && sDensity !== "compact") {
                return Promise.reject(new Error("Invalid density: " + sDensity));
            }
            
            this._oThemeModel.setProperty("/contentDensity", sDensity);
            this._applyContentDensity(sDensity);
            
            return this._saveThemePreferences();
        },

        /**
         * Apply content density to DOM
         * @param {string} sDensity - Density
         */
        _applyContentDensity: function (sDensity) {
            const oBody = document.body;
            
            if (sDensity === "compact") {
                oBody.classList.add("sapUiSizeCompact");
                oBody.classList.remove("sapUiSizeCozy");
            } else {
                oBody.classList.add("sapUiSizeCozy");
                oBody.classList.remove("sapUiSizeCompact");
            }
        },

        /**
         * Get content density
         * @returns {string} - Current density
         */
        getContentDensity: function () {
            return this._oThemeModel.getProperty("/contentDensity");
        },

        /**
         * Toggle content density
         */
        toggleContentDensity: function () {
            const sCurrent = this.getContentDensity();
            const sNew = sCurrent === "cozy" ? "compact" : "cozy";
            return this.setContentDensity(sNew);
        },

        /**
         * Enable/disable animations
         * @param {boolean} bEnable - Enable animations
         * @returns {Promise} - Promise resolving when saved
         */
        setAnimations: function (bEnable) {
            this._oThemeModel.setProperty("/customizations/enableAnimations", bEnable);
            
            // Apply CSS class
            if (bEnable) {
                document.body.classList.remove("solutionadvisor-no-animations");
            } else {
                document.body.classList.add("solutionadvisor-no-animations");
            }
            
            return this._saveThemePreferences();
        },

        /**
         * Set font size
         * @param {string} sSize - Size (small, medium, large)
         * @returns {Promise} - Promise resolving when saved
         */
        setFontSize: function (sSize) {
            const aValidSizes = ["small", "medium", "large"];
            if (!aValidSizes.includes(sSize)) {
                return Promise.reject(new Error("Invalid font size: " + sSize));
            }
            
            this._oThemeModel.setProperty("/customizations/fontSize", sSize);
            
            // Apply CSS class
            document.body.classList.remove("solutionadvisor-font-small", "solutionadvisor-font-medium", "solutionadvisor-font-large");
            document.body.classList.add("solutionadvisor-font-" + sSize);
            
            return this._saveThemePreferences();
        },

        /**
         * Reset theme to defaults
         * @returns {Promise} - Promise resolving when reset
         */
        resetToDefaults: function () {
            const that = this;
            
            return this.changeTheme("sap_fiori_3").then(function () {
                that._oThemeModel.setProperty("/contentDensity", "cozy");
                that._oThemeModel.setProperty("/customizations", {
                    enableAnimations: true,
                    enableShadows: true,
                    fontSize: "medium",
                    colorScheme: "default"
                });
                
                that._applyContentDensity("cozy");
                that.setAnimations(true);
                that.setFontSize("medium");
                
                return that._saveThemePreferences();
            });
        },

        /**
         * Get theme info
         * @param {string} sThemeId - Theme ID
         * @returns {object|null} - Theme info
         */
        getThemeInfo: function (sThemeId) {
            const aThemes = this._oThemeModel.getProperty("/availableThemes");
            return aThemes.find(t => t.id === sThemeId) || null;
        },

        /**
         * Check if high contrast theme is active
         * @returns {boolean} - True if high contrast
         */
        isHighContrast: function () {
            const sCurrentTheme = this.getCurrentTheme();
            return sCurrentTheme === "sap_hcb" || sCurrentTheme === "sap_hcw";
        },

        /**
         * Apply theme from user preferences
         * @param {object} oPreferences - User preferences
         */
        applyFromPreferences: function (oPreferences) {
            if (oPreferences.theme) {
                this.changeTheme(oPreferences.theme);
            }
            if (oPreferences.contentDensity) {
                this.setContentDensity(oPreferences.contentDensity);
            }
            if (oPreferences.fontSize) {
                this.setFontSize(oPreferences.fontSize);
            }
            if (oPreferences.enableAnimations !== undefined) {
                this.setAnimations(oPreferences.enableAnimations);
            }
        }
    });
}, true);
