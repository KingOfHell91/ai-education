const express = require('express');
const router = express.Router();
const usersDb = require('../db-users');

// ==================== Middleware ====================

// Session-Validierung Middleware
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.session_token;
    
    if (!token) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    
    try {
        const sessionData = await usersDb.validateSession(token);
        if (!sessionData) {
            return res.status(401).json({ error: 'Session abgelaufen oder ungültig' });
        }
        
        req.user = sessionData.user;
        req.session = sessionData.session;
        next();
    } catch (error) {
        console.error('[Auth] Session validation error:', error);
        res.status(500).json({ error: 'Authentifizierungsfehler' });
    }
}

// ==================== Routes ====================

// POST /api/auth/register - Registrierung
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, birthDate } = req.body;
        
        // Validierung
        if (!email || !password || !name) {
            return res.status(400).json({ 
                error: 'Email, Passwort und Name sind erforderlich' 
            });
        }
        
        // Email-Format prüfen
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
        }
        
        // Passwort-Länge prüfen
        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Passwort muss mindestens 8 Zeichen lang sein' 
            });
        }
        
        // Prüfen ob Email bereits existiert
        const exists = await usersDb.userExists(email);
        if (exists) {
            return res.status(409).json({ 
                error: 'Ein Benutzer mit dieser E-Mail existiert bereits' 
            });
        }
        
        // Benutzer erstellen
        const user = await usersDb.createUser({
            email,
            password,
            name,
            birthDate: birthDate || null
        });
        
        console.log('[Auth] New user registered:', email);
        
        res.status(201).json({
            success: true,
            user: {
                userId: user.id,
                email: user.email,
                name: user.name,
                birthDate: user.birth_date
            },
            message: 'Registrierung erfolgreich!'
        });
        
    } catch (error) {
        console.error('[Auth] Registration error:', error);
        res.status(500).json({ error: 'Registrierung fehlgeschlagen: ' + error.message });
    }
});

// POST /api/auth/login - Anmeldung
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe = false } = req.body;
        
        // Validierung
        if (!email || !password) {
            return res.status(400).json({ error: 'Email und Passwort sind erforderlich' });
        }
        
        // Credentials prüfen
        const user = await usersDb.validateCredentials(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort' });
        }
        
        // Session erstellen
        const session = await usersDb.createSession(user.id, user.email, rememberMe);
        
        console.log('[Auth] User logged in:', email);
        
        res.json({
            success: true,
            user: {
                userId: user.id,
                email: user.email,
                name: user.name,
                birthDate: user.birth_date,
                attributes: {
                    name: user.name,
                    birthDate: user.birth_date,
                    ...user.profile_data
                }
            },
            session: {
                token: session.token,
                expiresAt: session.expiresAt,
                rememberMe: session.rememberMe
            }
        });
        
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ error: 'Anmeldung fehlgeschlagen: ' + error.message });
    }
});

// POST /api/auth/logout - Abmeldung
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
            await usersDb.deleteSession(token);
            console.log('[Auth] User logged out');
        }
        
        res.json({ success: true, message: 'Erfolgreich abgemeldet' });
        
    } catch (error) {
        console.error('[Auth] Logout error:', error);
        res.status(500).json({ error: 'Abmeldung fehlgeschlagen' });
    }
});

// GET /api/auth/me - Aktuellen Benutzer abrufen
router.get('/me', requireAuth, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                userId: req.user.id,
                email: req.user.email,
                name: req.user.name,
                birthDate: req.user.birth_date,
                attributes: {
                    name: req.user.name,
                    birthDate: req.user.birth_date,
                    ...req.user.profile_data
                }
            },
            session: req.session
        });
    } catch (error) {
        console.error('[Auth] Get user error:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Benutzerdaten' });
    }
});

// GET /api/auth/validate - Session validieren (leichtgewichtig)
router.get('/validate', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.json({ valid: false });
        }
        
        const sessionData = await usersDb.validateSession(token);
        
        if (!sessionData) {
            return res.json({ valid: false });
        }
        
        res.json({
            valid: true,
            user: {
                userId: sessionData.user.id,
                email: sessionData.user.email,
                name: sessionData.user.name
            }
        });
        
    } catch (error) {
        console.error('[Auth] Validate error:', error);
        res.json({ valid: false });
    }
});

// PUT /api/auth/profile - Profil aktualisieren
router.put('/profile', requireAuth, async (req, res) => {
    try {
        const { name, birthDate, profileData } = req.body;
        
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (birthDate !== undefined) updates.birthDate = birthDate;
        if (profileData !== undefined) updates.profileData = profileData;
        
        const updatedUser = await usersDb.updateUser(req.user.id, updates);
        
        console.log('[Auth] Profile updated for:', req.user.email);
        
        res.json({
            success: true,
            user: {
                userId: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                birthDate: updatedUser.birth_date,
                attributes: {
                    name: updatedUser.name,
                    birthDate: updatedUser.birth_date,
                    ...updatedUser.profile_data
                }
            }
        });
        
    } catch (error) {
        console.error('[Auth] Profile update error:', error);
        res.status(500).json({ error: 'Profilaktualisierung fehlgeschlagen' });
    }
});

// PUT /api/auth/password - Passwort ändern
router.put('/password', requireAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ 
                error: 'Altes und neues Passwort sind erforderlich' 
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ 
                error: 'Neues Passwort muss mindestens 8 Zeichen lang sein' 
            });
        }
        
        await usersDb.changePassword(req.user.id, oldPassword, newPassword);
        
        console.log('[Auth] Password changed for:', req.user.email);
        
        res.json({ success: true, message: 'Passwort erfolgreich geändert' });
        
    } catch (error) {
        console.error('[Auth] Password change error:', error);
        res.status(400).json({ error: error.message });
    }
});

// POST /api/auth/check-email - Prüfen ob Email existiert
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email ist erforderlich' });
        }
        
        const exists = await usersDb.userExists(email);
        
        res.json({ exists });
        
    } catch (error) {
        console.error('[Auth] Check email error:', error);
        res.status(500).json({ error: 'Fehler bei der Email-Prüfung' });
    }
});

module.exports = router;
