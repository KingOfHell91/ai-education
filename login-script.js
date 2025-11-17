// Login Page Script
// Verwaltet Login, Registration und Passwort-Reset-Flows

class LoginManager {
    constructor() {
        this.authService = new AuthService();
        this.currentForm = 'login';
        this.resetEmail = null; // Speichert Email für Passwort-Reset
        
        this.init();
    }
    
    init() {
        // Prüfe ob User bereits eingeloggt ist
        this.checkExistingSession();
        
        // Setup Event Listeners
        this.setupFormListeners();
        this.setupPasswordToggles();
        this.setupPasswordStrength();
    }
    
    async checkExistingSession() {
        try {
            const user = await this.authService.getCurrentUser();
            if (user) {
                // User ist bereits eingeloggt, leite weiter
                console.log('[LoginManager] User already logged in, redirecting...');
                window.location.href = 'index.html';
            }
        } catch (error) {
            // Kein User eingeloggt, bleibe auf Login-Seite
            console.log('[LoginManager] No active session');
        }
    }
    
    setupFormListeners() {
        // Login Form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Register Form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Forgot Password Form
        document.getElementById('forgot-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
        
        // Reset Password Form
        document.getElementById('reset-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResetPassword();
        });
        
        // Form Switching
        document.getElementById('switch-to-register').addEventListener('click', () => {
            this.switchForm('register');
        });
        
        document.getElementById('switch-to-login').addEventListener('click', () => {
            this.switchForm('login');
        });
        
        document.getElementById('forgot-password-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('forgot-password');
        });
        
        document.getElementById('back-to-login').addEventListener('click', () => {
            this.switchForm('login');
        });
        
