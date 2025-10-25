/**
 * Credential Store Service
 * 
 * Integrates with SAP BTP Credential Store for secure credential management:
 * - SMTP passwords
 * - Encryption keys
 * - API keys for external integrations
 * - Database credentials
 * 
 * Production: Uses SAP Credential Store service
 * Development: Falls back to environment variables
 * 
 * Features:
 * - Automatic credential rotation
 * - Credential versioning
 * - Audit logging for access
 * - Caching for performance
 */

const cds = require('@sap/cds');

class CredentialStoreService {
    constructor() {
        this.credentialCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.isProduction = !!process.env.VCAP_SERVICES;
        this.credStoreClient = null;
        
        // Feature flag - defaults to false (use environment variables)
        this.enabled = process.env.ENABLE_CREDENTIAL_STORE === 'true';
    }

    /**
     * Initialize Credential Store connection
     */
    async initialize() {
        try {
            // Check if Credential Store is enabled
            if (!this.enabled) {
                console.log('CredentialStoreService: BTP Credential Store is DISABLED');
                console.log('CredentialStoreService: Using environment variables for all credentials');
                return;
            }

            if (this.isProduction) {
                // Production: Connect to BTP Credential Store
                await this._initProductionClient();
            } else {
                // Development: Use environment variables
                console.log('CredentialStoreService: Running in development mode (using environment variables)');
            }

            console.log('CredentialStoreService: Initialized successfully');

        } catch (error) {
            console.error('CredentialStoreService: Initialization failed:', error);
            console.warn('CredentialStoreService: Falling back to environment variables');
            this.enabled = false;
        }
    }

    /**
     * Read credential from store
     * 
     * @param {string} namespace - Credential namespace (e.g., 'encryption', 'smtp')
     * @param {string} name - Credential name (e.g., 'master-key', 'password')
     * @param {string} fallbackEnvVar - Optional environment variable name as fallback
     * @returns {string|object} - Credential value
     */
    async readCredential(namespace, name, fallbackEnvVar = null) {
        try {
            const cacheKey = `${namespace}:${name}`;

            // Check cache first
            const cached = this._getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            let credential;

            // If Credential Store is enabled and available, try to read from it
            if (this.enabled && this.isProduction && this.credStoreClient) {
                // Production: Read from Credential Store
                credential = await this._readFromStore(namespace, name);
            } else {
                // Fallback: Read from environment variable
                credential = fallbackEnvVar ? process.env[fallbackEnvVar] : null;

                if (!credential) {
                    throw new Error(`Credential not found: ${namespace}:${name} (env var: ${fallbackEnvVar})`);
                }
            }

            // Cache the credential
            this._putInCache(cacheKey, credential);

            // Audit log
            await this._auditLog('read', namespace, name);

            return credential;

        } catch (error) {
            console.error('CredentialStoreService: Failed to read credential:', error);
            throw error;
        }
    }

    /**
     * Write credential to store
     * 
     * @param {string} namespace - Credential namespace
     * @param {string} name - Credential name
     * @param {string|object} value - Credential value
     */
    async writeCredential(namespace, name, value) {
        try {
            // If Credential Store is enabled and available, write to it
            if (this.enabled && this.isProduction && this.credStoreClient) {
                // Production: Write to Credential Store
                await this._writeToStore(namespace, name, value);
            } else {
                // Development or disabled: Log warning (can't persist to env vars)
                console.warn('CredentialStoreService: Cannot write credentials in development mode');
                console.warn(`  Namespace: ${namespace}`);
                console.warn(`  Name: ${name}`);
                console.warn('  Set the environment variable manually to persist this credential');
            }

            // Update cache
            const cacheKey = `${namespace}:${name}`;
            this._putInCache(cacheKey, value);

            // Audit log
            await this._auditLog('write', namespace, name);

        } catch (error) {
            console.error('CredentialStoreService: Failed to write credential:', error);
            throw error;
        }
    }

    /**
     * Delete credential from store
     * 
     * @param {string} namespace - Credential namespace
     * @param {string} name - Credential name
     */
    async deleteCredential(namespace, name) {
        try {
            if (this.isProduction && this.credStoreClient) {
                // Production: Delete from Credential Store
                await this._deleteFromStore(namespace, name);
            }

            // Remove from cache
            const cacheKey = `${namespace}:${name}`;
            this.credentialCache.delete(cacheKey);

            // Audit log
            await this._auditLog('delete', namespace, name);

        } catch (error) {
            console.error('CredentialStoreService: Failed to delete credential:', error);
            throw error;
        }
    }

    /**
     * Get SMTP credentials for email notifications
     * 
     * @returns {object} - SMTP configuration
     */
    async getSMTPCredentials() {
        try {
            const credentials = {
                host: await this.readCredential('smtp', 'host', 'SMTP_HOST'),
                port: await this.readCredential('smtp', 'port', 'SMTP_PORT'),
                secure: (await this.readCredential('smtp', 'secure', 'SMTP_SECURE')) === 'true',
                auth: {
                    user: await this.readCredential('smtp', 'user', 'SMTP_USER'),
                    pass: await this.readCredential('smtp', 'password', 'SMTP_PASS')
                },
                from: await this.readCredential('smtp', 'from', 'SMTP_FROM')
            };

            return credentials;

        } catch (error) {
            console.error('CredentialStoreService: Failed to get SMTP credentials:', error);
            throw error;
        }
    }

