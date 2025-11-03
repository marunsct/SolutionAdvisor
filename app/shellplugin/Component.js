sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/IconPool",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log"
], function (UIComponent, IconPool, MessageToast, MessageBox, JSONModel, Log) {
    "use strict";

    Log.info("Shell Plugin Component.js: Module loaded");

    /**
     * Shell Plugin Component for SAP Clean Core Solution Advisor
     * Provides shell-level customizations including:
     * - Custom header items (Quick Create, Help, Settings)
     * - Notification integration
     * - User menu enhancements
     * - Theme management
     * - Shell branding
     */
    return UIComponent.extend("sd.solutionadvisor.shellplugin.Component", {
        metadata: {
            manifest: "json"
        },

        /**
         * Initialize the shell plugin
         */
        init: function () {
            Log.info("Shell Plugin: init() called");
            // Call parent init - UIComponent handles manifest loading
            UIComponent.prototype.init.apply(this, arguments);

            Log.info("Shell Plugin: Parent init complete, starting plugin initialization");
            // Get the shell renderer
            this.oRenderer = sap.ushell.Container.getRenderer("fiori2");

            // Initialize plugin data model
            this._initPluginModel();

            // Add custom header items
            this._addHeaderItems();

            // Add custom user menu items
            this._addUserMenuItems();

            // Initialize notification service
            this._initNotificationService();

            // Apply custom branding
            this._applyBranding();

            // Subscribe to shell events
            this._subscribeToEvents();

            Log.info("Shell Plugin initialized successfully");

            // Register tiles programmatically to avoid catalog/loader mismatches in the sandbox
            // This ensures tiles appear in the Home group regardless of catalog JSON format.
            // Schedule tile registration asynchronously so init does not return a Promise
            // and to avoid interfering with renderer/component lifecycle.
            setTimeout(function () {
                try {
                    this._registerTiles();
                } catch (e) {
                    Log.warning("Failed to register tiles at init:", e);
                }
            }.bind(this), 0);
            
            // Explicitly return undefined to satisfy FLP lifecycle enforcement
            return undefined;
        },

        /**
         * Programmatically add tiles to the LaunchPage Home group
         * Uses the LaunchPage service to add StaticTile entries so the sandbox renders them.
         */
        _registerTiles: function () {
            Log.info("Shell Plugin: _registerTiles called");
            // Skip LaunchPage insertion - it throws adapter errors in this sandbox variant.
            // Instead, go directly to renderer fallback which uses standard UI5 controls.
            var aTiles = [
                {
                    tileType: "sap.ushell.ui.tile.StaticTile",
                    properties: {
                        title: "Start New Analysis",
                        subtitle: "Guided wizard for RICEFW analysis",
                        icon: "sap-icon://action",
                        info: "Quick Start",
                        targetURL: "#SolutionAdvisor-wizard"
                    }
                },
                {
                    tileType: "sap.ushell.ui.tile.StaticTile",
                    properties: {
                        title: "My Projects",
                        subtitle: "S/4HANA implementation projects",
                        icon: "sap-icon://folder",
                        info: "Manage",
                        targetURL: "#SolutionAdvisor-projects"
                    }
                },
                {
                    tileType: "sap.ushell.ui.tile.StaticTile",
                    properties: {
                        title: "Analytics Dashboard",
                        subtitle: "Clean core metrics and trends",
                        icon: "sap-icon://bar-chart",
                        info: "Dashboard",
                        targetURL: "#SolutionAdvisor-analytics"
                    }
                },
                {
                    tileType: "sap.ushell.ui.tile.StaticTile",
                    properties: {
                        title: "All Analyses",
                        subtitle: "RICEFW object analyses",
                        icon: "sap-icon://list",
                        info: "Browse",
                        targetURL: "#SolutionAdvisor-analyses"
                    }
                },
                {
                    tileType: "sap.ushell.ui.tile.StaticTile",
                    properties: {
                        title: "Administration",
                        subtitle: "Master data and configuration",
                        icon: "sap-icon://settings",
                        info: "Configure",
                        targetURL: "#SolutionAdvisor-admin"
                    }
                }
            ];

            // Create renderer fallback tiles immediately
            Log.info("Shell Plugin: Creating renderer fallback tiles, count:", aTiles.length);
            this._createRendererFallback(aTiles);
        },

        /**
         * Create a visual fallback by rendering a TileContainer with GenericTile items
         * inside a DIV appended to the Launchpad content. This does not integrate with
         * the LaunchPage model but provides a usable UI when adapter insertion fails.
         */
        _createRendererFallback: function (aTiles) {
            Log.info("Shell Plugin: _createRendererFallback called with", aTiles.length, "tiles");
            try {
                // Avoid requiring heavy modules synchronously; use sap.ui.require
                sap.ui.require(["sap/m/TileContainer", "sap/m/GenericTile", "sap/m/TileContent", "sap/m/NumericContent"], function (TileContainer, GenericTile, TileContent, NumericContent) {
                    Log.info("Shell Plugin: UI5 controls loaded, creating tiles");
                    try {
                        // Create container div if not present
                        var sDivId = "sd-custom-tiles";
                        if (!document.getElementById(sDivId)) {
                            var oDiv = document.createElement('div');
                            oDiv.id = sDivId;
                            // Insert at top of content area
                            var oContent = document.getElementById('content') || document.body;
                            oContent.insertBefore(oDiv, oContent.firstChild);
                        }

                        var oTileContainer = new TileContainer({
                            width: "100%",
                            tiles: aTiles.map(function (oTile) {
                                var props = oTile.properties || {};
                                return new GenericTile({
                                    header: props.title || "",
                                    subheader: props.subtitle || "",
                                    headerImage: props.icon || "",
                                    frameType: "OneByOne",
                                    press: function () {
                                        try {
                                            // Navigate using CrossApplicationNavigation if available
                                            if (sap && sap.ushell && sap.ushell.Container && sap.ushell.Container.getServiceAsync) {
                                                sap.ushell.Container.getServiceAsync('CrossApplicationNavigation').then(function (oService) {
                                                    if (props.targetURL) {
                                                        // targetURL is a shell hash like #SolutionAdvisor-wizard
                                                        oService.toExternal({ target: { shellHash: props.targetURL.replace(/^#/, '') } });
                                                    }
                                                });
                                            }
                                        } catch (e) {
                                            Log.warning('Fallback tile navigation failed', e);
                                        }
                                    },
                                    tileContent: [new TileContent({
                                        footer: props.info || "",
                                        content: new NumericContent({
                                            value: "",
                                            scale: "",
                                            withMargin: false,
                                            icon: props.icon || ""
                                        })
                                    })]
                                });
                            })
                        });

                        oTileContainer.placeAt(sDivId);
                        Log.info("Shell Plugin: TileContainer created and placed in DOM, ID:", sDivId);
                    } catch (e) {
                        Log.warning('Failed to render renderer fallback tiles', e);
                    }
                });
            } catch (e) {
                // Log at debug level so we don't hide useful info while satisfying linters
                Log.debug('Renderer fallback outer error', e);
            }
        },

        /**
         * Initialize plugin data model
         */
        _initPluginModel: function () {
            const oModel = new JSONModel({
                notifications: {
                    count: 0,
                    items: []
                },
                user: {
                    name: "",
                    email: "",
                    role: "",
                    roles: [],
                    lastLogin: null
                },
                settings: {
                    theme: "sap_horizon",
                    language: sap.ui.getCore().getConfiguration().getLanguage() || "en",
                    compactMode: false,
                    autoSave: true
                }
            });
            this.setModel(oModel, "plugin");
            
            // Load real user information from XSUAA
            this._loadUserInfo();
        },
        
        /**
         * Load real user information from XSUAA token
         */
        _loadUserInfo: function () {
            const that = this;
            
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("UserInfo").then(function(oUserInfoService) {
                    const oUser = oUserInfoService.getUser();
                    const sFullName = oUser.getFullName() || "Default User";
                    const sEmail = oUser.getEmail() || "";
                    
                    // Get user roles/scopes from token
                    const aScopes = window.sapUshellUserContext?.roles || [];
                    
                    that.getModel("plugin").setProperty("/user", {
                        name: sFullName,
                        email: sEmail,
                        role: that._getPrimaryRole(aScopes),
                        roles: aScopes,
                        lastLogin: new Date()
                    });
                    
                    Log.info("Shell Plugin: User info loaded:", sFullName, sEmail);
                }).catch(function(e) {
                    Log.warning("Shell Plugin: Could not load user info:", e);
                    // Fallback to default user
                    that.getModel("plugin").setProperty("/user/name", "Default User");
                });
            }
        },
        
        /**
         * Determine primary role from scopes
         */
        _getPrimaryRole: function (aScopes) {
            if (aScopes.includes("TenantAdmin")) return "Administrator";
            if (aScopes.includes("SolutionArchitect")) return "Solution Architect";
            if (aScopes.includes("Developer")) return "Developer/Consultant";
            return "User";
        },

        /**
         * Add custom header items to the shell
         */
        _addHeaderItems: function () {
            // Quick Create button
            this.oRenderer.addHeaderEndItem("sap.ushell.ui.shell.ShellHeadItem", {
                id: "quickCreateBtn",
                icon: "sap-icon://add",
                tooltip: "Quick Create New Analysis",
                press: this.onQuickCreate.bind(this)
            }, true, false);

            // Notifications button (enhanced)
            this.oRenderer.addHeaderEndItem("sap.ushell.ui.shell.ShellHeadItem", {
                id: "notificationsBtn",
                icon: "sap-icon://bell",
                tooltip: "Notifications",
                press: this.onShowNotifications.bind(this)
            }, true, false);

            // Help button
            this.oRenderer.addHeaderEndItem("sap.ushell.ui.shell.ShellHeadItem", {
                id: "helpBtn",
                icon: "sap-icon://sys-help",
                tooltip: "Help & Documentation",
                press: this.onShowHelp.bind(this)
            }, true, false);

            // Settings button
            this.oRenderer.addHeaderEndItem("sap.ushell.ui.shell.ShellHeadItem", {
                id: "settingsBtn",
                icon: "sap-icon://action-settings",
                tooltip: "Settings",
                press: this.onShowSettings.bind(this)
            }, true, false);
        },

        /**
         * Add custom user menu items
         */
        _addUserMenuItems: function () {
            // My Profile
            this.oRenderer.addUserPreferencesEntry({
                title: "My Profile",
                value: function () {
                    return "View and edit profile";
                },
                content: this._createProfileContent.bind(this),
                onSave: this._saveProfile.bind(this),
                icon: "sap-icon://user-edit"
            });

            // Application Settings
            this.oRenderer.addUserPreferencesEntry({
                title: "Application Settings",
                value: function () {
                    return "Configure application preferences";
                },
                content: this._createSettingsContent.bind(this),
                onSave: this._saveSettings.bind(this),
                icon: "sap-icon://action-settings"
            });

            // About
            this.oRenderer.addUserPreferencesEntry({
                title: "About",
                value: function () {
                    return "SAP Clean Core Solution Advisor v1.0.0";
                },
                content: this._createAboutContent.bind(this),
                icon: "sap-icon://information"
            });
        },

        /**
         * Initialize notification service
         */
        _initNotificationService: function () {
            const that = this;

            // Load initial notifications
            this._loadNotifications();

            // Set up notification polling (every 30 seconds)
            this.notificationInterval = setInterval(function () {
                that._loadNotifications();
            }, 30000);
        },

        /**
         * Load notifications from backend
         */
        _loadNotifications: function () {
            const oModel = this.getModel("plugin");
            
            // Mock notification data (replace with actual OData call)
            const aNotifications = [
                {
                    id: "1",
                    title: "New Analysis Completed",
                    description: "Analysis for I-0042-IMP has been completed",
                    timestamp: new Date(Date.now() - 3600000),
                    priority: "High",
                    read: false
                },
                {
                    id: "2",
                    title: "Wizard Session Saved",
                    description: "Your wizard progress has been saved",
                    timestamp: new Date(Date.now() - 7200000),
                    priority: "Medium",
                    read: true
                }
            ];

            const iUnreadCount = aNotifications.filter(n => !n.read).length;

            oModel.setProperty("/notifications/items", aNotifications);
            oModel.setProperty("/notifications/count", iUnreadCount);

            // Update notification badge
            this._updateNotificationBadge(iUnreadCount);
        },

        /**
         * Update notification badge count
         */
        _updateNotificationBadge: function (iCount) {
            const oNotificationBtn = sap.ui.getCore().byId("notificationsBtn");
            if (oNotificationBtn) {
                // Add custom badge via CSS class
                if (iCount > 0) {
                    oNotificationBtn.addStyleClass("notification-badge");
                    oNotificationBtn.data("count", iCount);
                } else {
                    oNotificationBtn.removeStyleClass("notification-badge");
                }
            }
        },

        /**
         * Apply custom branding to shell
         */
        _applyBranding: function () {
            // Set shell title
            this.oRenderer.setHeaderTitle("SAP Clean Core Solution Advisor");

            // Set favicon (if available)
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = '/assets/favicon.ico';
            document.getElementsByTagName('head')[0].appendChild(link);
        },

        /**
         * Subscribe to shell events
         */
        _subscribeToEvents: function () {
            // Listen to navigation and logout events if available on the current ushell implementation.
            // Some sandbox/ushell variants (or when running outside a full FLP) do not expose these helpers,
            // so guard the calls to avoid "is not a function" TypeErrors.
            try {
                if (sap && sap.ushell && sap.ushell.Container) {
                    if (typeof sap.ushell.Container.attachNavigatedEvent === 'function') {
                        sap.ushell.Container.attachNavigatedEvent(this._onNavigated.bind(this));
                    } else {
                        // Fallback: log and continue. In a real FLP environment you'd use the EventHub or ShellNavigation service.
                        Log.warning("sap.ushell.Container.attachNavigatedEvent is not available in this environment");
                    }

                    if (typeof sap.ushell.Container.attachLogoutEvent === 'function') {
                        sap.ushell.Container.attachLogoutEvent(this._onLogout.bind(this));
                    } else if (typeof sap.ushell.Container.attachLogout === 'function') {
                        // older/newer variants might differ - try alternative name
                        sap.ushell.Container.attachLogout(this._onLogout.bind(this));
                    } else {
                        Log.warning("sap.ushell.Container.attachLogoutEvent/attachLogout is not available in this environment");
                    }
                }
            } catch (e) {
                // Defensive: don't break the whole plugin when running in environments without full ushell support
                Log.warning("Error while subscribing to ushell events:", e);
            }
        },

        /**
         * Quick Create button handler
         */
        onQuickCreate: function () {
            MessageBox.confirm(
                "Start a new Clean Core Analysis wizard?",
                {
                    title: "Quick Create",
                    actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            // Navigate to wizard
                            sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oService) {
                                oService.toExternal({
                                    target: {
                                        semanticObject: "SolutionAdvisor",
                                        action: "wizard"
                                    }
                                });
                            });
                        }
                    }
                }
            );
        },

        /**
         * Show notifications popover
         */
        onShowNotifications: function (oEvent) {
            const that = this;
            const oModel = this.getModel("plugin");
            const aNotifications = oModel.getProperty("/notifications/items");

            if (!this._notificationsPopover) {
                this._notificationsPopover = new sap.m.ResponsivePopover({
                    title: "Notifications ({count})".replace("{count}", aNotifications.length),
                    placement: sap.m.PlacementType.Bottom,
                    contentWidth: "400px",
                    contentHeight: "500px",
                    content: new sap.m.List({
                        items: {
                            path: "plugin>/notifications/items",
                            template: new sap.m.NotificationListItem({
                                title: "{plugin>title}",
                                description: "{plugin>description}",
                                datetime: "{plugin>timestamp}",
                                priority: "{plugin>priority}",
                                unread: "{plugin>read}",
                                press: function (oEvent) {
                                    that._markNotificationAsRead(oEvent.getSource().getBindingContext("plugin"));
                                },
                                close: function (oEvent) {
                                    that._deleteNotification(oEvent.getSource().getBindingContext("plugin"));
                                }
                            })
                        },
                        noDataText: "No notifications"
                    }),
                    footer: new sap.m.Toolbar({
                        content: [
                            new sap.m.ToolbarSpacer(),
                            new sap.m.Button({
                                text: "Mark All as Read",
                                press: this._markAllAsRead.bind(this)
                            }),
                            new sap.m.Button({
                                text: "Clear All",
                                press: this._clearAllNotifications.bind(this)
                            })
                        ]
                    })
                });
                this.getView().addDependent(this._notificationsPopover);
            }

            this._notificationsPopover.openBy(oEvent.getSource());
        },

        /**
         * Show help dialog
         */
        onShowHelp: function () {
            if (!this._helpDialog) {
                this._helpDialog = new sap.m.Dialog({
                    title: "Help & Documentation",
                    contentWidth: "600px",
                    contentHeight: "500px",
                    content: new sap.m.List({
                        items: [
                            new sap.m.StandardListItem({
                                title: "Getting Started Guide",
                                description: "Learn how to use the Clean Core Solution Advisor",
                                type: sap.m.ListType.Active,
                                icon: "sap-icon://document",
                                press: function () {
                                    MessageToast.show("Opening Getting Started Guide...");
                                }
                            }),
                            new sap.m.StandardListItem({
                                title: "User Manual",
                                description: "Complete reference for all features and workflows",
                                type: sap.m.ListType.Active,
                                icon: "sap-icon://handbook",
                                press: function () {
                                    MessageToast.show("Opening User Manual...");
                                }
                            }),
                            new sap.m.StandardListItem({
                                title: "Video Tutorials",
                                description: "Step-by-step video guides",
                                type: sap.m.ListType.Active,
                                icon: "sap-icon://video",
                                press: function () {
                                    MessageToast.show("Opening Video Tutorials...");
                                }
                            }),
                            new sap.m.StandardListItem({
                                title: "FAQ",
                                description: "Frequently asked questions and answers",
                                type: sap.m.ListType.Active,
                                icon: "sap-icon://question-mark",
                                press: function () {
                                    MessageToast.show("Opening FAQ...");
                                }
                            }),
                            new sap.m.StandardListItem({
                                title: "Contact Support",
                                description: "Get help from our support team",
                                type: sap.m.ListType.Active,
                                icon: "sap-icon://contact",
                                press: function () {
                                    MessageToast.show("Opening Support Contact Form...");
                                }
                            })
                        ]
                    }),
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this._helpDialog.close();
                        }.bind(this)
                    })
                });
            }
            this._helpDialog.open();
        },

        /**
         * Show settings dialog
         */
        onShowSettings: function () {
            MessageBox.information("Application settings can be accessed via the User Menu (top-right corner).");
        },

        /**
         * Create profile content for user preferences
         */
        _createProfileContent: function () {
            return new sap.m.VBox({
                items: [
                    new sap.m.Label({ text: "Name" }),
                    new sap.m.Input({
                        value: "{plugin>/user/name}",
                        placeholder: "Enter your name"
                    }),
                    new sap.m.Label({ text: "Role", labelFor: "roleInput" }),
                    new sap.m.Select({
                        id: "roleInput",
                        selectedKey: "{plugin>/user/role}",
                        items: [
                            new sap.ui.core.Item({ key: "architect", text: "Solution Architect" }),
                            new sap.ui.core.Item({ key: "developer", text: "Developer/Consultant" }),
                            new sap.ui.core.Item({ key: "admin", text: "Administrator" })
                        ]
                    })
                ]
            });
        },

        /**
         * Save profile settings
         */
        _saveProfile: function () {
            MessageToast.show("Profile saved successfully");
            return Promise.resolve();
        },

        /**
         * Create settings content for user preferences
         */
        _createSettingsContent: function () {
            return new sap.m.VBox({
                items: [
                    new sap.m.Label({ text: "Theme" }),
                    new sap.m.Select({
                        selectedKey: "{plugin>/settings/theme}",
                        items: [
                            new sap.ui.core.Item({ key: "sap_fiori_3", text: "SAP Fiori 3" }),
                            new sap.ui.core.Item({ key: "sap_fiori_3_dark", text: "SAP Fiori 3 Dark" }),
                            new sap.ui.core.Item({ key: "sap_belize", text: "SAP Belize" }),
                            new sap.ui.core.Item({ key: "sap_hcb", text: "High Contrast Black" }),
                            new sap.ui.core.Item({ key: "sap_hcw", text: "High Contrast White" })
                        ],
                        change: this._onThemeChange.bind(this)
                    }),
                    new sap.m.Label({ text: "Language" }),
                    new sap.m.Select({
                        selectedKey: "{plugin>/settings/language}",
                        items: [
                            new sap.ui.core.Item({ key: "en", text: "English" }),
                            new sap.ui.core.Item({ key: "de", text: "Deutsch (German)" }),
                            new sap.ui.core.Item({ key: "fr", text: "Français (French)" }),
                            new sap.ui.core.Item({ key: "es", text: "Español (Spanish)" }),
                            new sap.ui.core.Item({ key: "it", text: "Italiano (Italian)" }),
                            new sap.ui.core.Item({ key: "pt", text: "Português (Portuguese)" }),
                            new sap.ui.core.Item({ key: "ja", text: "日本語 (Japanese)" })
                        ],
                        change: this._onLanguageChange.bind(this)
                    }),
                    new sap.m.CheckBox({
                        text: "Compact Mode",
                        selected: "{plugin>/settings/compactMode}"
                    }),
                    new sap.m.CheckBox({
                        text: "Auto-Save Wizard Progress",
                        selected: "{plugin>/settings/autoSave}"
                    })
                ]
            });
        },

        /**
         * Save application settings
         */
        _saveSettings: function () {
            const oModel = this.getModel("plugin");
            const oSettings = oModel.getProperty("/settings");

            // Apply compact mode
            if (oSettings.compactMode) {
                document.body.classList.add("sapUiSizeCompact");
            } else {
                document.body.classList.remove("sapUiSizeCompact");
            }

            MessageToast.show("Settings saved successfully");
            return Promise.resolve();
        },

        /**
         * Create about content
         */
        _createAboutContent: function () {
            return new sap.m.VBox({
                items: [
                    new sap.m.Title({ text: "SAP Clean Core Solution Advisor", level: "H2" }),
                    new sap.m.Text({ text: "Version: 1.0.0" }),
                    new sap.m.Text({ text: "Build: 2024.01.001" }),
                    new sap.m.Text({ text: "" }),
                    new sap.m.Text({ text: "A decision support tool for selecting clean core approaches in SAP S/4HANA implementations." }),
                    new sap.m.Text({ text: "" }),
                    new sap.m.Text({ text: "© 2024 SAP SE or an SAP affiliate company. All rights reserved." })
                ]
            });
        },

        /**
         * Handle language change
         */
        _onLanguageChange: function (oEvent) {
            const sLanguage = oEvent.getParameter("selectedItem").getKey();
            const oConfig = sap.ui.getCore().getConfiguration();
            
            // Set new language
            oConfig.setLanguage(sLanguage);
            
            // Reload the page to apply language changes
            MessageBox.confirm(
                "The application needs to reload to apply the language change. Reload now?",
                {
                    title: "Language Change",
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            window.location.reload();
                        }
                    }
                }
            );
        },

        /**
         * Handle theme change
         */
        _onThemeChange: function (oEvent) {
            const sTheme = oEvent.getParameter("selectedItem").getKey();
            sap.ui.getCore().applyTheme(sTheme);
            MessageToast.show("Theme changed to " + sTheme);
        },

        /**
         * Mark notification as read
         */
        _markNotificationAsRead: function (oContext) {
            const oModel = this.getModel("plugin");
            const sPath = oContext.getPath();
            oModel.setProperty(sPath + "/read", true);
            this._updateNotificationCount();
        },

        /**
         * Delete notification
         */
        _deleteNotification: function (oContext) {
            const oModel = this.getModel("plugin");
            const aNotifications = oModel.getProperty("/notifications/items");
            const iIndex = parseInt(oContext.getPath().split("/").pop());
            aNotifications.splice(iIndex, 1);
            oModel.setProperty("/notifications/items", aNotifications);
            this._updateNotificationCount();
        },

        /**
         * Mark all notifications as read
         */
        _markAllAsRead: function () {
            const oModel = this.getModel("plugin");
            const aNotifications = oModel.getProperty("/notifications/items");
            aNotifications.forEach(n => n.read = true);
            oModel.setProperty("/notifications/items", aNotifications);
            this._updateNotificationCount();
            MessageToast.show("All notifications marked as read");
        },

        /**
         * Clear all notifications
         */
        _clearAllNotifications: function () {
            const oModel = this.getModel("plugin");
            oModel.setProperty("/notifications/items", []);
            this._updateNotificationCount();
            MessageToast.show("All notifications cleared");
            if (this._notificationsPopover) {
                this._notificationsPopover.close();
            }
        },

        /**
         * Update notification count
         */
        _updateNotificationCount: function () {
            const oModel = this.getModel("plugin");
            const aNotifications = oModel.getProperty("/notifications/items");
            const iUnreadCount = aNotifications.filter(n => !n.read).length;
            oModel.setProperty("/notifications/count", iUnreadCount);
            this._updateNotificationBadge(iUnreadCount);
        },

        /**
         * Handle navigation event
         */
        _onNavigated: function (oEvent) {
            Log.debug("Navigation event:", oEvent.getParameters());
        },

        /**
         * Handle logout event
         */
        _onLogout: function () {
            // Clean up notification polling
            if (this.notificationInterval) {
                clearInterval(this.notificationInterval);
            }
            Log.info("User logged out, cleaning up shell plugin");
        },

        /**
         * Cleanup on component destroy
         */
        destroy: function () {
            // Clean up notification polling
            if (this.notificationInterval) {
                clearInterval(this.notificationInterval);
            }

            // Destroy popovers and dialogs
            if (this._notificationsPopover) {
                this._notificationsPopover.destroy();
            }
            if (this._helpDialog) {
                this._helpDialog.destroy();
            }

            // Call parent destroy
            UIComponent.prototype.destroy.apply(this, arguments);
        }
    });
});
