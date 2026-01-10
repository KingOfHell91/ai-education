// Authentication Service Layer
// Abstrahiert zwischen Mock-Auth (lokale Entwicklung), Backend-API und echtem AWS Cognito

class AuthService {
    constructor() {
        // Lade Konfiguration
        this.config = window.AWS_CONFIG || {};
        
        // Auth-Modus: 'mock', 'backend', 'production'
        // Default: 'backend' (lokale SQLite-Datenbank)
        this.authMode = this.config.AUTH_MODE || 'backend';
        this.useMock = this.authMode === 'mock';
        this.useBackend = this.authMode === 'backend';
        
        // Backend API URL
        this.apiBaseUrl = this.config.API_BASE_URL || 'http://localhost:4000';
        
        // Session Token Storage
        this.sessionToken = localStorage.getItem('auth_token') || null;
        this.currentUser = null;
        
        // Initialisiere entsprechenden Auth-Provider
        if (this.useMock) {
            console.log('[AuthService] Running in MOCK mode');
            this.provider = new window.AuthMock();
        } else if (this.useBackend) {
            console.log('[AuthService] Running in BACKEND mode (SQLite)');
            this.provider = null; // Wir nutzen fetch direkt
        } else {
            console.log('[AuthService] Running in PRODUCTION mode with AWS Cognito');
            this.initializeAmplify();
            this.provider = this; // In Production-Modus nutzen wir Amplify direkt
        }
        
        // Event-Listener für Auth-State-Changes
        this.authStateListeners = [];
        
        // Automatisches Session-Refresh
        if (this.config.session && this.config.session.autoRefresh) {
            this.startAutoRefresh();
        }
    }
    
    // AWS Amplify initialisieren (nur im Production-Modus)
    initializeAmplify() {
        if (typeof window.Amplify === 'undefined') {
            console.error('[AuthService] AWS Amplify library not loaded!');
            console.log('[AuthService] Falling back to Mock mode');
            this.useMock = true;
            this.provider = new window.AuthMock();
            return;
        }
        
        try {
            window.Amplify.configure(this.config.amplify);
            console.log('[AuthService] AWS Amplify configured successfully');
        } catch (error) {
            console.error('[AuthService] Failed to configure Amplify:', error);
            console.log('[AuthService] Falling back to Mock mode');
            this.useMock = true;
            this.provider = new window.AuthMock();
        }
    }
    
    // ==================== Backend API Helper ====================
    
    async _backendFetch(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}/api/auth${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (this.sessionToken) {
            headers['Authorization'] = `Bearer ${this.sessionToken}`;
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API-Fehler');
        }
        
        return data;
    }
    
    // ==================== Public API ====================
    
    // User Registration
    async signUp(email, password, attributes = {}) {
        try {
            this._log('signUp', { email, attributes });
            
            if (this.useMock) {
                return await this.provider.signUp(email, password, attributes);
            } else if (this.useBackend) {
                // Backend API Registration
                const result = await this._backendFetch('/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password,
                        name: attributes.name,
                        birthDate: attributes.birthDate
                    })
                });
                
                if (result.success && result.token) {
                    // Store session token
                    this.sessionToken = result.token;
                    localStorage.setItem('auth_token', result.token);
                    this.currentUser = result.user;
                }
                
