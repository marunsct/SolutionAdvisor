sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseObject, JSONModel, Filter, FilterOperator) {
    "use strict";

    /**
     * Shell Notification Service - Manages application-level notifications
     * Integrates with SAP Fiori Launchpad notification service
     */
    return BaseObject.extend("sd.solutionadvisor.services.NotificationService", {
        
        /**
         * Constructor
         * @param {sap.ui.core.UIComponent} oComponent - Application component
         */
        constructor: function (oComponent) {
            this._oComponent = oComponent;
            this._oModel = oComponent.getModel();
            this._oNotificationModel = new JSONModel({
                notifications: [],
                unreadCount: 0,
                priorities: {
                    high: 0,
                    medium: 0,
                    low: 0
                }
            });
            
            this._oShellNotificationService = null;
            this._bInitialized = false;
            this._aSubscribers = [];
            
            // Initialize shell notification service
            this._initialize();
        },

        /**
         * Initialize shell notification service
         */
        _initialize: function () {
            const that = this;
            
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("Notifications").then(function (oService) {
                    that._oShellNotificationService = oService;
                    that._bInitialized = true;
                    
                    // Register notification handlers
                    that._registerHandlers();
                }).catch(function (oError) {
                    console.error("Failed to initialize Notification service:", oError);
                });
            }
        },

        /**
         * Register notification handlers
         */
        _registerHandlers: function () {
            if (!this._oShellNotificationService) {
                return;
            }
            
            const that = this;
            
            // Listen for new notifications
            this._oShellNotificationService.registerNotificationOpenHandler(function (oNotification) {
                that._handleNotificationOpen(oNotification);
            });
        },

        /**
         * Get notification model
         * @returns {sap.ui.model.json.JSONModel} - Notification model
         */
        getModel: function () {
            return this._oNotificationModel;
        },

        /**
         * Load notifications from backend
         * @returns {Promise} - Promise resolving when notifications loaded
         */
        loadNotifications: function () {
            const that = this;
            
            // TODO: Replace with actual OData entity when Notifications entity is implemented
            // For now, return mock data
            return new Promise(function (resolve) {
                const aNotifications = [
                    {
                        id: "notif-001",
                        title: "Analysis Completed",
                        description: "Clean Core analysis for I-0042-IMP has been completed with Level A recommendation",
                        timestamp: new Date(Date.now() - 3600000),
                        priority: "High",
                        isRead: false,
                        type: "AnalysisComplete",
                        actions: [
                            { text: "View Analysis", action: "view" },
                            { text: "Export Report", action: "export" }
                        ],
                        data: {
                            analysisId: "abc-123",
                            ricefwId: "I-0042-IMP",
                            level: "A"
                        }
                    },
                    {
                        id: "notif-002",
                        title: "Wizard Session Saved",
                        description: "Your wizard progress for R-0015-SAP has been automatically saved",
                        timestamp: new Date(Date.now() - 7200000),
                        priority: "Medium",
                        isRead: true,
                        type: "WizardSaved",
                        actions: [
                            { text: "Resume Wizard", action: "resume" }
                        ],
                        data: {
                            sessionId: "session-456",
                            ricefwId: "R-0015-SAP"
                        }
                    },
                    {
                        id: "notif-003",
                        title: "New Threshold Added",
                        description: "Performance threshold 'Max Custom Code Lines' has been added for Reports",
                        timestamp: new Date(Date.now() - 14400000),
                        priority: "Low",
                        isRead: false,
                        type: "ConfigUpdate",
                        actions: [
                            { text: "View Thresholds", action: "view" }
                        ],
                        data: {
                            thresholdId: "threshold-789",
                            objectType: "R"
                        }
                    }
                ];
                
                that._oNotificationModel.setProperty("/notifications", aNotifications);
                that._updateCounts(aNotifications);
                
                resolve(aNotifications);
            });
        },

        /**
         * Update notification counts
         * @param {Array} aNotifications - Notifications array
         */
        _updateCounts: function (aNotifications) {
            let iUnread = 0;
            const oPriorities = { high: 0, medium: 0, low: 0 };
            
            aNotifications.forEach(function (oNotif) {
                if (!oNotif.isRead) {
                    iUnread++;
                    const sPriority = oNotif.priority.toLowerCase();
                    if (oPriorities[sPriority] !== undefined) {
                        oPriorities[sPriority]++;
                    }
                }
            });
            
            this._oNotificationModel.setProperty("/unreadCount", iUnread);
            this._oNotificationModel.setProperty("/priorities", oPriorities);
            
            // Notify subscribers
            this._notifySubscribers({
                unreadCount: iUnread,
                priorities: oPriorities
            });
        },

        /**
         * Mark notification as read
         * @param {string} sNotificationId - Notification ID
         * @returns {Promise} - Promise resolving when marked as read
         */
        markAsRead: function (sNotificationId) {
            const that = this;
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            const oNotification = aNotifications.find(n => n.id === sNotificationId);
            
            if (oNotification && !oNotification.isRead) {
                oNotification.isRead = true;
                this._oNotificationModel.setProperty("/notifications", aNotifications);
                this._updateCounts(aNotifications);
                
                // TODO: Update backend when Notifications entity is implemented
                // return this._updateNotificationStatus(sNotificationId, true);
            }
            
            return Promise.resolve();
        },

        /**
         * Mark all notifications as read
         * @returns {Promise} - Promise resolving when all marked as read
         */
        markAllAsRead: function () {
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            aNotifications.forEach(function (oNotif) {
                oNotif.isRead = true;
            });
            
            this._oNotificationModel.setProperty("/notifications", aNotifications);
            this._updateCounts(aNotifications);
            
            return Promise.resolve();
        },

        /**
         * Delete notification
         * @param {string} sNotificationId - Notification ID
         * @returns {Promise} - Promise resolving when deleted
         */
        deleteNotification: function (sNotificationId) {
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            const iIndex = aNotifications.findIndex(n => n.id === sNotificationId);
            
            if (iIndex > -1) {
                aNotifications.splice(iIndex, 1);
                this._oNotificationModel.setProperty("/notifications", aNotifications);
                this._updateCounts(aNotifications);
            }
            
            return Promise.resolve();
        },

        /**
         * Create new notification
         * @param {object} oNotification - Notification data
         * @returns {Promise} - Promise resolving with notification ID
         */
        createNotification: function (oNotification) {
            const sId = "notif-" + Date.now();
            const oNewNotification = {
                id: sId,
                title: oNotification.title,
                description: oNotification.description,
                timestamp: new Date(),
                priority: oNotification.priority || "Medium",
                isRead: false,
                type: oNotification.type || "General",
                actions: oNotification.actions || [],
                data: oNotification.data || {}
            };
            
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            aNotifications.unshift(oNewNotification); // Add to beginning
            
            this._oNotificationModel.setProperty("/notifications", aNotifications);
            this._updateCounts(aNotifications);
            
            // Show shell notification if available
            if (this._oShellNotificationService) {
                this._showShellNotification(oNewNotification);
            }
            
            return Promise.resolve(sId);
        },

        /**
         * Show notification in shell
         * @param {object} oNotification - Notification data
         */
        _showShellNotification: function (oNotification) {
            if (!this._oShellNotificationService) {
                return;
            }
            
            // FLP notification format
            const oShellNotification = {
                id: oNotification.id,
                title: oNotification.title,
                body: oNotification.description,
                priority: oNotification.priority,
                timestamp: oNotification.timestamp.toISOString()
            };
            
            // Add notification to shell
            // this._oShellNotificationService.addNotification(oShellNotification);
        },

        /**
         * Handle notification open event
         * @param {object} oNotification - Notification that was opened
         */
        _handleNotificationOpen: function (oNotification) {
            // Mark as read
            this.markAsRead(oNotification.id);
            
            // Execute default action if available
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            const oLocalNotif = aNotifications.find(n => n.id === oNotification.id);
            
            if (oLocalNotif && oLocalNotif.actions && oLocalNotif.actions.length > 0) {
                this.executeNotificationAction(oNotification.id, oLocalNotif.actions[0].action);
            }
        },

        /**
         * Execute notification action
         * @param {string} sNotificationId - Notification ID
         * @param {string} sAction - Action to execute
         */
        executeNotificationAction: function (sNotificationId, sAction) {
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            const oNotification = aNotifications.find(n => n.id === sNotificationId);
            
            if (!oNotification) {
                return;
            }
            
            // Handle different action types
            switch (sAction) {
                case "view":
                    this._navigateToNotificationTarget(oNotification);
                    break;
                case "resume":
                    this._resumeWizard(oNotification);
                    break;
                case "export":
                    this._exportAnalysis(oNotification);
                    break;
                default:
                    console.warn("Unknown notification action:", sAction);
            }
        },

        /**
         * Navigate to notification target
         * @param {object} oNotification - Notification
         */
        _navigateToNotificationTarget: function (oNotification) {
            const oNavigationService = this._oComponent.getNavigationService();
            if (!oNavigationService) {
                return;
            }
            
            switch (oNotification.type) {
                case "AnalysisComplete":
                    if (oNotification.data.analysisId) {
                        oNavigationService.toAnalysisDetails(oNotification.data.analysisId);
                    }
                    break;
                case "ConfigUpdate":
                    oNavigationService.toAdmin("thresholds");
                    break;
                default:
                    oNavigationService.toHome();
            }
        },

        /**
         * Resume wizard from notification
         * @param {object} oNotification - Notification
         */
        _resumeWizard: function (oNotification) {
            const oNavigationService = this._oComponent.getNavigationService();
            if (!oNavigationService || !oNotification.data.sessionId) {
                return;
            }
            
            oNavigationService.toWizard({
                sessionId: oNotification.data.sessionId
            });
        },

        /**
         * Export analysis from notification
         * @param {object} oNotification - Notification
         */
        _exportAnalysis: function (oNotification) {
            // Trigger export functionality
            sap.m.MessageToast.show("Exporting analysis " + oNotification.data.ricefwId);
        },

        /**
         * Subscribe to notification updates
         * @param {function} fnCallback - Callback function
         */
        subscribe: function (fnCallback) {
            if (typeof fnCallback === "function") {
                this._aSubscribers.push(fnCallback);
            }
        },

        /**
         * Unsubscribe from notification updates
         * @param {function} fnCallback - Callback function
         */
        unsubscribe: function (fnCallback) {
            const iIndex = this._aSubscribers.indexOf(fnCallback);
            if (iIndex > -1) {
                this._aSubscribers.splice(iIndex, 1);
            }
        },

        /**
         * Notify all subscribers
         * @param {object} oData - Notification data
         */
        _notifySubscribers: function (oData) {
            this._aSubscribers.forEach(function (fnCallback) {
                fnCallback(oData);
            });
        },

        /**
         * Get unread count
         * @returns {number} - Unread notification count
         */
        getUnreadCount: function () {
            return this._oNotificationModel.getProperty("/unreadCount");
        },

        /**
         * Get notifications by priority
         * @param {string} sPriority - Priority (High, Medium, Low)
         * @returns {Array} - Filtered notifications
         */
        getNotificationsByPriority: function (sPriority) {
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            return aNotifications.filter(n => n.priority === sPriority);
        },

        /**
         * Get unread notifications
         * @returns {Array} - Unread notifications
         */
        getUnreadNotifications: function () {
            const aNotifications = this._oNotificationModel.getProperty("/notifications");
            return aNotifications.filter(n => !n.isRead);
        },

        /**
         * Clear all notifications
         * @returns {Promise} - Promise resolving when cleared
         */
        clearAll: function () {
            this._oNotificationModel.setProperty("/notifications", []);
            this._updateCounts([]);
            return Promise.resolve();
        }
    });
}, true);
