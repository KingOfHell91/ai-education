// Mock Authentication Service für lokale Entwicklung
// Simuliert AWS Cognito ohne echte AWS-Services

class AuthMock {
    constructor() {
        this.storageKeys = {
            users: 'mock_auth_users',
            currentUser: 'mock_auth_current_user',
            sessions: 'mock_auth_sessions'
        };
        
        // Initialisiere Mock-Datenbank
        this.initializeMockDB();
    }
    
    initializeMockDB() {
        if (!localStorage.getItem(this.storageKeys.users)) {
            localStorage.setItem(this.storageKeys.users, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.storageKeys.sessions)) {
            localStorage.setItem(this.storageKeys.sessions, JSON.stringify({}));
        }
    }
    
    // Hilfsfunktion: Hash-Simulation (NUR FÜR MOCK! In Production niemals clientseitig hashen)
    _mockHash(password) {
        // Sehr simple Hash-Simulation für Mock-Zwecke
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'mock_hash_' + Math.abs(hash).toString(16);
    }
    
    // Generiere Mock-Token
    _generateToken(email, rememberMe = false) {
        const expiryDays = rememberMe ? 30 : 1;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        
        return {
            token: 'mock_token_' + Math.random().toString(36).substr(2, 9),
            email: email,
            expiresAt: expiryDate.toISOString(),
            rememberMe: rememberMe
        };
    }
    
