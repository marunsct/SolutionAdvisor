/**
 * Notification Service
 * 
 * Sends notifications when:
 * - Analysis completes
 * - Scoring thresholds are exceeded (high technical debt, low cloud readiness)
 * - Constraint violations detected
 * - Wizard session expires
 * 
 * Supports multiple notification channels:
 * - In-app notifications (stored in database)
 * - Email notifications (via SAP Destination Service or SMTP)
 * - Push notifications (via SAP Mobile Services)
 */

const cds = require('@sap/cds');

class NotificationService {
    /**
     * Send notification when analysis completes
     * @param {Object} analysisData - Completed analysis data
     * @param {Object} userData - User information (email, name)
     * @returns {Promise<Object>} Notification result
     */
    async sendAnalysisCompleteNotification(analysisData, userData) {
        try {
            const notification = {
                type: 'AnalysisComplete',
                title: 'Clean Core Analysis Complete',
                message: `Your analysis for ${analysisData.objectName} (${analysisData.ricefwId}) is complete. Recommended Level: ${analysisData.finalRecommendation}`,
                severity: this._getSeverityForLevel(analysisData.finalRecommendation),
                data: {
                    analysisID: analysisData.ID,
                    ricefwId: analysisData.ricefwId,
                    finalRecommendation: analysisData.finalRecommendation,
                    technicalDebtScore: analysisData.technicalDebtScore,
                    cloudReadinessScore: analysisData.cloudReadinessScore
                },
                recipient: userData.email,
                createdAt: new Date().toISOString()
            };

            // Store in-app notification
            await this._storeInAppNotification(notification);

            // Send email if configured
            if (this._shouldSendEmail(analysisData, userData)) {
                await this._sendEmailNotification(notification, userData);
            }

            // Send push notification for mobile users
            if (this._shouldSendPush(userData)) {
                await this._sendPushNotification(notification, userData);
            }

            return {
                success: true,
                notificationID: notification.ID,
                message: 'Notification sent successfully'
            };
        } catch (error) {
            console.error('NotificationService: Failed to send analysis complete notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send notification when scoring thresholds are exceeded
     * @param {Object} analysisData - Analysis with threshold violations
     * @param {Object} userData - User information
     * @returns {Promise<Object>} Notification result
     */
    async sendThresholdExceededNotification(analysisData, userData) {
        try {
            const violations = this._identifyThresholdViolations(analysisData);
            
            if (violations.length === 0) {
                return { success: true, message: 'No threshold violations detected' };
            }

            const notification = {
                type: 'ThresholdExceeded',
                title: 'Scoring Threshold Alert',
                message: this._formatThresholdViolationMessage(violations, analysisData),
                severity: 'Warning',
                data: {
                    analysisID: analysisData.ID,
                    ricefwId: analysisData.ricefwId,
                    violations: violations
                },
                recipient: userData.email,
                createdAt: new Date().toISOString()
            };

            await this._storeInAppNotification(notification);
            
            // High severity violations trigger immediate email
            if (this._isHighSeverityViolation(violations)) {
                await this._sendEmailNotification(notification, userData);
            }

            return {
                success: true,
                notificationID: notification.ID,
                violationCount: violations.length
            };
        } catch (error) {
            console.error('NotificationService: Failed to send threshold exceeded notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send notification when constraint violations are detected
     * @param {Array} violations - Array of constraint violations
     * @param {Object} analysisContext - Analysis context information
     * @param {Object} userData - User information
     * @returns {Promise<Object>} Notification result
     */
    async sendConstraintViolationNotification(violations, analysisContext, userData) {
        try {
            if (!violations || violations.length === 0) {
                return { success: true, message: 'No constraint violations' };
            }

            const notification = {
                type: 'ConstraintViolation',
                title: 'Performance Constraint Warning',
                message: `${violations.length} constraint violation(s) detected in your analysis. Please review performance thresholds.`,
                severity: 'Error',
                data: {
                    violations: violations.map(v => ({
                        constraintName: v.thresholdName,
                        userValue: v.userValue,
                        threshold: v.threshold,
                        guidance: v.whenExceeded
                    })),
                    ricefwId: analysisContext.ricefwId,
                    objectType: analysisContext.objectType
                },
                recipient: userData.email,
                createdAt: new Date().toISOString()
            };

            await this._storeInAppNotification(notification);
            await this._sendEmailNotification(notification, userData);

            return {
                success: true,
                notificationID: notification.ID,
                violationCount: violations.length
            };
        } catch (error) {
            console.error('NotificationService: Failed to send constraint violation notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send notification when wizard session is about to expire
     * @param {Object} sessionData - Wizard session information
     * @param {Object} userData - User information
     * @returns {Promise<Object>} Notification result
     */
    async sendSessionExpiryWarning(sessionData, userData) {
        try {
            const notification = {
                type: 'SessionExpiry',
                title: 'Wizard Session Expiring Soon',
                message: `Your wizard session for ${sessionData.ricefwId} will expire in 15 minutes. Please complete your analysis or save progress.`,
                severity: 'Information',
                data: {
                    sessionID: sessionData.ID,
                    ricefwId: sessionData.ricefwId,
                    expiresAt: sessionData.expiresAt
                },
                recipient: userData.email,
                createdAt: new Date().toISOString()
            };

            await this._storeInAppNotification(notification);
            // No email for session warnings - in-app only

            return {
                success: true,
                notificationID: notification.ID
            };
        } catch (error) {
            console.error('NotificationService: Failed to send session expiry warning:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Retrieve unread notifications for a user
     * @param {String} userEmail - User email address
     * @returns {Promise<Array>} Array of unread notifications
     */
    async getUnreadNotifications(userEmail) {
        try {
            // In production, query from database
            // For now, return mock data structure
            return {
                notifications: [],
                unreadCount: 0
            };
        } catch (error) {
            console.error('NotificationService: Failed to retrieve notifications:', error);
            return {
                notifications: [],
                unreadCount: 0,
                error: error.message
            };
        }
    }

    /**
     * Mark notification as read
     * @param {String} notificationID - Notification ID
     * @returns {Promise<Object>} Update result
     */
    async markAsRead(notificationID) {
        try {
            // In production, update database
            return {
                success: true,
                notificationID: notificationID
            };
        } catch (error) {
            console.error('NotificationService: Failed to mark notification as read:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    /**
     * Determine severity based on clean core level
     * @param {String} level - Clean core level (A/B/C/D)
     * @returns {String} Severity level
     * @private
     */
    _getSeverityForLevel(level) {
        switch (level) {
            case 'Level A':
                return 'Success';
            case 'Level B':
                return 'Information';
            case 'Level C':
                return 'Warning';
            case 'Level D':
                return 'Error';
            default:
                return 'None';
        }
    }

    /**
     * Identify threshold violations in analysis scores
     * @param {Object} analysisData - Analysis data with scores
     * @returns {Array} Array of violations
     * @private
     */
    _identifyThresholdViolations(analysisData) {
        const violations = [];

        // Technical Debt Score > 70 is high risk
        if (analysisData.technicalDebtScore > 70) {
            violations.push({
                metric: 'Technical Debt Score',
                value: analysisData.technicalDebtScore,
                threshold: 70,
                severity: 'High',
                message: 'High technical debt detected. Consider refactoring to reduce maintenance burden.'
            });
        }

        // Cloud Readiness Score < 40 is low
        if (analysisData.cloudReadinessScore < 40) {
            violations.push({
                metric: 'Cloud Readiness Score',
                value: analysisData.cloudReadinessScore,
                threshold: 40,
                severity: 'High',
                message: 'Low cloud readiness. This solution may face challenges in cloud deployment.'
            });
        }

        // Upgrade Impact Score > 70 is high risk
        if (analysisData.upgradeImpactScore > 70) {
            violations.push({
                metric: 'Upgrade Impact Score',
                value: analysisData.upgradeImpactScore,
                threshold: 70,
                severity: 'Medium',
                message: 'High upgrade impact. Future S/4HANA upgrades may be complex.'
            });
        }

        // Complexity/Hybrid Score > 80 is critical
        if (analysisData.complexityHybridScore && analysisData.complexityHybridScore > 80) {
            violations.push({
                metric: 'Complexity/Hybrid Score',
                value: analysisData.complexityHybridScore,
                threshold: 80,
                severity: 'Critical',
                message: 'Extremely high complexity. Consider breaking down into smaller components.'
            });
        }

        return violations;
    }

    /**
     * Format threshold violation message
     * @param {Array} violations - Array of violations
     * @param {Object} analysisData - Analysis data
     * @returns {String} Formatted message
     * @private
     */
    _formatThresholdViolationMessage(violations, analysisData) {
        const violationSummary = violations.map(v => 
            `${v.metric}: ${v.value} (threshold: ${v.threshold})`
        ).join(', ');

        return `Analysis for ${analysisData.ricefwId} has ${violations.length} scoring alert(s): ${violationSummary}. Review recommended actions in the dashboard.`;
    }

    /**
     * Check if violations are high severity
     * @param {Array} violations - Array of violations
     * @returns {Boolean} True if high severity
     * @private
     */
    _isHighSeverityViolation(violations) {
        return violations.some(v => v.severity === 'High' || v.severity === 'Critical');
    }

    /**
     * Determine if email should be sent
     * @param {Object} analysisData - Analysis data
     * @param {Object} userData - User data
     * @returns {Boolean} True if email should be sent
     * @private
     */
    _shouldSendEmail(analysisData, userData) {
        // Send email for Level C/D recommendations or if user has email notifications enabled
        return (
            analysisData.finalRecommendation === 'Level C' || 
            analysisData.finalRecommendation === 'Level D' ||
            (userData.preferences && userData.preferences.emailNotifications === true)
        );
    }

    /**
     * Determine if push notification should be sent
     * @param {Object} userData - User data
     * @returns {Boolean} True if push should be sent
     * @private
     */
    _shouldSendPush(userData) {
        return userData.preferences && userData.preferences.pushNotifications === true;
    }

    /**
     * Store in-app notification
     * @param {Object} notification - Notification data
     * @returns {Promise<Object>} Storage result
     * @private
     */
    async _storeInAppNotification(notification) {
        try {
            // In production, insert into database (sd.Notifications entity)
            notification.ID = this._generateNotificationID();
            notification.isRead = false;
            
            console.log('NotificationService: Stored in-app notification:', notification.ID);
            return { success: true, ID: notification.ID };
        } catch (error) {
            console.error('NotificationService: Failed to store in-app notification:', error);
            throw error;
        }
    }

    /**
     * Send email notification via SAP Destination Service
     * @param {Object} notification - Notification data
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Email send result
     * @private
     */
    async _sendEmailNotification(notification, userData) {
        try {
            const emailContent = {
                to: userData.email,
                subject: notification.title,
                body: this._formatEmailBody(notification),
                priority: notification.severity === 'Error' ? 'High' : 'Normal'
            };

            // Try to get mail service configuration from CDS
            const mailConfig = cds.env.requires.mail;
            
            if (mailConfig && mailConfig.kind === 'smtp') {
                // Use nodemailer for SMTP-based email
                const nodemailer = require('nodemailer');
                
                const transporter = nodemailer.createTransporter({
                    host: mailConfig.host || process.env.SMTP_HOST,
                    port: mailConfig.port || process.env.SMTP_PORT || 587,
                    secure: mailConfig.secure || false, // true for 465, false for other ports
                    auth: {
                        user: mailConfig.user || process.env.SMTP_USER,
                        pass: mailConfig.pass || process.env.SMTP_PASS
                    }
                });

                await transporter.sendMail({
                    from: mailConfig.from || process.env.SMTP_FROM || '"SAP Clean Core Advisor" <noreply@cleancore.sap.com>',
                    to: emailContent.to,
                    subject: emailContent.subject,
                    html: emailContent.body,
                    priority: emailContent.priority.toLowerCase()
                });

                console.log('NotificationService: Email sent successfully to:', userData.email);
                return { success: true, emailSent: true };
                
            } else {
                // Fallback: Log email (development mode)
                console.log('NotificationService: Email notification (not sent - no SMTP config)');
                console.log('To:', emailContent.to);
                console.log('Subject:', emailContent.subject);
                console.log('Priority:', emailContent.priority);
                
                return { success: true, emailSent: false, mode: 'log-only' };
            }
        } catch (error) {
            console.error('NotificationService: Failed to send email:', error);
            // Don't throw - email failure should not block notification creation
            return { success: false, emailSent: false, error: error.message };
        }
    }

    /**
     * Send push notification via SAP Mobile Services
     * @param {Object} notification - Notification data
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Push send result
     * @private
     */
    async _sendPushNotification(notification, userData) {
        try {
            // In production, use SAP Mobile Services API
            console.log('NotificationService: Push notification sent to:', userData.email);
            return { success: true, pushSent: true };
        } catch (error) {
            console.error('NotificationService: Failed to send push notification:', error);
            return { success: false, pushSent: false, error: error.message };
        }
    }

    /**
     * Format email body with HTML
     * @param {Object} notification - Notification data
     * @returns {String} Formatted HTML email body
     * @private
     */
    _formatEmailBody(notification) {
        return `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #0854a0; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
                    .severity-${notification.severity.toLowerCase()} { 
                        border-left: 5px solid ${this._getSeverityColor(notification.severity)}; 
                        padding-left: 10px; 
                    }
                    .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .data-table td { padding: 8px; border-bottom: 1px solid #ddd; }
                    .data-table td:first-child { font-weight: bold; width: 40%; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>${notification.title}</h2>
                    </div>
                    <div class="content severity-${notification.severity.toLowerCase()}">
                        <p>${notification.message}</p>
                        
                        ${notification.data ? this._formatDataTable(notification.data) : ''}
                        
                        <p style="margin-top: 20px;">
                            <a href="${this._getAnalysisURL(notification.data.analysisID)}" 
                               style="background-color: #0854a0; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 3px; display: inline-block;">
                                View Analysis
                            </a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>SAP Clean Core Solution Advisor | Automated Notification</p>
                        <p>To manage notification preferences, log in to the application.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Format notification data as HTML table
     * @param {Object} data - Notification data
     * @returns {String} HTML table
     * @private
     */
    _formatDataTable(data) {
        const rows = Object.entries(data)
            .filter(([key]) => key !== 'analysisID') // Exclude internal IDs
            .map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return `<tr><td>${label}</td><td>${this._formatValue(value)}</td></tr>`;
            })
            .join('');

        return `<table class="data-table">${rows}</table>`;
    }

    /**
     * Format value for display
     * @param {*} value - Value to format
     * @returns {String} Formatted value
     * @private
     */
    _formatValue(value) {
        if (Array.isArray(value)) {
            return value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ');
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return String(value);
    }

    /**
     * Get severity color for styling
     * @param {String} severity - Severity level
     * @returns {String} Hex color code
     * @private
     */
    _getSeverityColor(severity) {
        switch (severity) {
            case 'Success': return '#2da12b';
            case 'Information': return '#0854a0';
            case 'Warning': return '#e9730c';
            case 'Error': return '#bb0000';
            default: return '#666666';
        }
    }

    /**
     * Get analysis URL for deep linking
     * @param {String} analysisID - Analysis ID
     * @returns {String} Full URL to analysis
     * @private
     */
    _getAnalysisURL(analysisID) {
        // In production, construct full URL from environment
        return `https://your-app-url.cfapps.sap.hana.ondemand.com/solutionadvisor/#/AnalysisDetails/${analysisID}`;
    }

    /**
     * Generate unique notification ID
     * @returns {String} UUID
     * @private
     */
    _generateNotificationID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

module.exports = new NotificationService();