        document.getElementById('back-to-login-from-reset').addEventListener('click', () => {
            this.switchForm('login');
        });
    }
    
    setupPasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = button.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }
    
    setupPasswordStrength() {
        const registerPassword = document.getElementById('register-password');
        const strengthContainer = document.getElementById('password-strength');
        const strengthBar = document.getElementById('strength-bar-fill');
        const strengthValue = document.getElementById('strength-value');
        const strengthRequirements = document.getElementById('strength-requirements');
        
        registerPassword.addEventListener('input', (e) => {
            const password = e.target.value;
            
            if (password.length === 0) {
                strengthContainer.style.display = 'none';
                return;
            }
            
            strengthContainer.style.display = 'block';
            
            const strength = this.authService.checkPasswordStrength(password);
            
            // Update Bar
            const percentage = (strength.score / 6) * 100;
            strengthBar.style.width = percentage + '%';
            
            // Update Color
            strengthBar.className = 'strength-bar-fill strength-' + strength.rating;
            
            // Update Label
            strengthValue.textContent = strength.label;
            strengthValue.className = 'strength-' + strength.rating;
            
            // Update Requirements
            if (strength.feedback.length > 0) {
                strengthRequirements.innerHTML = '<li>Noch benötigt: ' + strength.feedback.join(', ') + '</li>';
            } else {
                strengthRequirements.innerHTML = '<li style="color: var(--success-color);"><i class="fas fa-check"></i> Alle Anforderungen erfüllt!</li>';
            }
        });
    }
    
    switchForm(formName) {
        // Hide all forms
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('forgot-password-form').style.display = 'none';
        document.getElementById('reset-password-form').style.display = 'none';
        
        // Hide messages
        this.hideMessage();
        
        // Show selected form
        const formTitles = {
            'login': 'Anmelden',
            'register': 'Registrieren',
            'forgot-password': 'Passwort vergessen',
            'reset-password': 'Passwort zurücksetzen'
        };
        
        const formSubtitles = {
            'login': 'Willkommen zurück! Melde dich an, um fortzufahren.',
            'register': 'Erstelle ein neues Konto, um zu beginnen.',
            'forgot-password': 'Wir helfen dir, dein Passwort zurückzusetzen.',
            'reset-password': 'Gib den Code aus deiner E-Mail ein.'
        };
        
        document.getElementById('form-title').textContent = formTitles[formName];
        document.getElementById('form-subtitle').textContent = formSubtitles[formName];
        document.getElementById(formName + '-form').style.display = 'block';
        
        this.currentForm = formName;
    }
    
    async handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        // Validation
        if (!this.authService.isValidEmail(email)) {
            this.showMessage('Bitte gib eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }
        
        if (!password) {
            this.showMessage('Bitte gib dein Passwort ein.', 'error');
            return;
        }
        
        this.showLoading('Anmeldung läuft...');
        
        try {
            const result = await this.authService.signIn(email, password, rememberMe);
            
            if (result.success) {
                this.showMessage('Erfolgreich angemeldet! Weiterleitung...', 'success');
                
                // Redirect nach kurzer Verzögerung
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            console.error('[LoginManager] Login Error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async handleRegister() {
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const acceptTerms = document.getElementById('accept-terms').checked;
        
        // Validation
        if (!name) {
            this.showMessage('Bitte gib deinen Namen ein.', 'error');
            return;
        }
        
        if (!this.authService.isValidEmail(email)) {
            this.showMessage('Bitte gib eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showMessage('Passwort muss mindestens 8 Zeichen lang sein.', 'error');
            return;
        }
        
        if (password !== passwordConfirm) {
            this.showMessage('Passwörter stimmen nicht überein.', 'error');
            return;
        }
        
        if (!acceptTerms) {
            this.showMessage('Bitte akzeptiere die Nutzungsbedingungen.', 'error');
            return;
        }
        
        // Check password strength
        const strength = this.authService.checkPasswordStrength(password);
        if (strength.score < 3) {
            this.showMessage('Passwort ist zu schwach. Bitte wähle ein stärkeres Passwort.', 'error');
            return;
        }
        
        this.showLoading('Registrierung läuft...');
        
        try {
            const result = await this.authService.signUp(email, password, { name: name });
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                
                // Im Mock-Modus automatisch einloggen
                if (this.authService.useMock) {
                    setTimeout(async () => {
                        try {
                            await this.authService.signIn(email, password, false);
                            window.location.href = 'index.html';
                        } catch (error) {
                            console.error('[LoginManager] Auto-login failed:', error);
                            this.switchForm('login');
                        }
                    }, 1500);
                } else {
                    // In Production, warte auf Email-Verification
                    setTimeout(() => {
                        this.switchForm('login');
                        this.showMessage('Bitte prüfe deine E-Mail und bestätige dein Konto.', 'info');
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('[LoginManager] Register Error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async handleForgotPassword() {
        const email = document.getElementById('forgot-email').value.trim();
        
        // Validation
        if (!this.authService.isValidEmail(email)) {
            this.showMessage('Bitte gib eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }
        
        this.showLoading('Code wird angefordert...');
        
        try {
            const result = await this.authService.forgotPassword(email);
            
            if (result.success) {
                this.resetEmail = email; // Speichere Email für nächsten Schritt
                this.showMessage(result.message, 'success');
                
                // Im Mock-Modus zeige den Code in der Console
                if (result.resetCode) {
                    console.log('=== MOCK RESET CODE ===');
                    console.log('Code:', result.resetCode);
                    console.log('=====================');
                    this.showMessage(result.message + ' (Code: ' + result.resetCode + ')', 'success');
                }
                
                // Wechsle zu Reset-Form
                setTimeout(() => {
                    this.switchForm('reset-password');
                }, 2000);
            }
        } catch (error) {
            console.error('[LoginManager] Forgot Password Error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async handleResetPassword() {
        const code = document.getElementById('reset-code').value.trim();
        const newPassword = document.getElementById('reset-new-password').value;
        
        if (!this.resetEmail) {
            this.showMessage('Fehler: Email-Adresse nicht gespeichert. Bitte starte erneut.', 'error');
            this.switchForm('forgot-password');
            return;
        }
        
        // Validation
        if (!code || code.length !== 6) {
            this.showMessage('Bitte gib einen gültigen 6-stelligen Code ein.', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            this.showMessage('Passwort muss mindestens 8 Zeichen lang sein.', 'error');
            return;
        }
        
        this.showLoading('Passwort wird zurückgesetzt...');
        
        try {
            const result = await this.authService.forgotPasswordSubmit(this.resetEmail, code, newPassword);
            
            if (result.success) {
                this.showMessage(result.message, 'success');
                this.resetEmail = null;
                
                // Wechsle zu Login-Form
                setTimeout(() => {
                    this.switchForm('login');
                }, 2000);
            }
        } catch (error) {
            console.error('[LoginManager] Reset Password Error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showLoading(message = 'Wird verarbeitet...') {
        document.getElementById('loading-message').textContent = message;
        document.getElementById('auth-loading').style.display = 'block';
        
        // Disable form inputs
        const currentFormElement = document.getElementById(this.currentForm + '-form');
        if (currentFormElement) {
            const inputs = currentFormElement.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = true);
        }
    }
    
    hideLoading() {
        document.getElementById('auth-loading').style.display = 'none';
        
        // Enable form inputs
        const currentFormElement = document.getElementById(this.currentForm + '-form');
        if (currentFormElement) {
            const inputs = currentFormElement.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = false);
        }
    }
    
    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('auth-message');
        messageElement.textContent = message;
        messageElement.className = 'auth-message auth-message-' + type;
        messageElement.style.display = 'block';
        
        // Auto-hide nach 5 Sekunden (außer bei success)
        if (type !== 'success') {
            setTimeout(() => {
                this.hideMessage();
            }, 5000);
        }
    }
    
    hideMessage() {
        const messageElement = document.getElementById('auth-message');
        messageElement.style.display = 'none';
    }
}

// Initialize Login Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