    // User Registration
    async signUp(email, password, attributes = {}) {
        try {
            // Validierung
            if (!email || !password) {
                throw new Error('Email und Passwort sind erforderlich');
            }
            
            if (!this._isValidEmail(email)) {
                throw new Error('Ungültige E-Mail-Adresse');
            }
            
            if (password.length < 8) {
                throw new Error('Passwort muss mindestens 8 Zeichen lang sein');
            }
            
            // Prüfe ob User bereits existiert
            const users = JSON.parse(localStorage.getItem(this.storageKeys.users));
            if (users[email]) {
                throw new Error('Ein Benutzer mit dieser E-Mail existiert bereits');
            }
            
            // Erstelle neuen User
            const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const newUser = {
                userId: userId,
                email: email,
                passwordHash: this._mockHash(password),
                attributes: {
                    name: attributes.name || '',
                    ...attributes
                },
                emailVerified: false, // In Mock-Modus sofort auf true setzen
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            
            users[email] = newUser;
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
            
            // Simuliere Email-Verification (im Mock-Modus automatisch verifiziert)
            setTimeout(() => {
                this._verifyEmail(email);
            }, 100);
            
            return {
                success: true,
                user: {
                    userId: newUser.userId,
                    email: newUser.email,
                    attributes: newUser.attributes
                },
                message: 'Registrierung erfolgreich! (Mock-Modus: E-Mail automatisch verifiziert)'
            };
        } catch (error) {
            console.error('[AuthMock] SignUp Error:', error);
            throw error;
        }
    }
    
    // Email-Verification (Mock)
    _verifyEmail(email) {
        const users = JSON.parse(localStorage.getItem(this.storageKeys.users));
        if (users[email]) {
            users[email].emailVerified = true;
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
        }
    }
    
    // User Login
    async signIn(email, password, rememberMe = false) {
        try {
            if (!email || !password) {
                throw new Error('Email und Passwort sind erforderlich');
            }
            
            const users = JSON.parse(localStorage.getItem(this.storageKeys.users));
            const user = users[email];
            
            if (!user) {
                throw new Error('Benutzer nicht gefunden');
            }
            
            // Passwort-Verifikation
            const passwordHash = this._mockHash(password);
            if (passwordHash !== user.passwordHash) {
                throw new Error('Falsches Passwort');
            }
            
            if (!user.emailVerified) {
                throw new Error('E-Mail wurde noch nicht verifiziert');
            }
            
            // Erstelle Session-Token
            const session = this._generateToken(email, rememberMe);
            
            // Speichere Session
            const sessions = JSON.parse(localStorage.getItem(this.storageKeys.sessions));
            sessions[session.token] = session;
            localStorage.setItem(this.storageKeys.sessions, JSON.stringify(sessions));
            
            // Aktualisiere last login
            user.lastLogin = new Date().toISOString();
            users[email] = user;
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
            
            // Setze current user
            const currentUserData = {
                userId: user.userId,
                email: user.email,
                attributes: user.attributes,
                session: session
            };
            localStorage.setItem(this.storageKeys.currentUser, JSON.stringify(currentUserData));
            
            return {
                success: true,
                user: {
                    userId: user.userId,
                    email: user.email,
                    attributes: user.attributes
                },
                session: session
            };
        } catch (error) {
            console.error('[AuthMock] SignIn Error:', error);
            throw error;
        }
    }
    
    // User Logout
    async signOut() {
        try {
            const currentUserStr = localStorage.getItem(this.storageKeys.currentUser);
            if (currentUserStr) {
                const currentUser = JSON.parse(currentUserStr);
                
                // Entferne Session
                if (currentUser.session && currentUser.session.token) {
                    const sessions = JSON.parse(localStorage.getItem(this.storageKeys.sessions));
                    delete sessions[currentUser.session.token];
                    localStorage.setItem(this.storageKeys.sessions, JSON.stringify(sessions));
                }
            }
            
            // Entferne current user
            localStorage.removeItem(this.storageKeys.currentUser);
            
            return { success: true };
        } catch (error) {
            console.error('[AuthMock] SignOut Error:', error);
            throw error;
        }
    }
    
    // Prüfe ob User eingeloggt ist
    async getCurrentUser() {
        try {
            const currentUserStr = localStorage.getItem(this.storageKeys.currentUser);
            if (!currentUserStr) {
                return null;
            }
            
            const currentUser = JSON.parse(currentUserStr);
            
            // Prüfe ob Session noch gültig ist
            if (currentUser.session && currentUser.session.expiresAt) {
                const expiryDate = new Date(currentUser.session.expiresAt);
                if (expiryDate < new Date()) {
                    // Session abgelaufen
                    await this.signOut();
                    return null;
                }
            }
            
            return {
                userId: currentUser.userId,
                email: currentUser.email,
                attributes: currentUser.attributes
            };
        } catch (error) {
            console.error('[AuthMock] GetCurrentUser Error:', error);
            return null;
        }
    }
    
    // Session-Token validieren
    async validateSession() {
        const user = await this.getCurrentUser();
        return user !== null;
    }
    
    // Passwort ändern
    async changePassword(oldPassword, newPassword) {
        try {
            const currentUser = await this.getCurrentUser();
            if (!currentUser) {
                throw new Error('Nicht eingeloggt');
            }
            
            const users = JSON.parse(localStorage.getItem(this.storageKeys.users));
            const user = users[currentUser.email];
            
            // Verifiziere altes Passwort
            const oldPasswordHash = this._mockHash(oldPassword);
            if (oldPasswordHash !== user.passwordHash) {
                throw new Error('Altes Passwort ist falsch');
            }
            
            // Validiere neues Passwort
            if (newPassword.length < 8) {
                throw new Error('Neues Passwort muss mindestens 8 Zeichen lang sein');
            }
            
            // Setze neues Passwort
            user.passwordHash = this._mockHash(newPassword);
            users[currentUser.email] = user;
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
            
            return { success: true, message: 'Passwort erfolgreich geändert' };
        } catch (error) {
            console.error('[AuthMock] ChangePassword Error:', error);
            throw error;
        }
    }
    
    // Passwort zurücksetzen (Mock - nur Simulation)
    async forgotPassword(email) {
        try {
            const users = JSON.parse(localStorage.getItem(this.storageKeys.users));
            const user = users[email];
            
            if (!user) {
                // In Production würde man keinen Fehler werfen (Security)
                // Im Mock geben wir Feedback
                throw new Error('Benutzer nicht gefunden');
            }
            
            // Simuliere E-Mail mit Reset-Code
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            user.resetCode = resetCode;
            user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 Minuten
            users[email] = user;
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
            
            console.log('[AuthMock] Password Reset Code:', resetCode); // In Production per E-Mail
            
            return {
                success: true,
                message: 'Reset-Code wurde gesendet (check console im Mock-Modus)',
                resetCode: resetCode // NUR FÜR MOCK!
            };
        } catch (error) {
            console.error('[AuthMock] ForgotPassword Error:', error);
            throw error;
        }
    }
    
    // Passwort zurücksetzen mit Code
    async resetPasswordWithCode(email, code, newPassword) {
        try {
            const users = JSON.parse(localStorage.getItem(this.storageKeys.users));
            const user = users[email];
            
            if (!user) {
                throw new Error('Benutzer nicht gefunden');
            }
            
            if (!user.resetCode || user.resetCode !== code) {
                throw new Error('Ungültiger Reset-Code');
            }
            
            const expiryDate = new Date(user.resetCodeExpiresAt);
            if (expiryDate < new Date()) {
                throw new Error('Reset-Code ist abgelaufen');
            }
            
            if (newPassword.length < 8) {
                throw new Error('Passwort muss mindestens 8 Zeichen lang sein');
            }
            
            // Setze neues Passwort
            user.passwordHash = this._mockHash(newPassword);
            delete user.resetCode;
            delete user.resetCodeExpiresAt;
            users[email] = user;
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
            
            return { success: true, message: 'Passwort erfolgreich zurückgesetzt' };
        } catch (error) {
            console.error('[AuthMock] ResetPasswordWithCode Error:', error);
            throw error;
        }
    }
    
    // User-Attribute aktualisieren
    async updateUserAttributes(attributes) {
        try {
            const currentUser = await this.getCurrentUser();
            if (!currentUser) {
                throw new Error('Nicht eingeloggt');
            }
            
            const users = JSON.parse(localStorage.getItem(this.storageKeys.users));
            const user = users[currentUser.email];
            
            user.attributes = {
                ...user.attributes,
                ...attributes
            };
            users[currentUser.email] = user;
            localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
            
            // Update current user
            const currentUserData = JSON.parse(localStorage.getItem(this.storageKeys.currentUser));
            currentUserData.attributes = user.attributes;
            localStorage.setItem(this.storageKeys.currentUser, JSON.stringify(currentUserData));
            
            return { success: true, attributes: user.attributes };
        } catch (error) {
            console.error('[AuthMock] UpdateUserAttributes Error:', error);
            throw error;
        }
    }
    
    // E-Mail-Validierung
    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Cleanup abgelaufener Sessions (Maintenance)
    cleanupExpiredSessions() {
        try {
            const sessions = JSON.parse(localStorage.getItem(this.storageKeys.sessions));
            const now = new Date();
            let cleaned = 0;
            
            for (const [token, session] of Object.entries(sessions)) {
                const expiryDate = new Date(session.expiresAt);
                if (expiryDate < now) {
                    delete sessions[token];
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                localStorage.setItem(this.storageKeys.sessions, JSON.stringify(sessions));
                console.log(`[AuthMock] Cleaned ${cleaned} expired sessions`);
            }
        } catch (error) {
            console.error('[AuthMock] CleanupExpiredSessions Error:', error);
        }
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthMock;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.AuthMock = AuthMock;
}