                return {
                    success: true,
                    user: result.user,
                    token: result.token,
                    message: 'Registrierung erfolgreich!'
                };
            } else {
                // AWS Cognito Sign Up
                const result = await window.Amplify.Auth.signUp({
                    username: email,
                    password: password,
                    attributes: {
                        email: email,
                        name: attributes.name || '',
                        ...attributes
                    }
                });
                
                return {
                    success: true,
                    user: {
                        userId: result.userSub,
                        email: email,
                        attributes: attributes
                    },
                    message: 'Registrierung erfolgreich! Bitte prüfe deine E-Mail für die Bestätigung.'
                };
            }
        } catch (error) {
            this._logError('signUp', error);
            throw this._normalizeError(error);
        }
    }
    
    // Confirm Sign Up (Email Verification)
    async confirmSignUp(email, code) {
        try {
            this._log('confirmSignUp', { email, code });
            
            if (this.useMock) {
                // Im Mock-Modus automatisch verifiziert
                return { success: true, message: 'E-Mail verifiziert' };
            } else {
                await window.Amplify.Auth.confirmSignUp(email, code);
                return { success: true, message: 'E-Mail erfolgreich verifiziert' };
            }
        } catch (error) {
            this._logError('confirmSignUp', error);
            throw this._normalizeError(error);
        }
    }
    
    // Resend Confirmation Code
    async resendConfirmationCode(email) {
        try {
            this._log('resendConfirmationCode', { email });
            
            if (this.useMock) {
                return { success: true, message: 'Bestätigungscode erneut gesendet' };
            } else {
                await window.Amplify.Auth.resendSignUp(email);
                return { success: true, message: 'Bestätigungscode erneut gesendet' };
            }
        } catch (error) {
            this._logError('resendConfirmationCode', error);
            throw this._normalizeError(error);
        }
    }
    
    // User Login
    async signIn(email, password, rememberMe = false) {
        try {
            this._log('signIn', { email, rememberMe });
            
            let result;
            if (this.useMock) {
                result = await this.provider.signIn(email, password, rememberMe);
            } else if (this.useBackend) {
                // Backend API Login
                const apiResult = await this._backendFetch('/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password,
                        rememberMe
                    })
                });
                
                // Session token is in apiResult.session.token
                const sessionToken = apiResult.session?.token;
                if (apiResult.success && sessionToken) {
                    // Store session token
                    this.sessionToken = sessionToken;
                    localStorage.setItem('auth_token', sessionToken);
                    this.currentUser = apiResult.user;
                }
                
                result = {
                    success: true,
                    user: apiResult.user,
                    session: {
                        token: sessionToken,
                        expiresAt: apiResult.session?.expiresAt,
                        rememberMe: rememberMe
                    }
                };
            } else {
                // AWS Cognito Sign In
                const cognitoUser = await window.Amplify.Auth.signIn(email, password);
                
                result = {
                    success: true,
                    user: {
                        userId: cognitoUser.attributes.sub,
                        email: cognitoUser.attributes.email,
                        attributes: cognitoUser.attributes
                    },
                    session: {
                        token: cognitoUser.signInUserSession.accessToken.jwtToken,
                        rememberMe: rememberMe
                    }
                };
            }
            
            // Trigger Auth-State-Change-Event
            this._notifyAuthStateChange('signedIn', result.user);
            
            return result;
        } catch (error) {
            this._logError('signIn', error);
            throw this._normalizeError(error);
        }
    }
    
    // User Logout
    async signOut() {
        try {
            this._log('signOut');
            
            if (this.useMock) {
                await this.provider.signOut();
            } else if (this.useBackend) {
                // Backend API Logout
                try {
                    await this._backendFetch('/logout', {
                        method: 'POST'
                    });
                } catch (error) {
                    // Ignore logout errors, clear local state anyway
                    console.warn('[AuthService] Logout API error (ignored):', error);
                }
                
                // Clear local session
                this.sessionToken = null;
                this.currentUser = null;
                localStorage.removeItem('auth_token');
            } else {
                await window.Amplify.Auth.signOut();
            }
            
            // Trigger Auth-State-Change-Event
            this._notifyAuthStateChange('signedOut', null);
            
            return { success: true };
        } catch (error) {
            this._logError('signOut', error);
            throw this._normalizeError(error);
        }
    }
    
    // Get Current User
    async getCurrentUser() {
        try {
            if (this.useMock) {
                return await this.provider.getCurrentUser();
            } else if (this.useBackend) {
                // Return cached user if available
                if (this.currentUser) {
                    return this.currentUser;
                }
                
                // No token, no user
                if (!this.sessionToken) {
                    return null;
                }
                
                // Fetch user from backend
                const result = await this._backendFetch('/me');
                
                if (result.success && result.user) {
                    this.currentUser = result.user;
                    return result.user;
                }
                
                return null;
            } else {
                const cognitoUser = await window.Amplify.Auth.currentAuthenticatedUser();
                return {
                    userId: cognitoUser.attributes.sub,
                    email: cognitoUser.attributes.email,
                    attributes: cognitoUser.attributes
                };
            }
        } catch (error) {
            // Kein Fehler loggen wenn User nicht eingeloggt (expected)
            // Clear invalid session
            if (this.useBackend) {
                this.sessionToken = null;
                this.currentUser = null;
                localStorage.removeItem('auth_token');
            }
            return null;
        }
    }
    
    // Check if user is authenticated
    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return user !== null;
    }
    
    // Validate Session
    async validateSession() {
        try {
            if (this.useMock) {
                return await this.provider.validateSession();
            } else if (this.useBackend) {
                if (!this.sessionToken) {
                    return false;
                }
                
                const result = await this._backendFetch('/validate');
                return result.valid === true;
            } else {
                const session = await window.Amplify.Auth.currentSession();
                return session.isValid();
            }
        } catch (error) {
            return false;
        }
    }
    
    // Change Password
    async changePassword(oldPassword, newPassword) {
        try {
            this._log('changePassword');
            
            if (this.useMock) {
                return await this.provider.changePassword(oldPassword, newPassword);
            } else {
                const user = await window.Amplify.Auth.currentAuthenticatedUser();
                await window.Amplify.Auth.changePassword(user, oldPassword, newPassword);
                return { success: true, message: 'Passwort erfolgreich geändert' };
            }
        } catch (error) {
            this._logError('changePassword', error);
            throw this._normalizeError(error);
        }
    }
    
    // Forgot Password (Request Reset Code)
    async forgotPassword(email) {
        try {
            this._log('forgotPassword', { email });
            
            if (this.useMock) {
                return await this.provider.forgotPassword(email);
            } else {
                await window.Amplify.Auth.forgotPassword(email);
                return {
                    success: true,
                    message: 'Reset-Code wurde an deine E-Mail gesendet'
                };
            }
        } catch (error) {
            this._logError('forgotPassword', error);
            throw this._normalizeError(error);
        }
    }
    
    // Reset Password with Code
    async forgotPasswordSubmit(email, code, newPassword) {
        try {
            this._log('forgotPasswordSubmit', { email });
            
            if (this.useMock) {
                return await this.provider.resetPasswordWithCode(email, code, newPassword);
            } else {
                await window.Amplify.Auth.forgotPasswordSubmit(email, code, newPassword);
                return { success: true, message: 'Passwort erfolgreich zurückgesetzt' };
            }
        } catch (error) {
            this._logError('forgotPasswordSubmit', error);
            throw this._normalizeError(error);
        }
    }
    
    // Update User Attributes
    async updateUserAttributes(attributes) {
        try {
            this._log('updateUserAttributes', { attributes });
            
            if (this.useMock) {
                return await this.provider.updateUserAttributes(attributes);
            } else {
                const user = await window.Amplify.Auth.currentAuthenticatedUser();
                await window.Amplify.Auth.updateUserAttributes(user, attributes);
                return { success: true, attributes: attributes };
            }
        } catch (error) {
            this._logError('updateUserAttributes', error);
            throw this._normalizeError(error);
        }
    }
    
    // Refresh Session Token
    async refreshSession() {
        try {
            this._log('refreshSession');
            
            if (this.useMock) {
                // Im Mock-Modus einfach validieren
                return await this.validateSession();
            } else {
                const cognitoUser = await window.Amplify.Auth.currentAuthenticatedUser();
                const session = await window.Amplify.Auth.currentSession();
                return session.isValid();
            }
        } catch (error) {
            this._logError('refreshSession', error);
            return false;
        }
    }
    
    // ==================== Auth State Management ====================
    
    // Subscribe to auth state changes
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }
    
    // Notify all listeners of auth state change
    _notifyAuthStateChange(state, user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(state, user);
            } catch (error) {
                console.error('[AuthService] Error in auth state listener:', error);
            }
        });
    }
    
    // ==================== Auto-Refresh ====================
    
    startAutoRefresh() {
        const intervalMinutes = this.config.session?.refreshIntervalMinutes || 60;
        const intervalMs = intervalMinutes * 60 * 1000;
        
        this.refreshInterval = setInterval(async () => {
            const isAuthenticated = await this.isAuthenticated();
            if (isAuthenticated) {
                this._log('Auto-refreshing session');
                await this.refreshSession();
            }
        }, intervalMs);
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    // ==================== Helper Methods ====================
    
    // Normalize errors from different sources
    _normalizeError(error) {
        if (error instanceof Error) {
            return error;
        }
        
        // Handle Amplify errors
        if (error.code) {
            switch (error.code) {
                case 'UserNotFoundException':
                    return new Error('Benutzer nicht gefunden');
                case 'NotAuthorizedException':
                    return new Error('Falsches Passwort oder Benutzer nicht autorisiert');
                case 'UserNotConfirmedException':
                    return new Error('E-Mail wurde noch nicht bestätigt');
                case 'UsernameExistsException':
                    return new Error('Ein Benutzer mit dieser E-Mail existiert bereits');
                case 'InvalidParameterException':
                    return new Error('Ungültige Parameter');
                case 'InvalidPasswordException':
                    return new Error('Passwort entspricht nicht den Anforderungen');
                case 'CodeMismatchException':
                    return new Error('Ungültiger Bestätigungscode');
                case 'ExpiredCodeException':
                    return new Error('Bestätigungscode ist abgelaufen');
                default:
                    return new Error(error.message || 'Ein Fehler ist aufgetreten');
            }
        }
        
        return new Error(error.message || 'Ein unbekannter Fehler ist aufgetreten');
    }
    
    // Logging
    _log(method, data = {}) {
        if (this.config.debug?.logAuthEvents) {
            console.log(`[AuthService] ${method}`, data);
        }
    }
    
    _logError(method, error) {
        if (this.config.debug?.verbose) {
            console.error(`[AuthService] ${method} Error:`, error);
        }
    }
    
    // ==================== Utility Methods ====================
    
    // Get current mode (mock, backend, or production)
    getMode() {
        return this.authMode;
    }
    
    // Get session token for API calls
    getSessionToken() {
        return this.sessionToken;
    }
    
    // Check if email is valid
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Password strength check
    checkPasswordStrength(password) {
        const strength = {
            score: 0,
            feedback: []
        };
        
        if (password.length >= 8) {
            strength.score += 1;
        } else {
            strength.feedback.push('Mindestens 8 Zeichen');
        }
        
        if (password.length >= 12) {
            strength.score += 1;
        }
        
        if (/[a-z]/.test(password)) {
            strength.score += 1;
        } else {
            strength.feedback.push('Kleinbuchstaben');
        }
        
        if (/[A-Z]/.test(password)) {
            strength.score += 1;
        } else {
            strength.feedback.push('Großbuchstaben');
        }
        
        if (/[0-9]/.test(password)) {
            strength.score += 1;
        } else {
            strength.feedback.push('Zahlen');
        }
        
        if (/[^a-zA-Z0-9]/.test(password)) {
            strength.score += 1;
        } else {
            strength.feedback.push('Sonderzeichen');
        }
        
        // Rating
        if (strength.score <= 2) {
            strength.rating = 'weak';
            strength.label = 'Schwach';
        } else if (strength.score <= 4) {
            strength.rating = 'medium';
            strength.label = 'Mittel';
        } else {
            strength.rating = 'strong';
            strength.label = 'Stark';
        }
        
        return strength;
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.AuthService = AuthService;
}