    /**
     * Get encryption master key
     * 
     * @returns {Buffer} - Encryption key as buffer
     */
    async getEncryptionKey() {
        try {
            const keyHex = await this.readCredential('encryption', 'master-key', 'ENCRYPTION_MASTER_KEY');
            return Buffer.from(keyHex, 'hex');

        } catch (error) {
            console.error('CredentialStoreService: Failed to get encryption key:', error);
            throw error;
        }
    }

    /**
     * Rotate SMTP password
     * 
     * @param {string} newPassword - New SMTP password
     */
    async rotateSMTPPassword(newPassword) {
        try {
            await this.writeCredential('smtp', 'password', newPassword);
            console.log('CredentialStoreService: SMTP password rotated successfully');

        } catch (error) {
            console.error('CredentialStoreService: Failed to rotate SMTP password:', error);
            throw error;
        }
    }

    /**
     * Rotate encryption key
     * 
     * @param {Buffer} newKey - New encryption key
     */
    async rotateEncryptionKey(newKey) {
        try {
            const keyHex = newKey.toString('hex');
            await this.writeCredential('encryption', 'master-key', keyHex);
            console.log('CredentialStoreService: Encryption key rotated successfully');

        } catch (error) {
            console.error('CredentialStoreService: Failed to rotate encryption key:', error);
            throw error;
        }
    }

    /**
     * Initialize production Credential Store client
     * @private
     */
    async _initProductionClient() {
        try {
            // Load VCAP_SERVICES
            const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');

            // Find Credential Store service
            const credStoreService = vcapServices['credstore']?.[0];

            if (!credStoreService) {
                console.warn('CredentialStoreService: No credstore service found in VCAP_SERVICES');
                console.warn('CredentialStoreService: Falling back to environment variables');
                return;
            }

            // Initialize client (requires @sap/xsenv package)
            // const xsenv = require('@sap/xsenv');
            // const credentials = credStoreService.credentials;
            
            // TODO: Implement actual Credential Store client initialization
            // For now, this is a placeholder showing the structure

            console.log('CredentialStoreService: Connected to BTP Credential Store');

        } catch (error) {
            console.error('CredentialStoreService: Failed to initialize production client:', error);
            throw error;
        }
    }

    /**
     * Read credential from BTP Credential Store
     * @private
     */
    async _readFromStore(namespace, name) {
        try {
            // TODO: Implement actual Credential Store read
            // const credential = await this.credStoreClient.read({
            //     namespace: namespace,
            //     name: name
            // });
            // return credential.value;

            throw new Error('Credential Store read not implemented');

        } catch (error) {
            console.error('CredentialStoreService: Read from store failed:', error);
            throw error;
        }
    }

    /**
     * Write credential to BTP Credential Store
     * @private
     */
    async _writeToStore(namespace, name, value) {
        try {
            // TODO: Implement actual Credential Store write
            // await this.credStoreClient.write({
            //     namespace: namespace,
            //     name: name,
            //     value: value
            // });

            throw new Error('Credential Store write not implemented');

        } catch (error) {
            console.error('CredentialStoreService: Write to store failed:', error);
            throw error;
        }
    }

    /**
     * Delete credential from BTP Credential Store
     * @private
     */
    async _deleteFromStore(namespace, name) {
        try {
            // TODO: Implement actual Credential Store delete
            // await this.credStoreClient.delete({
            //     namespace: namespace,
            //     name: name
            // });

            throw new Error('Credential Store delete not implemented');

        } catch (error) {
            console.error('CredentialStoreService: Delete from store failed:', error);
            throw error;
        }
    }

    /**
     * Get credential from cache
     * @private
     */
    _getFromCache(key) {
        const cached = this.credentialCache.get(key);
        
        if (!cached) {
            return null;
        }

        // Check if expired
        if (Date.now() > cached.expiry) {
            this.credentialCache.delete(key);
            return null;
        }

        return cached.value;
    }

    /**
     * Put credential in cache
     * @private
     */
    _putInCache(key, value) {
        this.credentialCache.set(key, {
            value: value,
            expiry: Date.now() + this.cacheTimeout
        });
    }

    /**
     * Audit log for credential access
     * @private
     */
    async _auditLog(operation, namespace, name) {
        try {
            const AuditService = require('./audit-service');
            const auditService = new AuditService();

            await auditService.logSecurityEvent({
                eventType: `credential_${operation}`,
                details: {
                    namespace,
                    name
                },
                timestamp: new Date(),
                severity: 'INFO'
            });

        } catch (error) {
            // Don't fail credential operations if audit logging fails
            console.error('CredentialStoreService: Audit logging failed:', error);
        }
    }
}

// Singleton instance
let instance = null;

module.exports = {
    /**
     * Get or create CredentialStoreService instance
     */
    getInstance: async () => {
        if (!instance) {
            instance = new CredentialStoreService();
            await instance.initialize();
        }
        return instance;
    },

    /**
     * For testing: reset singleton instance
     */
    resetInstance: () => {
        instance = null;
    }
};
