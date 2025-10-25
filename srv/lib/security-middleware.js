/**
 * Security Middleware
 * 
 * Adds comprehensive security headers to all HTTP responses:
 * - Content Security Policy (CSP)
 * - X-Frame-Options (Clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - Strict-Transport-Security (HTTPS enforcement)
 * - X-XSS-Protection (XSS filter)
 * - Referrer-Policy (Referrer information control)
 * - Permissions-Policy (Browser feature control)
 * 
 * Also configures:
 * - CORS (Cross-Origin Resource Sharing)
 * - Rate limiting per user/IP
 * - Request size limits
 * - Security event logging
 */

const cds = require('@sap/cds');

class SecurityMiddleware {
    /**
     * Configure security middleware for CAP application
     * Call this in srv/server.js before cds.serve()
     */
    static configure(app) {
        // 1. Security Headers
        app.use((req, res, next) => {
            // Content Security Policy
            // Restricts resource loading to prevent XSS attacks
            res.setHeader('Content-Security-Policy', [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sapui5.hana.ondemand.com https://*.sapui5.hana.ondemand.com", // UI5 scripts
                "style-src 'self' 'unsafe-inline' https://sapui5.hana.ondemand.com", // UI5 styles
                "img-src 'self' data: https:", // Images
                "font-src 'self' data: https://sapui5.hana.ondemand.com", // UI5 fonts
                "connect-src 'self' https://*.hana.ondemand.com", // API calls
                "frame-ancestors 'none'", // No framing allowed
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; '));

            // Prevent clickjacking attacks
            res.setHeader('X-Frame-Options', 'DENY');

            // Prevent MIME type sniffing
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Enable browser XSS filter
            res.setHeader('X-XSS-Protection', '1; mode=block');

            // HTTPS enforcement (only in production)
            if (process.env.NODE_ENV === 'production') {
                res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            }

            // Control referrer information
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

            // Browser feature permissions
            res.setHeader('Permissions-Policy', [
                'geolocation=()',
                'microphone=()',
                'camera=()',
                'payment=()',
                'usb=()',
                'magnetometer=()',
                'accelerometer=()',
                'gyroscope=()'
            ].join(', '));

            // Remove server identification
            res.removeHeader('X-Powered-By');

            next();
        });

        // 2. CORS Configuration
        app.use((req, res, next) => {
            // In production, use specific origins from environment
            const allowedOrigins = process.env.ALLOWED_ORIGINS 
                ? process.env.ALLOWED_ORIGINS.split(',')
                : ['http://localhost:4004', 'http://localhost:5000']; // Development defaults

            const origin = req.headers.origin;
            
            if (allowedOrigins.includes(origin) || !process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
                res.setHeader('Access-Control-Allow-Origin', origin || '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, Accept');
                res.setHeader('Access-Control-Allow-Credentials', 'true');
                res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
            }

            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.status(204).end();
                return;
            }

            next();
        });

        // 3. Request Size Limits
        app.use((req, res, next) => {
            const maxSize = process.env.MAX_REQUEST_SIZE || '10mb';
            
            // Check Content-Length header
            const contentLength = parseInt(req.headers['content-length'] || '0');
            const maxSizeBytes = parseInt(maxSize) * 1024 * 1024;

            if (contentLength > maxSizeBytes) {
                res.status(413).json({
                    error: 'Request entity too large',
                    message: `Maximum request size is ${maxSize}`
                });
                return;
            }

            next();
        });

        // 4. Rate Limiting (Simple implementation - use express-rate-limit for production)
        const rateLimitStore = new Map();
        const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
        const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '100');

        app.use((req, res, next) => {
            // Skip rate limiting for health checks
            if (req.path === '/health' || req.path === '/ping') {
                return next();
            }

            // Get user identifier (user ID or IP address)
            const identifier = req.user?.id || req.ip || req.connection.remoteAddress;
            const now = Date.now();

            // Get or create rate limit record
            if (!rateLimitStore.has(identifier)) {
                rateLimitStore.set(identifier, {
                    count: 1,
                    resetTime: now + RATE_LIMIT_WINDOW
                });
                return next();
            }

            const record = rateLimitStore.get(identifier);

            // Reset if window expired
            if (now > record.resetTime) {
                record.count = 1;
                record.resetTime = now + RATE_LIMIT_WINDOW;
                return next();
            }

            // Increment counter
            record.count++;

            // Check if limit exceeded
            if (record.count > RATE_LIMIT_MAX_REQUESTS) {
                res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
                res.status(429).json({
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute.`,
                    retryAfter: Math.ceil((record.resetTime - now) / 1000)
                });
                return;
            }

            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
            res.setHeader('X-RateLimit-Remaining', RATE_LIMIT_MAX_REQUESTS - record.count);
            res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

            next();
        });

        // 5. Security Event Logging
        app.use((req, res, next) => {
            const startTime = Date.now();

            // Log suspicious patterns
            const suspiciousPatterns = [
                /\.\.\//g,              // Directory traversal
                /<script/gi,            // XSS attempt
                /union.*select/gi,      // SQL injection
                /exec\s*\(/gi,          // Code injection
                /%00/g,                 // Null byte injection
                /\$\{.*\}/g            // Template injection
            ];

            const url = req.url || '';
            const body = JSON.stringify(req.body || '');

            for (const pattern of suspiciousPatterns) {
                if (pattern.test(url) || pattern.test(body)) {
                    // Log security event
                    console.warn('Security: Suspicious request detected', {
                        pattern: pattern.toString(),
                        url: req.url,
                        method: req.method,
                        ip: req.ip,
                        user: req.user?.id || 'anonymous',
                        timestamp: new Date().toISOString()
                    });

                    // In production, you might want to block these requests
                    if (process.env.BLOCK_SUSPICIOUS_REQUESTS === 'true') {
                        res.status(400).json({
                            error: 'Bad request',
                            message: 'Request contains suspicious patterns'
                        });
                        return;
                    }
                }
            }

            // Log response on finish
            res.on('finish', () => {
                const duration = Date.now() - startTime;

                // Log slow requests
                if (duration > 5000) {
                    console.warn('Security: Slow request detected', {
                        url: req.url,
                        method: req.method,
                        duration,
                        status: res.statusCode
                    });
                }

                // Log failed authentication
                if (res.statusCode === 401 || res.statusCode === 403) {
                    console.warn('Security: Authentication/Authorization failed', {
                        url: req.url,
                        method: req.method,
                        status: res.statusCode,
                        ip: req.ip,
                        user: req.user?.id || 'anonymous'
                    });
                }
            });

            next();
        });

        // 6. CSRF Protection (for non-GET requests)
        app.use((req, res, next) => {
            // Skip CSRF check for safe methods
            if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                return next();
            }

            // Skip for API endpoints (assume Bearer token authentication)
            if (req.headers.authorization?.startsWith('Bearer ')) {
                return next();
            }

            // Check CSRF token
            const token = req.headers['x-csrf-token'];
            
            // In development, allow without token
            if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
                return next();
            }

            // Production: validate token
            if (!token || token === 'fetch') {
                // If token is 'fetch', client is requesting a new token
                if (token === 'fetch') {
                    res.setHeader('X-CSRF-Token', this._generateCSRFToken(req));
                    res.status(200).end();
                    return;
                }

                res.status(403).json({
                    error: 'CSRF token missing',
                    message: 'Request must include X-CSRF-Token header'
                });
                return;
            }

            // Validate token
            if (!this._validateCSRFToken(req, token)) {
                res.status(403).json({
                    error: 'CSRF token invalid',
                    message: 'CSRF token validation failed'
                });
                return;
            }

            next();
        });

        console.log('SecurityMiddleware: Configured successfully');
    }

    /**
     * Generate CSRF token for session
     * @private
     */
    static _generateCSRFToken(req) {
        const crypto = require('crypto');
        const session = req.session || {};
        const token = crypto.randomBytes(32).toString('hex');
        
        // Store token in session
        if (!session.csrfTokens) {
            session.csrfTokens = [];
        }
        session.csrfTokens.push(token);

        // Keep only last 5 tokens (for concurrent requests)
        if (session.csrfTokens.length > 5) {
            session.csrfTokens.shift();
        }

        return token;
    }

    /**
     * Validate CSRF token
     * @private
     */
    static _validateCSRFToken(req, token) {
        const session = req.session || {};
        const tokens = session.csrfTokens || [];
        
        return tokens.includes(token);
    }

    /**
     * Clean up rate limit store (call periodically)
     */
    static cleanupRateLimitStore() {
        // This should be implemented with the actual store reference
        // For now, it's a placeholder for scheduled cleanup
    }
}

module.exports = SecurityMiddleware;
